import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import { addDatabaseChangeListener } from "expo-sqlite";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar, formatDisplayMonth } from "../components/calendar";
import { HawkFlyUp } from "../components/HawkFlyUp";
import { ScreenHeader } from "../components/ScreenHeader";
import { useAuth } from "../context/auth";
import {
  getAllMonthsBudgetSummary,
  MonthSummaryItem,
} from "../services/budgetService";
import { formatCurrency } from "../services/currency";

export default function BudgetSummaryScreen() {
  const router = useRouter();
  const { settings } = useAuth();

  // Calendar filter state
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [tempSelectedMonth, setTempSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7),
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Months summary state
  const [months, setMonths] = useState<MonthSummaryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pagination state (20 per page)
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);

  const loadData = useCallback(() => {
    try {
      const data = getAllMonthsBudgetSummary(selectedMonth || undefined);
      setMonths(data);
    } catch (err) {
      console.warn("Failed to load month budget summaries:", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  // SQLite change listener for real-time reactivity
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

  // Reset pagination when month filter changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [selectedMonth]);

  // Sliced list for pagination
  const pagedMonths = useMemo(() => {
    return months.slice(0, visibleCount);
  }, [months, visibleCount]);

  // Infinite scroll handler
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 120;

    if (
      isCloseToBottom &&
      visibleCount < months.length &&
      !isLoadingMoreRef.current
    ) {
      isLoadingMoreRef.current = true;
      setIsLoadingMore(true);
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, months.length));
        setIsLoadingMore(false);
        isLoadingMoreRef.current = false;
      }, 250);
    }
  };

  const monthFilterLabel = useMemo(() => {
    if (!selectedMonth) return null;
    return formatDisplayMonth(`${selectedMonth}-01`);
  }, [selectedMonth]);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
      {/* ── Title Bar with Month Calendar Selector ── */}
      <ScreenHeader
        title="Budget Summary"
        showBack={true}
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity
            onPress={() => {
              setTempSelectedMonth(
                selectedMonth || new Date().toISOString().slice(0, 7),
              );
              setIsCalendarOpen(true);
            }}
            activeOpacity={0.7}
            className={`w-10 h-10 rounded-2xl bg-dark-card border items-center justify-center relative ${
              selectedMonth ? "border-brand-accent" : "border-dark-border"
            }`}
          >
            <Ionicons name="calendar-outline" size={19} color="#F8FAFC" />
            {selectedMonth && (
              <View className="w-2.5 h-2.5 rounded-full bg-brand-accent absolute top-2 right-2" />
            )}
          </TouchableOpacity>
        }
      />

      {/* Active Month Filter Reset Bar */}
      {selectedMonth && (
        <View className="px-5 pt-1 pb-2 flex-row items-center justify-between">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="funnel-outline" size={13} color="#94A3B8" />
            <Text className="text-dark-muted text-xs font-semibold">
              Filtered: {monthFilterLabel}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedMonth(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-brand-accent text-xs font-bold">
              Show All
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Month Budgets List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 60,
          paddingTop: 10,
        }}
        className="flex-1"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {isLoading ? (
          <View className="py-20 items-center justify-center">
            <ActivityIndicator size="small" color="#D4F938" />
          </View>
        ) : months.length === 0 ? (
          <View className="bg-dark-surface border border-dashed border-dark-border p-8 rounded-3xl items-center justify-center mt-6">
            <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-3">
              <Ionicons name="pie-chart-outline" size={24} color="#ffffff" />
            </View>
            <Text className="text-dark-text font-bold text-sm">
              No Budgets Found
            </Text>
            <Text className="text-dark-muted text-xs mt-1 text-center font-medium">
              {selectedMonth
                ? `No budget allocated for ${monthFilterLabel}`
                : "Create a budget to start tracking your expenses"}
            </Text>
            {selectedMonth && (
              <TouchableOpacity
                onPress={() => setSelectedMonth(null)}
                className="mt-4 px-4 py-2 rounded-xl bg-dark-card border border-dark-border"
              >
                <Text className="text-brand-accent text-xs font-bold">
                  View All Months
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {/* Show by Month:
                1. Left-side top: month and year
                2. Left-side bottom: allocated amount overall
                3. Right-side: saved amount or exceed amount with corresponding red or green color
            */}
            {pagedMonths.map((m) => {
              const monthTitle = formatDisplayMonth(`${m.month}-01`);

              return (
                <TouchableOpacity
                  key={m.month}
                  onPress={() => router.push(`/budget/${m.month}` as any)}
                  activeOpacity={0.7}
                  className="bg-dark-card border border-dark-border/80 rounded-2xl p-4 mb-3 flex-row items-center justify-between"
                >
                  {/* Left Side: (1) Month & Year, (2) Allocated Amount overall */}
                  <View className="flex-1 mr-3">
                    <Text
                      className="text-dark-text font-bold text-sm tracking-tight"
                      numberOfLines={1}
                    >
                      {monthTitle}
                    </Text>
                    <Text className="text-dark-muted text-xs font-semibold mt-1">
                      {formatCurrency(
                        m.totalBudget,
                        settings?.currency,
                        settings?.numberFormat,
                      )}{" "}
                      allocated • {m.budgetCount}{" "}
                      {m.budgetCount === 1 ? "budget" : "budgets"}
                    </Text>
                  </View>

                  {/* Right Side: (3) Saved or Exceed Amount with Green or Red color */}
                  <View className="items-end pl-2">
                    {m.isExceeded ? (
                      <Text className="text-rose-400 font-bold text-sm tracking-tight">
                        Exceeded{" "}
                        {formatCurrency(
                          m.exceededAmount,
                          settings?.currency,
                          settings?.numberFormat,
                        )}
                      </Text>
                    ) : (
                      <Text className="text-emerald-400 font-bold text-sm tracking-tight">
                        Saved{" "}
                        {formatCurrency(
                          m.savedAmount,
                          settings?.currency,
                          settings?.numberFormat,
                        )}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Infinite Scroll Spinner */}
            {visibleCount < months.length && (
              <View className="py-6 items-center justify-center">
                <ActivityIndicator size="small" color="#D4F938" />
              </View>
            )}

            {months.length > PAGE_SIZE && visibleCount >= months.length && (
              <View className="py-4 items-center justify-center">
                <Text className="text-dark-muted text-xs font-medium">
                  All {months.length} months loaded
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* ── Month Calendar FlyUp ── */}
      <HawkFlyUp
        visible={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        title="Filter by Month"
      >
        <View className="pb-4">
          <Calendar
            value={`${tempSelectedMonth}-01`}
            mode="month-only"
            onChange={(ymd) => setTempSelectedMonth(ymd.slice(0, 7))}
          />
          <View className="h-4" />
          <View className="flex-row gap-3 pt-2">
            <TouchableOpacity
              onPress={() => {
                setSelectedMonth(null);
                setIsCalendarOpen(false);
              }}
              className="flex-1 py-4 rounded-2xl bg-dark-card border border-dark-border items-center justify-center"
              activeOpacity={0.8}
            >
              <Text className="text-dark-text font-bold text-base">
                Show All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSelectedMonth(tempSelectedMonth);
                setIsCalendarOpen(false);
              }}
              className="flex-1 py-4 rounded-2xl bg-brand-accent items-center justify-center shadow-lg"
              activeOpacity={0.8}
            >
              <Text className="text-dark-bg font-extrabold text-base tracking-wide">
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </HawkFlyUp>
    </SafeAreaView>
  );
}
