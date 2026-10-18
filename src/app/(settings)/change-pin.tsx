import { useRouter } from "expo-router";
import React from "react";
import { SetUpPin } from "../../components/SetUpPin";
import { generateRecoveryKey, useAuth } from "../../context/auth";

export default function ChangePinScreen() {
  const router = useRouter();
  const { settings, updateSecuritySettings } = useAuth();
  const hasExistingPin = Boolean(settings?.pin);

  async function handleSuccess(pin: string) {
    const newRecoveryKey = generateRecoveryKey();
    await updateSecuritySettings({
      pin,
      recoveryKey: newRecoveryKey,
      pinEnabled: true,
    });

    router.replace({
      pathname: "/(auth)/recovery-key",
      params: { recoveryKey: newRecoveryKey },
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
    />
  );
}
