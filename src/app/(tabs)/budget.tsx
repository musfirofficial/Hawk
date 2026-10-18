import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useSafeRouter } from "../../hooks/useSafeRouter";
import { addDatabaseChangeListener } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BudgetDetailCard } from "../../components/budget/BudgetDetailCard";
import { BudgetHeroPie } from "../../components/budget/BudgetHeroPie";
import { Calendar, formatDisplayMonth } from "../../components/calendar";
import { HawkFlyUp } from "../../components/HawkFlyUp";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { useCategories } from "../../context/categories";
import {
  addCategoryToExistingBudget,
  copyMonthBudgets,
  getAssignedCategoryIdsForMonth,
  getMonthBudgetSummary,
  getPreviousMonthYMD,
  getSavedTemplateMonths,
  MonthBudgetSummary,
  MonthSummaryItem,
} from "../../services/budgetService";
import { formatCurrency, getCurrencySymbol } from "../../services/currency";

export default function BudgetScreen() {
  const router = useSafeRouter();
  const { settings } = useAuth();
  const { categories } = useCategories();
  const { showAlert, showConfirm } = useAlert();

  // Selected Month 'YYYY-MM'
  const currentMonthYMD = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthYMD);
  const [tempSelectedMonth, setTempSelectedMonth] = useState(currentMonthYMD);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);

  // Import template flyup state
  const [isImportFlyUpOpen, setIsImportFlyUpOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState<MonthSummaryItem[]>([]);
  const [prevMonthSummary, setPrevMonthSummary] =
    useState<MonthBudgetSummary | null>(null);

  // Budget summary data for selected month
  const [summary, setSummary] = useState<MonthBudgetSummary>({
    month: currentMonthYMD,
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    overallProgressPercent: 0,
    budgets: [],
    topCategories: [],
  });

  // Add Category to existing budget modal state
  const [addCatBudgetId, setAddCatBudgetId] = useState<number | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [addCatAmount, setAddCatAmount] = useState("");
  const [addCatError, setAddCatError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    try {
      const data = getMonthBudgetSummary(selectedMonth);
      setSummary(data);
    } catch (err) {
      console.warn("Failed to load budget summary:", err);
    }
  }, [selectedMonth]);

  // Load whenever screen focuses or month changes
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // Real-time listener on SQLite database changes
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    try {
      sub = addDatabaseChangeListener(() => {
        loadData();
      });
    } catch {}
    return () => {
      sub?.remove();
    };
  }, [loadData]);

  const monthLabel = useMemo(() => {
    return formatDisplayMonth(`${selectedMonth}-01`);
  }, [selectedMonth]);

  // Expense categories available to add into the target budget
  const availableCategoriesForBudget = useMemo(() => {
    if (!addCatBudgetId) return [];
    const targetBudget = summary.budgets.find((b) => b.id === addCatBudgetId);
    const existingInTargetIds = new Set(
      targetBudget ? targetBudget.categories.map((c) => c.categoryId) : [],
    );
    const assignedToOtherBudgetsIds = new Set(
      getAssignedCategoryIdsForMonth(selectedMonth, addCatBudgetId),
    );
    return categories.filter(
      (c) =>
        c.type === "EXPENSE" &&
        !existingInTargetIds.has(c.id) &&
        !assignedToOtherBudgetsIds.has(c.id),
    );
  }, [addCatBudgetId, categories, selectedMonth, summary.budgets]);

  function handleOpenAddCategory(budgetId: number) {
    setAddCatBudgetId(budgetId);
    setSelectedCatId(null);
    setAddCatAmount("");
    setAddCatError(null);
  }

  function handleSaveNewCategory() {
    if (!addCatBudgetId) return;
    if (!selectedCatId) {
      setAddCatError("Please choose a category");
      return;
    }
    const parsed = parseFloat(addCatAmount);
    if (isNaN(parsed) || parsed <= 0) {
      setAddCatError("Please enter a valid amount");
      return;
    }

    try {
      addCategoryToExistingBudget(addCatBudgetId, selectedCatId, parsed);
      setAddCatBudgetId(null);
      loadData();
    } catch (err: any) {
      console.warn("Failed to add category to budget:", err);
      setAddCatError(
        err?.message?.includes("UNIQUE")
          ? "This category is already assigned to a budget this month."
          : "Failed to add category",
      );
    }
  }

  function handleCategoryQuickAdd(categoryId: number) {
    // Quick record expense transaction with this category
    router.push({
      pathname: "/(transaction)/create" as any,
      params: { categoryId: String(categoryId), type: "EXPENSE" },
    });
  }

  function handlePressImport() {
    if (summary.budgets.length > 0) {
      showAlert({
        title: "Budget Already Configured",
        message:
          "You already have budgets configured for this month. Templates can only be imported into months without existing budgets.",
        type: "warning",
        buttonText: "Got It",
      });
      return;
    }

    // Load previous month summary and saved templates
    const prevMonth = getPreviousMonthYMD(selectedMonth);
    const pSummary = getMonthBudgetSummary(prevMonth);
    setPrevMonthSummary(pSummary);

    const templates = getSavedTemplateMonths().filter(
      (t) => t.month !== selectedMonth,
    );
    setSavedTemplates(templates);

    setIsImportFlyUpOpen(true);
  }

  function handleSelectTemplateToApply(sourceMonth: string) {
    const sourceLabel = formatDisplayMonth(`${sourceMonth}-01`);
    const targetLabel = formatDisplayMonth(`${selectedMonth}-01`);

    showConfirm({
      title: "Apply Budget Template",
      message: `Apply ${sourceLabel} budgets to ${targetLabel}? This will create all budgets and category allocations for this month.`,
      type: "info",
      confirmText: "Apply",
      cancelText: "Cancel",
      isDestructive: false,
      onConfirm: () => {
        try {
          copyMonthBudgets(sourceMonth, selectedMonth);
          setIsImportFlyUpOpen(false);
          loadData();
        } catch (err) {
          console.warn("Failed to apply budget template:", err);
          showAlert({
            title: "Error",
            message: "Failed to apply budget template. Please try again.",
            type: "danger",
          });
        }
      },
    });
  }

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        className="flex-1 px-5 pt-3"
      >
        {/* Title at top in scrollable view (centered with more bottom margin) */}
        <View className="pt-2 pb-5 items-center justify-center">
          <Text className="text-dark-text text-xl font-bold text-center">
            Budgets
          </Text>
        </View>

        {/* ── Hero Section (Image 1): Month picker, big donut ring, bulb & add buttons, 5 mini pies ── */}
        <BudgetHeroPie
          monthLabel={monthLabel}
          onOpenMonthPicker={() => {
            setTempSelectedMonth(selectedMonth);
            setIsMonthPickerOpen(true);
          }}
          onOpenCreateBudget={() =>
            router.push({
              pathname: "/createbudget" as any,
              params: { month: selectedMonth },
            })
          }
          onOpenBudgetSummary={() => router.push("/budgetsummary" as any)}
          onOpenImportTemplate={handlePressImport}
          remainingAmount={summary.totalRemaining}
          totalBudget={summary.totalBudget}
          progressPercent={summary.overallProgressPercent}
          topCategories={summary.topCategories}
          currency={settings?.currency}
          numberFormat={settings?.numberFormat}
        />

        {/* ── Detailed Budgets List (Image 2) ── */}
        {summary.budgets.length === 0 ? (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: "/createbudget" as any,
                params: { month: selectedMonth },
              })
            }
            activeOpacity={0.7}
            className="bg-dark-surface border border-dashed border-dark-border p-8 rounded-3xl items-center justify-center mt-2"
          >
            <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-3">
              <Ionicons name="pie-chart-outline" size={24} color="#ffffff" />
            </View>
            <Text className="text-dark-text font-bold text-base">
              No Budgets for {monthLabel}
            </Text>
            <Text className="text-dark-muted text-xs mt-1 text-center font-medium max-w-xs">
              Tap here or the &quot;+&quot; button above to create a budget with
              allocated expense categories
            </Text>
          </TouchableOpacity>
        ) : (
          summary.budgets.map((b) => (
            <BudgetDetailCard
              key={b.id}
              budget={b}
              onEditBudget={(budget) => {
                router.push({
                  pathname: "/createbudget" as any,
                  params: { id: String(budget.id), month: selectedMonth },
                });
              }}
              onViewInsight={(budget) => {
                router.push(`/budget/${budget.id}` as any);
              }}
              onAddNewCategory={handleOpenAddCategory}
              onCategoryQuickAdd={handleCategoryQuickAdd}
              currency={settings?.currency}
              numberFormat={settings?.numberFormat}
            />
          ))
        )}
      </ScrollView>

      {/* ── Month Picker FlyUp with Select Button at bottom ── */}
      <HawkFlyUp
        visible={isMonthPickerOpen}
        onClose={() => setIsMonthPickerOpen(false)}
        title="Select Month"
      >
        <View className="pb-4">
          <Calendar
            value={`${tempSelectedMonth}-01`}
            mode="month-only"
            onChange={(ymd) => setTempSelectedMonth(ymd.slice(0, 7))}
          />
          <View className="h-3" />
          <TouchableOpacity
            onPress={() => {
              setSelectedMonth(tempSelectedMonth);
              setIsMonthPickerOpen(false);
            }}
            activeOpacity={0.8}
            className="w-full h-12 rounded-2xl items-center justify-center bg-brand-accent active:opacity-90 shadow-md"
          >
            <Text className="text-dark-bg font-extrabold text-sm">
              Select Month
            </Text>
          </TouchableOpacity>
        </View>
      </HawkFlyUp>

      {/* ── Add Category to Existing Budget FlyUp ── */}
      <HawkFlyUp
        visible={addCatBudgetId != null}
        onClose={() => setAddCatBudgetId(null)}
        title="Add Category to Budget"
      >
        <View className="space-y-4 gap-4 pb-4">
          {addCatError ? (
            <View className="bg-rose-500/15 border border-rose-500/30 p-3 rounded-xl">
              <Text className="text-rose-400 text-xs text-center font-bold">
                {addCatError}
              </Text>
            </View>
          ) : null}

          {/* Select Category */}
          <View>
            <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
              Select Category
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="py-1"
            >
              {availableCategoriesForBudget.length === 0 ? (
                <Text className="text-dark-muted text-xs font-medium py-2">
                  All available expense categories are already in this budget.
                </Text>
              ) : (
                availableCategoriesForBudget.map((cat) => {
                  const isSelected = selectedCatId === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      onPress={() => setSelectedCatId(cat.id)}
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
                })
              )}
            </ScrollView>
          </View>

          {/* Amount Input */}
          <View>
            <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
              Budget Allocation Amount
            </Text>
            <View className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3 flex-row items-center">
              <Text className="text-dark-muted font-bold text-lg mr-2">
                {getCurrencySymbol(settings?.currency)}
              </Text>
              <TextInput
                value={addCatAmount}
                onChangeText={setAddCatAmount}
                placeholder="0.00"
                placeholderTextColor="#60677C"
                keyboardType="decimal-pad"
                className="flex-1 text-dark-text font-bold text-lg p-0"
              />
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleSaveNewCategory}
            activeOpacity={0.8}
            className="h-13 py-3.5 rounded-2xl bg-brand-accent items-center justify-center mt-2 shadow-md active:opacity-90"
          >
            <Text className="text-dark-bg font-extrabold text-base">
              Add Category
            </Text>
          </TouchableOpacity>
        </View>
      </HawkFlyUp>

      {/* ── Import Template FlyUp ── */}
      <HawkFlyUp
        visible={isImportFlyUpOpen}
        onClose={() => setIsImportFlyUpOpen(false)}
        title="Import Budget"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          className="pb-4"
        >
          {/* ── 1. Copy Previous Month (Always shown first) ── */}
          <Text className="text-dark-muted text-xs font-bold  tracking-wider mb-2.5">
            Quick Copy
          </Text>
          {prevMonthSummary && prevMonthSummary.budgets.length > 0 ? (
            <TouchableOpacity
              onPress={() =>
                handleSelectTemplateToApply(prevMonthSummary.month)
              }
              activeOpacity={0.7}
              className="bg-dark-surface border border-dark-border rounded-2xl p-4 mb-6 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-3 flex-1 mr-2">
                <View className="flex-1">
                  <Text className="text-dark-text font-bold text-sm">
                    Copy Previous Month
                  </Text>
                  <Text className="text-dark-muted text-xs font-medium mt-0.5">
                    {formatDisplayMonth(`${prevMonthSummary.month}-01`)} •{" "}
                    {prevMonthSummary.budgets.length}{" "}
                    {prevMonthSummary.budgets.length === 1
                      ? "budget"
                      : "budgets"}{" "}
                    (
                    {formatCurrency(
                      prevMonthSummary.totalBudget,
                      settings?.currency,
                      settings?.numberFormat,
                    )}
                    )
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : (
            <View className="bg-dark-surface border border-dashed border-dark-border/60 rounded-2xl p-4 mb-6">
              <Text className="text-dark-muted text-xs font-medium text-center">
                No budgets configured in previous month (
                {formatDisplayMonth(`${getPreviousMonthYMD(selectedMonth)}-01`)}
                ).
              </Text>
            </View>
          )}

          {/* ── 2. Saved Templates ── */}
          <Text className="text-dark-muted text-xs font-bold  tracking-wider mb-2.5">
            Saved Templates
          </Text>
          {savedTemplates.length === 0 ? (
            <View className="bg-dark-surface border border-dashed border-dark-border/60 rounded-2xl p-5 items-center justify-center">
              <Ionicons name="bookmark-outline" size={22} color="#94A3B8" />
              <Text className="text-dark-text font-bold text-xs mt-2">
                No Saved Templates Yet
              </Text>
              <Text className="text-dark-muted text-[11px] font-medium text-center mt-1">
                Open any month in Budget Insight and check &quot;Save this month
                as template&quot;.
              </Text>
            </View>
          ) : (
            savedTemplates.map((tpl) => (
              <TouchableOpacity
                key={tpl.month}
                onPress={() => handleSelectTemplateToApply(tpl.month)}
                activeOpacity={0.7}
                className="bg-dark-surface border border-dark-border rounded-2xl p-4 mb-2.5 flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3 flex-1 mr-2">
                  <View className="flex-1">
                    <Text className="text-dark-text font-bold text-sm">
                      {formatDisplayMonth(`${tpl.month}-01`)} Template
                    </Text>
                    <Text className="text-dark-muted text-xs font-medium mt-0.5">
                      {tpl.budgetCount}{" "}
                      {tpl.budgetCount === 1 ? "budget" : "budgets"} •{" "}
                      {formatCurrency(
                        tpl.totalBudget,
                        settings?.currency,
                        settings?.numberFormat,
                      )}{" "}
                      allocated
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </HawkFlyUp>
    </SafeAreaView>
  );
}
