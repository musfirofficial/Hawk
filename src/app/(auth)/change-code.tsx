import { useLocalSearchParams } from "expo-router";
import React, { useEffect } from "react";
import { SetUpPin } from "../../components/SetUpPin";
import { generateRecoveryKey, useAuth } from "../../context/auth";
import { useSafeRouter } from "../../hooks/useSafeRouter";

export default function ChangeCodeScreen() {
  const router = useSafeRouter();
  const { isRecoverySessionVerified, setRecoverySessionVerified, updateSecuritySettings } =
    useAuth();
  const params = useLocalSearchParams<{ origin?: string }>();
  const origin = params.origin || "startup";

  // Security guard: If user navigated here directly without verifying the code, kick them out
  useEffect(() => {
    if (!isRecoverySessionVerified) {
      if (origin === "startup") {
        router.safeReplace("/" as any);
      } else {
        router.safeReplace("/(tabs)");
      }
    }
  }, [isRecoverySessionVerified, origin]);

  async function handleSuccess(pin: string) {
    const newRecoveryKey = generateRecoveryKey();

    // 1. Immediately persist new PIN and new recovery key in SQLite DB
    await updateSecuritySettings({
      pin,
      recoveryKey: newRecoveryKey,
      pinEnabled: true,
    });

    // 2. Consume the one-time verification session
    setRecoverySessionVerified(false);

    // 3. Navigate to recovery key display screen with origin
    router.safeReplace({
      pathname: "/(auth)/recovery-key",
      params: { recoveryKey: newRecoveryKey, origin },
    } as any);
  }

  function handleBack() {
    router.safeReplace({
      pathname: "/(auth)/verify-code",
      params: { origin },
    } as any);
  }

  if (!isRecoverySessionVerified) {
    return null;
  }

  return (
    <SetUpPin
      headerTitle="Reset PIN"
      createTitle="New PIN"
      confirmTitle="Confirm PIN"
      createSubtitle="Enter your new 4-digit code"
      confirmSubtitle="Re-enter your 4-digit code to confirm"
      onSuccess={handleSuccess}
      onBack={handleBack}
      showBack={true}
      showSkip={false}
      isChangePin={false}
      showResetPin={false}
    />
  );
}
