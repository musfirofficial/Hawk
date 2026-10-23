# Hawk User Manual & Comprehensive Guide

Welcome to **Hawk** — your private, offline-first personal financial ledger, debt manager, and budgeting companion.

---

## Table of Contents
1. [Chapter 1: Getting Started & Onboarding](#chapter-1-getting-started--onboarding)
2. [Chapter 2: Navigating the Hawk Interface](#chapter-2-navigating-the-hawk-interface)
3. [Chapter 3: Accounts & Wallets Management](#chapter-3-accounts--wallets-management)
4. [Chapter 4: Recording Daily Transactions](#chapter-4-recording-daily-transactions)
5. [Chapter 5: Debts & Loans Tracking](#chapter-5-debts--loans-tracking)
6. [Chapter 6: Contacts Book](#chapter-6-contacts-book)
7. [Chapter 7: Monthly Budgets](#chapter-7-monthly-budgets)
8. [Chapter 8: Security, PIN & Biometrics](#chapter-8-security-pin--biometrics)
9. [Chapter 9: Google Drive Cloud Backup & Restore](#chapter-9-google-drive-cloud-backup--restore)
10. [Chapter 10: Frequently Asked Questions (FAQ)](#chapter-10-frequently-asked-questions-faq)

---

## Chapter 1: Getting Started & Onboarding

When you open Hawk for the very first time, you are guided through a 3-step setup wizard:

```
+-------------------------------------------------------------+
|                      WELCOME TO HAWK                        |
|                                                             |
|   Step 1: Your Profile                                      |
|     - Enter your Name                                       |
|     - Choose your Base Currency (e.g., USD, EUR, INR, AED)  |
|     - Select Number Format (1,234.56 vs 1.234,56)           |
|                                                             |
|   Step 2: Security & App Lock                               |
|     - Choose a 4-digit Security PIN                         |
|     - Enable Biometrics (Face ID, Touch ID, Fingerprint)    |
|                                                             |
|   Step 3: Account Recovery Key                              |
|     - Receive your unique 8-character Key (e.g. K9W2-P7M4)  |
|     - IMPORTANT: Write this down!                           |
+-------------------------------------------------------------+
```

### Storing Your Recovery Key
Your **Recovery Key** is an 8-character alphanumeric code generated directly on your phone. If you ever forget your 4-digit PIN, this key is the **only way** to reset your PIN without deleting your financial records.

> **Warning**: Hawk does not store your recovery key on remote servers. If you lose your recovery key and forget your PIN, your local database cannot be recovered!

---

## Chapter 2: Navigating the Hawk Interface

Hawk uses a clean, high-contrast dark luxury interface designed for one-handed thumb navigation.

```
+-------------------------------------------------------------+
| [Profile / Avatar]                       [Eye] [Settings]   |
| Total Net Worth                                             |
| $14,820.50                                                  |
+-------------------------------------------------------------+
| Accounts Summary                                            |
| [ Main Checking: $12,400 ]      [ Cash Wallet: $2,420 ]     |
+-------------------------------------------------------------+
| Today's Overview                                            |
| Income: +$1,200.00   |   Expense: -$145.20   |  Net: +$1,054|
+-------------------------------------------------------------+
| Recent Activity                                             |
|  - Grocery Mart           -$84.50     Food & Groceries       |
|  - Alex Johnson (Loan)    -$500.00    Debt Given             |
|  - Client Invoice         +$1,200.00  Freelance              |
+-------------------------------------------------------------+
|  [Home]       [Debts]       [+]       [Budgets]   [Contacts]|
+-------------------------------------------------------------+
```

### Key Controls
- **Eye Toggle (Show / Hide Balance)**: Tap the eye icon in the top header to mask sensitive account balances with `••••••`. Your preference is remembered every time you open the app.
- **Center Action Button (`+`)**: Opens the quick transaction logger to record an expense, income, or transfer in seconds.
- **Bottom Navigation Bar**:
  - **Home**: Overview of net worth, account balances, today's summary, and recent activity.
  - **Debts**: Lending and borrowing manager with repayment progress bars.
  - **Budgets**: Monthly budget planner and envelope category tracker.
  - **Contacts**: Directory of persons and businesses with Net Volume tracking.

---

## Chapter 3: Accounts & Wallets Management

Hawk tracks your liquid money across **Bank Accounts** and **Cash Wallets**.

```
+-----------------------+     +-----------------------+
|     BANK ACCOUNTS     |     |     CASH WALLETS      |
|  - Checking Account   |     |  - Physical Pocket    |
|  - Savings Account    |     |  - Home Safe Cash     |
|  - Payroll Account    |     |  - Petty Cash Box     |
+-----------------------+     +-----------------------+
```

### Adding an Account
1. From the Home screen, tap **Accounts** or **See All Accounts**.
2. Tap the **+ Add Account** button.
3. Fill in the details:
   - **Account Name**: e.g., "Chase Checking" or "Pocket Wallet".
   - **Asset Type**: Select **Bank** or **Cash**.
   - **Account Number**: (Optional) Enter the last 4 digits of your bank account.
   - **Initial Balance**: Enter what is currently in the account today.
   - **Note**: (Optional) Add memo.
4. Tap **Save Account**.

### Live Balance Calculation
Hawk automatically calculates current balances in real time:

$$\text{Current Balance} = \text{Initial Balance} + \sum \text{Incoming Funds} - \sum \text{Outgoing Funds}$$

### Archiving vs Deleting Accounts
- If an account has **zero transactions**, you can permanently delete it.
- If an account has **past transactions**, Hawk archives it instead of deleting it. Archiving hides the account from new dropdowns while preserving your past ledger history and transaction accuracy.

---

## Chapter 4: Recording Daily Transactions

Hawk supports all forms of monetary movement: Expenses, Income, and Transfers.

```
+-------------------------------------------------------------+
|                      NEW TRANSACTION                        |
|                                                             |
|   [ Expense ]           [ Income ]           [ Transfer ]   |
|                                                             |
|   Amount: [ $ 45.00 ]                                       |
|                                                             |
|   Account:  [ Main Checking        v ]                      |
|   Category: [ Food & Groceries     v ]                      |
|   Date:     [ Today, 2:30 PM       v ]                      |
|   Note:     [ Lunch with coworkers   ]                      |
|                                                             |
|   [                  Slide / Tap to Save                ]   |
+-------------------------------------------------------------+
```

### Logging an Expense
1. Tap the **`+`** button on the bottom navigation bar.
2. Ensure **Expense** is selected.
3. Enter the numerical amount.
4. Pick the source **Account** to deduct from.
5. Pick an **Expense Category** (e.g. Food, Shopping, Utilities, Rent).
6. (Optional) Select a **Contact** if the expense was paid to someone specific.
7. Tap or slide to save.

### Transferring Between Accounts (e.g. ATM Cash Withdrawal)
1. Tap the **`+`** button and select **Transfer**.
2. Enter the amount withdrawn.
3. Select **From Account** (e.g., Chase Checking).
4. Select **To Account** (e.g., Physical Cash Wallet).
5. Tap **Save**. Your total net worth remains the same, but your bank decreases while your cash increases!

---

## Chapter 5: Debts & Loans Tracking

Never lose track of money you lend to friends or borrow from family.

```
+-------------------------------------------------------------+
|                         DEBTS HUB                           |
|                                                             |
|   [ Lent to Others: $1,250 ]       [ Borrowed: $400 ]       |
|                                                             |
|   ACTIVE LOANS:                                             |
|   * Alex Johnson                                            |
|     Principal: $1,000.00   |  Repaid: $600.00               |
|     Remaining: $400.00     |  Due: Nov 15, 2026             |
|     [=========================>          ] 60% Repaid       |
|     [ Record Repayment ]     [ Settle / Write Off ]         |
+-------------------------------------------------------------+
```

### Recording a Loan
1. Navigate to the **Debts** tab and tap **+ Add Debt**.
2. Choose **I Lent Money** (they owe you) or **I Borrowed Money** (you owe them).
3. Select the **Contact**.
4. Enter the **Principal Amount** and optional **Due Date**.
5. **Funding Account Selection**:
   - **If you gave the money right now**: Select the bank or cash account it came from. Hawk will deduct it from your account balance.
   - **If this loan was given in the past (before using Hawk)**: Leave the account field blank! Hawk will track the debt without deducting from your current accounts.
6. Tap **Save**.

### Recording Repayments
1. Open the debt details page.
2. Tap **Record Repayment**.
3. Enter the amount repaid and select the account where the money was deposited.
4. Hawk updates the remaining balance and progress bar instantly. When 100% of the loan is repaid, the status automatically switches to **Repaid**.

### Writing Off Bad Debts
If a borrower cannot repay a loan, tap **Settle Manually** and enter a note (e.g., "Forgiven / Uncollectible"). The loan will be moved to the **Written-Off** section and logged in your audit history.

---

## Chapter 6: Contacts Book

The Contacts screen is your relationship directory for both commercial spending and personal loans.

```
+-------------------------------------------------------------+
|                      CONTACT PROFILE                        |
|                                                             |
|   [ Avatar ] Alex Johnson                                   |
|   Mobile: +1 (555) 019-2834                                 |
|                                                             |
|   FINANCIAL SUMMARY:                                        |
|   Owed to Me:   $ 400.00  (Active Loan)                     |
|   I Owe Them:   $   0.00                                    |
|   Net Volume:   +$150.00  (Income minus Expense)            |
|                                                             |
|   TRANSACTION HISTORY:                                      |
|   - Repayment Received    +$200.00    Chase Checking        |
|   - Loan Disbursed        -$1,000.00  Cash Wallet           |
|   - Freelance Work Paid   +$150.00    Invoice #4            |
+-------------------------------------------------------------+
```

### Understanding Net Volume
- **Net Volume = Total Income from Contact - Total Expenses to Contact**
- Loans and debt disbursements are **intentionally excluded** from Net Volume. This allows you to see the real commercial exchange with a person without loans skewing the numbers!

### Re-using Names of Archived Contacts
If you archive an old contact named "John Doe", Hawk allows you to create a brand new active contact named "John Doe" later on. The two contacts are treated as completely distinct entities in your records.

---

## Chapter 7: Monthly Budgets

Hawk uses envelope budgeting to help you control monthly expenses.

```
+-------------------------------------------------------------+
|                   OCTOBER 2026 BUDGET                       |
|   Total Budget: $3,000.00  |  Spent: $1,850.00  | Left: $1,150|
|   [=============================>               ] 61.6%     |
+-------------------------------------------------------------+
|   CATEGORIES:                                               |
|                                                             |
|   Food & Groceries                                          |
|   $540.00 / $800.00                 [=========>    ] 67.5%  |
|                                                             |
|   Transportation                                            |
|   $485.00 / $400.00   OVER BUDGET!  [==============>] 121%  |
|                                                             |
|   Housing & Rent                                            |
|   $1,200.00 / $1,200.00             [==============] 100%  |
+-------------------------------------------------------------+
```

### Creating a Monthly Budget
1. Go to the **Budgets** tab and tap **Create Budget**.
2. Select the **Month** (e.g. October 2026).
3. Tap **Add Category** to select an expense category and assign a monthly limit.
4. Repeat for all categories you want to control.
5. Tap **Save Budget**.

### Copying from Templates
Don't re-create your budget every single month! When creating a budget, check **Save as Template**. At the beginning of a new month, tap **Copy from Template** to instantly clone your category envelopes.

---

## Chapter 8: Security, PIN & Biometrics

Hawk protects your personal data with multi-layered hardware security.

```
+-------------------------------------------------------------+
|                    SECURITY PERMISSIONS                     |
|                                                             |
|   REQUIRE PIN / BIOMETRICS FOR:                             |
|   [X] Delete Transaction                                    |
|   [X] Delete Account or Wallet                              |
|   [X] Delete Contact                                        |
|   [X] Delete Debt Record                                    |
|   [ ] Create Transaction                                    |
|   [X] Cloud Backup & Restore                                |
|   [X] Reset All Data                                        |
+-------------------------------------------------------------+
```

### Enabling App Lock & Biometrics
1. Navigate to **Settings** -> **Security Permissions**.
2. Toggle on **App Lock**. Hawk will now lock whenever the app is closed or sent to the background.
3. Toggle on **Biometrics** to enable Face ID, Touch ID, or Android Fingerprint.

> **Android Biometrics Notice**: On Android, Hawk strictly requires a physical hardware fingerprint sensor. Insecure 2D camera-based facial recognition is intentionally disabled to protect your financial data from photo spoofing.

### Progressive Lockout Protection
If someone attempts to guess your PIN, Hawk locks them out with progressive delays:
- 5 wrong attempts: **30 seconds**
- 10 wrong attempts: **2 minutes**
- 15 wrong attempts: **5 minutes**
- 20 wrong attempts: **10 minutes**
- 25 wrong attempts: **30 minutes**
- 30+ wrong attempts: **2 hours**

Restarting your phone will **not** reset the timer.

---

## Chapter 9: Google Drive Cloud Backup & Restore

Keep your data safe when switching phones or upgrading.

```
+-------------------------------------------------------------+
|                      BACKUP & RESTORE                       |
|                                                             |
|   Connected Google Account:                                 |
|   user@gmail.com                                            |
|                                                             |
|   Cloud Backup Status:                                      |
|   Last Backup: Oct 22, 2026 at 2:15 PM                      |
|   Cloud File Size: 1.4 MB                                   |
|                                                             |
|   [       Back Up Now       ]   [      Restore Backup     ] |
+-------------------------------------------------------------+
```

### Backing Up to Google Drive
1. Go to **Settings** -> **Backup & Restore**.
2. Tap **Sign in with Google** and choose your Google account.
3. Tap **Back Up Now**.
4. Hawk creates an atomic snapshot of your database and uploads it to your private, hidden Google Drive app folder.

### Restoring on a New Device
1. Install Hawk on your new phone.
2. In Settings, connect the **same Google Account**.
3. Tap **Restore Backup**. Hawk will download the database and restore all accounts, transactions, debts, and budgets seamlessly.

---

## Chapter 10: Frequently Asked Questions (FAQ)

### Q: Why does Hawk not use Face Unlock on my Android phone?
**A:** Most Android phones use basic front-facing 2D cameras for face unlock, which can be fooled by photos or videos. Hawk strictly requires **Tier-3 Hardware Fingerprint sensors** on Android for financial safety.

### Q: Can I record a loan I gave someone before I started using Hawk?
**A:** Yes! When creating a new debt, leave the **Account** field blank. Hawk will track the loan and repayments without altering your current bank balances.

### Q: Will deleting an account erase my past transactions?
**A:** No. If an account has past transactions, Hawk archives it instead of deleting it. All your past reports and transaction histories remain 100% accurate.

### Q: How do I change my base currency?
**A:** Go to **Settings** -> **Edit Profile** -> **Currency** and select any of the 25 supported global currencies.

### Q: What if I lose my phone and don't have a Google Drive backup?
**A:** Because Hawk is an offline-first app, your data lives strictly on your phone. We recommend creating a cloud backup regularly so you can restore your records whenever you switch devices.
