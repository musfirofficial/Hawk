import { drizzle } from "drizzle-orm/expo-sqlite";
import { openDatabaseSync } from "expo-sqlite";
import * as schema from "./schema";

export const expoDb = openDatabaseSync("hawk.db", {
  enableChangeListener: true,
});
export const db = drizzle(expoDb, { schema });

let isMigrated = false;

export function ensureDatabaseInitialized() {
  if (isMigrated) return;
  try {
    // Synchronously ensure all schema tables exist before any queries execute
    expoDb.execSync(`
      CREATE TABLE IF NOT EXISTS liquid_assets (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        asset_type TEXT NOT NULL,
        account_number TEXT,
        initial_balance REAL DEFAULT 0 NOT NULL,
        note TEXT,
        is_archived INTEGER DEFAULT 0 NOT NULL,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        type TEXT DEFAULT 'EXPENSE' NOT NULL,
        icon TEXT,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        mobile_number TEXT,
        note TEXT,
        avatar_svg TEXT,
        is_archived INTEGER DEFAULT 0 NOT NULL,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS debts (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        contact_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        due_date TEXT,
        state TEXT DEFAULT 'ONGOING' NOT NULL,
        settled_at TEXT,
        settled_note TEXT,
        note TEXT,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS debt_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        debt_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        old_amount REAL,
        new_amount REAL,
        note TEXT,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        from_asset_id INTEGER,
        to_asset_id INTEGER,
        category_id INTEGER,
        contact_id INTEGER,
        debt_id INTEGER,
        date TEXT NOT NULL,
        due_date TEXT,
        note TEXT,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS budgets (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        month TEXT NOT NULL,
        template INTEGER DEFAULT 0 NOT NULL,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS budget_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        budget_id INTEGER NOT NULL,
        category_id INTEGER NOT NULL,
        month TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS app_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        user_name TEXT NOT NULL,
        currency TEXT,
        number_format TEXT DEFAULT 'COMMA_DOT' NOT NULL,
        has_onboarded INTEGER DEFAULT 0 NOT NULL,
        last_backup TEXT,
        profile_pic TEXT,
        pin TEXT,
        recovery_key TEXT,
        pin_enabled INTEGER DEFAULT 1 NOT NULL,
        biometrics_enabled INTEGER DEFAULT 0 NOT NULL,
        app_lock_enabled INTEGER DEFAULT 0 NOT NULL,
        google_email TEXT,
        google_name TEXT,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS security_rules (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        delete_transaction INTEGER DEFAULT 1 NOT NULL,
        delete_account INTEGER DEFAULT 1 NOT NULL,
        delete_contact INTEGER DEFAULT 1 NOT NULL,
        delete_debt INTEGER DEFAULT 1 NOT NULL,
        create_transaction INTEGER DEFAULT 0 NOT NULL,
        create_account INTEGER DEFAULT 0 NOT NULL,
        edit_profile INTEGER DEFAULT 1 NOT NULL,
        manage_account INTEGER DEFAULT 1 NOT NULL,
        backup_restore INTEGER DEFAULT 1 NOT NULL,
        reset_data INTEGER DEFAULT 1 NOT NULL,
        updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
      );
    `);

    // Safe column migrations for existing databases
    try {
      expoDb.execSync("ALTER TABLE app_settings ADD COLUMN pin TEXT;");
    } catch {}
    try {
      expoDb.execSync("ALTER TABLE app_settings ADD COLUMN recovery_key TEXT;");
    } catch {}
    try {
      expoDb.execSync(
        "ALTER TABLE app_settings ADD COLUMN pin_enabled INTEGER DEFAULT 1 NOT NULL;"
      );
    } catch {}
    try {
      expoDb.execSync(
        "ALTER TABLE app_settings ADD COLUMN biometrics_enabled INTEGER DEFAULT 0 NOT NULL;"
      );
    } catch {}
    try {
      expoDb.execSync(
        "ALTER TABLE app_settings ADD COLUMN app_lock_enabled INTEGER DEFAULT 0 NOT NULL;"
      );
    } catch {}
    try {
      expoDb.execSync("ALTER TABLE app_settings ADD COLUMN lockout_until TEXT;");
    } catch {}
    try {
      expoDb.execSync(
        "ALTER TABLE app_settings ADD COLUMN failed_recovery_attempts INTEGER DEFAULT 0 NOT NULL;"
      );
    } catch {}
    try {
      expoDb.execSync("ALTER TABLE app_settings ADD COLUMN pin_lockout_until TEXT;");
    } catch {}
    try {
      expoDb.execSync(
        "ALTER TABLE app_settings ADD COLUMN failed_pin_attempts INTEGER DEFAULT 0 NOT NULL;"
      );
    } catch {}
    try {
      expoDb.execSync("ALTER TABLE debts ADD COLUMN settled_at TEXT;");
    } catch {}
    try {
      expoDb.execSync("ALTER TABLE debts ADD COLUMN settled_note TEXT;");
    } catch {}
    try {
      expoDb.execSync(
        "ALTER TABLE debts ADD COLUMN state TEXT DEFAULT 'ONGOING' NOT NULL;"
      );
    } catch {}
    try {
      expoDb.execSync(`
        UPDATE debts 
        SET state = 'WRITTEN_OFF' 
        WHERE (state = 'ONGOING' OR state IS NULL) AND is_settled_manually = 1;
      `);
      expoDb.execSync(`
        UPDATE debts 
        SET state = 'REPAID' 
        WHERE (state = 'ONGOING' OR state IS NULL) AND is_settled = 1 AND (is_settled_manually = 0 OR is_settled_manually IS NULL);
      `);
    } catch {}
    try {
      expoDb.execSync(`
        CREATE TABLE IF NOT EXISTS debt_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          debt_id INTEGER NOT NULL,
          type TEXT NOT NULL,
          old_amount REAL,
          new_amount REAL,
          note TEXT,
          created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
        );
      `);
    } catch {}
    try {
      expoDb.execSync("ALTER TABLE contacts ADD COLUMN avatar_svg TEXT;");
    } catch {}
    // Migration: Migrate contacts table away from column-level UNIQUE constraint to partial unique index
    try {
      const tableInfo = expoDb.getFirstSync<{ sql: string }>(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'contacts';"
      );
      if (
        tableInfo?.sql &&
        /name\s+TEXT\s+NOT\s+NULL\s+UNIQUE/i.test(tableInfo.sql)
      ) {
        expoDb.execSync(`
          PRAGMA foreign_keys = OFF;
          CREATE TABLE IF NOT EXISTS contacts_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
            name TEXT NOT NULL,
            mobile_number TEXT,
            note TEXT,
            avatar_svg TEXT,
            is_archived INTEGER DEFAULT 0 NOT NULL,
            created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
            updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
          );
          INSERT INTO contacts_new (id, name, mobile_number, note, avatar_svg, is_archived, created_at, updated_at)
          SELECT id, name, mobile_number, note, avatar_svg, is_archived, created_at, updated_at FROM contacts;
          DROP TABLE contacts;
          ALTER TABLE contacts_new RENAME TO contacts;
          PRAGMA foreign_keys = ON;
        `);
      }
    } catch (err) {
      console.error("Migration error updating contacts table unique constraint:", err);
    }
    try {
      expoDb.execSync("DROP INDEX IF EXISTS idx_contacts_name;");
    } catch {}
    try {
      expoDb.execSync(
        "CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_active_name ON contacts (LOWER(name)) WHERE is_archived = 0;"
      );
    } catch {}

    // Ensure categories table has 'type' column
    try {
      const catCols = expoDb.getAllSync<{ name: string }>(
        "PRAGMA table_info(categories);"
      );
      const hasTypeCol = catCols.some((col) => col.name === "type");
      if (!hasTypeCol) {
        expoDb.execSync(
          "ALTER TABLE categories ADD COLUMN type TEXT DEFAULT 'EXPENSE' NOT NULL;"
        );
      }
    } catch (err) {
      console.warn("Categories type column migration warning:", err);
    }

    // Ensure budgets and budget_categories tables schema migration
    try {
      expoDb.execSync(`
        CREATE TABLE IF NOT EXISTS budget_categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
          budget_id INTEGER NOT NULL,
          category_id INTEGER NOT NULL,
          month TEXT NOT NULL,
          amount REAL NOT NULL,
          created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
        );
      `);

      const budgetCols = expoDb.getAllSync<{ name: string }>(
        "PRAGMA table_info(budgets);"
      );
      const colNames = new Set(budgetCols.map((c) => c.name));
      if (!colNames.has("name")) {
        expoDb.execSync(
          "ALTER TABLE budgets ADD COLUMN name TEXT DEFAULT 'Monthly Budget' NOT NULL;"
        );
      }
      if (!colNames.has("month")) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        expoDb.execSync(
          `ALTER TABLE budgets ADD COLUMN month TEXT DEFAULT '${currentMonth}' NOT NULL;`
        );
      }
      if (!colNames.has("updated_at")) {
        expoDb.execSync(
          "ALTER TABLE budgets ADD COLUMN updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL;"
        );
      }
      if (!colNames.has("template")) {
        expoDb.execSync(
          "ALTER TABLE budgets ADD COLUMN template INTEGER DEFAULT 0 NOT NULL;"
        );
      }

      // Check budget_categories columns
      const bcCols = expoDb.getAllSync<{ name: string }>(
        "PRAGMA table_info(budget_categories);"
      );
      const bcColNames = new Set(bcCols.map((c) => c.name));
      if (!bcColNames.has("month")) {
        const currentMonth = new Date().toISOString().slice(0, 7);
        expoDb.execSync(
          `ALTER TABLE budget_categories ADD COLUMN month TEXT DEFAULT '${currentMonth}' NOT NULL;`
        );
      }

      // Sync month from budgets if missing
      try {
        expoDb.execSync(`
          UPDATE budget_categories SET month = (
            SELECT month FROM budgets WHERE budgets.id = budget_categories.budget_id
          ) WHERE month IS NULL OR month = '';
        `);
      } catch {}

      // Clean up any orphan budget_categories rows without a valid budget
      try {
        expoDb.execSync(`
          DELETE FROM budget_categories WHERE budget_id NOT IN (SELECT id FROM budgets);
        `);
      } catch {}

      // Unique index: a category cannot be assigned to multiple budgets in the same month
      try {
        expoDb.execSync(
          "CREATE UNIQUE INDEX IF NOT EXISTS idx_budget_category_month ON budget_categories(category_id, month);"
        );
      } catch {}

      // Unique index on category name
      try {
        expoDb.execSync(
          "CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name);"
        );
      } catch {}

      // If legacy budgets had category_id and amount, migrate rows into budget_categories
      if (colNames.has("category_id") && colNames.has("amount")) {
        const existingCount = expoDb.getFirstSync<{ cnt: number }>(
          "SELECT COUNT(*) as cnt FROM budget_categories;"
        );
        if (!existingCount || existingCount.cnt === 0) {
          const currentMonth = new Date().toISOString().slice(0, 7);
          expoDb.execSync(`
            INSERT INTO budget_categories (budget_id, category_id, month, amount)
            SELECT id, category_id, COALESCE(month, '${currentMonth}'), amount FROM budgets WHERE category_id IS NOT NULL AND amount IS NOT NULL;
          `);
        }
      }
    } catch (err) {
      console.warn("Budgets schema migration warning:", err);
    }

    // Ensure single-row security_rules record exists
    try {
      expoDb.execSync(`
        INSERT OR IGNORE INTO security_rules (
          id, delete_transaction, delete_account, delete_contact, delete_debt,
          create_transaction, create_account, edit_profile, manage_account,
          backup_restore, reset_data
        ) VALUES (1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 1);
      `);
    } catch {}

    // Seed default categories with INCOME and EXPENSE types
    try {
      expoDb.execSync(`
        INSERT OR IGNORE INTO categories (id, name, type, icon) VALUES
        (1, 'Salary', 'INCOME', 'cash-outline'),
        (2, 'Freelance', 'INCOME', 'laptop-outline'),
        (3, 'Investments', 'INCOME', 'trending-up-outline'),
        (4, 'Gift / Allowance', 'INCOME', 'gift-outline'),
        (5, 'Business', 'INCOME', 'briefcase-outline'),
        (6, 'Other Income', 'INCOME', 'wallet-outline'),
        (7, 'Food & Groceries', 'EXPENSE', 'fast-food-outline'),
        (8, 'Shopping', 'EXPENSE', 'cart-outline'),
        (9, 'Housing & Rent', 'EXPENSE', 'home-outline'),
        (10, 'Transportation', 'EXPENSE', 'car-outline'),
        (11, 'Utilities & Bills', 'EXPENSE', 'flash-outline'),
        (12, 'Entertainment', 'EXPENSE', 'film-outline'),
        (13, 'Healthcare', 'EXPENSE', 'medkit-outline'),
        (14, 'Education', 'EXPENSE', 'book-outline'),
        (15, 'Personal Care', 'EXPENSE', 'sparkles-outline'),
        (16, 'General Expense', 'EXPENSE', 'receipt-outline');

        UPDATE categories SET type = 'INCOME' WHERE name IN ('Salary', 'Freelance', 'Investments', 'Gift / Allowance', 'Business', 'Other Income');
      `);
    } catch {}

    isMigrated = true;
  } catch (error) {
    console.error("Critical: Could not initialize database schema:", error);
  }
}
