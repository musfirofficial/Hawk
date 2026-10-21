import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDatabaseChangeListener } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDisplayMonth } from "../../components/calendar";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useAuth } from "../../context/auth";
import {
  BudgetDetail,
  getMonthBudgetSummary,
  isMonthTemplate,
  MonthBudgetSummary,
  setMonthTemplate,
} from "../../services/budgetService";
import { formatCurrency } from "../../services/currency";

// Distinct palette for category segments & dots matching the reference design
const SEGMENT_COLORS = [
  "#22C55E", // Green
  "#F43F5E", // Red
  "#F59E0B", // Amber
  "#38BDF8", // Sky Blue
  "#A855F7", // Purple
  "#E2E8F0", // Slate / Other
  "#14B8A6", // Teal
  "#EC4899", // Pink
];

interface BudgetBreakdownCardProps {
  budget: BudgetDetail;
  monthName: string;
  currency?: string | null;
  numberFormat?: string | null;
}

function BudgetBreakdownCard({
  budget,
  monthName,
  currency,
  numberFormat,
}: BudgetBreakdownCardProps) {
  const totalAllocated = budget.totalBudget || 1;
  const isBudgetExceeded = budget.totalSpent > budget.totalBudget;

  return (
    <View className="bg-dark-surface border border-dark-border rounded-3xl p-5 mb-5 shadow-sm">
      {/* ── Card Header: Name on left, allocated & spent next to it on right (No Pencils) ── */}
      <View className="flex-row items-center justify-between mb-1.5">
        {/* Left: Icon + Budget Name */}
        <View className="flex-row items-center gap-2.5 flex-1 mr-3">
          <Text
            className="text-dark-text font-bold text-base tracking-tight"
            numberOfLines={1}
          >
            {budget.name || "Budget"}
          </Text>
        </View>

        {/* Right: How much allocated and spent next to it like categories */}
        <View className="items-end">
          {(() => {
            const budgetPct =
              budget.totalBudget > 0
                ? (budget.totalSpent / budget.totalBudget) * 100
                : 0;
            const isBudgetRed = isBudgetExceeded || budgetPct >= 100;
            const isBudgetOrange = !isBudgetRed && budgetPct >= 75;
            const budgetTextClass = isBudgetRed
              ? "text-rose-400"
              : isBudgetOrange
              ? "text-amber-400"
              : "text-emerald-400";

            return (
              <Text className={`text-sm font-bold tracking-tight ${budgetTextClass}`}>
                {formatCurrency(budget.totalSpent, currency, numberFormat)} /{" "}
                {formatCurrency(budget.totalBudget, currency, numberFormat)}
              </Text>
            );
          })()}
        </View>
      </View>

      {/* Subtitle description */}
      <Text className="text-dark-muted text-xs font-medium mb-4 leading-4">
        Here's a summary of your budget breakdown so far on {monthName}
      </Text>

      {/* ── Segmented Progress Bar (matching image) ── */}
      {budget.categories.length > 0 ? (
        <View className="flex-row h-2 rounded-full overflow-hidden mb-5 gap-1 bg-dark-bg/60 p-0.5">
          {budget.categories.map((cat) => {
            const flexWeight = Math.max(
              1,
              Math.round((cat.budgetAmount / totalAllocated) * 100),
            );
            const pct =
              cat.budgetAmount > 0
                ? (cat.spentAmount / cat.budgetAmount) * 100
                : 0;
            const segmentColor =
              pct >= 100 || cat.isExceeded
                ? "#F43F5E"
                : pct >= 75
                ? "#F59E0B"
                : "#22C55E";

            return (
              <View
                key={cat.id || cat.categoryId}
                style={{ flex: flexWeight, backgroundColor: segmentColor }}
                className="h-full rounded-full"
              />
            );
          })}
        </View>
      ) : (
        <View className="h-2 rounded-full bg-dark-border/60 mb-5" />
      )}

      {/* ── Category Rows (matching image) ── */}
      {budget.categories.length === 0 ? (
        <View className="py-4 items-center justify-center">
          <Text className="text-dark-muted text-xs font-medium">
            No categories allocated to this budget.
          </Text>
        </View>
      ) : (
        <View>
          {budget.categories.map((cat, idx) => {
            const pct =
              cat.budgetAmount > 0
                ? (cat.spentAmount / cat.budgetAmount) * 100
                : 0;
            const isRed = pct >= 100 || cat.isExceeded;
            const isOrange = !isRed && pct >= 75;

            const color = isRed
              ? "#F43F5E"
              : isOrange
              ? "#F59E0B"
              : "#22C55E";

            const textClass = isRed
              ? "text-rose-400"
              : isOrange
              ? "text-amber-400"
              : "text-emerald-400";

            const isLast = idx === budget.categories.length - 1;

            return (
              <View
                key={cat.id || cat.categoryId}
                className={`flex-row items-center justify-between py-3.5 ${
                  !isLast ? "border-b border-dark-border/40" : ""
                }`}
              >
                {/* Left: colored square dot + Category Name */}
                <View className="flex-row items-center gap-3 flex-1 mr-3">
                  <View
                    style={{ backgroundColor: color }}
                    className="w-2.5 h-2.5 rounded-sm"
                  />
                  <Text
                    className="text-dark-text font-bold text-sm tracking-tight"
                    numberOfLines={1}
                  >
                    {cat.categoryName}
                  </Text>
                </View>

                {/* Right: spent / allocated ratio */}
                <View className="items-end">
                  <Text className={`text-sm font-bold tracking-tight ${textClass}`}>
                    {formatCurrency(cat.spentAmount, currency, numberFormat)} /{" "}
                    {formatCurrency(cat.budgetAmount, currency, numberFormat)}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function BudgetInsightScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const rawParam = params.id;

  const { settings } = useAuth();
  const [summary, setSummary] = useState<MonthBudgetSummary | null>(null);
  const [isTemplateActive, setIsTemplateActive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine the target month from rawParam (either 'YYYY-MM' or budget ID)
  const targetMonth = useMemo(() => {
    if (!rawParam) return new Date().toISOString().slice(0, 7);
    if (rawParam.includes("-")) {
      return rawParam; // It's directly a month 'YYYY-MM'
    }
    return new Date().toISOString().slice(0, 7);
  }, [rawParam]);

  const loadData = useCallback(() => {
    try {
      let resolvedMonth = targetMonth;
      if (rawParam && !rawParam.includes("-") && !isNaN(Number(rawParam))) {
        // Resolve month from budget ID
        const bSummary = getMonthBudgetSummary(resolvedMonth);
        const match = bSummary.budgets.find((b) => b.id === Number(rawParam));
        if (match) {
          resolvedMonth = match.month;
        }
      }

      const data = getMonthBudgetSummary(resolvedMonth);
      setSummary(data);
      setIsTemplateActive(isMonthTemplate(resolvedMonth));
    } catch (err) {
      console.warn("Failed to load budget insight:", err);
    } finally {
      setIsLoading(false);
    }
  }, [targetMonth, rawParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time listener for SQLite database changes
  useEffect(() => {
    let sub: { remove: () => void } | undefined;
    try {
      sub = addDatabaseChangeListener((event) => {
        if (
          !event?.tableName ||
          event.tableName === "budgets" ||
          event.tableName === "budget_categories" ||
          event.tableName === "transactions"
        ) {
          loadData();
        }
      });
    } catch {}
    return () => {
      sub?.remove();
    };
  }, [loadData]);

  const monthLabel = useMemo(() => {
    if (!summary?.month) return "";
    return formatDisplayMonth(`${summary.month}-01`);
  }, [summary?.month]);

  const shortMonthName = useMemo(() => {
    if (!monthLabel) return "this month";
    return monthLabel.split(" ")[1] || monthLabel;
  }, [monthLabel]);

  // Overall calculations for the month
  const totalBudget = summary?.totalBudget || 0;
  const totalSpent = summary?.totalSpent || 0;
  const isExceeded = totalSpent > totalBudget;
  const savedAmount = isExceeded ? 0 : Math.max(0, totalBudget - totalSpent);
  const exceededAmount = isExceeded ? totalSpent - totalBudget : 0;

  // Toggle whole-month template handler (no extra badges per user request)
  function handleToggleMonthTemplate() {
    if (!summary?.month) return;
    const nextState = !isTemplateActive;
    try {
      setMonthTemplate(summary.month, nextState);
      setIsTemplateActive(nextState);
    } catch (err) {
      console.warn("Failed to toggle month template:", err);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
      {/* ── Screen Header (No pencils per user request) ── */}
      <ScreenHeader
        title="Budget Insight"
        showBack={true}
        onBack={() => router.back()}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 60,
          paddingTop: 10,
        }}
        className="flex-1"
      >
        {isLoading ? (
          <View className="py-24 items-center justify-center">
            <ActivityIndicator size="small" color="#D4F938" />
          </View>
        ) : !summary || summary.budgets.length === 0 ? (
          <View className="bg-dark-surface border border-dashed border-dark-border p-8 rounded-3xl items-center justify-center mt-6">
            <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-3">
              <Ionicons name="pie-chart-outline" size={24} color="#D4F938" />
            </View>
            <Text className="text-dark-text font-bold text-base">
              No Budgets for {monthLabel}
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-4 px-5 py-2.5 rounded-xl bg-brand-accent"
            >
              <Text className="text-dark-bg font-bold text-xs">Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* ── 1. First show exceed or saved in BIG font at center ── */}
            <View className="items-center justify-center pt-3 pb-4">
              {/* Big Font Center Display */}
              <Text
                className={`text-4xl font-extrabold tracking-tight ${
                  isExceeded ? "text-rose-400" : "text-emerald-400"
                }`}
                style={{ fontSize: 38, lineHeight: 46 }}
              >
                {isExceeded
                  ? `Exceeded ${formatCurrency(
                      exceededAmount,
                      settings?.currency,
                      settings?.numberFormat,
                    )}`
                  : `Saved ${formatCurrency(
                      savedAmount,
                      settings?.currency,
                      settings?.numberFormat,
                    )}`}
              </Text>

              {/* Subtext info */}
              <Text className="text-dark-muted text-xs font-semibold mt-2 text-center">
                {formatCurrency(
                  totalSpent,
                  settings?.currency,
                  settings?.numberFormat,
                )}{" "}
                spent of{" "}
                {formatCurrency(
                  totalBudget,
                  settings?.currency,
                  settings?.numberFormat,
                )}{" "}
                allocated • {monthLabel}
              </Text>

              {/* ── Whole-month template checkbox (No extra badges per user request) ── */}
              <TouchableOpacity
                onPress={handleToggleMonthTemplate}
                activeOpacity={0.7}
                className="flex-row items-center justify-center gap-2.5 py-2 px-4 rounded-full mt-4"
              >
                <Ionicons
                  name={isTemplateActive ? "checkbox" : "square-outline"}
                  size={19}
                  color={isTemplateActive ? "#D4F938" : "#94A3B8"}
                />
                <Text className="text-dark-text text-xs font-bold">
                  Save this month as template
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── 2. Cards for each budget with its category (No pencils) ── */}
            {summary.budgets.map((b) => (
              <BudgetBreakdownCard
                key={b.id}
                budget={b}
                monthName={shortMonthName}
                currency={settings?.currency}
                numberFormat={settings?.numberFormat}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
