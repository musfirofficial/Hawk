import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  PanResponder,
  StyleProp,
  Text,
  View,
  ViewStyle,
} from "react-native";

export interface SlideButtonProps {
  /** Label displayed inside the slide track */
  title?: string;
  /** Function triggered when the slider reaches the end */
  onConfirm: () => void;
  /** Whether the action is currently loading/submitting */
  isLoading?: boolean;
  /** Whether the slider is disabled */
  disabled?: boolean;
  /** Extra container styling */
  style?: StyleProp<ViewStyle>;
  /** Tailwind / NativeWind classes */
  className?: string;
}

export function SlideButton({
  title = "Slide to create",
  onConfirm,
  isLoading = false,
  disabled = false,
  style,
  className = "",
}: SlideButtonProps) {
  const { width: windowWidth } = Dimensions.get("window");
  // Default fallback so maxSlide is immediately valid before layout passes
  const initialWidth = Math.max(280, windowWidth - 40);

  const [trackWidth, setTrackWidth] = useState(initialWidth);
  const trackHeight = 60;
  const thumbSize = 48;
  const padding = 6;
  const maxSlide = Math.max(0, trackWidth - thumbSize - padding * 2);

  const maxSlideRef = useRef(maxSlide);
  maxSlideRef.current = maxSlide;

  const onConfirmRef = useRef(onConfirm);
  onConfirmRef.current = onConfirm;

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const isLoadingRef = useRef(isLoading);
  isLoadingRef.current = isLoading;

  const panXRef = useRef(new Animated.Value(0));
  const panX = panXRef.current;
  const isTriggered = useRef(false);

  const resetThumb = useCallback(() => {
    isTriggered.current = false;
    Animated.spring(panX, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  }, [panX]);

  // Reset when loading completes
  useEffect(() => {
    if (!isLoading && isTriggered.current) {
      const timer = setTimeout(() => {
        resetThumb();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [isLoading, resetThumb]);

  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () =>
        !disabledRef.current && !isLoadingRef.current,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) =>
        !disabledRef.current &&
        !isLoadingRef.current &&
        (Math.abs(gestureState.dx) > 2 || Math.abs(gestureState.vx) > 0.1),
      onMoveShouldSetPanResponderCapture: (_, gestureState) =>
        !disabledRef.current &&
        !isLoadingRef.current &&
        Math.abs(gestureState.dx) > 2,
      // Critical for Android to block native parent views from stealing gestures
      onShouldBlockNativeResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        panX.stopAnimation();
      },
      onPanResponderMove: (_, gestureState) => {
        if (isTriggered.current) return;
        const max = maxSlideRef.current;
        if (max <= 0) return;
        const next = Math.max(0, Math.min(gestureState.dx, max));
        panX.setValue(next);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (isTriggered.current) return;
        const max = maxSlideRef.current;
        if (max <= 0) {
          resetThumb();
          return;
        }

        // Complete if dragged past 60% of track or past 35% with a quick flick
        const isPastThreshold =
          gestureState.dx >= max * 0.6 ||
          (gestureState.dx >= max * 0.35 && gestureState.vx > 0.5);

        if (isPastThreshold) {
          isTriggered.current = true;
          // Snap thumb fully to the end, then invoke onConfirm
          Animated.timing(panX, {
            toValue: max,
            duration: 80,
            useNativeDriver: false,
          }).start(() => {
            onConfirmRef.current();
            // Fallback safety: If submission doesn't initiate loading within 500ms, reset thumb
            setTimeout(() => {
              if (!isLoadingRef.current) {
                resetThumb();
              }
            }, 500);
          });
        } else {
          resetThumb();
        }
      },
      onPanResponderTerminate: () => {
        resetThumb();
      },
    })
  );
  const panResponder = panResponderRef.current;

  // Fade text as slider approaches halfway
  const textOpacity =
    maxSlide > 0
      ? panX.interpolate({
          inputRange: [0, maxSlide * 0.5],
          outputRange: [1, 0],
          extrapolate: "clamp",
        })
      : 1;

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - trackWidth) > 1) {
          setTrackWidth(w);
        }
      }}
      style={[
        {
          height: trackHeight,
          backgroundColor: "#131620",
          borderColor: "rgba(212, 249, 56, 0.35)",
          borderWidth: 1.5,
          borderRadius: 9999,
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      className={className}
    >
      {/* Background slide fill */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: Animated.add(panX, thumbSize + padding * 2),
          backgroundColor: "rgba(212, 249, 56, 0.18)",
          borderRadius: 9999,
        }}
      />

      {/* Centered Title */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          alignItems: "center",
          justifyContent: "center",
          opacity: textOpacity,
        }}
      >
        <Text
          style={{
            color: "rgba(212, 249, 56, 0.95)",
            fontSize: 15,
            fontWeight: "700",
            letterSpacing: 0.6,
          }}
        >
          {title}
        </Text>
      </Animated.View>

      {/* Draggable Circular Thumb */}
      <Animated.View
        {...panResponder.panHandlers}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 30 }}
        style={{
          position: "absolute",
          left: padding,
          top: "50%",
          marginTop: -thumbSize / 2,
          width: thumbSize,
          height: thumbSize,
          borderRadius: thumbSize / 2,
          backgroundColor: "#D4F938",
          alignItems: "center",
          justifyContent: "center",
          transform: [{ translateX: panX }],
          elevation: 8,
          shadowColor: "#D4F938",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.45,
          shadowRadius: 6,
        }}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color="#0B0D12" />
        ) : (
          <Ionicons name="chevron-forward" size={24} color="#0B0D12" />
        )}
      </Animated.View>
    </View>
  );
}

export default SlideButton;
