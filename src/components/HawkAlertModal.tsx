import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { HawkModal } from "./HawkModal";

export type AlertType = "info" | "success" | "warning" | "danger";

export interface HawkAlertButton {
  text: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
}

export interface HawkAlertModalProps {
  visible: boolean;
  title: string;
  message?: string;
  type?: AlertType;
  buttons?: HawkAlertButton[];
  onClose?: () => void;
}

export function HawkAlertModal({
  visible,
  title,
  message,
  type = "info",
  buttons = [{ text: "OK", style: "default" }],
  onClose,
}: HawkAlertModalProps) {
  if (!visible) return null;

  // Icon and theme resolution
  let iconName: any = "information-circle-outline";

  if (type === "danger") {
    iconName = "trash-outline";
  } else if (type === "warning") {
    iconName = "alert-circle-outline";
  } else if (type === "success") {
    iconName = "checkmark-circle-outline";
  }

  function handleButtonPress(button?: HawkAlertButton) {
    if (button?.onPress) {
      button.onPress();
    }
    if (onClose) {
      onClose();
    }
  }

  return (
    <HawkModal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/80 justify-center items-center px-6">
        <Pressable
          className="absolute inset-0"
          onPress={() => handleButtonPress()}
        />

        <View className="w-full max-w-sm bg-dark-surface border border-dark-border rounded-3xl p-6 items-center shadow-2xl">
          {/* Top Badge Icon - Universal dark circle with monochrome icon */}
          <View className="w-14 h-14 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-4">
            <Ionicons name={iconName} size={26} color="#F8FAFC" />
          </View>

          {/* Title */}
          <Text className="text-dark-text text-lg font-bold text-center mb-2">
            {title}
          </Text>

          {/* Message */}
          {message ? (
            <Text className="text-dark-muted text-sm text-center leading-relaxed mb-6">
              {message}
            </Text>
          ) : (
            <View className="mb-4" />
          )}

          {/* Action Buttons */}
          <View className="w-full flex-row gap-3">
            {buttons.map((button, index) => {
              const isCancel = button.style === "cancel";
              const isDestructive = button.style === "destructive";

              let btnBg = "bg-brand-accent";
              let textClass = "text-dark-bg font-extrabold";

              if (isCancel) {
                btnBg = "bg-dark-card border border-dark-border";
                textClass = "text-dark-muted font-bold";
              } else if (isDestructive) {
                btnBg = "bg-rose-500/15 border border-rose-500/30";
                textClass = "text-rose-400 font-bold";
              }

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleButtonPress(button)}
                  className={`flex-1 py-3.5 rounded-2xl items-center justify-center ${btnBg}`}
                  activeOpacity={0.8}
                >
                  <Text className={`text-sm ${textClass}`}>{button.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </HawkModal>
  );
}
