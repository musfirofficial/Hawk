import { eq } from "drizzle-orm";
import * as SecureStore from "expo-secure-store";
import React, { createContext, useContext, useEffect, useState } from "react";
import { db, ensureDatabaseInitialized } from "../db";
import * as schema from "../db/schema";
import { AppSettings, NumberFormatId } from "../db/schema";

// Note: Native Google Sign-In is deferred until the final development/cloud build.
// This allows 100% offline development and smooth testing in Expo Go.

interface GoogleUserInfo {
  email: string;
  name: string | null;
  photo: string | null;
  id: string;
}

interface AuthContextType {
  settings: AppSettings | null;
  isLoading: boolean;
  hasOnboarded: boolean;
  pendingGoogleUser: GoogleUserInfo | null;
  setPendingGoogleUser: (user: GoogleUserInfo | null) => void;
  signInWithGoogle: () => Promise<GoogleUserInfo | null>;
  completeOnboarding: (params: {
    userName: string;
    currency: string;
    numberFormat: NumberFormatId;
    profilePic?: string | null;
  }) => Promise<void>;
  disconnectGoogle: () => Promise<void>;
  reloadSettings: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingGoogleUser, setPendingGoogleUser] =
    useState<GoogleUserInfo | null>(null);

  // Initialize DB and load local app settings on mount
  // Initialize DB and load local app settings on mount
  useEffect(() => {
    async function init() {
      try {
        ensureDatabaseInitialized();
        loadSettingsFromDB();
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

  // Google Sign-in: Deferred until Phase 4 (Cloud Sync build)
  async function signInWithGoogle(): Promise<GoogleUserInfo | null> {
    throw new Error(
      "Google Sign-In is deferred until Cloud Sync Phase. Please tap 'Set up Later' to continue offline.",
    );
  }

  // Complete Onboarding: Save profile and mark hasOnboarded = true
  async function completeOnboarding(params: {
    userName: string;
    currency: string;
    numberFormat: NumberFormatId;
    profilePic?: string | null;
  }) {
    try {
      ensureDatabaseInitialized();
      const existing = db.select().from(schema.appSettings).limit(1).all();

      const googleEmail = pendingGoogleUser?.email || null;
      const googleName = pendingGoogleUser?.name || null;

      if (existing.length > 0) {
        db.update(schema.appSettings)
          .set({
            userName: params.userName,
            currency: params.currency,
            numberFormat: params.numberFormat,
            profilePic: params.profilePic || null,
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

  // Disconnect Google Account
  async function disconnectGoogle() {
    try {
      await SecureStore.deleteItemAsync("google_id_token");

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

  return (
    <AuthContext.Provider
      value={{
        settings,
        isLoading,
        hasOnboarded,
        pendingGoogleUser,
        setPendingGoogleUser,
        signInWithGoogle,
        completeOnboarding,
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
