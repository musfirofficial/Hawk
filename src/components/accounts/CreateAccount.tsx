import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { HawkModal } from "../HawkModal";
import { useAccounts } from "../../context/accounts";
import { useAuth } from "../../context/auth";
import { useSecurityGuard } from "../../context/security";
import { LiquidAssetType } from "../../db/schema";
import { getCurrencySymbol } from "../../services/currency";

interface CreateAccountProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: LiquidAssetType;
}

export function CreateAccount({
  visible,
  onClose,
  defaultType = "BANK",
}: CreateAccountProps) {
  const { createAccount } = useAccounts();
  const { requireSecurityAuth } = useSecurityGuard();
  const { settings } = useAuth();

  const [assetType, setAssetType] = useState<LiquidAssetType>(defaultType);
  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = getCurrencySymbol(settings?.currency || "USD");

  useEffect(() => {
    if (visible) {
      setAssetType(defaultType);
      setName("");
      setInitialBalance("");
      setAccountNumber("");
      setNote("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [visible, defaultType]);

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Account name is required");
      return;
    }

    const parsedBalance = initialBalance ? parseFloat(initialBalance) : 0;
    if (isNaN(parsedBalance)) {
      setError("Please enter a valid initial balance");
      return;
    }

    setError(null);

    requireSecurityAuth({
      ruleKey: "createAccount",
      title: "Authorize New Account",
      description: "Verify your identity to create a new account.",
      onSuccess: async () => {
        try {
          setIsSubmitting(true);
          await createAccount({
            name: trimmedName,
            assetType,
            accountNumber:
              assetType === "BANK" ? accountNumber.trim() || null : null,
            initialBalance: parsedBalance,
            note: note.trim() || null,
          });
          handleClose();
        } catch (err) {
          console.error("Create account failed:", err);
          setError("Failed to create account. Please try again.");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  }

  return (
    <HawkModal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/70">
        {/* Backdrop Dismiss */}
        <Pressable className="flex-1" onPress={handleClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="bg-dark-surface border-t border-dark-border rounded-t-3xl max-h-[85vh] px-5 pt-3 pb-8">
            {/* Drag Handle */}
            <View className="items-center mb-3">
              <View className="w-12 h-1.5 bg-dark-border rounded-full" />
            </View>

            {/* Header */}
            <View className="flex-row items-center justify-between pb-4 border-b border-dark-border">
              <Text className="text-dark-text text-xl font-bold">
                Add Liquid Asset
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
            >
              {/* Type Switcher Pills */}
              <View className="flex-row gap-3 mb-5">
                <TouchableOpacity
                  onPress={() => setAssetType("BANK")}
                  activeOpacity={0.8}
                  className={`flex-1 flex-row items-center justify-center py-3.5 px-4 rounded-2xl border ${
                    assetType === "BANK"
                      ? "bg-brand-transfer/15 border-brand-transfer"
                      : "bg-dark-card border-dark-border"
                  }`}
                >
                  <Ionicons
                    name="business"
                    size={18}
                    color={assetType === "BANK" ? "#38BDF8" : "#94A3B8"}
                  />
                  <Text
                    className={`ml-2 text-sm font-bold ${
                      assetType === "BANK"
                        ? "text-brand-transfer"
                        : "text-dark-muted"
                    }`}
                  >
                    Bank Account
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAssetType("CASH")}
                  activeOpacity={0.8}
                  className={`flex-1 flex-row items-center justify-center py-3.5 px-4 rounded-2xl border ${
                    assetType === "CASH"
                      ? "bg-brand-income/15 border-brand-income"
                      : "bg-dark-card border-dark-border"
                  }`}
                >
                  <Ionicons
                    name="wallet-outline"
                    size={18}
                    color={assetType === "CASH" ? "#22C55E" : "#94A3B8"}
                  />
                  <Text
                    className={`ml-2 text-sm font-bold ${
                      assetType === "CASH"
                        ? "text-brand-income"
                        : "text-dark-muted"
                    }`}
                  >
                    Cash Wallet
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Error message */}
              {error ? (
                <View className="bg-rose-500/15 border border-rose-500/30 rounded-xl p-3 mb-4">
                  <Text className="text-rose-400 text-xs font-semibold text-center">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Account Name */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Account Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder={
                    assetType === "BANK"
                      ? "e.g. Chase Checking"
                      : "e.g. Physical Wallet"
                  }
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                />
              </View>

              {/* Initial Balance */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Initial Balance
                </Text>
                <View className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3 flex-row items-center">
                  <Text className="text-brand-accent font-bold text-base mr-2">
                    {currencySymbol}
                  </Text>
                  <TextInput
                    value={initialBalance}
                    onChangeText={setInitialBalance}
                    placeholder="0.00"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    className="flex-1 text-dark-text text-base p-0"
                  />
                </View>
              </View>

              {/* Account Number (Bank only) */}
              {assetType === "BANK" && (
                <View className="mb-4">
                  <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                    Account Number (Optional)
                  </Text>
                  <TextInput
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                    placeholder="e.g. •••• 4821 or 12345678"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                  />
                </View>
              )}

              {/* Note */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Note (Optional)
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Primary salary account"
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                />
              </View>

              {/* Action Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                className="bg-brand-accent rounded-2xl py-4 items-center justify-center mt-3"
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0B0D12" />
                ) : (
                  <Text className="text-dark-bg font-extrabold text-base">
                    Create Account
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </HawkModal>
  );
}
