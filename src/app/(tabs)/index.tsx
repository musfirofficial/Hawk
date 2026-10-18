import { Ionicons } from "@expo/vector-icons";
import { useSafeRouter } from "../../hooks/useSafeRouter";
import { useMemo, useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HomeMoreActionsModal } from "../../components/home/HomeMoreActionsModal";
import { TransactionCard } from "../../components/transactions/TransactionCard";
import { useAccounts } from "../../context/accounts";
import { useAuth } from "../../context/auth";
import { useTransactions } from "../../context/transactions";
import { formatCurrency } from "../../services/currency";

export default function HomeScreen() {
  const router = useSafeRouter();
  const { settings } = useAuth();
  const { totalLiquidAssets, totalBankBalance, totalCashBalance } =
    useAccounts();
  const { transactions, todayNetChange } = useTransactions();

  const [showBalance, setShowBalance] = useState(true);
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);

  // Calculate Bank and Cash percentages
  const safeBank = Math.max(0, totalBankBalance);
  const safeCash = Math.max(0, totalCashBalance);
  const combinedTotal = safeBank + safeCash;

  const { bankPct, cashPct } = useMemo(() => {
    if (combinedTotal <= 0) {
      return { bankPct: 0, cashPct: 0 };
    }
    const b = Math.round((safeBank / combinedTotal) * 100);
    const c = 100 - b;
    return { bankPct: b, cashPct: c };
  }, [safeBank, combinedTotal]);

  function handleOpenCreate(type: "EXPENSE" | "INCOME" | "TRANSFER") {
    router.push({
      pathname: "/(transaction)/create",
      params: { type },
    });
  }

  const recentTransactions = transactions.slice(0, 5);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      {/* Header matching other tabs with 40x40 circle action sizes */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-1">
        <View className="flex-row items-center gap-3 flex-1 mr-3">
          <TouchableOpacity
            onPress={() => router.push("/(settings)/edit-profile")}
            activeOpacity={0.8}
            className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center overflow-hidden"
          >
            {settings?.profilePic ? (
              <Image
                source={{ uri: settings.profilePic }}
                className="w-full h-full rounded-full"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-full rounded-full bg-dark-card items-center justify-center">
                <Text className="text-dark-text font-bold text-base">
                  {settings?.userName
                    ? settings.userName[0].toUpperCase()
                    : "H"}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <View className="flex-1 justify-center">
            <Text className="text-xs font-medium text-dark-muted">
              Welcome,
            </Text>
            <Text
              className="text-xl font-bold text-dark-text -mt-0.5"
              numberOfLines={1}
            >
              {settings?.userName || "Hawk User"}
            </Text>
          </View>
        </View>

        {/* Settings Gear Button (w-10 h-10 matching add button size from other tabs) */}
        <TouchableOpacity
          onPress={() => router.push("/(settings)/settings")}
          className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center active:bg-dark-surface"
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color="#F8FAFC" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="flex-1 px-5 pt-3"
      >
        {/* Modern Yellow Hero Balance Card */}
        <View className="bg-brand-accent rounded-3xl p-5 shadow-lg mb-4">
          {/* Top Row: Today Summary & Actions (Eye + Add Account) */}
          <View className="flex-row items-center justify-between mb-1">
            {/* Functional Today Flow Indicator (Replaces Total Liquid Assets text) */}
            <View className="flex-row items-center bg-dark-bg/15 px-3 py-1.5 rounded-full gap-1.5">
              <Ionicons
                name={todayNetChange >= 0 ? "trending-up" : "trending-down"}
                size={14}
                color="#0B0D12"
              />
              <Text className="text-dark-bg font-bold text-xs">
                {showBalance
                  ? `${todayNetChange >= 0 ? "+" : ""}${formatCurrency(
                      todayNetChange,
                      settings?.currency,
                      settings?.numberFormat,
                    )} today`
                  : "••••••• today"}
              </Text>
            </View>

            {/* Actions: Eye Toggler & Add Account Button */}
            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={() => setShowBalance(!showBalance)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="w-8 h-8 rounded-full bg-dark-bg/15 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showBalance ? "eye-outline" : "eye-off-outline"}
                  size={17}
                  color="#0B0D12"
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => router.push("/(account)/create" as any)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="w-8 h-8 rounded-full bg-dark-bg/15 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#0B0D12" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Grand Total Amount */}
          <Text className="text-dark-bg text-4xl font-extrabold tracking-tight my-2.5">
            {showBalance
              ? formatCurrency(
                  totalLiquidAssets,
                  settings?.currency,
                  settings?.numberFormat,
                )
              : "••••••••"}
          </Text>

          {/* 2 Horizontal Cards for Bank & Cash with Totals, Icons, and Percentages */}
          <View className="flex-row items-center gap-2.5 mt-1">
            {/* Bank Card Tile */}
            <TouchableOpacity
              onPress={() => router.push("/accountsoverview" as any)}
              activeOpacity={0.8}
              className="flex-1 bg-dark-bg/15 p-3 rounded-2xl"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="w-7 h-7 rounded-full bg-dark-bg/15 items-center justify-center">
                  <Ionicons name="business" size={14} color="#0B0D12" />
                </View>
                <Text className="text-dark-bg font-bold text-xs">
                  {bankPct}%
                </Text>
              </View>

              <Text
                className="text-dark-bg text-base font-extrabold tracking-tight mt-0.5"
                numberOfLines={1}
              >
                {showBalance
                  ? formatCurrency(
                      totalBankBalance,
                      settings?.currency,
                      settings?.numberFormat,
                    )
                  : "••••••••"}
              </Text>
            </TouchableOpacity>

            {/* Cash Card Tile */}
            <TouchableOpacity
              onPress={() => router.push("/accountsoverview" as any)}
              activeOpacity={0.8}
              className="flex-1 bg-dark-bg/15 p-3 rounded-2xl"
            >
              <View className="flex-row items-center justify-between mb-1.5">
                <View className="w-7 h-7 rounded-full bg-dark-bg/15 items-center justify-center">
                  <Ionicons name="wallet-outline" size={14} color="#0B0D12" />
                </View>
                <Text className="text-dark-bg font-bold text-xs">
                  {cashPct}%
                </Text>
              </View>

              <Text
                className="text-dark-bg text-base font-extrabold tracking-tight mt-0.5"
                numberOfLines={1}
              >
                {showBalance
                  ? formatCurrency(
                      totalCashBalance,
                      settings?.currency,
                      settings?.numberFormat,
                    )
                  : "••••••••"}
              </Text>
            </TouchableOpacity>
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
              onPress={() => router.push("/(transaction)/create")}
              activeOpacity={0.7}
              className="bg-dark-surface border border-dashed border-dark-border p-6 rounded-2xl items-center justify-center"
            >
              <View className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2">
                <Ionicons name="receipt-outline" size={18} color="#94A3B8" />
              </View>
              <Text className="text-dark-text font-bold text-sm">
                No Transactions Yet
              </Text>
              <Text className="text-dark-muted text-xs mt-1 text-center font-medium">
                Tap Expense, Transfer, or Income above to record your first
                entry
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="space-y-2.5 gap-2.5">
              {recentTransactions.map((tx) => (
                <TransactionCard
                  key={tx.id}
                  transaction={tx}
                  onPress={() => router.push(`/(transaction)/${tx.id}` as any)}
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
    </SafeAreaView>
  );
}
