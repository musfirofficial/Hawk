import { useRouter } from "expo-router";
import { useState } from "react";
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

  async function handleLogin() {
    if (isGoogleAuthEnabled) {
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
    } else {
      // In offline development mode, proceed directly to setup
      router.push("/(auth)/onboarding");
    }
  }

  function handleOpenAccount() {
    router.push("/(auth)/onboarding");
  }

  function handleDemo() {
    router.push("/(auth)/onboarding");
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg justify-between px-7 pt-4 pb-8">
      {/* Top Header: Logo on Left, Demo > on Right */}
      <View className="flex-row items-center justify-between w-full pt-2">
        {/* Minimal Brand Icon */}
        <View className="w-9 h-9 items-center justify-center">
          <Image
            source={require("../../../assets/logo/logo-removebg-preview.png")}
            style={{ width: 40, height: 40 }}
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
          <Text className="text-dark-text text-xl leading-6 font-light">→</Text>
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

        {/* Two Pill Buttons: Log In & Open an Account */}
        <View className="flex-row items-center gap-3 w-full">
          {/* LOG IN (Outlined Pill) */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={signingIn}
            className="flex-1 py-4 px-4 rounded-full border border-dark-border bg-dark-surface items-center justify-center active:opacity-80"
          >
            {signingIn ? (
              <ActivityIndicator color="#F8FAFC" size="small" />
            ) : (
              <Text className="text-dark-text font-bold text-xs tracking-wider uppercase">
                Log In
              </Text>
            )}
          </TouchableOpacity>

          {/* OPEN AN ACCOUNT (Filled Pill) */}
          <TouchableOpacity
            onPress={handleOpenAccount}
            className="flex-1 py-4 px-4 rounded-full bg-white items-center justify-center active:opacity-90 shadow-md"
          >
            <Text className="text-dark-bg font-extrabold text-xs tracking-wider uppercase">
              Open an Account
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
