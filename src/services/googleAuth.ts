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
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { GoogleSignin } = require("@react-native-google-signin/google-signin");
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
