import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileForm, ProfileFormData } from "../../components/ProfileForm";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { NumberFormatId } from "../../db/schema";

export default function EditProfileScreen() {
  const router = useRouter();
  const { settings, completeOnboarding } = useAuth();
  const { showAlert } = useAlert();

  async function handleSave(data: ProfileFormData) {
    try {
      await completeOnboarding({
        userName: data.name,
        currency: data.currency,
        numberFormat: data.numberFormat,
        profilePic: data.profilePic,
        biometricsEnabled: settings?.biometricsEnabled,
      });

      showAlert({
        title: "Success",
        message: "Profile updated successfully.",
        type: "success",
        onDismiss: () => router.back(),
      });
    } catch (err: any) {
      showAlert({
        title: "Error",
        message: err?.message || "Could not save profile changes.",
        type: "danger",
      });
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScreenHeader title="Edit Profile" onBack={() => router.back()} />
      <ProfileForm
        mode="edit"
        submitButtonLabel="Save Changes"
        initialData={{
          name: settings?.userName || "",
          currency: settings?.currency || "USD",
          numberFormat: (settings?.numberFormat as NumberFormatId) || "COMMA_DOT",
          profilePic: settings?.profilePic || null,
        }}
        onSubmit={handleSave}
      />
    </SafeAreaView>
  );
}
