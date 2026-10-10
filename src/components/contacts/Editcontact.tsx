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
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { ContactItem, useContacts } from "../../context/contacts";
import { useSecurityGuard } from "../../context/security";
import { formatCurrency } from "../../services/currency";

interface EditContactProps {
  visible: boolean;
  onClose: () => void;
  contact: ContactItem | null;
}

export function Editcontact({ visible, onClose, contact }: EditContactProps) {
  const { updateContact, deleteContact } = useContacts();
  const { requireSecurityAuth } = useSecurityGuard();
  const { settings } = useAuth();
  const { showAlert, showConfirm } = useAlert();

  const [name, setName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (contact && visible) {
      setName(contact.name);
      setMobileNumber(contact.mobileNumber || "");
      setNote(contact.note || "");
      setError(null);
      setIsSubmitting(false);
      setIsDeleting(false);
    }
  }, [contact, visible]);

  if (!contact) return null;

  async function handleSave() {
    if (!contact) return;
    const currentContact = contact;
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Contact name is required");
      return;
    }

    setError(null);
    try {
      setIsSubmitting(true);
      await updateContact(currentContact.id, {
        name: trimmedName,
        mobileNumber: mobileNumber.trim() || null,
        note: note.trim() || null,
      });
      onClose();
    } catch (err) {
      console.error("Update contact failed:", err);
      setError("Failed to update contact. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDelete() {
    if (!contact) return;
    const currentContact = contact;
    const hasHistory = currentContact.activityCount > 0;

    const alertTitle = hasHistory ? "Archive Contact" : "Delete Contact";
    const alertMessage = hasHistory
      ? `This contact is linked to ${currentContact.activityCount} past transaction/debt records. To preserve history, this contact will be safely archived.`
      : "This contact has no transaction or debt records and will be permanently deleted.";

    showConfirm({
      title: alertTitle,
      message: alertMessage,
      type: "danger",
      confirmText: hasHistory ? "Archive" : "Delete",
      isDestructive: true,
      onConfirm: () => {
        requireSecurityAuth({
          ruleKey: "deleteContact",
          title: hasHistory ? "Authorize Archive" : "Authorize Deletion",
          description: "Verify your identity to remove this contact.",
          onSuccess: async () => {
            try {
              setIsDeleting(true);
              const result = await deleteContact(currentContact.id);
              onClose();
              if (result.archived) {
                showAlert({
                  title: "Contact Archived",
                  message:
                    "Contact was archived to keep historical debt & transaction records intact.",
                  type: "info",
                });
              }
            } catch (err) {
              console.error("Delete contact failed:", err);
              showAlert({
                title: "Error",
                message: "Could not delete contact.",
                type: "danger",
              });
            } finally {
              setIsDeleting(false);
            }
          },
        });
      },
    });
  }

  return (
    <HawkModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" onPress={onClose} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View className="bg-dark-surface border-t border-dark-border rounded-t-3xl max-h-[85vh] px-5 pt-3 pb-8">
            <View className="items-center mb-3">
              <View className="w-12 h-1.5 bg-dark-border rounded-full" />
            </View>

            <View className="flex-row items-center justify-between pb-4 border-b border-dark-border">
              <Text className="text-dark-text text-xl font-bold">
                Edit Contact
              </Text>
              <TouchableOpacity
                onPress={onClose}
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
              {/* Financial Relation Summary Card */}
              <View className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-5">
                <Text className="text-dark-muted text-xs font-semibold uppercase tracking-wider mb-1">
                  Debt Status
                </Text>
                {contact.totalOwedToMe > 0 ? (
                  <Text className="text-brand-lend text-lg font-bold">
                    Owes you{" "}
                    {formatCurrency(
                      contact.totalOwedToMe,
                      settings?.currency,
                      settings?.numberFormat
                    )}
                  </Text>
                ) : contact.totalIOwe > 0 ? (
                  <Text className="text-brand-borrow text-lg font-bold">
                    You owe{" "}
                    {formatCurrency(
                      contact.totalIOwe,
                      settings?.currency,
                      settings?.numberFormat
                    )}
                  </Text>
                ) : (
                  <Text className="text-dark-muted text-sm font-medium">
                    No active debt balances
                  </Text>
                )}
              </View>

              {error ? (
                <View className="bg-rose-500/15 border border-rose-500/30 rounded-xl p-3 mb-4">
                  <Text className="text-rose-400 text-xs font-semibold text-center">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Name */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Contact Name
                </Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Contact name"
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                />
              </View>

              {/* Mobile */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Phone Number
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

              {/* Note */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Note / Tag
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Colleague, Contractor"
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSubmitting || isDeleting}
                className="bg-brand-accent rounded-2xl py-4 items-center justify-center mt-3"
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0B0D12" />
                ) : (
                  <Text className="text-dark-bg font-extrabold text-base">
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>

              {/* Delete / Archive Button */}
              <TouchableOpacity
                onPress={handleDelete}
                disabled={isSubmitting || isDeleting}
                className="bg-rose-500/10 border border-rose-500/20 rounded-2xl py-3.5 items-center justify-center mt-3 flex-row gap-2"
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#F43F5E" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#F43F5E" />
                    <Text className="text-rose-500 font-bold text-sm">
                      {contact.activityCount > 0
                        ? "Archive Contact"
                        : "Delete Contact"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </HawkModal>
  );
}
