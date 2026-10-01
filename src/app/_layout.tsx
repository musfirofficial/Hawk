import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "../context/auth";
import "../../global.css";

function NavigationGate() {
  const { hasOnboarded, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!hasOnboarded && !inAuthGroup) {
      // User hasn't finished onboarding yet
      router.replace("/(auth)/login");
    } else if (hasOnboarded && inAuthGroup) {
      // User has already completed onboarding, block auth screens
      router.replace("/(tabs)");
    }
  }, [hasOnboarded, isLoading, segments]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-dark-bg items-center justify-center">
        <ActivityIndicator size="large" color="#D4F938" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="fulltransaction"
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationGate />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
