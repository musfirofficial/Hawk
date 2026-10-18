import { Ionicons } from "@expo/vector-icons";
import { useSafeRouter } from "../../hooks/useSafeRouter";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DebtCard } from "../../components/debts/DebtCard";
import { EditDebts } from "../../components/debts/EditDebts";
import { useAuth } from "../../context/auth";
import { DebtItem, useDebts } from "../../context/debts";
import { formatCurrency } from "../../services/currency";

export default function DebtsScreen() {
  const router = useSafeRouter();
  const {
    debts,
    totalLentRemaining,
    totalBorrowedRemaining,
  } = useDebts();
  const { settings } = useAuth();

  const [showBalance, setShowBalance] = useState(true);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);

  // Total receivable minus borrowed (Debt State)
  const netDebt = totalLentRemaining - totalBorrowedRemaining;

  // Ongoing (unsettled) debts ordered by closest to due date (up to 4)
  const ongoingDebts = useMemo(() => {
    const active = debts.filter((d) => !d.isSettled);
    return active
      .sort((a, b) => {
        if (a.dueDate && b.dueDate) {
          return a.dueDate.localeCompare(b.dueDate);
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .slice(0, 4);
  }, [debts]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 110 }}
        className="flex-1 px-5 pt-3"
      >
        {/* 1. First Debts heading like in budget tab/page */}
        <View className="pt-2 pb-5 items-center justify-center">
          <Text className="text-dark-text text-xl font-bold text-center">
            Debts
          </Text>
        </View>

        {/* 2. Yellow Accent Hero Card for Debt State with Eye & Plus Buttons */}
        <View className="bg-brand-accent rounded-3xl p-5 shadow-lg mb-4">
          {/* Top Row: Debt State Tag & Actions (Eye + Plus Button) */}
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center bg-dark-bg/15 px-3 py-1.5 rounded-full gap-1.5">
              <Ionicons name="scale-outline" size={14} color="#0B0D12" />
              <Text className="text-dark-bg font-bold text-xs">
                Debt State
              </Text>
            </View>

            {/* Actions: Eye Toggler & Add Debt Button */}
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
                onPress={() => router.push("/createdebt" as any)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="w-8 h-8 rounded-full bg-dark-bg/15 items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={20} color="#0B0D12" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Grand Debt State Amount */}
          <Text className="text-dark-bg text-4xl font-extrabold tracking-tight my-2.5">
            {showBalance
              ? netDebt < 0
                ? `-${formatCurrency(
                    Math.abs(netDebt),
                    settings?.currency,
                    settings?.numberFormat
                  )}`
                : formatCurrency(
                    netDebt,
                    settings?.currency,
                    settings?.numberFormat
                  )
              : "••••••••"}
          </Text>

          {/* Subtitle Status */}
          <Text className="text-dark-bg/80 font-bold text-xs">
            {netDebt > 0
              ? "Net Receivable in your favor"
              : netDebt < 0
              ? "Net Borrowed to be repaid"
              : "All debts are balanced"}
          </Text>
        </View>

        {/* 3. The 2 Cards (Receivable & Borrowed) outside yellow card, affected by eye toggle */}
        <View className="flex-row items-center gap-2.5 mb-6">
          {/* Receivable Card */}
          <View className="flex-1 bg-dark-surface border border-dark-border rounded-2xl p-3.5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                <Ionicons name="arrow-up" size={16} color="#F59E0B" />
              </View>
              <Text className="text-dark-muted font-semibold text-xs">
                Receivable
              </Text>
            </View>
            <Text
              className="text-dark-text text-base font-extrabold tracking-tight"
              numberOfLines={1}
            >
              {showBalance
                ? formatCurrency(
                    totalLentRemaining,
                    settings?.currency,
                    settings?.numberFormat
                  )
                : "••••••"}
            </Text>
          </View>

          {/* Borrowed Card */}
          <View className="flex-1 bg-dark-surface border border-dark-border rounded-2xl p-3.5">
            <View className="flex-row items-center justify-between mb-2">
              <View className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                <Ionicons name="arrow-down" size={16} color="#A855F7" />
              </View>
              <Text className="text-dark-muted font-semibold text-xs">
                Borrowed
              </Text>
            </View>
            <Text
              className="text-dark-text text-base font-extrabold tracking-tight"
              numberOfLines={1}
            >
              {showBalance
                ? formatCurrency(
                    totalBorrowedRemaining,
                    settings?.currency,
                    settings?.numberFormat
                  )
                : "••••••"}
            </Text>
          </View>
        </View>

        {/* 4. Ongoing Debts Section Header */}
        <View className="flex-row items-center justify-between mb-3.5 px-0.5">
          <Text className="text-dark-text text-lg font-bold">
            Ongoing Debts
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/alldebts" as any)}
            hitSlop={{ top: 14, bottom: 14, left: 20, right: 20 }}
            delayPressIn={0}
            activeOpacity={0.6}
            className="py-1 px-2 -mr-2"
          >
            <Text className="text-dark-muted text-xs font-semibold">
              View all
            </Text>
          </TouchableOpacity>
        </View>

        {/* 5. Ongoing Debts Cards (up to 4) */}
        {ongoingDebts.length === 0 ? (
          <View className="bg-dark-surface border border-dashed border-dark-border p-8 rounded-3xl items-center justify-center mt-1">
            <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-3">
              <Ionicons name="receipt-outline" size={22} color="#94A3B8" />
            </View>
            <Text className="text-dark-text font-bold text-sm">
              No Ongoing Debts
            </Text>
            <Text className="text-dark-muted font-sans text-xs mt-1 text-center max-w-[240px]">
              You don't have any active loans or debts. Tap the + button to record one.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/createdebt" as any)}
              className="mt-4 px-4 py-2 rounded-full bg-dark-card border border-dark-border flex-row items-center gap-2 active:bg-dark-surface"
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={16} color="#F8FAFC" />
              <Text className="text-dark-text font-semibold text-xs">
                Record Debt
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {ongoingDebts.map((debt) => (
              <DebtCard
                key={debt.id}
                debt={debt}
                onPress={() => setSelectedDebt(debt)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Edit / Detail Modal on Card Press */}
      <EditDebts
        visible={Boolean(selectedDebt)}
        onClose={() => setSelectedDebt(null)}
        debt={selectedDebt}
      />
    </SafeAreaView>
  );
}
