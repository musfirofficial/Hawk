import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * Hawk Feature Flags & Configuration
 *
 * - In Expo Go (StoreClient), native Google Sign-in is not bundled.
 * - In testing/production builds (APK) and development builds, Google Sign-In is automatically enabled.
 */
export const ENABLE_GOOGLE_AUTH =
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

