import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContactAvatar } from "../components/ContactAvatar";
import { ScreenHeader } from "../components/ScreenHeader";
import { useAlert } from "../context/alert";
import { useContacts } from "../context/contacts";
import { generateContactAvatar } from "../services/avatarService";

export default function CreateContactScreen() {
  const router = useRouter();
  const { createContact } = useContacts();
  const { showAlert } = useAlert();

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg("Please enter a contact name.");
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const avatarSvg = generateContactAvatar(trimmedName);
      await createContact({
        name: trimmedName,
        mobileNumber: mobileNumber.trim() || null,
        note: note.trim() || null,
        avatarSvg,
      });

      router.back();
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to create contact.");
      showAlert({
        title: "Error",
        message: err?.message || "Failed to create contact.",
        type: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
      <ScreenHeader title="New Contact" onBack={() => router.back()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          className="flex-1 px-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Contact Avatar Preview (Profile Style) */}
          <View className="items-center my-6">
            <ContactAvatar
              name={name || "New Contact"}
              size={96}
              className="border-2 border-dark-border shadow-xl"
            />
          </View>

          {errorMsg ? (
            <View className="mb-4 p-3 bg-brand-expense/10 border border-brand-expense/20 rounded-xl">
              <Text className="text-brand-expense text-xs text-center font-medium">
                {errorMsg}
              </Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <View className="gap-5 mb-8">
            {/* 1. Name Input */}
            <View>
              <Text className="text-dark-text text-sm font-semibold mb-2">
                Name
              </Text>
              <View className="h-14 bg-dark-surface border border-dark-border rounded-2xl px-4 justify-center">
                <TextInput
                  placeholder="Enter contact or company name"
                  placeholderTextColor="#60677C"
                  value={name}
                  onChangeText={(val) => {
                    setName(val);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  className="text-dark-text text-sm py-0 font-medium"
                  autoCapitalize="words"
                  autoFocus={true}
                />
              </View>
            </View>

            {/* 2. Phone Number (Optional) */}
            <View>
              <Text className="text-dark-text text-sm font-semibold mb-2">
                Phone Number (Optional)
              </Text>
              <View className="h-14 bg-dark-surface border border-dark-border rounded-2xl px-4 justify-center">
                <TextInput
                  placeholder="e.g. +1 555 123 4567"
                  placeholderTextColor="#60677C"
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  keyboardType="phone-pad"
                  className="text-dark-text text-sm py-0 font-medium"
                />
              </View>
            </View>

            {/* 3. Note (Optional) */}
            <View>
              <Text className="text-dark-text text-sm font-semibold mb-2">
                Note (Optional)
              </Text>
              <View className="min-h-[100px] bg-dark-surface border border-dark-border rounded-2xl px-4 py-3 justify-start">
                <TextInput
                  placeholder="Add reference, relation, or details"
                  placeholderTextColor="#60677C"
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  className="text-dark-text text-sm font-medium py-0"
                  textAlignVertical="top"
                />
              </View>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={submitting}
            activeOpacity={0.85}
            className="w-full py-4 rounded-full bg-brand-accent items-center justify-center shadow-lg active:opacity-90"
          >
            <Text className="text-dark-bg font-bold text-base">
              {submitting ? "Saving..." : "Create Contact"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
