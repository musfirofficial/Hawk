import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  rightElement?: React.ReactNode;
  className?: string;
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  showBack = true,
  rightElement,
  className = "",
}: ScreenHeaderProps) {
  const router = useRouter();

  function handleBack() {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  }

  return (
    <View
      className={`px-5 py-3 flex-row items-center justify-between border-b border-dark-border/40 bg-dark-bg ${className}`}
    >
      {/* Left Back Button */}
      {showBack ? (
        <TouchableOpacity
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center"
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
      ) : (
        <View className="w-10" />
      )}

      {/* Center Title */}
      <View className="flex-1 items-center px-2">
        <Text
          className="text-dark-text text-lg font-bold text-center"
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            className="text-dark-muted text-xs font-medium mt-0.5 text-center"
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* Right Element or Balance Spacer */}
      {rightElement ? (
        <View className="min-w-10 items-end justify-center">{rightElement}</View>
      ) : (
        <View className="w-10" />
      )}
    </View>
  );
}
