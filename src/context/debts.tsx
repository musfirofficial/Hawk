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
import { DebtType } from "../db/schema";

export interface DebtItem {
  id: number;
  contactId: number;
  contactName: string;
  contactMobile: string | null;
  type: DebtType;
  amount: number;
  dueDate: string | null;
  isSettled: boolean;
  isSettledManually: boolean;
  isArchived: boolean;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  repaidAmount: number;
  remainingAmount: number;
  progressPercent: number;
  repaymentCount: number;
}

export interface CreateDebtInput {
  contactId: number;
  type: DebtType;
  amount: number;
  dueDate?: string | null;
  note?: string | null;
  assetId?: number | null; // Optional account to deduct or credit from
}

export interface UpdateDebtInput {
  contactId?: number;
  type?: DebtType;
  amount?: number;
  dueDate?: string | null;
  note?: string | null;
}

export interface RecordRepaymentInput {
  debtId: number;
  amount: number;
  assetId: number;
  note?: string | null;
  date?: string;
}

interface DebtsContextType {
  debts: DebtItem[];
  lentDebts: DebtItem[];
  borrowedDebts: DebtItem[];
  totalLentRemaining: number;
  totalBorrowedRemaining: number;
  activeLentCount: number;
  activeBorrowedCount: number;
  isLoading: boolean;
  refreshDebts: () => void;
  createDebt: (data: CreateDebtInput) => Promise<number>;
  updateDebt: (id: number, data: UpdateDebtInput) => Promise<void>;
  deleteDebt: (id: number) => Promise<{ archived: boolean }>;
  recordRepayment: (data: RecordRepaymentInput) => Promise<void>;
  toggleSettleManually: (id: number) => Promise<void>;
}

const DebtsContext = createContext<DebtsContextType | undefined>(undefined);

interface RawDebtQueryRow {
  id: number;
  contact_id: number;
  contact_name: string | null;
  contact_mobile: string | null;
  type: DebtType;
  amount: number;
  due_date: string | null;
  is_settled: number;
  is_settled_manually: number;
  is_archived: number;
  note: string | null;
  created_at: string;
  updated_at: string;
  repaid_amount: number | null;
  repayment_count: number | null;
}

export function DebtsProvider({ children }: { children: React.ReactNode }) {
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDebts = useCallback(() => {
    try {
      ensureDatabaseInitialized();

      const rows = expoDb.getAllSync<RawDebtQueryRow>(`
        SELECT 
          d.id,
          d.contact_id,
          c.name AS contact_name,
          c.mobile_number AS contact_mobile,
          d.type,
          d.amount,
          d.due_date,
          d.is_settled,
          d.is_settled_manually,
          COALESCE(d.is_archived, 0) AS is_archived,
          d.note,
          d.created_at,
          d.updated_at,
          COALESCE((
            SELECT SUM(t.amount) 
            FROM transactions t 
            WHERE t.debt_id = d.id 
              AND (t.type = 'DEBT PAID' OR t.type = 'DEBT RECEIVED')
          ), 0) AS repaid_amount,
          COALESCE((
            SELECT COUNT(*) 
            FROM transactions t 
            WHERE t.debt_id = d.id 
              AND (t.type = 'DEBT PAID' OR t.type = 'DEBT RECEIVED')
          ), 0) AS repayment_count
        FROM debts d
        LEFT JOIN contacts c ON c.id = d.contact_id
        WHERE COALESCE(d.is_archived, 0) = 0
        ORDER BY d.created_at DESC;
      `);

      const mapped: DebtItem[] = rows.map((row) => {
        const totalAmount = Number(row.amount) || 0;
        const repaid = Number(row.repaid_amount) || 0;
        const remaining = Math.max(0, totalAmount - repaid);
        const settledManually = Boolean(row.is_settled_manually);
        const settled = Boolean(row.is_settled) || remaining <= 0 || settledManually;
        const percent = totalAmount > 0 ? Math.min(100, Math.round((repaid / totalAmount) * 100)) : 100;

        return {
          id: row.id,
          contactId: row.contact_id,
          contactName: row.contact_name || "Unknown Contact",
          contactMobile: row.contact_mobile,
          type: row.type,
          amount: totalAmount,
          dueDate: row.due_date,
          isSettled: settled,
          isSettledManually: settledManually,
          isArchived: Boolean(row.is_archived),
          note: row.note,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          repaidAmount: repaid,
          remainingAmount: remaining,
          progressPercent: percent,
          repaymentCount: Number(row.repayment_count) || 0,
        };
      });

      setDebts(mapped);
    } catch (err) {
      console.error("Failed to load debts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDebts();

    let subscription: { remove: () => void } | undefined;
    try {
      subscription = addDatabaseChangeListener(() => {
        loadDebts();
      });
    } catch (err) {
      console.warn("addDatabaseChangeListener error for debts:", err);
    }

    return () => {
      subscription?.remove();
    };
  }, [loadDebts]);

  const createDebt = useCallback(
    async (data: CreateDebtInput): Promise<number> => {
      ensureDatabaseInitialized();
      const now = new Date().toISOString();
      const dateString = now.split("T")[0];

      const inserted = db
        .insert(schema.debts)
        .values({
          contactId: data.contactId,
          type: data.type,
          amount: Number(data.amount) || 0,
          dueDate: data.dueDate?.trim() || null,
          note: data.note?.trim() || null,
          isSettled: false,
          isSettledManually: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: schema.debts.id })
        .get();

      // If an account was selected, record the initial financial movement
      if (data.assetId) {
        db.insert(schema.transactions)
          .values({
            amount: Number(data.amount) || 0,
            type: data.type, // 'LEND' or 'BORROW'
            fromAssetId: data.type === "LEND" ? data.assetId : null,
            toAssetId: data.type === "BORROW" ? data.assetId : null,
            contactId: data.contactId,
            debtId: inserted.id,
            date: dateString,
            dueDate: data.dueDate?.trim() || null,
            note: data.note?.trim() || (data.type === "LEND" ? "Money Lent" : "Money Borrowed"),
            createdAt: now,
            updatedAt: now,
          })
          .run();
      }

      loadDebts();
      return inserted.id;
    },
    [loadDebts]
  );

  const updateDebt = useCallback(
    async (id: number, data: UpdateDebtInput) => {
      ensureDatabaseInitialized();
      const now = new Date().toISOString();

      const updateValues: Partial<typeof schema.debts.$inferInsert> = {
        updatedAt: now,
      };

      if (data.contactId !== undefined) updateValues.contactId = data.contactId;
      if (data.type !== undefined) updateValues.type = data.type;
      if (data.amount !== undefined) updateValues.amount = Number(data.amount) || 0;
      if (data.dueDate !== undefined) updateValues.dueDate = data.dueDate?.trim() || null;
      if (data.note !== undefined) updateValues.note = data.note?.trim() || null;

      db.update(schema.debts)
        .set(updateValues)
        .where(eq(schema.debts.id, id))
        .run();

      loadDebts();
    },
    [loadDebts]
  );

  const deleteDebt = useCallback(
    async (id: number): Promise<{ archived: boolean }> => {
      ensureDatabaseInitialized();

      const txRow = expoDb.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM transactions WHERE debt_id = ?;`,
        [id]
      );
      const hasHistory = (txRow?.count ?? 0) > 0;

      if (hasHistory) {
        // Soft delete / archive to keep transactions valid
        db.update(schema.debts)
          .set({
            isArchived: true,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.debts.id, id))
          .run();

        loadDebts();
        return { archived: true };
      } else {
        // Full delete
        db.delete(schema.debts).where(eq(schema.debts.id, id)).run();

        loadDebts();
        return { archived: false };
      }
    },
    [loadDebts]
  );

  const recordRepayment = useCallback(
    async (data: RecordRepaymentInput) => {
      ensureDatabaseInitialized();
      const now = new Date().toISOString();
      const dateString = data.date || now.split("T")[0];

      const debt = debts.find((d) => d.id === data.debtId);
      if (!debt) throw new Error("Debt not found");

      const isLend = debt.type === "LEND";
      const txType = isLend ? "DEBT RECEIVED" : "DEBT PAID";

      db.insert(schema.transactions)
        .values({
          amount: Number(data.amount) || 0,
          type: txType,
          toAssetId: isLend ? data.assetId : null,
          fromAssetId: !isLend ? data.assetId : null,
          contactId: debt.contactId,
          debtId: debt.id,
          date: dateString,
          note: data.note?.trim() || (isLend ? "Debt Repayment Received" : "Debt Repayment Paid"),
          createdAt: now,
          updatedAt: now,
        })
        .run();

      // Check if this repayment settles the debt
      const newRepaid = debt.repaidAmount + Number(data.amount);
      if (newRepaid >= debt.amount) {
        db.update(schema.debts)
          .set({
            isSettled: true,
            updatedAt: now,
          })
          .where(eq(schema.debts.id, debt.id))
          .run();
      }

      loadDebts();
    },
    [debts, loadDebts]
  );

  const toggleSettleManually = useCallback(
    async (id: number) => {
      ensureDatabaseInitialized();
      const debt = debts.find((d) => d.id === id);
      if (!debt) return;

      const newSettled = !debt.isSettledManually;
      const now = new Date().toISOString();

      db.update(schema.debts)
        .set({
          isSettledManually: newSettled,
          isSettled: newSettled,
          updatedAt: now,
        })
        .where(eq(schema.debts.id, id))
        .run();

      loadDebts();
    },
    [debts, loadDebts]
  );

  const lentDebts = useMemo(
    () => debts.filter((d) => d.type === "LEND"),
    [debts]
  );

  const borrowedDebts = useMemo(
    () => debts.filter((d) => d.type === "BORROW"),
    [debts]
  );

  const totalLentRemaining = useMemo(
    () =>
      lentDebts
        .filter((d) => !d.isSettled)
        .reduce((sum, d) => sum + d.remainingAmount, 0),
    [lentDebts]
  );

  const totalBorrowedRemaining = useMemo(
    () =>
      borrowedDebts
        .filter((d) => !d.isSettled)
        .reduce((sum, d) => sum + d.remainingAmount, 0),
    [borrowedDebts]
  );

  const activeLentCount = useMemo(
    () => lentDebts.filter((d) => !d.isSettled).length,
    [lentDebts]
  );

  const activeBorrowedCount = useMemo(
    () => borrowedDebts.filter((d) => !d.isSettled).length,
    [borrowedDebts]
  );

  return (
    <DebtsContext.Provider
      value={{
        debts,
        lentDebts,
        borrowedDebts,
        totalLentRemaining,
        totalBorrowedRemaining,
        activeLentCount,
        activeBorrowedCount,
        isLoading,
        refreshDebts: loadDebts,
        createDebt,
        updateDebt,
        deleteDebt,
        recordRepayment,
        toggleSettleManually,
      }}
    >
      {children}
    </DebtsContext.Provider>
  );
}

export function useDebts() {
  const context = useContext(DebtsContext);
  if (!context) {
    throw new Error("useDebts must be used within a DebtsProvider");
  }
  return context;
}
