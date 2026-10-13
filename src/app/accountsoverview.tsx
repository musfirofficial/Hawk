import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../components/ScreenHeader";
import { useAccounts } from "../context/accounts";
import { useAuth } from "../context/auth";
import { LiquidAssetType } from "../db/schema";
import { formatCurrency } from "../services/currency";

export default function AccountsOverviewScreen() {
  const router = useRouter();
  const { bankAccounts, cashAccounts } = useAccounts();
  const { settings } = useAuth();

  const [activeTab, setActiveTab] = useState<LiquidAssetType>("BANK");

  function handleOpenCreate(type: LiquidAssetType = activeTab) {
    router.push({
      pathname: "/(account)/create",
      params: { type },
    } as any);
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      {/* Header */}
      <ScreenHeader
        title="Manage Accounts"
        showBack={true}
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity
            onPress={() => handleOpenCreate(activeTab)}
            className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center"
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#0B0D12" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="flex-1 px-5 pt-4"
      >
        {/* Type Selector Tab */}
        <View className="bg-dark-surface p-1 rounded-2xl flex-row items-center border border-dark-border mb-5">
          {(["BANK", "CASH"] as const).map((t) => {
            const isActive = activeTab === t;
            const label =
              t === "BANK"
                ? `Bank Accounts (${bankAccounts.length})`
                : `Cash on Hand (${cashAccounts.length})`;

            return (
              <TouchableOpacity
                key={t}
                onPress={() => setActiveTab(t)}
                activeOpacity={0.8}
                className={`flex-1 py-2.5 rounded-2xl items-center justify-center ${
                  isActive
                    ? "bg-dark-card border border-dark-border/80"
                    : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-sm ${
                    isActive
                      ? "text-dark-text font-bold"
                      : "text-dark-muted font-medium"
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Tab Accounts List */}
        {activeTab === "BANK" ? (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider">
                Bank Accounts ({bankAccounts.length})
              </Text>
              <TouchableOpacity
                onPress={() => handleOpenCreate("BANK")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-brand-accent text-xs font-bold">
                  + Add Bank
                </Text>
              </TouchableOpacity>
            </View>

            {bankAccounts.length === 0 ? (
              <TouchableOpacity
                onPress={() => handleOpenCreate("BANK")}
                activeOpacity={0.7}
                className="bg-dark-surface border border-dashed border-dark-border p-6 rounded-2xl items-center justify-center"
              >
                <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2.5">
                  <Ionicons name="business-outline" size={22} color="#38BDF8" />
                </View>
                <Text className="text-dark-text font-bold text-sm">
                  No Bank Accounts
                </Text>
                <Text className="text-dark-muted text-xs mt-1 text-center">
                  Tap here to add a checking or savings account
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="space-y-3 gap-3">
                {bankAccounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    onPress={() => router.push(`/(account)/${account.id}` as any)}
                    activeOpacity={0.7}
                    className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                        <Ionicons name="business" size={20} color="#38BDF8" />
                      </View>
                      <Text className="text-dark-text font-bold text-sm">
                        {account.name}
                      </Text>
                    </View>
                    <Text className="text-dark-text font-bold text-base">
                      {formatCurrency(
                        account.currentBalance,
                        settings?.currency,
                        settings?.numberFormat
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider">
                Cash on Hand ({cashAccounts.length})
              </Text>
              <TouchableOpacity
                onPress={() => handleOpenCreate("CASH")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text className="text-brand-accent text-xs font-bold">
                  + Add Cash
                </Text>
              </TouchableOpacity>
            </View>

            {cashAccounts.length === 0 ? (
              <TouchableOpacity
                onPress={() => handleOpenCreate("CASH")}
                activeOpacity={0.7}
                className="bg-dark-surface border border-dashed border-dark-border p-6 rounded-2xl items-center justify-center"
              >
                <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2.5">
                  <Ionicons name="wallet-outline" size={22} color="#22C55E" />
                </View>
                <Text className="text-dark-text font-bold text-sm">
                  No Cash Accounts
                </Text>
                <Text className="text-dark-muted text-xs mt-1 text-center">
                  Tap here to add pocket cash or physical wallet
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="space-y-3 gap-3">
                {cashAccounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    onPress={() => router.push(`/(account)/${account.id}` as any)}
                    activeOpacity={0.7}
                    className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                        <Ionicons
                          name="wallet-outline"
                          size={20}
                          color="#22C55E"
                        />
                      </View>
                      <Text className="text-dark-text font-bold text-sm">
                        {account.name}
                      </Text>
                    </View>
                    <Text className="text-dark-text font-bold text-base">
                      {formatCurrency(
                        account.currentBalance,
                        settings?.currency,
                        settings?.numberFormat
                      )}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
