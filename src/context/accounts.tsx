import { eq, or } from "drizzle-orm";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { addDatabaseChangeListener } from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import { db, ensureDatabaseInitialized, expoDb } from "../db";
import * as schema from "../db/schema";
import { LiquidAssetType } from "../db/schema";

export interface AccountItem {
  id: number;
  name: string;
  assetType: LiquidAssetType;
  accountNumber: string | null;
  initialBalance: number;
  note: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  currentBalance: number;
  transactionCount: number;
}

export interface CreateAccountInput {
  name: string;
  assetType: LiquidAssetType;
  accountNumber?: string | null;
  initialBalance: number;
  note?: string | null;
}

export interface UpdateAccountInput {
  name?: string;
  assetType?: LiquidAssetType;
  accountNumber?: string | null;
  initialBalance?: number;
  note?: string | null;
}

interface AccountsContextType {
  accounts: AccountItem[];
  bankAccounts: AccountItem[];
  cashAccounts: AccountItem[];
  totalBankBalance: number;
  totalCashBalance: number;
  totalLiquidAssets: number;
  isLoading: boolean;
  showBalance: boolean;
  setShowBalance: (show: boolean | ((prev: boolean) => boolean)) => void;
  toggleShowBalance: () => void;
  refreshAccounts: () => void;
  createAccount: (data: CreateAccountInput) => Promise<void>;
  updateAccount: (id: number, data: UpdateAccountInput) => Promise<void>;
  deleteAccount: (id: number, force?: boolean) => Promise<{ archived: boolean }>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(
  undefined
);

interface RawAccountQueryRow {
  id: number;
  name: string;
  asset_type: LiquidAssetType;
  account_number: string | null;
  initial_balance: number;
  note: string | null;
  is_archived: number;
  created_at: string;
  updated_at: string;
  incoming_sum: number | null;
  outgoing_sum: number | null;
  tx_count: number | null;
}

export function AccountsProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<AccountItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showBalance, setShowBalanceState] = useState(true);

  // Load persisted balance visibility preference
  useEffect(() => {
    let isMounted = true;
    SecureStore.getItemAsync("hawk_show_balance")
      .then((val) => {
        if (val !== null && isMounted) {
          setShowBalanceState(val === "true");
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);

  const setShowBalance = useCallback((show: boolean | ((prev: boolean) => boolean)) => {
    setShowBalanceState((prev) => {
      const next = typeof show === "function" ? show(prev) : show;
      SecureStore.setItemAsync("hawk_show_balance", String(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleShowBalance = useCallback(() => {
    setShowBalance((prev) => !prev);
  }, [setShowBalance]);

  const loadAccounts = useCallback(() => {
    try {
      ensureDatabaseInitialized();

      // Query active accounts with calculated incoming & outgoing transaction balances
      const rows = expoDb.getAllSync<RawAccountQueryRow>(`
        SELECT 
          a.id,
          a.name,
          a.asset_type,
          a.account_number,
          a.initial_balance,
          a.note,
          a.is_archived,
          a.created_at,
          a.updated_at,
          COALESCE((SELECT SUM(amount) FROM transactions WHERE to_asset_id = a.id), 0) AS incoming_sum,
          COALESCE((SELECT SUM(amount) FROM transactions WHERE from_asset_id = a.id), 0) AS outgoing_sum,
          COALESCE((SELECT COUNT(*) FROM transactions WHERE from_asset_id = a.id OR to_asset_id = a.id), 0) AS tx_count
        FROM liquid_assets a
        WHERE a.is_archived = 0
        ORDER BY a.created_at DESC;
      `);

      const mapped: AccountItem[] = rows.map((row) => {
        const initial = Number(row.initial_balance) || 0;
        const incoming = Number(row.incoming_sum) || 0;
        const outgoing = Number(row.outgoing_sum) || 0;
        const currentBalance = initial + incoming - outgoing;

        return {
          id: row.id,
          name: row.name,
          assetType: row.asset_type,
          accountNumber: row.account_number,
          initialBalance: initial,
          note: row.note,
          isArchived: Boolean(row.is_archived),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          currentBalance,
          transactionCount: Number(row.tx_count) || 0,
        };
      });

      setAccounts(mapped);
    } catch (err) {
      console.error("Failed to load accounts:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAccounts();

    // Listen to real-time changes in SQLite database
    let subscription: { remove: () => void } | undefined;
    try {
      subscription = addDatabaseChangeListener((event) => {
        if (
          !event?.tableName ||
          event.tableName === "liquid_assets" ||
          event.tableName === "transactions"
        ) {
          loadAccounts();
        }
      });
    } catch (err) {
      console.warn("addDatabaseChangeListener failed:", err);
    }

    return () => {
      subscription?.remove();
    };
  }, [loadAccounts]);

  const createAccount = useCallback(
    async (data: CreateAccountInput) => {
      ensureDatabaseInitialized();
      const now = new Date().toISOString();

      db.insert(schema.liquidAssets)
        .values({
          name: data.name.trim(),
          assetType: data.assetType,
          accountNumber: data.accountNumber?.trim() || null,
          initialBalance: Number(data.initialBalance) || 0,
          note: data.note?.trim() || null,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
        })
        .run();

      loadAccounts();
    },
    [loadAccounts]
  );

  const updateAccount = useCallback(
    async (id: number, data: UpdateAccountInput) => {
      ensureDatabaseInitialized();
      const now = new Date().toISOString();

      const updateValues: Partial<typeof schema.liquidAssets.$inferInsert> = {
        updatedAt: now,
      };

      if (data.name !== undefined) updateValues.name = data.name.trim();
      if (data.assetType !== undefined) updateValues.assetType = data.assetType;
      if (data.accountNumber !== undefined)
        updateValues.accountNumber = data.accountNumber?.trim() || null;
      if (data.initialBalance !== undefined)
        updateValues.initialBalance = Number(data.initialBalance) || 0;
      if (data.note !== undefined) updateValues.note = data.note?.trim() || null;

      db.update(schema.liquidAssets)
        .set(updateValues)
        .where(eq(schema.liquidAssets.id, id))
        .run();

      loadAccounts();
    },
    [loadAccounts]
  );

  /**
   * Deletion Policy:
   * - If account has NO past transactions: Full Delete from database.
   * - If account HAS past transactions: Soft Delete (Archive) to preserve ledger history.
   */
  const deleteAccount = useCallback(
    async (id: number, force?: boolean): Promise<{ archived: boolean }> => {
      ensureDatabaseInitialized();

      if (force) {
        // Force delete: clean up linked transactions first to avoid foreign key constraints
        db.delete(schema.transactions)
          .where(
            or(
              eq(schema.transactions.fromAssetId, id),
              eq(schema.transactions.toAssetId, id)
            )
          )
          .run();

        // Permanently delete account record
        db.delete(schema.liquidAssets)
          .where(eq(schema.liquidAssets.id, id))
          .run();

        loadAccounts();
        return { archived: false };
      }

      const txRow = expoDb.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) as count FROM transactions WHERE from_asset_id = ? OR to_asset_id = ?;`,
        [id, id]
      );
      const hasTransactions = (txRow?.count ?? 0) > 0;

      if (hasTransactions) {
        // Soft delete / archive
        db.update(schema.liquidAssets)
          .set({
            isArchived: true,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.liquidAssets.id, id))
          .run();

        loadAccounts();
        return { archived: true };
      } else {
        // Full delete
        db.delete(schema.liquidAssets)
          .where(eq(schema.liquidAssets.id, id))
          .run();

        loadAccounts();
        return { archived: false };
      }
    },
    [loadAccounts]
  );

  const bankAccounts = useMemo(
    () => accounts.filter((a) => a.assetType === "BANK"),
    [accounts]
  );

  const cashAccounts = useMemo(
    () => accounts.filter((a) => a.assetType === "CASH"),
    [accounts]
  );

  const totalBankBalance = useMemo(
    () => bankAccounts.reduce((acc, a) => acc + a.currentBalance, 0),
    [bankAccounts]
  );

  const totalCashBalance = useMemo(
    () => cashAccounts.reduce((acc, a) => acc + a.currentBalance, 0),
    [cashAccounts]
  );

  const totalLiquidAssets = useMemo(
    () => totalBankBalance + totalCashBalance,
    [totalBankBalance, totalCashBalance]
  );

  return (
    <AccountsContext.Provider
      value={{
        accounts,
        bankAccounts,
        cashAccounts,
        totalBankBalance,
        totalCashBalance,
        totalLiquidAssets,
        isLoading,
        showBalance,
        setShowBalance,
        toggleShowBalance,
        refreshAccounts: loadAccounts,
        createAccount,
        updateAccount,
        deleteAccount,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
}

export function useAccounts() {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error("useAccounts must be used within an AccountsProvider");
  }
  return context;
}
