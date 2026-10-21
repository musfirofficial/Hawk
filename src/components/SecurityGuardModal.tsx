import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { formatLockoutRemaining, useAuth } from "../context/auth";
import {
  authenticateWithBiometrics,
  getBiometricCapability,
} from "../services/biometrics";
import { HawkModal } from "./HawkModal";

export interface SecurityGuardModalProps {
  visible: boolean;
  title?: string;
  description?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SecurityGuardModal({
  visible,
  title = "Security Verification",
  description,
  onSuccess,
  onCancel,
}: SecurityGuardModalProps) {
  const {
    settings,
    verifyPin,
    hasPin,
    getPinLockoutSeconds,
    recordFailedPinAttempt,
    resetPinAttempts,
  } = useAuth();
  const [viewMode, setViewMode] = useState<"BIOMETRIC" | "PIN">("PIN");
  const [enteredPin, setEnteredPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pinLockoutSeconds, setPinLockoutSeconds] = useState(0);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<
    "FINGERPRINT" | "FACE_ID" | "TOUCH_ID" | null
  >(null);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");

  const pinInputRef = useRef<TextInput>(null);
  const onSuccessRef = useRef(onSuccess);
  const descriptionRef = useRef(description);
  const titleRef = useRef(title);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    descriptionRef.current = description;
    titleRef.current = title;
  });

  // Check initial lockout state when modal becomes visible
  useEffect(() => {
    if (visible) {
      const remaining = getPinLockoutSeconds();
      if (remaining > 0) {
        setPinLockoutSeconds(remaining);
      }
    }
  }, [visible, getPinLockoutSeconds]);

  // Lockout countdown timer
  useEffect(() => {
    if (pinLockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setPinLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [pinLockoutSeconds]);

  // Check biometric capability when modal opens
  useEffect(() => {
    async function checkBio() {
      const cap = await getBiometricCapability();
      setBiometricAvailable(cap.isAvailable);
      setBiometricType(cap.type);
      setBiometricLabel(cap.label);

      // If biometrics is available & enabled, start in BIOMETRIC mode first!
      if (cap.isAvailable && settings?.biometricsEnabled) {
        setViewMode("BIOMETRIC");
      } else {
        setViewMode("PIN");
      }
    }

    if (visible) {
      checkBio();
      setEnteredPin("");
      setErrorMsg(null);
    }
  }, [visible, settings?.biometricsEnabled]);

  // When switching to or opening in PIN mode, automatically focus the hidden input to open the numpad
  useEffect(() => {
    if (visible && viewMode === "PIN") {
      const timer = setTimeout(() => {
        pinInputRef.current?.focus();
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [visible, viewMode]);

  // Attempt automatic biometrics on open if in BIOMETRIC view
  useEffect(() => {
    let isMounted = true;

    async function promptBioAuto() {
      if (!visible || viewMode !== "BIOMETRIC") return;
      if (settings?.biometricsEnabled && biometricAvailable) {
        setTimeout(async () => {
          if (!isMounted) return;
          const res = await authenticateWithBiometrics(
            descriptionRef.current || titleRef.current || "Confirm Action"
          );
          if (res.success && isMounted) {
            onSuccessRef.current();
          } else if (res.error && res.error !== "Cancelled" && isMounted) {
            setErrorMsg(res.error);
          }
        }, 200);
      }
    }

    promptBioAuto();

    return () => {
      isMounted = false;
    };
  }, [visible, viewMode, settings?.biometricsEnabled, biometricAvailable]);

  // Manual biometric trigger
  async function handleManualBiometric() {
    setErrorMsg(null);
    const res = await authenticateWithBiometrics(
      description || title || "Confirm Action"
    );
    if (res.success) {
      onSuccess();
    } else if (res.error && res.error !== "Cancelled") {
      setErrorMsg(res.error);
    }
  }

  function handlePinChange(text: string) {
    if (pinLockoutSeconds > 0) return;
    const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
    setEnteredPin(cleaned);
    setErrorMsg(null);

    if (cleaned.length === 4) {
      (async () => {
        // If no PIN set, allow access
        if (!hasPin) {
          setTimeout(() => {
            onSuccess();
          }, 100);
          return;
        }

        const isValid = await verifyPin(cleaned);
        if (isValid) {
          await resetPinAttempts();
          setTimeout(() => {
            onSuccess();
          }, 100);
        } else {
          if (Platform.OS !== "web") {
            Vibration.vibrate(100);
          }
          const res = await recordFailedPinAttempt();
          if (res.lockedOut) {
            setPinLockoutSeconds(res.remainingSeconds);
            setErrorMsg(null);
          } else {
            setErrorMsg("Incorrect PIN. Please try again.");
          }
          setTimeout(() => {
            setEnteredPin("");
          }, 350);
        }
      })();
    }
  }

  if (!visible) return null;

  return (
    <HawkModal visible={visible} animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-black/80 justify-center items-center px-6"
      >
        <View className="w-full max-w-sm bg-dark-surface border border-dark-border rounded-3xl p-6 items-center shadow-2xl">
          {/* ======================================================== */}
          {/* VIEW 1: DYNAMIC BIOMETRIC FIRST VIEW */}
          {/* ======================================================== */}
          {viewMode === "BIOMETRIC" ? (
            <View className="w-full items-center">
              {/* Dynamic Biometric Icon Badge */}
              <TouchableOpacity
                onPress={handleManualBiometric}
                className="w-24 h-24 rounded-full bg-brand-accent/15 border border-brand-accent/40 items-center justify-center mb-5 active:scale-95"
                activeOpacity={0.8}
              >
                <Ionicons
                  name={
                    biometricType === "FACE_ID"
                      ? "scan-outline"
                      : "finger-print"
                  }
                  size={48}
                  color="#D4F938"
                />
              </TouchableOpacity>

              {/* Dynamic Title */}
              <Text className="text-dark-text text-xl font-bold tracking-tight text-center mb-2">
                Use {biometricLabel}
              </Text>

              {/* Description */}
              <Text className="text-dark-muted text-xs text-center leading-relaxed mb-6 px-4">
                {description ||
                  `Authenticate with ${biometricLabel} to complete verification`}
              </Text>

              {/* Use PIN Button */}
              <TouchableOpacity
                onPress={() => {
                  setErrorMsg(null);
                  setViewMode("PIN");
                }}
                className="w-full py-4 rounded-full bg-brand-accent items-center justify-center mb-3 shadow-lg active:opacity-90"
                activeOpacity={0.8}
              >
                <Text className="text-dark-bg font-bold text-sm tracking-wide">
                  Use PIN
                </Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={onCancel}
                className="py-2 px-4"
                activeOpacity={0.7}
              >
                <Text className="text-dark-muted text-xs font-medium">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* ======================================================== */
            /* VIEW 2: 4 CIRCLE PLACEHOLDERS + DEVICE NUMPAD KEYBOARD */
            /* ======================================================== */
            <View className="w-full items-center">
              {/* Header Title */}
              <Text className="text-dark-text text-xl font-bold tracking-tight text-center mb-1">
                {title}
              </Text>

              {/* Subtitle / Description */}
              <Text className="text-dark-muted text-xs text-center mb-6 px-2">
                {description || "Enter your 4-digit security PIN to verify"}
              </Text>

              {/* 4 Circle Placeholders */}
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => pinInputRef.current?.focus()}
                className="flex-row items-center justify-center gap-4 mb-6"
              >
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = enteredPin.length > index;
                  return (
                    <View
                      key={index}
                      className={`w-14 h-14 rounded-full items-center justify-center border-2 ${
                        isFilled
                          ? "border-brand-accent bg-brand-accent/20"
                          : "border-dark-border bg-dark-card"
                      }`}
                    >
                      {isFilled && (
                        <View className="w-4 h-4 rounded-full bg-brand-accent" />
                      )}
                    </View>
                  );
                })}
              </TouchableOpacity>

              {/* Hidden TextInput that triggers the device's native numpad */}
              <TextInput
                ref={pinInputRef}
                value={enteredPin}
                onChangeText={handlePinChange}
                editable={pinLockoutSeconds === 0}
                keyboardType="number-pad"
                maxLength={4}
                autoFocus={true}
                caretHidden={true}
                style={{
                  position: "absolute",
                  opacity: 0,
                  width: 1,
                  height: 1,
                }}
              />

              {/* Error or Lockout Message */}
              {pinLockoutSeconds > 0 ? (
                <Text className="text-brand-expense text-xs font-semibold text-center mb-4">
                  Too many attempts. Try again in {formatLockoutRemaining(pinLockoutSeconds)}
                </Text>
              ) : errorMsg ? (
                <Text className="text-brand-expense text-xs font-semibold text-center mb-4">
                  {errorMsg}
                </Text>
              ) : (
                <View className="h-5 mb-2" />
              )}

              {/* Switch back to biometrics link if enabled */}
              {biometricAvailable && settings?.biometricsEnabled && (
                <TouchableOpacity
                  onPress={() => {
                    setErrorMsg(null);
                    setViewMode("BIOMETRIC");
                  }}
                  className="py-2 px-4 mb-2"
                  activeOpacity={0.7}
                >
                  <Text className="text-brand-accent font-semibold text-xs">
                    Use {biometricLabel} instead
                  </Text>
                </TouchableOpacity>
              )}

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={onCancel}
                className="py-2.5 px-6 rounded-full items-center justify-center"
                activeOpacity={0.7}
              >
                <Text className="text-dark-muted text-sm font-semibold">
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </HawkModal>
  );
}
