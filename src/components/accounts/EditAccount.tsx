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
import { AccountItem, useAccounts } from "../../context/accounts";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { useSecurityGuard } from "../../context/security";
import { LiquidAssetType } from "../../db/schema";
import { formatCurrency, getCurrencySymbol } from "../../services/currency";

interface EditAccountProps {
  visible: boolean;
  onClose: () => void;
  account: AccountItem | null;
}

export function EditAccount({ visible, onClose, account }: EditAccountProps) {
  const { updateAccount, deleteAccount } = useAccounts();
  const { requireSecurityAuth } = useSecurityGuard();
  const { settings } = useAuth();
  const { showConfirm, showAlert } = useAlert();

  const [assetType, setAssetType] = useState<LiquidAssetType>("BANK");
  const [name, setName] = useState("");
  const [initialBalance, setInitialBalance] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currencySymbol = getCurrencySymbol(settings?.currency || "USD");

  useEffect(() => {
    if (account && visible) {
      setAssetType(account.assetType);
      setName(account.name);
      setInitialBalance(String(account.initialBalance ?? 0));
      setAccountNumber(account.accountNumber || "");
      setNote(account.note || "");
      setError(null);
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  }, [account, visible]);

  if (!account) return null;

  function handleSave() {
    if (!account) return;
    const currentAccount = account;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Account name cannot be empty");
      return;
    }

    const parsedBalance = initialBalance ? parseFloat(initialBalance) : 0;
    if (isNaN(parsedBalance)) {
      setError("Please enter a valid balance");
      return;
    }

    setError(null);

    requireSecurityAuth({
      ruleKey: "createAccount", // or general account editing rule
      title: "Save Account Changes",
      description: "Verify your identity to update this account.",
      onSuccess: async () => {
        try {
          setIsSubmitting(true);
          await updateAccount(currentAccount.id, {
            name: trimmedName,
            assetType,
            accountNumber:
              assetType === "BANK" ? accountNumber.trim() || null : null,
            initialBalance: parsedBalance,
            note: note.trim() || null,
          });
          onClose();
        } catch (err) {
          console.error("Update account failed:", err);
          setError("Failed to update account. Please try again.");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  }

  function handleDelete() {
    if (!account) return;
    const currentAccount = account;
    const txCount = currentAccount.transactionCount;
    const isArchive = txCount > 0;

    const alertTitle = isArchive ? "Archive Account" : "Delete Account";
    const alertMessage = isArchive
      ? `This account is linked to ${txCount} past transaction${
          txCount > 1 ? "s" : ""
        }. To protect your ledger history, it will be safely archived instead of deleted.`
      : "This account has no transactions and will be permanently deleted from your database.";

    showConfirm({
      title: alertTitle,
      message: alertMessage,
      type: "danger",
      confirmText: isArchive ? "Archive" : "Delete",
      isDestructive: true,
      onConfirm: () => {
        requireSecurityAuth({
          ruleKey: "deleteAccount",
          title: isArchive ? "Authorize Archive" : "Authorize Deletion",
          description: "Verify your identity to remove this account.",
          onSuccess: async () => {
            try {
              setIsDeleting(true);
              const result = await deleteAccount(currentAccount.id);
              onClose();
              if (result.archived) {
                showAlert({
                  title: "Account Archived",
                  message: "The account was archived to keep past transactions intact.",
                  type: "info",
                });
              }
            } catch (err) {
              console.error("Delete account error:", err);
              showAlert({
                title: "Error",
                message: "Could not delete this account.",
                type: "danger",
              });
            } finally {
              setIsDeleting(false);
            }
          },
        });
      },
    });
  }

  return (
    <HawkModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" onPress={onClose} />

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
                Edit Account
              </Text>
              <TouchableOpacity
                onPress={onClose}
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
              {/* Current Live Balance Banner */}
              <View className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-5 flex-row items-center justify-between">
                <View>
                  <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider">
                    Current Balance
                  </Text>
                  <Text className="text-dark-text text-2xl font-black mt-1">
                    {formatCurrency(
                      account.currentBalance,
                      settings?.currency,
                      settings?.numberFormat
                    )}
                  </Text>
                </View>
                <View className="items-end">
                  <View className="bg-dark-surface border border-dark-border px-2.5 py-1 rounded-full">
                    <Text className="text-dark-muted text-[11px] font-bold">
                      {account.transactionCount} Txns
                    </Text>
                  </View>
                </View>
              </View>

              {/* Type Switcher Pills */}
              <View className="flex-row gap-3 mb-5">
                <TouchableOpacity
                  onPress={() => setAssetType("BANK")}
                  activeOpacity={0.8}
                  className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-2xl border ${
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
                    Bank
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setAssetType("CASH")}
                  activeOpacity={0.8}
                  className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-2xl border ${
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
                    Cash
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
                  placeholder="Account name"
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                />
              </View>

              {/* Initial Balance */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Opening Balance
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
                    placeholder="e.g. •••• 4821"
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
                  placeholder="e.g. Salary, Home safe"
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                />
              </View>

              {/* Save Changes Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSubmitting || isDeleting}
                className="bg-brand-accent rounded-2xl py-4 items-center justify-center mt-3"
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0B0D12" />
                ) : (
                  <Text className="text-dark-bg font-extrabold text-base">
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>

              {/* Delete / Archive Button */}
              <TouchableOpacity
                onPress={handleDelete}
                disabled={isSubmitting || isDeleting}
                className="bg-rose-500/10 border border-rose-500/20 rounded-2xl py-3.5 items-center justify-center mt-3 flex-row gap-2"
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#F43F5E" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#F43F5E" />
                    <Text className="text-rose-500 font-bold text-sm">
                      {account.transactionCount > 0
                        ? "Archive Account"
                        : "Delete Account"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </HawkModal>
  );
}
