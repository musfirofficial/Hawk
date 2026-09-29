import { sql, relations } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// ==========================================
// Constants & Types
// ==========================================
export const TRANSACTION_TYPES = [
  "INCOME",
  "EXPENSE",
  "TRANSFER",
  "LEND", // Debt Given
  "BORROW", // Debt Received
  "DEBT PAID", // Pay received Debt
  "DEBT RECEIVED", // Received Given Debt
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const LIQUID_ASSET_TYPES = ["CASH", "BANK"] as const;
export type LiquidAssetType = (typeof LIQUID_ASSET_TYPES)[number];

export const CATEGORY_TYPES = ["INCOME", "EXPENSE"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const DEBT_TYPES = ["LEND", "BORROW"] as const;
export type DebtType = (typeof DEBT_TYPES)[number];

// ==========================================
// 1. Liquid Assets Table (Cash & Bank)
// ==========================================
export const liquidAssets = sqliteTable("liquid_assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // e.g. "Main Bank", "Wallet", "Petty Cash"
  assetType: text("asset_type", { enum: LIQUID_ASSET_TYPES }).notNull(),
  accountNumber: text("account_number"), // Optional, for Bank accounts
  initialBalance: real("initial_balance").default(0).notNull(), // Starting balance without extra transaction
  note: text("note"),
  isArchived: integer("is_archived", { mode: "boolean" }).default(false).notNull(), // Archive instead of deleting
  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

// Alias for convenience across the codebase
export const accounts = liquidAssets;

// ==========================================
// 2. Contacts Table (Persons / Companies)
// ==========================================
export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  mobileNumber: text("mobile_number"),
  note: text("note"),
  isArchived: integer("is_archived", { mode: "boolean" }).default(false).notNull(), // Archive instead of deleting
  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

// ==========================================
// 3. Categories Table (For Income & Expense)
// ==========================================
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // e.g. Food, Salary, Rent
  type: text("type", { enum: CATEGORY_TYPES }).notNull(),
  icon: text("icon"),
  color: text("color"),
  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

// ==========================================
// 4. Debts Table (Lend & Borrow Records)
// ==========================================
export const debts = sqliteTable("debts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contactId: integer("contact_id")
    .references(() => contacts.id, { onDelete: "restrict" })
    .notNull(),
  type: text("type", { enum: DEBT_TYPES }).notNull(), // 'LEND' | 'BORROW'
  amount: real("amount").notNull(), // Total initial amount of the debt
  dueDate: text("due_date"), // Optional deadline for repayment
  isSettled: integer("is_settled", { mode: "boolean" }).default(false).notNull(), // Automatically true when fully paid
  isSettledManually: integer("is_settled_manually", { mode: "boolean" }).default(false).notNull(), // Manual settlement / forgiveness
  note: text("note"),
  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

// ==========================================
// 5. Transactions Table (All 7 types + Repayments)
// ==========================================
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  amount: real("amount").notNull(),
  type: text("type", { enum: TRANSACTION_TYPES }).notNull(),

  // Cash Flow Links
  fromAssetId: integer("from_asset_id").references(() => liquidAssets.id, {
    onDelete: "restrict",
  }),
  toAssetId: integer("to_asset_id").references(() => liquidAssets.id, {
    onDelete: "restrict",
  }),

  // Optional Category (strictly for INCOME and EXPENSE)
  categoryId: integer("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),

  // Optional Contact involved (LEND, BORROW, DEBT PAID, DEBT RECEIVED)
  contactId: integer("contact_id").references(() => contacts.id, {
    onDelete: "restrict",
  }),

  // Linked Debt (For initial LEND/BORROW and subsequent repayments)
  debtId: integer("debt_id").references(() => debts.id, {
    onDelete: "restrict",
  }),

  date: text("date").notNull(), // Format: YYYY-MM-DD or ISO timestamp
  dueDate: text("due_date"), // Optional due date for lend/borrow
  note: text("note"),

  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

// ==========================================
// 6. Budgets Table
// ==========================================
export const budgets = sqliteTable("budgets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id")
    .references(() => categories.id, { onDelete: "cascade" })
    .notNull(),
  amount: real("amount").notNull(),
  period: text("period").default("MONTHLY").notNull(),
  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

// ==========================================
// Drizzle Relations
// ==========================================
export const liquidAssetsRelations = relations(liquidAssets, ({ many }) => ({
  outgoingTransactions: many(transactions, { relationName: "fromAsset" }),
  incomingTransactions: many(transactions, { relationName: "toAsset" }),
}));

export const contactsRelations = relations(contacts, ({ many }) => ({
  debts: many(debts),
  transactions: many(transactions),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const debtsRelations = relations(debts, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [debts.contactId],
    references: [contacts.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  fromAsset: one(liquidAssets, {
    fields: [transactions.fromAssetId],
    references: [liquidAssets.id],
    relationName: "fromAsset",
  }),
  toAsset: one(liquidAssets, {
    fields: [transactions.toAssetId],
    references: [liquidAssets.id],
    relationName: "toAsset",
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  contact: one(contacts, {
    fields: [transactions.contactId],
    references: [contacts.id],
  }),
  debt: one(debts, {
    fields: [transactions.debtId],
    references: [debts.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));
