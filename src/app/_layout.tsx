import * as NavigationBar from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import {
  useFonts,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
  DMSans_800ExtraBold,
  DMSans_900Black,
} from "@expo-google-fonts/dm-sans";
import { Stack, useRouter, useSegments } from "expo-router";
import React, { useEffect } from "react";
import { ActivityIndicator, LogBox, Platform, Text, TextInput, View } from "react-native";
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

// Ignore known upstream React 19 Fabric timing warning from expo-router useLinking during initial launch
LogBox.ignoreLogs([
  "Can't perform a React state update on a component that hasn't mounted yet",
]);

// Prevent splash screen from auto-hiding until fonts are loaded
SplashScreen.preventAutoHideAsync().catch(() => {});

// Ensure root view background color is Hawk's dark luxury background on Android & iOS
if (Platform.OS === "android") {
  try {
    SystemUI.setBackgroundColorAsync("#0B0D12");
  } catch (e) {}
}

// Enforce DM Sans font family globally so device/system fonts are never visible
// @ts-ignore
if (Text.defaultProps == null) {
  // @ts-ignore
  Text.defaultProps = {};
}
// @ts-ignore
Text.defaultProps.style = [
  { fontFamily: "DMSans_400Regular" },
  // @ts-ignore
  Text.defaultProps.style,
];

// @ts-ignore
if (TextInput.defaultProps == null) {
  // @ts-ignore
  TextInput.defaultProps = {};
}
// @ts-ignore
TextInput.defaultProps.style = [
  { fontFamily: "DMSans_400Regular" },
  // @ts-ignore
  TextInput.defaultProps.style,
];

function NavigationGate() {
  const { hasOnboarded, isLoading, settings, isAppUnlocked } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Hide splash screen smoothly only after auth settings and destination are ready
  useEffect(() => {
    if (!isLoading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [isLoading]);

  // Safety fallback so splash screen never hangs in development
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

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

    const segmentList = segments as string[];
    const inAuthGroup = segmentList[0] === "(auth)";
    const isAtRoot = segmentList.length === 0;

    // When at root, src/app/index.tsx performs instant declarative redirect
    if (isAtRoot) return;

    const isExemptAuthScreen =
      segmentList.includes("recovery-key") ||
      segmentList.includes("setup-pin") ||
      segmentList.includes("verify-code") ||
      segmentList.includes("change-code");

    if (!hasOnboarded && !inAuthGroup) {
      // User hasn't finished onboarding yet
      router.replace("/(auth)/login");
      return;
    }

    const appLockEnabled = Boolean(settings?.appLockEnabled);
    const pinEnabled = Boolean(settings?.pinEnabled);
    const hasPin = Boolean(settings?.pin);

    const shouldLock = Boolean(
      hasOnboarded && appLockEnabled && pinEnabled && hasPin
    );

    if (shouldLock && !isAppUnlocked) {
      // If locked, allow ONLY the dedicated PIN reset flow screens
      if (!isExemptAuthScreen) {
        router.replace("/");
        return;
      }
    } else if (hasOnboarded && inAuthGroup && !isExemptAuthScreen) {
      // User has completed onboarding and session is unlocked, block login/onboarding
      router.replace("/(tabs)");
    }
  }, [
    hasOnboarded,
    isLoading,
    Boolean(settings?.appLockEnabled),
    Boolean(settings?.pinEnabled),
    Boolean(settings?.pin),
    isAppUnlocked,
    segments,
    router,
  ]);

  return (
    <>
      {Platform.OS === "android" ? (
        <NavigationBar.NavigationBar style="light" />
      ) : null}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0B0D12" },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
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
        <Stack.Screen
          name="createbudget"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="budgetsummary"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="budget/[id]"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="createdebt"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="alldebts"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="debt/[id]"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen
          name="contact/[id]"
          options={{
            headerShown: false,
            presentation: "card",
          }}
        />
        <Stack.Screen name="(transaction)" options={{ headerShown: false }} />
        <Stack.Screen name="(account)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMSans_800ExtraBold,
    DMSans_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

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
