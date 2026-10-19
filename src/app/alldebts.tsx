import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DebtCard } from "../components/debts/DebtCard";
import { HawkFlyUp } from "../components/HawkFlyUp";
import { ScreenHeader } from "../components/ScreenHeader";
import { SearchBar } from "../components/SearchBar";
import { useDebts } from "../context/debts";
import { useSafeRouter } from "../hooks/useSafeRouter";

type DebtTypeFilter = "ALL" | "LEND" | "BORROW";
type DebtStateFilter = "ALL" | "ONGOING" | "REPAID" | "WRITTEN_OFF";

interface DebtFilterState {
  type: DebtTypeFilter;
  state: DebtStateFilter;
}

const INITIAL_FILTER: DebtFilterState = {
  type: "ALL",
  state: "ALL",
};

export default function AllDebtsScreen() {
  const router = useRouter();
  const { safePush } = useSafeRouter();
  const { debts } = useDebts();

  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<DebtFilterState>(INITIAL_FILTER);

  // Draft filters inside fly-up
  const [draftFilters, setDraftFilters] = useState<DebtFilterState>(INITIAL_FILTER);

  const hasActiveFilters = useMemo(() => {
    return filters.type !== "ALL" || filters.state !== "ALL";
  }, [filters]);

  function handleOpenFilter() {
    setDraftFilters(filters);
    setIsFilterOpen(true);
  }

  function handleApplyFilters() {
    setFilters(draftFilters);
    setIsFilterOpen(false);
  }

  function handleResetFilters() {
    setDraftFilters(INITIAL_FILTER);
    setFilters(INITIAL_FILTER);
    setIsFilterOpen(false);
  }

  // Filter and search
  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      // 1. Type Filter
      if (filters.type === "LEND" && d.type !== "LEND") return false;
      if (filters.type === "BORROW" && d.type !== "BORROW") return false;

      // 2. State Filter
      if (filters.state !== "ALL" && d.state !== filters.state) return false;

      // 3. Search Query (Contact name, note, amount)
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = d.contactName.toLowerCase().includes(q);
        const matchesNote = d.note ? d.note.toLowerCase().includes(q) : false;
        const matchesAmount = d.amount.toString().includes(q);
        if (!matchesName && !matchesNote && !matchesAmount) return false;
      }

      return true;
    });
  }, [debts, filters, searchQuery]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      <ScreenHeader
        title="All Debts"
        showBack={true}
        onBack={() => router.back()}
        rightElement={
          <TouchableOpacity
            onPress={() => safePush("/createdebt?mode=create")}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center active:bg-dark-surface"
          >
            <Ionicons name="add" size={22} color="#F8FAFC" />
          </TouchableOpacity>
        }
      />

      {/* Search Bar + Filter Button */}
      <View className="px-5 pt-3 pb-2 flex-row items-center gap-2.5">
        <View className="flex-1">
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search debts..."
          />
        </View>

        {/* Filter button */}
        <TouchableOpacity
          onPress={handleOpenFilter}
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

      {/* Active filter count & clear bar */}
      {(hasActiveFilters || searchQuery.trim().length > 0) && (
        <View className="px-5 py-1 mb-1 flex-row items-center justify-between">
          <Text className="text-dark-muted text-xs font-semibold">
            {filteredDebts.length}{" "}
            {filteredDebts.length === 1 ? "record" : "records"}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setFilters(INITIAL_FILTER);
              setSearchQuery("");
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text className="text-brand-accent text-xs font-bold">
              Clear all
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Debts List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20, paddingTop: 6 }}
        className="flex-1"
      >
        {filteredDebts.length === 0 ? (
          <View className="py-16 items-center justify-center">
            <View className="w-16 h-16 rounded-full bg-dark-surface border border-dark-border items-center justify-center mb-4">
              <Ionicons name="receipt-outline" size={28} color="#94A3B8" />
            </View>
            <Text className="text-dark-text text-base font-bold mb-1">
              No debts found
            </Text>
            <Text className="text-dark-muted text-xs text-center font-sans max-w-[220px]">
              {hasActiveFilters || searchQuery
                ? "Try clearing your filters or changing search keywords."
                : "No debts recorded yet."}
            </Text>
          </View>
        ) : (
          filteredDebts.map((item) => (
            <DebtCard
              key={item.id}
              debt={item}
              onPress={() => safePush(`/debt/${item.id}`)}
            />
          ))
        )}
      </ScrollView>

      {/* Filter Fly-Up */}
      <HawkFlyUp
        visible={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        title="Filter Debts"
        avoidKeyboard={false}
      >
        <View className="px-1 pb-2">
          {/* Section 1: Type */}
          <Text className="text-dark-text font-bold text-sm mb-2.5">
            Type
          </Text>
          <View className="bg-dark-surface p-1 rounded-2xl flex-row items-center border border-dark-border mb-5">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "LEND", label: "Lent" },
                { id: "BORROW", label: "Borrowed" },
              ] as const
            ).map((item) => {
              const isActive = draftFilters.type === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    setDraftFilters((prev) => ({ ...prev, type: item.id }))
                  }
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
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Section 2: State */}
          <Text className="text-dark-text font-bold text-sm mb-2.5">
            State
          </Text>
          <View className="bg-dark-surface p-1 rounded-2xl flex-row items-center border border-dark-border mb-6">
            {(
              [
                { id: "ALL", label: "All" },
                { id: "ONGOING", label: "Ongoing" },
                { id: "REPAID", label: "Repaid" },
                { id: "WRITTEN_OFF", label: "Written Off" },
              ] as const
            ).map((item) => {
              const isActive = draftFilters.state === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() =>
                    setDraftFilters((prev) => ({ ...prev, state: item.id }))
                  }
                  activeOpacity={0.8}
                  className={`flex-1 py-2.5 rounded-2xl items-center justify-center ${
                    isActive
                      ? "bg-dark-card border border-dark-border/80"
                      : "bg-transparent"
                  }`}
                >
                  <Text
                    numberOfLines={1}
                    className={`text-xs ${
                      isActive
                        ? "text-dark-text font-bold"
                        : "text-dark-muted font-medium"
                    }`}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Buttons: Reset & Apply */}
          <View className="pt-2 flex-row gap-3">
            {hasActiveFilters && (
              <TouchableOpacity
                onPress={handleResetFilters}
                className="flex-1 py-4 rounded-2xl bg-dark-card border border-dark-border items-center justify-center"
                activeOpacity={0.8}
              >
                <Text className="text-dark-text font-bold text-sm">
                  Reset
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={handleApplyFilters}
              className={`${hasActiveFilters ? "flex-1" : "w-full"} py-4 rounded-2xl bg-brand-accent items-center justify-center shadow-lg`}
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
