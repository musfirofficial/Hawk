import { useRouter } from "expo-router";
import React from "react";
import { SetUpPin } from "../../components/SetUpPin";
import { generateRecoveryKey, useAuth } from "../../context/auth";

export default function ChangePinScreen() {
  const router = useRouter();
  const { settings, updateSecuritySettings, hasPin } = useAuth();
  const hasExistingPin = hasPin;

  async function handleSuccess(pin: string) {
    const newRecoveryKey = generateRecoveryKey();
    await updateSecuritySettings({
      pin,
      recoveryKey: newRecoveryKey,
      pinEnabled: true,
    });

    router.replace({
      pathname: "/(auth)/recovery-key",
      params: { recoveryKey: newRecoveryKey, origin: "settings" },
    });
  }

  return (
    <SetUpPin
      headerTitle={hasExistingPin ? "Change PIN" : "Create PIN"}
      createTitle={hasExistingPin ? "New PIN" : "Create PIN"}
      confirmTitle="Confirm PIN"
      createSubtitle={
        hasExistingPin
          ? "Enter your new four-digit code"
          : "Enter your secure four-digit code"
      }
      confirmSubtitle="Re-enter your four-digit code to confirm"
      onSuccess={handleSuccess}
      onBack={() => router.back()}
      showSkip={false}
      isChangePin={hasExistingPin}
      showResetPin={hasExistingPin}
      onResetPinPress={() =>
        router.push({
          pathname: "/(auth)/verify-code",
          params: { origin: "settings" },
        } as any)
      }
    />
  );
}
