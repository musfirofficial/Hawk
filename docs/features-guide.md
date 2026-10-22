# Hawk Core Features & Business Logic Guide

> **Note**: In compliance with documentation guidelines, all workflows and business rules are documented via ASCII diagrams and structured markdown tables without Mermaid formatting.

This document provides a technical and operational breakdown of the core domains and business logic within **Hawk**.

---

## 1. Transactions Engine

Hawk features a double-entry inspired single-ledger journal that tracks all capital movement. Every transaction belongs to one of seven distinct types.

### A. The 7 Transaction Types Matrix

| Transaction Type | UI Label | Asset Impact | Category Required? | Contact Required? | Debt Linked? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`INCOME`** | Income | `to_asset_id` (+Amount) | **Yes** | Optional | No |
| **`EXPENSE`** | Expense | `from_asset_id` (-Amount) | **Yes** | Optional | No |
| **`TRANSFER`** | Transfer | `from_asset_id` (-Amount)<br>`to_asset_id` (+Amount) | No | No | No |
| **`LEND`** | Loan Given | `from_asset_id` (-Amount)* | No | **Yes** | **Yes** (Initial) |
| **`BORROW`** | Loan Received | `to_asset_id` (+Amount)* | No | **Yes** | **Yes** (Initial) |
| **`DEBT PAID`** | Repayment Made | `from_asset_id` (-Amount) | No | **Yes** | **Yes** (Repayment) |
| **`DEBT RECEIVED`**| Repayment Received | `to_asset_id` (+Amount) | No | **Yes** | **Yes** (Repayment) |

*\*Note: For `LEND` and `BORROW`, the asset account link is optional to support pre-existing/prior loans.*

---

### B. Sub-Minute & Second-Level Deterministic Sorting

When multiple transactions are created on the same calendar day, standard date strings (`YYYY-MM-DD`) cause unpredictable ordering. Hawk implements deterministic timeline sorting:

```
[ User Logs Transaction ]
           |
           v
  Is time set to Current Instant?
           |
     +-----+------------------------------+
     |                                    |
  [ YES ]                              [ NO (Past / Custom Time) ]
     |                                    |
  Save with exact current              Set seconds to `:00`
  second: `HH:MM:SS`                   Format: `HH:MM:00`
           |                                    |
           +------------------+-----------------+
                              |
                              v
       Query Ordering Strategy (`TransactionsProvider`):
       `ORDER BY t.date DESC, t.created_at DESC, t.id DESC`
```

#### Debt Creation vs Repayment Tie-Breaking
When a user backdates a loan and records an initial repayment at the exact same minute:
- The initial loan transaction is recorded first (`createdAt` = $T_0$).
- The repayment transaction is recorded after (`createdAt` = $T_0 + 1\text{s}$ or higher `id`).
- When ordered by `date DESC, created_at DESC, id DESC`, the repayment appears **above** the initial disbursement, preserving financial ledger causality.

---

## 2. Liquid Assets & Accounts

Hawk manages liquid funds across two account classifications: **CASH** (physical wallets) and **BANK** (checking accounts, savings, credit unions).

```
+-------------------------------------------------------------------------------+
|                             LIQUID ASSETS ARCHITECTURE                        |
+-------------------------------------------------------------------------------+
|                                                                               |
|   +-----------------------+              +-----------------------+            |
|   |   Cash Accounts       |              |   Bank Accounts       |            |
|   |   - Physical Wallet   |              |   - Main Checking     |            |
|   |   - Home Safe Cash    |              |   - High-Yield Savings|            |
|   +-----------------------+              +-----------------------+            |
|               \                                      /                        |
|                \                                    /                         |
|                 v                                  v                          |
|   +-----------------------------------------------------------------------+   |
|   |                    Current Balance Formula:                           |   |
|   |    Current = Initial Balance + Incoming Sum - Outgoing Sum             |   |
|   +-----------------------------------------------------------------------+   |
|                                       |                                       |
|                                       v                                       |
|   +-----------------------------------------------------------------------+   |
|   |                    Net Liquid Assets Metric:                          |   |
|   |    Net Worth = Total Cash Balance + Total Bank Balance                |   |
|   +-----------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------+
```

### Soft-Delete (Archive) Policy
Accounts cannot be arbitrarily deleted if they have historical transactions linked to them:
1. **Zero Historical Transactions**: The account record is permanently removed (`DELETE FROM liquid_assets WHERE id = ?`).
2. **Has Linked Transactions**: The account is soft-deleted (`is_archived = 1`). Historical reports, past transaction ledgers, and audit logs remain intact, but the account is hidden from the account picker and total balance cards.

---

## 3. Debts & Loans System

The Debts domain manages bilateral lending and borrowing with outside entities.

```
+-------------------------------------------------------------------------------+
|                         DEBT MANAGEMENT WORKFLOW                              |
+-------------------------------------------------------------------------------+
|                                                                               |
|  [ Scenario A: Live Loan with Cash Disbursement ]                             |
|    1. User lends $500 from "Main Bank".                                       |
|    2. Creates Debt entry (Type: LEND, Principal: $500, State: ONGOING).       |
|    3. Creates linked Transaction (Type: LEND, fromAssetId: Bank, Amount: $500)|
|    4. "Main Bank" balance decreases by $500.                                  |
|                                                                               |
|  [ Scenario B: Prior Loan / Loan Given Before Hawk App ]                      |
|    1. User lent $1,000 months ago (before downloading Hawk).                  |
|    2. User creates Debt entry without selecting a funding account.            |
|    3. Creates Debt entry (Type: LEND, Principal: $1000, State: ONGOING).      |
|    4. Zero deduction from current bank or cash accounts!                      |
|                                                                               |
|  [ Scenario C: Partial Repayments ]                                           |
|    1. Debtor pays back $200 into "Cash Wallet".                               |
|    2. Creates Transaction (Type: DEBT RECEIVED, toAssetId: Cash, Debt: ID).   |
|    3. Remaining debt drops to $800 ($1000 - $200). Progress: 20%.             |
|    4. Cash account increases by $200.                                         |
|                                                                               |
|  [ Scenario D: Final Settlement & Auto-Closure ]                              |
|    1. Final repayment arrives, bringing total repayments to >= Principal.     |
|    2. Debt automatically transitions to state: REPAID.                        |
|    3. `settledAt` is marked with current ISO timestamp.                       |
|                                                                               |
|  [ Scenario E: Manual Write-Off / Bad Debt ]                                  |
|    1. Debtor cannot pay back remaining balance.                               |
|    2. User taps "Settle Manually" or "Write Off".                             |
|    3. Debt state transitions to: WRITTEN_OFF.                                 |
|    4. Audit entry recorded in `debt_logs`.                                    |
+-------------------------------------------------------------------------------+
```

### Reopening Settled Debts
If a debt was settled by mistake or a cheque bounced, the user can tap **Reopen Debt**. Hawk:
1. Re-evaluates all recorded repayment transactions.
2. If total repayments < principal, state reverts to `ONGOING`.
3. Appends an audit entry into `debt_logs` (`type = 'REOPENED'`).

---

## 4. Contact Management & Net Volume

Contacts represent friends, family, contractors, or companies.

```
+-------------------------------------------------------------------------------+
|                            CONTACT FINANCIAL PROFILE                          |
+-------------------------------------------------------------------------------+
|                                                                               |
|  [ 1. Outstanding Debts Summary ]                                             |
|    - Owed to Me: Sum of remaining balances on active LEND loans.              |
|    - I Owe Them: Sum of remaining balances on active BORROW loans.            |
|                                                                               |
|  [ 2. Net Volume (Excluding Debts) ]                                          |
|    - Net Volume represents pure commercial exchange:                          |
|        Net Volume = Total Income from Contact - Total Expenses to Contact     |
|    - Debts are intentionally excluded from Net Volume so that loans           |
|      do not distort actual income/expense cashflow.                           |
|                                                                               |
|  [ 3. Re-using Names of Archived Contacts ]                                   |
|    - Active contact names must be unique (case-insensitive).                  |
|    - When a contact is archived (`is_archived = 1`), Hawk's partial index     |
|      frees up the name:                                                       |
|        CREATE UNIQUE INDEX idx_contacts_active_name                           |
|        ON contacts (LOWER(name)) WHERE is_archived = 0;                       |
|    - A new contact with the same name can be created immediately.             |
+-------------------------------------------------------------------------------+
```

---

## 5. Monthly Budgeting & Envelope System

Hawk implements zero-based envelope budgeting by calendar month (`YYYY-MM`).

```
+-------------------------------------------------------------------------------+
|                          MONTHLY BUDGET ARCHITECTURE                          |
+-------------------------------------------------------------------------------+
|                                                                               |
|  [ Budget Envelope Structure ]                                                |
|    Month: "2026-10"                                                           |
|    Total Budget: $3,500.00                                                    |
|                                                                               |
|    Category Allocations (`budget_categories`):                                |
|    +--------------------+----------------+---------------+----------------+   |
|    | Category           | Cap (Budgeted) | Actual Spent  | Status         |   |
|    +--------------------+----------------+---------------+----------------+   |
|    | Food & Groceries   | $ 800.00       | $ 540.00      | 67.5% (OK)     |   |
|    | Housing & Rent     | $ 1,500.00     | $ 1,500.00    | 100% (Filled)  |   |
|    | Transportation     | $ 400.00       | $ 485.00      | 121.2% (OVER!) |   |
|    | Utilities & Bills  | $ 300.00       | $ 210.00      | 70% (OK)       |   |
|    | Entertainment      | $ 500.00       | $ 120.00      | 24% (OK)       |   |
|    +--------------------+----------------+---------------+----------------+   |
|                                                                               |
|  [ Budget Cloning / Template Feature ]                                        |
|    - Any budget can be marked as `template = 1`.                              |
|    - At the start of a new month, tapping "Copy from Template" duplicates all |
|      category envelopes into the target month in a single transaction.        |
+-------------------------------------------------------------------------------+
```

---

## 6. Google Drive Cloud Sync & Data Migration

Hawk provides cloud backups without compromising privacy by communicating directly with the Google Drive v3 REST API.

```
+-------------------------------------------------------------------------------+
|                        GOOGLE DRIVE SYNC SPECIFICATIONS                       |
+-------------------------------------------------------------------------------+
|                                                                               |
|  [ 1. OAuth 2.0 Authorization ]                                               |
|    - Client ID configured in Google Cloud Console.                            |
|    - Scope: `https://www.googleapis.com/auth/drive.appdata`                   |
|    - Token refreshed automatically upon HTTP 401 Unauthorized.                |
|                                                                               |
|  [ 2. Database Backup Snapshot (VACUUM INTO) ]                                |
|    - Write lock acquired via `BEGIN IMMEDIATE` and flushed with `COMMIT`.     |
|    - `VACUUM INTO 'hawk_snapshot.db'` captures clean WAL snapshot.            |
|    - Uploaded via binary stream (`application/x-sqlite3`).                    |
|                                                                               |
|  [ 3. Atomic Database Restore ]                                               |
|    - Download cloud database to `hawk_restore_temp.db`.                       |
|    - Attach temporary database: `ATTACH DATABASE temp AS backup_db`.          |
|    - Disable foreign keys temporarily: `PRAGMA foreign_keys = OFF`.           |
|    - Inside an immediate transaction:                                         |
|        a. Truncate local tables: `DELETE FROM main."table"`.                  |
|        b. Populate from backup: `INSERT INTO main."table" SELECT * FROM ...`. |
|        c. Scrub device-local avatar: `UPDATE app_settings SET profile_pic=NULL`|
|    - Re-enable foreign keys: `PRAGMA foreign_keys = ON`.                      |
|    - Detach: `DETACH DATABASE backup_db`.                                     |
+-------------------------------------------------------------------------------+
```

---

## 7. Internationalization & Formatting

### Supported Currencies (25 Global Currencies)
Hawk stores all currency amounts as standard floating-point numbers and formats display values dynamically using native currency symbols:

```
USD ($)  •  EUR (€)  •  GBP (£)  •  INR (₹)  •  AED (د.إ)  •  SAR (﷼)
JPY (¥)  •  CAD ($)  •  AUD ($)  •  SGD ($)  •  CHF (Fr)   •  CNY (¥)
BRL (R$) •  TRY (₺)  •  LKR (Rs) •  CNH (¥)  •  HKD ($)    •  NZD ($)
KRW (₩)  •  MXN ($)  •  ZAR (R)  •  IDR (Rp) •  MYR (RM)   •  THB (฿)
KWD (د.ك)
```

### Number Formatting Modes
- **`COMMA_DOT`** (Standard US/UK): `1,234,567.89`
- **`DOT_COMMA`** (European / Continental): `1.234.567,89`
