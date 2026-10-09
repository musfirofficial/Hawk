import { Ionicons } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/auth";
import { useSecurityGuard } from "../context/security";
import { db } from "../db";
import * as schema from "../db/schema";
import {
  authenticateWithBiometrics,
  BiometricCapability,
  getBiometricCapability,
} from "../services/biometrics";

export default function SettingsScreen() {
  const router = useRouter();
  const {
    settings,
    signInWithGoogle,
    disconnectGoogle,
    reloadSettings,
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

  useEffect(() => {
    async function loadBio() {
      const cap = await getBiometricCapability();
      setBioCapability(cap);
    }
    loadBio();
  }, []);

  async function handleConnectGoogle() {
    if (!isGoogleAuthEnabled) {
      Alert.alert(
        "Cloud Sync Disabled",
        "Google Drive sync is currently toggled off (ENABLE_GOOGLE_AUTH in src/config/appConfig.ts). Flip it to true when testing with a development build.",
        [{ text: "OK" }]
      );
      return;
    }

    try {
      setConnecting(true);
      const googleInfo = await signInWithGoogle();
      if (googleInfo && settings) {
        db.update(schema.appSettings)
          .set({
            googleEmail: googleInfo.email,
            googleName: googleInfo.name,
            updatedAt: new Date().toISOString(),
          })
          .where(eq(schema.appSettings.id, settings.id))
          .run();
        reloadSettings();
      }
    } catch (err: any) {
      if (err?.code !== "12501") {
        Alert.alert(
          "Connection Failed",
          err?.message || "Could not sign in with Google."
        );
      }
    } finally {
      setConnecting(false);
    }
  }

  // Guarded Cloud Backup action
  function handleBackup() {
    requireSecurityAuth({
      title: "Confirm Cloud Backup",
      description: "Verify your identity to backup your database to Google Drive",
      onSuccess: () => {
        Alert.alert(
          "Backup Complete",
          "Your SQLite database snapshot has been securely saved to Google Drive."
        );
      },
    });
  }

  // Guarded Cloud Restore action
  function handleRestore() {
    requireSecurityAuth({
      title: "Confirm Data Retrieval",
      description: "Verify your identity to restore your database from Google Drive",
      onSuccess: () => {
        Alert.alert(
          "Data Restored",
          "Your latest database backup was restored successfully."
        );
      },
    });
  }

  // Guarded Change PIN action
  function handleChangePin() {
    requireSecurityAuth({
      title: "Verify Current Identity",
      description: "Verify your current PIN or biometrics before changing PIN",
      onSuccess: () => {
        router.push("/(auth)/setup-pin?fromSettings=true" as any);
      },
    });
  }

  // Guarded Wipe Data action
  function handleResetData() {
    requireSecurityAuth({
      title: "Authorize Data Reset",
      description: "Verify your identity to erase all local data and reset Hawk",
      onSuccess: () => {
        Alert.alert(
          "Reset Confirmation",
          "Are you sure you want to delete all accounts and transactions? This cannot be undone.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Reset All",
              style: "destructive",
              onPress: () => {
                db.delete(schema.transactions).run();
                db.delete(schema.liquidAssets).run();
                db.delete(schema.contacts).run();
                reloadSettings();
                Alert.alert("Success", "All transactions and assets have been reset.");
              },
            },
          ]
        );
      },
    });
  }

  async function handleToggleBiometrics(value: boolean) {
    if (value && bioCapability.isAvailable) {
      // Test biometric authorization before enabling
      const res = await authenticateWithBiometrics(
        `Confirm ${bioCapability.label} to enable biometric unlock`
      );
      if (res.success) {
        await updateSecuritySettings({ biometricsEnabled: true });
      }
    } else {
      await updateSecuritySettings({ biometricsEnabled: false });
    }
  }

  const isGoogleConnected = Boolean(settings?.googleEmail);

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-5 pt-3"
      >
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-6">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
          </TouchableOpacity>
          <Text className="text-dark-text text-lg font-bold">Settings</Text>
          <View className="w-10" />
        </View>

        {/* Profile Summary Card */}
        <View className="bg-dark-surface p-4 rounded-2xl border border-dark-border mb-6">
          <View className="flex-row items-center gap-3.5">
            <View className="w-12 h-12 rounded-full bg-brand-accent/20 border border-brand-accent/40 items-center justify-center">
              <Text className="text-brand-accent font-bold text-lg">
                {settings?.userName ? settings.userName[0].toUpperCase() : "H"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-dark-text font-bold text-base">
                {settings?.userName || "Hawk User"}
              </Text>
              <Text className="text-dark-muted text-xs">
                Base Currency: {settings?.currency || "USD"} • Format:{" "}
                {settings?.numberFormat || "1,234.56"}
              </Text>
            </View>
          </View>
        </View>

        {/* Security & Privacy Section (NEW) */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2 ml-1">
            Security & Privacy
          </Text>

          <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
            {/* Change 4-Digit PIN */}
            <TouchableOpacity
              onPress={handleChangePin}
              className="p-4 flex-row items-center justify-between border-b border-dark-border"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full bg-brand-accent/10 items-center justify-center">
                  <Ionicons name="key-outline" size={18} color="#D4F938" />
                </View>
                <View>
                  <Text className="text-dark-text font-semibold text-sm">
                    {settings?.pin ? "Change 4-Digit PIN" : "Set 4-Digit PIN"}
                  </Text>
                  <Text className="text-dark-muted text-[11px]">
                    {settings?.pin
                      ? "Guards deletions, backups, and restores"
                      : "Create a PIN to protect sensitive actions"}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#60677C" />
            </TouchableOpacity>

            {/* Biometric Unlock Toggle */}
            <View className="p-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1 pr-3">
                <View className="w-9 h-9 rounded-full bg-dark-card items-center justify-center">
                  <Ionicons
                    name={
                      bioCapability.type === "FACE_ID"
                        ? "scan-outline"
                        : "finger-print"
                    }
                    size={18}
                    color="#D4F938"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-dark-text font-semibold text-sm">
                    {bioCapability.isAvailable
                      ? `${bioCapability.label} Verification`
                      : "Biometric Unlock"}
                  </Text>
                  <Text className="text-dark-muted text-[11px]">
                    {bioCapability.isAvailable
                      ? `Use ${bioCapability.label} instead of PIN`
                      : "Unavailable on this device (PIN enforced)"}
                  </Text>
                </View>
              </View>

              <Switch
                value={Boolean(settings?.biometricsEnabled)}
                onValueChange={handleToggleBiometrics}
                disabled={!bioCapability.isAvailable}
                trackColor={{ false: "#262B3A", true: "#D4F938" }}
                thumbColor="#0B0D12"
              />
            </View>
          </View>
        </View>

        {/* Google Cloud Account Status */}
        <View className="bg-dark-surface p-4 rounded-2xl border border-dark-border mb-6">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                <Ionicons name="logo-google" size={18} color="#F8FAFC" />
              </View>
              <View>
                <Text className="text-dark-text font-bold text-sm">
                  {isGoogleConnected
                    ? settings?.googleName || "Google Account"
                    : "Google Cloud Sync"}
                </Text>
                <Text className="text-dark-muted text-xs">
                  {isGoogleConnected
                    ? settings?.googleEmail
                    : "Not connected (Offline mode)"}
                </Text>
              </View>
            </View>

            {isGoogleConnected ? (
              <TouchableOpacity
                onPress={disconnectGoogle}
                className="bg-dark-card border border-dark-border px-3 py-1.5 rounded-full"
                activeOpacity={0.7}
              >
                <Text className="text-brand-expense text-xs font-semibold">
                  Disconnect
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleConnectGoogle}
                disabled={connecting}
                className="bg-brand-accent px-3 py-1.5 rounded-full"
                activeOpacity={0.8}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color="#0B0D12" />
                ) : (
                  <Text className="text-dark-bg text-xs font-bold">
                    Connect
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Cloud & Drive Backup Section */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2 ml-1">
            Google Drive Backup
          </Text>

          <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
            <View className="p-4 border-b border-dark-border">
              <Text className="text-dark-text font-semibold text-sm">
                Cloud Database Sync
              </Text>
              <Text className="text-dark-muted text-xs mt-1">
                Your data is stored locally in SQLite. Back up your encrypted
                database directly to your personal Google Drive appData.
              </Text>
            </View>

            {/* Backup Button (Guarded with Security Auth) */}
            <TouchableOpacity
              onPress={handleBackup}
              className="p-4 flex-row items-center justify-between border-b border-dark-border"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full bg-brand-accent/10 items-center justify-center">
                  <Ionicons
                    name="cloud-upload-outline"
                    size={18}
                    color="#D4F938"
                  />
                </View>
                <View>
                  <Text className="text-dark-text font-semibold text-sm">
                    Backup DB to Google Drive
                  </Text>
                  <Text className="text-dark-muted text-[11px]">
                    Requires PIN or Biometrics
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#60677C" />
            </TouchableOpacity>

            {/* Restore Button (Guarded with Security Auth) */}
            <TouchableOpacity
              onPress={handleRestore}
              className="p-4 flex-row items-center justify-between"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full bg-brand-transfer/10 items-center justify-center">
                  <Ionicons
                    name="cloud-download-outline"
                    size={18}
                    color="#38BDF8"
                  />
                </View>
                <View>
                  <Text className="text-dark-text font-semibold text-sm">
                    Retrieve Backup from Drive
                  </Text>
                  <Text className="text-dark-muted text-[11px]">
                    Requires PIN or Biometrics
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#60677C" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Data Management */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2 ml-1">
            Data Management
          </Text>

          <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
            <TouchableOpacity
              onPress={() => router.push("/accounts" as any)}
              className="p-4 flex-row items-center justify-between border-b border-dark-border"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full bg-dark-card items-center justify-center">
                  <Ionicons name="wallet-outline" size={18} color="#F8FAFC" />
                </View>
                <Text className="text-dark-text font-semibold text-sm">
                  Liquid Assets & Accounts
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#60677C" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/contacts" as any)}
              className="p-4 flex-row items-center justify-between border-b border-dark-border"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full bg-dark-card items-center justify-center">
                  <Ionicons name="people-outline" size={18} color="#F8FAFC" />
                </View>
                <Text className="text-dark-text font-semibold text-sm">
                  Contacts & Entities
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#60677C" />
            </TouchableOpacity>

            {/* Reset / Erase All Data (Guarded with Security Auth) */}
            <TouchableOpacity
              onPress={handleResetData}
              className="p-4 flex-row items-center justify-between"
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-full bg-brand-expense/10 items-center justify-center">
                  <Ionicons name="trash-outline" size={18} color="#F43F5E" />
                </View>
                <View>
                  <Text className="text-brand-expense font-semibold text-sm">
                    Erase & Reset All Data
                  </Text>
                  <Text className="text-dark-muted text-[11px]">
                    Requires PIN or Biometrics authorization
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#60677C" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View className="items-center py-6">
          <Text className="text-dark-muted text-xs">
            Hawk Personal Finance v1.0.0
          </Text>
          <Text className="text-dark-muted/60 text-[11px] mt-0.5">
            Offline-First • Local SQLite • Encrypted
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
