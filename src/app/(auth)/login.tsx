import { Ionicons } from "@expo/vector-icons";
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
  const { signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleGoogleLogin() {
    try {
      setSigningIn(true);
      setErrorMsg(null);
      await signInWithGoogle();
      // Forward directly to onboarding with Google profile prefilled
      router.push("/(auth)/onboarding");
    } catch (err: any) {
      console.log("Login canceled or error:", err);
      // In dev environment or if user dismissed Google prompt:
      if (err?.code === "12501" || err?.message?.includes("Canceled")) {
        // user simply dismissed Google popup
        return;
      }
      setErrorMsg(
        "Google Sign-In was cancelled or failed. You can also tap 'Set up Later' to continue offline.",
      );
    } finally {
      setSigningIn(false);
    }
  }

  function handleSkip() {
    router.push("/(auth)/onboarding");
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg justify-between p-6">
      {/* Top / Center Branding Section */}
      <View className="flex-1 justify-center items-center">
        {/* Hawk Logo */}
        <View className="w-28 h-28 rounded-3xl bg-brand-accent/10 border border-brand-accent/30 items-center justify-center mb-6 shadow-2xl">
          <Image
            source={require("@/assets/logo/logo-removebg-preview.png")}
            style={{ width: 80, height: 80 }}
            resizeMode="contain"
          />
        </View>

        <Text className="text-dark-text text-3xl font-extrabold tracking-tight mb-2 text-center">
          Hawk Finance
        </Text>
        <Text className="text-dark-muted text-sm text-center px-6 leading-5">
          Minimalist, offline-first personal wealth management. Your data stays
          on your device with optional Google Drive backup.
        </Text>

        {errorMsg && (
          <View className="mt-4 p-3 bg-brand-expense/10 border border-brand-expense/20 rounded-xl max-w-xs">
            <Text className="text-brand-expense text-xs text-center">
              {errorMsg}
            </Text>
          </View>
        )}
      </View>

      {/* Auth Actions Section */}
      <View className="mb-4 space-y-3 gap-3">
        {/* Primary: Continue with Google */}
        <TouchableOpacity
          onPress={handleGoogleLogin}
          disabled={signingIn}
          className="bg-dark-surface border border-dark-border py-4 px-6 rounded-2xl flex-row items-center justify-center gap-3 shadow-md"
          activeOpacity={0.8}
        >
          {signingIn ? (
            <ActivityIndicator color="#D4F938" size="small" />
          ) : (
            <>
              <Ionicons name="logo-google" size={20} color="#F8FAFC" />
              <Text className="text-dark-text font-bold text-base">
                Continue with Google
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Secondary: Set up Later */}
        <TouchableOpacity
          onPress={handleSkip}
          disabled={signingIn}
          className="py-3 px-6 rounded-2xl items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-brand-accent font-bold text-sm">
            Set up Later
          </Text>
        </TouchableOpacity>

        <Text className="text-dark-muted text-[11px] text-center px-4 leading-4">
          All financial data is stored locally in your Mobile. Google Drive
          backup can be connected anytime from Settings.
        </Text>
      </View>
    </SafeAreaView>
  );
}
