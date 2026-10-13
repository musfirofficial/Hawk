import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";
import {
  authenticateWithBiometrics,
  BiometricCapability,
  getBiometricCapability,
} from "../../services/biometrics";

export default function RecoveryKeyScreen() {
  const router = useRouter();
  const { settings, updateSecuritySettings } = useAuth();
  const params = useLocalSearchParams<{ recoveryKey?: string }>();

  const recoveryCode =
    params.recoveryKey || settings?.recoveryKey || "HWK-RECOVERY";

  const [copied, setCopied] = useState(false);
  const [bioCapability, setBioCapability] = useState<BiometricCapability>({
    isAvailable: false,
    type: null,
    label: "Biometrics",
  });
  const [enablingBio, setEnablingBio] = useState(false);

  // Handle Option A: Hardware back press routes straight to Home
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/(tabs)");
        return true;
      }
    );
    return () => backHandler.remove();
  }, [router]);

  useEffect(() => {
    async function checkBio() {
      const cap = await getBiometricCapability();
      setBioCapability(cap);
    }
    checkBio();
  }, []);

  async function handleCopyKey() {
    await Clipboard.setStringAsync(recoveryCode);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2500);
  }

  async function handleEnableBiometrics() {
    try {
      setEnablingBio(true);
      const res = await authenticateWithBiometrics(
        `Authenticate with ${bioCapability.label} to enable`
      );
      if (res.success) {
        await updateSecuritySettings({ biometricsEnabled: true });
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.warn("Failed to enable biometrics:", err);
    } finally {
      setEnablingBio(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg justify-between px-6 pt-6 pb-8">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          alignItems: "center",
          paddingTop: 16,
          flexGrow: 1,
          justifyContent: "space-between",
        }}
      >
        {/* Top & Center Section */}
        <View className="items-center w-full">
          {/* Dark Circle with Shield Icon (No Color Accent) */}
          <View className="w-16 h-16 rounded-full bg-dark-surface border border-dark-border items-center justify-center mb-5">
            <Ionicons
              name="shield-checkmark-outline"
              size={30}
              color="#F8FAFC"
            />
          </View>

          {/* Title & Description */}
          <Text className="text-dark-text text-2xl font-bold tracking-tight text-center mb-2">
            Emergency Recovery Key
          </Text>

          <Text className="text-dark-muted text-xs text-center leading-relaxed mb-8 px-4 max-w-[320px]">
            Save this 8-character recovery key. You will need it to reset your
            PIN if you ever forget it.
          </Text>

          {/* Recovery Key (No Container, Larger Text) */}
          <View className="items-center my-4 w-full">
            <Text className="text-dark-text text-3xl sm:text-4xl font-extrabold tracking-widest text-center select-all py-1">
              {recoveryCode}
            </Text>

            {/* Copy Button (Clean, No Green Accent, Just "Copied!") */}
            <TouchableOpacity
              onPress={handleCopyKey}
              activeOpacity={0.7}
              className="mt-4 px-4 py-2 rounded-full flex-row items-center gap-2 bg-dark-surface border border-dark-border active:bg-dark-card"
            >
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={15}
                color="#F8FAFC"
              />
              <Text className="text-xs font-semibold text-dark-text">
                {copied ? "Copied!" : "Copy Key"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Warning (Centered, No Background, Larger Text) */}
          <View className="items-center px-4 mt-8 w-full">
            <Text className="text-dark-muted text-sm text-center leading-relaxed max-w-[320px]">
              Hawk does not store your PIN on any server. Without this recovery
              key or your PIN, your protected data cannot be recovered.
            </Text>
          </View>
        </View>

        {/* Bottom Actions: Enable Biometrics / Continue & Set Up Later */}
        <View className="w-full pt-8">
          {bioCapability.isAvailable ? (
            <>
              {/* Main Button: Enable Biometrics with matching Icon */}
              <TouchableOpacity
                onPress={handleEnableBiometrics}
                disabled={enablingBio}
                className="w-full py-4 rounded-full bg-brand-accent flex-row items-center justify-center gap-2 shadow-lg active:opacity-90"
                activeOpacity={0.8}
              >
                {enablingBio ? (
                  <ActivityIndicator size="small" color="#0B0D12" />
                ) : (
                  <>
                    <Ionicons
                      name={
                        bioCapability.type === "FACE_ID"
                          ? "scan-outline"
                          : "finger-print"
                      }
                      size={20}
                      color="#0B0D12"
                    />
                    <Text className="text-dark-bg font-bold text-base">
                      Enable {bioCapability.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Secondary Link: Set up later */}
              <TouchableOpacity
                onPress={() => router.replace("/(tabs)")}
                className="py-3 items-center mt-1"
                activeOpacity={0.7}
              >
                <Text className="text-dark-muted text-sm font-semibold">
                  Set up later
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              onPress={() => router.replace("/(tabs)")}
              className="w-full py-4 rounded-full bg-brand-accent items-center justify-center shadow-lg active:opacity-90"
              activeOpacity={0.8}
            >
              <Text className="text-dark-bg font-bold text-base">
                Continue to Hawk
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
