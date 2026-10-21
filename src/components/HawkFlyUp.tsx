import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Animated,
  PanResponder,
  StyleProp,
  ViewStyle,
  DimensionValue,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HawkModal } from "./HawkModal";

export interface HawkFlyUpProps {
  /** Visibility state of the fly-up modal */
  visible: boolean;
  /** Function invoked when the fly-up is closed */
  onClose: () => void;
  /** Primary title displayed in the header */
  title?: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Whether to show the top circular close button (default: true) */
  showCloseButton?: boolean;
  /** Whether to show the top drag handle pill (default: true) */
  showDragHandle?: boolean;
  /** Whether pulling down dismisses the fly-up (default: true) */
  enableSwipeToDismiss?: boolean;
  /** Max height of the fly-up container */
  maxHeight?: DimensionValue;
  /** Extra container styling */
  style?: StyleProp<ViewStyle>;
  /** Tailwind / NativeWind classes for the card container */
  className?: string;
  /** Children rendered inside the fly-up */
  children: React.ReactNode;
  /** Whether the modal should automatically lift above the keypad (default: true) */
  avoidKeyboard?: boolean;
  /** Optional vertical offset for the keyboard avoiding view */
  keyboardVerticalOffset?: number;
}

export function HawkFlyUp({
  visible,
  onClose,
  title,
  subtitle,
  showCloseButton = true,
  showDragHandle = true,
  enableSwipeToDismiss = true,
  maxHeight,
  style,
  className = "",
  children,
  avoidKeyboard = true,
  keyboardVerticalOffset = 0,
}: HawkFlyUpProps) {
  const insets = useSafeAreaInsets();
  const panYRef = useRef(new Animated.Value(0));
  const panY = panYRef.current;
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Track keyboard height dynamically to reliably lift modal above keypad on Android
  useEffect(() => {
    if (!avoidKeyboard) return;

    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [avoidKeyboard]);

  const isClosingRef = useRef(false);

  // Reset drag position on open and clear keyboard offset on close
  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      panY.setValue(0);
    } else {
      setKeyboardHeight(0);
    }
  }, [visible, panY]);

  const resetPosition = () => {
    Animated.spring(panY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };

  const closeFlyUp = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    Animated.timing(panY, {
      toValue: 500,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      panY.setValue(0);
      isClosingRef.current = false;
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => enableSwipeToDismiss,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return enableSwipeToDismiss && gestureState.dy > 4;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 70 || gestureState.vy > 0.6) {
          closeFlyUp();
        } else {
          resetPosition();
        }
      },
    })
  ).current;

  const modalBody = (
    <>
      {/* Backdrop dismiss */}
      <Pressable
        className="flex-1"
        onPress={() => {
          Keyboard.dismiss();
          onClose();
        }}
      />

      {/* Fly-up Bottom Card */}
      <Animated.View
        style={[
          {
            transform: [{ translateY: panY }],
            maxHeight: maxHeight,
            paddingBottom:
              Math.max(insets.bottom, 24) +
              (Platform.OS === "android" && avoidKeyboard ? keyboardHeight : 0),
          },
          style,
        ]}
        className={`bg-dark-surface rounded-t-3xl px-5 pt-3 ${className}`}
      >
        {/* Top Drag Handle Bar */}
        {showDragHandle ? (
          <View
            {...panResponder.panHandlers}
            className="items-center py-2 -mt-1 active:opacity-70"
          >
            <View className="w-12 h-1.5 bg-dark-border rounded-full" />
          </View>
        ) : null}

        {/* Optional Sheet Header */}
        {(title || showCloseButton) ? (
          <View className="flex-row items-center justify-between pb-4 mb-4 border-b border-dark-border/50">
            <View className="flex-1 mr-2">
              {title ? (
                <Text className="text-dark-text text-lg font-bold">
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text className="text-dark-muted text-xs mt-0.5 font-medium">
                  {subtitle}
                </Text>
              ) : null}
            </View>
            {showCloseButton ? (
              <TouchableOpacity
                onPress={() => {
                  Keyboard.dismiss();
                  onClose();
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center active:bg-dark-cardHover"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Body Content */}
        {children}
      </Animated.View>
    </>
  );

  return (
    <HawkModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      {avoidKeyboard ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={keyboardVerticalOffset}
          className="flex-1 justify-end bg-black/70"
        >
          {modalBody}
        </KeyboardAvoidingView>
      ) : (
        <View className="flex-1 justify-end bg-black/70">{modalBody}</View>
      )}
    </HawkModal>
  );
}

export default HawkFlyUp;
