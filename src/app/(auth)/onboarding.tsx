import { useRouter } from "expo-router";
import React from "react";
import { ProfileForm, ProfileFormData } from "../../components/ProfileForm";
import { useAuth } from "../../context/auth";

export default function OnboardingScreen() {
  const router = useRouter();
  const { pendingGoogleUser } = useAuth();

  function handleSubmit(data: ProfileFormData) {
    router.push({
      pathname: "/(auth)/setup-pin" as any,
      params: {
        userName: data.name,
        currency: data.currency,
        numberFormat: data.numberFormat,
        profilePic: data.profilePic || "",
      },
    });
  }

  function handleBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(auth)/login");
    }
  }

  return (
    <ProfileForm
      mode="onboarding"
      initialData={{
        name: pendingGoogleUser?.name || "",
      }}
      onSubmit={handleSubmit}
      onBack={handleBack}
    />
  );
}
