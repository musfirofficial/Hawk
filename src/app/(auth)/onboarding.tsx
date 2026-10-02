import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CurrencyPicker } from "../../components/CurrencyPicker";
import { useAuth } from "../../context/auth";
import {
  NUMBER_FORMATS,
  NumberFormatId,
  SUPPORTED_CURRENCIES,
} from "../../db/schema";

export default function OnboardingScreen() {
  const router = useRouter();
  const { pendingGoogleUser, completeOnboarding } = useAuth();

  // Name & Profile Picture
  const [name, setName] = useState(pendingGoogleUser?.name || "");
  const [profilePic, setProfilePic] = useState<string | null>(null);

  // Currency Selection with Fly-up modal
  const [selectedCurrency, setSelectedCurrency] = useState<string>(""); // default none
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);

  // Number Format (Horizontal View - COMMA_DOT default)
  const [selectedFormat, setSelectedFormat] =
    useState<NumberFormatId>("COMMA_DOT");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedCurrencyObj = SUPPORTED_CURRENCIES.find(
    (c) => c.code === selectedCurrency,
  );

  const canSubmit = name.trim().length > 0 && selectedCurrency.length > 0;

  // Image Picker: Save low-quality local image to app storage
  async function handlePickImage() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant media gallery permissions to set your profile picture.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2, // Low quality as it's a small local avatar
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const pickedUri = result.assets[0].uri;
        const fileName = `profile_${Date.now()}.jpg`;
        const destUri = `${FileSystem.documentDirectory}${fileName}`;

        await FileSystem.copyAsync({
          from: pickedUri,
          to: destUri,
        });

        setProfilePic(destUri);
      }
    } catch (err) {
      console.warn("Failed to pick image:", err);
      Alert.alert("Error", "Could not select image. Please try again.");
    }
  }

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
        profilePic: profilePic || null,
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
        {/* Title & Header with Profile Picture Picker */}
        <View className="mb-6 items-center">
          <TouchableOpacity
            onPress={handlePickImage}
            activeOpacity={0.8}
            className="relative mb-3"
          >
            <View className="w-22 h-22 rounded-full bg-brand-accent/15 border-2 border-brand-accent/40 items-center justify-center overflow-hidden shadow-xl">
              {profilePic ? (
                <Image
                  source={{ uri: profilePic }}
                  className="w-full h-full rounded-full"
                  resizeMode="cover"
                />
              ) : (
                <Text className="text-brand-accent font-extrabold text-3xl">
                  {name.trim() ? name.trim()[0].toUpperCase() : "H"}
                </Text>
              )}
            </View>

            {/* Camera badge icon */}
            <View className="absolute bottom-0 right-0 bg-brand-accent w-7 h-7 rounded-full items-center justify-center border-2 border-dark-bg shadow-md">
              <Ionicons name="camera" size={13} color="#0B0D12" />
            </View>
          </TouchableOpacity>

          <Text className="text-dark-text text-2xl font-extrabold tracking-tight">
            Personalize Hawk
          </Text>
          <Text className="text-dark-muted text-xs text-center mt-1">
            Tap the avatar to add your photo. Stored locally on this device.
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

        {/* 2. Base Currency (Fly-up Menu Trigger) */}
        <View className="mb-6">
          <Text className="text-dark-text text-sm font-bold mb-2">
            Base Currency <Text className="text-brand-accent">*</Text>
          </Text>

          <TouchableOpacity
            onPress={() => setCurrencyPickerVisible(true)}
            className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center justify-between"
            activeOpacity={0.8}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-8 h-8 rounded-xl bg-brand-accent/15 items-center justify-center">
                <Text className="text-brand-accent font-extrabold text-sm">
                  {selectedCurrencyObj?.symbol || "$"}
                </Text>
              </View>
              <Text
                className={`text-base ${
                  selectedCurrencyObj
                    ? "text-dark-text font-medium"
                    : "text-dark-muted"
                }`}
              >
                {selectedCurrencyObj
                  ? selectedCurrencyObj.name
                  : "Select currency"}
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              {selectedCurrencyObj && (
                <Text className="text-brand-accent font-bold text-base">
                  {selectedCurrencyObj.symbol}
                </Text>
              )}
              <Ionicons name="chevron-down" size={18} color="#60677C" />
            </View>
          </TouchableOpacity>
        </View>

        {/* 3. Number Format (2 Options in Horizontal View, Comma-Dot Default) */}
        <View className="mb-8">
          <Text className="text-dark-text text-sm font-bold mb-2">
            Number Format
          </Text>

          {/* 2 options in horizontal view */}
          <View className="flex-row gap-3">
            {NUMBER_FORMATS.map((fmt) => {
              const isSelected = selectedFormat === fmt.id;
              return (
                <TouchableOpacity
                  key={fmt.id}
                  onPress={() => setSelectedFormat(fmt.id)}
                  className={`flex-1 py-3.5 px-4 rounded-2xl border items-center justify-center ${
                    isSelected
                      ? "bg-brand-accent/15 border-brand-accent"
                      : "bg-dark-surface border-dark-border"
                  }`}
                  activeOpacity={0.7}
                >
                  <Text
                    className={`font-bold text-base ${
                      isSelected ? "text-brand-accent" : "text-dark-text"
                    }`}
                  >
                    {fmt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Example text below */}
          <View className="mt-2.5 px-1">
            <Text className="text-dark-muted text-xs">
              Example:{" "}
              <Text className="text-dark-text font-semibold">
                {selectedFormat === "COMMA_DOT"
                  ? `${selectedCurrencyObj?.symbol || "$"} 1,234,567.89`
                  : `${selectedCurrencyObj?.symbol || "$"} 1.234.567,89`}
              </Text>
            </Text>
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

      {/* Fly-up Currency Picker Modal */}
      <CurrencyPicker
        visible={currencyPickerVisible}
        selectedCode={selectedCurrency}
        onSelect={(code) => setSelectedCurrency(code)}
        onClose={() => setCurrencyPickerVisible(false)}
      />
    </SafeAreaView>
  );
}
