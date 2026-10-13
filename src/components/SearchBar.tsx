import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleProp,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

export interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  onClear?: () => void;
  autoFocus?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = "Search...",
  placeholderTextColor = "#60677C",
  onClear,
  autoFocus = false,
  autoCapitalize = "none",
  className = "",
  style,
}: SearchBarProps) {
  function handleClear() {
    onChangeText("");
    onClear?.();
  }

  return (
    <View
      className={`bg-dark-surface border border-dark-border rounded-xl px-3.5 py-3.5 flex-row items-center gap-2.5 ${className}`}
      style={style}
    >
      <Ionicons name="search-outline" size={18} color="#60677C" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor}
        className="flex-1 text-dark-text text-sm font-medium py-0"
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoFocus={autoFocus}
        clearButtonMode="never"
      />
      {value ? (
        <TouchableOpacity
          onPress={handleClear}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close-circle" size={16} color="#94A3B8" />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
