import { drizzle } from "drizzle-orm/expo-sqlite";
import { migrate } from "drizzle-orm/expo-sqlite/migrator";
import { openDatabaseSync } from "expo-sqlite";
import migrations from "../../drizzle/migrations";
import * as schema from "./schema";

export const expoDb = openDatabaseSync("hawk.db", {
  enableChangeListener: true,
});
export const db = drizzle(expoDb, { schema });

let isMigrated = false;

export function ensureDatabaseInitialized() {
  if (isMigrated) return;
  try {
    migrate(db, migrations);
    isMigrated = true;
  } catch (error) {
    console.warn("Drizzle migrate warning, applying fallback DDL:", error);
    try {
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
          google_email TEXT,
          google_name TEXT,
          created_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
          updated_at TEXT DEFAULT (CURRENT_TIMESTAMP) NOT NULL
        );
      `);
      isMigrated = true;
    } catch (fallbackErr) {
      console.error("Critical: Could not initialize database fallback tables:", fallbackErr);
    }
  }
}
