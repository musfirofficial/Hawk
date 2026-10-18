import React, { useRef, useCallback } from "react";
import {
  TouchableOpacity,
  TouchableOpacityProps,
  Pressable,
  PressableProps,
  GestureResponderEvent,
} from "react-native";

export interface SafeTouchableProps extends TouchableOpacityProps {
  /** Throttle duration in milliseconds (default: 450ms) */
  throttleMs?: number;
}

/**
 * SafeTouchable wraps React Native's TouchableOpacity and automatically
 * drops any secondary taps that occur within `throttleMs` (default 450ms).
 * This prevents double-page pushes, double modal open triggers, and duplicate API calls.
 */
export function SafeTouchable({
  onPress,
  throttleMs = 450,
  disabled,
  ...props
}: SafeTouchableProps) {
  const lastPressRef = useRef<number>(0);

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      const now = Date.now();
      if (now - lastPressRef.current < throttleMs) {
        return;
      }
      lastPressRef.current = now;
      onPress?.(e);
    },
    [onPress, throttleMs]
  );

  return (
    <TouchableOpacity
      {...props}
      disabled={disabled}
      onPress={handlePress}
    />
  );
}

export interface SafePressableProps extends PressableProps {
  /** Throttle duration in milliseconds (default: 450ms) */
  throttleMs?: number;
}

/**
 * SafePressable wraps React Native's Pressable with the same throttle protection.
 */
export function SafePressable({
  onPress,
  throttleMs = 450,
  disabled,
  ...props
}: SafePressableProps) {
  const lastPressRef = useRef<number>(0);

  const handlePress = useCallback(
    (e: GestureResponderEvent) => {
      const now = Date.now();
      if (now - lastPressRef.current < throttleMs) {
        return;
      }
      lastPressRef.current = now;
      onPress?.(e);
    },
    [onPress, throttleMs]
  );

  return (
    <Pressable
      {...props}
      disabled={disabled}
      onPress={handlePress}
    />
  );
}

/**
 * useSafePress hook wraps any callback with a cooldown timer.
 * Subsequent invocations within `throttleMs` are automatically ignored.
 */
export function useSafePress<T extends (...args: any[]) => any>(
  callback?: T | null,
  throttleMs: number = 450
): (...args: Parameters<T>) => void {
  const lastPressRef = useRef<number>(0);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      if (now - lastPressRef.current < throttleMs) {
        return;
      }
      lastPressRef.current = now;
      callback?.(...args);
    },
    [callback, throttleMs]
  );
}
