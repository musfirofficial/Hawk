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
import { useSecurityGuard } from "../../context/security";
import {
  useTransactions,
} from "../../context/transactions";
import { TransactionType } from "../../db/schema";
import { getCurrencySymbol } from "../../services/currency";

interface CreateTransactionProps {
  visible: boolean;
  onClose: () => void;
  defaultType?: "EXPENSE" | "INCOME" | "TRANSFER";
}

export function CreateTransaction({
  visible,
  onClose,
  defaultType = "EXPENSE",
}: CreateTransactionProps) {
  const { createTransaction, incomeCategories, expenseCategories } =
    useTransactions();
  const { accounts } = useAccounts();
  const { contacts } = useContacts();
  const { requireSecurityAuth } = useSecurityGuard();
  const { settings } = useAuth();

  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">(defaultType);
  const [amount, setAmount] = useState("");
  const [fromAssetId, setFromAssetId] = useState<number | null>(null);
  const [toAssetId, setToAssetId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [contactId, setContactId] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = getCurrencySymbol(settings?.currency || "USD");

  useEffect(() => {
    if (visible) {
      setType(defaultType);
      setAmount("");
      const firstAccId = accounts.length > 0 ? accounts[0].id : null;
      const secondAccId =
        accounts.length > 1 ? accounts[1].id : accounts.length > 0 ? accounts[0].id : null;
      setFromAssetId(firstAccId);
      setToAssetId(defaultType === "TRANSFER" ? secondAccId : firstAccId);

      const cats = defaultType === "INCOME" ? incomeCategories : expenseCategories;
      setCategoryId(cats.length > 0 ? cats[0].id : null);
      setContactId(null);
      setDate(new Date().toISOString().split("T")[0]);
      setNote("");
      setError(null);
      setIsSubmitting(false);
    }
  }, [visible, defaultType, accounts, incomeCategories, expenseCategories]);

  // Update default category when switching tabs
  function handleTypeChange(newType: "EXPENSE" | "INCOME" | "TRANSFER") {
    setType(newType);
    if (newType === "INCOME") {
      setCategoryId(incomeCategories.length > 0 ? incomeCategories[0].id : null);
    } else if (newType === "EXPENSE") {
      setCategoryId(expenseCategories.length > 0 ? expenseCategories[0].id : null);
    } else {
      setCategoryId(null);
    }
  }

  function handleClose() {
    setError(null);
    onClose();
  }

  function handleSubmit() {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    if (type === "EXPENSE" && !fromAssetId) {
      setError("Please choose an account to pay from");
      return;
    }

    if (type === "INCOME" && !toAssetId) {
      setError("Please choose an account to deposit to");
      return;
    }

    if (type === "TRANSFER") {
      if (!fromAssetId || !toAssetId) {
        setError("Please select both source and destination accounts");
        return;
      }
      if (fromAssetId === toAssetId) {
        setError("Source and destination accounts must be different");
        return;
      }
    }

    setError(null);

    requireSecurityAuth({
      ruleKey: "createTransaction",
      title: "Authorize Transaction",
      description: "Verify your identity to log this transaction.",
      onSuccess: async () => {
        try {
          setIsSubmitting(true);
          await createTransaction({
            amount: parsedAmount,
            type: type as TransactionType,
            fromAssetId: type === "INCOME" ? null : fromAssetId,
            toAssetId: type === "EXPENSE" ? null : toAssetId,
            categoryId: type === "TRANSFER" ? null : categoryId,
            contactId: contactId || null,
            date: date || new Date().toISOString().split("T")[0],
            note: note.trim() || null,
          });
          handleClose();
        } catch (err) {
          console.error("Create transaction failed:", err);
          setError("Failed to create transaction.");
        } finally {
          setIsSubmitting(false);
        }
      },
    });
  }

  const activeCategories = type === "INCOME" ? incomeCategories : expenseCategories;

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
                Log Transaction
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
              <View className="flex-row gap-2 mb-5">
                {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => {
                  const isActive = type === t;
                  let activeClass = "bg-brand-accent text-dark-bg";
                  if (t === "EXPENSE")
                    activeClass = "bg-brand-expense/15 border-brand-expense text-brand-expense";
                  if (t === "INCOME")
                    activeClass = "bg-brand-income/15 border-brand-income text-brand-income";
                  if (t === "TRANSFER")
                    activeClass = "bg-brand-transfer/15 border-brand-transfer text-brand-transfer";

                  return (
                    <TouchableOpacity
                      key={t}
                      onPress={() => handleTypeChange(t)}
                      className={`flex-1 py-3 rounded-2xl items-center border ${
                        isActive ? activeClass : "bg-dark-card border-dark-border"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          isActive
                            ? t === "EXPENSE"
                              ? "text-brand-expense"
                              : t === "INCOME"
                              ? "text-brand-income"
                              : "text-brand-transfer"
                            : "text-dark-muted"
                        }`}
                      >
                        {t === "EXPENSE"
                          ? "Expense"
                          : t === "INCOME"
                          ? "Income"
                          : "Transfer"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {error ? (
                <View className="bg-rose-500/15 border border-rose-500/30 rounded-xl p-3 mb-4">
                  <Text className="text-rose-400 text-xs font-semibold text-center">
                    {error}
                  </Text>
                </View>
              ) : null}

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

              {/* Account selection */}
              {type !== "INCOME" && (
                <View className="mb-4">
                  <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                    {type === "TRANSFER" ? "From Account" : "Pay From Account"}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row gap-2"
                  >
                    {accounts.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        onPress={() => setFromAssetId(a.id)}
                        className={`px-3.5 py-2 rounded-2xl border ${
                          fromAssetId === a.id
                            ? "bg-brand-accent/20 border-brand-accent"
                            : "bg-dark-card border-dark-border"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            fromAssetId === a.id
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

              {type !== "EXPENSE" && (
                <View className="mb-4">
                  <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                    {type === "TRANSFER" ? "To Account" : "Deposit To Account"}
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row gap-2"
                  >
                    {accounts.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        onPress={() => setToAssetId(a.id)}
                        className={`px-3.5 py-2 rounded-2xl border ${
                          toAssetId === a.id
                            ? "bg-brand-accent/20 border-brand-accent"
                            : "bg-dark-card border-dark-border"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            toAssetId === a.id
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

              {/* Category (for Expense and Income) */}
              {type !== "TRANSFER" && activeCategories.length > 0 && (
                <View className="mb-4">
                  <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                    Category
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row gap-2"
                  >
                    {activeCategories.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        onPress={() => setCategoryId(c.id)}
                        className={`px-3.5 py-2 rounded-2xl border ${
                          categoryId === c.id
                            ? "bg-brand-accent/20 border-brand-accent"
                            : "bg-dark-card border-dark-border"
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            categoryId === c.id
                              ? "text-brand-accent"
                              : "text-dark-text"
                          }`}
                        >
                          {c.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* Linked Contact (optional) */}
              {contacts.length > 0 && (
                <View className="mb-4">
                  <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                    Contact / Payee (Optional)
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    className="flex-row gap-2"
                  >
                    <TouchableOpacity
                      onPress={() => setContactId(null)}
                      className={`px-3.5 py-2 rounded-2xl border ${
                        contactId === null
                          ? "bg-dark-surface border-brand-accent"
                          : "bg-dark-card border-dark-border"
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          contactId === null
                            ? "text-brand-accent"
                            : "text-dark-muted"
                        }`}
                      >
                        None
                      </Text>
                    </TouchableOpacity>

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
                </View>
              )}

              {/* Date */}
              <View className="mb-4">
                <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2">
                  Date
                </Text>
                <TextInput
                  value={date}
                  onChangeText={setDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3 text-dark-text text-base"
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
                  placeholder="e.g. Dinner with team, Monthly salary"
                  placeholderTextColor="#64748B"
                  className="bg-dark-card border border-dark-border rounded-2xl px-4 py-3 text-dark-text text-base"
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
                    Save Transaction
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
