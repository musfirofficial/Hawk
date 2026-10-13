import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useRef } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ScreenHeader";
import { SetUpPin, SetUpPinHandle } from "../../components/SetUpPin";
import { generateRecoveryKey, useAuth } from "../../context/auth";
import { NumberFormatId } from "../../db/schema";

export default function SetupPinScreen() {
  const router = useRouter();
  const { settings, completeOnboarding } = useAuth();
  const pinRef = useRef<SetUpPinHandle>(null);
  const params = useLocalSearchParams<{
    userName?: string;
    currency?: string;
    numberFormat?: NumberFormatId;
    profilePic?: string;
  }>();

  async function handleSuccess(pin: string) {
    const userName = params.userName || settings?.userName || "Hawk User";
    const currency = params.currency || settings?.currency || "USD";
    const numberFormat = (params.numberFormat ||
      settings?.numberFormat ||
      "COMMA_DOT") as NumberFormatId;
    const profilePic = params.profilePic || settings?.profilePic || null;

    const recoveryKey = generateRecoveryKey();

    // 1. Mark onboarding complete in SQLite first
    await completeOnboarding({
      userName,
      currency,
      numberFormat,
      profilePic,
      pin,
      recoveryKey,
      biometricsEnabled: false,
    });

    // 2. Advance to recovery key & biometrics page cleanly
    router.replace({
      pathname: "/(auth)/recovery-key" as any,
      params: { recoveryKey },
    });
  }

  async function handleSkip() {
    const userName = params.userName || settings?.userName || "Hawk User";
    const currency = params.currency || settings?.currency || "USD";
    const numberFormat = (params.numberFormat ||
      settings?.numberFormat ||
      "COMMA_DOT") as NumberFormatId;
    const profilePic = params.profilePic || settings?.profilePic || null;

    await completeOnboarding({
      userName,
      currency,
      numberFormat,
      profilePic,
      pin: undefined,
      recoveryKey: undefined,
      biometricsEnabled: false,
    });

    router.replace("/(tabs)");
  }

  function handleBack() {
    // If user is on CONFIRM step, step back to CREATE first
    if (pinRef.current?.handleBack()) {
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/onboarding");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={["top", "bottom"]}>
      <ScreenHeader title="" onBack={handleBack} />
      <SetUpPin
        ref={pinRef}
        onSuccess={handleSuccess}
        showTopBar={false}
        showSkip={true}
        onSkip={handleSkip}
      />
    </SafeAreaView>
  );
}
