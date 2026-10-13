import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";

export interface DropdownOption<T = string> {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export interface DropdownProps<T = string> {
  label?: string;
  options: DropdownOption<T>[];
  selectedValue: T;
  onSelect: (value: T) => void;
  placeholder?: string;
  className?: string;
}

export function Dropdown<T extends string | number = string>({
  label,
  options,
  selectedValue,
  onSelect,
  placeholder = "Select an option",
  className = "",
}: DropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  return (
    <View className={className}>
      {label ? (
        <Text className="text-dark-text text-sm font-semibold mb-2">
          {label}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={() => setIsOpen(!isOpen)}
        className={`bg-dark-surface border rounded-2xl px-4 py-3.5 flex-row items-center justify-between ${
          isOpen ? "border-brand-accent/50" : "border-dark-border"
        }`}
        activeOpacity={0.8}
      >
        <View className="flex-row items-center gap-2.5">
          {selectedOption?.icon ? (
            <Ionicons name={selectedOption.icon} size={18} color="#D4F938" />
          ) : null}
          <Text className="text-dark-text text-sm font-medium">
            {selectedOption?.label || placeholder}
          </Text>
        </View>

        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={18}
          color="#60677C"
        />
      </TouchableOpacity>

      {isOpen && (
        <View className="bg-dark-surface border border-dark-border rounded-2xl mt-2 overflow-hidden shadow-xl">
          {options.map((opt, idx) => {
            const isSelected = selectedValue === opt.value;
            return (
              <TouchableOpacity
                key={String(opt.value)}
                onPress={() => {
                  onSelect(opt.value);
                  setIsOpen(false);
                }}
                className={`px-4 py-3.5 flex-row items-center justify-between ${
                  idx > 0 ? "border-t border-dark-border/40" : ""
                } ${isSelected ? "bg-brand-accent/5" : ""}`}
                activeOpacity={0.7}
              >
                <View className="flex-row items-center gap-2.5">
                  {opt.icon ? (
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={isSelected ? "#D4F938" : "#60677C"}
                    />
                  ) : null}
                  <Text
                    className={`text-sm font-medium ${
                      isSelected
                        ? "text-brand-accent font-semibold"
                        : "text-dark-text"
                    }`}
                  >
                    {opt.label}
                  </Text>
                </View>

                {isSelected ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#D4F938"
                  />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default Dropdown;
