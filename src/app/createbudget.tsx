import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import { TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BudgetForm } from "../components/budget/BudgetForm";
import { ScreenHeader } from "../components/ScreenHeader";
import { useAlert } from "../context/alert";
import { deleteBudget, getMonthBudgetSummary } from "../services/budgetService";

export default function CreateBudgetScreen() {
  const router = useRouter();
  const { showConfirm } = useAlert();
  const params = useLocalSearchParams<{ id?: string; month?: string }>();

  const budgetId = params.id ? parseInt(params.id, 10) : undefined;
  const targetMonth = params.month || undefined;

  // If budgetId provided, load existing budget for edit
  const existingBudget = useMemo(() => {
    if (!budgetId) return null;
    try {
      const currentMonth = targetMonth || new Date().toISOString().slice(0, 7);
      const summary = getMonthBudgetSummary(currentMonth);
      return summary.budgets.find((b) => b.id === budgetId) || null;
    } catch {
      return null;
    }
  }, [budgetId, targetMonth]);

  const mode = existingBudget ? "edit" : "create";

  function handleDelete() {
    if (!existingBudget) return;
    showConfirm({
      title: "Delete Budget",
      message: `Are you sure you want to delete "${existingBudget.name}"?`,
      type: "danger",
      confirmText: "Delete",
      cancelText: "Cancel",
      isDestructive: true,
      onConfirm: () => {
        try {
          deleteBudget(existingBudget.id);
          router.back();
        } catch (err) {
          console.warn("Delete budget error:", err);
        }
      },
    });
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
      <ScreenHeader
        title={mode === "edit" ? "Edit Budget" : "Create Budget"}
        showBack={true}
        onBack={() => router.back()}
        rightElement={
          mode === "edit" && existingBudget ? (
            <TouchableOpacity
              onPress={handleDelete}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="p-1 -mr-1"
              activeOpacity={0.7}
            >
              <Ionicons name="trash-outline" size={21} color="#F43F5E" />
            </TouchableOpacity>
          ) : undefined
        }
      />

      <BudgetForm
        key={existingBudget?.id ?? "create"}
        mode={mode}
        initialBudget={existingBudget}
        defaultMonth={targetMonth}
        onSuccess={() => router.back()}
        onCancel={() => router.back()}
      />
    </SafeAreaView>
  );
}
