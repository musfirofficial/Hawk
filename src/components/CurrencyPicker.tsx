import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SUPPORTED_CURRENCIES } from "../db/schema";
import { HawkFlyUp } from "./HawkFlyUp";

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

  return (
    <HawkFlyUp
      visible={visible}
      onClose={onClose}
      title="Select Currency"
      maxHeight="80%"
    >
      {/* Search Box */}
      <View className="bg-dark-card border border-dark-border rounded-xl px-3 py-2.5 flex-row items-center gap-2.5 mb-3">
        <Ionicons name="search" size={16} color="#60677C" />
        <TextInput
          placeholder="Search currency..."
          placeholderTextColor="#60677C"
          value={search}
          onChangeText={setSearch}
          className="flex-1 text-dark-text text-sm py-0"
          autoCorrect={false}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color="#60677C" />
          </TouchableOpacity>
        )}
      </View>

      {/* Currency List */}
      <FlatList
        data={filteredCurrencies}
        keyExtractor={(item) => item.code}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => (
          <View className="h-[1px] bg-dark-border/50" />
        )}
        renderItem={({ item }) => {
          const isSelected = selectedCode === item.code;
          return (
            <TouchableOpacity
              onPress={() => {
                onSelect(item.code);
                onClose();
              }}
              className={`flex-row items-center justify-between py-3.5 px-3 rounded-xl ${
                isSelected ? "bg-brand-accent/10" : ""
              }`}
              activeOpacity={0.7}
            >
              {/* Name only on left */}
              <Text
                className={`text-base font-medium ${
                  isSelected ? "text-brand-accent font-bold" : "text-dark-text"
                }`}
              >
                {item.name}
              </Text>

              {/* Symbol only on right */}
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
