import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SUPPORTED_CURRENCIES } from "../db/schema";

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
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        {/* Backdrop dismiss */}
        <Pressable className="flex-1" onPress={onClose} />

        {/* Fly-up Bottom Sheet */}
        <View className="bg-dark-surface border-t border-dark-border rounded-t-3xl max-h-[75%] px-5 pt-3 pb-8">
          {/* Top Pill Handle */}
          <View className="items-center mb-3">
            <View className="w-12 h-1.5 bg-dark-border rounded-full" />
          </View>

          {/* Sheet Header */}
          <View className="flex-row items-center justify-between pb-3 border-b border-dark-border">
            <Text className="text-dark-text text-lg font-bold">
              Select Currency
            </Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-dark-card items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* Search Box */}
          <View className="bg-dark-card border border-dark-border rounded-xl px-3 py-2.5 flex-row items-center gap-2.5 my-3">
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

          {/* Currency List: Each row lists name and symbol (symbol at right) only */}
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
        </View>
      </View>
    </Modal>
  );
}
