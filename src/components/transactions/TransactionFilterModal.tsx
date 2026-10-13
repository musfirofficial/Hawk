import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { useAccounts } from "../../context/accounts";
import { HawkFlyUp } from "../HawkFlyUp";

export interface TransactionFilterState {
  bankAccountIds: number[];
  cashAccountIds: number[];
  types: string[];
  contactIds?: number[];
  categoryIds?: number[];
}

export const INITIAL_FILTER_STATE: TransactionFilterState = {
  bankAccountIds: [],
  cashAccountIds: [],
  types: [],
  contactIds: [],
  categoryIds: [],
};

interface TransactionFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: TransactionFilterState;
  onApply: (filters: TransactionFilterState) => void;
  onReset: () => void;
}

export function TransactionFilterModal({
  visible,
  onClose,
  filters,
  onApply,
  onReset,
}: TransactionFilterModalProps) {
  const { bankAccounts, cashAccounts } = useAccounts();

  // Local state while fly-up is open
  const [draft, setDraft] = useState<TransactionFilterState>(filters);

  // Sync draft whenever modal opens or filters change
  useEffect(() => {
    if (visible) {
      setDraft(filters);
    }
  }, [visible, filters]);

  function toggleItem<T>(list: T[], item: T): T[] {
    if (list.includes(item)) {
      return list.filter((i) => i !== item);
    }
    return [...list, item];
  }

  function handleApply() {
    onApply(draft);
    onClose();
  }

  function handleReset() {
    setDraft(INITIAL_FILTER_STATE);
    onReset();
    onClose();
  }

  const TRANSACTION_TYPES = [
    { id: "EXPENSE", label: "Expense" },
    { id: "INCOME", label: "Income" },
    { id: "TRANSFER", label: "Transfer" },
    { id: "LEND", label: "Lend" },
    { id: "BORROW", label: "Borrow" },
  ];

  return (
    <HawkFlyUp
      visible={visible}
      onClose={onClose}
      title="Search Filter"
      maxHeight="85%"
      style={{ height: "85%" }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 24 }}
        className="flex-1"
      >
        {/* 1. Bank Accounts */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-4">
            Bank Accounts
          </Text>
          {bankAccounts.length === 0 ? (
            <Text className="text-dark-muted/60 text-xs italic font-medium">
              No bank accounts found
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2.5">
              {bankAccounts.map((b) => {
                const isSelected = draft.bankAccountIds.includes(b.id);
                return (
                  <TouchableOpacity
                    key={b.id}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        bankAccountIds: toggleItem(prev.bankAccountIds, b.id),
                      }))
                    }
                    activeOpacity={0.7}
                    className={`px-4 py-2.5 rounded-2xl border ${
                      isSelected
                        ? "bg-dark-card border-brand-accent"
                        : "bg-dark-surface/60 border-dark-border"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        isSelected
                          ? "text-brand-accent font-bold"
                          : "text-dark-muted font-medium"
                      }`}
                    >
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 2. Cash Accounts */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-4">
            Cash Accounts
          </Text>
          {cashAccounts.length === 0 ? (
            <Text className="text-dark-muted/60 text-xs italic font-medium">
              No cash accounts found
            </Text>
          ) : (
            <View className="flex-row flex-wrap gap-2.5">
              {cashAccounts.map((c) => {
                const isSelected = draft.cashAccountIds.includes(c.id);
                return (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() =>
                      setDraft((prev) => ({
                        ...prev,
                        cashAccountIds: toggleItem(prev.cashAccountIds, c.id),
                      }))
                    }
                    activeOpacity={0.7}
                    className={`px-4 py-2.5 rounded-2xl border ${
                      isSelected
                        ? "bg-dark-card border-brand-accent"
                        : "bg-dark-surface/60 border-dark-border"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        isSelected
                          ? "text-brand-accent font-bold"
                          : "text-dark-muted font-medium"
                      }`}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* 3. Transaction Type */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-4">
            Transaction Type
          </Text>
          <View className="flex-row flex-wrap gap-2.5">
            {TRANSACTION_TYPES.map((t) => {
              const isSelected = draft.types.includes(t.id);
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() =>
                    setDraft((prev) => ({
                      ...prev,
                      types: toggleItem(prev.types, t.id),
                    }))
                  }
                  activeOpacity={0.7}
                  className={`px-4 py-2.5 rounded-2xl border ${
                    isSelected
                      ? "bg-dark-card border-brand-accent"
                      : "bg-dark-surface/60 border-dark-border"
                  }`}
                >
                  <Text
                    className={`text-xs ${
                      isSelected
                        ? "text-brand-accent font-bold"
                        : "text-dark-muted font-medium"
                    }`}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* Pinned Action Buttons: Apply & Reset (Always visible at bottom) */}
      <View className="pt-3.5 pb-1 border-t border-dark-border/50 space-y-2.5 gap-2.5">
        {/* Primary Apply Button */}
        <TouchableOpacity
          onPress={handleApply}
          className="w-full py-4 rounded-2xl bg-brand-accent items-center justify-center shadow-lg active:opacity-90"
          activeOpacity={0.8}
        >
          <Text className="text-dark-bg font-extrabold text-base tracking-wide">
            Apply Filters
          </Text>
        </TouchableOpacity>

        {/* Reset Button (strictly only icon allowed besides close) */}
        <TouchableOpacity
          onPress={handleReset}
          className="w-full py-3.5 rounded-2xl bg-dark-card border border-dark-border items-center justify-center flex-row gap-2 active:bg-dark-surface"
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={17} color="#F8FAFC" />
          <Text className="text-dark-text font-bold text-sm">
            Reset Filters
          </Text>
        </TouchableOpacity>
      </View>
    </HawkFlyUp>
  );
}

export default TransactionFilterModal;
