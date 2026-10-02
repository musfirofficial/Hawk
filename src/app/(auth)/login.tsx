import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();

  function handleGetStarted() {
    router.push("/(auth)/onboarding");
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg justify-between p-6">
      {/* Top / Center Branding Section */}
      <View className="flex-1 justify-center items-center">
        {/* Hawk Logo */}
        <View className="w-28 h-28 rounded-3xl bg-brand-accent/10 border border-brand-accent/30 items-center justify-center mb-6 shadow-2xl">
          <Image
            source={require("../../../assets/logo/logo-removebg-preview.png")}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>

        <Text className="text-dark-text text-3xl font-extrabold tracking-tight mb-2 text-center">
          Hawk Finance
        </Text>
        <Text className="text-dark-muted text-sm text-center px-6 leading-5">
          Minimalist, offline-first personal wealth management. Your data stays
          securely on your device.
        </Text>
      </View>

      {/* Auth Actions Section */}
      <View className="mb-6 space-y-3 gap-3">
        {/* Primary: Get Started */}
        <TouchableOpacity
          onPress={handleGetStarted}
          className="bg-brand-accent py-4 px-6 rounded-2xl flex-row items-center justify-center gap-2 shadow-lg"
          activeOpacity={0.8}
        >
          <Text className="text-dark-bg font-extrabold text-base">
            Get Started
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#0B0D12" />
        </TouchableOpacity>

        <Text className="text-dark-muted text-[11px] text-center px-4 leading-4 mt-2">
          100% offline-first. All financial records are stored locally in your
          device SQLite database. Cloud sync can be connected in future releases.
        </Text>
      </View>
    </SafeAreaView>
  );
}
