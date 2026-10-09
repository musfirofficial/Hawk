import * as LocalAuthentication from "expo-local-authentication";
import { Platform } from "react-native";

export type BiometricAuthType = "FINGERPRINT" | "FACE_ID" | "TOUCH_ID" | null;

export interface BiometricCapability {
  isAvailable: boolean;
  type: BiometricAuthType;
  label: string;
}

/**
 * Evaluates hardware and enrollment support according to Hawk security policies:
 * - On iOS: Face ID (TrueDepth 3D) and Touch ID are both secure and permitted.
 * - On Android: Strictly requires hardware Fingerprint. If an Android device only
 *   has 2D camera-based Face Unlock, it is rejected as insecure and PIN is enforced.
 */
export async function getBiometricCapability(): Promise<BiometricCapability> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      return { isAvailable: false, type: null, label: "None" };
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      return { isAvailable: false, type: null, label: "Not Enrolled" };
    }

    const supportedTypes =
      await LocalAuthentication.supportedAuthenticationTypesAsync();

    if (Platform.OS === "android") {
      // Hawk Policy: On Android, only hardware Fingerprint is allowed.
      // 2D Face unlock is intentionally not permitted.
      const hasFingerprint = supportedTypes.includes(
        LocalAuthentication.AuthenticationType.FINGERPRINT
      );

      if (hasFingerprint) {
        return {
          isAvailable: true,
          type: "FINGERPRINT",
          label: "Fingerprint",
        };
      }

      // If only facial recognition or iris on Android without fingerprint, reject
      return {
        isAvailable: false,
        type: null,
        label: "Unavailable (PIN required)",
      };
    }

    // iOS Devices
    if (Platform.OS === "ios") {
      if (
        supportedTypes.includes(
          LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION
        )
      ) {
        return {
          isAvailable: true,
          type: "FACE_ID",
          label: "Face ID",
        };
      }

      if (
        supportedTypes.includes(
          LocalAuthentication.AuthenticationType.FINGERPRINT
        )
      ) {
        return {
          isAvailable: true,
          type: "TOUCH_ID",
          label: "Touch ID",
        };
      }
    }

    return { isAvailable: false, type: null, label: "None" };
  } catch (error) {
    console.warn("Error checking biometric capability:", error);
    return { isAvailable: false, type: null, label: "Error" };
  }
}

/**
 * Triggers native Face ID or Fingerprint prompt.
 */
export async function authenticateWithBiometrics(
  reason: string = "Verify your identity to proceed"
): Promise<{ success: boolean; error?: string }> {
  try {
    const capability = await getBiometricCapability();
    if (!capability.isAvailable || !capability.type) {
      return { success: false, error: "Biometrics unavailable on this device." };
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      cancelLabel: "Use PIN",
      fallbackLabel: "Use PIN",
      disableDeviceFallback: true, // We handle PIN fallback in our own UI!
    });

    if (result.success) {
      return { success: true };
    }

    if (result.error === "user_cancel" || result.error === "system_cancel") {
      return { success: false, error: "Cancelled" };
    }

    return {
      success: false,
      error: result.error || "Biometric authentication failed.",
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Biometric authentication encountered an error.",
    };
  }
}
