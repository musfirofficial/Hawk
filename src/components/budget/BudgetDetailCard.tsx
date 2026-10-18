import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { BudgetDetail } from "../../services/budgetService";
import { formatCurrency } from "../../services/currency";

interface BudgetDetailCardProps {
  budget: BudgetDetail;
  onEditBudget?: (budget: BudgetDetail) => void;
  onViewInsight?: (budget: BudgetDetail) => void;
  onAddNewCategory: (budgetId: number) => void;
  onCategoryQuickAdd?: (categoryId: number) => void;
  currency?: string | null;
  numberFormat?: string | null;
}

export function BudgetDetailCard({
  budget,
  onEditBudget,
  onViewInsight,
  onAddNewCategory,
  onCategoryQuickAdd,
  currency,
  numberFormat,
}: BudgetDetailCardProps) {
  const isOverBudget = budget.totalRemaining < -0.009;
  const isZeroRemainingBudget =
    !isOverBudget &&
    budget.totalBudget > 0 &&
    (budget.totalRemaining <= 0.009 ||
      (budget.totalBudget > 0 && budget.totalSpent >= budget.totalBudget));

  return (
    <View className="mb-5">
      {/* ── Budget Header ── */}
      <View className="flex-row items-center justify-between mb-2.5 px-1">
        <TouchableOpacity
          onPress={() => onViewInsight?.(budget)}
          activeOpacity={0.7}
          className="flex-row items-center gap-1.5 flex-1 mr-2"
        >
          <Text className="text-dark-text text-base font-bold tracking-tight">
            {budget.name}
          </Text>
          {onViewInsight && (
            <Ionicons name="chevron-forward" size={14} color="#60677C" />
          )}
          {onEditBudget ? (
            <TouchableOpacity
              onPress={() => onEditBudget(budget)}
              activeOpacity={0.7}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="p-1 ml-1"
            >
              <Ionicons name="pencil" size={15} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </TouchableOpacity>
        <Text
          className={`text-sm font-bold ${
            isOverBudget || isZeroRemainingBudget
              ? "text-rose-400"
              : "text-dark-text"
          }`}
        >
          {isOverBudget
            ? `${formatCurrency(Math.abs(budget.totalRemaining), currency, numberFormat)} Exceeded`
            : isZeroRemainingBudget
            ? `${formatCurrency(0, currency, numberFormat)} Left`
            : `${formatCurrency(budget.totalRemaining, currency, numberFormat)} Left`}
        </Text>
      </View>

      {/* ── Budget Card Container ── */}
      <View className="bg-dark-surface border border-dark-border rounded-3xl p-4">
        {/* Categories List */}
        {budget.categories.length === 0 ? (
          <View className="py-4 items-center justify-center">
            <Text className="text-dark-muted text-xs font-medium text-center mb-1">
              No categories added to this budget yet
            </Text>
          </View>
        ) : (
          <View className="space-y-4 gap-4">
            {budget.categories.map((cat) => {
              const clampedPct = Math.min(100, Math.max(0, cat.progressPercent));
              // Category progress bar: <75% green, 75-99% orange, >=100% red
              const progressBgClass =
                cat.isExceeded || cat.progressPercent >= 100
                  ? "bg-rose-500"
                  : cat.progressPercent >= 75
                  ? "bg-amber-500"
                  : "bg-emerald-500";

              const isZeroRemaining =
                !cat.isExceeded &&
                (cat.remainingAmount <= 0.009 || cat.progressPercent >= 100);

              return (
                <View
                  key={cat.id}
                  className="flex-row items-center justify-between"
                >
                  {/* Left: Category Icon Badge */}
                  <View className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                    <Ionicons
                      name={(cat.categoryIcon as any) || "pricetag-outline"}
                      size={18}
                      color="#F8FAFC"
                    />
                  </View>

                  {/* Center: Title + Progress Bar + Subtext */}
                  <View className="flex-1 mx-3">
                    {/* Line 1: Category Name */}
                    <Text
                      className="text-dark-text font-bold text-sm mb-1.5"
                      numberOfLines={1}
                    >
                      {cat.categoryName}
                    </Text>

                    {/* Line 2: Progress Bar */}
                    <View className="h-1.5 w-full bg-dark-card rounded-full overflow-hidden mb-1.5">
                      <View
                        style={{ width: `${clampedPct}%` }}
                        className={`h-full rounded-full ${progressBgClass}`}
                      />
                    </View>

                    {/* Line 3: Left (Remaining / Exceeded / 0 Left) & Right (Total) */}
                    <View className="flex-row items-center justify-between">
                      {cat.isExceeded ? (
                        <View className="flex-row items-center">
                          <Ionicons
                            name="warning"
                            size={11}
                            color="#F43F5E"
                            style={{ marginRight: 3 }}
                          />
                          <Text className="text-rose-400 font-medium text-[11px]">
                            {formatCurrency(
                              Math.abs(cat.remainingAmount),
                              currency,
                              numberFormat
                            )}{" "}
                            exceeded
                          </Text>
                        </View>
                      ) : isZeroRemaining ? (
                        <Text className="text-rose-400 font-medium text-[11px]">
                          {formatCurrency(0, currency, numberFormat)} Left
                        </Text>
                      ) : (
                        <Text className="text-dark-muted font-medium text-[11px]">
                          {formatCurrency(
                            cat.remainingAmount,
                            currency,
                            numberFormat
                          )}{" "}
                          Left
                        </Text>
                      )}

                      <Text className="text-dark-muted font-medium text-[11px]">
                        {formatCurrency(
                          cat.budgetAmount,
                          currency,
                          numberFormat
                        )}{" "}
                        Total
                      </Text>
                    </View>
                  </View>

                  {/* Right: Plus Button for Quick Transaction */}
                  <TouchableOpacity
                    onPress={() => onCategoryQuickAdd?.(cat.categoryId)}
                    activeOpacity={0.7}
                    className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center active:border-brand-accent"
                  >
                    <Ionicons name="add" size={16} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* ── Bottom: Add New Category Button ── */}
        <TouchableOpacity
          onPress={() => onAddNewCategory(budget.id)}
          activeOpacity={0.7}
          className="flex-row items-center justify-center pt-4 mt-2 border-t border-dark-border/60"
        >
          <Ionicons name="add" size={16} color="#D4F938" />
          <Text className="text-brand-accent font-bold text-xs ml-1">
            Add New Category
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default BudgetDetailCard;
