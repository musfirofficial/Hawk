# Hawk System Architecture & Runtime Specifications

> **Note**: In compliance with documentation guidelines, all system topologies and sequence workflows are illustrated via ASCII text diagrams without Mermaid formatting.

This document describes the high-level system architecture, component hierarchies, state management patterns, and runtime lifecycle of the **Hawk** personal finance application.

---

## 1. Architectural Philosophy & Principles

Hawk is architected around four core engineering principles:

1. **Offline-First & Local-Authoritative**: The application requires zero internet connection to function. All financial accounts, transactions, debts, categories, and contacts reside in a local SQLite database on the user's device. The device is always the single source of truth.
2. **Zero-Latency Invalidation**: UI re-renders are driven by native SQLite change listeners (`addDatabaseChangeListener`). When any table mutation occurs (insert, update, or delete), related Context providers are notified instantaneously, eliminating manual cache invalidation bugs.
3. **Privacy by Default & Zero-Knowledge Storage**: Financial records are never shipped to third-party tracking services or proprietary company servers. Cloud backups are saved strictly inside the user's private Google Drive `appDataFolder` using their own OAuth credentials.
4. **Hardware-Enforced Security**: Sensitive data (such as user PINs and reset recovery keys) are cryptographically salted and isolated in hardware-backed secure storage (iOS Keychain / Android KeyStore).

---

## 2. High-Level System Topology

```
+---------------------------------------------------------------------------------------+
|                                    USER INTERACTION                                   |
|                        Touch Gestures, Keyboard Input, Biometrics                     |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                                 PRESENTATION LAYER                                    |
|  Expo Router (File-based Stacks & Tabs) + TailwindCSS (NativeWind) + Reanimated UI     |
|                                                                                       |
|   /(auth)               /(tabs)                 /(transaction)      /(settings)       |
|   - Login               - (index) Home / Net    - Create / Edit     - Backup / Sync   |
|   - PIN Setup           - Debts Ledger          - Details Modal     - Permissions     |
|   - Verify Code         - Budgets & Templates   - Category Picker   - Profile Edit    |
|   - Recovery Key        - Contacts Book                                               |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                              DOMAIN CONTEXT PROVIDERS                                 |
|  React 19 Context Layer managing in-memory models & reactive business logic           |
|                                                                                       |
|  +--------------------+ +--------------------+ +--------------------+ +------------+  |
|  |    AuthProvider    | |  AccountsProvider  | |   DebtsProvider    | | Alert/Modal|  |
|  +--------------------+ +--------------------+ +--------------------+ +------------+  |
|  | TransactionsProv.  | |  CategoriesProv.   | |  ContactsProvider  | |SecurityProv|  |
|  +--------------------+ +--------------------+ +--------------------+ +------------+  |
+---------------------------------------------------------------------------------------+
            |                                           ^
            | Execute Queries                           | SQLite Change Notifications
            v                                           | (addDatabaseChangeListener)
+---------------------------------------------------------------------------------------+
|                                DATA ACCESS LAYER (DAL)                                |
|  - Drizzle ORM 0.45.3: Type-safe SQL builder and relation models                     |
|  - Raw Optimized SQLite Statements for complex aggregations (Sums, Balances, Counts)  |
+---------------------------------------------------------------------------------------+
                                           |
                                           v
+---------------------------------------------------------------------------------------+
|                                NATIVE DATABASE ENGINE                                 |
|  - expo-sqlite (openDatabaseSync('hawk.db', { enableChangeListener: true }))           |
|  - SQLite 3 with Write-Ahead Logging (WAL) & Synchronous Migration Engine             |
|  - Tables: liquid_assets, contacts, categories, debts, debt_logs, transactions, etc. |
+---------------------------------------------------------------------------------------+
            |                                                           |
            v                                                           v
+---------------------------------------+   +-------------------------------------------+
|          SECURITY SERVICES            |   |         CLOUD BACKUP SERVICE              |
|  - expo-secure-store (Keychain/Keystore)|  |  - @react-native-google-signin            |
|  - expo-crypto (SHA-256 Hashing)      |   |  - Google Drive REST API (appDataFolder)  |
|  - expo-local-authentication (Bio)    |   |  - expo-file-system (VACUUM Snapshot)     |
+---------------------------------------+   +-------------------------------------------+
```

---

## 3. Application Lifecycle & Startup Gate

When the application process is initialized, it goes through a multi-stage authentication and verification gate before displaying financial data:

```
[ Application Process Starts ]
               |
               v
  ( Database Initialization )
  - Calls `ensureDatabaseInitialized()` synchronously.
  - Verifies SQLite tables, adds missing columns, compiles partial indexes.
  - Seeds default income and expense categories.
               |
               v
     ( AuthProvider Mounts )
  - Reads `app_settings` from SQLite.
  - Checks SecureStore for salt & SHA-256 hashed PIN.
  - Determines `hasOnboarded` status.
               |
               v
     ( NavigationGate Intercepts Route )
               |
      +--------+------------------------+
      |                                 |
[ Not Onboarded ]                [ Onboarded ]
      |                                 |
      v                                 v
Redirect to:                      Check App Lock Settings:
`/(auth)/login`                   - `appLockEnabled` == true?
                                  - `pinEnabled` == true?
                                  - `hasPin` == true?
                                        |
                         +--------------+--------------+
                         |                             |
                     [ YES ]                        [ NO ]
                         |                             |
                         v                             v
               Display Lockscreen             Set `isAppUnlocked = true`
               (PIN / Biometrics)                      |
                         |                             v
                         v                      Redirect to:
               Verify Hash in SecureStore       `/(tabs)` Home Screen
                         |
                +--------+--------+
                |                 |
            [ Match ]         [ Fail ]
                |                 |
                v                 v
          Unlock App &      Increment `failedPinAttempts`
          Clear Attempts    Trigger Progressive Lockout Timer
          Navigate Home
```

---

## 4. State Synchronization via SQLite Change Listeners

Traditional React Native apps suffer from state desynchronization when child views update data that affects parent dashboards (e.g. creating an expense on screen C must immediately update the account balance on screen A and the monthly budget on screen B).

Hawk resolves this using **SQLite Native Change Listeners**:

```
+-----------------------+
|  User creates an      |
|  Expense Transaction  |
+-----------------------+
            |
            v
+------------------------------------------------------------------------+
| Data Access Layer: Insert row into `transactions` table               |
| SQLite updates table and commits transaction                           |
+------------------------------------------------------------------------+
            |
            v
+------------------------------------------------------------------------+
| Expo SQLite Native Layer emits change notification:                   |
| Event: { tableName: "transactions" }                                   |
+------------------------------------------------------------------------+
            |
            +---------------------------+----------------------------+
            |                           |                            |
            v                           v                            v
+-----------------------+   +-----------------------+   +-----------------------+
|  TransactionsProvider |   |   AccountsProvider    |   |    DebtsProvider      |
|  `loadData()`         |   |   `loadAccounts()`    |   |    `loadDebts()`      |
+-----------------------+   +-----------------------+   +-----------------------+
            |                           |                            |
            v                           v                            v
  Queries new items &         Recalculates incoming /      Recalculates remaining  
  updates `transactions[]`    outgoing sums and updates    repayments & loan state 
  and `todayStats`            `currentBalance`             progress %
            |                           |                            |
            +---------------------------+----------------------------+
                                        |
                                        v
                    UI Screens Automatically Re-render
                    with Synchronized Fresh Data!
```

---

## 5. Domain Lifecycles & State Transitions

### A. Debt & Loan State Lifecycle

A Debt record represents money lent to or borrowed from an external contact. Its lifecycle is governed strictly by repayment transactions or manual write-offs:

```
                  +-----------------------------------+
                  |        DEBT CREATION              |
                  |  - Type: 'LEND' or 'BORROW'       |
                  |  - Amount: Total Principal        |
                  |  - Contact: Associated Entity     |
                  +-----------------------------------+
                                    |
                                    v
                  +-----------------------------------+
                  |          STATE: ONGOING           |
                  |  Remaining = Amount - Repayments  |
                  +-----------------------------------+
                     /              |              \
                    /               |               \
 [ Repayment Logged ]   [ Full Repaid ]    [ Debt Written-Off ]
          |                         |               |
          v                         v               v
  Recalculate Remaining    +----------------+ +--------------------+
  Update progress %        | STATE: REPAID  | | STATE: WRITTEN_OFF |
  Keep state 'ONGOING'     | Settled At ISO | | Settled At ISO     |
                           +----------------+ | Settlement Reason  |
                                   |          +--------------------+
                                   |                    |
                                   \                    /
                                    \                  /
                             [ User Manually Reopens Debt ]
                                          |
                                          v
                               +--------------------+
                               |   STATE: ONGOING   |
                               | Audit Log Appended |
                               +--------------------+
```

---

### B. Google Drive Cloud Backup & Restore Workflow

To guarantee zero database corruption, backups are generated via SQLite's atomic `VACUUM INTO` command, capturing WAL pages without holding destructive locks:

```
[ User triggers Cloud Backup ]
              |
              v
[ Step 1: Write Flush ]
  Execute `BEGIN IMMEDIATE` then `COMMIT`.
  Guarantees all write-ahead log pages are fully flushed.
              |
              v
[ Step 2: Atomic SQLite Snapshot ]
  Execute `VACUUM INTO '${cacheDirectory}/hawk_snapshot.db'`.
  Generates a clean, standalone, defragmented SQLite database file.
              |
              v
[ Step 3: Google Drive File Discovery ]
  Fetch metadata from hidden `appDataFolder` on Drive:
  `GET https://www.googleapis.com/drive/v3/files?spaces=appDataFolder`
              |
         +----+--------------------------------+
         |                                     |
  [ File Found ]                         [ File Not Found ]
         |                                     |
         v                                     v
  Use Existing File ID                   Create empty file entry
                                         `POST /drive/v3/files`
         |                                     |
         +------------------+------------------+
                            |
                            v
[ Step 4: Binary Stream Upload ]
  Upload snapshot using PATCH:
  `PATCH https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`
  Content-Type: `application/x-sqlite3`
                            |
                            v
[ Step 5: Metadata Update & Cleanup ]
  - Record ISO timestamp into `app_settings.last_backup`.
  - Delete temporary cache file `hawk_snapshot.db`.
  - Return updated metadata to UI.
```

---

## 6. Architectural Decision Records (ADRs)

| Decision | Rationale | Alternatives Considered |
| :--- | :--- | :--- |
| **Local SQLite over Remote API** | Maximum privacy, offline availability, zero monthly server hosting costs, instant UI response times. | Supabase, Firebase Firestore (rejected due to privacy and offline latency constraints). |
| **Drizzle ORM + Raw SQL Selects** | Drizzle provides type-safe migrations and insert/update statements. Raw SQL is used for multi-table aggregations (e.g. `SUM(amount)` over account ledgers) for 10x faster execution. | Pure Drizzle relational queries (found to produce sub-optimal joins on embedded SQLite). |
| **Google Drive appDataFolder** | Hidden from the user's regular Drive UI, preventing accidental file deletion, while keeping full ownership in the user's personal Google account. | Public Drive folder, AWS S3, iCloud (rejected to maintain cross-platform parity on Android & iOS). |
| **Hardware-Enforced Fingerprint on Android** | Android 2D camera-based Face Unlock is classified as Class 1/2 biometric and vulnerable to photo spoofing. Hawk enforces Class 3 (hardware fingerprint sensor). | Allowing any biometric (rejected for financial security standards). |
