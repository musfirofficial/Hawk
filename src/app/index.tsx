import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SetUpPin } from "../components/SetUpPin";
import { useAuth } from "../context/auth";
import {
  authenticateWithBiometrics,
  BiometricCapability,
  getBiometricCapability,
} from "../services/biometrics";

export default function Index() {
  const { hasOnboarded, isLoading, settings, unlockApp, hasPin } = useAuth();
  const router = useRouter();

  const [bioCapability, setBioCapability] = useState<BiometricCapability>({
    isAvailable: false,
    type: null,
    label: "Biometrics",
  });

  const shouldLock = Boolean(
    hasOnboarded &&
    settings?.appLockEnabled &&
    settings?.pinEnabled &&
    hasPin,
  );

  useEffect(() => {
    async function checkBio() {
      const cap = await getBiometricCapability();
      setBioCapability(cap);
    }
    checkBio();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!hasOnboarded) {
      router.replace("/(auth)/login");
    } else if (!shouldLock) {
      unlockApp();
      router.replace("/(tabs)");
    }
  }, [hasOnboarded, isLoading, shouldLock, unlockApp, router]);

  async function handleBiometricPress() {
    const res = await authenticateWithBiometrics("Unlock Hawk");
    if (res.success) {
      unlockApp();
      router.replace("/(tabs)");
    }
  }

  function handlePinSuccess() {
    unlockApp();
    router.replace("/(tabs)");
  }

  if (isLoading || !hasOnboarded || !shouldLock) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <ActivityIndicator size="large" color="#D4F938" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={["top", "bottom"]}>
      <SetUpPin
        mode="verify"
        showTopBar={false}
        verifyTitle="Welcome Back"
        verifySubtitle="Enter your PIN"
        showBiometric={Boolean(
          settings?.biometricsEnabled && bioCapability.isAvailable,
        )}
        biometricType={bioCapability.type}
        onBiometricPress={handleBiometricPress}
        showResetPin={true}
        onResetPinPress={() =>
          router.push({
            pathname: "/(auth)/verify-code",
            params: { origin: "startup" },
          } as any)
        }
        onSuccess={handlePinSuccess}
      />
    </SafeAreaView>
  );
}
