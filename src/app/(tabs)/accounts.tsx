import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CreateAccount } from "../../components/accounts/CreateAccount";
import { EditAccount } from "../../components/accounts/EditAccount";
import { AccountItem, useAccounts } from "../../context/accounts";
import { useAuth } from "../../context/auth";
import { LiquidAssetType } from "../../db/schema";
import { formatCurrency } from "../../services/currency";

export default function AccountsScreen() {
  const {
    bankAccounts,
    cashAccounts,
    totalBankBalance,
    totalCashBalance,
    totalLiquidAssets,
  } = useAccounts();
  const { settings } = useAuth();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDefaultType, setCreateDefaultType] =
    useState<LiquidAssetType>("BANK");
  const [selectedAccount, setSelectedAccount] = useState<AccountItem | null>(
    null
  );

  function handleOpenCreate(type: LiquidAssetType = "BANK") {
    setCreateDefaultType(type);
    setIsCreateOpen(true);
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-dark-border">
        <Text className="text-dark-text text-xl font-bold">Liquid Assets</Text>
        <TouchableOpacity
          onPress={() => handleOpenCreate("BANK")}
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
            Bank Balance
          </Text>
          <Text className="text-dark-text text-3xl font-extrabold mt-1">
            {formatCurrency(
              totalBankBalance,
              settings?.currency,
              settings?.numberFormat
            )}
          </Text>
          <View className="flex-row items-center gap-4 mt-3 pt-3 border-t border-dark-border" />
          <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider">
            Cash Balance
          </Text>
          <Text className="text-dark-text text-3xl font-extrabold mt-1">
            {formatCurrency(
              totalCashBalance,
              settings?.currency,
              settings?.numberFormat
            )}
          </Text>
        </View>

        {/* Bank Accounts Section */}
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
                <Ionicons name="business-outline" size={22} color="#F8FAFC" />
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
                  onPress={() => setSelectedAccount(account)}
                  activeOpacity={0.7}
                  className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                      <Ionicons name="business" size={20} color="#F8FAFC" />
                    </View>
                    <View>
                      <Text className="text-dark-text font-bold text-sm">
                        {account.name}
                      </Text>
                      <Text className="text-dark-muted text-xs">
                        {account.accountNumber
                          ? `Acc: •••• ${account.accountNumber.slice(-4)}`
                          : "Bank Account"}
                      </Text>
                    </View>
                  </View>
                  <View className="items-end">
                    <Text className="text-dark-text font-bold text-base">
                      {formatCurrency(
                        account.currentBalance,
                        settings?.currency,
                        settings?.numberFormat
                      )}
                    </Text>
                    {account.note ? (
                      <Text
                        className="text-dark-muted text-[10px] max-w-[110px]"
                        numberOfLines={1}
                      >
                        {account.note}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Cash on Hand Section */}
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
                <Ionicons name="wallet-outline" size={22} color="#F8FAFC" />
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
                  onPress={() => setSelectedAccount(account)}
                  activeOpacity={0.7}
                  className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3">
                    <View className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                      <Ionicons
                        name="wallet-outline"
                        size={20}
                        color="#F8FAFC"
                      />
                    </View>
                    <View>
                      <Text className="text-dark-text font-bold text-sm">
                        {account.name}
                      </Text>
                      <Text className="text-dark-muted text-xs">
                        {account.note || "Cash on Hand"}
                      </Text>
                    </View>
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
      </ScrollView>

      {/* Create Account Modal */}
      <CreateAccount
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        defaultType={createDefaultType}
      />

      {/* Edit Account Modal */}
      <EditAccount
        visible={Boolean(selectedAccount)}
        onClose={() => setSelectedAccount(null)}
        account={selectedAccount}
      />
    </SafeAreaView>
  );
}
