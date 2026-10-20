import { useRouter } from "expo-router";
import React from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProfileForm, ProfileFormData } from "../../components/ProfileForm";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useAuth } from "../../context/auth";

export default function OnboardingScreen() {
  const router = useRouter();
  const { pendingGoogleUser, settings } = useAuth();

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
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScreenHeader title="Complete Profile" onBack={handleBack} />
      <ProfileForm
        mode="onboarding"
        initialData={{
          name: settings?.userName || pendingGoogleUser?.name || "",
          currency: settings?.currency || undefined,
          numberFormat: (settings?.numberFormat as any) || undefined,
          profilePic: settings?.profilePic,
        }}
        onSubmit={handleSubmit}
      />
    </SafeAreaView>
  );
}
