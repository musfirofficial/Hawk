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
import { useAccounts } from "../../context/accounts";
import { useAuth } from "../../context/auth";
import { useContacts } from "../../context/contacts";
import { useDebts } from "../../context/debts";
import { DebtType } from "../../db/schema";
import { getCurrencySymbol } from "../../services/currency";

interface CreateDebtsProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: DebtType;
}

export function CreateDebts({
  visible,
  onClose,
  defaultType = "LEND",
}: CreateDebtsProps) {
  const { createDebt } = useDebts();
  const { contacts } = useContacts();
  const { accounts } = useAccounts();
  const { settings } = useAuth();

  const [type, setType] = useState<DebtType>(defaultType);
  const [contactId, setContactId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [assetId, setAssetId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = getCurrencySymbol(settings?.currency || "USD");

  useEffect(() => {
    if (visible) {
      setType(defaultType);
      setContactId(contacts.length > 0 ? contacts[0].id : null);
      setAmount("");
      setAssetId(accounts.length > 0 ? accounts[0].id : null);
      setDueDate("");
      setNote("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [visible, defaultType, contacts, accounts]);

  function handleClose() {
    setError(null);
    onClose();
  }

  async function handleSubmit() {
    if (!contactId) {
      setError("Please select a contact");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    setError(null);

    try {
      setIsSubmitting(true);
      await createDebt({
        contactId,
        type,
        amount: parsedAmount,
        assetId: assetId || null,
        dueDate: dueDate.trim() || null,
        note: note.trim() || null,
      });
      handleClose();
    } catch (err) {
      console.error("Create debt failed:", err);
      setError("Failed to create debt record.");
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
                New Debt Record
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
              {/* Type Switcher Pills */}
              <View className="flex-row gap-3 mb-5">
                <TouchableOpacity
                  onPress={() => setType("LEND")}
                  activeOpacity={0.8}
                  className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-2xl border ${
                    type === "LEND"
                      ? "bg-brand-lend/15 border-brand-lend"
                      : "bg-dark-card border-dark-border"
                  }`}
                >
                  <Ionicons
                    name="arrow-up-circle-outline"
                    size={18}
                    color={type === "LEND" ? "#F59E0B" : "#94A3B8"}
                  />
                  <Text
                    className={`ml-2 text-xs font-bold ${
                      type === "LEND" ? "text-brand-lend" : "text-dark-muted"
                    }`}
                  >
                    I Lent (Owed to Me)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setType("BORROW")}
                  activeOpacity={0.8}
                  className={`flex-1 flex-row items-center justify-center py-3 px-4 rounded-2xl border ${
                    type === "BORROW"
                      ? "bg-brand-borrow/15 border-brand-borrow"
                      : "bg-dark-card border-dark-border"
                  }`}
                >
                  <Ionicons
                    name="arrow-down-circle-outline"
                    size={18}
                    color={type === "BORROW" ? "#A855F7" : "#94A3B8"}
                  />
                  <Text
                    className={`ml-2 text-xs font-bold ${
                      type === "BORROW"
                        ? "text-brand-borrow"
                        : "text-dark-muted"
                    }`}
                  >
                    I Borrowed (I Owe)
                  </Text>
                </TouchableOpacity>
              </View>

              {error ? (
                <View className="bg-rose-500/15 border border-rose-500/30 rounded-xl p-3 mb-4">
                  <Text className="text-rose-400 text-xs font-semibold text-center">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Contact Selector */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Contact / Person
                </Text>
                {contacts.length === 0 ? (
                  <View className="bg-dark-card border border-dark-border p-3 rounded-2xl">
                    <Text className="text-dark-muted text-xs">
                      No contacts yet. Please add a contact first from the Contacts tab.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row gap-2"
                  >
                    {contacts.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setContactId(c.id)}
                        className={`px-3.5 py-2 rounded-2xl border ${
                          contactId === c.id
                            ? "bg-brand-accent/20 border-brand-accent"
                            : "bg-dark-card border-dark-border"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            contactId === c.id
                              ? "text-brand-accent"
                              : "text-dark-text"
                          }`}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              {/* Amount */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Amount
                </Text>
                <View className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3 flex-row items-center">
                  <Text className="text-brand-accent font-bold text-base mr-2">
                    {currencySymbol}
                  </Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    className="flex-1 text-dark-text text-base p-0"
                  />
                </View>
              </View>

              {/* Linked Liquid Asset Account */}
              {accounts.length > 0 && (
                <View className="mb-4">
                  <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                    {type === "LEND"
                      ? "Deduct from Account (Optional)"
                      : "Deposit to Account (Optional)"}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row gap-2"
                  >
                    <TouchableOpacity
                      onPress={() => setAssetId(null)}
                      className={`px-3.5 py-2 rounded-2xl border ${
                        assetId === null
                          ? "bg-dark-surface border-brand-accent"
                          : "bg-dark-card border-dark-border"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          assetId === null
                            ? "text-brand-accent"
                            : "text-dark-muted"
                        }`}
                      >
                        None (No cash movement)
                      </Text>
                    </TouchableOpacity>

                    {accounts.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        onPress={() => setAssetId(a.id)}
                        className={`px-3.5 py-2 rounded-2xl border ${
                          assetId === a.id
                            ? "bg-brand-accent/20 border-brand-accent"
                            : "bg-dark-card border-dark-border"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            assetId === a.id
                              ? "text-brand-accent"
                              : "text-dark-text"
                          }`}
                        >
                          {a.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Due Date */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Due Date (Optional)
                </Text>
                <TextInput
                  value={dueDate}
                  onChangeText={setDueDate}
                  placeholder="e.g. 2026-11-15 or Next Friday"
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                />
              </View>

              {/* Note */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Note (Optional)
                </Text>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="e.g. Loan for laptop purchase"
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3.5 text-dark-text text-base"
                />
              </View>

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={isSubmitting || !contactId}
                className="bg-brand-accent rounded-2xl py-4 items-center justify-center mt-3"
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0B0D12" />
                ) : (
                  <Text className="text-dark-bg font-extrabold text-base">
                    Create Debt Record
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
