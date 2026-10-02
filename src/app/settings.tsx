import { Ionicons } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/auth";
import { db } from "../db";
import * as schema from "../db/schema";

export default function SettingsScreen() {
  const router = useRouter();
  const { settings, signInWithGoogle, disconnectGoogle, reloadSettings } =
    useAuth();
  const [connecting, setConnecting] = useState(false);

  async function handleConnectGoogle() {
    Alert.alert(
      "Cloud Sync (Phase 4)",
      "Google Drive backup will be enabled after the full offline app is completed. All data is currently stored locally in SQLite.",
      [{ text: "Got it" }]
    );
  }

  const isGoogleConnected = Boolean(settings?.googleEmail);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-dark-border">
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

      <ScrollView
        className="flex-1 px-5 pt-4"
        showsVerticalScrollIndicator={false}
      >
        {/* Account Profile Card */}
        <View className="bg-dark-surface p-4 rounded-2xl border border-dark-border mb-6 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3 flex-1">
            <View className="w-12 h-12 rounded-full bg-brand-accent items-center justify-center">
              <Text className="text-dark-bg font-extrabold text-lg">
                {settings?.userName ? settings.userName[0].toUpperCase() : "H"}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-dark-text font-bold text-base">
                {settings?.userName || "User"}
              </Text>
              <Text className="text-dark-muted text-xs">
                Currency: {settings?.currency || "Not set"} • Format:{" "}
                {settings?.numberFormat || "COMMA_DOT"}
              </Text>
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

            {/* Backup Button */}
            <TouchableOpacity
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
                    Last backup: Today at 10:45 AM
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#60677C" />
            </TouchableOpacity>

            {/* Restore Button */}
            <TouchableOpacity
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
                    Restore latest SQLite database snapshot
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
              onPress={() => router.push("/accounts")}
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
              onPress={() => router.push("/contacts")}
              className="p-4 flex-row items-center justify-between"
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
          </View>
        </View>

        {/* App Info */}
        <View className="items-center py-6">
          <Text className="text-dark-muted text-xs">
            Hawk Personal Finance v1.0.0
          </Text>
          <Text className="text-dark-muted/60 text-[11px] mt-0.5">
            Offline-First • Local SQLite
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
