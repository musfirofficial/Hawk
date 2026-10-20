import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatLockoutRemaining, useAuth } from "../../context/auth";
import { useSafeRouter } from "../../hooks/useSafeRouter";

export default function VerifyCodeScreen() {
  const router = useSafeRouter();
  const {
    settings,
    verifyRecoveryKey,
    setRecoverySessionVerified,
    recordFailedRecoveryAttempt,
    resetRecoveryAttempts,
    getRecoveryLockoutSeconds,
  } = useAuth();
  const params = useLocalSearchParams<{ origin?: string }>();
  const origin = params.origin || "startup";

  const [code, setCode] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const inputRef = useRef<TextInput>(null);

  // Check initial lockout state
  useEffect(() => {
    const remaining = getRecoveryLockoutSeconds();
    if (remaining > 0) {
      setLockoutSeconds(remaining);
    }
  }, [getRecoveryLockoutSeconds]);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMsg(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  // Focus input automatically when not locked out
  useEffect(() => {
    if (lockoutSeconds === 0) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [lockoutSeconds]);

  function handleBack() {
    if (origin === "startup") {
      router.safeReplace("/" as any);
    } else {
      router.safeBack();
    }
  }

  // Intercept hardware back button
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [origin]);

  function handleCodeChange(val: string) {
    if (lockoutSeconds > 0) return;
    const cleaned = val
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);

    if (cleaned.length > 4) {
      setCode(`${cleaned.slice(0, 4)}-${cleaned.slice(4)}`);
    } else {
      setCode(cleaned);
    }
    setErrorMsg(null);
  }

  async function handleVerify() {
    if (lockoutSeconds > 0 || isVerifying) return;
    const cleanedInput = code.toUpperCase().replace(/[^A-Z0-9]/g, "");

    if (cleanedInput.length < 8) {
      setErrorMsg("Please enter the complete 8-character code");
      return;
    }

    setIsVerifying(true);
    const isValid = await verifyRecoveryKey(cleanedInput);

    if (isValid) {
      await resetRecoveryAttempts();
      setRecoverySessionVerified(true);
      setIsVerifying(false);

      router.safeReplace({
        pathname: "/(auth)/change-code",
        params: { origin },
      } as any);
    } else {
      if (Platform.OS !== "web") {
        Vibration.vibrate(150);
      }
      const res = await recordFailedRecoveryAttempt();
      setIsVerifying(false);
      if (res.lockedOut) {
        setLockoutSeconds(res.remainingSeconds);
        setErrorMsg(null);
      } else {
        setErrorMsg("Incorrect verification code");
      }
    }
  }

  const rawLength = code.replace(/[^A-Z0-9]/g, "").length;
  const isButtonDisabled = rawLength < 8 || lockoutSeconds > 0 || isVerifying;

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 px-6 justify-between"
      >
        {/* Top Header */}
        <View>
          <View className="flex-row items-center justify-between pt-2 pb-6">
            <TouchableOpacity
              onPress={handleBack}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
            </TouchableOpacity>
            <View className="w-10" />
          </View>

          {/* Minimal Title - No icons, no explanatory text */}
          <Text className="text-dark-text text-3xl font-extrabold tracking-tight mb-8">
            Verification Code
          </Text>

          {/* Clean Input Field */}
          <View className="w-full">
            <TextInput
              ref={inputRef}
              value={code}
              onChangeText={handleCodeChange}
              editable={lockoutSeconds === 0}
              placeholder="XXXX-XXXX"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleVerify}
              style={{
                borderColor: errorMsg
                  ? "#EF4444"
                  : lockoutSeconds > 0
                  ? "#21262D"
                  : "#21262D",
                fontFamily: "DMSans_700Bold",
              }}
              className="w-full py-4 px-5 rounded-2xl bg-dark-surface border text-2xl font-bold tracking-widest text-center text-dark-text"
            />

            {/* Error or Lockout Message */}
            {lockoutSeconds > 0 ? (
              <Text className="text-brand-expense text-sm font-semibold text-center mt-3">
                Too many attempts. Try again in {formatLockoutRemaining(lockoutSeconds)}
              </Text>
            ) : errorMsg ? (
              <Text className="text-brand-expense text-sm font-semibold text-center mt-3">
                {errorMsg}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Bottom Verify Action */}
        <View className="pb-6">
          <TouchableOpacity
            onPress={handleVerify}
            disabled={isButtonDisabled}
            activeOpacity={0.8}
            style={{
              backgroundColor: isButtonDisabled ? "#161B22" : "#D4F938",
              opacity: isButtonDisabled ? 0.5 : 1,
            }}
            className="w-full py-4 rounded-full items-center justify-center"
          >
            {isVerifying ? (
              <ActivityIndicator size="small" color="#0B0D12" />
            ) : (
              <Text
                style={{
                  color: isButtonDisabled ? "#64748B" : "#0B0D12",
                  fontFamily: "DMSans_700Bold",
                }}
                className="text-base font-bold"
              >
                Verify
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
