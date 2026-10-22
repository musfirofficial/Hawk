import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import { useSafeRouter } from "../../hooks/useSafeRouter";

export default function GoogleAccountScreen() {
  const router = useSafeRouter();
  const { settings, disconnectGoogle } = useAuth();
  const [disconnecting, setDisconnecting] = useState(false);

  const connectedEmail = settings?.googleEmail || "Not connected";

  async function handleDisconnect() {
    try {
      setDisconnecting(true);
      await disconnectGoogle();
      router.back();
    } catch (err) {
      console.error("Failed to disconnect Google account:", err);
      setDisconnecting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={["top", "bottom"]}>
      <View className="flex-1 px-6 justify-between">
        {/* Top Header & Connected Email */}
        <View>
          <View className="flex-row items-center justify-between pt-2 pb-6">
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
            </TouchableOpacity>
            <View className="w-10" />
          </View>

          {/* Minimal Title */}
          <Text className="text-dark-text text-3xl font-extrabold tracking-tight mb-6">
            Google Account
          </Text>

          {/* Connected Mail Card */}
          <View className="w-full py-4 px-5 rounded-2xl bg-dark-surface border border-dark-border">
            <Text className="text-dark-text text-base font-semibold">
              {connectedEmail}
            </Text>
          </View>
        </View>

        {/* Bottom Disconnect Button */}
        <View className="pb-6">
          <TouchableOpacity
            onPress={handleDisconnect}
            disabled={disconnecting}
            className="w-full py-4 rounded-full bg-dark-card border border-brand-expense/40 items-center justify-center active:opacity-80"
            activeOpacity={0.8}
          >
            {disconnecting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Text className="text-brand-expense font-bold text-base">
                Disconnect
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
