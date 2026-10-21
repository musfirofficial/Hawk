import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useAlert } from "../context/alert";
import {
  NUMBER_FORMATS,
  NumberFormatId,
  SUPPORTED_CURRENCIES,
} from "../db/schema";
import { CurrencyPicker } from "./CurrencyPicker";
import { Dropdown } from "./Dropdown";
import { HawkFlyUp } from "./HawkFlyUp";

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
  submitButtonLabel?: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function ProfileForm({
  mode = "onboarding",
  initialData,
  onSubmit,
  submitButtonLabel,
  className = "",
  style,
}: ProfileFormProps) {
  const { showAlert } = useAlert();
  const [name, setName] = useState(initialData?.name || "");
  const [profilePic, setProfilePic] = useState<string | null>(
    initialData?.profilePic || null,
  );
  const [showPickerSheet, setShowPickerSheet] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    initialData?.currency || (mode === "onboarding" ? "" : "USD"),
  );
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<NumberFormatId>(
    initialData?.numberFormat || "COMMA_DOT",
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedCurrencyObj = SUPPORTED_CURRENCIES.find(
    (c) => c.code === selectedCurrency,
  );

  const canSubmit = name.trim().length > 0 && selectedCurrency.length > 0;

  async function handlePickFromGallery() {
    setShowPickerSheet(false);
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      // Check for full access OR limited/partial access (Android 14+ / iOS 14+)
      const isAllowed =
        permission.granted ||
        permission.status === ImagePicker.PermissionStatus.GRANTED ||
        (permission as any).accessPrivileges === "limited";

      if (!isAllowed) {
        showAlert({
          title: "Permission Required",
          message:
            "Please allow media library access (full or selected) to choose your profile picture.",
          type: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
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

  async function handleTakePhoto() {
    setShowPickerSheet(false);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted && permission.status !== ImagePicker.PermissionStatus.GRANTED) {
        showAlert({
          title: "Permission Required",
          message:
            "Please grant camera permission to take a profile picture.",
          type: "warning",
        });
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
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
      console.warn("Failed to capture photo:", err);
      showAlert({
        title: "Error",
        message: "Could not capture photo. Please try again.",
        type: "danger",
      });
    }
  }

  function handleRemovePhoto() {
    setShowPickerSheet(false);
    setProfilePic(null);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className={`flex-1 ${className}`}
      style={style}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-6"
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Picture / Avatar Picker */}
        <View className="items-center my-6">
          <TouchableOpacity
            onPress={() => setShowPickerSheet(true)}
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
            <View className="h-14 bg-dark-surface border border-dark-border rounded-2xl px-4 justify-center">
              <TextInput
                placeholder="Enter your name"
                placeholderTextColor="#60677C"
                value={name}
                onChangeText={setName}
                className="text-dark-text text-sm py-0 font-medium"
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
              className="h-14 bg-dark-surface border border-dark-border rounded-2xl px-4 flex-row items-center justify-between"
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
            <Dropdown
              label="Number Format"
              triggerClassName="h-14"
              options={NUMBER_FORMATS.map((fmt) => ({
                value: fmt.id,
                label: fmt.label,
              }))}
              selectedValue={selectedFormat}
              onSelect={(val) => setSelectedFormat(val as NumberFormatId)}
            />

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

      <CurrencyPicker
        visible={currencyPickerVisible}
        selectedCode={selectedCurrency}
        onSelect={(code) => setSelectedCurrency(code)}
        onClose={() => setCurrencyPickerVisible(false)}
      />

      {/* Profile Picture Option Sheet */}
      <HawkFlyUp
        visible={showPickerSheet}
        onClose={() => setShowPickerSheet(false)}
        title="Profile Photo"
        subtitle="Choose how to set your profile picture"
      >
        <View className="py-2 gap-2">
          <TouchableOpacity
            onPress={handleTakePhoto}
            activeOpacity={0.7}
            className="flex-row items-center p-4 bg-dark-card rounded-2xl border border-dark-border active:bg-dark-cardHover"
          >
            <View className="w-10 h-10 rounded-xl bg-brand-accent/10 items-center justify-center mr-3.5 border border-brand-accent/20">
              <Ionicons name="camera" size={20} color="#D4F938" />
            </View>
            <View className="flex-1">
              <Text className="text-dark-text font-bold text-sm">Take Photo</Text>
              <Text className="text-dark-muted text-xs mt-0.5">Use your camera to take a new picture</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#60677C" />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePickFromGallery}
            activeOpacity={0.7}
            className="flex-row items-center p-4 bg-dark-card rounded-2xl border border-dark-border active:bg-dark-cardHover"
          >
            <View className="w-10 h-10 rounded-xl bg-brand-transfer/10 items-center justify-center mr-3.5 border border-brand-transfer/20">
              <Ionicons name="images" size={20} color="#38BDF8" />
            </View>
            <View className="flex-1">
              <Text className="text-dark-text font-bold text-sm">Choose from Gallery</Text>
              <Text className="text-dark-muted text-xs mt-0.5">Select full or limited photos from library</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#60677C" />
          </TouchableOpacity>

          {profilePic && (
            <TouchableOpacity
              onPress={handleRemovePhoto}
              activeOpacity={0.7}
              className="flex-row items-center p-4 bg-brand-expense/10 rounded-2xl border border-brand-expense/20 mt-1 active:bg-brand-expense/20"
            >
              <View className="w-10 h-10 rounded-xl bg-brand-expense/20 items-center justify-center mr-3.5">
                <Ionicons name="trash-outline" size={18} color="#F43F5E" />
              </View>
              <View className="flex-1">
                <Text className="text-brand-expense font-bold text-sm">Remove Photo</Text>
                <Text className="text-brand-expense/70 text-xs mt-0.5">Revert to default avatar</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>
      </HawkFlyUp>
    </KeyboardAvoidingView>
  );
}
