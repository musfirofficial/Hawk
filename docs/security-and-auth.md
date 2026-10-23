# Hawk Security, Cryptography & Authentication System

This document details the security architecture, cryptographic storage, biometric policies, brute-force mitigation mechanisms, and fine-grained authorization gates implemented in **Hawk**.

---

## 1. Security Architecture & Threat Model

Financial management applications require defense against both physical device compromise (shoulder-surfing, borrowed phones, device theft) and digital threats (unauthorized cloud sync, local data tampering).

```
+---------------------------------------------------------------------------------------+
|                                  HAWK SECURITY PERIMETER                              |
+---------------------------------------------------------------------------------------+
|                                                                                       |
|  [ Level 1: App Entry Gate ]                                                          |
|    - App Lock on startup & app switcher backgrounding                                 |
|    - Biometric check (Face ID / Hardware Fingerprint) or 4-digit PIN                  |
|                                                                                       |
|  [ Level 2: Progressive Lockout Protection ]                                          |
|    - Rate limits consecutive failed PIN or Recovery attempts                          |
|    - Enforces lockouts from 30 seconds up to 2 hours                                  |
|                                                                                       |
|  [ Level 3: Granular Security Guard ]                                                 |
|    - Protects destructive actions (deletions, resets, profile modifications)          |
|    - Independent toggles configured in Security Permissions                           |
|                                                                                       |
|  [ Level 4: Cryptographic Key Storage ]                                               |
|    - Hardware-backed iOS Keychain / Android KeyStore (AES-256 GCM)                    |
|    - SHA-256 salted PIN hashing                                                       |
|                                                                                       |
|  [ Level 5: Private Cloud Isolation ]                                                 |
|    - Google Drive hidden `appDataFolder` (isolated from regular Drive UI)             |
+---------------------------------------------------------------------------------------+
```

---

## 2. PIN Cryptography & Hardware Keystore

### Storage & Key Derivation
- **Hardware Keystore**: Keys are stored using `expo-secure-store`, binding credentials to the device's hardware Secure Enclave (iOS) or Trusted Execution Environment (Android).
- **Salted SHA-256 Digest**: PINs are never stored in plaintext. They are salted with a system domain separator and hashed using SHA-256:

$$\text{PIN Hash} = \text{SHA-256}(\text{"hawk\_pin\_salt\_v1"} \parallel \text{":"} \parallel \text{user\_pin})$$

### Legacy Plaintext Auto-Upgrade
When older databases are opened, Hawk transparently verifies against the plaintext credential and immediately elevates the storage to a salted SHA-256 hash in hardware storage:

```
[ User enters 4-digit PIN ]
            |
            v
   ( Retrieve Stored Value from SecureStore )
            |
   +--------+-----------------------------+
   |                                      |
[ Stored is 4-digit Plaintext ]    [ Stored is 64-char Hex Hash ]
   |                                      |
   v                                      v
Direct String Compare              Compute SHA-256 with Salt
   |                                      |
[ Matches ]                               v
   |                               Compare Result to Hash
   +---> Upgrade: Salt & Hash             |
         Save back to SecureStore   [ Match / Fail ]
```

---

## 3. Hardware Biometric Authentication Policy

Hawk implements strict hardware security tier requirements for biometric authentication:

```
+--------------------------------------------------------------------------------+
| PLATFORM | HARDWARE SENSOR            | SECURITY STATUS  | HAWK POLICY         |
+----------+----------------------------+------------------+---------------------+
| iOS      | Face ID (TrueDepth 3D IR)  | Class 3 (Strong) | Permitted           |
| iOS      | Touch ID (Capacitive)      | Class 3 (Strong) | Permitted           |
| Android  | Hardware Fingerprint       | Class 3 (Strong) | Permitted           |
| Android  | 2D Camera Face Unlock      | Class 1/2 (Weak) | REJECTED (Enforce   |
|          |                            |                  | PIN fallback)       |
+--------------------------------------------------------------------------------+
```

### Why Android 2D Face Unlock is Blocked
Standard Android camera-based facial unlock systems can be tricked with high-resolution photos or printed screens. Hawk explicitly queries `supportedAuthenticationTypesAsync()`. If an Android device only reports facial recognition without a fingerprint sensor, Hawk classifies biometrics as unavailable and enforces the 4-digit PIN to prevent spoofing.

### Native Fallback Suppression
The native authentication call configures:
```typescript
disableDeviceFallback: true
```
This prevents the operating system from falling back to the phone's lock screen password, ensuring that only the Hawk PIN or Hawk Recovery Key can grant access to the application.

---

## 4. Progressive Lockout & Anti-Brute-Force System

To defeat automated PIN brute-force attempts and dictionary attacks, Hawk implements a progressive rate-limiting schedule.

### Lockout Schedule

| Failed Attempts Range | Lockout Duration | User Message |
| :--- | :--- | :--- |
| **1 – 4 attempts** | 0 seconds (Immediate retry) | "Incorrect PIN. X attempts remaining" |
| **5 – 9 attempts** | **30 seconds** | "Too many attempts. Locked for 30s" |
| **10 – 14 attempts** | **2 minutes** (120s) | "Too many attempts. Locked for 2m" |
| **15 – 19 attempts** | **5 minutes** (300s) | "Too many attempts. Locked for 5m" |
| **20 – 24 attempts** | **10 minutes** (600s) | "Too many attempts. Locked for 10m" |
| **25 – 29 attempts** | **30 minutes** (1,800s) | "Too many attempts. Locked for 30m" |
| **30+ attempts** | **2 hours** (7,200s) | "Device locked for 2 hours" |

### Lockout Persistence Architecture
Lockout timestamps and failure counters are persisted directly inside SQLite `app_settings`:
- `pin_lockout_until`: ISO timestamp when PIN lockout ends.
- `failed_pin_attempts`: Integer counter.
- `lockout_until`: ISO timestamp when Recovery Key lockout ends.
- `failed_recovery_attempts`: Integer counter.

Because these values are written to disk, **force-closing or rebooting the phone does not reset or bypass the lockout countdown timer**.

---

## 5. Account Recovery Key System

During initial setup, Hawk generates an 8-character cryptographic recovery key:

```
Format: XXXX-XXXX (e.g., K9W2-P7M4)
Alphabet: A-Z and 2-9 (excluding ambiguous characters: 0, O, 1, I)
```

```
[ User Forgets PIN ]
          |
          v
Select "Forgot PIN?" on Lockscreen
          |
          v
[ Enter 8-Character Recovery Key ]
          |
          +---> [ Fail ] ---> Increment `failed_recovery_attempts`
          |                   Enforce Progressive Lockout
          v
      [ Match ]
          |
          v
Set `isRecoverySessionVerified = true`
Clear `failed_pin_attempts` and reset lockout timers
          |
          v
Redirect to `/(auth)/setup-pin` to choose new PIN
```

The recovery key operates as a separate security boundary. Attempts on the recovery key are tracked independently from PIN attempts.

---

## 6. Granular Security Guard System

Hawk features an action-level authorization interceptor (`SecurityGuardModal` managed via `useSecurity()`). Even if the app is already unlocked, sensitive operations require secondary authentication if enabled in security settings.

```
[ User triggers protected action ]
(e.g., "Delete Transaction" or "Restore Backup")
                 |
                 v
     ( SecurityContext Intercept )
                 |
        Check `securityRules` table:
        Is this specific rule enabled?
                 |
       +---------+---------+
       |                   |
    [ NO ]              [ YES ]
       |                   |
       v                   v
Execute Callback     Display SecurityGuardModal:
Immediately          Prompt for PIN or Biometrics
                           |
                 +---------+---------+
                 |                   |
             [ Pass ]             [ Cancel ]
                 |                   |
                 v                   v
          Execute Action      Abort Operation
```

### Security Rules Matrix

| Rule Key | Database Column | Default | Description |
| :--- | :--- | :--- | :--- |
| `deleteTransaction` | `delete_transaction` | **ON** | Deleting any income, expense, or transfer |
| `deleteAccount` | `delete_account` | **ON** | Deleting or archiving a bank account or cash wallet |
| `deleteContact` | `delete_contact` | **ON** | Deleting or archiving a contact entity |
| `deleteDebt` | `delete_debt` | **ON** | Deleting an entire debt record |
| `createTransaction` | `create_transaction` | **OFF** | Logging every new transaction (optional high-security) |
| `createAccount` | `create_account` | **OFF** | Creating a new bank account or wallet |
| `editProfile` | `edit_profile` | **ON** | Modifying user profile name or base currency |
| `manageAccount` | `manage_account` | **ON** | Editing existing account names or initial balances |
| `backupRestore` | `backup_restore` | **ON** | Performing cloud backups or restoring data |
| `resetData` | `reset_data` | **ON** | Erasing all database records |

---

## 7. Cloud Backup Security & Privacy Isolation

When backing up to Google Drive, Hawk enforces the following privacy rules:

1. **OAuth Scope Restriction**: Hawk requests only `https://www.googleapis.com/auth/drive.appdata`. It cannot read, view, or modify any personal files, spreadsheets, or photos in the user's Google Drive.
2. **Hidden Directory**: Backups are written to Google Drive's hidden `appDataFolder`. The database file (`hawk_backup.db`) is invisible in the Drive web interface, preventing accidental tampering or deletion.
3. **Local Privacy Scrubbing**: The user's device-local profile picture path (`profile_pic`) is scrubbed on database restoration, preventing invalid file paths or broken avatars across device transfers.
