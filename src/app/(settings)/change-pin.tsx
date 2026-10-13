import { useRouter } from "expo-router";
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
      onSuccess={handleSuccess}
      onBack={() => router.back()}
      showSkip={false}
      isChangePin={true}
    />
  );
}
