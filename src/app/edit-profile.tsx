import { useRouter } from "expo-router";
import React from "react";
import { Alert } from "react-native";
import { ProfileForm, ProfileFormData } from "../components/ProfileForm";
import { useAuth } from "../context/auth";
import { NumberFormatId } from "../db/schema";

export default function EditProfileScreen() {
  const router = useRouter();
  const { settings, completeOnboarding } = useAuth();

  async function handleSave(data: ProfileFormData) {
    try {
      await completeOnboarding({
        userName: data.name,
        currency: data.currency,
        numberFormat: data.numberFormat,
        profilePic: data.profilePic,
        pin: settings?.pin || undefined,
        biometricsEnabled: settings?.biometricsEnabled,
      });

      Alert.alert("Success", "Profile updated successfully.");
      router.back();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not save profile changes.");
    }
  }

  return (
    <ProfileForm
      mode="edit"
      headerTitle="Edit Profile"
      submitButtonLabel="Save Changes"
      initialData={{
        name: settings?.userName || "",
        currency: settings?.currency || "USD",
        numberFormat: (settings?.numberFormat as NumberFormatId) || "COMMA_DOT",
        profilePic: settings?.profilePic || null,
      }}
      onSubmit={handleSave}
      onBack={() => router.back()}
    />
  );
}
