import { eq } from "drizzle-orm";
import { addDatabaseChangeListener } from "expo-sqlite";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { db, expoDb } from "../db";
import * as schema from "../db/schema";
import { generateContactAvatar } from "../services/avatarService";

export interface ContactItem {
  id: number;
  name: string;
  mobileNumber: string | null;
  note: string | null;
  avatarSvg: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  totalOwedToMe: number;
  totalIOwe: number;
  activityCount: number;
}

export interface CreateContactInput {
  name: string;
  mobileNumber?: string | null;
  note?: string | null;
  avatarSvg?: string | null;
}

export interface UpdateContactInput {
  name?: string;
  mobileNumber?: string | null;
  note?: string | null;
  avatarSvg?: string | null;
}

interface ContactsContextType {
  contacts: ContactItem[];
  isLoading: boolean;
  refreshContacts: () => void;
  createContact: (data: CreateContactInput) => Promise<number>;
  updateContact: (id: number, data: UpdateContactInput) => Promise<void>;
  deleteContact: (id: number) => Promise<{ archived: boolean }>;
}

const ContactsContext = createContext<ContactsContextType | undefined>(
  undefined
);

interface RawContactQueryRow {
  id: number;
  name: string;
  mobile_number: string | null;
  note: string | null;
  avatar_svg: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
  total_owed_to_me: number | null;
  total_i_owe: number | null;
  activity_count: number | null;
}

export function ContactsProvider({ children }: { children: React.ReactNode }) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadContacts = useCallback(() => {
    try {

      const rows = expoDb.getAllSync<RawContactQueryRow>(`
        SELECT 
          c.id,
          c.name,
          c.mobile_number,
          c.note,
          c.avatar_svg,
          c.is_archived,
          c.created_at,
          c.updated_at,
          COALESCE((
            SELECT SUM(d.amount - COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.debt_id = d.id), 0))
            FROM debts d
            WHERE d.contact_id = c.id AND d.type = 'LEND' AND d.state = 'ONGOING'
          ), 0) AS total_owed_to_me,
          COALESCE((
            SELECT SUM(d.amount - COALESCE((SELECT SUM(t.amount) FROM transactions t WHERE t.debt_id = d.id), 0))
            FROM debts d
            WHERE d.contact_id = c.id AND d.type = 'BORROW' AND d.state = 'ONGOING'
          ), 0) AS total_i_owe,
          COALESCE((
            SELECT COUNT(*) FROM transactions WHERE contact_id = c.id
          ), 0) + COALESCE((
            SELECT COUNT(*) FROM debts WHERE contact_id = c.id
          ), 0) AS activity_count
        FROM contacts c
        WHERE c.is_archived = 0
        ORDER BY c.name COLLATE NOCASE ASC;
      `);

      const mapped: ContactItem[] = rows.map((row) => ({
        id: row.id,
        name: row.name,
        mobileNumber: row.mobile_number,
        note: row.note,
        avatarSvg: row.avatar_svg,
        isArchived: Boolean(row.is_archived),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        totalOwedToMe: Number(row.total_owed_to_me) || 0,
        totalIOwe: Number(row.total_i_owe) || 0,
        activityCount: Number(row.activity_count) || 0,
      }));

      setContacts(mapped);
    } catch (err) {
      console.error("Failed to load contacts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();

    let subscription: { remove: () => void } | undefined;
    try {
      subscription = addDatabaseChangeListener((event) => {
        if (
          !event?.tableName ||
          event.tableName === "contacts" ||
          event.tableName === "debts"
        ) {
          loadContacts();
        }
      });
    } catch (err) {
      console.warn("addDatabaseChangeListener error for contacts:", err);
    }

    return () => {
      subscription?.remove();
    };
  }, [loadContacts]);

  const createContact = useCallback(
    async (data: CreateContactInput): Promise<number> => {
      const now = new Date().toISOString();
      const trimmedName = data.name.trim();

      const existing = expoDb.getFirstSync<{ id: number }>(
        `SELECT id FROM contacts WHERE LOWER(name) = LOWER(?) AND is_archived = 0;`,
        [trimmedName]
      );
      if (existing) {
        throw new Error("A contact with this name already exists.");
      }

      const avatarSvg =
        data.avatarSvg !== undefined
          ? data.avatarSvg
          : generateContactAvatar(trimmedName);

      const result = db
        .insert(schema.contacts)
        .values({
          name: trimmedName,
          mobileNumber: data.mobileNumber?.trim() || null,
          note: data.note?.trim() || null,
          avatarSvg,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: schema.contacts.id })
        .get();

      loadContacts();
      return result.id;
    },
    [loadContacts]
  );

  const updateContact = useCallback(
    async (id: number, data: UpdateContactInput) => {
      const now = new Date().toISOString();

      const updateValues: Partial<typeof schema.contacts.$inferInsert> = {
        updatedAt: now,
      };

      if (data.name !== undefined) {
        const trimmed = data.name.trim();

        const existing = expoDb.getFirstSync<{ id: number }>(
          `SELECT id FROM contacts WHERE LOWER(name) = LOWER(?) AND id != ? AND is_archived = 0;`,
          [trimmed, id]
        );
        if (existing) {
          throw new Error("A contact with this name already exists.");
        }

        updateValues.name = trimmed;
        if (data.avatarSvg === undefined) {
          updateValues.avatarSvg = generateContactAvatar(trimmed);
        }
      }
      if (data.mobileNumber !== undefined)
        updateValues.mobileNumber = data.mobileNumber?.trim() || null;
      if (data.note !== undefined) updateValues.note = data.note?.trim() || null;
      if (data.avatarSvg !== undefined) updateValues.avatarSvg = data.avatarSvg;

      db.update(schema.contacts)
        .set(updateValues)
        .where(eq(schema.contacts.id, id))
        .run();

      loadContacts();
    },
    [loadContacts]
  );

  const deleteContact = useCallback(
    async (id: number): Promise<{ archived: boolean }> => {

      const txRow = expoDb.getFirstSync<{ count: number }>(
        `SELECT (SELECT COUNT(*) FROM transactions WHERE contact_id = ?) + (SELECT COUNT(*) FROM debts WHERE contact_id = ?) AS count;`,
        [id, id]
      );
      const hasHistory = (txRow?.count ?? 0) > 0;

      if (hasHistory) {
        // Soft delete / archive
        db.update(schema.contacts)
          .set({
            isArchived: true,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.contacts.id, id))
          .run();

        loadContacts();
        return { archived: true };
      } else {
        // Full delete
        db.delete(schema.contacts)
          .where(eq(schema.contacts.id, id))
          .run();

        loadContacts();
        return { archived: false };
      }
    },
    [loadContacts]
  );

  return (
    <ContactsContext.Provider
      value={{
        contacts,
        isLoading,
        refreshContacts: loadContacts,
        createContact,
        updateContact,
        deleteContact,
      }}
    >
      {children}
    </ContactsContext.Provider>
  );
}

export function useContacts() {
  const context = useContext(ContactsContext);
  if (!context) {
    throw new Error("useContacts must be used within a ContactsProvider");
  }
  return context;
}
