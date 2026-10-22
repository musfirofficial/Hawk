# Hawk Application Documentation & Technical Manual

> **Note**: This documentation contains pure Markdown and ASCII-based diagrams. In adherence to architectural requirements, no Mermaid syntax is utilized.

Welcome to the central documentation suite for **Hawk** — an offline-first, private personal finance tracker and debt management mobile application developed for iOS and Android using Expo SDK 52 and React Native.

---

## 📚 Documentation Directory

| Document | Description | Target Audience |
| :--- | :--- | :--- |
| [**Architecture Overview**](file:///home/mustha/Projects/Hawk/docs/architecture.md) | High-level system topology, module boundaries, state management, and ASCII data flow diagrams. | Engineers, Architects |
| [**Database Schema & Storage**](file:///home/mustha/Projects/Hawk/docs/database-schema.md) | Full Drizzle SQLite schema, table dictionaries, partial indices, relational models, and migration patterns. | DBAs, Backend/App Devs |
| [**Security & Authentication**](file:///home/mustha/Projects/Hawk/docs/security-and-auth.md) | Cryptographic PIN hashing, hardware-backed SecureStore, biometric enforcement (Tier-3), rate-limiting lockout, and Security Guard rules. | Security Engineers, App Devs |
| [**Core Features & Business Logic**](file:///home/mustha/Projects/Hawk/docs/features-guide.md) | Deep functional breakdown of the 7 transaction types, debt lifecycle, prior loan tracking, monthly budgeting, and Google Drive cloud sync. | Product Engineers, QA |
| [**End-User Manual**](file:///home/mustha/Projects/Hawk/docs/user-manual.md) | Step-by-step user guide covering onboarding, day-to-day transaction logging, debt tracking, backup/restore, and troubleshooting. | End Users, Support Staff |

---

## 🛠 Technology Stack

Hawk is built with a strictly typed, offline-first mobile architecture:

```
+--------------------------------------------------------------------------+
|                                HAWK APP                                  |
+--------------------------------------------------------------------------+
| UI & Presentation Layer:                                                 |
|   - React Native 0.86.3                                                  |
|   - React 19.2.3                                                         |
|   - Expo SDK 52 (Expo Router ~57.0.28, File-based routing)               |
|   - NativeWind 4.2.7 & TailwindCSS 3.4.19 (Modern luxury dark theme)     |
|   - React Native Reanimated 4.5.1 & Gesture Handler 2.32.0               |
|   - Vector Icons (@expo/vector-icons, Ionicons)                          |
+--------------------------------------------------------------------------+
| Application State & Logic:                                               |
|   - Context API with SQLite Reactive Listeners (addDatabaseChangeListener)|
|   - Modular Providers: Auth, Accounts, Debts, Transactions, Categories,  |
|     Contacts, Security Guard, Custom Alerts                              |
+--------------------------------------------------------------------------+
| Persistence & Database:                                                  |
|   - Drizzle ORM 0.45.3                                                   |
|   - Expo SQLite (expo-sqlite ~57.0.4 with WAL mode & Change Listeners)    |
|   - Synchronous Zero-Latency Schema Migrations                           |
+--------------------------------------------------------------------------+
| Hardware & Security Layer:                                               |
|   - Expo SecureStore (~57.0.4, Keystore/KeyChain hardware backing)       |
|   - Expo LocalAuthentication (~57.0.3, Face ID / Touch ID / Fingerprint) |
|   - Expo Crypto (~57.0.4, SHA-256 salted hashing)                        |
+--------------------------------------------------------------------------+
| Cloud Sync & Services:                                                   |
|   - Google Drive REST API v3 (Private hidden appDataFolder)              |
|   - @react-native-google-signin/google-signin 16.1.5                     |
|   - Expo FileSystem (~57.0.7, Atomic SQLite VACUUM snapshot transfers)   |
|   - Boring Avatars Vanilla (Deterministic SVG contact avatars)           |
+--------------------------------------------------------------------------+
```

---

## 🚀 Quick Start for Developers

### Prerequisites
- Node.js >= 20.x
- `npm` or `bun` package manager
- Android Studio / Xcode (optional for Native Dev Client; Expo Go for basic testing)

### Installation & Environment Setup
1. Clone the repository and navigate into the root directory:
   ```bash
   cd Hawk
   ```

2. Install dependencies using standard Expo tooling:
   ```bash
   npm install
   ```

3. Ensure code formatting and TypeScript types pass verification:
   ```bash
   npx tsc --noEmit
   npm run lint
   ```

4. Launch the local Expo development server:
   ```bash
   npx expo start
   ```

5. Run on Android or iOS native builds:
   ```bash
   npm run android
   npm run ios
   ```

---

## 📂 Source Code Layout

The project adheres to a clean separation of concerns:

```
Hawk/
├── docs/                        # Comprehensive Technical Specs & Manuals
│   ├── README.md                # Documentation master index (this file)
│   ├── architecture.md          # System architecture & runtime flow
│   ├── database-schema.md       # Tables, indices, relations, & migrations
│   ├── security-and-auth.md     # PIN, biometrics, lockout, & guard system
│   ├── features-guide.md        # Deep dive into all app domain features
│   └── user-manual.md           # End-user handbook and FAQs
├── src/
│   ├── app/                     # Expo Router navigation screens & layouts
│   │   ├── (auth)/              # Onboarding, PIN setup, Lockscreen, Recovery
│   │   ├── (tabs)/              # Primary Tab Bar (Home, Debts, Budgets, Contacts)
│   │   ├── (account)/           # Account creation & ledger details
│   │   ├── (transaction)/       # Transaction creation & detailed ledger
│   │   ├── (categories)/        # Category management & customization
│   │   ├── (settings)/          # Security, Google account, backup/restore
│   │   ├── _layout.tsx          # Root Stack provider & NavigationGate
│   │   └── index.tsx            # Initial entry router & splash coordinator
│   ├── components/              # Atomic UI components, cards, bottom sheets
│   ├── config/                  # Global application flags & OAuth configurations
│   ├── context/                 # Reactive business logic & domain state providers
│   ├── db/                      # Drizzle SQLite schema, database client, & migrations
│   ├── hooks/                   # Reusable UI & platform hooks
│   └── services/                # Hardware biometrics, secure storage, & cloud backup
├── assets/                      # Application icons, fonts, and static assets
├── app.json                     # Expo configuration and native permissions
├── drizzle.config.ts            # Drizzle ORM generation settings
├── tailwind.config.js           # Custom color palettes, typography, & radius tokens
└── package.json                 # Dependency definitions and scripts
```
