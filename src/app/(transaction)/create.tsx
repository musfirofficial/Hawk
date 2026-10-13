import { useLocalSearchParams } from "expo-router";
import React from "react";
import { TransactionForm } from "../../components/transactions/TransactionForm";

export default function CreateTransactionRoute() {
  const params = useLocalSearchParams<{
    type?: "EXPENSE" | "INCOME" | "TRANSFER";
  }>();

  return (
    <TransactionForm
      mode="create"
      defaultType={params.type || "EXPENSE"}
    />
  );
}
