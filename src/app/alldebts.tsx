import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../components/ScreenHeader";

export default function AllDebtsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      <ScreenHeader
        title="All Debts"
        showBack={true}
        onBack={() => router.back()}
      />

      <View className="flex-1 items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-dark-surface border border-dark-border items-center justify-center mb-4">
          <Ionicons name="receipt-outline" size={28} color="#94A3B8" />
        </View>

        <Text className="text-dark-text text-lg font-bold mb-1.5 text-center">
          All Debts Ledger
        </Text>

        <Text className="text-dark-muted font-sans text-xs text-center leading-relaxed max-w-[260px]">
          Full history and active records will be displayed here.
        </Text>
      </View>
    </SafeAreaView>
  );
}
