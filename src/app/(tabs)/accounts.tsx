import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function AccountsScreen() {
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-dark-border">
        <Text className="text-dark-text text-xl font-bold">Liquid Assets</Text>
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
        {/* Net Worth Summary */}
        <View className="bg-dark-surface p-5 rounded-3xl border border-dark-border mb-6">
          <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider">
            Total Liquid Balance
          </Text>
          <Text className="text-dark-text text-3xl font-extrabold mt-1">
            $26,887.09
          </Text>
          <View className="flex-row items-center gap-4 mt-3 pt-3 border-t border-dark-border">
            <View>
              <Text className="text-dark-muted text-[11px]">Cash</Text>
              <Text className="text-brand-income font-bold text-sm">$1,250.00</Text>
            </View>
            <View className="w-px h-6 bg-dark-border" />
            <View>
              <Text className="text-dark-muted text-[11px]">Bank</Text>
              <Text className="text-brand-transfer font-bold text-sm">$25,637.09</Text>
            </View>
          </View>
        </View>

        {/* Bank Accounts Section */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-3">
            Bank Accounts
          </Text>

          <View className="space-y-3 gap-3">
            <View className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-11 h-11 rounded-2xl bg-brand-transfer/10 border border-brand-transfer/20 items-center justify-center">
                  <Ionicons name="business" size={20} color="#38BDF8" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">Chase Checking</Text>
                  <Text className="text-dark-muted text-xs">Acc: •••• 4821</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-dark-text font-bold text-base">$18,420.50</Text>
                <Text className="text-dark-muted text-[10px]">Primary</Text>
              </View>
            </View>

            <View className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-11 h-11 rounded-2xl bg-brand-transfer/10 border border-brand-transfer/20 items-center justify-center">
                  <Ionicons name="card-outline" size={20} color="#38BDF8" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">High-Yield Savings</Text>
                  <Text className="text-dark-muted text-xs">Acc: •••• 9104</Text>
                </View>
              </View>
              <View className="items-end">
                <Text className="text-dark-text font-bold text-base">$7,216.59</Text>
                <Text className="text-dark-muted text-[10px]">Savings</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Cash on Hand Section */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-3">
            Cash on Hand
          </Text>

          <View className="space-y-3 gap-3">
            <View className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-11 h-11 rounded-2xl bg-brand-income/10 border border-brand-income/20 items-center justify-center">
                  <Ionicons name="wallet-outline" size={20} color="#22C55E" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">Physical Wallet</Text>
                  <Text className="text-dark-muted text-xs">Pocket Cash</Text>
                </View>
              </View>
              <Text className="text-dark-text font-bold text-base">$450.00</Text>
            </View>

            <View className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-11 h-11 rounded-2xl bg-brand-income/10 border border-brand-income/20 items-center justify-center">
                  <Ionicons name="file-tray-full-outline" size={20} color="#22C55E" />
                </View>
                <View>
                  <Text className="text-dark-text font-bold text-sm">Emergency Drawer Cash</Text>
                  <Text className="text-dark-muted text-xs">Home Safe</Text>
                </View>
              </View>
              <Text className="text-dark-text font-bold text-base">$800.00</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
