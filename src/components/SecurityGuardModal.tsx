import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../context/auth";
import {
  authenticateWithBiometrics,
  getBiometricCapability,
} from "../services/biometrics";

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
  const { settings } = useAuth();
  const [viewMode, setViewMode] = useState<"BIOMETRIC" | "PIN">("PIN");
  const [enteredPin, setEnteredPin] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<
    "FINGERPRINT" | "FACE_ID" | "TOUCH_ID" | null
  >(null);
  const [biometricLabel, setBiometricLabel] = useState("Biometrics");

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

  // Attempt automatic biometrics on open if in BIOMETRIC view
  useEffect(() => {
    let isMounted = true;

    async function promptBioAuto() {
      if (!visible || viewMode !== "BIOMETRIC") return;
      if (settings?.biometricsEnabled && biometricAvailable) {
        setTimeout(async () => {
          if (!isMounted) return;
          const res = await authenticateWithBiometrics(
            description || title || "Confirm Action"
          );
          if (res.success && isMounted) {
            onSuccess();
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

  function handleKeyPress(num: string) {
    if (enteredPin.length >= 4) return;
    setErrorMsg(null);

    const next = enteredPin + num;
    setEnteredPin(next);

    if (next.length === 4) {
      const savedPin = settings?.pin;

      // If no PIN set in DB, allow access
      if (!savedPin || next === savedPin) {
        setTimeout(() => {
          onSuccess();
        }, 100);
      } else {
        if (Platform.OS !== "web") {
          Vibration.vibrate(100);
        }
        setErrorMsg("Incorrect PIN. Please try again.");
        setTimeout(() => {
          setEnteredPin("");
        }, 300);
      }
    }
  }

  function handleDeletePress() {
    setErrorMsg(null);
    if (enteredPin.length > 0) {
      setEnteredPin((prev) => prev.slice(0, -1));
    }
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View className="flex-1 bg-black/80 justify-center items-center px-6">
        <SafeAreaView className="w-full max-w-sm bg-dark-surface border border-dark-border rounded-3xl p-6 items-center shadow-2xl">
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

              {errorMsg && (
                <Text className="text-brand-expense text-xs font-semibold text-center mb-4">
                  {errorMsg}
                </Text>
              )}

              {/* Verify Button */}
              <TouchableOpacity
                onPress={handleManualBiometric}
                className="w-full py-4 rounded-full bg-brand-accent items-center justify-center mb-3 shadow-lg active:opacity-90"
                activeOpacity={0.8}
              >
                <Text className="text-dark-bg font-bold text-sm tracking-wide">
                  Verify with {biometricLabel}
                </Text>
              </TouchableOpacity>

              {/* Use PIN Link (Switches to Current Layout) */}
              <TouchableOpacity
                onPress={() => {
                  setErrorMsg(null);
                  setViewMode("PIN");
                }}
                className="py-2.5 px-4 mb-2"
                activeOpacity={0.7}
              >
                <Text className="text-brand-accent font-semibold text-sm">
                  Use your PIN
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
            /* VIEW 2: 4-DIGIT PIN NUMPAD VIEW (CURRENT LAYOUT) */
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

              {/* 4 PIN Boxes */}
              <View className="flex-row items-center justify-center gap-4 mb-6">
                {[0, 1, 2, 3].map((index) => {
                  const isFilled = enteredPin.length > index;
                  return (
                    <View
                      key={index}
                      className={`w-14 h-14 rounded-2xl items-center justify-center border-2 ${
                        isFilled
                          ? "border-brand-accent bg-brand-accent/15"
                          : "border-dark-border bg-dark-card"
                      }`}
                    >
                      {isFilled && (
                        <View className="w-3.5 h-3.5 rounded-full bg-brand-accent" />
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Error Message */}
              {errorMsg ? (
                <Text className="text-brand-expense text-xs font-semibold text-center mb-4">
                  {errorMsg}
                </Text>
              ) : (
                <View className="h-5 mb-3" />
              )}

              {/* Numeric Keypad */}
              <View className="w-full gap-3 mb-4">
                {/* Row 1 */}
                <View className="flex-row justify-between">
                  {["1", "2", "3"].map((digit) => (
                    <KeypadButton
                      key={digit}
                      value={digit}
                      onPress={() => handleKeyPress(digit)}
                    />
                  ))}
                </View>

                {/* Row 2 */}
                <View className="flex-row justify-between">
                  {["4", "5", "6"].map((digit) => (
                    <KeypadButton
                      key={digit}
                      value={digit}
                      onPress={() => handleKeyPress(digit)}
                    />
                  ))}
                </View>

                {/* Row 3 */}
                <View className="flex-row justify-between">
                  {["7", "8", "9"].map((digit) => (
                    <KeypadButton
                      key={digit}
                      value={digit}
                      onPress={() => handleKeyPress(digit)}
                    />
                  ))}
                </View>

                {/* Row 4: Biometrics / 0 / Backspace */}
                <View className="flex-row justify-between items-center">
                  {biometricAvailable && settings?.biometricsEnabled ? (
                    <TouchableOpacity
                      onPress={() => {
                        setErrorMsg(null);
                        setViewMode("BIOMETRIC");
                        handleManualBiometric();
                      }}
                      className="w-20 h-16 rounded-2xl items-center justify-center active:bg-dark-card"
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={
                          biometricType === "FACE_ID"
                            ? "scan-outline"
                            : "finger-print"
                        }
                        size={28}
                        color="#D4F938"
                      />
                    </TouchableOpacity>
                  ) : (
                    <View className="w-20 h-16" />
                  )}

                  <KeypadButton value="0" onPress={() => handleKeyPress("0")} />

                  <TouchableOpacity
                    onPress={handleDeletePress}
                    className="w-20 h-16 rounded-2xl items-center justify-center active:bg-dark-card"
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name="backspace-outline"
                      size={26}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

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
        </SafeAreaView>
      </View>
    </Modal>
  );
}

function KeypadButton({
  value,
  onPress,
}: {
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="w-20 h-16 rounded-2xl items-center justify-center bg-dark-card/50 active:bg-brand-accent/20 active:border active:border-brand-accent/40"
      activeOpacity={0.6}
    >
      <Text className="text-dark-text text-2xl font-bold">{value}</Text>
    </TouchableOpacity>
  );
}
