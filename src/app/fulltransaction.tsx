import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function FullTransactionScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState("ALL");

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
      {/* Top Header matching reference */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-dark-border">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text className="text-dark-text text-lg font-bold">Transactions</Text>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center"
          activeOpacity={0.7}
        >
          <Ionicons name="search" size={18} color="#F8FAFC" />
        </TouchableOpacity>
      </View>

      {/* Account Selector Pill Badge (from design) */}
      <View className="items-center my-3">
        <TouchableOpacity
          className="bg-dark-surface border border-dark-border px-4 py-2 rounded-full flex-row items-center gap-2"
          activeOpacity={0.7}
        >
          <View className="w-2.5 h-2.5 rounded-full bg-brand-accent" />
          <Text className="text-dark-text text-xs font-bold">
            All Liquid Assets
          </Text>
          <Ionicons name="chevron-down" size={14} color="#94A3B8" />
        </TouchableOpacity>
      </View>

      {/* Transaction Type Filter Pills */}
      <View className="px-5 mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="gap-2 flex-row"
        >
          {["ALL", "INCOME", "EXPENSE", "TRANSFER", "DEBTS"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedFilter(tab)}
              className={`px-3.5 py-1.5 rounded-full border ${
                selectedFilter === tab
                  ? "bg-brand-accent border-brand-accent"
                  : "bg-dark-surface border-dark-border"
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedFilter === tab ? "text-dark-bg" : "text-dark-muted"
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Grouped Transaction List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="flex-1 px-5"
      >
        {/* Date Group: Today */}
        <View className="mb-4">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2.5">
            Today
          </Text>
          <View className="space-y-2.5 gap-2.5">
            <View className="bg-dark-surface p-3.5 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
                  <Ionicons name="arrow-down" size={18} color="#22C55E" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">
                    Eva Novak
                  </Text>
                  <Text className="text-dark-muted text-xs">Salary • Bank</Text>
                </View>
              </View>
              <Text className="text-brand-income font-bold text-base">
                +$5,710.20
              </Text>
            </View>

            <View className="bg-dark-surface p-3.5 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
                  <Ionicons name="trending-up" size={18} color="#22C55E" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">
                    Binance
                  </Text>
                  <Text className="text-dark-muted text-xs">
                    Crypto P2P • Bank
                  </Text>
                </View>
              </View>
              <Text className="text-brand-income font-bold text-base">
                +$714.00
              </Text>
            </View>
          </View>
        </View>

        {/* Date Group: Yesterday */}
        <View className="mb-4">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2.5">
            Yesterday
          </Text>
          <View className="space-y-2.5 gap-2.5">
            <View className="bg-dark-surface p-3.5 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
                  <Ionicons name="repeat" size={18} color="#F59E0B" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">
                    Henrik Jansen
                  </Text>
                  <Text className="text-dark-muted text-xs">
                    Debt Received • Cash
                  </Text>
                </View>
              </View>
              <Text className="text-brand-income font-bold text-base">
                +$428.00
              </Text>
            </View>

            <View className="bg-dark-surface p-3.5 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
                  <Ionicons name="film-outline" size={18} color="#F43F5E" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">
                    Multiplex Cinema
                  </Text>
                  <Text className="text-dark-muted text-xs">
                    Entertainment • Bank
                  </Text>
                </View>
              </View>
              <Text className="text-brand-expense font-bold text-base">
                -$124.55
              </Text>
            </View>

            <View className="bg-dark-surface p-3.5 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
                  <Ionicons name="shirt-outline" size={18} color="#F43F5E" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">
                    Nike Store
                  </Text>
                  <Text className="text-dark-muted text-xs">
                    Shopping • Cash
                  </Text>
                </View>
              </View>
              <Text className="text-brand-expense font-bold text-base">
                -$328.96
              </Text>
            </View>
          </View>
        </View>

        {/* Date Group: Earlier */}
        <View className="mb-4">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2.5">
            19 November
          </Text>
          <View className="space-y-2.5 gap-2.5">
            <View className="bg-dark-surface p-3.5 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
                  <Ionicons name="arrow-down" size={18} color="#22C55E" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">
                    Matteo Ricci
                  </Text>
                  <Text className="text-dark-muted text-xs">
                    Consulting • Bank
                  </Text>
                </View>
              </View>
              <Text className="text-brand-income font-bold text-base">
                +$548.00
              </Text>
            </View>

            <View className="bg-dark-surface p-3.5 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
                  <Ionicons name="tv-outline" size={18} color="#F43F5E" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">
                    Megogo Subscription
                  </Text>
                  <Text className="text-dark-muted text-xs">
                    Services • Bank
                  </Text>
                </View>
              </View>
              <Text className="text-brand-expense font-bold text-base">
                -$847.20
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
