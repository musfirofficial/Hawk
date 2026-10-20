import { Ionicons } from "@expo/vector-icons";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/auth";
import { BiometricAuthType } from "../services/biometrics";
import { HawkModal } from "./HawkModal";
import { SafeTouchable } from "./common/SafeTouchable";

export interface SetUpPinHandle {
  handleBack: () => boolean;
}

export interface SetUpPinProps {
  headerTitle?: string;
  createTitle?: string;
  confirmTitle?: string;
  createSubtitle?: string;
  confirmSubtitle?: string;
  verifyTitle?: string;
  verifySubtitle?: string;
  onSuccess: (pin: string, enableBiometrics: boolean) => void | Promise<void>;
  onBack?: () => void;
  showBack?: boolean;
  showTopBar?: boolean;
  showSkip?: boolean;
  onSkip?: () => void;
  skipLabel?: string;
  isChangePin?: boolean;
  showResetPin?: boolean;
  onResetPinPress?: () => void;
  mode?: "setup" | "verify";
  showBiometric?: boolean;
  biometricType?: BiometricAuthType;
  onBiometricPress?: () => void;
  onVerify?: (pin: string) => boolean | Promise<boolean>;
}

type PinStep = "CURRENT" | "CREATE" | "CONFIRM" | "VERIFY";

export const SetUpPin = forwardRef<SetUpPinHandle, SetUpPinProps>(
  function SetUpPin(
    {
      createTitle = "Create PIN",
      confirmTitle = "Confirm PIN",
      createSubtitle = "Enter your secure four-digit code",
      confirmSubtitle = "Re-enter your four-digit code",
      verifyTitle = "Enter PIN",
      verifySubtitle = "Enter your 4-digit security PIN",
      onSuccess,
      onBack,
      showBack = true,
      showTopBar = true,
      showSkip = false,
      onSkip,
      skipLabel = "Set up PIN later",
      isChangePin = false,
      showResetPin = isChangePin,
      onResetPinPress,
      mode = "setup",
      showBiometric = false,
      biometricType = null,
      onBiometricPress,
      onVerify,
    },
    ref,
  ) {
    const {
      settings,
      hasPin,
      verifyPin,
      verifyRecoveryKey,
      getPinLockoutSeconds,
      recordFailedPinAttempt,
      resetPinAttempts,
      getRecoveryLockoutSeconds,
      recordFailedRecoveryAttempt,
      resetRecoveryAttempts,
    } = useAuth();
    const hasExistingPin = Boolean(isChangePin && (hasPin ?? Boolean(settings?.pin)));

    const [step, setStep] = useState<PinStep>(
      mode === "verify" ? "VERIFY" : hasExistingPin ? "CURRENT" : "CREATE",
    );
    const [createdPin, setCreatedPin] = useState("");
    const [currentPin, setCurrentPin] = useState("");
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [isResetMode, setIsResetMode] = useState(false);
    const [pinLockoutSeconds, setPinLockoutSeconds] = useState(0);
    const [recoveryLockoutSeconds, setRecoveryLockoutSeconds] = useState(0);

    // Check initial PIN lockout state
    useEffect(() => {
      const remaining = getPinLockoutSeconds();
      if (remaining > 0) {
        setPinLockoutSeconds(remaining);
      }
    }, [getPinLockoutSeconds]);

    // Reset PIN Modal state
    const [isResetModalVisible, setIsResetModalVisible] = useState(false);
    const [resetCode, setResetCode] = useState("");
    const [resetError, setResetError] = useState<string | null>(null);
    const [isResetSuccess, setIsResetSuccess] = useState(false);
    const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Check initial Recovery lockout state
    useEffect(() => {
      const remaining = getRecoveryLockoutSeconds();
      if (remaining > 0) {
        setRecoveryLockoutSeconds(remaining);
      }
    }, [getRecoveryLockoutSeconds, isResetModalVisible]);

    // PIN lockout countdown timer
    useEffect(() => {
      if (pinLockoutSeconds <= 0) return;
      const interval = setInterval(() => {
        setPinLockoutSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }, [pinLockoutSeconds]);

    // Recovery lockout countdown timer
    useEffect(() => {
      if (recoveryLockoutSeconds <= 0) return;
      const interval = setInterval(() => {
        setRecoveryLockoutSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }, [recoveryLockoutSeconds]);

    useEffect(() => {
      return () => {
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
        }
      };
    }, []);

    function handleCodeChange(val: string) {
      if (isResetSuccess) return;
      const cleaned = val
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8);
      if (cleaned.length > 4) {
        setResetCode(`${cleaned.slice(0, 4)}-${cleaned.slice(4)}`);
      } else {
        setResetCode(cleaned);
      }
      setResetError(null);
    }

    async function handleVerifyResetCode() {
      if (isResetSuccess || recoveryLockoutSeconds > 0) return;
      const cleanedInput = resetCode.toUpperCase().replace(/[^A-Z0-9]/g, "");

      if (cleanedInput.length < 8) {
        setResetError("Please enter the complete 8-character code.");
        return;
      }

      const isValid = await verifyRecoveryKey(cleanedInput);
      if (isValid) {
        await resetRecoveryAttempts();
        setIsResetSuccess(true);
        setResetError(null);

        resetTimerRef.current = setTimeout(() => {
          setIsResetModalVisible(false);
          setIsResetMode(true);
          setStep("CREATE");
          setCurrentPin("");
          setCreatedPin("");
          setErrorMsg(null);
          setResetCode("");
          setIsResetSuccess(false);
        }, 1000);
      } else {
        if (Platform.OS !== "web") {
          Vibration.vibrate(150);
        }
        const res = await recordFailedRecoveryAttempt();
        if (res.lockedOut) {
          setRecoveryLockoutSeconds(res.remainingSeconds);
          setResetError(`Too many attempts. Try again in ${res.remainingSeconds}s`);
        } else {
          setResetError("Incorrect recovery code. Please try again.");
        }
      }
    }

    function handleCloseResetModal() {
      if (isResetSuccess) return;
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
      }
      setIsResetModalVisible(false);
      setResetCode("");
      setResetError(null);
      setIsResetSuccess(false);
    }

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
          if (isResetMode) {
            if (onBack) onBack();
            return true;
          }
          setStep("CURRENT");
          setCurrentPin("");
          return true;
        }
        if (step === "VERIFY" && onBack) {
          onBack();
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
        if (step === "VERIFY") {
          setIsSubmitting(true);
          (async () => {
            try {
              let isValid = false;
              if (onVerify) {
                isValid = await onVerify(next);
              } else {
                isValid = await verifyPin(next);
              }

              if (isValid) {
                await resetPinAttempts();
                setTimeout(() => {
                  onSuccess(next, false);
                }, 150);
              } else {
                if (Platform.OS !== "web") {
                  Vibration.vibrate(150);
                }
                const res = await recordFailedPinAttempt();
                if (res.lockedOut) {
                  setPinLockoutSeconds(res.remainingSeconds);
                  setErrorMsg(`Too many attempts. Try again in ${res.remainingSeconds}s`);
                } else {
                  setErrorMsg("Incorrect PIN. Please try again.");
                }
                setTimeout(() => {
                  setCurrentPin("");
                  setIsSubmitting(false);
                }, 350);
              }
            } catch (err: any) {
              setErrorMsg(err?.message || "Verification failed");
              setCurrentPin("");
              setIsSubmitting(false);
            }
          })();
        } else if (step === "CURRENT") {
          (async () => {
            const isCurrentValid = await verifyPin(next);
            if (isCurrentValid) {
              await resetPinAttempts();
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
              const res = await recordFailedPinAttempt();
              if (res.lockedOut) {
                setPinLockoutSeconds(res.remainingSeconds);
                setErrorMsg(`Too many attempts. Try again in ${res.remainingSeconds}s`);
              } else {
                setErrorMsg("Incorrect current PIN. Please try again.");
              }
              setTimeout(() => {
                setCurrentPin("");
                setIsSubmitting(false);
              }, 350);
            }
          })();
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
        if (isResetMode) {
          if (onBack) onBack();
          return;
        }
        setStep("CURRENT");
        setCurrentPin("");
      } else if (onBack) {
        onBack();
      }
    }

    let displayTitle = "";
    let displaySubtitle = "";

    if (step === "VERIFY") {
      displayTitle = verifyTitle;
      displaySubtitle = verifySubtitle;
    } else if (step === "CURRENT") {
      displayTitle = "Current PIN";
      displaySubtitle = "Enter your current four-digit code";
    } else if (step === "CREATE") {
      displayTitle = createTitle;
      displaySubtitle = createSubtitle;
    } else {
      displayTitle = confirmTitle;
      displaySubtitle = confirmSubtitle;
    }

    const isPadDisabled = isSubmitting || saving || pinLockoutSeconds > 0;

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

          {pinLockoutSeconds > 0 ? (
            <Text className="text-brand-expense text-xs font-semibold text-center mt-2">
              Too many attempts. Try again in {pinLockoutSeconds}s
            </Text>
          ) : errorMsg ? (
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
            {mode === "verify" && showBiometric && onBiometricPress ? (
              <TouchableOpacity
                onPress={onBiometricPress}
                disabled={isPadDisabled}
                delayPressIn={0}
                className="w-[72px] h-[72px] rounded-full bg-dark-surface border border-dark-border/40 items-center justify-center active:bg-dark-card"
                activeOpacity={0.6}
              >
                <Ionicons
                  name={
                    biometricType === "FACE_ID"
                      ? "scan-outline"
                      : "finger-print-outline"
                  }
                  size={26}
                  color="#F8FAFC"
                />
              </TouchableOpacity>
            ) : (
              <View className="w-[72px] h-[72px]" />
            )}

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

        {/* Footer / Skip or Reset PIN Link */}
        <View className="items-center pt-2 min-h-[44px] justify-center">
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

          {showResetPin && (step === "CURRENT" || step === "VERIFY") && (
            <TouchableOpacity
              disabled={isResetModalVisible}
              onPress={() => {
                if (onResetPinPress) {
                  onResetPinPress();
                  return;
                }
                if (isResetModalVisible) return;
                setResetCode("");
                setResetError(null);
                setIsResetSuccess(false);
                setIsResetModalVisible(true);
              }}
              delayPressIn={0}
              hitSlop={{ top: 20, bottom: 20, left: 30, right: 30 }}
              className="py-2.5 px-4 items-center justify-center"
              activeOpacity={0.6}
            >
              <Text className="text-dark-muted text-sm font-medium underline">
                Reset PIN
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Reset PIN Modal with strong blur / opaque overlay */}
        <HawkModal
          visible={isResetModalVisible}
          animationType="fade"
          onRequestClose={handleCloseResetModal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1 justify-center items-center px-6"
            style={[
              { backgroundColor: "rgba(7, 9, 14, 0.95)" },
              Platform.OS === "web"
                ? ({
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                  } as any)
                : null,
            ]}
          >
            <View className="w-full max-w-sm bg-dark-surface border border-dark-border/80 rounded-3xl p-6 items-center shadow-2xl">
              <Text className="text-dark-text text-xl font-bold tracking-tight text-center mb-2">
                Reset PIN
              </Text>

              <Text className="text-dark-muted text-xs text-center leading-relaxed mb-6 px-2">
                Enter your 8-character recovery code to reset your security PIN.
              </Text>

              <View className="w-full mb-2">
                <TextInput
                  value={resetCode}
                  onChangeText={handleCodeChange}
                  editable={!isResetSuccess}
                  placeholder="XXXX-XXXX"
                  placeholderTextColor="#475569"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={9}
                  className={`w-full bg-dark-bg border ${
                    isResetSuccess
                      ? "border-emerald-500/60 text-emerald-400"
                      : "border-dark-border text-dark-text"
                  } rounded-2xl py-3 px-4 text-center text-2xl font-bold tracking-widest font-mono`}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyResetCode}
                />
              </View>

              {isResetSuccess ? (
                <View className="flex-row items-center justify-center gap-1.5 mb-4">
                  <Ionicons name="checkmark-circle" size={16} color="#4ADE80" />
                  <Text className="text-[#4ADE80] text-xs font-semibold text-center">
                    Recovery code verified! Redirecting...
                  </Text>
                </View>
              ) : resetError ? (
                <Text className="text-brand-expense text-xs font-semibold text-center mb-4">
                  {resetError}
                </Text>
              ) : (
                <View className="h-4" />
              )}

              {isResetSuccess ? (
                <View className="w-full py-4 rounded-full items-center justify-center mb-2 shadow-lg bg-[#4ADE80] flex-row gap-2">
                  <Ionicons name="checkmark" size={18} color="#0B0D12" />
                  <Text className="font-bold text-base text-dark-bg">
                    Verified
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={handleVerifyResetCode}
                  disabled={
                    resetCode.replace(/[^A-Z0-9]/g, "").length < 8 ||
                    recoveryLockoutSeconds > 0
                  }
                  className={`w-full py-4 rounded-full items-center justify-center mb-2 shadow-lg ${
                    resetCode.replace(/[^A-Z0-9]/g, "").length === 8 &&
                    recoveryLockoutSeconds <= 0
                      ? "bg-brand-accent active:opacity-90"
                      : "bg-dark-border/40 opacity-50"
                  }`}
                  activeOpacity={0.8}
                >
                  <Text
                    className={`font-bold text-base ${
                      resetCode.replace(/[^A-Z0-9]/g, "").length === 8 &&
                      recoveryLockoutSeconds <= 0
                        ? "text-dark-bg"
                        : "text-dark-muted"
                    }`}
                  >
                    {recoveryLockoutSeconds > 0
                      ? `Locked Out (${recoveryLockoutSeconds}s)`
                      : "Verify Code"}
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleCloseResetModal}
                disabled={isResetSuccess}
                className={`w-full py-2.5 items-center ${isResetSuccess ? "opacity-30" : ""}`}
                activeOpacity={0.7}
              >
                <Text className="text-dark-muted text-sm font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </HawkModal>
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
  },
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
