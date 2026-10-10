import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { HawkModal } from "../HawkModal";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { useSecurityGuard } from "../../context/security";
import {
  TransactionItem,
  useTransactions,
} from "../../context/transactions";
import { formatCurrency } from "../../services/currency";

interface EditTransactionProps {
  visible: boolean;
  onClose: () => void;
  transaction: TransactionItem | null;
}

export function EditTransaction({
  visible,
  onClose,
  transaction,
}: EditTransactionProps) {
  const { deleteTransaction } = useTransactions();
  const { requireSecurityAuth } = useSecurityGuard();
  const { settings } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const [isDeleting, setIsDeleting] = useState(false);

  if (!transaction) return null;

  function handleDelete() {
    if (!transaction) return;
    const currentTx = transaction;

    showConfirm({
      title: "Delete Transaction",
      message:
        "Are you sure you want to permanently delete this transaction record?",
      type: "danger",
      confirmText: "Delete",
      isDestructive: true,
      onConfirm: () => {
        requireSecurityAuth({
          ruleKey: "deleteTransaction",
          title: "Authorize Deletion",
          description: "Verify your identity to delete this transaction.",
          onSuccess: async () => {
            try {
              setIsDeleting(true);
              await deleteTransaction(currentTx.id);
              onClose();
            } catch (err) {
              console.error("Delete transaction error:", err);
              showAlert({
                title: "Error",
                message: "Could not delete transaction.",
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

  const isIncome =
    transaction.type === "INCOME" ||
    transaction.type === "BORROW" ||
    transaction.type === "DEBT RECEIVED";

  const isExpense =
    transaction.type === "EXPENSE" ||
    transaction.type === "LEND" ||
    transaction.type === "DEBT PAID";

  return (
    <HawkModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="bg-dark-surface border-t border-dark-border rounded-t-3xl max-h-[85vh] px-5 pt-3 pb-8">
          <View className="items-center mb-3">
            <View className="w-12 h-1.5 bg-dark-border rounded-full" />
          </View>

          <View className="flex-row items-center justify-between pb-4 border-b border-dark-border">
            <Text className="text-dark-text text-xl font-bold">
              Transaction Details
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
            {/* Amount Banner */}
            <View className="bg-dark-card border border-dark-border rounded-2xl p-5 mb-5 items-center">
              <View className="bg-dark-surface border border-dark-border px-3 py-1 rounded-full mb-2">
                <Text className="text-dark-muted text-[10px] font-bold uppercase tracking-wider">
                  {transaction.type}
                </Text>
              </View>

              <Text
                className={`text-3xl font-black ${
                  isIncome
                    ? "text-brand-income"
                    : isExpense
                    ? "text-brand-expense"
                    : "text-brand-transfer"
                }`}
              >
                {isIncome ? "+" : isExpense ? "-" : ""}
                {formatCurrency(
                  transaction.amount,
                  settings?.currency,
                  settings?.numberFormat
                )}
              </Text>
            </View>

            {/* Metadata Rows */}
            <View className="bg-dark-card border border-dark-border rounded-2xl p-4 space-y-3 gap-3 mb-5">
              <View className="flex-row items-center justify-between">
                <Text className="text-dark-muted text-xs">Date</Text>
                <Text className="text-dark-text text-xs font-semibold">
                  {transaction.date}
                </Text>
              </View>

              {transaction.categoryName && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-dark-muted text-xs">Category</Text>
                  <Text className="text-dark-text text-xs font-semibold">
                    {transaction.categoryName}
                  </Text>
                </View>
              )}

              {transaction.contactName && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-dark-muted text-xs">Contact / Payee</Text>
                  <Text className="text-dark-text text-xs font-semibold">
                    {transaction.contactName}
                  </Text>
                </View>
              )}

              {transaction.fromAssetName && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-dark-muted text-xs">From Account</Text>
                  <Text className="text-dark-text text-xs font-semibold">
                    {transaction.fromAssetName}
                  </Text>
                </View>
              )}

              {transaction.toAssetName && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-dark-muted text-xs">To Account</Text>
                  <Text className="text-dark-text text-xs font-semibold">
                    {transaction.toAssetName}
                  </Text>
                </View>
              )}

              {transaction.note && (
                <View className="flex-row items-center justify-between">
                  <Text className="text-dark-muted text-xs">Note</Text>
                  <Text className="text-dark-text text-xs font-semibold">
                    {transaction.note}
                  </Text>
                </View>
              )}
            </View>

            {/* Delete Button */}
            <TouchableOpacity
              onPress={handleDelete}
              disabled={isDeleting}
              className="bg-rose-500/10 border border-rose-500/20 rounded-2xl py-3.5 items-center justify-center flex-row gap-2"
              activeOpacity={0.8}
            >
              {isDeleting ? (
                <ActivityIndicator color="#F43F5E" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#F43F5E" />
                  <Text className="text-rose-500 font-bold text-sm">
                    Delete Transaction
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </HawkModal>
  );
}
