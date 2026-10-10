import * as NavigationBar from "expo-navigation-bar";
import * as SystemUI from "expo-system-ui";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, Platform, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AccountsProvider } from "../context/accounts";
import { AlertProvider } from "../context/alert";
import { AuthProvider, useAuth } from "../context/auth";
import { CategoriesProvider } from "../context/categories";
import { ContactsProvider } from "../context/contacts";
import { DebtsProvider } from "../context/debts";
import { SecurityProvider } from "../context/security";
import { TransactionsProvider } from "../context/transactions";
import "../../global.css";

// Ensure root view background color is Hawk's dark luxury background on Android & iOS
if (Platform.OS === "android") {
  try {
    SystemUI.setBackgroundColorAsync("#0B0D12");
  } catch (e) {}
}

function NavigationGate() {
  const { hasOnboarded, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Set Android navigation bar style to "light" (meaning light icons on dark background)
    if (Platform.OS === "android") {
      try {
        SystemUI.setBackgroundColorAsync("#0B0D12");
        NavigationBar.setStyle("light");
      } catch (e) {}
    }
  }, []);

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
    <>
      {Platform.OS === "android" ? (
        <NavigationBar.NavigationBar style="light" />
      ) : null}
      <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(settings)" options={{ headerShown: false }} />
      <Stack.Screen
        name="fulltransaction"
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="(categories)/categories"
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
      <Stack.Screen
        name="(categories)/create-category"
        options={{
          headerShown: false,
          presentation: "card",
        }}
      />
    </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SecurityProvider>
          <AccountsProvider>
            <ContactsProvider>
              <DebtsProvider>
                <CategoriesProvider>
                  <TransactionsProvider>
                    <AlertProvider>
                      <NavigationGate />
                    </AlertProvider>
                  </TransactionsProvider>
                </CategoriesProvider>
              </DebtsProvider>
            </ContactsProvider>
          </AccountsProvider>
        </SecurityProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
