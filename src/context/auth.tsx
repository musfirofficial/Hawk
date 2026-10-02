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

export { GoogleUserInfo };

interface AuthContextType {
  settings: AppSettings | null;
  isLoading: boolean;
  hasOnboarded: boolean;
  isGoogleAuthEnabled: boolean;
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

  return (
    <AuthContext.Provider
      value={{
        settings,
        isLoading,
        hasOnboarded,
        isGoogleAuthEnabled: ENABLE_GOOGLE_AUTH,
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
