import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountItem, useAccounts } from "../../context/accounts";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { useSecurityGuard } from "../../context/security";
import { LiquidAssetType } from "../../db/schema";
import { formatCurrency, getCurrencySymbol } from "../../services/currency";
import { ScreenHeader } from "../ScreenHeader";

export interface AccountFormProps {
  mode: "create" | "edit";
  account?: AccountItem | null;
  defaultType?: LiquidAssetType;
}

export function AccountForm({
  mode,
  account,
  defaultType = "BANK",
}: AccountFormProps) {
  const router = useRouter();
  const { createAccount, updateAccount, deleteAccount } = useAccounts();
  const { requireSecurityAuth } = useSecurityGuard();
  const { settings } = useAuth();
  const { showConfirm, showAlert } = useAlert();

  const [assetType, setAssetType] = useState<LiquidAssetType>(
    account ? account.assetType : defaultType,
  );
  const [name, setName] = useState(account ? account.name : "");
  const [initialBalance, setInitialBalance] = useState(
    account ? String(account.initialBalance ?? 0) : "",
  );
  const [accountNumber, setAccountNumber] = useState(
    account?.accountNumber || "",
  );
  const [note, setNote] = useState(account?.note || "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currencySymbol = getCurrencySymbol(settings?.currency || "USD");

  useEffect(() => {
    if (account && mode === "edit") {
      setAssetType(account.assetType);
      setName(account.name);
      setInitialBalance(String(account.initialBalance ?? 0));
      setAccountNumber(account.accountNumber || "");
      setNote(account.note || "");
      setError(null);
    }
  }, [account, mode]);

  const canSubmit = name.trim().length > 0;

  function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter an account name.");
      return;
    }

    let parsedBalance = 0;
    if (mode === "create") {
      parsedBalance = initialBalance.trim()
        ? parseFloat(initialBalance.trim())
        : 0;
      if (isNaN(parsedBalance)) {
        setError("Please enter a valid initial amount.");
        return;
      }
    }

    setError(null);
    setIsSubmitting(true);

    requireSecurityAuth({
      ruleKey: mode === "create" ? "createAccount" : "manageAccount",
      title:
        mode === "create"
          ? "Authorize New Account"
          : "Authorize Account Update",
      description: "Verify your identity to proceed.",
      onSuccess: async () => {
        try {
          if (mode === "create") {
            await createAccount({
              name: trimmedName,
              assetType,
              accountNumber:
                assetType === "BANK" ? accountNumber.trim() || null : null,
              initialBalance: parsedBalance,
              note: note.trim() || null,
            });
          } else if (mode === "edit" && account) {
            // Once created, name and note can be edited (initial amount and type remain immutable)
            await updateAccount(account.id, {
              name: trimmedName,
              note: note.trim() || null,
            });
          }
          setIsSubmitting(false);
          router.back();
        } catch (err: any) {
          console.error("Save account failed:", err);
          setError(err?.message || "Failed to save account. Please try again.");
          setIsSubmitting(false);
        }
      },
      onCancel: () => {
        setIsSubmitting(false);
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
              router.back();
              if (result.archived) {
                showAlert({
                  title: "Account Archived",
                  message:
                    "The account was archived to keep past transactions intact.",
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
    <SafeAreaView className="flex-1 bg-dark-bg" edges={["top", "bottom"]}>
      <ScreenHeader
        title={mode === "create" ? "Create Account" : "Edit Account"}
        onBack={() => router.back()}
        rightElement={
          mode === "edit" ? (
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isDeleting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 items-center justify-center active:bg-rose-500/20"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#F43F5E" />
              ) : (
                <Ionicons name="trash-outline" size={18} color="#F43F5E" />
              )}
            </TouchableOpacity>
          ) : undefined
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          className="flex-1 px-6 pt-6"
          keyboardShouldPersistTaps="handled"
        >
          {error && (
            <View className="mb-5 p-3 bg-brand-expense/10 border border-brand-expense/20 rounded-xl">
              <Text className="text-brand-expense text-xs text-center font-medium">
                {error}
              </Text>
            </View>
          )}

          <View className="gap-5 mb-8">
            {mode === "create" ? (
              <>
                {/* Account Type Selector (matches transaction creation type style) */}
                <View>
                  <Text className="text-dark-text text-sm font-semibold mb-2">
                    Account Type
                  </Text>
                  <View className="bg-dark-surface p-1 rounded-2xl flex-row items-center border border-dark-border">
                    {(["BANK", "CASH"] as const).map((t) => {
                      const isActive = assetType === t;
                      const label =
                        t === "BANK" ? "Bank Account" : "Cash Wallet";
                      const iconName =
                        t === "BANK" ? "business" : "wallet-outline";

                      return (
                        <TouchableOpacity
                          key={t}
                          onPress={() => setAssetType(t)}
                          activeOpacity={0.8}
                          className={`flex-1 py-2.5 rounded-2xl flex-row items-center justify-center gap-2 ${
                            isActive
                              ? "bg-dark-card border border-dark-border/80"
                              : "bg-transparent"
                          }`}
                        >
                          <Ionicons
                            name={iconName}
                            size={16}
                            color={isActive ? "#D4F938" : "#94A3B8"}
                          />
                          <Text
                            className={`text-sm ${
                              isActive
                                ? "text-dark-text font-bold"
                                : "text-dark-muted font-medium"
                            }`}
                          >
                            {label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Account Name */}
                <View>
                  <Text className="text-dark-text text-sm font-semibold mb-2">
                    Account Name
                  </Text>
                  <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5">
                    <TextInput
                      placeholder={
                        assetType === "BANK"
                          ? "e.g. Chase Checking, Wells Fargo"
                          : "e.g. Physical Wallet, Pocket Cash"
                      }
                      placeholderTextColor="#60677C"
                      value={name}
                      onChangeText={(val) => {
                        setName(val);
                        if (error) setError(null);
                      }}
                      className="text-dark-text text-sm py-0"
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                {/* Starting / Initial Amount (Create mode only) */}
                <View>
                  <Text className="text-dark-text text-sm font-semibold mb-2">
                    Starting Amount
                  </Text>
                  <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center">
                    <Text className="text-brand-accent font-bold text-sm mr-2.5">
                      {currencySymbol}
                    </Text>
                    <TextInput
                      placeholder="0.00"
                      placeholderTextColor="#60677C"
                      value={initialBalance}
                      onChangeText={(val) => {
                        setInitialBalance(val);
                        if (error) setError(null);
                      }}
                      keyboardType="decimal-pad"
                      className="flex-1 text-dark-text text-sm py-0"
                    />
                  </View>
                </View>

                {/* Optional Account Number for Bank */}
                {assetType === "BANK" && (
                  <View>
                    <View className="flex-row items-center justify-between mb-2">
                      <Text className="text-dark-text text-sm font-semibold">
                        Account Number
                      </Text>
                      <Text className="text-dark-muted text-xs">Optional</Text>
                    </View>
                    <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5">
                      <TextInput
                        placeholder="e.g. •••• 4821 or Account #"
                        placeholderTextColor="#60677C"
                        value={accountNumber}
                        onChangeText={setAccountNumber}
                        keyboardType="numeric"
                        className="text-dark-text text-sm py-0"
                      />
                    </View>
                  </View>
                )}

                {/* Optional Note */}
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-dark-text text-sm font-semibold">
                      Note
                    </Text>
                    <Text className="text-dark-muted text-xs">Optional</Text>
                  </View>
                  <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5">
                    <TextInput
                      placeholder="e.g. Primary salary account"
                      placeholderTextColor="#60677C"
                      value={note}
                      onChangeText={setNote}
                      multiline
                      numberOfLines={2}
                      className="text-dark-text text-sm py-0 min-h-[48px]"
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </>
            ) : (
              <>
                {/* Locked Account Type (Edit mode) */}
                <View>
                  <Text className="text-dark-text text-sm font-semibold mb-2">
                    Account Type
                  </Text>
                  <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2.5">
                      <Ionicons
                        name={
                          assetType === "BANK"
                            ? "business-outline"
                            : "wallet-outline"
                        }
                        size={18}
                        color="#60677C"
                      />
                      <Text className="text-dark-text font-medium text-sm">
                        {assetType === "BANK" ? "Bank Account" : "Cash Wallet"}
                      </Text>
                    </View>
                    <Ionicons name="lock-closed" size={16} color="#60677C" />
                  </View>
                </View>

                {/* Locked Initial Amount (Edit mode) */}
                <View>
                  <Text className="text-dark-text text-sm font-semibold mb-2">
                    Initial Amount
                  </Text>
                  <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center justify-between">
                    <Text className="text-dark-text font-medium text-sm">
                      {formatCurrency(
                        account?.initialBalance ?? 0,
                        settings?.currency,
                        settings?.numberFormat,
                      )}
                    </Text>
                    <Ionicons name="lock-closed" size={16} color="#60677C" />
                  </View>
                </View>

                {/* Note in Edit mode */}
                <View>
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-dark-text text-sm font-semibold">
                      Note
                    </Text>
                    <Text className="text-dark-muted text-xs">Optional</Text>
                  </View>
                  <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5">
                    <TextInput
                      placeholder="e.g. Primary salary account"
                      placeholderTextColor="#60677C"
                      value={note}
                      onChangeText={setNote}
                      multiline
                      numberOfLines={2}
                      className="text-dark-text text-sm py-0 min-h-[48px]"
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              </>
            )}
          </View>

          {/* Submit Action Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSubmit || isSubmitting}
            className={`w-full py-4 rounded-full items-center justify-center shadow-lg active:opacity-90 ${
              canSubmit && !isSubmitting
                ? "bg-brand-accent"
                : "bg-dark-surface border border-dark-border opacity-50"
            }`}
            activeOpacity={0.8}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#0B0D12" size="small" />
            ) : (
              <Text
                className={`font-bold text-base ${
                  canSubmit ? "text-brand-accentDark" : "text-dark-muted"
                }`}
              >
                {mode === "create" ? "Create Account" : "Save Changes"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default AccountForm;
