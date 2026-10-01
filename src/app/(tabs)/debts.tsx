import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function DebtsScreen() {
  const [activeTab, setActiveTab] = useState<"LENT" | "BORROWED">("LENT");

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-dark-border">
        <Text className="text-dark-text text-xl font-bold">Debts & Loans</Text>
        <TouchableOpacity
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
            <View className="w-8 h-8 rounded-full bg-brand-lend/10 items-center justify-center mb-2">
              <Ionicons
                name="arrow-up-circle-outline"
                size={20}
                color="#F59E0B"
              />
            </View>
            <Text className="text-dark-muted text-xs font-semibold">
              I Am Owed
            </Text>
            <Text className="text-brand-lend text-xl font-extrabold mt-1">
              $1,450.00
            </Text>
            <Text className="text-dark-muted text-[10px] mt-0.5">
              3 active loans
            </Text>
          </View>

          <View className="flex-1 bg-dark-surface p-4 rounded-3xl border border-dark-border">
            <View className="w-8 h-8 rounded-full bg-brand-borrow/10 items-center justify-center mb-2">
              <Ionicons
                name="arrow-down-circle-outline"
                size={20}
                color="#A855F7"
              />
            </View>
            <Text className="text-dark-muted text-xs font-semibold">I Owe</Text>
            <Text className="text-brand-borrow text-xl font-extrabold mt-1">
              $500.00
            </Text>
            <Text className="text-dark-muted text-[10px] mt-0.5">
              1 borrowed debt
            </Text>
          </View>
        </View>

        {/* Tab Toggle */}
        <View className="bg-dark-surface p-1 rounded-2xl border border-dark-border flex-row mb-4">
          <TouchableOpacity
            onPress={() => setActiveTab("LENT")}
            className={`flex-1 py-2.5 rounded-xl items-center ${
              activeTab === "LENT" ? "bg-brand-accent" : ""
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === "LENT" ? "text-dark-bg" : "text-dark-muted"
              }`}
            >
              Money Lent (Receivable)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab("BORROWED")}
            className={`flex-1 py-2.5 rounded-xl items-center ${
              activeTab === "BORROWED" ? "bg-brand-accent" : ""
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === "BORROWED" ? "text-dark-bg" : "text-dark-muted"
              }`}
            >
              Money Borrowed (Payable)
            </Text>
          </TouchableOpacity>
        </View>

        {/* Debts List */}
        <View className="space-y-3 gap-3">
          <View className="bg-dark-surface p-4 rounded-2xl border border-dark-border">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
                  <Text className="text-dark-text font-bold text-sm">HJ</Text>
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">
                    Henrik Jansen
                  </Text>
                  <Text className="text-dark-muted text-xs">
                    Due: Oct 15, 2026
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-brand-lend font-bold text-base">
                  $800.00
                </Text>
                <View className="bg-brand-lend/10 px-2 py-0.5 rounded-full mt-0.5">
                  <Text className="text-brand-lend text-[10px] font-bold">
                    $350 Repaid
                  </Text>
                </View>
              </View>
            </View>
            {/* Repayment Progress Bar */}
            <View className="w-full bg-dark-card h-1.5 rounded-full overflow-hidden mt-2">
              <View className="bg-brand-lend h-full w-[43%]" />
            </View>
          </View>

          <View className="bg-dark-surface p-4 rounded-2xl border border-dark-border">
            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
                  <Text className="text-dark-text font-bold text-sm">MR</Text>
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">
                    Matteo Ricci
                  </Text>
                  <Text className="text-dark-muted text-xs">
                    Due: Nov 01, 2026
                  </Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-brand-lend font-bold text-base">
                  $650.00
                </Text>
                <View className="bg-dark-card px-2 py-0.5 rounded-full mt-0.5">
                  <Text className="text-dark-muted text-[10px] font-bold">
                    No repayments
                  </Text>
                </View>
              </View>
            </View>
            <View className="w-full bg-dark-card h-1.5 rounded-full overflow-hidden mt-2">
              <View className="bg-brand-lend h-full w-[0%]" />
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
