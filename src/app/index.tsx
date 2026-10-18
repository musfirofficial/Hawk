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
  const { hasOnboarded, isLoading, settings } = useAuth();
  const router = useRouter();

  const [bioCapability, setBioCapability] = useState<BiometricCapability>({
    isAvailable: false,
    type: null,
    label: "Biometrics",
  });
  const [hasPromptedBio, setHasPromptedBio] = useState(false);

  const shouldLock = Boolean(
    hasOnboarded &&
    settings?.appLockEnabled &&
    settings?.pinEnabled &&
    settings?.pin,
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
      router.replace("/(tabs)");
    }
  }, [hasOnboarded, isLoading, shouldLock, router]);

  // Attempt biometric prompt on initial display if enabled
  useEffect(() => {
    if (!shouldLock || hasPromptedBio || !settings?.biometricsEnabled) return;
    if (!bioCapability.isAvailable) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      if (!isMounted) return;
      setHasPromptedBio(true);
      const res = await authenticateWithBiometrics("Unlock Hawk");
      if (res.success && isMounted) {
        router.replace("/(tabs)");
      }
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [
    shouldLock,
    hasPromptedBio,
    settings?.biometricsEnabled,
    bioCapability.isAvailable,
    router,
  ]);

  async function handleBiometricPress() {
    const res = await authenticateWithBiometrics("Unlock Hawk");
    if (res.success) {
      router.replace("/(tabs)");
    }
  }

  function handlePinSuccess() {
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
        onSuccess={handlePinSuccess}
      />
    </SafeAreaView>
  );
}
