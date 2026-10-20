import { eq } from "drizzle-orm";
import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
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
import {
  saveSecurePin,
  deleteSecurePin,
  saveSecureRecoveryKey,
  getSecureRecoveryKey,
  deleteSecureRecoveryKey,
  hasSecurePin,
  verifySecurePin,
  verifySecureRecoveryKey,
} from "../services/securityStorage";

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
  lockApp: () => void;
  hasPin: boolean;
  verifyPin: (pin: string) => Promise<boolean>;
  verifyRecoveryKey: (key: string) => Promise<boolean>;
  savePin: (pin: string, recoveryKey?: string) => Promise<void>;
  removePin: () => Promise<void>;
  getRecoveryKey: () => Promise<string | null>;
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

/**
 * Calculates progressive lockout duration based on consecutive failure sets of 5:
 * - 5 attempts: 30s
 * - 10 attempts: 2m (120s)
 * - 15 attempts: 5m (300s)
 * - 20 attempts: 10m (600s)
 * - 25 attempts: 30m (1800s)
 * - 30+ attempts: 2h (7200s)
 */
export function getLockoutDurationSeconds(failedAttempts: number): number {
  const setIndex = Math.floor(failedAttempts / 5);
  switch (setIndex) {
    case 0:
      return 0;
    case 1:
      return 30; // 30s
    case 2:
      return 120; // 2m
    case 3:
      return 300; // 5m
    case 4:
      return 600; // 10m
    case 5:
      return 1800; // 30m
    default:
      return 7200; // 2h
  }
}

/**
 * Format remaining lockout seconds into user-friendly text:
 * e.g., "30s", "2m", "1m 45s", "10m", "30m", "2h", "1h 50m"
 */
export function formatLockoutRemaining(seconds: number): string {
  if (seconds <= 0) return "0s";
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  }
  return `${seconds}s`;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAppUnlocked, setIsAppUnlocked] = useState<boolean>(false);
  const [hasPin, setHasPin] = useState<boolean>(false);
  const [isRecoverySessionVerified, setRecoverySessionVerified] =
    useState<boolean>(false);
  const [pendingGoogleUser, setPendingGoogleUser] =
    useState<GoogleUserInfo | null>(null);

  const appState = useRef(AppState.currentState);
  const lastBackgroundTime = useRef<number | null>(null);

  // AppState listener for auto-relocking on app resume (S5)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (
        appState.current === "active" &&
        (nextAppState === "background" || nextAppState === "inactive")
      ) {
        lastBackgroundTime.current = Date.now();
      } else if (
        (appState.current === "background" || appState.current === "inactive") &&
        nextAppState === "active"
      ) {
        const bgTime = lastBackgroundTime.current;
        lastBackgroundTime.current = null;

        if (settings?.appLockEnabled && settings?.pinEnabled && hasPin) {
          // Re-lock if backgrounded for more than 2 seconds (grace period prevents relock loops on biometric prompts)
          if (bgTime && Date.now() - bgTime > 2000) {
            setIsAppUnlocked(false);
          }
        }
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [settings?.appLockEnabled, settings?.pinEnabled, hasPin]);

  // Initialize DB and load local app settings on mount
  useEffect(() => {
    async function init() {
      try {
        ensureDatabaseInitialized();
        await loadSettingsFromDB();

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

  async function loadSettingsFromDB() {
    try {
      ensureDatabaseInitialized();
      const rows = db.select().from(schema.appSettings).limit(1).all();
      let pinExists = await hasSecurePin();

      if (rows && rows.length > 0) {
        const current = rows[0];

        // One-time migration: If SQLite still has plaintext PIN, move to SecureStore & wipe DB column
        if (current.pin) {
          await saveSecurePin(current.pin);
          if (current.recoveryKey) {
            await saveSecureRecoveryKey(current.recoveryKey);
          }
          db.update(schema.appSettings)
            .set({ pin: null, recoveryKey: null, updatedAt: new Date().toISOString() })
            .where(eq(schema.appSettings.id, current.id))
            .run();
          pinExists = true;
        }

        setSettings(current);
        setHasOnboarded(Boolean(current.hasOnboarded));
      } else {
        setSettings(null);
        setHasOnboarded(false);
      }
      setHasPin(pinExists);
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

      const hasNewPin = Boolean(params.pin);
      const defaultPinEnabled = params.pinEnabled !== undefined ? params.pinEnabled : hasNewPin;

      if (params.pin) {
        await saveSecurePin(params.pin);
        if (params.recoveryKey) {
          await saveSecureRecoveryKey(params.recoveryKey);
        }
        setHasPin(true);
      } else if (params.pinEnabled === false) {
        await deleteSecurePin();
        await deleteSecureRecoveryKey();
        setHasPin(false);
      }

      if (existing.length > 0) {
        db.update(schema.appSettings)
          .set({
            userName: params.userName,
            currency: params.currency,
            numberFormat: params.numberFormat,
            profilePic: params.profilePic || null,
            pin: null,
            recoveryKey: null,
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
            pin: null,
            recoveryKey: null,
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
      await loadSettingsFromDB();
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
      if (params.pin !== undefined) {
        if (params.pin) {
          await saveSecurePin(params.pin);
          setHasPin(true);
        } else {
          await deleteSecurePin();
          setHasPin(false);
        }
      }
      if (params.recoveryKey !== undefined) {
        if (params.recoveryKey) {
          await saveSecureRecoveryKey(params.recoveryKey);
        } else {
          await deleteSecureRecoveryKey();
        }
      }

      const existing = db.select().from(schema.appSettings).limit(1).all();
      if (existing.length > 0) {
        db.update(schema.appSettings)
          .set({
            pin: null,
            recoveryKey: null,
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
        await loadSettingsFromDB();
      }
    } catch (err) {
      console.error("Failed to update security settings:", err);
      throw err;
    }
  }

  async function verifyPin(enteredPin: string): Promise<boolean> {
    return await verifySecurePin(enteredPin);
  }

  async function verifyRecoveryKey(enteredKey: string): Promise<boolean> {
    return await verifySecureRecoveryKey(enteredKey);
  }

  async function savePin(pin: string, recoveryKey?: string): Promise<void> {
    await saveSecurePin(pin);
    if (recoveryKey) {
      await saveSecureRecoveryKey(recoveryKey);
    }
    setHasPin(true);
    await updateSecuritySettings({ pinEnabled: true });
  }

  async function removePin(): Promise<void> {
    await deleteSecurePin();
    await deleteSecureRecoveryKey();
    setHasPin(false);
    await updateSecuritySettings({ pinEnabled: false, appLockEnabled: false });
  }

  async function getRecoveryKey(): Promise<string | null> {
    return await getSecureRecoveryKey();
  }

  function lockApp() {
    setIsAppUnlocked(false);
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

      await loadSettingsFromDB();
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
      
      const now = Date.now();
      const previousLockout = Number(existing[0].lockoutUntil);
      // If currently locked out, do not count attempt and return remaining seconds
      if (previousLockout && now < previousLockout) {
        const remaining = Math.ceil((previousLockout - now) / 1000);
        return { lockedOut: true, remainingSeconds: remaining };
      }

      const currentAttempts = (existing[0].failedRecoveryAttempts || 0) + 1;

      // Lockout triggers on every multiple of 5 failed attempts
      if (currentAttempts % 5 === 0) {
        const duration = getLockoutDurationSeconds(currentAttempts);
        const lockoutEpoch = now + duration * 1000;
        db.update(schema.appSettings)
          .set({
            failedRecoveryAttempts: currentAttempts,
            lockoutUntil: String(lockoutEpoch),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
        await loadSettingsFromDB();
        return { lockedOut: true, remainingSeconds: duration };
      } else {
        db.update(schema.appSettings)
          .set({
            failedRecoveryAttempts: currentAttempts,
            lockoutUntil: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
        await loadSettingsFromDB();
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
        await loadSettingsFromDB();
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

      const now = Date.now();
      const previousLockout = Number(existing[0].pinLockoutUntil);
      // If currently locked out, do not count attempt and return remaining seconds
      if (previousLockout && now < previousLockout) {
        const remaining = Math.ceil((previousLockout - now) / 1000);
        return { lockedOut: true, remainingSeconds: remaining };
      }

      const currentAttempts = (existing[0].failedPinAttempts || 0) + 1;

      // Lockout triggers on every multiple of 5 failed attempts
      if (currentAttempts % 5 === 0) {
        const duration = getLockoutDurationSeconds(currentAttempts);
        const lockoutEpoch = now + duration * 1000;
        db.update(schema.appSettings)
          .set({
            failedPinAttempts: currentAttempts,
            pinLockoutUntil: String(lockoutEpoch),
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
        await loadSettingsFromDB();
        return { lockedOut: true, remainingSeconds: duration };
      } else {
        db.update(schema.appSettings)
          .set({
            failedPinAttempts: currentAttempts,
            pinLockoutUntil: null,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, existing[0].id))
          .run();
        await loadSettingsFromDB();
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
        await loadSettingsFromDB();
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
        lockApp,
        hasPin,
        verifyPin,
        verifyRecoveryKey,
        savePin,
        removePin,
        getRecoveryKey,
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
