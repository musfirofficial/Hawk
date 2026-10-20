# Hawk – Full Codebase Analysis

> **App Purpose**: Hawk is a local-first personal finance tracker. It runs entirely offline via SQLite + Drizzle ORM. Google Auth + Google Drive `appDataFolder` scope is used for cloud backup/restore. Security features include a 4-digit PIN, biometric unlock, and a recovery-key flow.

---

## 1. Architecture Overview

```
src/
├── app/              (Expo Router screens)
│   ├── (tabs)/       Home, Debts, Budget, Contacts
│   ├── (auth)/       Login / Onboarding
│   ├── (settings)/   Settings, Backup, PIN, Profile
│   ├── (transaction)/Create & Edit transactions
│   ├── (account)/    Create & Edit accounts
│   ├── createdebt.tsx (MASSIVE 2361-line file)
│   └── ...
├── components/       Reusable UI
├── context/          React Context state (accounts, auth, contacts, debts, security, transactions)
├── db/
│   ├── schema.ts     Drizzle schema definitions
│   └── index.ts      DB init + raw SQL migrations
├── services/         Pure business logic (backup, auth, biometrics, budget, currency)
├── hooks/            useSafeRouter
└── config/           ENABLE_GOOGLE_AUTH feature flag
```

**Stack**: Expo SDK 57, React Native 0.86, React 19, Drizzle ORM, expo-sqlite, NativeWind v4, expo-router, @react-native-google-signin, expo-local-authentication, expo-file-system

---

## 2. Bugs

### B1 — `contacts.tsx` context: Stale SQL column references

**File**: [`src/context/contacts.tsx:88-96`](file:///home/mustha/Projects/Hawk/src/context/contacts.tsx#L88-L96)

The `loadContacts` query references **`d.is_settled`** and **`d.is_settled_manually`** — columns that no longer exist in the `debts` table. The schema migrated to a `state` TEXT column (`ONGOING`, `REPAID`, `WRITTEN_OFF`). These subqueries will silently return 0 for `totalOwedToMe` and `totalIOwe` on every contact.

```sql
-- BUG: d.is_settled and d.is_settled_manually do NOT exist
WHERE d.contact_id = c.id AND d.type = 'LEND' AND d.is_settled = 0 AND d.is_settled_manually = 0
```

**Fix**: Replace with `d.state = 'ONGOING'`.

---

### B2 — `deleteTransaction` doesn't handle DB-level cascade correctly

**File**: [`src/context/transactions.tsx:279-293`](file:///home/mustha/Projects/Hawk/src/context/transactions.tsx#L279-L293)

When deleting a LEND/BORROW transaction, it manually deletes from `transactions` (by `debtId`), `debts`, then `debtLogs`. But `debtLogs` has `ON DELETE CASCADE` on `debt_id`, so the `db.delete(debtLogs)` call is redundant. More critically, the order is wrong: deleting from `transactions` first leaves the debt record orphaned momentarily, which can trigger a race condition with the DB change listener that re-renders UI mid-delete.

---

### B3 — `deleteDebt` is not atomic — three separate deletes with no transaction wrapper

**File**: [`src/context/debts.tsx:396-406`](file:///home/mustha/Projects/Hawk/src/context/debts.tsx#L396-L406)

`deleteDebt` deletes linked transactions, then debt logs, then the debt record. These are three separate Drizzle calls with no wrapping `db.transaction()` block. If any step fails midway, the data is left in a broken state.

---

### B4 — `performRestoreFromDrive`: no SQLite transaction wrapper (DATA LOSS RISK)

**File**: [`src/services/driveBackup.ts:233-242`](file:///home/mustha/Projects/Hawk/src/services/driveBackup.ts#L233-L242)

The restore does `DELETE FROM main.X; INSERT INTO main.X SELECT * FROM backup_db.X;` for each table in a loop with no `BEGIN TRANSACTION / COMMIT`. If it crashes mid-restore, the local DB is left partially wiped.

```ts
// Missing: expoDb.execSync('BEGIN TRANSACTION;');
for (const tbl of tables) {
  expoDb.execSync(`DELETE FROM main.${tbl.name}; INSERT INTO ...`);
}
// Missing: expoDb.execSync('COMMIT;');
```

---

### B5 — `settledAt: undefined` instead of `null` when re-opening a debt

**File**: [`src/context/transactions.tsx:318`](file:///home/mustha/Projects/Hawk/src/context/transactions.tsx#L318), [`src/context/debts.tsx:621`](file:///home/mustha/Projects/Hawk/src/context/debts.tsx#L621)

```ts
settledAt: isSettled ? undefined : null,
```

When `isSettled` is false, `settledAt: undefined` is passed to Drizzle `.set()`. Drizzle **ignores** `undefined` keys and does NOT clear the column. Once settled, `settledAt` is never cleared if the debt is re-opened.

**Fix**: `settledAt: isSettled ? now : null`

---

### B6 — PIN lockout counter never resets after lockout expires

**File**: [`src/context/auth.tsx:306-336`](file:///home/mustha/Projects/Hawk/src/context/auth.tsx#L306-L336)

`failedPinAttempts` is never reset when the 30-second lockout epoch passes. The next wrong PIN immediately triggers another lockout because `currentAttempts >= 5` is still true. The counter must be reset to 0 when the epoch has passed before incrementing.

---

### B7 — Budget service: O(N*3) synchronous SQL queries

**File**: [`src/services/budgetService.ts:581`](file:///home/mustha/Projects/Hawk/src/services/budgetService.ts#L581)

`getAllMonthsBudgetSummary` calls `getMonthBudgetSummary` (which fires 3 SQL queries) inside a `.map()` over all months. 12 months = 36 synchronous queries on the main thread. Same issue in `getSavedTemplateMonths`.

---

### B8 — `copyMonthBudgets` ignores unique index on `budget_categories(category_id, month)`

**File**: [`src/services/budgetService.ts:694-708`](file:///home/mustha/Projects/Hawk/src/services/budgetService.ts#L694-L708)

Copying a template month into a target month that already has some of the same categories assigned will throw an unhandled UNIQUE constraint error. No `INSERT OR IGNORE` or pre-check is done.

---

### B9 — `SecurityProvider.requireSecurityAuth` always approves when `ruleKey` is passed

**File**: [`src/context/security.tsx:66-73`](file:///home/mustha/Projects/Hawk/src/context/security.tsx#L66-L73)

```ts
if (request.ruleKey) {
  // Per-action security checks have been removed from the app
  request.onSuccess(); // Always auto-approves!
  return;
}
```

The entire security-rules table (`securityRules`) and all its columns are defined, seeded, and UI-exposed — but the enforcement is commented out. Any caller that passes a `ruleKey` gets instant approval regardless of the rule setting.

---

### B10 — Home screen: `todayNetChange` shows "+0.00 today" with only transfers/debts

**File**: [`src/context/transactions.tsx:348-373`](file:///home/mustha/Projects/Hawk/src/context/transactions.tsx#L348-L373)

The today stats memo only counts `INCOME` and `EXPENSE`. If all of today's activity is transfers or lending, the badge shows "+0.00 today" which is misleading since money has clearly moved.

---

## 3. Security Issues

### S1 — PIN stored in plaintext in SQLite

**File**: [`src/db/schema.ts:293`](file:///home/mustha/Projects/Hawk/src/db/schema.ts#L293)

```ts
pin: text("pin"),  // e.g. "1234"
```

PIN is stored as plaintext. If the SQLite file is extracted via ADB backup (unencrypted Android) or jailbroken iOS, the PIN is immediately readable. Should be stored as a salted hash.

---

### S2 — Recovery key stored in plaintext in SQLite

**File**: [`src/db/schema.ts:294`](file:///home/mustha/Projects/Hawk/src/db/schema.ts#L294)

Same issue as S1. The 8-character recovery key is stored as plaintext. An attacker with DB access gets both credentials.

---

### S3 — Google access token has no refresh logic; silent 401 failures

**File**: [`src/services/googleAuth.ts:97-107`](file:///home/mustha/Projects/Hawk/src/services/googleAuth.ts#L97-L107)

`GoogleSignin.getTokens()` returns a cached access token. Google tokens expire after 1 hour. After expiry, the backup fails with a generic error message that doesn't tell the user to re-authenticate.

---

### S4 — SQL injection via table names in restore

**File**: [`src/services/driveBackup.ts:235-237`](file:///home/mustha/Projects/Hawk/src/services/driveBackup.ts#L235-L237)

```ts
expoDb.execSync(
  `DELETE FROM main.${tbl.name}; INSERT INTO main.${tbl.name} ...`,
);
```

`tbl.name` comes from `backup_db.sqlite_master`. A crafted backup file could contain a table named `"x; DROP TABLE app_settings; --"`. Table names must be quoted: `"${tbl.name}"`.

---

### S5 — No background re-lock; `isAppUnlocked` persists forever after unlock

**File**: [`src/context/auth.tsx:79`](file:///home/mustha/Projects/Hawk/src/context/auth.tsx#L79)

`isAppUnlocked` is in-memory React state. If the app goes to background and returns without being killed, the PIN screen is never shown again. There is no `AppState` listener to re-lock after N minutes.

---

### S6 — Recovery key reset modal has no rate limiting

**File**: [`src/components/SetUpPin.tsx:153-184`](file:///home/mustha/Projects/Hawk/src/components/SetUpPin.tsx#L153-L184)

`handleVerifyResetCode` validates the recovery code with no attempt counter. Someone with physical device access can brute-force the 8-char alphanumeric code (32^8 space) indefinitely. PIN entry has lockout; recovery reset does not.

---

## 4. Architecture & Design Issues

### A1 — `createdebt.tsx` is 2,361 lines

**File**: [`src/app/createdebt.tsx`](file:///home/mustha/Projects/Hawk/src/app/createdebt.tsx)

Handles create, edit, preview, and repayment modes for debts plus all inline sub-components. This single file is unmaintainable. Should be split into separate screens and shared components in `components/debts/`.

---

### A2 — Manual SQL migrations instead of Drizzle Kit

**File**: [`src/db/index.ts:133-248`](file:///home/mustha/Projects/Hawk/src/db/index.ts#L133-L248)

~20 hand-written `ALTER TABLE` statements inside try/catch blocks. `drizzle-kit generate` / `drizzle-kit migrate` should be used instead.

---

### A3 — Schema defined twice — Drizzle schema AND raw SQL

**File**: [`src/db/index.ts:16-130`](file:///home/mustha/Projects/Hawk/src/db/index.ts#L16-L130)

Full `CREATE TABLE IF NOT EXISTS` SQL duplicates `schema.ts`. When a new column is added to the Drizzle schema, the raw SQL block must also be updated manually — a classic drift bug source.

---

### A4 — Global `addDatabaseChangeListener` causes all 4 contexts to re-query simultaneously

**Files**: All context providers

Every context registers its own `addDatabaseChangeListener`. Any single DB write fires all 4 listeners at once, causing 4 simultaneous full re-queries. Expo SQLite supports per-table change listening which should be used.

---

### A5 — `budgetService.ts` uses `any[]` for SQL params

**File**: [`src/services/budgetService.ts:498`](file:///home/mustha/Projects/Hawk/src/services/budgetService.ts#L498)

Several functions use `const params: any[] = [...]`, defeating TypeScript's safety. Should type as `(string | number | boolean | null)[]`.

---

### A6 — `Text.defaultProps` mutation will break in future React Native

**File**: [`src/app/_layout.tsx:43-65`](file:///home/mustha/Projects/Hawk/src/app/_layout.tsx#L43-L65)

Mutating `Text.defaultProps` with `@ts-ignore` is a known-deprecated pattern. The correct approach is a custom `AppText` component or the React Native `StyleSheet` font config.

---

## 5. UI / UX Bugs

### U1 — Negative balances show as 0% on home card breakdown

**File**: [`src/app/(tabs)/index.tsx:24-35`](<file:///home/mustha/Projects/Hawk/src/app/(tabs)/index.tsx#L24-L35>)

```ts
const safeBank = Math.max(0, totalBankBalance);
```

Overdraft accounts are clamped to 0% instead of showing a negative indicator. The total balance CAN go negative (shown correctly), but the Bank/Cash percentage tiles both show 0%.

---

### U2 — `showBalance` eye toggle resets on navigation

**File**: [`src/app/(tabs)/index.tsx:20`](<file:///home/mustha/Projects/Hawk/src/app/(tabs)/index.tsx#L20>)

Local state — always resets to `true` when navigating back to home tab. Should be persisted.

---

### U3 — `formatCurrency` with null currency shows raw number

No currency symbol fallback when `settings.currency` is null (during/after onboarding edge cases).

---

### U4 — SecurityGuardModal is dead UI — never shown in practice

Since all `requireSecurityAuth` callers pass `ruleKey`, and callers with `ruleKey` always auto-approve (B9), the modal and the security-permissions settings screen are non-functional.

---

### U5 — Budget `isCompleted` epsilon of 0.009 is wrong for many currencies

```ts
const isCompleted = bAmt > 0 && Math.abs(bAmt - spent) <= 0.009;
```

For JPY/IDR amounts in thousands, 0.009 will never trigger. Should be at minimum `<= 0.5` or currency-relative.

---

### U6 — Calendar cuts off 6-week months

**File**: [`src/components/calendar.tsx:13`](file:///home/mustha/Projects/Hawk/src/components/calendar.tsx#L13)

`CALENDAR_BODY_HEIGHT = 256` is fixed. Months with 6 rows (e.g., October 2023, July 2023) have the last row clipped.

---

### U7 — `showConfirm` (Connect Google) fires immediately on screen mount

**File**: [`src/app/(settings)/backup-restore.tsx:90-111`](<file:///home/mustha/Projects/Hawk/src/app/(settings)/backup-restore.tsx#L90-L111>)

When the user navigates to Backup & Restore without a Google account, a confirm dialog pops up immediately without any user interaction. This is jarring UX.

---

## 6. Redundant Code

### R1 — `refreshMetadata()` and the `useEffect` in backup-restore are duplicate logic

Same network calls inlined in both places.

### R2 — `ensureDatabaseInitialized()` called in every single context method

After the first call, it's a no-op. Call once at app startup only.

### R3 — `loadSettingsFromDB` calls `ensureDatabaseInitialized()`, and `init()` also calls it before calling `loadSettingsFromDB`

Double call on every app launch.

### R4 — `settings.tsx` writes directly to `db` for Google account connection instead of using AuthContext

Bypasses the context layer; creates a second write path for the same data.

### R5 — `Text.defaultProps` mutation repeated for both `Text` and `TextInput`

Same hack duplicated. Both should be consolidated into a single solution.

---

## 7. Missing Must-Have Features

### M1 — No way to edit initial LEND/BORROW transaction from the transaction list

Debt transactions are read-only from the transactions tab. Editing must go through the debt edit flow.

### M2 — No export (CSV/PDF/share)

Zero export capability. Essential for any finance app.

### M3 — No recurring transactions

No support for repeating income/expenses (monthly salary, rent, subscriptions).

### M4 — No date range or account filter on the transactions list

The full transaction screen shows everything with no filter by account, category, or date range.

### M5 — No "Reset All Data" UI despite schema support

`resetData` rule exists in the DB but the feature is not implemented in the UI.

### M6 — No due-date reminders for debts

`dueDate` column exists on debts but no push notifications are sent when due dates approach.

### M7 — Budget has no account-level scoping

Budgets only scope by expense category, not by which account the expense comes from.

---

## 8. Quality of Life Improvements

### Q1 — Memoize `TransactionCard` and other list items with `React.memo`

All list items re-render on every context update. Critical for large transaction lists.

### Q2 — `createdebt.tsx` needs `useCallback` on all handlers

All handler functions are re-created on every render inside this 2361-line component.

### Q3 — Progressive PIN lockout (30s → 2min → 10min)

Fixed 30-second lockout is too lenient. Standard practice escalates the lockout duration.

### Q4 — Archived accounts/contacts should be viewable and restorable

Once archived, records are invisible. A dedicated "Archived" screen would allow recovery.

### Q5 — `formatCurrency` should abbreviate large amounts on the dashboard

`₹12,34,567.00` is hard to read at a glance. Dashboard should show `₹12.3L` or `₹1.2M`.

### Q6 — `showBalance` toggle preference should survive navigation

Persist to AsyncStorage or app settings.

### Q7 — Budget template copy needs a target-month picker with conflict resolution

Currently duplicates silently fail on constraint violations.

---

## 9. Future Improvements

| #   | Feature                                                                        |
| --- | ------------------------------------------------------------------------------ |
| F1  | Multi-currency per account with optional exchange rates                        |
| F2  | Replace hand-rolled migrations with Drizzle Kit migration files                |
| F3  | Android home screen widget showing current balance                             |
| F4  | Biometric-only lock mode (no PIN required)                                     |
| F5  | Bill splitting — split a debt among multiple contacts                          |
| F6  | iCloud backup for iOS users without Google accounts                            |
| F7  | Budget carry-forward (unspent amount rolls to next month)                      |
| F8  | Financial insights/analytics screen (trends, savings rate, category breakdown) |
| F9  | Light theme option                                                             |
| F10 | Category color field in schema + user-customizable category colors             |

---

## 10. Priority Matrix

| Priority | ID    | Issue                                                      | Category        |
| -------- | ----- | ---------------------------------------------------------- | --------------- |
| Critical | B4    | Restore not wrapped in SQL transaction — partial wipe risk | Bug             |
| Critical | B1    | Contacts query uses deleted columns — debt sums always 0   | Bug             |
| Critical | S1/S2 | PIN & recovery key stored in plaintext                     | Security        |
| Critical | S4    | SQL injection via table names in restore                   | Security        |
| High     | B5    | `settledAt: undefined` never clears the column             | Bug             |
| High     | B6    | PIN lockout counter never resets after lockout expires     | Bug             |
| High     | B9    | Security guard auto-approves all rule-keyed actions        | Bug             |
| High     | S5    | No background re-lock on app resume                        | Security        |
| High     | A1    | createdebt.tsx is 2361 lines — urgent decomposition needed | Architecture    |
| Medium   | A2/A3 | Hand-rolled migrations + duplicate schema                  | Architecture    |
| Medium   | B7    | Budget service fires O(N*3) synchronous queries            | Performance     |
| Medium   | A4    | Global DB change listener fires all contexts at once       | Performance     |
| Medium   | M4    | No transaction filter/search                               | Missing Feature |
| Medium   | M2    | No export                                                  | Missing Feature |
| Low      | A6    | Text.defaultProps mutation                                 | Code Quality    |
| Low      | Q1–Q7 | QoL improvements                                           | Enhancement     |

Group 1 — Critical Data Bugs (fix first)
B4: Restore not in SQL transaction (data loss risk)
B1: Contacts uses stale is_settled columns → debt sums always 0
B5: settledAt: undefined never clears the DB column
B2: deleteTransaction redundant/wrong cascade order
B3: deleteDebt three separate deletes with no atomic wrapper

Group 2 — Security Hardening
S4: SQL injection via unquoted table names in restore
S5: No AppState re-lock on app resume
S6: Recovery key reset has no rate limiting
S1/S2: PIN + recovery key stored in plaintext (see decision below)

git commit -m "Fix:Restore not in SQL transaction (data loss risk),Contacts uses stale is_settled columns → debt sums always 0,settledAt: undefined never clears the DB column, deleteTransaction redundant/wrong cascade order, eleteDebt three separate deletes with no atomic wrapper, SQL injection via unquoted table names in restore, No AppState re-lock on app resume, Recovery key reset has no rate limiting, PIN + recovery key stored in plaintext (see decision below)"

Group 3 — PIN & Lockout System
B6: PIN lockout counter never resets after the 30s expires
S3: Google access token has no refresh — silent 401 backup failures

Group 4 — UI/UX Bugs
U1: Negative balance shows 0% on home card
U2: showBalance eye toggle resets on navigation
U3: formatCurrency with null currency shows raw number
U5: Budget isCompleted epsilon of 0.009 is wrong
U6: Calendar cuts off 6-week months
U7: Backup screen shows Connect Google dialog immediately on mount

Group 5 — Architecture & Code Quality
B7: Budget O(N×3) synchronous queries
B8: copyMonthBudgets unhandled constraint crash
B9 / U4: requireSecurityAuth auto-approves all rule-keyed actions (dead SecurityGuardModal)
A4: Global DB change listener fires all 4 contexts simultaneously
A5: any[] types in budgetService
A6: Text.defaultProps mutation (deprecated React 19 pattern)

Group 6 — Redundant Code Cleanup
R1–R5: refreshMetadata duplication, ensureDatabaseInitialized over-calling, settings.tsx direct DB write, etc.
