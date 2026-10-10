import { useRouter } from "expo-router";
import React from "react";
import { SetUpPin } from "../../components/SetUpPin";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";

export default function ChangePinScreen() {
  const router = useRouter();
  const { updateSecuritySettings } = useAuth();
  const { showAlert } = useAlert();

  async function handleSuccess(pin: string, enableBiometrics: boolean) {
    await updateSecuritySettings({
      pin,
      biometricsEnabled: enableBiometrics,
    });
    showAlert({
      title: "Success",
      message: "Security PIN updated successfully.",
      type: "success",
      onDismiss: () => router.back(),
    });
  }

  return (
    <SetUpPin
      headerTitle="Change PIN"
      createTitle="Enter new PIN"
      confirmTitle="Confirm new PIN"
      createSubtitle="Choose a new 4-digit PIN for your security checks."
      confirmSubtitle="Re-enter your new 4-digit PIN to confirm."
      onSuccess={handleSuccess}
      onBack={() => router.back()}
      showSkip={false}
      isChangePin={true}
    />
  );
}
