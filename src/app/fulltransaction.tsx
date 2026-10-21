import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import {
  Calendar,
  formatDisplayDate,
  formatDisplayMonth,
  formatYMD,
  getTodayYMD,
  parseYMD,
} from "../components/calendar";
import { HawkFlyUp } from "../components/HawkFlyUp";
import { ScreenHeader } from "../components/ScreenHeader";
import { SearchBar } from "../components/SearchBar";
import { TransactionCard } from "../components/transactions/TransactionCard";
import {
  INITIAL_FILTER_STATE,
  TransactionFilterModal,
  TransactionFilterState,
} from "../components/transactions/TransactionFilterModal";
import { TransactionSummaryCard } from "../components/transactions/TransactionSummaryCard";
import { TransactionItem, useTransactions } from "../context/transactions";

// ─── Period type ──────────────────────────────────────────────────────────────
type PeriodMode = "Day" | "Month";

// ─── Calendar Fly-Up ──────────────────────────────────────────────────────────
interface CalendarFlyUpProps {
  visible: boolean;
  onClose: () => void;
  periodMode: PeriodMode;
  setPeriodMode: (m: PeriodMode) => void;
  selectedDate: string;
  onApply: (date: string, mode: PeriodMode) => void;
  onReset: () => void;
  isApplied: boolean;
}

function CalendarFlyUp({
  visible,
  onClose,
  periodMode,
  setPeriodMode,
  selectedDate,
  onApply,
  onReset,
  isApplied,
}: CalendarFlyUpProps) {
  const [draftDate, setDraftDate] = useState(selectedDate);
  const [draftMode, setDraftMode] = useState<PeriodMode>(periodMode);

  // Reset draft whenever modal opens
  React.useEffect(() => {
    if (visible) {
      setDraftDate(selectedDate);
      setDraftMode(periodMode);
    }
  }, [visible, selectedDate, periodMode]);

  function handleApply() {
    setPeriodMode(draftMode);
    onApply(draftDate, draftMode);
    onClose();
  }

  function handleReset() {
    onReset();
    onClose();
  }

  return (
    <HawkFlyUp
      visible={visible}
      onClose={onClose}
      title="Pick date"
      avoidKeyboard={false}
    >
      <View className="px-1 pb-2">
        {/* Period Toggle: Day / Month */}
        <View className="bg-dark-surface p-1 rounded-2xl flex-row items-center border border-dark-border mb-4">
          {(["Day", "Month"] as const).map((m) => {
            const isActive = draftMode === m;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => {
                  setDraftMode(m);
                  // When switching to Month, keep same year-month but set day=1
                  if (m === "Month") {
                    const { year, month } = parseYMD(draftDate);
                    setDraftDate(formatYMD(year, month, 1));
                  }
                }}
                activeOpacity={0.8}
                className={`flex-1 py-2.5 rounded-2xl items-center justify-center ${
                  isActive
                    ? "bg-dark-card border border-dark-border/80"
                    : "bg-transparent"
                }`}
              >
                <Text
                  className={`text-sm ${
                    isActive
                      ? "text-dark-text font-bold"
                      : "text-dark-muted font-medium"
                  }`}
                >
                  {m}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Calendar — day picker or month picker */}
        <Calendar
          value={draftDate}
          onChange={setDraftDate}
          maxDate={getTodayYMD()}
          showTodayButton={true}
          mode={draftMode === "Month" ? "month-only" : "full"}
          className="mb-4"
        />

        {/* Action buttons */}
        <View className="pt-2 flex-row gap-3">
          {isApplied && (
            <TouchableOpacity
              onPress={handleReset}
              className="flex-1 py-4 rounded-2xl bg-dark-card border border-dark-border items-center justify-center"
              activeOpacity={0.8}
            >
              <Text className="text-dark-text font-bold text-base">
                Show All
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={handleApply}
            className={`${isApplied ? "flex-1" : "w-full"} py-4 rounded-2xl bg-brand-accent items-center justify-center shadow-lg`}
            activeOpacity={0.8}
          >
            <Text className="text-dark-bg font-extrabold text-base tracking-wide">
              Apply
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </HawkFlyUp>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function FullTransactionScreen() {
  const router = useRouter();
  const { transactions } = useTransactions();

  const todayYMD = useMemo(() => getTodayYMD(), []);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [filters, setFilters] = useState<TransactionFilterState>(INITIAL_FILTER_STATE);

  // Period / Calendar state
  const [periodMode, setPeriodMode] = useState<PeriodMode>("Day");
  const [selectedDate, setSelectedDate] = useState(todayYMD);
  const [isCalendarApplied, setIsCalendarApplied] = useState(false);

  // Pagination state (20 per page)
  const PAGE_SIZE = 20;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const isLoadingMoreRef = useRef(false);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.bankAccountIds.length > 0 ||
      filters.cashAccountIds.length > 0 ||
      filters.types.length > 0
    );
  }, [filters]);

  // Reset pagination whenever filters or search query or calendar changes
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [filters, isCalendarApplied, selectedDate, periodMode, searchQuery]);

  // ── Card Transactions (Whole time stats by default; selected date/month if calendar applied) ──
  const cardTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Hardcoded filters
      if (filters.bankAccountIds.length > 0) {
        const ok =
          (t.fromAssetId != null && filters.bankAccountIds.includes(t.fromAssetId)) ||
          (t.toAssetId != null && filters.bankAccountIds.includes(t.toAssetId));
        if (!ok) return false;
      }
      if (filters.cashAccountIds.length > 0) {
        const ok =
          (t.fromAssetId != null && filters.cashAccountIds.includes(t.fromAssetId)) ||
          (t.toAssetId != null && filters.cashAccountIds.includes(t.toAssetId));
        if (!ok) return false;
      }
      if (filters.types.length > 0) {
        if (!filters.types.includes(t.type)) return false;
      }

      // Calendar slice — only when calendar is explicitly applied
      if (isCalendarApplied) {
        if (periodMode === "Day") {
          if (t.date !== selectedDate) return false;
        } else {
          const monthPrefix = selectedDate.slice(0, 7);
          if (!t.date.startsWith(monthPrefix)) return false;
        }
      }

      return true;
    });
  }, [transactions, filters, isCalendarApplied, periodMode, selectedDate]);

  // ── Card Period Label ─────────────────────────────────────────────────────
  const cardPeriodLabel = useMemo(() => {
    if (!isCalendarApplied) return "All Time";
    if (periodMode === "Day") {
      if (selectedDate === todayYMD) return "Today";
      return formatDisplayDate(selectedDate);
    }
    return formatDisplayMonth(selectedDate);
  }, [isCalendarApplied, periodMode, selectedDate, todayYMD]);

  // ── Filtered List Transactions (All transactions by default; date-sliced if calendar applied) ──
  const filteredListTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Hardcoded filters
      if (filters.bankAccountIds.length > 0) {
        const ok =
          (t.fromAssetId != null && filters.bankAccountIds.includes(t.fromAssetId)) ||
          (t.toAssetId != null && filters.bankAccountIds.includes(t.toAssetId));
        if (!ok) return false;
      }
      if (filters.cashAccountIds.length > 0) {
        const ok =
          (t.fromAssetId != null && filters.cashAccountIds.includes(t.fromAssetId)) ||
          (t.toAssetId != null && filters.cashAccountIds.includes(t.toAssetId));
        if (!ok) return false;
      }
      if (filters.types.length > 0) {
        if (!filters.types.includes(t.type)) return false;
      }

      // Calendar slice — only when calendar is explicitly applied
      if (isCalendarApplied) {
        if (periodMode === "Day") {
          if (t.date !== selectedDate) return false;
        } else {
          const monthPrefix = selectedDate.slice(0, 7);
          if (!t.date.startsWith(monthPrefix)) return false;
        }
      }

      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const fields = [
          t.note,
          t.categoryName,
          t.contactName,
          t.fromAssetName,
          t.toAssetName,
          String(t.amount),
        ];
        if (!fields.some((f) => f?.toLowerCase().includes(q))) return false;
      }

      return true;
    });
  }, [transactions, filters, isCalendarApplied, periodMode, selectedDate, searchQuery]);

  // ── Paginated records (first visibleCount items) ───────────────────────────
  const pagedTransactions = useMemo(() => {
    return filteredListTransactions.slice(0, visibleCount);
  }, [filteredListTransactions, visibleCount]);

  // ── Group paged transactions by date ──────────────────────────────────────
  const groupedByDate = useMemo(() => {
    const today = todayYMD;
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
    const groupMap = new Map<string, TransactionItem[]>();

    for (const t of pagedTransactions) {
      const existing = groupMap.get(t.date);
      if (existing) {
        existing.push(t);
      } else {
        groupMap.set(t.date, [t]);
      }
    }

    return Array.from(groupMap.entries()).map(([dateStr, items]) => {
      let label = formatDisplayDate(dateStr);
      if (dateStr === today) label = "Today";
      else if (dateStr === yesterday) label = "Yesterday";
      return { label, dateStr, items };
    });
  }, [pagedTransactions, todayYMD]);

  // ── Load more handler ─────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (isLoadingMoreRef.current) return;
    if (visibleCount < filteredListTransactions.length) {
      isLoadingMoreRef.current = true;
      setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredListTransactions.length));
        isLoadingMoreRef.current = false;
      }, 250);
    }
  }, [visibleCount, filteredListTransactions.length]);

  // Scroll detection for infinite scrolling
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    // Trigger when user scrolls within 150px of the bottom
    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 150;
    if (isCloseToBottom) {
      handleLoadMore();
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
      {/* Title Bar */}
      <ScreenHeader
        title="All Transactions"
        showBack={true}
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity
            onPress={() => router.push("/(transaction)/create" as any)}
            className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center"
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={24} color="#0B0D12" />
          </TouchableOpacity>
        }
      />

      {/* Search + Calendar icon + Filter icon */}
      <View className="px-5 pt-3 pb-2 flex-row items-center gap-2.5">
        <View className="flex-1">
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search transactions..."
          />
        </View>

        {/* Calendar button */}
        <TouchableOpacity
          onPress={() => setIsCalendarOpen(true)}
          activeOpacity={0.7}
          className={`w-12 h-12 rounded-2xl bg-dark-card border items-center justify-center relative ${
            isCalendarApplied ? "border-brand-accent" : "border-dark-border"
          }`}
        >
          <Ionicons name="calendar-outline" size={20} color="#F8FAFC" />
          {isCalendarApplied && (
            <View className="w-2.5 h-2.5 rounded-full bg-brand-accent absolute top-2.5 right-2.5" />
          )}
        </TouchableOpacity>

        {/* Filter button */}
        <TouchableOpacity
          onPress={() => setIsFilterModalOpen(true)}
          activeOpacity={0.7}
          className={`w-12 h-12 rounded-2xl bg-dark-card border items-center justify-center relative ${
            hasActiveFilters ? "border-brand-accent" : "border-dark-border"
          }`}
        >
          <Ionicons name="options-outline" size={20} color="#F8FAFC" />
          {hasActiveFilters && (
            <View className="w-2.5 h-2.5 rounded-full bg-brand-accent absolute top-2.5 right-2.5" />
          )}
        </TouchableOpacity>
      </View>

      {/* Active filter reset bar */}
      {(hasActiveFilters || isCalendarApplied || searchQuery.trim().length > 0) && (
        <View className="px-5 mb-1 flex-row items-center justify-between">
          <Text className="text-dark-muted text-xs font-semibold">
            {filteredListTransactions.length}{" "}
            {filteredListTransactions.length === 1 ? "entry" : "entries"}
            {isCalendarApplied ? ` · ${cardPeriodLabel}` : ""}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setFilters(INITIAL_FILTER_STATE);
              setIsCalendarApplied(false);
              setPeriodMode("Day");
              setSelectedDate(todayYMD);
              setSearchQuery("");
              setVisibleCount(PAGE_SIZE);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-brand-accent text-xs font-bold">
              Clear all
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main content */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20 }}
        className="flex-1 pt-2"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Summary card — always shows stats (Today's by default, or filtered by selected date/month) */}
        <TransactionSummaryCard
          transactions={cardTransactions}
          periodLabel={cardPeriodLabel}
        />

        {/* Transaction list */}
        {filteredListTransactions.length === 0 ? (
          <TouchableOpacity
            onPress={() => router.push("/(transaction)/create" as any)}
            activeOpacity={0.7}
            className="bg-dark-surface border border-dashed border-dark-border p-8 rounded-3xl items-center justify-center mt-2"
          >
            <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2.5">
              <Ionicons name="receipt-outline" size={22} color="#F8FAFC" />
            </View>
            <Text className="text-dark-text font-bold text-sm">
              No Transactions Found
            </Text>
            <Text className="text-dark-muted text-xs mt-1 text-center font-medium">
              {hasActiveFilters || searchQuery || isCalendarApplied
                ? "Try clearing filters or search term"
                : "Tap + to record your first transaction"}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            {groupedByDate.map((group) => (
              <View key={group.dateStr} className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2.5 ml-1">
                  {group.label}
                </Text>
                <View className="space-y-3 gap-3">
                  {group.items.map((tx) => (
                    <TransactionCard
                      key={tx.id}
                      transaction={tx}
                      onPress={() => {
                        if (tx.debtId) {
                          router.push(
                            `/createdebt?debtId=${tx.debtId}&txId=${tx.id}&mode=preview&from=transactions` as any
                          );
                        } else {
                          router.push(`/(transaction)/${tx.id}` as any);
                        }
                      }}
                    />
                  ))}
                </View>
              </View>
            ))}

            {/* Infinite Scroll Spinner */}
            {visibleCount < filteredListTransactions.length && (
              <View className="py-6 items-center justify-center">
                <ActivityIndicator size="small" color="#D4F938" />
              </View>
            )}

            {filteredListTransactions.length > PAGE_SIZE &&
              visibleCount >= filteredListTransactions.length && (
                <View className="py-4 items-center justify-center">
                  <Text className="text-dark-muted text-xs font-medium">
                    All {filteredListTransactions.length} transactions loaded
                  </Text>
                </View>
              )}
          </>
        )}
      </ScrollView>

      {/* Calendar Fly-Up */}
      <CalendarFlyUp
        visible={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
        periodMode={periodMode}
        setPeriodMode={setPeriodMode}
        selectedDate={selectedDate}
        onApply={(date, mode) => {
          setSelectedDate(date);
          setPeriodMode(mode);
          setIsCalendarApplied(true);
        }}
        onReset={() => {
          setIsCalendarApplied(false);
          setPeriodMode("Day");
          setSelectedDate(todayYMD);
        }}
        isApplied={isCalendarApplied}
      />

      {/* Filter Fly-Up Modal */}
      <TransactionFilterModal
        visible={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        filters={filters}
        onApply={(newFilters) => setFilters(newFilters)}
        onReset={() => setFilters(INITIAL_FILTER_STATE)}
      />
    </SafeAreaView>
  );
}
