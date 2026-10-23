# Hawk Database Schema & Storage Specifications

This document serves as the comprehensive data dictionary and database specification for the **Hawk** application. Hawk uses an embedded SQLite database managed via **Drizzle ORM** (`drizzle-orm/expo-sqlite`) with synchronous schema migration logic.

---

## 1. High-Level Entity-Relationship Model (ASCII)

```
   +-------------------+                +----------------------+
   |   liquid_assets   |                |       contacts       |
   |   (Accounts)      |                | (Persons / Entities) |
   +-------------------+                +----------------------+
   | id (PK)           |                | id (PK)              |
   | name              |                | name (Unique Active) |
   | asset_type        |                | mobile_number        |
   | initial_balance   |                | avatar_svg           |
   | is_archived       |                | is_archived          |
   +-------------------+                +----------------------+
      |         |                                  |
      |         | from_asset_id                    | contact_id
      |         | to_asset_id                      |
      |         v                                  v
      |   +----------------------------------------------+
      |   |                 transactions                 |
      |   +----------------------------------------------+
      |   | id (PK)                                      |
      |   | amount                                       |
      |   | type ('INCOME'|'EXPENSE'|'TRANSFER'|etc.)    |
      |   | from_asset_id (FK -> liquid_assets.id)       |
      |   | to_asset_id   (FK -> liquid_assets.id)       |
      |   | category_id   (FK -> categories.id)          |
      |   | contact_id    (FK -> contacts.id)            |
      |   | debt_id       (FK -> debts.id)               |
      |   | date, due_date, note                         |
      |   +----------------------------------------------+
      |                          ^                 ^
      |                          | category_id     | debt_id
      v                          |                 |
+------------------+     +-----------------+     +-----------------------+
|  app_settings    |     |   categories    |     |         debts         |
+------------------+     +-----------------+     +-----------------------+
| id (PK = 1)      |     | id (PK)         |     | id (PK)               |
| user_name        |     | name (Unique)   |     | contact_id (FK)       |
| currency         |     | type ('IN'|'EX')|     | type ('LEND'|'BORROW')|
| number_format    |     | icon            |     | amount, due_date      |
| pin, recovery_key|     +-----------------+     | state ('ONGOING'|etc.)|
| lockout timers   |              |              +-----------------------+
+------------------+              | category_id              |
                                  v                          v
+------------------+     +--------------------+  +-----------------------+
|  security_rules  |     | budget_categories  |  |       debt_logs       |
+------------------+     +--------------------+  +-----------------------+
| id (PK = 1)      |     | id (PK)            |  | id (PK)               |
| delete_trans...  |     | budget_id (FK)     |  | debt_id (FK)          |
| create_trans...  |     | category_id (FK)   |  | type, old_amount      |
| backup_restore   |     | month ('YYYY-MM')  |  | new_amount, note      |
+------------------+     | amount             |  +-----------------------+
                         +--------------------+
                                  | budget_id
                                  v
                         +--------------------+
                         |      budgets       |
                         +--------------------+
                         | id (PK)            |
                         | name               |
                         | month ('YYYY-MM')  |
                         | template (Boolean) |
                         +--------------------+
```

---

## 2. Comprehensive Data Dictionary

### Table 1: `liquid_assets` (Accounts / Wallets)
Stores bank accounts, physical cash wallets, and liquid reserves.
- **Drizzle Table**: `liquidAssets` (aliased as `accounts`)
- **Primary Key**: `id` (INTEGER AUTOINCREMENT)

| Column | Type | Nullable | Default | Constraints / Enum | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | Auto | PRIMARY KEY | Unique identifier for the account |
| `name` | TEXT | NO | None | | Display name (e.g., "Main Checking", "Cash Wallet") |
| `asset_type` | TEXT | NO | None | `'CASH' \| 'BANK'` | Classification of liquid asset |
| `account_number` | TEXT | YES | NULL | | Optional masked account or IBAN number |
| `initial_balance` | REAL | NO | `0` | | Opening balance when account was created |
| `note` | TEXT | YES | NULL | | User notes or description |
| `is_archived` | INTEGER | NO | `0` (false) | Boolean | Soft-deletion flag to preserve historical ledger records |
| `created_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Record creation timestamp |
| `updated_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Record last modification timestamp |

---

### Table 2: `contacts`
Stores persons, entities, employers, or institutions linked to transactions and loans.
- **Drizzle Table**: `contacts`
- **Primary Key**: `id` (INTEGER AUTOINCREMENT)

| Column | Type | Nullable | Default | Constraints / Enum | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | Auto | PRIMARY KEY | Unique contact ID |
| `name` | TEXT | NO | None | Partial Unique Index | Person or business name |
| `mobile_number` | TEXT | YES | NULL | | Optional phone number |
| `note` | TEXT | YES | NULL | | Personal notes regarding this contact |
| `avatar_svg` | TEXT | YES | NULL | | Serialized Boring Avatars SVG markup |
| `is_archived` | INTEGER | NO | `0` (false) | Boolean | Soft-deletion flag |
| `created_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Creation timestamp |
| `updated_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Modification timestamp |

> **Special Partial Index**:
> ```sql
> CREATE UNIQUE INDEX idx_contacts_active_name 
> ON contacts (LOWER(name)) 
> WHERE is_archived = 0;
> ```
> This allows users to create a new active contact with the exact same name as an archived contact without conflict.

---

### Table 3: `categories`
Defines classifications for Income and Expense transactions.
- **Drizzle Table**: `categories`
- **Primary Key**: `id` (INTEGER AUTOINCREMENT)

| Column | Type | Nullable | Default | Constraints / Enum | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | Auto | PRIMARY KEY | Unique category ID |
| `name` | TEXT | NO | None | UNIQUE | Category name (e.g., "Salary", "Food & Groceries") |
| `type` | TEXT | NO | `'EXPENSE'` | `'INCOME' \| 'EXPENSE'` | Classification category |
| `icon` | TEXT | YES | NULL | | Ionicons identifier (e.g., "cart-outline", "cash-outline") |
| `created_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Creation timestamp |

---

### Table 4: `debts`
Stores loans and debts given to or received from contacts.
- **Drizzle Table**: `debts`
- **Primary Key**: `id` (INTEGER AUTOINCREMENT)

| Column | Type | Nullable | Default | Constraints / Enum | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | Auto | PRIMARY KEY | Unique debt ID |
| `contact_id` | INTEGER | NO | None | `REFERENCES contacts(id)` | Associated debtor or creditor |
| `type` | TEXT | NO | None | `'LEND' \| 'BORROW'` | Direction of the debt |
| `amount` | REAL | NO | None | Positive Float | Principal amount of the loan |
| `due_date` | TEXT | YES | NULL | YYYY-MM-DD | Optional deadline for repayment |
| `state` | TEXT | NO | `'ONGOING'` | `'ONGOING' \| 'REPAID' \| 'WRITTEN_OFF'` | Current state of debt |
| `settled_at` | TEXT | YES | NULL | ISO 8601 | Date when debt reached 100% repayment or write-off |
| `settled_note` | TEXT | YES | NULL | | Reason or audit note for settlement |
| `note` | TEXT | YES | NULL | | General loan terms or memo |
| `created_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Creation timestamp |
| `updated_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Modification timestamp |

---

### Table 5: `debt_logs`
Immutable audit log tracking modifications and settlement actions on debts.
- **Drizzle Table**: `debtLogs`
- **Primary Key**: `id` (INTEGER AUTOINCREMENT)

| Column | Type | Nullable | Default | Constraints / Enum | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | Auto | PRIMARY KEY | Unique audit log ID |
| `debt_id` | INTEGER | NO | None | `REFERENCES debts(id) ON DELETE CASCADE` | Target debt |
| `type` | TEXT | NO | None | `'AMOUNT_CHANGED' \| 'SETTLED_MANUALLY' \| 'REOPENED'` | Action type |
| `old_amount` | REAL | YES | NULL | | Previous principal amount |
| `new_amount` | REAL | YES | NULL | | Modified principal amount |
| `note` | TEXT | YES | NULL | | Explanation or reason for the modification |
| `created_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Timestamp of audit entry |

---

### Table 6: `transactions`
The central financial journal containing all monetary movements across the app.
- **Drizzle Table**: `transactions`
- **Primary Key**: `id` (INTEGER AUTOINCREMENT)

| Column | Type | Nullable | Default | Constraints / Enum | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | Auto | PRIMARY KEY | Unique transaction ID |
| `amount` | REAL | NO | None | Float > 0 | Numerical transaction value |
| `type` | TEXT | NO | None | 7 Types (see below) | Transaction classification |
| `from_asset_id` | INTEGER | YES | NULL | `REFERENCES liquid_assets(id)` | Source account (for transfers, expenses, lending) |
| `to_asset_id` | INTEGER | YES | NULL | `REFERENCES liquid_assets(id)` | Destination account (for transfers, income, borrowing) |
| `category_id` | INTEGER | YES | NULL | `REFERENCES categories(id)` | Classification (for Income and Expense) |
| `contact_id` | INTEGER | YES | NULL | `REFERENCES contacts(id)` | Contact involved in loan or transaction |
| `debt_id` | INTEGER | YES | NULL | `REFERENCES debts(id)` | Linked loan for principal or repayment |
| `date` | TEXT | NO | None | YYYY-MM-DD or ISO | Booking date |
| `due_date` | TEXT | YES | NULL | YYYY-MM-DD | Optional due date |
| `note` | TEXT | YES | NULL | | Memo or description |
| `created_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 (with sec/ms) | Creation timestamp (used for deterministic ordering) |
| `updated_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Last updated timestamp |

#### The 7 Transaction Types
1. **`INCOME`**: Credits `to_asset_id` with an assigned `category_id`.
2. **`EXPENSE`**: Debits `from_asset_id` with an assigned `category_id`.
3. **`TRANSFER`**: Internal movement debiting `from_asset_id` and crediting `to_asset_id`.
4. **`LEND`**: Initial disbursement for a lent debt. Debits `from_asset_id` (null if prior loan).
5. **`BORROW`**: Initial receipt for a borrowed debt. Credits `to_asset_id` (null if prior loan).
6. **`DEBT PAID`**: Repayment of a borrowed loan. Debits `from_asset_id` and decreases remaining debt.
7. **`DEBT RECEIVED`**: Collection of a lent loan. Credits `to_asset_id` and decreases remaining debt.

---

### Table 7: `budgets`
Monthly budget containers and reusable templates.
- **Drizzle Table**: `budgets`
- **Primary Key**: `id` (INTEGER AUTOINCREMENT)

| Column | Type | Nullable | Default | Constraints / Enum | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | Auto | PRIMARY KEY | Unique budget ID |
| `name` | TEXT | NO | None | | Label (e.g., "Monthly Living Expenses") |
| `month` | TEXT | NO | None | Format `'YYYY-MM'` | Target calendar month |
| `template` | INTEGER | NO | `0` (false) | Boolean | If true, budget acts as a reusable template |
| `created_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Creation timestamp |
| `updated_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Modification timestamp |

---

### Table 8: `budget_categories`
Category-level financial allocations within a budget.
- **Drizzle Table**: `budgetCategories`
- **Primary Key**: `id` (INTEGER AUTOINCREMENT)

| Column | Type | Nullable | Default | Constraints / Enum | Description |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | Auto | PRIMARY KEY | Allocation ID |
| `budget_id` | INTEGER | NO | None | `REFERENCES budgets(id) ON DELETE CASCADE` | Parent budget |
| `category_id` | INTEGER | NO | None | `REFERENCES categories(id) ON DELETE CASCADE`| Target expense category |
| `month` | TEXT | NO | None | Format `'YYYY-MM'` | Target calendar month |
| `amount` | REAL | NO | None | Positive Float | Allocated spending cap |
| `created_at` | TEXT | NO | `CURRENT_TIMESTAMP` | ISO 8601 | Allocation timestamp |

> **Unique Constraint**:
> ```sql
> CREATE UNIQUE INDEX idx_budget_categories_cat_month 
> ON budget_categories (category_id, month);
> ```
> Enforces that an expense category cannot be assigned multiple conflicting spending caps within the same month.

---

### Table 9: `app_settings`
Single-row configuration record storing user preferences, lockout states, and cloud sync status.
- **Drizzle Table**: `appSettings`
- **Primary Key**: `id` (INTEGER, strictly row `1`)

| Column | Type | Nullable | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | NO | `1` | Singleton row primary key |
| `user_name` | TEXT | NO | None | Display name of the account owner |
| `currency` | TEXT | YES | NULL | Currency code (e.g., "USD", "EUR", "INR", "AED") |
| `number_format` | TEXT | NO | `'COMMA_DOT'` | Formatting rule (`'COMMA_DOT'` = 1,234.56, `'DOT_COMMA'` = 1.234,56) |
| `has_onboarded` | INTEGER | NO | `0` | Boolean onboarding completion flag |
| `last_backup` | TEXT | YES | NULL | ISO timestamp of the last successful Google Drive sync |
| `profile_pic` | TEXT | YES | NULL | Device-local URI of profile avatar (excluded from cloud restore) |
| `pin` | TEXT | YES | NULL | Legacy/DB copy of PIN (hardware storage preferred) |
| `recovery_key` | TEXT | YES | NULL | Legacy/DB copy of 8-character recovery key |
| `pin_enabled` | INTEGER | NO | `1` | Master toggle for PIN security |
| `biometrics_enabled`| INTEGER | NO | `0` | Master toggle for Face ID / Fingerprint |
| `app_lock_enabled` | INTEGER | NO | `0` | Lock app on launch / backgrounding toggle |
| `google_email` | TEXT | YES | NULL | Connected Google Account email |
| `google_name` | TEXT | YES | NULL | Connected Google Account display name |
| `lockout_until` | TEXT | YES | NULL | ISO timestamp when Recovery Key lockout expires |
| `failed_recovery_attempts` | INTEGER | NO | `0` | Consecutive failed recovery code submissions |
| `pin_lockout_until` | TEXT | YES | NULL | ISO timestamp when PIN lockout expires |
| `failed_pin_attempts` | INTEGER | NO | `0` | Consecutive failed PIN entries |
| `created_at` | TEXT | NO | `CURRENT_TIMESTAMP` | Initial database creation time |
| `updated_at` | TEXT | NO | `CURRENT_TIMESTAMP` | Last profile update time |

---

### Table 10: `security_rules`
Fine-grained authorization toggles for sensitive app actions.
- **Drizzle Table**: `securityRules`
- **Primary Key**: `id` (INTEGER, strictly row `1`)

| Column | Type | Default | Action Protected |
| :--- | :--- | :--- | :--- |
| `delete_transaction` | INTEGER | `1` (true) | Deleting any transaction from history |
| `delete_account` | INTEGER | `1` (true) | Deleting or archiving a bank/cash account |
| `delete_contact` | INTEGER | `1` (true) | Deleting or archiving a contact |
| `delete_debt` | INTEGER | `1` (true) | Deleting a debt or loan record |
| `create_transaction` | INTEGER | `0` (false)| Logging a new financial transaction |
| `create_account` | INTEGER | `0` (false)| Creating a new bank or cash account |
| `edit_profile` | INTEGER | `1` (true) | Modifying user profile or currency |
| `manage_account` | INTEGER | `1` (true) | Modifying account credentials or details |
| `backup_restore` | INTEGER | `1` (true) | Performing cloud backup or data restore |
| `reset_data` | INTEGER | `1` (true) | Factory resetting application data |

---

## 3. High-Performance SQL Aggregations

Hawk avoids in-memory processing for critical financial summaries. The following optimized SQL queries drive the core UI widgets:

### 1. Live Account Balance Calculation
```sql
SELECT 
  a.id,
  a.name,
  a.asset_type,
  a.initial_balance,
  COALESCE((SELECT SUM(amount) FROM transactions WHERE to_asset_id = a.id), 0) AS incoming_sum,
  COALESCE((SELECT SUM(amount) FROM transactions WHERE from_asset_id = a.id), 0) AS outgoing_sum,
  (a.initial_balance + 
   COALESCE((SELECT SUM(amount) FROM transactions WHERE to_asset_id = a.id), 0) - 
   COALESCE((SELECT SUM(amount) FROM transactions WHERE from_asset_id = a.id), 0)
  ) AS current_balance
FROM liquid_assets a
WHERE a.is_archived = 0;
```

### 2. Contact Net Volume (Excluding Debts)
```sql
SELECT 
  c.id,
  c.name,
  COALESCE((SELECT SUM(amount) FROM transactions WHERE contact_id = c.id AND type = 'INCOME'), 0) -
  COALESCE((SELECT SUM(amount) FROM transactions WHERE contact_id = c.id AND type = 'EXPENSE'), 0) AS net_volume
FROM contacts c
WHERE c.id = ?;
```

### 3. Remaining Debt Balance & Repayment Total
```sql
SELECT 
  d.id,
  d.amount AS principal,
  COALESCE(SUM(t.amount), 0) AS repaid_amount,
  (d.amount - COALESCE(SUM(t.amount), 0)) AS remaining_amount,
  ROUND((COALESCE(SUM(t.amount), 0) / d.amount) * 100, 1) AS progress_percent
FROM debts d
LEFT JOIN transactions t ON t.debt_id = d.id AND (t.type = 'DEBT PAID' OR t.type = 'DEBT RECEIVED')
WHERE d.id = ?
GROUP BY d.id;
```
