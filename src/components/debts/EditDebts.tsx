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
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { DebtItem, useDebts } from "../../context/debts";
import { useSecurityGuard } from "../../context/security";
import { formatCurrency, getCurrencySymbol } from "../../services/currency";

interface EditDebtsProps {
  visible: boolean;
  onClose: () => void;
  debt: DebtItem | null;
}

export function EditDebts({ visible, onClose, debt }: EditDebtsProps) {
  const { deleteDebt, recordRepayment, toggleSettleManually } = useDebts();
  const { accounts } = useAccounts();
  const { requireSecurityAuth } = useSecurityGuard();
  const { settings } = useAuth();
  const { showAlert, showConfirm } = useAlert();

  const [showRepayForm, setShowRepayForm] = useState(false);
  const [repayAmount, setRepayAmount] = useState("");
  const [repayAssetId, setRepayAssetId] = useState<number | null>(null);
  const [repayNote, setRepayNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const currencySymbol = getCurrencySymbol(settings?.currency || "USD");

  useEffect(() => {
    if (debt && visible) {
      setShowRepayForm(false);
      setRepayAmount(debt.remainingAmount > 0 ? String(debt.remainingAmount) : "");
      setRepayAssetId(accounts.length > 0 ? accounts[0].id : null);
      setRepayNote("");
      setError(null);
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  }, [debt, visible, accounts]);

  if (!debt) return null;

  async function handleRecordRepayment() {
    if (!debt) return;
    const currentDebt = debt;

    const parsedAmount = parseFloat(repayAmount);
    if (!repayAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid repayment amount");
      return;
    }

    if (!repayAssetId) {
      setError("Please select an account for this payment");
      return;
    }

    setError(null);
    try {
      setIsSubmitting(true);
      await recordRepayment({
        debtId: currentDebt.id,
        amount: parsedAmount,
        assetId: repayAssetId,
        note: repayNote.trim() || null,
      });
      setShowRepayForm(false);
      onClose();
    } catch (err) {
      console.error("Repayment error:", err);
      setError("Failed to record repayment.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDelete() {
    if (!debt) return;
    const currentDebt = debt;
    const hasHistory = currentDebt.repaymentCount > 0;

    const alertTitle = hasHistory ? "Archive Debt Record" : "Delete Debt Record";
    const alertMessage = hasHistory
      ? `This debt record has ${currentDebt.repaymentCount} linked repayments. It will be safely archived to protect past transaction records.`
      : "This debt has no recorded repayments and will be permanently deleted.";

    showConfirm({
      title: alertTitle,
      message: alertMessage,
      type: "danger",
      confirmText: hasHistory ? "Archive" : "Delete",
      isDestructive: true,
      onConfirm: () => {
        requireSecurityAuth({
          ruleKey: "deleteDebt",
          title: hasHistory ? "Authorize Archive" : "Authorize Deletion",
          description: "Verify your identity to remove this debt record.",
          onSuccess: async () => {
            try {
              setIsDeleting(true);
              const result = await deleteDebt(currentDebt.id);
              onClose();
              if (result.archived) {
                showAlert({
                  title: "Debt Archived",
                  message:
                    "Record was archived to preserve payment transactions.",
                  type: "info",
                });
              }
            } catch (err) {
              console.error("Delete debt error:", err);
              showAlert({
                title: "Error",
                message: "Could not delete debt record.",
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

  const isLend = debt.type === "LEND";

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
            <View className="items-center mb-3">
              <View className="w-12 h-1.5 bg-dark-border rounded-full" />
            </View>

            <View className="flex-row items-center justify-between pb-4 border-b border-dark-border">
              <View className="flex-row items-center gap-2">
                <Text className="text-dark-text text-xl font-bold">
                  {debt.contactName}
                </Text>
                <View
                  className={`px-2 py-0.5 rounded-full ${
                    isLend ? "bg-brand-lend/15" : "bg-brand-borrow/15"
                  }`}
                >
                  <Text
                    className={`text-[10px] font-bold ${
                      isLend ? "text-brand-lend" : "text-brand-borrow"
                    }`}
                  >
                    {isLend ? "LENT" : "BORROWED"}
                  </Text>
                </View>
              </View>
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
              {/* Financial Progress Card */}
              <View className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-5">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider">
                    {debt.isSettled ? "Settled Balance" : "Remaining Due"}
                  </Text>
                  <Text
                    className={`text-xs font-bold ${
                      debt.isSettled
                        ? "text-brand-accent"
                        : isLend
                        ? "text-brand-lend"
                        : "text-brand-borrow"
                    }`}
                  >
                    {debt.isSettled ? "SETTLED" : `${debt.progressPercent}% Repaid`}
                  </Text>
                </View>

                <Text className="text-dark-text text-3xl font-black mb-3">
                  {formatCurrency(
                    debt.remainingAmount,
                    settings?.currency,
                    settings?.numberFormat
                  )}
                </Text>

                {/* Progress bar */}
                <View className="w-full bg-dark-surface h-2 rounded-full overflow-hidden mb-3">
                  <View
                    className={`h-full ${
                      isLend ? "bg-brand-lend" : "bg-brand-borrow"
                    }`}
                    style={{ width: `${debt.progressPercent}%` }}
                  />
                </View>

                <View className="flex-row items-center justify-between pt-2 border-t border-dark-border/60">
                  <View>
                    <Text className="text-dark-muted text-[10px] uppercase">
                      Total Loan
                    </Text>
                    <Text className="text-dark-text text-xs font-bold">
                      {formatCurrency(
                        debt.amount,
                        settings?.currency,
                        settings?.numberFormat
                      )}
                    </Text>
                  </View>

                  <View className="items-end">
                    <Text className="text-dark-muted text-[10px] uppercase">
                      Total Repaid
                    </Text>
                    <Text className="text-dark-text text-xs font-bold">
                      {formatCurrency(
                        debt.repaidAmount,
                        settings?.currency,
                        settings?.numberFormat
                      )}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Debt Metadata */}
              {debt.dueDate && (
                <View className="flex-row items-center justify-between py-2 border-b border-dark-border/40">
                  <Text className="text-dark-muted text-xs">Due Date</Text>
                  <Text className="text-dark-text text-xs font-semibold">
                    {debt.dueDate}
                  </Text>
                </View>
              )}

              {debt.note && (
                <View className="flex-row items-center justify-between py-2 border-b border-dark-border/40">
                  <Text className="text-dark-muted text-xs">Note</Text>
                  <Text className="text-dark-text text-xs font-semibold">
                    {debt.note}
                  </Text>
                </View>
              )}

              {error ? (
                <View className="bg-rose-500/15 border border-rose-500/30 rounded-xl p-3 my-4">
                  <Text className="text-rose-400 text-xs font-semibold text-center">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Repayment Form or Trigger */}
              {!debt.isSettled && (
                <View className="mt-4">
                  {!showRepayForm ? (
                    <TouchableOpacity
                      onPress={() => setShowRepayForm(true)}
                      className="bg-brand-accent rounded-2xl py-3.5 items-center justify-center flex-row gap-2"
                      activeOpacity={0.8}
                    >
                      <Ionicons name="cash-outline" size={18} color="#0B0D12" />
                      <Text className="text-dark-bg font-extrabold text-sm">
                        Record Payment
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View className="bg-dark-card border border-dark-border p-4 rounded-2xl">
                      <Text className="text-dark-text font-bold text-sm mb-3">
                        Record Repayment
                      </Text>

                      {/* Repayment Amount */}
                      <View className="mb-3">
                        <Text className="text-dark-muted text-[11px] font-bold uppercase mb-1">
                          Amount
                        </Text>
                        <View className="bg-dark-surface border border-dark-border rounded-xl px-3 py-2 flex-row items-center">
                          <Text className="text-brand-accent font-bold text-sm mr-2">
                            {currencySymbol}
                          </Text>
                          <TextInput
                            value={repayAmount}
                            onChangeText={setRepayAmount}
                            placeholder="0.00"
                            placeholderTextColor="#64748B"
                            keyboardType="numeric"
                            className="flex-1 text-dark-text text-sm p-0"
                          />
                        </View>
                      </View>

                      {/* Account */}
                      <View className="mb-3">
                        <Text className="text-dark-muted text-[11px] font-bold uppercase mb-1">
                          {isLend
                            ? "Deposit Into Account"
                            : "Pay From Account"}
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          className="flex-row gap-2"
                        >
                          {accounts.map((a) => (
                            <TouchableOpacity
                              key={a.id}
                              onPress={() => setRepayAssetId(a.id)}
                              className={`px-3 py-1.5 rounded-xl border ${
                                repayAssetId === a.id
                                  ? "bg-brand-accent/20 border-brand-accent"
                                  : "bg-dark-surface border-dark-border"
                              }`}
                            >
                              <Text
                                className={`text-xs font-bold ${
                                  repayAssetId === a.id
                                    ? "text-brand-accent"
                                    : "text-dark-text"
                                }`}
                              >
                                {a.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>

                      {/* Note */}
                      <View className="mb-3">
                        <TextInput
                          value={repayNote}
                          onChangeText={setRepayNote}
                          placeholder="Payment note (optional)"
                          placeholderTextColor="#64748B"
                          className="bg-dark-surface border border-dark-border rounded-xl px-3 py-2 text-dark-text text-xs"
                        />
                      </View>

                      <View className="flex-row gap-2 mt-2">
                        <TouchableOpacity
                          onPress={() => setShowRepayForm(false)}
                          className="flex-1 bg-dark-surface border border-dark-border py-2.5 rounded-xl items-center"
                        >
                          <Text className="text-dark-muted text-xs font-bold">
                            Cancel
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={handleRecordRepayment}
                          disabled={isSubmitting}
                          className="flex-1 bg-brand-accent py-2.5 rounded-xl items-center justify-center"
                        >
                          {isSubmitting ? (
                            <ActivityIndicator size="small" color="#0B0D12" />
                          ) : (
                            <Text className="text-dark-bg text-xs font-extrabold">
                              Confirm
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              )}

              {/* Manual Settle Toggle */}
              <TouchableOpacity
                onPress={() => toggleSettleManually(debt.id)}
                className="bg-dark-card border border-dark-border rounded-2xl py-3 items-center justify-center mt-3"
                activeOpacity={0.8}
              >
                <Text className="text-dark-text font-bold text-xs">
                  {debt.isSettledManually
                    ? "Unmark Manual Settlement"
                    : "Mark as Settled Manually"}
                </Text>
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
                      {debt.repaymentCount > 0 ? "Archive Debt" : "Delete Debt"}
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
