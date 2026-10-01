import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();
  const [showBalance, setShowBalance] = useState(false);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 100 }}
        className="px-5 pt-3"
      >
        {/* Top Header */}
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-row items-center space-x-3 gap-3">
            <View className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center">
              <Text className="text-dark-bg font-bold text-base">H</Text>
            </View>
            <View>
              <Text className="text-dark-text text-base font-bold">
                Welcome Back, User
              </Text>
            </View>
          </View>

          {/* Settings Gear Button */}
          <TouchableOpacity
            onPress={() => router.push("/settings")}
            className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center"
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={20} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {/* Hero Balance Card (Dribbble Inspired in Dark Theme) */}
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
            {showBalance ? "$26,887.09" : "••••••••"}
          </Text>

          <View className="flex-row items-center gap-1.5 mt-1 mb-4">
            <View className="bg-dark-bg/20 px-2.5 py-0.5 rounded-full flex-row items-center gap-1">
              <Ionicons name="trending-up" size={14} color="#0B0D12" />
              <Text className="text-dark-bg text-xs font-bold">
                {showBalance ? "+$421.03" : "•••••••"}
              </Text>
              <Text className="text-dark-bg text-xs font-bold">today</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Dock */}
        <View className="bg-dark-surface rounded-2xl p-3 border border-dark-border flex-row justify-around mb-6">
          <TouchableOpacity
            className="items-center py-1 flex-1"
            activeOpacity={0.7}
          >
            <View className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-1.5">
              <Ionicons name="arrow-up" size={18} color="#F43F5E" />
            </View>
            <Text className="text-dark-text text-xs font-semibold">
              Expense
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-1 flex-1"
            activeOpacity={0.7}
          >
            <View className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-1.5">
              <Ionicons name="swap-horizontal" size={18} color="#38BDF8" />
            </View>
            <Text className="text-dark-text text-xs font-semibold">
              Transfer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-1 flex-1"
            activeOpacity={0.7}
          >
            <View className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-1.5">
              <Ionicons name="arrow-down" size={18} color="#22C55E" />
            </View>
            <Text className="text-dark-text text-xs font-semibold">Income</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center py-1 flex-1"
            activeOpacity={0.7}
          >
            <View className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-1.5">
              <Ionicons name="repeat" size={18} color="#F59E0B" />
            </View>
            <Text className="text-dark-text text-xs font-semibold">Debt</Text>
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

          {/* Sample Transaction Cards */}
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
                  <Text className="text-dark-muted text-xs">
                    Salary / Bank Transfer
                  </Text>
                </View>
              </View>
              <Text className="text-brand-income font-bold text-base">
                +$5,710.20
              </Text>
            </View>

            <View className="bg-dark-surface p-3.5 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
                  <Ionicons name="cart-outline" size={18} color="#F43F5E" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">
                    Nike Store
                  </Text>
                  <Text className="text-dark-muted text-xs">Cash on hand</Text>
                </View>
              </View>
              <Text className="text-brand-expense font-bold text-base">
                -$328.96
              </Text>
            </View>

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
                    Lend (Debt Given)
                  </Text>
                </View>
              </View>
              <Text className="text-brand-lend font-bold text-base">
                -$428.00
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
