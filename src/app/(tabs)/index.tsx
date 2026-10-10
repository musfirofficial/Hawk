import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeMoreActionsModal } from "../../components/home/HomeMoreActionsModal";
import { CreateTransaction } from "../../components/transactions/CreateTransaction";
import { EditTransaction } from "../../components/transactions/EditTransaction";
import { TransactionCard } from "../../components/transactions/TransactionCard";
import { useAccounts } from "../../context/accounts";
import { useAuth } from "../../context/auth";
import {
  TransactionItem,
  useTransactions,
} from "../../context/transactions";
import { formatCurrency } from "../../services/currency";

export default function HomeScreen() {
  const router = useRouter();
  const { settings } = useAuth();
  const { totalLiquidAssets } = useAccounts();
  const { transactions, todayNetChange } = useTransactions();

  const [showBalance, setShowBalance] = useState(false);
  const [isCreateTxOpen, setIsCreateTxOpen] = useState(false);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<
    "EXPENSE" | "INCOME" | "TRANSFER"
  >("EXPENSE");
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  function handleOpenCreate(type: "EXPENSE" | "INCOME" | "TRANSFER") {
    setTxModalType(type);
    setIsCreateTxOpen(true);
  }

  const recentTransactions = transactions.slice(0, 5);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="px-5 pt-3"
      >
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-row items-center gap-3">
            <TouchableOpacity
              onPress={() => router.push("/(settings)/edit-profile")}
              activeOpacity={0.8}
              className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center overflow-hidden"
            >
              {settings?.profilePic ? (
                <Image
                  source={{ uri: settings.profilePic }}
                  className="w-full h-full rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-full h-full rounded-full bg-brand-accent items-center justify-center">
                  <Text className="text-dark-bg font-extrabold text-base">
                    {settings?.userName ? settings.userName[0].toUpperCase() : "H"}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <View>
              <Text className="text-dark-muted text-xs font-medium">
                Welcome Back
              </Text>
              <Text className="text-dark-text text-base font-bold">
                {settings?.userName || "Hawk User"}
              </Text>
            </View>
          </View>

          {/* Settings Gear Button */}
          <TouchableOpacity
            onPress={() => router.push("/(settings)/settings")}
            className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {/* Hero Balance Card */}
        <View className="bg-brand-accent rounded-3xl p-6 shadow-lg mb-4">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center bg-dark-bg/15 px-3 py-1 rounded-full">
              <Text className="text-dark-bg font-semibold text-xs">
                TOTAL LIQUID ASSETS
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setShowBalance(!showBalance)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={showBalance ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#0B0D12"
              />
            </TouchableOpacity>
          </View>

          <Text className="text-dark-bg text-4xl font-extrabold tracking-tight my-2">
            {showBalance
              ? formatCurrency(
                  totalLiquidAssets,
                  settings?.currency,
                  settings?.numberFormat
                )
              : "••••••••"}
          </Text>

          <View className="flex-row items-center gap-1.5 mt-1 mb-1">
            <View className="bg-dark-bg/20 px-2.5 py-0.5 rounded-full flex-row items-center gap-1">
              <Ionicons
                name={todayNetChange >= 0 ? "trending-up" : "trending-down"}
                size={14}
                color="#0B0D12"
              />
              <Text className="text-dark-bg text-xs font-bold">
                {showBalance
                  ? `${todayNetChange >= 0 ? "+" : ""}${formatCurrency(
                      todayNetChange,
                      settings?.currency,
                      settings?.numberFormat
                    )}`
                  : "•••••••"}
              </Text>
              <Text className="text-dark-bg text-xs font-bold">today</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Dock */}
        <View className="bg-dark-surface rounded-2xl p-3 border border-dark-border flex-row justify-around mb-6">
          <TouchableOpacity
            onPress={() => handleOpenCreate("EXPENSE")}
            className="items-center py-1 flex-1"
            activeOpacity={0.7}
          >
            <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-1.5">
              <Ionicons name="arrow-up" size={18} color="#F43F5E" />
            </View>
            <Text className="text-dark-text text-xs font-semibold">
              Expense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenCreate("TRANSFER")}
            className="items-center py-1 flex-1"
            activeOpacity={0.7}
          >
            <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-1.5">
              <Ionicons name="swap-horizontal" size={18} color="#38BDF8" />
            </View>
            <Text className="text-dark-text text-xs font-semibold">
              Transfer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleOpenCreate("INCOME")}
            className="items-center py-1 flex-1"
            activeOpacity={0.7}
          >
            <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-1.5">
              <Ionicons name="arrow-down" size={18} color="#22C55E" />
            </View>
            <Text className="text-dark-text text-xs font-semibold">Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setIsMoreSheetOpen(true)}
            className="items-center py-1 flex-1"
            activeOpacity={0.7}
          >
            <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-1.5">
              <Ionicons name="ellipsis-horizontal" size={20} color="#F8FAFC" />
            </View>
            <Text className="text-dark-text text-xs font-semibold">More</Text>
          </TouchableOpacity>
        </View>

        {/* Latest Transactions Section */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-dark-text text-lg font-bold">
              Latest Transactions
            </Text>
            <TouchableOpacity onPress={() => router.push("/fulltransaction")}>
              <Text className="text-brand-accent text-xs font-semibold">
                See All
              </Text>
            </TouchableOpacity>
          </View>

          {/* Dynamic Transaction List */}
          {recentTransactions.length === 0 ? (
            <TouchableOpacity
              onPress={() => handleOpenCreate("EXPENSE")}
              activeOpacity={0.7}
              className="bg-dark-surface border border-dashed border-dark-border p-6 rounded-2xl items-center justify-center"
            >
              <View className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2">
                <Ionicons name="receipt-outline" size={18} color="#94A3B8" />
              </View>
              <Text className="text-dark-text font-bold text-sm">
                No Transactions Yet
              </Text>
              <Text className="text-dark-muted text-xs mt-1 text-center">
                Tap Expense, Transfer, or Income above to record your first entry
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="space-y-2.5 gap-2.5">
              {recentTransactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  onPress={() => setSelectedTx(tx)}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* More Actions Fly-up Modal */}
      <HomeMoreActionsModal
        visible={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
      />

      {/* Create Transaction Modal */}
      <CreateTransaction
        visible={isCreateTxOpen}
        onClose={() => setIsCreateTxOpen(false)}
        defaultType={txModalType}
      />

      {/* Edit / View Transaction Modal */}
      <EditTransaction
        visible={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        transaction={selectedTx}
      />
    </SafeAreaView>
  );
}
