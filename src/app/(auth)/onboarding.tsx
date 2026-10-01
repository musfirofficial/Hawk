import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "../../context/auth";
import {
  SUPPORTED_CURRENCIES,
  NUMBER_FORMATS,
  NumberFormatId,
} from "../../db/schema";

export default function OnboardingScreen() {
  const router = useRouter();
  const { pendingGoogleUser, completeOnboarding } = useAuth();

  // Pre-fill with Google name/photo if available
  const [name, setName] = useState(pendingGoogleUser?.name || "");
  const [selectedCurrency, setSelectedCurrency] = useState<string>(""); // default none
  const [selectedFormat, setSelectedFormat] = useState<NumberFormatId>("COMMA_DOT");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canSubmit = name.trim().length > 0 && selectedCurrency.length > 0;

  async function handleFinish() {
    if (!name.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }
    if (!selectedCurrency) {
      setErrorMsg("Please select your primary currency.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      await completeOnboarding({
        userName: name.trim(),
        currency: selectedCurrency,
        numberFormat: selectedFormat,
        profilePic: pendingGoogleUser?.photo || null,
      });

      // Redirect into main app tabs
      router.replace("/(tabs)");
    } catch (err) {
      console.error("Onboarding failed:", err);
      setErrorMsg("Failed to save profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-6 pt-6"
      >
        {/* Title & Header */}
        <View className="mb-6 items-center">
          <View className="w-16 h-16 rounded-3xl bg-brand-accent/15 border border-brand-accent/30 items-center justify-center mb-3">
            {pendingGoogleUser?.photo ? (
              <Image
                source={{ uri: pendingGoogleUser.photo }}
                className="w-14 h-14 rounded-2xl"
              />
            ) : (
              <Text className="text-brand-accent font-extrabold text-2xl">
                {name.trim() ? name.trim()[0].toUpperCase() : "H"}
              </Text>
            )}
          </View>
          <Text className="text-dark-text text-2xl font-extrabold tracking-tight">
            Personalize Hawk
          </Text>
          <Text className="text-dark-muted text-xs text-center mt-1">
            {pendingGoogleUser
              ? `Connected as ${pendingGoogleUser.email}`
              : "Set up your offline profile. You can connect Google later."}
          </Text>
        </View>

        {errorMsg && (
          <View className="mb-4 p-3 bg-brand-expense/10 border border-brand-expense/20 rounded-xl">
            <Text className="text-brand-expense text-xs text-center">
              {errorMsg}
            </Text>
          </View>
        )}

        {/* 1. Name Input */}
        <View className="mb-6">
          <Text className="text-dark-text text-sm font-bold mb-2">
            Your Name <Text className="text-brand-accent">*</Text>
          </Text>
          <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center gap-3">
            <Ionicons name="person-outline" size={18} color="#60677C" />
            <TextInput
              placeholder="e.g. Musfir"
              placeholderTextColor="#60677C"
              value={name}
              onChangeText={setName}
              className="flex-1 text-dark-text text-base py-0"
              autoCapitalize="words"
            />
          </View>
        </View>

        {/* 2. Currency Selector */}
        <View className="mb-6">
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-dark-text text-sm font-bold">
              Base Currency <Text className="text-brand-accent">*</Text>
            </Text>
            <Text className="text-dark-muted text-xs">
              {selectedCurrency ? `Selected: ${selectedCurrency}` : "Choose one"}
            </Text>
          </View>

          {/* Grid of Currencies */}
          <View className="flex-row flex-wrap gap-2">
            {SUPPORTED_CURRENCIES.map((cur) => {
              const isSelected = selectedCurrency === cur.code;
              return (
                <TouchableOpacity
                  key={cur.code}
                  onPress={() => setSelectedCurrency(cur.code)}
                  className={`px-3 py-2.5 rounded-2xl border flex-row items-center gap-1.5 ${
                    isSelected
                      ? "bg-brand-accent border-brand-accent"
                      : "bg-dark-surface border-dark-border"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-extrabold text-sm ${
                      isSelected ? "text-dark-bg" : "text-brand-accent"
                    }`}
                  >
                    {cur.symbol}
                  </Text>
                  <Text
                    className={`font-semibold text-xs ${
                      isSelected ? "text-dark-bg" : "text-dark-text"
                    }`}
                  >
                    {cur.code}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 3. Number Separation Format */}
        <View className="mb-8">
          <Text className="text-dark-text text-sm font-bold mb-2">
            Number Format
          </Text>
          <View className="space-y-2 gap-2">
            {NUMBER_FORMATS.map((fmt) => {
              const isSelected = selectedFormat === fmt.id;
              return (
                <TouchableOpacity
                  key={fmt.id}
                  onPress={() => setSelectedFormat(fmt.id)}
                  className={`p-3.5 rounded-2xl border flex-row items-center justify-between ${
                    isSelected
                      ? "bg-dark-surface border-brand-accent"
                      : "bg-dark-surface border-dark-border"
                  }`}
                  activeOpacity={0.7}
                >
                  <View>
                    <Text className="text-dark-text font-bold text-sm">
                      {fmt.label}
                    </Text>
                    <Text className="text-dark-muted text-[11px] mt-0.5">
                      {fmt.example}
                    </Text>
                  </View>
                  <Ionicons
                    name={
                      isSelected
                        ? "radio-button-on"
                        : "radio-button-off"
                    }
                    size={20}
                    color={isSelected ? "#D4F938" : "#60677C"}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleFinish}
          disabled={!canSubmit || submitting}
          className={`py-4 px-6 rounded-2xl items-center justify-center shadow-lg ${
            canSubmit && !submitting
              ? "bg-brand-accent"
              : "bg-dark-surface border border-dark-border opacity-50"
          }`}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#0B0D12" size="small" />
          ) : (
            <Text
              className={`font-bold text-base ${
                canSubmit ? "text-dark-bg" : "text-dark-muted"
              }`}
            >
              Complete Setup & Enter Hawk
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
