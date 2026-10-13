import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountForm } from "../../components/accounts/AccountForm";
import { useAccounts } from "../../context/accounts";

export default function EditAccountRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accounts, isLoading } = useAccounts();

  const account = useMemo(() => {
    if (!id) return null;
    const numericId = parseInt(id, 10);
    return accounts.find((a) => a.id === numericId) || null;
  }, [id, accounts]);

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg items-center justify-center">
        <ActivityIndicator size="large" color="#D4F938" />
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-4">
          <Ionicons name="wallet-outline" size={28} color="#94A3B8" />
        </View>
        <Text className="text-dark-text font-bold text-xl mb-1 text-center">
          Account Not Found
        </Text>
        <Text className="text-dark-muted text-sm text-center mb-6">
          This account may have been removed or does not exist.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-brand-accent px-6 py-3 rounded-2xl active:opacity-90"
        >
          <Text className="text-dark-bg font-bold text-base">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return <AccountForm mode="edit" account={account} />;
}
