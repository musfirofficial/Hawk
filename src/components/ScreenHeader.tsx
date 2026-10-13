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
      className={`px-5 py-3 relative flex-row items-center justify-between border-b border-dark-border/40 bg-dark-bg min-h-[56px] ${className}`}
    >
      {/* Absolute Centered Title (guaranteed dead-center on screen) */}
      <View
        pointerEvents="box-none"
        className="absolute left-0 right-0 top-0 bottom-0 items-center justify-center px-16"
      >
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

      {/* Left Back Button */}
      {showBack ? (
        <TouchableOpacity
          onPress={handleBack}
          className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center z-10"
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 40, height: 40 }} />
      )}

      {/* Right Element */}
      {rightElement ? (
        <View className="z-10 items-end justify-center min-w-[40px]">
          {rightElement}
        </View>
      ) : (
        <View style={{ width: 40, height: 40 }} />
      )}
    </View>
  );
}

export default ScreenHeader;
