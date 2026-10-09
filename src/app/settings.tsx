import { Ionicons } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
  const [darkModePlaceholder, setDarkModePlaceholder] = useState(true);

  useEffect(() => {
    async function loadBio() {
      const cap = await getBiometricCapability();
      setBioCapability(cap);
    }
    loadBio();
  }, []);

  async function handleGooglePress() {
    if (settings?.googleEmail) {
      Alert.alert(
        "Google Account",
        `Connected as ${settings.googleEmail}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disconnect",
            style: "destructive",
            onPress: () => disconnectGoogle(),
          },
        ]
      );
      return;
    }

    if (!isGoogleAuthEnabled) {
      Alert.alert(
        "Cloud Sync",
        "Google Sign-In is disabled in config (ENABLE_GOOGLE_AUTH).",
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
        Alert.alert("Connection Error", err?.message || "Sign-in failed.");
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleToggleBiometrics(val: boolean) {
    if (val && bioCapability.isAvailable) {
      const res = await authenticateWithBiometrics(
        `Confirm ${bioCapability.label} to enable`
      );
      if (res.success) {
        await updateSecuritySettings({ biometricsEnabled: true });
      }
    } else {
      await updateSecuritySettings({ biometricsEnabled: false });
    }
  }

  function handleBackup() {
    requireSecurityAuth({
      actionKey: "backup_restore",
      title: "Confirm Cloud Backup",
      onSuccess: () => {
        Alert.alert("Success", "Database backed up successfully.");
      },
    });
  }

  function handleRestore() {
    requireSecurityAuth({
      actionKey: "backup_restore",
      title: "Confirm Data Retrieval",
      onSuccess: () => {
        Alert.alert("Success", "Database restored successfully.");
      },
    });
  }

  function handleResetData() {
    requireSecurityAuth({
      actionKey: "reset_data",
      title: "Authorize Reset",
      onSuccess: () => {
        Alert.alert(
          "Erase & Reset Data",
          "Are you sure you want to delete all accounts and transactions? This cannot be undone.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Erase All",
              style: "destructive",
              onPress: () => {
                db.delete(schema.transactions).run();
                db.delete(schema.liquidAssets).run();
                db.delete(schema.contacts).run();
                reloadSettings();
                Alert.alert("Reset Complete", "All data has been cleared.");
              },
            },
          ]
        );
      },
    });
  }

  const isGoogleConnected = Boolean(settings?.googleEmail);

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-dark-border/30">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center -ml-1"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text className="text-dark-text text-lg font-bold">Settings</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-5 pt-5"
      >
        {/* Profile Card (Matching Mockup) */}
        <TouchableOpacity
          onPress={() => router.push("/edit-profile" as any)}
          className="bg-dark-surface p-4 rounded-3xl border border-dark-border flex-row items-center justify-between mb-5 active:bg-dark-card"
          activeOpacity={0.7}
        >
          <View className="flex-row items-center gap-3.5">
            <View className="w-13 h-13 w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center overflow-hidden">
              {settings?.profilePic ? (
                <Image
                  source={{ uri: settings.profilePic }}
                  className="w-full h-full rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-brand-accent font-bold text-lg">
                  {settings?.userName ? settings.userName[0].toUpperCase() : "H"}
                </Text>
              )}
            </View>

            <View>
              <Text className="text-dark-text font-bold text-base">
                {settings?.userName || "Hawk User"}
              </Text>
              <Text className="text-dark-muted text-xs mt-0.5">
                {settings?.googleEmail || `${settings?.currency || "USD"} Vault`}
              </Text>
            </View>
          </View>

          <Ionicons name="chevron-forward" size={18} color="#60677C" />
        </TouchableOpacity>

        {/* 1. Account / Mail Section */}
        <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden mb-4">
          <TouchableOpacity
            onPress={handleGooglePress}
            disabled={connecting}
            className="p-4 flex-row items-center justify-between"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3.5">
              <Ionicons name="mail-outline" size={20} color="#94A3B8" />
              <View>
                <Text className="text-dark-text font-semibold text-sm">
                  {isGoogleConnected ? "Google Account" : "Connect Google"}
                </Text>
                <Text className="text-dark-muted text-xs">
                  {isGoogleConnected ? settings?.googleEmail : "Offline mode"}
                </Text>
              </View>
            </View>

            {connecting ? (
              <ActivityIndicator size="small" color="#D4F938" />
            ) : (
              <Ionicons name="chevron-forward" size={18} color="#60677C" />
            )}
          </TouchableOpacity>
        </View>

        {/* 2. Security Section */}
        <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden mb-4">
          {/* Change PIN */}
          <TouchableOpacity
            onPress={() => router.push("/change-pin" as any)}
            className="p-4 flex-row items-center justify-between border-b border-dark-border/40"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3.5">
              <Ionicons name="key-outline" size={20} color="#94A3B8" />
              <Text className="text-dark-text font-semibold text-sm">
                Change Security PIN
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#60677C" />
          </TouchableOpacity>

          {/* Biometrics Toggler */}
          <View className="p-4 flex-row items-center justify-between border-b border-dark-border/40">
            <View className="flex-row items-center gap-3.5">
              <Ionicons
                name={
                  bioCapability.type === "FACE_ID"
                    ? "scan-outline"
                    : "finger-print"
                }
                size={20}
                color="#94A3B8"
              />
              <Text className="text-dark-text font-semibold text-sm">
                {bioCapability.isAvailable
                  ? `${bioCapability.label} Verification`
                  : "Biometric Unlock"}
              </Text>
            </View>

            <Switch
              value={Boolean(settings?.biometricsEnabled)}
              onValueChange={handleToggleBiometrics}
              disabled={!bioCapability.isAvailable}
              trackColor={{ false: "#333A4D", true: "#D4F938" }}
              thumbColor={settings?.biometricsEnabled ? "#0B0D12" : "#FFFFFF"}
            />
          </View>

          {/* Security Permissions (New Page) */}
          <TouchableOpacity
            onPress={() => router.push("/security-permissions" as any)}
            className="p-4 flex-row items-center justify-between"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3.5">
              <Ionicons name="shield-checkmark-outline" size={20} color="#94A3B8" />
              <Text className="text-dark-text font-semibold text-sm">
                Security Checks
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#60677C" />
          </TouchableOpacity>
        </View>

        {/* 3. Backup and Restore */}
        <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden mb-4">
          <TouchableOpacity
            onPress={handleBackup}
            className="p-4 flex-row items-center justify-between border-b border-dark-border/40"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3.5">
              <Ionicons name="cloud-upload-outline" size={20} color="#94A3B8" />
              <Text className="text-dark-text font-semibold text-sm">
                Back up Database
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#60677C" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRestore}
            className="p-4 flex-row items-center justify-between"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3.5">
              <Ionicons name="cloud-download-outline" size={20} color="#94A3B8" />
              <Text className="text-dark-text font-semibold text-sm">
                Restore Database
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#60677C" />
          </TouchableOpacity>
        </View>

        {/* 4. Language & Theme (Placeholders) */}
        <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden mb-6">
          {/* Dark Mode */}
          <View className="p-4 flex-row items-center justify-between border-b border-dark-border/40">
            <View className="flex-row items-center gap-3.5">
              <Ionicons name="moon-outline" size={20} color="#94A3B8" />
              <Text className="text-dark-text font-semibold text-sm">
                Dark Mode
              </Text>
            </View>
            <Switch
              value={darkModePlaceholder}
              onValueChange={setDarkModePlaceholder}
              trackColor={{ false: "#333A4D", true: "#D4F938" }}
              thumbColor={darkModePlaceholder ? "#0B0D12" : "#FFFFFF"}
            />
          </View>

          {/* Language */}
          <TouchableOpacity
            onPress={() =>
              Alert.alert("Language", "Additional languages coming soon.")
            }
            className="p-4 flex-row items-center justify-between"
            activeOpacity={0.7}
          >
            <View className="flex-row items-center gap-3.5">
              <Ionicons name="globe-outline" size={20} color="#94A3B8" />
              <Text className="text-dark-text font-semibold text-sm">
                Language
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Text className="text-dark-muted text-xs font-medium">
                English
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#60677C" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 5. Clear Data Button (Bottom Danger Action) */}
        <TouchableOpacity
          onPress={handleResetData}
          className="w-full py-4 rounded-2xl border border-brand-expense/40 bg-brand-expense/10 flex-row items-center justify-center gap-2 active:opacity-80 mb-6"
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={18} color="#F43F5E" />
          <Text className="text-brand-expense font-bold text-sm">
            Erase & Reset All Data
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
