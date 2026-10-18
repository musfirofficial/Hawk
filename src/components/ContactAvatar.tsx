import React, { useMemo } from "react";
import { StyleProp, Text, View, ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { generateContactAvatar } from "../services/avatarService";

export interface ContactAvatarProps {
  name: string;
  avatarSvg?: string | null;
  size?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function ContactAvatar({
  name,
  avatarSvg,
  size = 44,
  className = "",
  style,
}: ContactAvatarProps) {
  const svg = useMemo(() => {
    if (avatarSvg && avatarSvg.trim().startsWith("<svg")) {
      return avatarSvg;
    }
    return generateContactAvatar(name, size);
  }, [avatarSvg, name, size]);

  const initials = useMemo(() => {
    return (name || "C")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }, [name]);

  return (
    <View
      style={[{ width: size, height: size, borderRadius: size / 2 }, style]}
      className={`overflow-hidden items-center justify-center bg-dark-card border border-dark-border/60 ${className}`}
    >
      {svg ? (
        <SvgXml xml={svg} width={size} height={size} />
      ) : (
        <Text
          style={{ fontSize: Math.max(12, Math.floor(size * 0.38)) }}
          className="text-dark-text font-bold"
        >
          {initials}
        </Text>
      )}
    </View>
  );
}
