import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HawkAlertModal } from "../../components/HawkAlertModal";
import { TransactionForm } from "../../components/transactions/TransactionForm";
import { useAlert } from "../../context/alert";
import { useTransactions } from "../../context/transactions";

export default function EditTransactionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { transactions, isLoading, deleteTransaction } = useTransactions();
  const { showAlert } = useAlert();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const numericId = useMemo(() => (id ? parseInt(id, 10) : null), [id]);

  const transaction = useMemo(() => {
    if (!numericId) return null;
    return transactions.find((t) => t.id === numericId) || null;
  }, [numericId, transactions]);

  async function handleDeleteNotFound() {
    if (!numericId) return;
    try {
      setIsDeleting(true);
      await deleteTransaction(numericId);
      setIsDeleteModalOpen(false);
      router.back();
    } catch (err: any) {
      console.error("Delete transaction error:", err);
      showAlert({
        title: "Delete Failed",
        message: err?.message || "Could not delete transaction record.",
        type: "danger",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  // If this transaction belongs to a debt, route to the dedicated preview mode
  React.useEffect(() => {
    if (transaction && transaction.debtId) {
      router.replace(
        `/createdebt?debtId=${transaction.debtId}&txId=${transaction.id}&mode=preview&from=transactions` as any
      );
    }
  }, [transaction, router]);

  if (isLoading || (transaction && transaction.debtId)) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg items-center justify-center">
        <ActivityIndicator size="large" color="#D4F938" />
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-4">
          <Ionicons name="receipt-outline" size={28} color="#94A3B8" />
        </View>
        <Text className="text-dark-text font-bold text-xl mb-1 text-center">
          Transaction Not Found
        </Text>
        <Text className="text-dark-muted text-sm text-center mb-6">
          This transaction may have been removed or does not exist.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-brand-accent px-6 py-3 rounded-2xl active:opacity-90 w-48 items-center"
        >
          <Text className="text-dark-bg font-bold text-base">Go Back</Text>
        </TouchableOpacity>

        {numericId ? (
          <TouchableOpacity
            onPress={() => setIsDeleteModalOpen(true)}
            className="mt-4 flex-row items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 active:bg-rose-500/20 w-48"
          >
            <Ionicons name="trash-outline" size={16} color="#F43F5E" />
            <Text className="text-rose-400 font-bold text-base">
              Delete Record
            </Text>
          </TouchableOpacity>
        ) : null}

        <HawkAlertModal
          visible={isDeleteModalOpen}
          title="Delete Transaction"
          message="Are you sure you want to permanently delete this transaction record?"
          type="danger"
          buttons={[
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setIsDeleteModalOpen(false),
            },
            {
              text: isDeleting ? "Deleting..." : "Delete",
              style: "destructive",
              onPress: handleDeleteNotFound,
            },
          ]}
          onClose={() => setIsDeleteModalOpen(false)}
        />
      </SafeAreaView>
    );
  }

  return <TransactionForm mode="edit" initialData={transaction} />;
}

