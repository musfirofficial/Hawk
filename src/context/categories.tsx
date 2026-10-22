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
import { CategoryType } from "../db/schema";
import * as schema from "../db/schema";

export interface CategoryItem {
  id: number;
  name: string;
  type: CategoryType;
  icon: string | null;
  transactionCount: number;
}

export interface CreateCategoryInput {
  name: string;
  type: CategoryType;
  icon?: string | null;
}

export interface UpdateCategoryInput {
  name?: string;
  type?: CategoryType;
  icon?: string | null;
}

interface CategoriesContextType {
  categories: CategoryItem[];
  isLoading: boolean;
  refreshCategories: () => void;
  createCategory: (data: CreateCategoryInput) => Promise<number>;
  updateCategory: (id: number, data: UpdateCategoryInput) => Promise<void>;
  deleteCategory: (
    id: number
  ) => Promise<{ success: boolean; hasTransactions: boolean }>;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(
  undefined
);

interface RawCategoryQueryRow {
  id: number;
  name: string;
  type: string;
  icon: string | null;
  transaction_count: number;
}

export function CategoriesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(() => {
    try {

      const rows = expoDb.getAllSync<RawCategoryQueryRow>(`
        SELECT 
          c.id,
          c.name,
          c.type,
          c.icon,
          COUNT(t.id) AS transaction_count
        FROM categories c
        LEFT JOIN transactions t ON t.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC;
      `);

      const mapped: CategoryItem[] = rows.map((r) => ({
        id: r.id,
        name: r.name,
        type: (r.type as CategoryType) || "EXPENSE",
        icon: r.icon,
        transactionCount: Number(r.transaction_count) || 0,
      }));

      setCategories(mapped);
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    let subscription: { remove: () => void } | undefined;
    try {
      subscription = addDatabaseChangeListener((event) => {
        if (!event?.tableName || event.tableName === "categories") {
          loadData();
        }
      });
    } catch (err) {
      console.warn("addDatabaseChangeListener error for categories:", err);
    }

    return () => {
      subscription?.remove();
    };
  }, [loadData]);

  const createCategory = useCallback(
    async (data: CreateCategoryInput): Promise<number> => {

      try {
        const inserted = db
          .insert(schema.categories)
          .values({
            name: data.name.trim(),
            type: data.type || "EXPENSE",
            icon: data.icon || "pricetag-outline",
          })
          .returning({ id: schema.categories.id })
          .get();

        loadData();
        return inserted.id;
      } catch (err: any) {
        if (String(err?.message || "").includes("NOT NULL") || String(err?.message || "").includes("no column named type")) {
          expoDb.runSync(
            `INSERT INTO categories (name, type, icon) VALUES (?, ?, ?);`,
            [data.name.trim(), data.type || "EXPENSE", data.icon || "pricetag-outline"]
          );
          const row = expoDb.getFirstSync<{ id: number }>(
            "SELECT last_insert_rowid() AS id;"
          );
          loadData();
          return row?.id ?? 0;
        }
        throw err;
      }
    },
    [loadData]
  );

  const updateCategory = useCallback(
    async (id: number, data: UpdateCategoryInput) => {

      db.update(schema.categories)
        .set({
          ...(data.name !== undefined && { name: data.name.trim() }),
          ...(data.type !== undefined && { type: data.type }),
          ...(data.icon !== undefined && { icon: data.icon }),
        })
        .where(eq(schema.categories.id, id))
        .run();

      loadData();
    },
    [loadData]
  );

  const deleteCategory = useCallback(
    async (
      id: number
    ): Promise<{ success: boolean; hasTransactions: boolean }> => {

      // Check linked transactions count
      const checkRow = expoDb.getFirstSync<{ count: number }>(
        `SELECT COUNT(*) AS count FROM transactions WHERE category_id = ?;`,
        [id]
      );
      const hasTransactions = Boolean(checkRow && checkRow.count > 0);

      // Atomically clean up references and delete category
      expoDb.withTransactionSync(() => {
        db.update(schema.transactions)
          .set({ categoryId: null, updatedAt: new Date().toISOString() })
          .where(eq(schema.transactions.categoryId, id))
          .run();

        expoDb.runSync(`DELETE FROM budget_categories WHERE category_id = ?;`, [id]);

        db.delete(schema.categories).where(eq(schema.categories.id, id)).run();
      });

      loadData();
      return { success: true, hasTransactions };
    },
    [loadData]
  );

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        isLoading,
        refreshCategories: loadData,
        createCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error("useCategories must be used within a CategoriesProvider");
  }
  return context;
}
