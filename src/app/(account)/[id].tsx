import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AccountForm } from "../../components/accounts/AccountForm";
import { HawkAlertModal } from "../../components/HawkAlertModal";
import { useAccounts } from "../../context/accounts";
import { useAlert } from "../../context/alert";

export default function EditAccountRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { accounts, isLoading, deleteAccount } = useAccounts();
  const { showAlert } = useAlert();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const numericId = useMemo(() => (id ? parseInt(id, 10) : null), [id]);

  const account = useMemo(() => {
    if (!numericId) return null;
    return accounts.find((a) => a.id === numericId) || null;
  }, [numericId, accounts]);

  async function handleDeleteNotFound() {
    if (!numericId) return;
    try {
      setIsDeleting(true);
      await deleteAccount(numericId, true);
      setIsDeleteModalOpen(false);
      router.back();
    } catch (err: any) {
      console.error("Delete account error:", err);
      showAlert({
        title: "Delete Failed",
        message: err?.message || "Could not delete account record.",
        type: "danger",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg items-center justify-center">
        <ActivityIndicator size="large" color="#D4F938" />
      </SafeAreaView>
    );
  }

  if (!account) {
    return (
      <SafeAreaView className="flex-1 bg-dark-bg items-center justify-center px-6">
        <View className="w-16 h-16 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-4">
          <Ionicons name="wallet-outline" size={28} color="#94A3B8" />
        </View>
        <Text className="text-dark-text font-bold text-xl mb-1 text-center">
          Account Not Found
        </Text>
        <Text className="text-dark-muted text-sm text-center mb-6">
          This account may have been removed or does not exist.
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
              Delete Account
            </Text>
          </TouchableOpacity>
        ) : null}

        <HawkAlertModal
          visible={isDeleteModalOpen}
          title="Delete Account"
          message="Are you sure you want to permanently delete this account record and clean up any remaining transactions?"
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

  return <AccountForm mode="edit" account={account} />;
}

