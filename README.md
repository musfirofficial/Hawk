# Hawk 🦅

> Offline-first personal financial ledger, debt tracker, and envelope budgeting mobile application.

Built with **Expo SDK 52**, **React Native 0.86**, **TypeScript**, **Drizzle ORM**, **SQLite**, and **NativeWind (TailwindCSS)**.

---

## 📖 Documentation & User Manuals

Complete technical specifications, architecture diagrams, and end-user manuals are available in the [`docs/`](file:///home/mustha/Projects/Hawk/docs/) folder:

- 📋 [**Documentation Master Index**](file:///home/mustha/Projects/Hawk/docs/README.md) - Tech stack, quickstart, and document directory.
- 🏗️ [**System Architecture**](file:///home/mustha/Projects/Hawk/docs/architecture.md) - High-level topology, runtime lifecycle, and ASCII workflows.
- 🗄️ [**Database Schema & Storage**](file:///home/mustha/Projects/Hawk/docs/database-schema.md) - Full SQLite schema, partial indexes, and aggregate queries.
- 🔐 [**Security & Authentication**](file:///home/mustha/Projects/Hawk/docs/security-and-auth.md) - Cryptographic PIN hashing, hardware biometrics, lockout timers, and Security Guard rules.
- ⚡ [**Core Features & Business Logic**](file:///home/mustha/Projects/Hawk/docs/features-guide.md) - Transactions engine, debt management, prior loan recording, budgeting, and Google Drive cloud sync.
- 📘 [**End-User Manual & FAQ**](file:///home/mustha/Projects/Hawk/docs/user-manual.md) - Step-by-step walkthroughs, instructions, and troubleshooting.

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Typecheck and lint
npx tsc --noEmit
npm run lint

# Start local Expo server
npx expo start
```