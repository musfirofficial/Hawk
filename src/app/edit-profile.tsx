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
import { CurrencyPicker } from "../components/CurrencyPicker";
import { useAuth } from "../context/auth";
import {
  NUMBER_FORMATS,
  NumberFormatId,
  SUPPORTED_CURRENCIES,
} from "../db/schema";

export default function EditProfileScreen() {
  const router = useRouter();
  const { settings, completeOnboarding } = useAuth();

  const [name, setName] = useState(settings?.userName || "");
  const [profilePic, setProfilePic] = useState<string | null>(
    settings?.profilePic || null
  );
  const [selectedCurrency, setSelectedCurrency] = useState<string>(
    settings?.currency || "USD"
  );
  const [currencyPickerVisible, setCurrencyPickerVisible] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<NumberFormatId>(
    (settings?.numberFormat as NumberFormatId) || "COMMA_DOT"
  );
  const [isFormatDropdownOpen, setIsFormatDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const selectedCurrencyObj = SUPPORTED_CURRENCIES.find(
    (c) => c.code === selectedCurrency
  );
  const selectedFormatObj = NUMBER_FORMATS.find(
    (fmt) => fmt.id === selectedFormat
  );

  async function handlePickImage() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission Required",
          "Please grant media gallery permissions to change your profile picture."
        );
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
    }
  }

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert("Invalid Name", "Please enter your name.");
      return;
    }

    try {
      setSaving(true);
      await completeOnboarding({
        userName: name.trim(),
        currency: selectedCurrency,
        numberFormat: selectedFormat,
        profilePic,
        pin: settings?.pin || undefined,
        biometricsEnabled: settings?.biometricsEnabled,
      });

      Alert.alert("Success", "Profile updated successfully.");
      router.back();
    } catch (err) {
      console.error("Failed to update profile:", err);
      Alert.alert("Error", "Could not save profile changes.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-dark-border/30">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center -ml-1"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text className="text-dark-text text-lg font-bold">Edit Profile</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-6 pt-6"
      >
        {/* Avatar Picker */}
        <View className="items-center mb-8">
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

            <View className="absolute bottom-0 right-0 bg-brand-accent w-7 h-7 rounded-full items-center justify-center border-2 border-dark-bg shadow-md">
              <Ionicons name="camera" size={13} color="#0B0D12" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Fields Card */}
        <View className="bg-dark-surface rounded-2xl border border-dark-border p-4 gap-4 mb-8">
          {/* Full Name */}
          <View>
            <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider mb-2">
              Full Name
            </Text>
            <View className="bg-dark-card border border-dark-border rounded-xl px-4 py-3">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#60677C"
                className="text-dark-text text-sm py-0"
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* Currency */}
          <View>
            <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider mb-2">
              Currency
            </Text>
            <TouchableOpacity
              onPress={() => setCurrencyPickerVisible(true)}
              className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 flex-row items-center justify-between"
              activeOpacity={0.8}
            >
              <Text className="text-dark-text text-sm font-medium">
                {selectedCurrencyObj
                  ? `${selectedCurrencyObj.name} (${selectedCurrencyObj.symbol})`
                  : "Select currency"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#60677C" />
            </TouchableOpacity>
          </View>

          {/* Number Format */}
          <View>
            <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider mb-2">
              Number Format
            </Text>
            <TouchableOpacity
              onPress={() => setIsFormatDropdownOpen(!isFormatDropdownOpen)}
              className="bg-dark-card border border-dark-border rounded-xl px-4 py-3 flex-row items-center justify-between"
              activeOpacity={0.8}
            >
              <Text className="text-dark-text text-sm font-medium">
                {selectedFormatObj?.label}
              </Text>
              <Ionicons
                name={isFormatDropdownOpen ? "chevron-up" : "chevron-down"}
                size={16}
                color="#60677C"
              />
            </TouchableOpacity>

            {isFormatDropdownOpen && (
              <View className="bg-dark-card border border-dark-border rounded-xl mt-2 overflow-hidden">
                {NUMBER_FORMATS.map((fmt, idx) => (
                  <TouchableOpacity
                    key={fmt.id}
                    onPress={() => {
                      setSelectedFormat(fmt.id);
                      setIsFormatDropdownOpen(false);
                    }}
                    className={`px-4 py-3 flex-row items-center justify-between ${
                      idx > 0 ? "border-t border-dark-border/40" : ""
                    } ${selectedFormat === fmt.id ? "bg-brand-accent/5" : ""}`}
                  >
                    <Text
                      className={`text-sm ${
                        selectedFormat === fmt.id
                          ? "text-brand-accent font-bold"
                          : "text-dark-text"
                      }`}
                    >
                      {fmt.label}
                    </Text>
                    {selectedFormat === fmt.id && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#D4F938"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Save Changes Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-full bg-brand-accent items-center justify-center shadow-lg active:opacity-90"
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0B0D12" />
          ) : (
            <Text className="text-dark-bg font-bold text-base">
              Save Changes
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
    </SafeAreaView>
  );
}
