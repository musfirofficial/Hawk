import React, { useState } from "react";
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SUPPORTED_CURRENCIES } from "../db/schema";
import { HawkFlyUp } from "./HawkFlyUp";
import { SearchBar } from "./SearchBar";

interface CurrencyPickerProps {
  visible: boolean;
  selectedCode: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function CurrencyPicker({
  visible,
  selectedCode,
  onSelect,
  onClose,
}: CurrencyPickerProps) {
  const [search, setSearch] = useState("");

  const filteredCurrencies = SUPPORTED_CURRENCIES.filter((cur) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      cur.name.toLowerCase().includes(q) ||
      cur.code.toLowerCase().includes(q) ||
      cur.symbol.toLowerCase().includes(q)
    );
  });

  function handleClose() {
    setSearch("");
    onClose();
  }

  return (
    <HawkFlyUp
      visible={visible}
      onClose={handleClose}
      title="Select Currency"
      maxHeight="80%"
    >
      {/* Search Box Component */}
      <SearchBar
        value={search}
        onChangeText={setSearch}
        placeholder="Search currency..."
        className="mb-3"
      />

      {/* Currency List */}
      <FlatList
        data={filteredCurrencies}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View className="h-[1px] bg-dark-border/50" />
        )}
        ListEmptyComponent={() => (
          <View className="py-8 items-center justify-center">
            <Text className="text-dark-muted text-sm font-medium">
              No currencies found matching &quot;{search}&quot;
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const isSelected = selectedCode === item.code;
          return (
            <TouchableOpacity
              onPress={() => {
                onSelect(item.code);
                handleClose();
              }}
              className={`flex-row items-center justify-between py-3.5 px-3 rounded-xl ${
                isSelected ? "bg-brand-accent/10" : ""
              }`}
              activeOpacity={0.7}
            >
              {/* Name & Code on left */}
              <View className="flex-row items-center gap-2 flex-1 mr-2">
                <Text
                  className={`text-base font-medium ${
                    isSelected ? "text-brand-accent font-bold" : "text-dark-text"
                  }`}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                <Text className="text-dark-muted text-xs font-semibold">
                  ({item.code})
                </Text>
              </View>

              {/* Symbol on right */}
              <Text
                className={`text-lg font-bold ${
                  isSelected ? "text-brand-accent" : "text-brand-accent/80"
                }`}
              >
                {item.symbol}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </HawkFlyUp>
  );
}
