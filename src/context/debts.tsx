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
import { DebtState, DebtType } from "../db/schema";

export interface DebtItem {
  id: number;
  contactId: number;
  contactName: string;
  contactMobile: string | null;
  type: DebtType;
  amount: number;
  dueDate: string | null;
  state: DebtState;
  settledAt: string | null;
  settledNote: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  repaidAmount: number;
  remainingAmount: number;
  progressPercent: number;
  repaymentCount: number;
}

export interface DebtLogItem {
  id: number;
  debtId: number;
  type: "AMOUNT_CHANGED" | "SETTLED_MANUALLY";
  oldAmount: number | null;
  newAmount: number | null;
  note: string | null;
  createdAt: string;
}

export interface DebtTransactionItem {
  id: number;
  amount: number;
  type: string;
  date: string;
  note: string | null;
  fromAssetId: number | null;
  toAssetId: number | null;
  fromAssetName: string | null;
  toAssetName: string | null;
  createdAt: string;
}

export interface CreateDebtInput {
  contactId: number;
  type: DebtType;
  amount: number;
  assetId: number; // Required account to deduct or credit from
  date?: string;
  time?: string;
  dueDate?: string | null;
  note?: string | null;
}

export interface UpdateDebtInput {
  contactId?: number;
  type?: DebtType;
  amount?: number;
  assetId?: number | null;
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
  deleteDebt: (id: number, force?: boolean) => Promise<void>;
  recordRepayment: (data: RecordRepaymentInput) => Promise<void>;
  settleDebtManually: (id: number, note?: string) => Promise<void>;
  toggleSettleManually: (id: number) => Promise<void>;
  getDebtLogs: (debtId: number) => DebtLogItem[];
  getDebtTransactions: (debtId: number) => DebtTransactionItem[];
  deleteDebtPayment: (txId: number, debtId: number) => Promise<void>;
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
  state: DebtState;
  settled_at: string | null;
  settled_note: string | null;
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
          COALESCE(d.state, 'ONGOING') AS state,
          d.settled_at,
          d.settled_note,
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
        ORDER BY d.created_at DESC;
      `);

      const mapped: DebtItem[] = rows.map((row) => {
        const totalAmount = Number(row.amount) || 0;
        const repaid = Number(row.repaid_amount) || 0;
        const remaining = Math.max(0, totalAmount - repaid);
        const percent = totalAmount > 0 ? Math.min(100, Math.round((repaid / totalAmount) * 100)) : 100;

        let debtState: DebtState = (row.state as DebtState) || "ONGOING";
        if (debtState !== "WRITTEN_OFF") {
          debtState = remaining <= 0 && totalAmount > 0 ? "REPAID" : "ONGOING";
        }

        return {
          id: row.id,
          contactId: row.contact_id,
          contactName: row.contact_name || "Unknown Contact",
          contactMobile: row.contact_mobile,
          type: row.type,
          amount: totalAmount,
          dueDate: row.due_date,
          state: debtState,
          settledAt: row.settled_at,
          settledNote: row.settled_note,
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
      const dateString = data.date || now.split("T")[0];

      let createdAtTimestamp = now;
      if (data.date) {
        if (data.time && data.time.includes(":")) {
          const parts = data.time.trim().split(" ");
          const hm = (parts[0] || "").split(":");
          let h = parseInt(hm[0], 10);
          const m = parseInt(hm[1], 10) || 0;
          if (parts[1] === "PM" && h < 12) h += 12;
          if (parts[1] === "AM" && h === 12) h = 0;
          const hh = String(h).padStart(2, "0");
          const mm = String(m).padStart(2, "0");
          createdAtTimestamp = `${data.date}T${hh}:${mm}:00.000Z`;
        } else {
          createdAtTimestamp = `${data.date}T12:00:00.000Z`;
        }
      }

      const inserted = db
        .insert(schema.debts)
        .values({
          contactId: data.contactId,
          type: data.type,
          amount: Number(data.amount) || 0,
          dueDate: data.dueDate?.trim() || null,
          note: data.note?.trim() || null,
          state: "ONGOING",
          createdAt: createdAtTimestamp,
          updatedAt: createdAtTimestamp,
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
            createdAt: createdAtTimestamp,
            updatedAt: createdAtTimestamp,
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

      const existingDebt = debts.find((d) => d.id === id);
      const updateValues: Partial<typeof schema.debts.$inferInsert> = {
        updatedAt: now,
      };

      if (data.contactId !== undefined) {
        updateValues.contactId = data.contactId;
        // Sync contactId across ALL transactions linked to this debt
        db.update(schema.transactions)
          .set({ contactId: data.contactId, updatedAt: now })
          .where(eq(schema.transactions.debtId, id))
          .run();
      }

      if (data.type !== undefined) updateValues.type = data.type;

      if (data.amount !== undefined) {
        const newAmount = Number(data.amount) || 0;
        if (existingDebt && newAmount < existingDebt.repaidAmount) {
          throw new Error(
            `Amount cannot be less than the already repaid amount (${existingDebt.repaidAmount})`
          );
        }
        updateValues.amount = newAmount;

        // If amount changed, write to debt_logs
        if (existingDebt && existingDebt.amount !== newAmount) {
          db.insert(schema.debtLogs)
            .values({
              debtId: id,
              type: "AMOUNT_CHANGED",
              oldAmount: existingDebt.amount,
              newAmount: newAmount,
              note: data.note?.trim() || null,
              createdAt: now,
            })
            .run();
        }

        // If new amount is fully covered by repayments, mark as settled
        if (existingDebt && newAmount <= existingDebt.repaidAmount) {
          updateValues.state = "REPAID";
          updateValues.settledAt = now;
        } else if (existingDebt && existingDebt.state === "REPAID" && newAmount > existingDebt.repaidAmount) {
          updateValues.state = "ONGOING";
          updateValues.settledAt = null;
        }
      }

      if (data.dueDate !== undefined) updateValues.dueDate = data.dueDate?.trim() || null;
      if (data.note !== undefined) updateValues.note = data.note?.trim() || null;

      db.update(schema.debts)
        .set(updateValues)
        .where(eq(schema.debts.id, id))
        .run();

      // Sync the initial loan transaction (amount, account, contact, dueDate, note)
      const initialTx = expoDb.getFirstSync<{ id: number; type: string }>(
        `SELECT id, type FROM transactions WHERE debt_id = ? AND (type = 'LEND' OR type = 'BORROW');`,
        [id]
      );

      if (initialTx) {
        const txUpdate: Partial<typeof schema.transactions.$inferInsert> = {
          updatedAt: now,
        };
        if (data.amount !== undefined) txUpdate.amount = Number(data.amount) || 0;
        if (data.dueDate !== undefined) txUpdate.dueDate = data.dueDate?.trim() || null;
        if (data.note !== undefined) txUpdate.note = data.note?.trim() || null;
        if (data.contactId !== undefined) txUpdate.contactId = data.contactId;

        if (data.assetId !== undefined && data.assetId !== null) {
          const currentType = data.type || existingDebt?.type || initialTx.type;
          const isLend = currentType === "LEND";
          if (isLend) {
            txUpdate.fromAssetId = data.assetId;
            txUpdate.toAssetId = null;
          } else {
            txUpdate.toAssetId = data.assetId;
            txUpdate.fromAssetId = null;
          }
        }

        db.update(schema.transactions)
          .set(txUpdate)
          .where(eq(schema.transactions.id, initialTx.id))
          .run();
      }

      loadDebts();
    },
    [debts, loadDebts]
  );

  const deleteDebt = useCallback(
    async (id: number): Promise<void> => {
      ensureDatabaseInitialized();

      // Delete all linked transactions (initial loan and any repayments)
      // Dynamic SQL aggregation automatically reverts balances across all involved accounts!
      db.delete(schema.transactions)
        .where(eq(schema.transactions.debtId, id))
        .run();

      // Delete debt logs
      db.delete(schema.debtLogs)
        .where(eq(schema.debtLogs.debtId, id))
        .run();

      // Delete the debt record
      db.delete(schema.debts).where(eq(schema.debts.id, id)).run();

      loadDebts();
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

      const debtCreatedDate = debt.createdAt ? debt.createdAt.split("T")[0] : "";
      if (debtCreatedDate && dateString < debtCreatedDate) {
        throw new Error(
          `Repayment date cannot be earlier than the debt creation date (${debtCreatedDate}).`
        );
      }

      const parsedAmount = Number(data.amount) || 0;
      if (parsedAmount > debt.remainingAmount) {
        throw new Error(
          `Repayment amount cannot exceed remaining balance (${debt.remainingAmount}).`
        );
      }

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
            state: "REPAID",
            settledAt: now,
            settledNote: null,
            updatedAt: now,
          })
          .where(eq(schema.debts.id, debt.id))
          .run();
      }

      loadDebts();
    },
    [debts, loadDebts]
  );

  const settleDebtManually = useCallback(
    async (id: number, note?: string) => {
      ensureDatabaseInitialized();
      const debt = debts.find((d) => d.id === id);
      if (!debt) return;

      const now = new Date().toISOString();
      const noteClean = note?.trim() || "Settled manually";

      db.insert(schema.debtLogs)
        .values({
          debtId: id,
          type: "SETTLED_MANUALLY",
          note: noteClean,
          createdAt: now,
        })
        .run();

      db.update(schema.debts)
        .set({
          state: "WRITTEN_OFF",
          settledAt: now,
          settledNote: noteClean,
          updatedAt: now,
        })
        .where(eq(schema.debts.id, id))
        .run();

      loadDebts();
    },
    [debts, loadDebts]
  );

  const toggleSettleManually = useCallback(
    async (id: number) => {
      ensureDatabaseInitialized();
      const debt = debts.find((d) => d.id === id);
      if (!debt) return;

      const isCurrentlyWrittenOff = debt.state === "WRITTEN_OFF";
      const now = new Date().toISOString();

      if (!isCurrentlyWrittenOff) {
        db.insert(schema.debtLogs)
          .values({
            debtId: id,
            type: "SETTLED_MANUALLY",
            note: "Written off",
            createdAt: now,
          })
          .run();
      }

      const nextState = isCurrentlyWrittenOff
        ? debt.remainingAmount <= 0
          ? "REPAID"
          : "ONGOING"
        : "WRITTEN_OFF";

      db.update(schema.debts)
        .set({
          state: nextState,
          settledAt: !isCurrentlyWrittenOff ? now : null,
          settledNote: !isCurrentlyWrittenOff ? "Written off" : null,
          updatedAt: now,
        })
        .where(eq(schema.debts.id, id))
        .run();

      loadDebts();
    },
    [debts, loadDebts]
  );

  const getDebtLogs = useCallback((debtId: number): DebtLogItem[] => {
    ensureDatabaseInitialized();
    try {
      const rows = expoDb.getAllSync<DebtLogItem>(
        `SELECT id, debt_id as debtId, type, old_amount as oldAmount, new_amount as newAmount, note, created_at as createdAt 
         FROM debt_logs 
         WHERE debt_id = ? 
         ORDER BY created_at DESC;`,
        [debtId]
      );
      return rows;
    } catch (err) {
      console.error("Failed to fetch debt logs:", err);
      return [];
    }
  }, []);

  const getDebtTransactions = useCallback((debtId: number): DebtTransactionItem[] => {
    ensureDatabaseInitialized();
    try {
      const rows = expoDb.getAllSync<DebtTransactionItem>(
        `SELECT 
           t.id, t.amount, t.type, t.date, t.note,
           t.from_asset_id as fromAssetId, t.to_asset_id as toAssetId,
           fa.name as fromAssetName, ta.name as toAssetName,
           t.created_at as createdAt
         FROM transactions t
         LEFT JOIN liquid_assets fa ON fa.id = t.from_asset_id
         LEFT JOIN liquid_assets ta ON ta.id = t.to_asset_id
         WHERE t.debt_id = ?
         ORDER BY t.date DESC, t.created_at DESC;`,
        [debtId]
      );
      return rows;
    } catch (err) {
      console.error("Failed to fetch debt transactions:", err);
      return [];
    }
  }, []);

  const deleteDebtPayment = useCallback(
    async (txId: number, debtId: number) => {
      ensureDatabaseInitialized();
      db.delete(schema.transactions).where(eq(schema.transactions.id, txId)).run();

      // Check remaining after deletion
      const sumRow = expoDb.getFirstSync<{ repaid: number }>(
        `SELECT SUM(amount) as repaid FROM transactions WHERE debt_id = ? AND (type = 'DEBT PAID' OR type = 'DEBT RECEIVED');`,
        [debtId]
      );
      const repaid = Number(sumRow?.repaid) || 0;
      const debtRow = expoDb.getFirstSync<{ amount: number; state: string }>(
        `SELECT amount, state FROM debts WHERE id = ?;`,
        [debtId]
      );
      if (debtRow && debtRow.state !== "WRITTEN_OFF") {
        const stillSettled = repaid >= debtRow.amount;
        db.update(schema.debts)
          .set({
            state: stillSettled ? "REPAID" : "ONGOING",
            settledAt: stillSettled ? undefined : null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.debts.id, debtId))
          .run();
      }
      loadDebts();
    },
    [loadDebts]
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
        .filter((d) => d.state === "ONGOING")
        .reduce((sum, d) => sum + d.remainingAmount, 0),
    [lentDebts]
  );

  const totalBorrowedRemaining = useMemo(
    () =>
      borrowedDebts
        .filter((d) => d.state === "ONGOING")
        .reduce((sum, d) => sum + d.remainingAmount, 0),
    [borrowedDebts]
  );

  const activeLentCount = useMemo(
    () => lentDebts.filter((d) => d.state === "ONGOING").length,
    [lentDebts]
  );

  const activeBorrowedCount = useMemo(
    () => borrowedDebts.filter((d) => d.state === "ONGOING").length,
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
        settleDebtManually,
        toggleSettleManually,
        getDebtLogs,
        getDebtTransactions,
        deleteDebtPayment,
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
