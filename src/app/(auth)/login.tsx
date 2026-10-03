import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../context/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithGoogle, isGoogleAuthEnabled } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleGoogleConnect() {
    if (!isGoogleAuthEnabled) {
      setErrorMsg(
        "Google Sign-In is currently disabled. Toggle ENABLE_GOOGLE_AUTH in src/config/appConfig.ts to enable.",
      );
      return;
    }

    try {
      setSigningIn(true);
      setErrorMsg(null);
      await signInWithGoogle();
      router.push("/(auth)/onboarding");
    } catch (err: any) {
      if (err?.code === "12501" || err?.message?.includes("Canceled")) {
        return;
      }
      setErrorMsg(err?.message || "Google Sign-In failed.");
    } finally {
      setSigningIn(false);
    }
  }

  function handleSetUpLater() {
    router.push("/(auth)/onboarding");
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg justify-between px-7 pt-4 pb-8">
      {/* Top Header: Minimal Brand Logo */}
      <View className="flex-row items-center justify-between w-full pt-2">
        <View className="w-12 h-12 items-center justify-center">
          <Image
            source={require("../../../assets/logo/logo-removebg-preview.png")}
            style={{ width: 44, height: 44 }}
            resizeMode="contain"
          />
        </View>
      </View>

      {/* Main Editorial Hero Section */}
      <View className="flex-1 justify-center pb-8">
        {/* Headline */}
        <Text className="text-dark-text text-[52px] leading-[58px] font-light tracking-[-1.5px] mb-6">
          Banking{"\n"}Just Got{"\n"}
          <Text className="font-normal text-white">Easier!</Text>
        </Text>

        {/* Arrow + Classy Copy */}
        <View className="flex-row items-start gap-3 pr-6">
          <Text className="text-brand-accent text-xl leading-6 font-light">→</Text>
          <Text className="flex-1 text-dark-muted text-sm leading-5">
            Manage your finances anywhere, anytime. Master liquid wealth, settle
            debts, and monitor your accounts with ease.
          </Text>
        </View>

        {errorMsg && (
          <View className="mt-4 p-3 bg-brand-expense/10 border border-brand-expense/20 rounded-xl">
            <Text className="text-brand-expense text-xs text-center">
              {errorMsg}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Actions Section */}
      <View className="w-full">
        {/* Thin Divider Line */}
        <View className="h-[1px] bg-dark-border w-full mb-6" />

        {/* Connect with Google Button + Set up Later Link */}
        <View className="items-center gap-3 w-full">
          {/* Primary: Connect with Google */}
          <TouchableOpacity
            onPress={handleGoogleConnect}
            disabled={signingIn}
            className="py-4 px-6 w-full rounded-full border border-dark-border bg-dark-surface flex-row items-center justify-center gap-3 active:opacity-80 shadow-md"
          >
            {signingIn ? (
              <ActivityIndicator color="#D4F938" size="small" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#F8FAFC" />
                <Text className="text-dark-text font-bold text-sm tracking-wide">
                  Connect with Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary: Set up Later (Link style, not button) */}
          <TouchableOpacity
            onPress={handleSetUpLater}
            disabled={signingIn}
            className="py-3 px-6 items-center justify-center"
            activeOpacity={0.7}
          >
            <Text className="text-brand-accent font-semibold text-sm tracking-wide">
              Set up Later
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
