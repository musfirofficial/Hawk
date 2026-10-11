import { eq } from "drizzle-orm";
import { addDatabaseChangeListener } from "expo-sqlite";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { db, ensureDatabaseInitialized, expoDb } from "../db";
import * as schema from "../db/schema";
import { CategoryType, TransactionType } from "../db/schema";

export interface TransactionItem {
  id: number;
  amount: number;
  type: TransactionType;
  fromAssetId: number | null;
  fromAssetName: string | null;
  toAssetId: number | null;
  toAssetName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor?: string | null;
  contactId: number | null;
  contactName: string | null;
  debtId: number | null;
  date: string;
  dueDate: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryItem {
  id: number;
  name: string;
  icon: string | null;
}

export interface CreateTransactionInput {
  amount: number;
  type: TransactionType;
  fromAssetId?: number | null;
  toAssetId?: number | null;
  categoryId?: number | null;
  contactId?: number | null;
  debtId?: number | null;
  date?: string;
  dueDate?: string | null;
  note?: string | null;
}

export interface UpdateTransactionInput {
  amount?: number;
  type?: TransactionType;
  fromAssetId?: number | null;
  toAssetId?: number | null;
  categoryId?: number | null;
  contactId?: number | null;
  date?: string;
  dueDate?: string | null;
  note?: string | null;
}

interface TransactionsContextType {
  transactions: TransactionItem[];
  categories: CategoryItem[];
  incomeCategories: CategoryItem[];
  expenseCategories: CategoryItem[];
  todayNetChange: number;
  isLoading: boolean;
  refreshTransactions: () => void;
  createTransaction: (data: CreateTransactionInput) => Promise<number>;
  updateTransaction: (id: number, data: UpdateTransactionInput) => Promise<void>;
  deleteTransaction: (id: number) => Promise<void>;
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(
  undefined
);

interface RawTransactionQueryRow {
  id: number;
  amount: number;
  type: TransactionType;
  from_asset_id: number | null;
  from_asset_name: string | null;
  to_asset_id: number | null;
  to_asset_name: string | null;
  category_id: number | null;
  category_name: string | null;
  category_icon: string | null;
  contact_id: number | null;
  contact_name: string | null;
  debt_id: number | null;
  date: string;
  due_date: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function TransactionsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(() => {
    try {
      ensureDatabaseInitialized();

      // Query categories
      const catRows = expoDb.getAllSync<CategoryItem>(`
        SELECT id, name, icon FROM categories ORDER BY name ASC;
      `);
      setCategories(catRows);

      // Query transactions with joins on assets, categories, contacts
      const txRows = expoDb.getAllSync<RawTransactionQueryRow>(`
        SELECT 
          t.id,
          t.amount,
          t.type,
          t.from_asset_id,
          fa.name AS from_asset_name,
          t.to_asset_id,
          ta.name AS to_asset_name,
          t.category_id,
          cat.name AS category_name,
          cat.icon AS category_icon,
          t.contact_id,
          c.name AS contact_name,
          t.debt_id,
          t.date,
          t.due_date,
          t.note,
          t.created_at,
          t.updated_at
        FROM transactions t
        LEFT JOIN liquid_assets fa ON fa.id = t.from_asset_id
        LEFT JOIN liquid_assets ta ON ta.id = t.to_asset_id
        LEFT JOIN categories cat ON cat.id = t.category_id
        LEFT JOIN contacts c ON c.id = t.contact_id
        ORDER BY t.date DESC, t.created_at DESC;
      `);

      const mapped: TransactionItem[] = txRows.map((row) => ({
        id: row.id,
        amount: Number(row.amount) || 0,
        type: row.type,
        fromAssetId: row.from_asset_id,
        fromAssetName: row.from_asset_name,
        toAssetId: row.to_asset_id,
        toAssetName: row.to_asset_name,
        categoryId: row.category_id,
        categoryName: row.category_name,
        categoryIcon: row.category_icon,
        categoryColor: null,
        contactId: row.contact_id,
        contactName: row.contact_name,
        debtId: row.debt_id,
        date: row.date,
        dueDate: row.due_date,
        note: row.note,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      setTransactions(mapped);
    } catch (err) {
      console.error("Failed to load transactions:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    let subscription: { remove: () => void } | undefined;
    try {
      subscription = addDatabaseChangeListener(() => {
        loadData();
      });
    } catch (err) {
      console.warn("addDatabaseChangeListener error for transactions:", err);
    }

    return () => {
      subscription?.remove();
    };
  }, [loadData]);

  const createTransaction = useCallback(
    async (data: CreateTransactionInput): Promise<number> => {
      ensureDatabaseInitialized();
      const now = new Date().toISOString();
      const dateString = data.date || now.split("T")[0];

      const inserted = db
        .insert(schema.transactions)
        .values({
          amount: Number(data.amount) || 0,
          type: data.type,
          fromAssetId: data.fromAssetId || null,
          toAssetId: data.toAssetId || null,
          categoryId: data.categoryId || null,
          contactId: data.contactId || null,
          debtId: data.debtId || null,
          date: dateString,
          dueDate: data.dueDate?.trim() || null,
          note: data.note?.trim() || null,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: schema.transactions.id })
        .get();

      loadData();
      return inserted.id;
    },
    [loadData]
  );

  const updateTransaction = useCallback(
    async (id: number, data: UpdateTransactionInput) => {
      ensureDatabaseInitialized();
      const now = new Date().toISOString();

      const updateValues: Partial<typeof schema.transactions.$inferInsert> = {
        updatedAt: now,
      };

      if (data.amount !== undefined) updateValues.amount = Number(data.amount) || 0;
      if (data.type !== undefined) updateValues.type = data.type;
      if (data.fromAssetId !== undefined) updateValues.fromAssetId = data.fromAssetId;
      if (data.toAssetId !== undefined) updateValues.toAssetId = data.toAssetId;
      if (data.categoryId !== undefined) updateValues.categoryId = data.categoryId;
      if (data.contactId !== undefined) updateValues.contactId = data.contactId;
      if (data.date !== undefined) updateValues.date = data.date;
      if (data.dueDate !== undefined) updateValues.dueDate = data.dueDate?.trim() || null;
      if (data.note !== undefined) updateValues.note = data.note?.trim() || null;

      db.update(schema.transactions)
        .set(updateValues)
        .where(eq(schema.transactions.id, id))
        .run();

      loadData();
    },
    [loadData]
  );

  const deleteTransaction = useCallback(
    async (id: number) => {
      ensureDatabaseInitialized();
      db.delete(schema.transactions)
        .where(eq(schema.transactions.id, id))
        .run();

      loadData();
    },
    [loadData]
  );

  const incomeCategories = categories;
  const expenseCategories = categories;

  const todayNetChange = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    let net = 0;
    for (const t of transactions) {
      if (t.date === today) {
        if (t.type === "INCOME" || t.type === "BORROW" || t.type === "DEBT RECEIVED") {
          net += t.amount;
        } else if (t.type === "EXPENSE" || t.type === "LEND" || t.type === "DEBT PAID") {
          net -= t.amount;
        }
      }
    }
    return net;
  }, [transactions]);

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        categories,
        incomeCategories,
        expenseCategories,
        todayNetChange,
        isLoading,
        refreshTransactions: loadData,
        createTransaction,
        updateTransaction,
        deleteTransaction,
      }}
    >
      {children}
    </TransactionsContext.Provider>
  );
}

export function useTransactions() {
  const context = useContext(TransactionsContext);
  if (!context) {
    throw new Error(
      "useTransactions must be used within a TransactionsProvider"
    );
  }
  return context;
}
