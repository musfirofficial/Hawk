import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { SetUpPin } from "../../components/SetUpPin";
import { useAuth } from "../../context/auth";
import { NumberFormatId } from "../../db/schema";

export default function SetupPinScreen() {
  const router = useRouter();
  const { settings, completeOnboarding } = useAuth();
  const params = useLocalSearchParams<{
    userName?: string;
    currency?: string;
    numberFormat?: NumberFormatId;
    profilePic?: string;
  }>();

  async function handleSuccess(pin: string, enableBiometrics: boolean) {
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
      pin,
      biometricsEnabled: enableBiometrics,
    });

    router.replace("/(tabs)");
  }

  function handleSkip() {
    handleSuccess("", false);
  }

  return (
    <SetUpPin
      onSuccess={handleSuccess}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(auth)/onboarding");
        }
      }}
      showSkip={true}
      onSkip={handleSkip}
    />
  );
}
