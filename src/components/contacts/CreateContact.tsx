import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { HawkModal } from "../HawkModal";
import { useContacts } from "../../context/contacts";

interface CreateContactProps {
  visible: boolean;
  onClose: () => void;
  onCreated?: (contactId: number) => void;
}

export function CreateContact({
  visible,
  onClose,
  onCreated,
}: CreateContactProps) {
  const { createContact } = useContacts();

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName("");
      setMobileNumber("");
      setNote("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [visible]);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Contact name is required");
      return;
    }

    setError(null);

    try {
      setIsSubmitting(true);
      const newId = await createContact({
        name: trimmedName,
        mobileNumber: mobileNumber.trim() || null,
        note: note.trim() || null,
      });
      handleClose();
      if (onCreated) {
        onCreated(newId);
      }
    } catch (err) {
      console.error("Create contact failed:", err);
      setError("Failed to create contact. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <HawkModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" onPress={handleClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="bg-dark-surface border-t border-dark-border rounded-t-3xl max-h-[85vh] px-5 pt-3 pb-8">
            <View className="items-center mb-3">
              <View className="w-12 h-1.5 bg-dark-border rounded-full" />
            </View>

            <View className="flex-row items-center justify-between pb-4 border-b border-dark-border">
              <Text className="text-dark-text text-xl font-bold">
                Add Contact
              </Text>
              <TouchableOpacity
                onPress={handleClose}
                className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center"
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={18} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 16, paddingBottom: 24 }}
            >
              {error ? (
                <View className="bg-rose-500/15 border border-rose-500/30 rounded-xl p-3 mb-4">
                  <Text className="text-rose-400 text-xs font-semibold text-center">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Contact Name */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Contact / Person Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Henrik Jansen or Acme Corp"
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                />
              </View>

              {/* Mobile Number */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Phone Number (Optional)
                </Text>
                <TextInput
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                  placeholder="e.g. +1 (555) 234-5678"
                  placeholderTextColor="#64748B"
                  keyboardType="phone-pad"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                />
              </View>

              {/* Note / Role */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Note / Tag (Optional)
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Colleague, Contractor, Landlord"
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting}
                className="bg-brand-accent rounded-2xl py-4 items-center justify-center mt-3"
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0B0D12" />
                ) : (
                  <Text className="text-dark-bg font-extrabold text-base">
                    Save Contact
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </HawkModal>
  );
}
