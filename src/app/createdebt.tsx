import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Calendar } from "../components/calendar";
import { ContactAvatar } from "../components/ContactAvatar";
import { HawkFlyUp } from "../components/HawkFlyUp";
import { SearchBar } from "../components/SearchBar";
import { SlideButton } from "../components/SlideButton";
import { useAccounts } from "../context/accounts";
import { useAlert } from "../context/alert";
import { useAuth } from "../context/auth";
import { useContacts } from "../context/contacts";
import { useDebts } from "../context/debts";
import { DebtType } from "../db/schema";
import { formatCurrency, getCurrencySymbol } from "../services/currency";

export default function CreateDebtScreen() {
  const router = useRouter();
  const { createDebt } = useDebts();
  const { contacts } = useContacts();
  const { accounts } = useAccounts();
  const { settings } = useAuth();
  const { showAlert } = useAlert();

  // Core Form State
  const [type, setType] = useState<DebtType>("LEND");
  const [amount, setAmount] = useState("");
  const [contactId, setContactId] = useState<number | null>(null);
  const [assetId, setAssetId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState<string>("");
  const [note, setNote] = useState("");

  // Sub-modal fly-up states
  const [isContactSheetOpen, setIsContactSheetOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);

  // Temporary fly-up state for confirmation
  const [tempContactId, setTempContactId] = useState<number | null>(null);
  const [accountTypeTab, setAccountTypeTab] = useState<"BANK" | "CASH">("BANK");
  const [tempDueDate, setTempDueDate] = useState<string>("");
  const [tempNote, setTempNote] = useState("");
  const [contactSearch, setContactSearch] = useState("");

  // Validation & Submission
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currencySymbol = getCurrencySymbol(settings?.currency || "USD");
  const parsedAmount = parseFloat(amount);
  const isAmountEntered = !isNaN(parsedAmount) && parsedAmount > 0;

  const selectedContact = contacts.find((c) => c.id === contactId);
  const selectedAccount = accounts.find((a) => a.id === assetId);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    return contacts.filter((c) =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()),
    );
  }, [contacts, contactSearch]);

  // Handlers for fly-up confirms
  function openContactSheet() {
    setTempContactId(contactId);
    setContactSearch("");
    setIsContactSheetOpen(true);
  }

  function handleConfirmContact() {
    setContactId(tempContactId);
    if (error) setError(null);
    setIsContactSheetOpen(false);
  }

  function openAccountSheet() {
    if (selectedAccount?.assetType) {
      setAccountTypeTab(selectedAccount.assetType as "BANK" | "CASH");
    }
    setIsAccountSheetOpen(true);
  }

  function handleSelectAccount(id: number | null) {
    setAssetId(id);
    setIsAccountSheetOpen(false);
  }

  function openDateSheet() {
    setTempDueDate(dueDate || new Date().toISOString().slice(0, 10));
    setIsDateSheetOpen(true);
  }

  function handleConfirmDate() {
    setDueDate(tempDueDate);
    setIsDateSheetOpen(false);
  }

  function openNoteSheet() {
    setTempNote(note);
    setIsNoteSheetOpen(true);
  }

  function handleConfirmNote() {
    setNote(tempNote);
    setIsNoteSheetOpen(false);
  }

  async function handleCreate() {
    if (!contactId) {
      setError("Please select a contact");
      showAlert({
        title: "Contact Required",
        message: "Please select a contact for this debt.",
        type: "danger",
      });
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Please enter a valid positive amount");
      showAlert({
        title: "Invalid Amount",
        message: "Please enter a valid positive amount.",
        type: "danger",
      });
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

      router.back();
    } catch (err: any) {
      console.error("Create debt error:", err);
      setError(err?.message || "Failed to create debt record.");
      showAlert({
        title: "Error",
        message: err?.message || "Failed to create debt record.",
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Header Bar matching TransactionForm */}
        <View className="px-5 py-3 flex-row items-center justify-between border-b border-dark-border/40">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-card"
          >
            <Ionicons name="chevron-back" size={20} color="#F8FAFC" />
          </TouchableOpacity>

          <Text className="text-dark-text text-lg font-bold">Record Debt</Text>

          <View className="w-10" />
        </View>

        <ScrollView
          className="flex-1 px-5 pt-5"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error Banner */}
          {error ? (
            <View className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-2xl mb-4 flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={18} color="#F43F5E" />
              <Text className="text-rose-400 font-semibold text-xs flex-1">
                {error}
              </Text>
            </View>
          ) : null}

          {/* 1. Hero Amount Display / Input matching TransactionForm */}
          <View className="mb-7 w-full border-b-2 border-brand-accent pb-4 pt-3 items-center justify-center">
            <View className="flex-row items-baseline justify-center w-full px-2 overflow-hidden">
              <Text className="text-brand-accent font-bold text-3xl mr-2 self-center">
                {currencySymbol}
              </Text>
              <TextInput
                value={amount}
                onChangeText={(val) => {
                  setAmount(val);
                  if (error) setError(null);
                }}
                placeholder="0.00"
                placeholderTextColor="#60677C"
                keyboardType="decimal-pad"
                autoFocus={true}
                textAlign="center"
                multiline={false}
                numberOfLines={1}
                scrollEnabled={true}
                className="font-black text-dark-text text-5xl py-1 max-w-[78%]"
              />
            </View>
          </View>

          {/* 2. Type Selector matching TransactionForm (No icons, no accents) */}
          <View className="bg-dark-surface p-1 rounded-2xl flex-row items-center border border-dark-border mb-6">
            {(
              [
                { key: "LEND", label: "I Lent" },
                { key: "BORROW", label: "I Borrowed" },
              ] as const
            ).map((t) => {
              const isActive = type === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  onPress={() => setType(t.key)}
                  activeOpacity={0.8}
                  className={`flex-1 py-2.5 rounded-2xl items-center justify-center ${
                    isActive
                      ? "bg-dark-card border border-dark-border/80"
                      : "bg-transparent"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      isActive
                        ? "text-dark-text font-bold"
                        : "text-dark-muted font-medium"
                    }`}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* 3. Field Rows matching TransactionForm FieldRow style */}
          {/* Contact Field */}
          <FieldCard
            icon="person-outline"
            label="Contact"
            value={selectedContact?.name}
            placeholder="Select contact"
            onPress={openContactSheet}
          />

          {/* Account Field (Optional) */}
          <FieldCard
            icon="wallet-outline"
            label={type === "LEND" ? "Paid From" : "Deposit To"}
            value={selectedAccount?.name}
            placeholder="Optional"
            onPress={openAccountSheet}
          />

          {/* Due Date Field (Date only, no time!) */}
          <FieldCard
            icon="calendar-outline"
            label="Due Date"
            value={dueDate || undefined}
            placeholder="No due date (Optional)"
            onPress={openDateSheet}
          />

          {/* Note Field */}
          <FieldCard
            icon="document-text-outline"
            label="Note"
            value={note || undefined}
            placeholder="Add note (Optional)"
            onPress={openNoteSheet}
          />
        </ScrollView>

        {/* 4. Bottom Slide Button matching TransactionForm */}
        <View className="px-5 pb-5 pt-3 bg-dark-bg/95 border-t border-dark-border/40">
          <SlideButton
            title="Slide to create"
            onConfirm={handleCreate}
            isLoading={isSubmitting}
          />
        </View>
      </KeyboardAvoidingView>

      {/* --- FLY-UP 1: Contacts Selection --- */}
      <HawkFlyUp
        visible={isContactSheetOpen}
        onClose={() => setIsContactSheetOpen(false)}
        title="Select Contact"
      >
        <View className="flex-row items-center gap-2.5 mb-4">
          <SearchBar
            value={contactSearch}
            onChangeText={setContactSearch}
            placeholder="Search contacts..."
            className="flex-1"
          />
          <TouchableOpacity
            onPress={() => {
              setIsContactSheetOpen(false);
              router.push("/createcontact" as any);
            }}
            className="h-12 w-12 rounded-xl bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-card"
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={20} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {filteredContacts.length === 0 ? (
          <View className="py-8 items-center justify-center">
            <View className="w-12 h-12 rounded-full bg-dark-surface border border-dark-border items-center justify-center mb-3">
              <Ionicons name="people-outline" size={22} color="#60677C" />
            </View>
            <Text className="text-dark-text font-bold text-sm mb-1 font-sans">
              {contacts.length === 0 ? "No Contacts Yet" : "No Contacts Found"}
            </Text>
            <Text className="text-dark-muted font-sans text-xs text-center mb-5 max-w-[220px]">
              {contacts.length === 0
                ? "Add a contact to link this debt record."
                : "No contacts match your search."}
            </Text>
            {contacts.length === 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setIsContactSheetOpen(false);
                  router.push("/createcontact" as any);
                }}
                activeOpacity={0.8}
                className="bg-brand-accent px-5 py-2.5 rounded-full"
              >
                <Text className="text-dark-bg font-bold text-sm font-sans">
                  New Contact
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : (
          <>
            <ScrollView
              className="max-h-[350px]"
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row flex-wrap gap-4 py-2 justify-center">
                {filteredContacts.map((c) => {
                  const isSelected = tempContactId === c.id;
                  return (
                    <View key={c.id} className="items-center w-[22%]">
                      <TouchableOpacity
                        onPress={() =>
                          setTempContactId(isSelected ? null : c.id)
                        }
                        activeOpacity={0.7}
                        className={`w-14 h-14 rounded-full items-center justify-center ${
                          isSelected ? "border-2 border-brand-accent p-0.5" : ""
                        }`}
                      >
                        <ContactAvatar
                          name={c.name}
                          avatarSvg={c.avatarSvg}
                          size={50}
                        />
                      </TouchableOpacity>
                      <Text
                        className={`text-xs text-center mt-1 font-sans ${
                          isSelected
                            ? "text-brand-accent font-bold"
                            : "text-dark-textSecondary font-medium"
                        }`}
                        numberOfLines={1}
                      >
                        {c.name}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <View className="mt-4">
              <TouchableOpacity
                onPress={handleConfirmContact}
                activeOpacity={0.8}
                className="w-full bg-brand-accent py-3.5 rounded-2xl items-center justify-center"
              >
                <Text className="text-dark-bg font-bold text-base font-sans">
                  Select
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </HawkFlyUp>

      {/* --- FLY-UP 2: Account Selection --- */}
      <HawkFlyUp
        visible={isAccountSheetOpen}
        onClose={() => setIsAccountSheetOpen(false)}
        title={
          type === "LEND" ? "Select Payment Account" : "Select Deposit Account"
        }
        subtitle={
          isAmountEntered
            ? `Required: ${currencySymbol}${parsedAmount.toFixed(2)}`
            : undefined
        }
      >
        {/* Account Type Selector (matches transaction creation type style) */}
        <View className="bg-dark-surface p-1 rounded-2xl flex-row items-center border border-dark-border mb-3.5">
          {(["BANK", "CASH"] as const).map((tab) => {
            const isActive = accountTypeTab === tab;
            const label = tab === "BANK" ? "Bank Accounts" : "Cash Wallets";
            const iconName = tab === "BANK" ? "business" : "wallet-outline";

            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setAccountTypeTab(tab)}
                activeOpacity={0.8}
                className={`flex-1 py-2.5 rounded-2xl flex-row items-center justify-center gap-2 ${
                  isActive
                    ? "bg-dark-card border border-dark-border/80"
                    : "bg-transparent"
                }`}
              >
                <Ionicons
                  name={iconName}
                  size={16}
                  color={isActive ? "#D4F938" : "#94A3B8"}
                />
                <Text
                  className={`text-sm font-sans ${
                    isActive
                      ? "text-dark-text font-bold"
                      : "text-dark-muted font-medium"
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView
          className="max-h-[300px]"
          showsVerticalScrollIndicator={false}
        >
          {accounts.filter((a) => a.assetType === accountTypeTab).length ===
          0 ? (
            <View className="py-6 items-center justify-center">
              <View className="w-12 h-12 rounded-full bg-dark-surface border border-dark-border items-center justify-center mb-3">
                <Ionicons
                  name={
                    accountTypeTab === "BANK"
                      ? "business-outline"
                      : "wallet-outline"
                  }
                  size={22}
                  color="#60677C"
                />
              </View>
              <Text className="text-dark-text font-bold text-sm mb-1 font-sans">
                {accountTypeTab === "BANK"
                  ? "No Bank Accounts"
                  : "No Cash Wallets"}
              </Text>
              <Text className="text-dark-muted font-sans text-xs text-center mb-4 max-w-[220px]">
                {accountTypeTab === "BANK"
                  ? "You don't have any bank accounts added yet."
                  : "You don't have any cash wallets added yet."}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsAccountSheetOpen(false);
                  router.push({
                    pathname: "/(account)/create",
                    params: { type: accountTypeTab },
                  } as any);
                }}
                activeOpacity={0.8}
                className="bg-brand-accent px-5 py-2.5 rounded-full flex-row items-center gap-2 active:opacity-90"
              >
                <Ionicons name="add" size={18} color="#0B0D12" />
                <Text className="text-brand-accentDark font-bold text-sm font-sans">
                  {accountTypeTab === "BANK"
                    ? "Create Bank Account"
                    : "Create Cash Wallet"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            accounts
              .filter((a) => a.assetType === accountTypeTab)
              .map((acc) => {
                const isSelected = assetId === acc.id;
                const isInsufficient =
                  type === "LEND" &&
                  isAmountEntered &&
                  (acc.currentBalance ?? 0) < parsedAmount;
                const isDisabled = isInsufficient;

                return (
                  <TouchableOpacity
                    key={acc.id}
                    disabled={isDisabled}
                    onPress={() => handleSelectAccount(acc.id)}
                    activeOpacity={0.7}
                    className={`flex-row items-center justify-between p-3.5 rounded-2xl mb-2 border ${
                      isSelected
                        ? "bg-brand-accent/10 border-brand-accent"
                        : "bg-dark-card/50 border-dark-border"
                    } ${isDisabled ? "opacity-35" : ""}`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="w-10 h-10 rounded-xl bg-dark-surface border border-dark-border items-center justify-center">
                        <Ionicons
                          name={
                            acc.assetType === "BANK" ? "business" : "wallet"
                          }
                          size={18}
                          color={isSelected ? "#D4F938" : "#94A3B8"}
                        />
                      </View>
                      <View>
                        <Text
                          className={`text-sm font-bold font-sans ${
                            isSelected ? "text-brand-accent" : "text-dark-text"
                          }`}
                        >
                          {acc.name}
                        </Text>
                        {acc.accountNumber ? (
                          <Text className="text-dark-muted font-sans text-[11px]">
                            {acc.accountNumber}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View className="items-end">
                      <Text
                        className={`text-sm font-bold font-sans ${
                          isDisabled && isInsufficient
                            ? "text-rose-400"
                            : "text-dark-text"
                        }`}
                      >
                        {formatCurrency(
                          acc.currentBalance ?? 0,
                          settings?.currency,
                          settings?.numberFormat,
                        )}
                      </Text>
                      {isDisabled && isInsufficient ? (
                        <Text className="text-rose-400 font-sans text-[10px]">
                          Low balance
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })
          )}
        </ScrollView>
      </HawkFlyUp>

      {/* --- FLY-UP 3: Due Date Calendar Selection (Date Only, No Time) --- */}
      <HawkFlyUp
        visible={isDateSheetOpen}
        onClose={() => setIsDateSheetOpen(false)}
        title="Select Due Date"
      >
        <View className="pb-4">
          <Calendar
            value={tempDueDate || new Date().toISOString().slice(0, 10)}
            onChange={(selected) => setTempDueDate(selected)}
            className="mb-4"
          />

          <TouchableOpacity
            onPress={handleConfirmDate}
            activeOpacity={0.8}
            className="w-full bg-brand-accent py-3.5 rounded-2xl items-center justify-center"
          >
            <Text className="text-dark-bg font-bold text-base font-sans">
              Confirm
            </Text>
          </TouchableOpacity>
        </View>
      </HawkFlyUp>

      {/* --- FLY-UP 4: Note Entry matching TransactionForm --- */}
      <HawkFlyUp
        visible={isNoteSheetOpen}
        onClose={() => {
          Keyboard.dismiss();
          setIsNoteSheetOpen(false);
        }}
        title="Add Note"
      >
        <View className="bg-dark-card border border-dark-border rounded-2xl p-3.5 mb-2">
          <TextInput
            value={tempNote}
            onChangeText={setTempNote}
            placeholder="Add details, reason, or terms..."
            placeholderTextColor="#60677C"
            multiline={true}
            numberOfLines={4}
            maxLength={250}
            autoFocus={true}
            className="text-dark-text font-sans text-base min-h-[120px]"
            textAlignVertical="top"
          />
          <View className="items-end mt-2">
            <Text className="text-dark-muted font-medium text-xs">
              {tempNote.length}/250
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => {
            Keyboard.dismiss();
            handleConfirmNote();
          }}
          activeOpacity={0.8}
          className="bg-brand-accent py-3.5 rounded-2xl items-center justify-center mt-3"
        >
          <Text className="text-dark-bg font-bold text-base">Save Note</Text>
        </TouchableOpacity>
      </HawkFlyUp>
    </SafeAreaView>
  );
}

/**
 * Reusable FieldCard component directly modeled after TransactionForm's FieldRow
 */
function FieldCard({
  icon,
  label,
  value,
  placeholder,
  onPress,
}: {
  icon: any;
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-dark-card/60 border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center justify-between mb-3 active:bg-dark-card"
    >
      <View className="flex-row items-center flex-1 mr-3">
        <View className="w-11 h-11 rounded-full bg-dark-surface border border-dark-border items-center justify-center mr-3">
          <Ionicons name={icon} size={20} color="#F8FAFC" />
        </View>
        <Text className="text-dark-text font-semibold text-sm">{label}</Text>
      </View>

      <View className="flex-row items-center gap-1.5 flex-shrink">
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className={`text-sm max-w-[170px] ${
            value
              ? "text-dark-textSecondary font-medium"
              : "text-dark-muted font-normal"
          }`}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-forward" size={16} color="#60677C" />
      </View>
    </TouchableOpacity>
  );
}
