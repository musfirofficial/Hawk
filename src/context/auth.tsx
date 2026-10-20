import { eq } from "drizzle-orm";
import React, { createContext, useContext, useEffect, useState } from "react";
import { ENABLE_GOOGLE_AUTH } from "../config/appConfig";
import { db, ensureDatabaseInitialized } from "../db";
import * as schema from "../db/schema";
import { AppSettings, NumberFormatId } from "../db/schema";
import {
  configureGoogleSignIn,
  GoogleUserInfo,
  performGoogleSignIn,
  performGoogleSignOut,
} from "../services/googleAuth";

export function generateRecoveryKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += chars.charAt(Math.floor(Math.random() * chars.length));
    part2 += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${part1}-${part2}`;
}

export { GoogleUserInfo };

interface AuthContextType {
  settings: AppSettings | null;
  isLoading: boolean;
  hasOnboarded: boolean;
  isAppUnlocked: boolean;
  unlockApp: () => void;
  isRecoverySessionVerified: boolean;
  setRecoverySessionVerified: (verified: boolean) => void;
  recordFailedRecoveryAttempt: () => Promise<{
    lockedOut: boolean;
    remainingSeconds: number;
  }>;
  resetRecoveryAttempts: () => Promise<void>;
  getRecoveryLockoutSeconds: () => number;
  recordFailedPinAttempt: () => Promise<{
    lockedOut: boolean;
    remainingSeconds: number;
  }>;
  resetPinAttempts: () => Promise<void>;
  getPinLockoutSeconds: () => number;
  isGoogleAuthEnabled: boolean;
  pendingGoogleUser: GoogleUserInfo | null;
  setPendingGoogleUser: (user: GoogleUserInfo | null) => void;
  signInWithGoogle: () => Promise<GoogleUserInfo | null>;
  completeOnboarding: (params: {
    userName: string;
    currency: string;
    numberFormat: NumberFormatId;
    profilePic?: string | null;
    pin?: string;
    recoveryKey?: string;
    biometricsEnabled?: boolean;
    pinEnabled?: boolean;
    appLockEnabled?: boolean;
  }) => Promise<void>;
  updateSecuritySettings: (params: {
    pin?: string;
    recoveryKey?: string;
    biometricsEnabled?: boolean;
    pinEnabled?: boolean;
    appLockEnabled?: boolean;
  }) => Promise<void>;
  disconnectGoogle: () => Promise<void>;
  reloadSettings: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAppUnlocked, setIsAppUnlocked] = useState<boolean>(false);
  const [isRecoverySessionVerified, setRecoverySessionVerified] =
    useState<boolean>(false);
  const [pendingGoogleUser, setPendingGoogleUser] =
    useState<GoogleUserInfo | null>(null);

  // Initialize DB and load local app settings on mount
  useEffect(() => {
    async function init() {
      try {
        ensureDatabaseInitialized();
        loadSettingsFromDB();

        // Only initialize Google Sign-in if feature flag is active
        if (ENABLE_GOOGLE_AUTH) {
          configureGoogleSignIn();
        }
      } catch (err) {
        console.warn("Auth initialization warning:", err);
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  function loadSettingsFromDB() {
    try {
      ensureDatabaseInitialized();
      const rows = db.select().from(schema.appSettings).limit(1).all();
      if (rows && rows.length > 0) {
        const current = rows[0];
        setSettings(current);
        setHasOnboarded(Boolean(current.hasOnboarded));
      } else {
        setSettings(null);
        setHasOnboarded(false);
      }
    } catch (err) {
      console.error("Error reading app_settings:", err);
      setHasOnboarded(false);
    }
  }

  // Google Sign-in (Enabled or Disabled via ENABLE_GOOGLE_AUTH flag)
  async function signInWithGoogle(): Promise<GoogleUserInfo | null> {
    if (!ENABLE_GOOGLE_AUTH) {
      throw new Error(
        "Google Sign-In is currently disabled. Toggle ENABLE_GOOGLE_AUTH in src/config/appConfig.ts to enable.",
      );
    }

    try {
      const googleInfo = await performGoogleSignIn();
      setPendingGoogleUser(googleInfo);
      return googleInfo;
    } catch (error) {
      console.error("Google Sign-in error:", error);
      throw error;
    }
  }

  // Complete Onboarding: Save profile and mark hasOnboarded = true
  async function completeOnboarding(params: {
    userName: string;
    currency: string;
    numberFormat: NumberFormatId;
    profilePic?: string | null;
    pin?: string;
    recoveryKey?: string;
    biometricsEnabled?: boolean;
    pinEnabled?: boolean;
    appLockEnabled?: boolean;
  }) {
    try {
      ensureDatabaseInitialized();
      const existing = db.select().from(schema.appSettings).limit(1).all();

      const googleEmail = pendingGoogleUser?.email || null;
      const googleName = pendingGoogleUser?.name || null;

      const hasPin = Boolean(params.pin);
      const defaultPinEnabled = params.pinEnabled !== undefined ? params.pinEnabled : hasPin;

      if (existing.length > 0) {
        db.update(schema.appSettings)
          .set({
            userName: params.userName,
            currency: params.currency,
            numberFormat: params.numberFormat,
            profilePic: params.profilePic || null,
            pin: params.pin !== undefined ? params.pin : existing[0].pin,
            recoveryKey:
              params.recoveryKey !== undefined
                ? params.recoveryKey
                : existing[0].recoveryKey,
            pinEnabled:
              params.pinEnabled !== undefined
                ? params.pinEnabled
                : existing[0].pinEnabled ?? defaultPinEnabled,
            biometricsEnabled:
              params.biometricsEnabled !== undefined
                ? params.biometricsEnabled
                : existing[0].biometricsEnabled,
            appLockEnabled:
              params.appLockEnabled !== undefined
                ? params.appLockEnabled
                : existing[0].appLockEnabled ?? false,
            googleEmail: googleEmail || existing[0].googleEmail,
            googleName: googleName || existing[0].googleName,
            hasOnboarded: true,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
      } else {
        db.insert(schema.appSettings)
          .values({
            userName: params.userName,
            currency: params.currency,
            numberFormat: params.numberFormat,
            profilePic: params.profilePic || null,
            pin: params.pin || null,
            recoveryKey: params.recoveryKey || null,
            pinEnabled: defaultPinEnabled,
            biometricsEnabled: params.biometricsEnabled || false,
            appLockEnabled: params.appLockEnabled || false,
            googleEmail,
            googleName,
            hasOnboarded: true,
          })
          .run();
      }

      setPendingGoogleUser(null);
      loadSettingsFromDB();
    } catch (err) {
      console.error("Failed to complete onboarding:", err);
      throw err;
    }
  }

  // Update Security Settings (PIN, Biometrics, Recovery Key, App Lock)
  async function updateSecuritySettings(params: {
    pin?: string;
    recoveryKey?: string;
    biometricsEnabled?: boolean;
    pinEnabled?: boolean;
    appLockEnabled?: boolean;
  }) {
    try {
      ensureDatabaseInitialized();
      const existing = db.select().from(schema.appSettings).limit(1).all();
      if (existing.length > 0) {
        db.update(schema.appSettings)
          .set({
            ...(params.pin !== undefined && { pin: params.pin }),
            ...(params.recoveryKey !== undefined && {
              recoveryKey: params.recoveryKey,
            }),
            ...(params.biometricsEnabled !== undefined && {
              biometricsEnabled: params.biometricsEnabled,
            }),
            ...(params.pinEnabled !== undefined && {
              pinEnabled: params.pinEnabled,
            }),
            ...(params.appLockEnabled !== undefined && {
              appLockEnabled: params.appLockEnabled,
            }),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
        loadSettingsFromDB();
      }
    } catch (err) {
      console.error("Failed to update security settings:", err);
      throw err;
    }
  }

  // Disconnect Google Account
  async function disconnectGoogle() {
    try {
      if (ENABLE_GOOGLE_AUTH) {
        await performGoogleSignOut();
      }

      if (settings) {
        db.update(schema.appSettings)
          .set({
            googleEmail: null,
            googleName: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, settings.id))
          .run();
      }

      loadSettingsFromDB();
    } catch (err) {
      console.error("Error disconnecting Google:", err);
    }
  }

  function unlockApp() {
    setIsAppUnlocked(true);
  }

  function getRecoveryLockoutSeconds(): number {
    if (!settings?.lockoutUntil) return 0;
    const target = Number(settings.lockoutUntil);
    if (isNaN(target)) return 0;
    const diff = Math.ceil((target - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }

  async function recordFailedRecoveryAttempt(): Promise<{
    lockedOut: boolean;
    remainingSeconds: number;
  }> {
    try {
      ensureDatabaseInitialized();
      const existing = db.select().from(schema.appSettings).limit(1).all();
      if (existing.length === 0)
        return { lockedOut: false, remainingSeconds: 0 };
      const currentAttempts =
        (existing[0].failedRecoveryAttempts || 0) + 1;
      const now = Date.now();

      if (currentAttempts >= 5) {
        const lockoutEpoch = now + 30 * 1000; // 30-second lockout
        db.update(schema.appSettings)
          .set({
            failedRecoveryAttempts: currentAttempts,
            lockoutUntil: String(lockoutEpoch),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
        loadSettingsFromDB();
        return { lockedOut: true, remainingSeconds: 30 };
      } else {
        db.update(schema.appSettings)
          .set({
            failedRecoveryAttempts: currentAttempts,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
        loadSettingsFromDB();
        return { lockedOut: false, remainingSeconds: 0 };
      }
    } catch (err) {
      console.error("Failed to record recovery attempt:", err);
      return { lockedOut: false, remainingSeconds: 0 };
    }
  }

  async function resetRecoveryAttempts() {
    try {
      ensureDatabaseInitialized();
      const existing = db.select().from(schema.appSettings).limit(1).all();
      if (existing.length > 0) {
        db.update(schema.appSettings)
          .set({
            failedRecoveryAttempts: 0,
            lockoutUntil: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
        loadSettingsFromDB();
      }
    } catch (err) {
      console.error("Failed to reset recovery attempts:", err);
    }
  }

  function getPinLockoutSeconds(): number {
    if (!settings?.pinLockoutUntil) return 0;
    const target = Number(settings.pinLockoutUntil);
    if (isNaN(target)) return 0;
    const diff = Math.ceil((target - Date.now()) / 1000);
    return diff > 0 ? diff : 0;
  }

  async function recordFailedPinAttempt(): Promise<{
    lockedOut: boolean;
    remainingSeconds: number;
  }> {
    try {
      ensureDatabaseInitialized();
      const existing = db.select().from(schema.appSettings).limit(1).all();
      if (existing.length === 0)
        return { lockedOut: false, remainingSeconds: 0 };
      const currentAttempts =
        (existing[0].failedPinAttempts || 0) + 1;
      const now = Date.now();

      if (currentAttempts >= 5) {
        const lockoutEpoch = now + 30 * 1000; // 30-second lockout
        db.update(schema.appSettings)
          .set({
            failedPinAttempts: currentAttempts,
            pinLockoutUntil: String(lockoutEpoch),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
        loadSettingsFromDB();
        return { lockedOut: true, remainingSeconds: 30 };
      } else {
        db.update(schema.appSettings)
          .set({
            failedPinAttempts: currentAttempts,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
        loadSettingsFromDB();
        return { lockedOut: false, remainingSeconds: 0 };
      }
    } catch (err) {
      console.error("Failed to record PIN attempt:", err);
      return { lockedOut: false, remainingSeconds: 0 };
    }
  }

  async function resetPinAttempts() {
    try {
      ensureDatabaseInitialized();
      const existing = db.select().from(schema.appSettings).limit(1).all();
      if (existing.length > 0) {
        db.update(schema.appSettings)
          .set({
            failedPinAttempts: 0,
            pinLockoutUntil: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
        loadSettingsFromDB();
      }
    } catch (err) {
      console.error("Failed to reset PIN attempts:", err);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        settings,
        isLoading,
        hasOnboarded,
        isAppUnlocked,
        unlockApp,
        isRecoverySessionVerified,
        setRecoverySessionVerified,
        recordFailedRecoveryAttempt,
        resetRecoveryAttempts,
        getRecoveryLockoutSeconds,
        recordFailedPinAttempt,
        resetPinAttempts,
        getPinLockoutSeconds,
        isGoogleAuthEnabled: ENABLE_GOOGLE_AUTH,
        pendingGoogleUser,
        setPendingGoogleUser,
        signInWithGoogle,
        completeOnboarding,
        updateSecuritySettings,
        disconnectGoogle,
        reloadSettings: loadSettingsFromDB,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
