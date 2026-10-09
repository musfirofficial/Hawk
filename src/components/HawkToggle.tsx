import React from "react";
import { Pressable, View } from "react-native";

export interface HawkToggleProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  disabled?: boolean;
}

export function HawkToggle({
  value,
  onValueChange,
  disabled = false,
}: HawkToggleProps) {
  function handlePress() {
    if (!disabled) {
      onValueChange(!value);
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      android_ripple={null}
      style={{ opacity: disabled ? 0.5 : 1 }}
      className={`w-12 h-7 rounded-full p-0.5 justify-center ${
        value
          ? "bg-brand-accent items-end"
          : "bg-[#262B3A] border border-[#384156] items-start"
      }`}
    >
      <View
        className={`w-5.5 h-5.5 w-[22px] h-[22px] rounded-full shadow-md ${
          value ? "bg-white" : "bg-[#94A3B8]"
        }`}
      />
    </Pressable>
  );
}
