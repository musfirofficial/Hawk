import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { useCategories } from "../../context/categories";
import {
  BudgetDetail,
  checkBudgetExistsForMonth,
  createBudgetWithCategories,
  getAssignedCategoryIdsForMonth,
  updateBudgetWithCategories,
} from "../../services/budgetService";
import { getCurrencySymbol } from "../../services/currency";
import { Calendar, formatDisplayMonth } from "../calendar";
import { HawkFlyUp } from "../HawkFlyUp";

export interface CategoryAllocationInput {
  categoryId: number;
  categoryName: string;
  categoryIcon: string | null;
  amount: string;
}

interface BudgetFormProps {
  mode: "create" | "edit";
  initialBudget?: BudgetDetail | null;
  defaultMonth?: string;
  onSuccess: () => void;
  onCancel?: () => void;
}

export function BudgetForm({
  mode,
  initialBudget,
  defaultMonth,
  onSuccess,
  onCancel,
}: BudgetFormProps) {
  const { settings } = useAuth();
  const { categories } = useCategories();

  // Current month default 'YYYY-MM'
  const fallbackMonth = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  }, []);

  const [budgetName, setBudgetName] = useState(initialBudget?.name || "");
  const [selectedMonth, setSelectedMonth] = useState(
    initialBudget?.month || defaultMonth || fallbackMonth,
  );

  // Month Picker FlyUp state
  const [isMonthFlyUpOpen, setIsMonthFlyUpOpen] = useState(false);
  const [tempMonth, setTempMonth] = useState(selectedMonth);
  const [monthError, setMonthError] = useState<string | null>(null);

  // Allocated categories state
  const [allocatedCategories, setAllocatedCategories] = useState<
    CategoryAllocationInput[]
  >(
    initialBudget?.categories.map((c) => ({
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      categoryIcon: c.categoryIcon,
      amount: String(c.budgetAmount),
    })) || [],
  );

  const [isCategoryFlyUpOpen, setIsCategoryFlyUpOpen] = useState(false);
  const [isTemplate, setIsTemplate] = useState<boolean>(
    initialBudget?.template ?? false,
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // All Expense categories
  const expenseCategories = useMemo(() => {
    return categories.filter((c) => c.type === "EXPENSE");
  }, [categories]);

  // Category IDs already assigned to ANY OTHER budget in the selected month
  const assignedOtherCategoryIds = useMemo(() => {
    return new Set(
      getAssignedCategoryIdsForMonth(selectedMonth, initialBudget?.id),
    );
  }, [selectedMonth, initialBudget?.id]);

  // Available categories for this budget: expense type, not already in form, not in another budget this month
  const availableCategories = useMemo(() => {
    const inFormIds = new Set(allocatedCategories.map((a) => a.categoryId));
    return expenseCategories.filter((c) => !inFormIds.has(c.id));
  }, [expenseCategories, allocatedCategories]);

  const monthDisplayLabel = useMemo(() => {
    return formatDisplayMonth(`${selectedMonth}-01`);
  }, [selectedMonth]);

  const tempMonthDisplayLabel = useMemo(() => {
    return formatDisplayMonth(`${tempMonth}-01`);
  }, [tempMonth]);

  // Open Month Picker
  function handleOpenMonthPicker() {
    setTempMonth(selectedMonth);
    setMonthError(null);
    setIsMonthFlyUpOpen(true);
  }

  // When picking a month on calendar inside flyup
  function handleTempMonthChange(ymd: string) {
    const pickedMonth = ymd.slice(0, 7);
    setTempMonth(pickedMonth);
    setMonthError(null);
  }

  // Confirm month selection in flyup (when user taps Select Month / Apply)
  function handleConfirmMonth() {
    // 1. Check if budget name already exists in target month
    if (budgetName.trim()) {
      const exists = checkBudgetExistsForMonth(
        budgetName,
        tempMonth,
        initialBudget?.id,
      );
      if (exists) {
        setMonthError(
          `A budget named "${budgetName.trim()}" already exists for ${tempMonthDisplayLabel}.`,
        );
        return;
      }
    }

    // 2. Check if any assigned categories conflict with other budgets in target month
    const otherAssignedCatIds = new Set(
      getAssignedCategoryIdsForMonth(tempMonth, initialBudget?.id),
    );
    const conflicting = allocatedCategories.find((c) =>
      otherAssignedCatIds.has(c.categoryId),
    );
    if (conflicting) {
      setMonthError(
        `Category "${conflicting.categoryName}" is already assigned to a budget in ${tempMonthDisplayLabel}.`,
      );
      return;
    }

    setSelectedMonth(tempMonth);
    setMonthError(null);
    setIsMonthFlyUpOpen(false);
  }

  const { showAlert } = useAlert();

  function handleSelectCategory(cat: (typeof categories)[0]) {
    // Check if category is already assigned to another budget in this month
    if (assignedOtherCategoryIds.has(cat.id)) {
      showAlert({
        title: "Category Already Budgeted",
        message: `"${cat.name}" is already assigned to another budget in ${monthDisplayLabel}. In a given month, a category can only belong to one budget.`,
      });
      return;
    }

    setAllocatedCategories((prev) => [
      ...prev,
      {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryIcon: cat.icon,
        amount: "",
      },
    ]);
    setIsCategoryFlyUpOpen(false);
  }

  function handleRemoveCategory(categoryId: number) {
    setAllocatedCategories((prev) =>
      prev.filter((c) => c.categoryId !== categoryId),
    );
  }

  function handleAmountChange(categoryId: number, text: string) {
    setAllocatedCategories((prev) =>
      prev.map((c) =>
        c.categoryId === categoryId ? { ...c, amount: text } : c,
      ),
    );
  }

  function handleSubmit() {
    setFormError(null);

    const trimmedName = budgetName.trim();
    if (!trimmedName) {
      setFormError("Please enter a budget name");
      return;
    }

    // Check duplicate name in selected month
    const isDuplicate = checkBudgetExistsForMonth(
      trimmedName,
      selectedMonth,
      initialBudget?.id,
    );
    if (isDuplicate) {
      setFormError(
        `A budget named "${trimmedName}" already exists for ${monthDisplayLabel}.`,
      );
      return;
    }

    if (allocatedCategories.length === 0) {
      setFormError("Please add at least one category to this budget");
      return;
    }

    const validCategories: { categoryId: number; amount: number }[] = [];
    for (const cat of allocatedCategories) {
      const parsed = parseFloat(cat.amount);
      if (isNaN(parsed) || parsed <= 0) {
        setFormError(`Please enter a valid amount for ${cat.categoryName}`);
        return;
      }
      validCategories.push({
        categoryId: cat.categoryId,
        amount: parsed,
      });
    }

    setIsSubmitting(true);
    try {
      if (mode === "create") {
        createBudgetWithCategories({
          name: trimmedName,
          month: selectedMonth,
          template: isTemplate,
          categories: validCategories,
        });
      } else if (mode === "edit" && initialBudget) {
        updateBudgetWithCategories(initialBudget.id, {
          name: trimmedName,
          month: selectedMonth,
          template: isTemplate,
          categories: validCategories,
        });
      }
      onSuccess();
    } catch (err: any) {
      console.error("Budget save error:", err);
      setFormError(
        err?.message?.includes("UNIQUE")
          ? "One of the selected categories is already assigned to another budget this month."
          : "Failed to save budget. Please check your entries.",
      );
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-5 pt-3"
      >
        {formError ? (
          <View className="bg-rose-500/15 border border-rose-500/30 p-3.5 rounded-2xl mb-4">
            <Text className="text-rose-400 text-xs text-center font-bold">
              {formError}
            </Text>
          </View>
        ) : null}

        {/* ── 1. Budget Name (matching height h-14) ── */}
        <View className="mb-4">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
            Budget Name
          </Text>
          <View className="h-14 bg-dark-card border border-dark-border rounded-2xl px-4 justify-center">
            <TextInput
              value={budgetName}
              onChangeText={setBudgetName}
              placeholder="e.g. Housing, Utilities, Living Costs"
              placeholderTextColor="#60677C"
              className="text-dark-text font-bold text-base p-0"
            />
          </View>
        </View>

        {/* ── 2. Target Month (matching height h-14) ── */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
            Target Month
          </Text>
          <TouchableOpacity
            onPress={handleOpenMonthPicker}
            activeOpacity={0.7}
            className="h-14 bg-dark-card border border-dark-border rounded-2xl px-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center">
              <Ionicons
                name="calendar-outline"
                size={18}
                color="#94A3B8"
                style={{ marginRight: 10 }}
              />
              <Text className="text-dark-text font-bold text-base">
                {monthDisplayLabel}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={16} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* ── 3. Category Allocations ── */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider">
              Categories ({allocatedCategories.length})
            </Text>
            <TouchableOpacity
              onPress={() => setIsCategoryFlyUpOpen(true)}
              activeOpacity={0.7}
              className="flex-row items-center bg-dark-card border border-dark-border px-3.5 py-2.5 rounded-xl"
            >
              <Ionicons name="add" size={16} color="#D4F938" />
              <Text className="text-brand-accent text-xs font-bold ml-1">
                Add Category
              </Text>
            </TouchableOpacity>
          </View>

          {allocatedCategories.length === 0 ? (
            <TouchableOpacity
              onPress={() => setIsCategoryFlyUpOpen(true)}
              activeOpacity={0.7}
              className="bg-dark-surface border border-dashed border-dark-border p-8 rounded-3xl items-center justify-center"
            >
              <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2.5">
                <Ionicons name="pricetag-outline" size={22} color="#D4F938" />
              </View>
              <Text className="text-dark-text font-bold text-sm">
                No Categories Added
              </Text>
              <Text className="text-dark-muted text-xs mt-1 text-center font-medium">
                Tap &quot;Add Category&quot; to assign expense categories and
                allocate amounts
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="space-y-3 gap-3">
              {allocatedCategories.map((item) => (
                <View
                  key={item.categoryId}
                  className="bg-dark-surface border border-dark-border rounded-2xl p-4 flex-row items-center justify-between"
                >
                  {/* Left: Icon & Name */}
                  <View className="flex-row items-center flex-1 mr-3">
                    <View className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center mr-3">
                      <Ionicons
                        name={(item.categoryIcon as any) || "pricetag-outline"}
                        size={18}
                        color="#F8FAFC"
                      />
                    </View>
                    <Text
                      className="text-dark-text font-bold text-sm flex-1"
                      numberOfLines={1}
                    >
                      {item.categoryName}
                    </Text>
                  </View>

                  {/* Middle: Amount Input */}
                  <View className="bg-dark-card border border-dark-border rounded-xl px-3 py-2 flex-row items-center w-32 mr-2.5">
                    <Text className="text-dark-muted font-bold text-xs mr-1">
                      {getCurrencySymbol(settings?.currency)}
                    </Text>
                    <TextInput
                      value={item.amount}
                      onChangeText={(t) =>
                        handleAmountChange(item.categoryId, t)
                      }
                      placeholder="0.00"
                      placeholderTextColor="#60677C"
                      keyboardType="decimal-pad"
                      className="flex-1 text-dark-text font-bold text-sm p-0"
                    />
                  </View>

                  {/* Right: Remove Button */}
                  <TouchableOpacity
                    onPress={() => handleRemoveCategory(item.categoryId)}
                    activeOpacity={0.7}
                    className="w-8 h-8 rounded-full bg-rose-500/10 border border-rose-500/20 items-center justify-center"
                  >
                    <Ionicons name="trash-outline" size={15} color="#F43F5E" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* ── Fixed Bottom Button: Create Budget / Save Changes ── */}
      <View className="px-5 py-3 border-t border-dark-border/40 bg-dark-bg">
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={isSubmitting}
          activeOpacity={0.8}
          className="w-full h-14 rounded-2xl bg-brand-accent items-center justify-center shadow-lg active:opacity-90"
        >
          <Text className="text-dark-bg font-extrabold text-base">
            {isSubmitting
              ? "Saving..."
              : mode === "create"
                ? "Create Budget"
                : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Month Picker FlyUp with Select Button & Error at Bottom ── */}
      <HawkFlyUp
        visible={isMonthFlyUpOpen}
        onClose={() => setIsMonthFlyUpOpen(false)}
        title="Select Target Month"
      >
        <View className="pb-4">
          <Calendar
            value={`${tempMonth}-01`}
            mode="month-only"
            onChange={handleTempMonthChange}
          />

          {/* Error shown above button if selected month already has a budget with this name */}
          {monthError ? (
            <View className="bg-rose-500/15 border border-rose-500/30 px-3.5 py-2.5 rounded-xl mt-3 mb-2">
              <Text className="text-rose-400 font-bold text-xs text-center">
                {monthError}
              </Text>
            </View>
          ) : (
            <View className="h-3" />
          )}

          {/* Select Button at bottom of flyup */}
          <TouchableOpacity
            onPress={handleConfirmMonth}
            activeOpacity={0.8}
            className="w-full h-12 rounded-2xl items-center justify-center bg-brand-accent active:opacity-90 shadow-md"
          >
            <Text className="text-dark-bg font-extrabold text-sm">
              Select Month
            </Text>
          </TouchableOpacity>
        </View>
      </HawkFlyUp>

      {/* ── Category Picker FlyUp (Expense only & unassigned in this month) ── */}
      <HawkFlyUp
        visible={isCategoryFlyUpOpen}
        onClose={() => setIsCategoryFlyUpOpen(false)}
        title="Select Category"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          className="max-h-96 pb-4"
        >
          {availableCategories.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Text className="text-dark-muted font-medium text-sm text-center">
                All available expense categories have already been added.
              </Text>
            </View>
          ) : (
            <View className="space-y-2 gap-2">
              {availableCategories.map((cat) => {
                const isAssignedToOther = assignedOtherCategoryIds.has(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => handleSelectCategory(cat)}
                    activeOpacity={0.7}
                    className={`bg-dark-card border p-3.5 rounded-2xl flex-row items-center justify-between ${
                      isAssignedToOther
                        ? "border-dark-border/40 opacity-50"
                        : "border-dark-border"
                    }`}
                  >
                    <View className="flex-row items-center flex-1 mr-2">
                      <View className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center mr-3">
                        <Ionicons
                          name={(cat.icon as any) || "pricetag-outline"}
                          size={18}
                          color={isAssignedToOther ? "#60677C" : "#D4F938"}
                        />
                      </View>
                      <View className="flex-1">
                        <Text className="text-dark-text font-bold text-sm">
                          {cat.name}
                        </Text>
                        {isAssignedToOther ? (
                          <Text className="text-rose-400 font-medium text-[10px] mt-0.5">
                            Assigned to another budget this month
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <Ionicons
                      name={
                        isAssignedToOther ? "lock-closed" : "add-circle-outline"
                      }
                      size={20}
                      color={isAssignedToOther ? "#60677C" : "#D4F938"}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </HawkFlyUp>
    </KeyboardAvoidingView>
  );
}

export default BudgetForm;
