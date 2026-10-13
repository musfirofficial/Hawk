import { Ionicons } from "@expo/vector-icons";
import React, { forwardRef, useImperativeHandle, useState } from "react";
import {
  Platform,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/auth";

export interface SetUpPinHandle {
  handleBack: () => boolean;
}

export interface SetUpPinProps {
  headerTitle?: string;
  createTitle?: string;
  confirmTitle?: string;
  createSubtitle?: string;
  confirmSubtitle?: string;
  onSuccess: (pin: string, enableBiometrics: boolean) => void | Promise<void>;
  onBack?: () => void;
  showBack?: boolean;
  showTopBar?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
  isChangePin?: boolean;
}

type PinStep = "CURRENT" | "CREATE" | "CONFIRM";

export const SetUpPin = forwardRef<SetUpPinHandle, SetUpPinProps>(
  function SetUpPin(
    {
      headerTitle,
      createTitle = "Create PIN",
      confirmTitle = "Confirm PIN",
      createSubtitle = "Enter your secure four-digit code",
      confirmSubtitle = "Re-enter your four-digit code",
      onSuccess,
      onBack,
      showBack = true,
      showTopBar = true,
      showSkip = false,
      onSkip,
      skipLabel = "Set up PIN later",
      isChangePin = false,
    },
    ref
  ) {
    const { settings } = useAuth();
    const hasExistingPin = Boolean(isChangePin && settings?.pin);

    const [step, setStep] = useState<PinStep>(
      hasExistingPin ? "CURRENT" : "CREATE"
    );
    const [createdPin, setCreatedPin] = useState("");
    const [currentPin, setCurrentPin] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saving, setSaving] = useState(false);

    useImperativeHandle(ref, () => ({
      handleBack: () => {
        if (isSubmitting || saving) return true;
        setErrorMsg(null);
        if (step === "CONFIRM") {
          setStep("CREATE");
          setCurrentPin("");
          setCreatedPin("");
          return true;
        }
        if (step === "CREATE" && hasExistingPin) {
          setStep("CURRENT");
          setCurrentPin("");
          return true;
        }
        return false;
      },
    }));

    function handleKeyPress(num: string) {
      if (isSubmitting || saving || currentPin.length >= 4) return;
      setErrorMsg(null);

      const next = currentPin + num;
      setCurrentPin(next);

      if (next.length === 4) {
        if (step === "CURRENT") {
          if (settings?.pin && next === settings.pin) {
            setIsSubmitting(true);
            setTimeout(() => {
              setStep("CREATE");
              setCurrentPin("");
              setIsSubmitting(false);
            }, 180);
          } else {
            if (Platform.OS !== "web") {
              Vibration.vibrate(150);
            }
            setErrorMsg("Incorrect current PIN. Please try again.");
            setTimeout(() => {
              setCurrentPin("");
            }, 350);
          }
        } else if (step === "CREATE") {
          setIsSubmitting(true);
          setTimeout(() => {
            setCreatedPin(next);
            setCurrentPin("");
            setStep("CONFIRM");
            setIsSubmitting(false);
          }, 180);
        } else {
          // Step === "CONFIRM"
          if (next === createdPin) {
            setIsSubmitting(true);
            setTimeout(() => {
              finalizePin(next, false);
            }, 150);
          } else {
            if (Platform.OS !== "web") {
              Vibration.vibrate(150);
            }
            setErrorMsg("PINs do not match. Please start again.");
            setTimeout(() => {
              setCreatedPin("");
              setCurrentPin("");
              setStep("CREATE");
            }, 350);
          }
        }
      }
    }

    function handleDeletePress() {
      if (isSubmitting || saving) return;
      setErrorMsg(null);
      if (currentPin.length > 0) {
        setCurrentPin((prev) => prev.slice(0, -1));
      }
    }

    async function finalizePin(pinToSave: string, enableBio: boolean) {
      try {
        setSaving(true);
        setErrorMsg(null);
        await onSuccess(pinToSave, enableBio);
      } catch (err: any) {
        setErrorMsg(err?.message || "Failed to save PIN.");
        setIsSubmitting(false);
        setSaving(false);
      }
    }

    function handleBackAction() {
      if (isSubmitting || saving) return;
      setErrorMsg(null);
      if (step === "CONFIRM") {
        setStep("CREATE");
        setCurrentPin("");
        setCreatedPin("");
      } else if (step === "CREATE" && hasExistingPin) {
        setStep("CURRENT");
        setCurrentPin("");
      } else if (onBack) {
        onBack();
      }
    }

    let displayTitle = "";
    let displaySubtitle = "";

    if (step === "CURRENT") {
      displayTitle = "Current PIN";
      displaySubtitle = "Enter your current four-digit code";
    } else if (step === "CREATE") {
      displayTitle = createTitle;
      displaySubtitle = createSubtitle;
    } else {
      displayTitle = confirmTitle;
      displaySubtitle = confirmSubtitle;
    }

    const isPadDisabled = isSubmitting || saving;

    const Content = (
      <View className="flex-1 bg-dark-bg justify-between px-6 pt-4 pb-8">
        {/* Optional Top Bar if showTopBar is true */}
        {showTopBar ? (
          <View className="flex-row items-center justify-between">
            {showBack ? (
              <TouchableOpacity
                onPress={handleBackAction}
                disabled={isPadDisabled}
                delayPressIn={0}
                className="w-10 h-10 rounded-full items-center justify-center -ml-2"
                activeOpacity={0.7}
              >
                <Ionicons name="arrow-back" size={24} color="#F8FAFC" />
              </TouchableOpacity>
            ) : (
              <View className="w-10" />
            )}

            {headerTitle ? (
              <Text className="text-dark-muted text-xs font-semibold uppercase tracking-widest">
                {headerTitle}
              </Text>
            ) : (
              <View className="w-10" />
            )}
            <View className="w-10" />
          </View>
        ) : null}

        {/* Main Content: Title, Subtitle & 4 Circular Minimal Indicators */}
        <View className="items-center px-4">
          <Text className="text-dark-text text-2xl font-bold tracking-tight text-center mb-2">
            {displayTitle}
          </Text>

          <Text className="text-dark-muted text-xs text-center max-w-[280px] leading-relaxed mb-8">
            {displaySubtitle}
          </Text>

          {/* 4 Minimal Circular PIN Placeholders */}
          <View className="flex-row items-center justify-center gap-4 mb-4">
            {[0, 1, 2, 3].map((index) => {
              const isFilled = currentPin.length > index;
              return (
                <View
                  key={index}
                  className="w-14 h-14 rounded-full bg-dark-surface items-center justify-center"
                >
                  {isFilled && (
                    <View className="w-6 h-6 rounded-full bg-brand-accent" />
                  )}
                </View>
              );
            })}
          </View>

          {errorMsg ? (
            <Text className="text-brand-expense text-xs font-semibold text-center mt-2">
              {errorMsg}
            </Text>
          ) : (
            <View className="h-6" />
          )}
        </View>

        {/* Circular Keypad */}
        <View className="w-full max-w-[280px] mx-auto gap-4">
          <View className="flex-row justify-between">
            {["1", "2", "3"].map((digit) => (
              <KeypadButton
                key={digit}
                value={digit}
                onPress={() => handleKeyPress(digit)}
                disabled={isPadDisabled}
              />
            ))}
          </View>

          <View className="flex-row justify-between">
            {["4", "5", "6"].map((digit) => (
              <KeypadButton
                key={digit}
                value={digit}
                onPress={() => handleKeyPress(digit)}
                disabled={isPadDisabled}
              />
            ))}
          </View>

          <View className="flex-row justify-between">
            {["7", "8", "9"].map((digit) => (
              <KeypadButton
                key={digit}
                value={digit}
                onPress={() => handleKeyPress(digit)}
                disabled={isPadDisabled}
              />
            ))}
          </View>

          <View className="flex-row justify-between items-center">
            <View className="w-[72px] h-[72px]" />

            <KeypadButton
              value="0"
              onPress={() => handleKeyPress("0")}
              disabled={isPadDisabled}
            />

            <TouchableOpacity
              onPress={handleDeletePress}
              disabled={isPadDisabled}
              delayPressIn={0}
              className="w-[72px] h-[72px] rounded-full bg-dark-surface border border-dark-border/40 items-center justify-center active:bg-dark-card"
              activeOpacity={0.6}
            >
              <Ionicons name="backspace-outline" size={24} color="#F8FAFC" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer / Skip Link */}
        <View className="items-center pt-2">
          {showSkip && (
            <TouchableOpacity
              onPress={onSkip}
              disabled={isPadDisabled}
              className="py-2 px-4"
              activeOpacity={0.7}
            >
              <Text className="text-dark-muted text-xs font-medium">
                {skipLabel}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );

    if (showTopBar) {
      return (
        <SafeAreaView className="flex-1 bg-dark-bg justify-between">
          {Content}
        </SafeAreaView>
      );
    }

    return Content;
  }
);

function KeypadButton({
  value,
  onPress,
  disabled,
}: {
  value: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      delayPressIn={0}
      className="w-[72px] h-[72px] rounded-full items-center justify-center bg-dark-surface border border-dark-border/40 active:bg-dark-card active:border-brand-accent/40"
      activeOpacity={0.6}
    >
      <Text className="text-dark-text text-2xl font-bold">{value}</Text>
    </TouchableOpacity>
  );
}
