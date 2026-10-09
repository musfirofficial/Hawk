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
        type TEXT NOT NULL,
        icon TEXT,
        color TEXT,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
      );
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
        name TEXT NOT NULL,
        mobile_number TEXT,
        note TEXT,
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
        is_settled INTEGER DEFAULT 0 NOT NULL,
        is_settled_manually INTEGER DEFAULT 0 NOT NULL,
        note TEXT,
        created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
        updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
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
        category_id INTEGER NOT NULL,
        amount REAL NOT NULL,
        period TEXT DEFAULT 'MONTHLY' NOT NULL,
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
        biometrics_enabled INTEGER DEFAULT 0 NOT NULL,
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
      expoDb.execSync(
        "ALTER TABLE app_settings ADD COLUMN biometrics_enabled INTEGER DEFAULT 0 NOT NULL;"
      );
    } catch {}

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

    isMigrated = true;
  } catch (error) {
    console.error("Critical: Could not initialize database schema:", error);
  }
}
