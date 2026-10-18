import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { HawkModal } from "./HawkModal";

export type AlertType = "info" | "success" | "warning" | "danger" | "biometric";

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

  function handleButtonPress(button?: HawkAlertButton) {
    if (button?.onPress) {
      button.onPress();
    }
    if (onClose) {
      onClose();
    }
  }

  const isBiometric = type === "biometric";

  return (
    <HawkModal visible={visible} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/75 justify-center items-center px-6">
        <Pressable
          className="absolute inset-0"
          onPress={() => handleButtonPress()}
        />

        <View
          style={{
            width: "100%",
            maxWidth: 340,
            backgroundColor: "#161924",
            borderRadius: 24,
            borderWidth: 1,
            borderColor: "#282E40",
            paddingHorizontal: 22,
            paddingTop: isBiometric ? 22 : 26,
            paddingBottom: 22,
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 12 },
            shadowOpacity: 0.5,
            shadowRadius: 24,
            elevation: 16,
          }}
        >
          {/* Biometrics Icon Only - If explicitly used for biometric authentication */}
          {isBiometric && (
            <View className="w-14 h-14 rounded-full bg-[#1F2433] border border-[#2E364A] items-center justify-center mb-4">
              <Ionicons name="finger-print" size={28} color="#D4F938" />
            </View>
          )}

          {/* Title */}
          <Text
            style={{
              fontFamily: "DMSans_700Bold",
              fontSize: 20,
              color: "#F8FAFC",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            {title}
          </Text>

          {/* Message */}
          {message ? (
            <Text
              style={{
                fontFamily: "DMSans_400Regular",
                fontSize: 14,
                color: "#94A3B8",
                textAlign: "center",
                lineHeight: 20,
                marginBottom: 24,
                paddingHorizontal: 4,
              }}
            >
              {message}
            </Text>
          ) : (
            <View style={{ marginBottom: 16 }} />
          )}

          {/* Action Buttons */}
          <View className="w-full flex-row gap-3">
            {buttons.map((button, index) => {
              const isCancel = button.style === "cancel";
              const isDestructive = button.style === "destructive";

              let btnBg = "#D4F938"; // Electric Lime brand accent
              let textColor = "#0B0D12";
              let btnBorder = "transparent";

              if (isCancel) {
                btnBg = "#232838";
                btnBorder = "#2F364B";
                textColor = "#F8FAFC";
              } else if (isDestructive) {
                btnBg = "#DC2626"; // Vibrant solid red matching reference
                textColor = "#FFFFFF";
              }

              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleButtonPress(button)}
                  activeOpacity={0.8}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 16,
                    backgroundColor: btnBg,
                    borderWidth: isCancel ? 1 : 0,
                    borderColor: btnBorder,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "DMSans_700Bold",
                      color: textColor,
                      fontSize: 15,
                    }}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </HawkModal>
  );
}
