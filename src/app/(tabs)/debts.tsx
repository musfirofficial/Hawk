import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CreateDebts } from "../../components/debts/CreateDebts";
import { EditDebts } from "../../components/debts/EditDebts";
import { useAuth } from "../../context/auth";
import { DebtItem, useDebts } from "../../context/debts";
import { DebtType } from "../../db/schema";
import { formatCurrency } from "../../services/currency";

export default function DebtsScreen() {
  const {
    lentDebts,
    borrowedDebts,
    totalLentRemaining,
    totalBorrowedRemaining,
    activeLentCount,
    activeBorrowedCount,
  } = useDebts();
  const { settings } = useAuth();

  const [activeTab, setActiveTab] = useState<DebtType>("LEND");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);

  const currentList = activeTab === "LEND" ? lentDebts : borrowedDebts;

  function handleOpenCreate(type: DebtType = activeTab) {
    setActiveTab(type);
    setIsCreateOpen(true);
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-dark-border">
        <Text className="text-dark-text text-xl font-bold">Debts & Loans</Text>
        <TouchableOpacity
          onPress={() => handleOpenCreate(activeTab)}
          className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center"
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#0B0D12" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="flex-1 px-5 pt-4"
      >
        {/* Summary Metrics */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-dark-surface p-4 rounded-3xl border border-dark-border">
            <View className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2">
              <Ionicons
                name="arrow-up"
                size={16}
                color="#F59E0B"
              />
            </View>
            <Text className="text-dark-muted text-xs font-semibold">
              I Am Owed
            </Text>
            <Text className="text-brand-lend text-xl font-extrabold mt-1">
              {formatCurrency(
                totalLentRemaining,
                settings?.currency,
                settings?.numberFormat
              )}
            </Text>
            <Text className="text-dark-muted text-[10px] mt-0.5">
              {activeLentCount} active {activeLentCount === 1 ? "loan" : "loans"}
            </Text>
          </View>

          <View className="flex-1 bg-dark-surface p-4 rounded-3xl border border-dark-border">
            <View className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2">
              <Ionicons
                name="arrow-down"
                size={16}
                color="#A855F7"
              />
            </View>
            <Text className="text-dark-muted text-xs font-semibold">I Owe</Text>
            <Text className="text-brand-borrow text-xl font-extrabold mt-1">
              {formatCurrency(
                totalBorrowedRemaining,
                settings?.currency,
                settings?.numberFormat
              )}
            </Text>
            <Text className="text-dark-muted text-[10px] mt-0.5">
              {activeBorrowedCount} borrowed{" "}
              {activeBorrowedCount === 1 ? "debt" : "debts"}
            </Text>
          </View>
        </View>

        {/* Tab Toggle */}
        <View className="bg-dark-surface p-1 rounded-2xl border border-dark-border flex-row mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab("LEND")}
            className={`flex-1 py-2.5 rounded-xl items-center ${
              activeTab === "LEND" ? "bg-brand-accent" : ""
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === "LEND" ? "text-dark-bg" : "text-dark-muted"
              }`}
            >
              Money Lent (Receivable)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("BORROW")}
            className={`flex-1 py-2.5 rounded-xl items-center ${
              activeTab === "BORROW" ? "bg-brand-accent" : ""
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === "BORROW" ? "text-dark-bg" : "text-dark-muted"
              }`}
            >
              Money Borrowed (Payable)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Debts List */}
        {currentList.length === 0 ? (
          <TouchableOpacity
            onPress={() => handleOpenCreate(activeTab)}
            activeOpacity={0.7}
            className="bg-dark-surface border border-dashed border-dark-border p-8 rounded-2xl items-center justify-center mt-2"
          >
            <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2.5">
              <Ionicons
                name={
                  activeTab === "LEND"
                    ? "arrow-up"
                    : "arrow-down"
                }
                size={22}
                color={activeTab === "LEND" ? "#F59E0B" : "#A855F7"}
              />
            </View>
            <Text className="text-dark-text font-bold text-sm">
              {activeTab === "LEND" ? "No Lent Money" : "No Borrowed Money"}
            </Text>
            <Text className="text-dark-muted text-xs mt-1 text-center">
              {activeTab === "LEND"
                ? "Tap here to record money you lent to a contact"
                : "Tap here to record money you borrowed from someone"}
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="space-y-3 gap-3">
            {currentList.map((debt) => {
              const initials = debt.contactName
                .split(" ")
                .filter(Boolean)
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              const isLend = debt.type === "LEND";
              const accentColor = isLend ? "#F59E0B" : "#A855F7";
              const accentClass = isLend
                ? "text-brand-lend"
                : "text-brand-borrow";
              const bgBarClass = isLend ? "bg-brand-lend" : "bg-brand-borrow";

              return (
                <TouchableOpacity
                  key={debt.id}
                  onPress={() => setSelectedDebt(debt)}
                  activeOpacity={0.7}
                  className="bg-dark-surface p-4 rounded-2xl border border-dark-border"
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-3 flex-1 mr-2">
                      <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
                        <Text className="text-dark-text font-bold text-sm">
                          {initials || "D"}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-dark-text font-bold text-sm"
                          numberOfLines={1}
                        >
                          {debt.contactName}
                        </Text>
                        <Text
                          className="text-dark-muted text-xs"
                          numberOfLines={1}
                        >
                          {debt.dueDate
                            ? `Due: ${debt.dueDate}`
                            : debt.note || (isLend ? "Money Lent" : "Money Borrowed")}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className={`font-bold text-base ${accentClass}`}>
                        {formatCurrency(
                          debt.remainingAmount,
                          settings?.currency,
                          settings?.numberFormat
                        )}
                      </Text>
                      <View
                        className={`px-2 py-0.5 rounded-full mt-0.5 ${
                          debt.isSettled
                            ? "bg-brand-accent/15"
                            : debt.repaidAmount > 0
                            ? isLend
                              ? "bg-brand-lend/10"
                              : "bg-brand-borrow/10"
                            : "bg-dark-card"
                        }`}
                      >
                        <Text
                          className={`text-[10px] font-bold ${
                            debt.isSettled
                              ? "text-brand-accent"
                              : debt.repaidAmount > 0
                              ? accentClass
                              : "text-dark-muted"
                          }`}
                        >
                          {debt.isSettled
                            ? "SETTLED"
                            : debt.repaidAmount > 0
                            ? `${formatCurrency(
                                debt.repaidAmount,
                                settings?.currency,
                                settings?.numberFormat
                              )} Repaid`
                            : "No repayments"}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Repayment Progress Bar */}
                  <View className="w-full bg-dark-card h-1.5 rounded-full overflow-hidden mt-2">
                    <View
                      className={`h-full ${bgBarClass}`}
                      style={{ width: `${debt.progressPercent}%` }}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Create Debt Modal */}
      <CreateDebts
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultType={activeTab}
      />

      {/* Edit Debt Modal */}
      <EditDebts
        visible={Boolean(selectedDebt)}
        onClose={() => setSelectedDebt(null)}
        debt={selectedDebt}
      />
    </SafeAreaView>
  );
}
