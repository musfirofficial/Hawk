import { relations, sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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

export const SUPPORTED_CURRENCIES = [
  // --- Original Currencies ---
  { code: "USD", symbol: "\u0024", name: "US Dollar" }, // $
  { code: "EUR", symbol: "\u20AC", name: "Euro" }, // €
  { code: "GBP", symbol: "\u00A3", name: "British Pound" }, // £
  { code: "INR", symbol: "\u20B9", name: "Indian Rupee" }, // ₹
  { code: "AED", symbol: "\u062F\u002E\u0625", name: "UAE Dirham" }, // د.إ
  { code: "SAR", symbol: "\uFDFC", name: "Saudi Riyal" }, // ﷼
  { code: "JPY", symbol: "\u00A5", name: "Japanese Yen" }, // ¥
  { code: "CAD", symbol: "\u0024", name: "Canadian Dollar" }, // $
  { code: "AUD", symbol: "\u0024", name: "Australian Dollar" }, // $
  { code: "SGD", symbol: "\u0024", name: "Singapore Dollar" }, // $
  { code: "CHF", symbol: "\u0046\u0072", name: "Swiss Franc" }, // Fr
  { code: "CNY", symbol: "\u00A5", name: "Chinese Yuan" }, // ¥
  { code: "BRL", symbol: "\u0052\u0024", name: "Brazilian Real" }, // R$
  { code: "TRY", symbol: "\u20BA", name: "Turkish Lira" }, // ₺
  { code: "LKR", symbol: "\u0052\u0073", name: "Srilanka Rupee" }, // Rs
  { code: "CNH", symbol: "\u00A5", name: "Chinese Renminbi" }, // ¥
  { code: "HKD", symbol: "\u0024", name: "Hong Kong Dollar" }, // $
  { code: "NZD", symbol: "\u0024", name: "New Zealand Dollar" }, // $
  { code: "KRW", symbol: "\u20A9", name: "South Korean Won" }, // ₩
  { code: "MXN", symbol: "\u0024", name: "Mexican Peso" }, // $
  { code: "ZAR", symbol: "\u0052", name: "South African Rand" }, // R
  { code: "IDR", symbol: "\u0052\u0070", name: "Indonesian Rupiah" }, // Rp
  { code: "MYR", symbol: "\u0052\u004D", name: "Malaysian Ringgit" }, // RM
  { code: "THB", symbol: "\u0E3F", name: "Thai Baht" }, // ฿
  { code: "KWD", symbol: "\u062F\u002E\u0643", name: "Kuwaiti Dinar" }, // د.ك
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number]["code"];

export const NUMBER_FORMATS = [
  {
    id: "COMMA_DOT",
    label: "Comma separator",
  },
  {
    id: "DOT_COMMA",
    label: "Period separator",
  },
] as const;

export type NumberFormatId = (typeof NUMBER_FORMATS)[number]["id"];

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
  isArchived: integer("is_archived", { mode: "boolean" })
    .default(false)
    .notNull(), // Archive instead of deleting
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
  isArchived: integer("is_archived", { mode: "boolean" })
    .default(false)
    .notNull(), // Archive instead of deleting
  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

// ==========================================
// 3. Categories Table
// ==========================================
export const categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // e.g. Food, Salary, Rent
  icon: text("icon"), // icon name (not unique)
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
  isSettled: integer("is_settled", { mode: "boolean" })
    .default(false)
    .notNull(), // Automatically true when fully paid
  isSettledManually: integer("is_settled_manually", { mode: "boolean" })
    .default(false)
    .notNull(), // Manual settlement / forgiveness
  isArchived: integer("is_archived", { mode: "boolean" })
    .default(false)
    .notNull(),
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
// 7. App Settings & User Profile Table
// ==========================================
export const appSettings = sqliteTable("app_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userName: text("user_name").notNull(), // Required user name
  currency: text("currency"), // Default null, chosen in onboarding
  numberFormat: text("number_format").default("COMMA_DOT").notNull(), // 'COMMA_DOT' (1,234.56) or 'DOT_COMMA' (1.234,56)
  hasOnboarded: integer("has_onboarded", { mode: "boolean" })
    .default(false)
    .notNull(),
  lastBackup: text("last_backup"), // Timestamp of last Google Drive backup
  profilePic: text("profile_pic"), // Local path/URI only, excluded from cloud sync
  pin: text("pin"), // 4-digit security PIN
  recoveryKey: text("recovery_key"), // 8-character reset recovery key
  biometricsEnabled: integer("biometrics_enabled", { mode: "boolean" })
    .default(false)
    .notNull(),
  googleEmail: text("google_email"),
  googleName: text("google_name"),
  createdAt: text("created_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
  updatedAt: text("updated_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type AppSettings = typeof appSettings.$inferSelect;
export type NewAppSettings = typeof appSettings.$inferInsert;

// ==========================================
// 8. Security Rules / Protected Actions Table (Column-based)
// ==========================================
export const securityRules = sqliteTable("security_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // Deletions
  deleteTransaction: integer("delete_transaction", { mode: "boolean" })
    .default(true)
    .notNull(),
  deleteAccount: integer("delete_account", { mode: "boolean" })
    .default(true)
    .notNull(),
  deleteContact: integer("delete_contact", { mode: "boolean" })
    .default(true)
    .notNull(),
  deleteDebt: integer("delete_debt", { mode: "boolean" })
    .default(true)
    .notNull(),
  // Creations
  createTransaction: integer("create_transaction", { mode: "boolean" })
    .default(false)
    .notNull(),
  createAccount: integer("create_account", { mode: "boolean" })
    .default(false)
    .notNull(),
  // Account & System
  editProfile: integer("edit_profile", { mode: "boolean" })
    .default(true)
    .notNull(),
  manageAccount: integer("manage_account", { mode: "boolean" })
    .default(true)
    .notNull(),
  backupRestore: integer("backup_restore", { mode: "boolean" })
    .default(true)
    .notNull(),
  resetData: integer("reset_data", { mode: "boolean" }).default(true).notNull(),
  updatedAt: text("updated_at")
    .default(sql`(CURRENT_TIMESTAMP)`)
    .notNull(),
});

export type SecurityRules = typeof securityRules.$inferSelect;
export type NewSecurityRules = typeof securityRules.$inferInsert;
export type SecurityRuleKey = keyof Omit<SecurityRules, "id" | "updatedAt">;

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
