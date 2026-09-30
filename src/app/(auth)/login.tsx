import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-dark-bg justify-between p-6">
      {/* Branding Section */}
      <View className="flex-1 justify-center items-center">
        <View className="w-20 h-20 rounded-3xl bg-brand-accent items-center justify-center mb-6 shadow-xl">
          <Ionicons name="wallet" size={40} color="#0B0D12" />
        </View>

        <Text className="text-dark-text text-3xl font-extrabold tracking-tight mb-2">
          Hawk Finance
        </Text>
        <Text className="text-dark-muted text-sm text-center px-8">
          Personal wealth management. 100% offline-first with seamless Google Drive backup.
        </Text>
      </View>

      {/* Auth Action Section */}
      <View className="mb-6 space-y-3 gap-3">
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)")}
          className="bg-dark-surface border border-dark-border py-4 px-6 rounded-2xl flex-row items-center justify-center gap-3 shadow-sm"
          activeOpacity={0.8}
        >
          <Ionicons name="logo-google" size={20} color="#F8FAFC" />
          <Text className="text-dark-text font-bold text-base">
            Continue with Google
          </Text>
        </TouchableOpacity>

        <Text className="text-dark-muted text-[11px] text-center px-4">
          By signing in, your initial session is authorized. All transactions remain securely stored in your device&apos;s local SQLite database.
        </Text>
      </View>
    </SafeAreaView>
  );
}
