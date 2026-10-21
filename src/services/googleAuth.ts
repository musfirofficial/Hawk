import * as SecureStore from "expo-secure-store";

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string | null;
  photo: string | null;
}

// Lazy reference to avoid TurboModuleRegistry errors in Expo Go
function getGoogleSigninModule() {
  try {
    // Dynamic import to avoid TurboModuleRegistry errors when module isn't available
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GoogleSignin } = require("@react-native-google-signin/google-signin") as typeof import("@react-native-google-signin/google-signin");
    return GoogleSignin;
  } catch (error) {
    console.warn("Native GoogleSignin module not available in this environment:", error);
    return null;
  }
}

/**
 * Configure Google Sign-In with Web Client ID and Google Drive AppData scopes.
 */
export function configureGoogleSignIn(): void {
  const GoogleSignin = getGoogleSigninModule();
  if (!GoogleSignin) return;

  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) {
    console.warn("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not configured in .env");
    return;
  }

  GoogleSignin.configure({
    webClientId,
    scopes: ["https://www.googleapis.com/auth/drive.appdata"],
    offlineAccess: true,
  });
}

/**
 * Perform Google Sign-In and securely store the ID token.
 */
export async function performGoogleSignIn(): Promise<GoogleUserInfo | null> {
  const GoogleSignin = getGoogleSigninModule();
  if (!GoogleSignin) {
    throw new Error(
      "Google Sign-In is only supported in a development build (npx expo run:android). Please use offline mode in Expo Go.",
    );
  }

  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();

  // Support both new v13+ response shape (response.data) and legacy (response.user)
  const userObj = (response as any).data?.user || (response as any).user;
  const tokens = (response as any).data || response;

  if (!userObj) {
    throw new Error("No user data returned from Google");
  }

  const googleInfo: GoogleUserInfo = {
    id: userObj.id,
    email: userObj.email,
    name: userObj.name || userObj.givenName || null,
    photo: userObj.photo || null,
  };

  // Securely store ID token for Google Drive backups
  if (tokens.idToken) {
    await SecureStore.setItemAsync("google_id_token", tokens.idToken);
  }

  return googleInfo;
}

/**
 * Perform Google Sign-Out and remove tokens.
 */
export async function performGoogleSignOut(): Promise<void> {
  const GoogleSignin = getGoogleSigninModule();
  if (GoogleSignin) {
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      console.warn("Error signing out Google:", e);
    }
  }
  await SecureStore.deleteItemAsync("google_id_token");
}

/**
 * Returns true when a GoogleSignIn error indicates the user must sign in interactively.
 * Handles both numeric codes (Android) and string codes (iOS / newer SDK versions).
 */
function isSessionExpiredError(err: unknown): boolean {
  const code = String((err as any)?.code ?? "");
  const msg = String((err as any)?.message ?? "").toLowerCase();
  return (
    // Common Google Sign-In error codes for missing / expired sessions
    code === "SIGN_IN_REQUIRED" ||
    code === "NO_SAVED_CREDENTIAL_FOUND" ||
    code === "4" || // SIGN_IN_REQUIRED on Android
    code === "12501" || // User cancelled — treat as session gone
    msg.includes("sign_in_required") ||
    msg.includes("no saved credential")
  );
}

/**
 * Retrieve Google OAuth access token for Google Drive API requests.
 * If forceRefresh is true, clears cached token and silently refreshes via Google Play Services.
 * Throws a descriptive Error (instead of returning null) when the session is definitively gone
 * so callers can surface a "Please reconnect your Google account" message.
 */
export async function getGoogleAccessToken(
  forceRefresh = false,
): Promise<string | null> {
  const GoogleSignin = getGoogleSigninModule();
  if (!GoogleSignin) return null;
  try {
    if (forceRefresh) {
      try {
        const currentTokens = await GoogleSignin.getTokens();
        if (currentTokens?.accessToken) {
          await GoogleSignin.clearCachedAccessToken(currentTokens.accessToken);
        }
      } catch (clearErr) {
        console.warn("Error clearing cached Google access token:", clearErr);
      }
      try {
        await GoogleSignin.signInSilently();
      } catch (silentErr) {
        if (isSessionExpiredError(silentErr)) {
          console.warn("Google session expired during token refresh. User must reconnect.");
          // Return null — callers already show a "reconnect" message on null
          return null;
        }
        console.warn("Silent sign-in failed during token refresh:", silentErr);
      }
    }

    let tokens = await GoogleSignin.getTokens();
    if (!tokens?.accessToken) {
      try {
        await GoogleSignin.signInSilently();
        tokens = await GoogleSignin.getTokens();
      } catch (silentErr) {
        if (isSessionExpiredError(silentErr)) {
          console.warn("Google session is gone. User needs to reconnect their account.");
          return null;
        }
        console.warn("Silent sign-in fallback failed:", silentErr);
      }
    }
    return tokens?.accessToken || null;
  } catch (e) {
    console.warn("Error fetching Google access token:", e);
    return null;
  }
}

