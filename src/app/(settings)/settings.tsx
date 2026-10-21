import { Ionicons } from "@expo/vector-icons";
import { useSafeRouter } from "../../hooks/useSafeRouter";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HawkToggle } from "../../components/HawkToggle";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { useSecurityGuard } from "../../context/security";
import {
  authenticateWithBiometrics,
  BiometricCapability,
  getBiometricCapability,
} from "../../services/biometrics";

export default function SettingsScreen() {
  const router = useSafeRouter();
  const { showAlert, showConfirm } = useAlert();
  const {
    settings,
    hasPin,
    connectGoogle,
    signInWithGoogle,
    updateSecuritySettings,
    isGoogleAuthEnabled,
  } = useAuth();
  const { requireSecurityAuth } = useSecurityGuard();

  const [connecting, setConnecting] = useState(false);
  const [bioCapability, setBioCapability] = useState<BiometricCapability>({
    isAvailable: false,
    type: null,
    label: "Biometrics",
  });

  const isPinEnabled = Boolean(settings?.pinEnabled);
  const isGoogleConnected = Boolean(settings?.googleEmail);

  useEffect(() => {
    async function loadBio() {
      const cap = await getBiometricCapability();
      setBioCapability(cap);
    }
    loadBio();
  }, []);

  // Google Account action
  async function handleGooglePress() {
    if (isGoogleConnected) {
      router.push("/google-account" as any);
      return;
    }

    if (!isGoogleAuthEnabled) {
      showAlert({
        title: "Google Account",
        message: "Google Sign-In requires an APK or development build.",
        type: "info",
      });
      return;
    }

    try {
      setConnecting(true);
      await connectGoogle();
    } catch (err: any) {
      if (err?.code !== "12501") {
        showAlert({
          title: "Connection Error",
          message: err?.message || "Sign-in failed.",
          type: "danger",
        });
      }
    } finally {
      setConnecting(false);
    }
  }

  // Dynamic PIN Setup or Change
  function handlePinAction() {
    router.push("/change-pin" as any);
  }

  // PIN Verification Toggle
  function handleTogglePin(val: boolean) {
    if (val) {
      if (!hasPin) {
        // If user hasn't created a PIN yet, prompt creation
        router.push("/change-pin" as any);
      } else {
        updateSecuritySettings({ pinEnabled: true });
      }
    } else {
      // Disabling PIN requires PIN or biometric verification first
      requireSecurityAuth({
        title: "Disable PIN",
        description: "Verify your identity to disable PIN verification",
        onSuccess: async () => {
          await updateSecuritySettings({
            pinEnabled: false,
            biometricsEnabled: false,
            appLockEnabled: false,
          });
        },
      });
    }
  }

  // Biometrics Toggle
  async function handleToggleBiometrics(val: boolean) {
    if (val) {
      if (!isPinEnabled) {
        showAlert({
          title: "PIN Required",
          message: "Enable PIN verification before activating biometrics.",
          type: "info",
        });
        return;
      }

      if (bioCapability.isAvailable) {
        const res = await authenticateWithBiometrics(
          `Confirm ${bioCapability.label} to enable`,
        );
        if (res.success) {
          await updateSecuritySettings({ biometricsEnabled: true });
        }
      }
    } else {
      await updateSecuritySettings({ biometricsEnabled: false });
    }
  }

  // App Startup Lock Toggle
  function handleToggleAppLock(val: boolean) {
    if (val) {
      // Enabling won't ask PIN
      if (!isPinEnabled) {
        showAlert({
          title: "PIN Required",
          message:
            "Enable PIN verification before activating App Startup Lock.",
          type: "info",
        });
        return;
      }
      updateSecuritySettings({ appLockEnabled: true });
    } else {
      // Disabling requires PIN or biometric verification
      requireSecurityAuth({
        title: "Disable App Startup Lock",
        description: "Verify your identity to disable startup lock",
        onSuccess: async () => {
          await updateSecuritySettings({ appLockEnabled: false });
        },
      });
    }
  }

  const biometricTitle = bioCapability.isAvailable
    ? bioCapability.type === "FACE_ID"
      ? "Face ID Verification"
      : "Fingerprint Verification"
    : "Biometric Verification";

  const biometricIconName =
    bioCapability.type === "FACE_ID" ? "scan-outline" : "finger-print";

  async function handleBackupRestorePress() {
    if (!settings?.googleEmail) {
      showConfirm({
        title: "Connect Google",
        message:
          "Connect your Google account to back up and restore your data.",
        confirmText: "Connect",
        cancelText: "Cancel",
        onConfirm: async () => {
          try {
            const user = await signInWithGoogle();
            if (user) {
              router.push("/backup-restore" as any);
            }
          } catch (e: any) {
            console.warn("Google sign-in failed:", e);
          }
        },
      });
    } else {
      router.push("/backup-restore" as any);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={["top", "bottom"]}>
      <ScreenHeader title="Settings" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-5 pt-5"
      >
        {/* Security Section */}
        <Text className="text-dark-muted text-xs font-semibold  tracking-wider mb-2 px-1">
          Security
        </Text>
        <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden mb-6">
          {/* 1. Dynamic PIN Setup / Change */}
          <TouchableOpacity
            onPress={handlePinAction}
            className="p-4 flex-row items-center justify-between border-b border-dark-border/40"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3.5">
              <Ionicons name="key-outline" size={20} color="#94A3B8" />
              <View>
                <Text className="text-dark-text font-semibold text-sm">
                  {hasPin ? "Change Security PIN" : "Create Security PIN"}
                </Text>
                <Text className="text-dark-muted text-xs mt-0.5">
                  {hasPin ? "Update your 4-digit code" : "Set up a 4-digit PIN"}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#60677C" />
          </TouchableOpacity>

          {/* 2. PIN Verification Toggle */}
          <View className="p-4 flex-row items-center justify-between border-b border-dark-border/40">
            <View className="flex-row items-center gap-3.5 flex-1 pr-3">
              <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
              <View className="flex-1">
                <Text className="text-dark-text font-semibold text-sm">
                  PIN Verification
                </Text>
                <Text className="text-dark-muted text-xs mt-0.5">
                  Protect app actions with PIN
                </Text>
              </View>
            </View>
            <HawkToggle value={isPinEnabled} onValueChange={handleTogglePin} />
          </View>

          {/* 3. Fingerprint / Face ID Dynamic Toggle */}
          <View className="p-4 flex-row items-center justify-between border-b border-dark-border/40">
            <View className="flex-row items-center gap-3.5 flex-1 pr-3">
              <Ionicons name={biometricIconName} size={20} color="#94A3B8" />
              <View className="flex-1">
                <Text className="text-dark-text font-semibold text-sm">
                  {biometricTitle}
                </Text>
                <Text className="text-dark-muted text-xs mt-0.5">
                  {!bioCapability.isAvailable
                    ? "Unavailable on this device"
                    : !isPinEnabled
                      ? "Requires PIN enabled"
                      : "Quick biometric unlock"}
                </Text>
              </View>
            </View>
            <HawkToggle
              value={Boolean(settings?.biometricsEnabled && isPinEnabled)}
              onValueChange={handleToggleBiometrics}
              disabled={!bioCapability.isAvailable || !isPinEnabled}
            />
          </View>

          {/* 4. App Startup Lock Toggle */}
          <View className="p-4 flex-row items-center justify-between">
            <View className="flex-row items-center gap-3.5 flex-1 pr-3">
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#94A3B8"
              />
              <View className="flex-1">
                <Text className="text-dark-text font-semibold text-sm">
                  App Startup Lock
                </Text>
                <Text className="text-dark-muted text-xs mt-0.5">
                  {!isPinEnabled
                    ? "Requires PIN enabled"
                    : "Require authentication upon launch"}
                </Text>
              </View>
            </View>
            <HawkToggle
              value={Boolean(settings?.appLockEnabled && isPinEnabled)}
              onValueChange={handleToggleAppLock}
              disabled={!isPinEnabled}
            />
          </View>
        </View>

        {/* Backup and Restore Section */}
        <Text className="text-dark-muted text-xs font-semibold  tracking-wider mb-2 px-1">
          Backup & Restore
        </Text>
        <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden mb-6">
          {/* 1. Connect Google */}
          <TouchableOpacity
            onPress={handleGooglePress}
            disabled={connecting}
            className="p-4 flex-row items-center justify-between border-b border-dark-border/40"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3.5 flex-1 pr-3">
              <Ionicons name="mail-outline" size={20} color="#94A3B8" />
              <View className="flex-1">
                <Text className="text-dark-text font-semibold text-sm">
                  {isGoogleConnected ? "Google Account" : "Connect Google"}
                </Text>
                <Text className="text-dark-muted text-xs mt-0.5">
                  {isGoogleConnected
                    ? settings?.googleEmail
                    : "Connect account for cloud sync"}
                </Text>
              </View>
            </View>

            {connecting ? (
              <ActivityIndicator size="small" color="#D4F938" />
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#60677C" />
            )}
          </TouchableOpacity>

          {/* 2. Backup & Restore (Opens New Page) */}
          <TouchableOpacity
            onPress={handleBackupRestorePress}
            className="p-4 flex-row items-center justify-between"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3.5 flex-1 pr-3">
              <Ionicons name="cloud-upload-outline" size={20} color="#94A3B8" />
              <View className="flex-1">
                <Text className="text-dark-text font-semibold text-sm">
                  Backup & Restore
                </Text>
                <Text className="text-dark-muted text-xs mt-0.5">
                  Cloud backup and recovery options
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#60677C" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
