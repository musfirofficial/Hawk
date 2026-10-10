import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CurrencyPicker } from "./CurrencyPicker";
import { ScreenHeader } from "./ScreenHeader";
import { useAlert } from "../context/alert";
import {
  NUMBER_FORMATS,
  NumberFormatId,
  SUPPORTED_CURRENCIES,
} from "../db/schema";

export interface ProfileFormData {
  name: string;
  currency: string;
  numberFormat: NumberFormatId;
  profilePic: string | null;
}

export interface ProfileFormProps {
  mode?: "onboarding" | "edit";
  initialData?: {
    name?: string;
    currency?: string;
    numberFormat?: NumberFormatId;
    profilePic?: string | null;
  };
  onSubmit: (data: ProfileFormData) => void | Promise<void>;
  onBack?: () => void;
  showBack?: boolean;
  headerTitle?: string;
  submitButtonLabel?: string;
}

export function ProfileForm({
  mode = "onboarding",
  initialData,
  onSubmit,
  onBack,
  showBack = true,
  headerTitle,
  submitButtonLabel,
}: ProfileFormProps) {
  const { showAlert } = useAlert();
  const [name, setName] = useState(initialData?.name || "");
  const [profilePic, setProfilePic] = useState<string | null>(
    initialData?.profilePic || null
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    initialData?.currency || (mode === "onboarding" ? "" : "USD")
  );
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<NumberFormatId>(
    initialData?.numberFormat || "COMMA_DOT"
  );
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedCurrencyObj = SUPPORTED_CURRENCIES.find(
    (c) => c.code === selectedCurrency
  );
  const selectedFormatObj = NUMBER_FORMATS.find(
    (fmt) => fmt.id === selectedFormat
  );

  const canSubmit = name.trim().length > 0 && selectedCurrency.length > 0;

  async function handlePickImage() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        showAlert({
          title: "Permission Required",
          message:
            "Please grant media gallery permissions to set your profile picture.",
          type: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.2,
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
      showAlert({
        title: "Error",
        message: "Could not select image. Please try again.",
        type: "danger",
      });
    }
  }

  async function handleSubmit() {
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
      await onSubmit({
        name: name.trim(),
        currency: selectedCurrency,
        numberFormat: selectedFormat,
        profilePic,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to save profile.");
    } finally {
      setSubmitting(false);
    }
  }

  const defaultButtonLabel =
    mode === "onboarding" ? "Complete Profile" : "Save Changes";

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Top Bar */}
        {headerTitle ? (
          <ScreenHeader
            title={headerTitle}
            onBack={onBack}
            showBack={showBack}
          />
        ) : null}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Title & Subtitle for Onboarding */}
          {mode === "onboarding" && (
            <View className="items-center mb-6">
              <Text className="text-dark-text text-2xl font-bold tracking-tight text-center">
                Complete Your Profile
              </Text>
              <Text className="text-dark-muted text-xs text-center mt-2 px-6 leading-relaxed">
                Don't worry only you can see your personal data. No one else will
                be able to see it
              </Text>
            </View>
          )}

          {/* Profile Picture / Avatar Picker */}
          <View className={`items-center ${mode === "onboarding" ? "mb-8" : "my-6"}`}>
            <TouchableOpacity
              onPress={handlePickImage}
              activeOpacity={0.8}
              className="relative"
            >
              <View className="w-24 h-24 rounded-full bg-dark-surface border border-dark-border items-center justify-center overflow-hidden shadow-lg">
                {profilePic ? (
                  <Image
                    source={{ uri: profilePic }}
                    className="w-full h-full rounded-full"
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="person" size={46} color="#60677C" />
                )}
              </View>

              {/* Camera Badge Icon */}
              <View className="absolute bottom-0 right-0 bg-brand-accent w-7 h-7 rounded-full items-center justify-center border-2 border-dark-bg shadow-md">
                <Ionicons name="camera" size={13} color="#0B0D12" />
              </View>
            </TouchableOpacity>
          </View>

          {errorMsg && (
            <View className="mb-4 p-3 bg-brand-expense/10 border border-brand-expense/20 rounded-xl">
              <Text className="text-brand-expense text-xs text-center font-medium">
                {errorMsg}
              </Text>
            </View>
          )}

          {/* Form Fields */}
          <View className="gap-5 mb-8">
            {/* 1. Name Input */}
            <View>
              <Text className="text-dark-text text-sm font-semibold mb-2">
                Name
              </Text>
              <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5">
                <TextInput
                  placeholder="Enter your name"
                  placeholderTextColor="#60677C"
                  value={name}
                  onChangeText={setName}
                  className="text-dark-text text-sm py-0"
                  autoCapitalize="words"
                />
              </View>
            </View>

            {/* 2. Currency Selector */}
            <View>
              <Text className="text-dark-text text-sm font-semibold mb-2">
                Currency
              </Text>

              <TouchableOpacity
                onPress={() => setCurrencyPickerVisible(true)}
                className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center justify-between"
                activeOpacity={0.8}
              >
                <Text
                  className={`text-sm ${
                    selectedCurrencyObj
                      ? "text-dark-text font-medium"
                      : "text-dark-muted"
                  }`}
                >
                  {selectedCurrencyObj
                    ? `${selectedCurrencyObj.name} (${selectedCurrencyObj.code})`
                    : "Select currency"}
                </Text>

                <View className="flex-row items-center gap-2">
                  {selectedCurrencyObj && (
                    <Text className="text-brand-accent font-bold text-sm">
                      {selectedCurrencyObj.symbol}
                    </Text>
                  )}
                  <Ionicons name="chevron-down" size={18} color="#60677C" />
                </View>
              </TouchableOpacity>
            </View>

            {/* 3. Number Format Dropdown */}
            <View>
              <Text className="text-dark-text text-sm font-semibold mb-2">
                Number Format
              </Text>

              <TouchableOpacity
                onPress={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
                className={`bg-dark-surface border rounded-2xl px-4 py-3.5 flex-row items-center justify-between ${
                  isFormatDropdownOpen
                    ? "border-brand-accent/50"
                    : "border-dark-border"
                }`}
                activeOpacity={0.8}
              >
                <Text className="text-dark-text text-sm font-medium">
                  {selectedFormatObj?.label || "Select format"}
                </Text>

                <Ionicons
                  name={isFormatDropdownOpen ? "chevron-up" : "chevron-down"}
                  size={18}
                  color="#60677C"
                />
              </TouchableOpacity>

              {isFormatDropdownOpen && (
                <View className="bg-dark-surface border border-dark-border rounded-2xl mt-2 overflow-hidden shadow-xl">
                  {NUMBER_FORMATS.map((fmt, idx) => {
                    const isSelected = selectedFormat === fmt.id;
                    return (
                      <TouchableOpacity
                        key={fmt.id}
                        onPress={() => {
                          setSelectedFormat(fmt.id);
                          setIsFormatDropdownOpen(false);
                        }}
                        className={`px-4 py-3.5 flex-row items-center justify-between ${
                          idx > 0 ? "border-t border-dark-border/40" : ""
                        } ${isSelected ? "bg-brand-accent/5" : ""}`}
                        activeOpacity={0.7}
                      >
                        <View className="flex-1 mr-2">
                          <Text
                            className={`text-sm font-medium ${
                              isSelected
                                ? "text-brand-accent font-semibold"
                                : "text-dark-text"
                            }`}
                          >
                            {fmt.label}
                          </Text>
                          <Text className="text-dark-muted text-xs mt-0.5">
                            {fmt.id === "COMMA_DOT"
                              ? "Comma separator (1,234.56)"
                              : "Period separator (1.234,56)"}
                          </Text>
                        </View>

                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#D4F938"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Preview */}
              <View className="mt-2.5 px-1 flex-row items-center justify-between">
                <Text className="text-dark-muted text-xs">Preview</Text>
                <Text className="text-dark-text text-xs font-semibold">
                  {selectedFormat === "COMMA_DOT"
                    ? `${selectedCurrencyObj?.symbol || "$"} 1,234,567.89`
                    : `${selectedCurrencyObj?.symbol || "$"} 1.234.567,89`}
                </Text>
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={!canSubmit || submitting}
            className={`w-full py-4 rounded-full items-center justify-center shadow-lg active:opacity-90 ${
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
                  canSubmit ? "text-brand-accentDark" : "text-dark-muted"
                }`}
              >
                {submitButtonLabel || defaultButtonLabel}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <CurrencyPicker
        visible={currencyPickerVisible}
        selectedCode={selectedCurrency}
        onSelect={(code) => setSelectedCurrency(code)}
        onClose={() => setCurrencyPickerVisible(false)}
      />
    </SafeAreaView>
  );
}
