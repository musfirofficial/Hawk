import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HawkFlyUp } from "../../components/HawkFlyUp";
import { useAuth } from "../../context/auth";
import { useTransactions } from "../../context/transactions";
import { db, ensureDatabaseInitialized, expoDb } from "../../db";
import * as schema from "../../db/schema";
import { formatCurrency, getCurrencySymbol } from "../../services/currency";

interface BudgetItem {
  id: number;
  categoryId: number;
  categoryName: string;
  categoryIcon: string | null;
  amount: number;
  period: string;
}

export default function BudgetScreen() {
  const { settings } = useAuth();
  const { categories, transactions } = useTransactions();

  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<BudgetItem | null>(null);

  // Form state for creating/editing budget
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [amountInput, setAmountInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Current month string 'YYYY-MM'
  const currentMonthYMD = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const monthLabel = useMemo(() => {
    const now = new Date();
    return now.toLocaleString("default", { month: "long", year: "numeric" });
  }, []);

  const loadBudgets = useCallback(() => {
    try {
      ensureDatabaseInitialized();
      const rows = expoDb.getAllSync<{
        id: number;
        category_id: number;
        amount: number;
        period: string;
        category_name: string;
        category_icon: string | null;
      }>(`
        SELECT b.id, b.category_id, b.amount, b.period, c.name as category_name, c.icon as category_icon
        FROM budgets b
        JOIN categories c ON c.id = b.category_id
        ORDER BY b.amount DESC;
      `);

      const mapped: BudgetItem[] = rows.map((r) => ({
        id: r.id,
        categoryId: r.category_id,
        categoryName: r.category_name,
        categoryIcon: r.category_icon,
        amount: Number(r.amount) || 0,
        period: r.period,
      }));
      setBudgets(mapped);
    } catch (err) {
      console.warn("Failed to load budgets:", err);
    }
  }, []);

  useEffect(() => {
    loadBudgets();
  }, [loadBudgets]);

  // Calculate spent per category for current month
  const categorySpentMap = useMemo(() => {
    const map = new Map<number, number>();
    for (const t of transactions) {
      if (
        t.type === "EXPENSE" &&
        t.categoryId &&
        t.date &&
        t.date.startsWith(currentMonthYMD)
      ) {
        const cur = map.get(t.categoryId) || 0;
        map.set(t.categoryId, cur + t.amount);
      }
    }
    return map;
  }, [transactions, currentMonthYMD]);

  // Overall totals
  const totalBudgetAmount = useMemo(() => {
    return budgets.reduce((acc, b) => acc + b.amount, 0);
  }, [budgets]);

  const totalSpentAmount = useMemo(() => {
    return budgets.reduce((acc, b) => {
      const spent = categorySpentMap.get(b.categoryId) || 0;
      return acc + spent;
    }, 0);
  }, [budgets, categorySpentMap]);

  const overallPct = useMemo(() => {
    if (totalBudgetAmount <= 0) return 0;
    return Math.min(
      100,
      Math.round((totalSpentAmount / totalBudgetAmount) * 100)
    );
  }, [totalSpentAmount, totalBudgetAmount]);

  function handleOpenCreate() {
    setSelectedBudget(null);
    // Default to first category not yet budgeted
    const budgetedCatIds = new Set(budgets.map((b) => b.categoryId));
    const firstAvailable = categories.find((c) => !budgetedCatIds.has(c.id));
    setSelectedCategoryId(firstAvailable ? firstAvailable.id : categories[0]?.id || null);
    setAmountInput("");
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleOpenEdit(b: BudgetItem) {
    setSelectedBudget(b);
    setSelectedCategoryId(b.categoryId);
    setAmountInput(String(b.amount));
    setFormError(null);
    setIsModalOpen(true);
  }

  function handleSaveBudget() {
    if (!selectedCategoryId) {
      setFormError("Please select a category");
      return;
    }
    const parsedAmount = parseFloat(amountInput);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError("Please enter a valid positive amount");
      return;
    }

    try {
      ensureDatabaseInitialized();
      if (selectedBudget) {
        expoDb.runSync(
          `UPDATE budgets SET amount = ?, category_id = ? WHERE id = ?;`,
          [parsedAmount, selectedCategoryId, selectedBudget.id]
        );
      } else {
        // Upsert by category
        const existing = expoDb.getFirstSync<{ id: number }>(
          `SELECT id FROM budgets WHERE category_id = ?;`,
          [selectedCategoryId]
        );
        if (existing) {
          expoDb.runSync(`UPDATE budgets SET amount = ? WHERE id = ?;`, [
            parsedAmount,
            existing.id,
          ]);
        } else {
          expoDb.runSync(
            `INSERT INTO budgets (category_id, amount, period) VALUES (?, ?, 'MONTHLY');`,
            [selectedCategoryId, parsedAmount]
          );
        }
      }
      setIsModalOpen(false);
      loadBudgets();
    } catch (err) {
      console.warn("Error saving budget:", err);
      setFormError("Failed to save budget");
    }
  }

  function handleDeleteBudget() {
    if (!selectedBudget) return;
    Alert.alert(
      "Delete Budget",
      `Are you sure you want to remove the budget for ${selectedBudget.categoryName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            try {
              ensureDatabaseInitialized();
              expoDb.runSync(`DELETE FROM budgets WHERE id = ?;`, [
                selectedBudget.id,
              ]);
              setIsModalOpen(false);
              loadBudgets();
            } catch (err) {
              console.warn("Error deleting budget:", err);
            }
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-2 border-b border-dark-border/40">
        <View>
          <Text className="text-dark-text text-xl font-bold">Budgets</Text>
          <Text className="text-dark-muted text-xs font-medium mt-0.5">
            {monthLabel}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleOpenCreate}
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
        {/* Overall Monthly Budget Hero Card */}
        <View className="bg-dark-surface p-5 rounded-3xl border border-dark-border mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-brand-accent" />
              <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider">
                Monthly Target
              </Text>
            </View>
            <View className="px-2.5 py-0.5 rounded-full bg-dark-card border border-dark-border">
              <Text className="text-dark-text text-xs font-bold">
                {overallPct}% spent
              </Text>
            </View>
          </View>

          <Text className="text-dark-text text-3xl font-black tracking-tight my-1">
            {formatCurrency(
              totalSpentAmount,
              settings?.currency,
              settings?.numberFormat
            )}
            <Text className="text-dark-muted text-lg font-normal">
              {" "}
              /{" "}
              {formatCurrency(
                totalBudgetAmount,
                settings?.currency,
                settings?.numberFormat
              )}
            </Text>
          </Text>

          {/* Overall Progress Bar */}
          <View className="h-2.5 w-full bg-dark-card rounded-full overflow-hidden mt-3 mb-2 p-0.5 border border-dark-border/40">
            <View
              style={{ width: `${Math.min(100, overallPct)}%` }}
              className={`h-full rounded-full ${
                overallPct >= 100
                  ? "bg-rose-500"
                  : overallPct >= 80
                  ? "bg-amber-400"
                  : "bg-brand-accent"
              }`}
            />
          </View>

          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-dark-muted text-xs">
              {totalBudgetAmount >= totalSpentAmount
                ? `${formatCurrency(
                    totalBudgetAmount - totalSpentAmount,
                    settings?.currency,
                    settings?.numberFormat
                  )} remaining`
                : `${formatCurrency(
                    totalSpentAmount - totalBudgetAmount,
                    settings?.currency,
                    settings?.numberFormat
                  )} over budget`}
            </Text>
            <Text className="text-dark-muted text-xs">
              {budgets.length} {budgets.length === 1 ? "category" : "categories"}
            </Text>
          </View>
        </View>

        {/* Category Budgets Section */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider">
              Category Budgets ({budgets.length})
            </Text>
            <TouchableOpacity
              onPress={handleOpenCreate}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text className="text-brand-accent text-xs font-bold">
                + Set Budget
              </Text>
            </TouchableOpacity>
          </View>

          {budgets.length === 0 ? (
            <TouchableOpacity
              onPress={handleOpenCreate}
              activeOpacity={0.7}
              className="bg-dark-surface border border-dashed border-dark-border p-6 rounded-2xl items-center justify-center"
            >
              <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2.5">
                <Ionicons name="pie-chart-outline" size={22} color="#D4F938" />
              </View>
              <Text className="text-dark-text font-bold text-sm">
                No Budgets Set
              </Text>
              <Text className="text-dark-muted text-xs mt-1 text-center">
                Tap here to set a monthly spending allowance for your categories
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="space-y-3 gap-3">
              {budgets.map((b) => {
                const spent = categorySpentMap.get(b.categoryId) || 0;
                const pct =
                  b.amount > 0 ? Math.round((spent / b.amount) * 100) : 0;
                const isOver = spent > b.amount;

                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() => handleOpenEdit(b)}
                    activeOpacity={0.7}
                    className="bg-dark-surface p-4 rounded-2xl border border-dark-border"
                  >
                    <View className="flex-row items-center justify-between mb-2.5">
                      <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                          <Ionicons
                            name={(b.categoryIcon as any) || "pricetag-outline"}
                            size={18}
                            color="#F8FAFC"
                          />
                        </View>
                        <View>
                          <Text className="text-dark-text font-bold text-sm">
                            {b.categoryName}
                          </Text>
                          <Text className="text-dark-muted text-xs">
                            {isOver ? "Over Budget" : "Monthly Target"}
                          </Text>
                        </View>
                      </View>

                      <View className="items-end">
                        <Text className="text-dark-text font-bold text-sm">
                          {formatCurrency(
                            spent,
                            settings?.currency,
                            settings?.numberFormat
                          )}
                        </Text>
                        <Text className="text-dark-muted text-xs">
                          of{" "}
                          {formatCurrency(
                            b.amount,
                            settings?.currency,
                            settings?.numberFormat
                          )}
                        </Text>
                      </View>
                    </View>

                    {/* Category Progress Bar */}
                    <View className="h-2 w-full bg-dark-card rounded-full overflow-hidden mt-1 p-0.5">
                      <View
                        style={{ width: `${Math.min(100, pct)}%` }}
                        className={`h-full rounded-full ${
                          pct >= 100
                            ? "bg-rose-500"
                            : pct >= 80
                            ? "bg-amber-400"
                            : "bg-emerald-400"
                        }`}
                      />
                    </View>

                    <View className="flex-row items-center justify-between mt-2">
                      <Text
                        className={`text-[11px] font-semibold ${
                          isOver ? "text-rose-400" : "text-dark-muted"
                        }`}
                      >
                        {isOver
                          ? `${formatCurrency(
                              spent - b.amount,
                              settings?.currency,
                              settings?.numberFormat
                            )} exceeded`
                          : `${formatCurrency(
                              b.amount - spent,
                              settings?.currency,
                              settings?.numberFormat
                            )} left`}
                      </Text>
                      <Text
                        className={`text-[11px] font-bold ${
                          pct >= 100
                            ? "text-rose-400"
                            : pct >= 80
                            ? "text-amber-400"
                            : "text-emerald-400"
                        }`}
                      >
                        {pct}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Set / Edit Budget FlyUp */}
      <HawkFlyUp
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedBudget ? "Edit Budget" : "Set Category Budget"}
      >
        <View className="space-y-4 gap-4 pb-2">
          {formError ? (
            <View className="bg-rose-500/15 border border-rose-500/30 p-3 rounded-xl">
              <Text className="text-rose-400 text-xs text-center font-semibold">
                {formError}
              </Text>
            </View>
          ) : null}

          {/* Category Selector */}
          <View>
            <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider mb-2">
              Select Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="flex-row gap-2 py-1"
            >
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setSelectedCategoryId(cat.id)}
                    activeOpacity={0.8}
                    className={`flex-row items-center gap-2 px-3.5 py-2.5 rounded-2xl border mr-2 ${
                      isSelected
                        ? "bg-dark-card border-brand-accent"
                        : "bg-dark-surface border-dark-border"
                    }`}
                  >
                    <Ionicons
                      name={(cat.icon as any) || "pricetag-outline"}
                      size={16}
                      color={isSelected ? "#D4F938" : "#94A3B8"}
                    />
                    <Text
                      className={`text-xs font-bold ${
                        isSelected ? "text-brand-accent" : "text-dark-text"
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* Amount Input */}
          <View>
            <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider mb-2">
              Monthly Budget Amount
            </Text>
            <View className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3 flex-row items-center">
              <Text className="text-dark-muted font-bold text-lg mr-2">
                {getCurrencySymbol(settings?.currency)}
              </Text>
              <TextInput
                value={amountInput}
                onChangeText={setAmountInput}
                placeholder="0.00"
                placeholderTextColor="#60677C"
                keyboardType="decimal-pad"
                className="flex-1 text-dark-text font-bold text-lg"
              />
            </View>
          </View>

          {/* Actions */}
          <View className="flex-row items-center gap-3 mt-2">
            {selectedBudget ? (
              <TouchableOpacity
                onPress={handleDeleteBudget}
                className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 items-center justify-center"
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={20} color="#F43F5E" />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              onPress={handleSaveBudget}
              className="flex-1 h-12 rounded-2xl bg-brand-accent items-center justify-center active:opacity-90"
              activeOpacity={0.8}
            >
              <Text className="text-dark-bg font-bold text-base">
                {selectedBudget ? "Update Budget" : "Save Budget"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </HawkFlyUp>
    </SafeAreaView>
  );
}
