import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { useAccounts } from "../../context/accounts";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { useContacts } from "../../context/contacts";
import { useSecurityGuard } from "../../context/security";
import { TransactionItem, useTransactions } from "../../context/transactions";
import { LiquidAssetType, TransactionType } from "../../db/schema";
import { formatCurrency, getCurrencySymbol } from "../../services/currency";
import { Calendar, formatDisplayDate, getTodayYMD } from "../calendar";
import { CreateContact } from "../contacts/CreateContact";
import { HawkFlyUp } from "../HawkFlyUp";
import { SlideButton } from "../SlideButton";

export interface TransactionFormProps {
  mode: "create" | "edit";
  initialData?: TransactionItem | null;
  defaultType?: "EXPENSE" | "INCOME" | "TRANSFER";
}

// Time helper utilities
function getCurrentTimeInfo() {
  const now = new Date();
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const period: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return {
    hour12,
    minute: minutes,
    period,
  };
}

function formatTime(hour12: number, minute: number, period: "AM" | "PM") {
  const h = String(hour12).padStart(2, "0");
  const m = String(minute).padStart(2, "0");
  return `${h}:${m} ${period}`;
}

export function TransactionForm({
  mode,
  initialData,
  defaultType = "EXPENSE",
}: TransactionFormProps) {
  const router = useRouter();
  const {
    transactions,
    createTransaction,
    updateTransaction,
    deleteTransaction,
    incomeCategories,
    expenseCategories,
  } = useTransactions();
  const { accounts } = useAccounts();
  const { contacts } = useContacts();
  const { requireSecurityAuth } = useSecurityGuard();
  const { settings } = useAuth();
  const { showConfirm, showAlert } = useAlert();

  // Check if current transaction is the very latest entry (only the latest can be deleted)
  const isLatestTransaction = useMemo(() => {
    if (!initialData || transactions.length === 0) return false;
    return transactions[0]?.id === initialData.id;
  }, [transactions, initialData]);

  // Core Form State
  const [type, setType] = useState<"EXPENSE" | "INCOME" | "TRANSFER">(
    initialData
      ? (initialData.type as "EXPENSE" | "INCOME" | "TRANSFER")
      : defaultType,
  );
  const [amount, setAmount] = useState(
    initialData ? String(initialData.amount) : "",
  );
  const [fromAssetId, setFromAssetId] = useState<number | null>(
    initialData?.fromAssetId ?? null,
  );
  const [toAssetId, setToAssetId] = useState<number | null>(
    initialData?.toAssetId ?? null,
  );
  const [categoryId, setCategoryId] = useState<number | null>(
    initialData?.categoryId ?? null,
  );
  const [contactId, setContactId] = useState<number | null>(
    initialData?.contactId ?? null,
  );
  const [date, setDate] = useState<string>(initialData?.date || getTodayYMD());
  const [time, setTime] = useState<string>(() => {
    const t = getCurrentTimeInfo();
    return formatTime(t.hour12, t.minute, t.period);
  });
  const [note, setNote] = useState(initialData?.note || "");

  // Validation / Loading States
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sub-modal Fly-up States
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [accountTarget, setAccountTarget] = useState<"from" | "to">("from");
  const [accountTypeTab, setAccountTypeTab] = useState<LiquidAssetType>("BANK");

  const [isCategorySheetOpen, setIsCategorySheetOpen] = useState(false);
  const [tempCategoryId, setTempCategoryId] = useState<number | null>(null);

  const [isContactSheetOpen, setIsContactSheetOpen] = useState(false);
  const [tempContactId, setTempContactId] = useState<number | null>(null);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);

  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);
  const [tempNote, setTempNote] = useState("");

  const [isDateTimeSheetOpen, setIsDateTimeSheetOpen] = useState(false);
  const [tempDate, setTempDate] = useState<string>(getTodayYMD());
  const [tempHour, setTempHour] = useState<number>(12);
  const [tempMinute, setTempMinute] = useState<number>(0);
  const [tempPeriod, setTempPeriod] = useState<"AM" | "PM">("AM");
  const [hourInput, setHourInput] = useState<string>("12");
  const [minuteInput, setMinuteInput] = useState<string>("00");
  const hourInputRef = useRef<TextInput>(null);
  const minuteInputRef = useRef<TextInput>(null);

  // Mode toggle: in edit mode, default to preview/summary view (isEditing = false)
  const [isEditing, setIsEditing] = useState(mode === "create");
  const currencySymbol = getCurrencySymbol(settings?.currency || "USD");

  // Populate data if initialData changes
  useEffect(() => {
    if (initialData && mode === "edit") {
      setType(initialData.type as "EXPENSE" | "INCOME" | "TRANSFER");
      setAmount(String(initialData.amount));
      setFromAssetId(initialData.fromAssetId ?? null);
      setToAssetId(initialData.toAssetId ?? null);
      setCategoryId(initialData.categoryId ?? null);
      setContactId(initialData.contactId ?? null);
      setDate(initialData.date || getTodayYMD());
      setNote(initialData.note || "");
      setIsEditing(false);
    }
  }, [initialData, mode]);

  const resetToInitial = () => {
    if (initialData) {
      setType(initialData.type as "EXPENSE" | "INCOME" | "TRANSFER");
      setAmount(String(initialData.amount));
      setFromAssetId(initialData.fromAssetId ?? null);
      setToAssetId(initialData.toAssetId ?? null);
      setCategoryId(initialData.categoryId ?? null);
      setContactId(initialData.contactId ?? null);
      setDate(initialData.date || getTodayYMD());
      setNote(initialData.note || "");
    }
    setError(null);
    setIsEditing(false);
  };

  // Derived Account Objects
  const fromAccount = useMemo(
    () => accounts.find((a) => a.id === fromAssetId),
    [accounts, fromAssetId],
  );
  const toAccount = useMemo(
    () => accounts.find((a) => a.id === toAssetId),
    [accounts, toAssetId],
  );

  // Derived Category and Contact Objects
  const selectedCategory = useMemo(
    () =>
      [...incomeCategories, ...expenseCategories].find(
        (c) => c.id === categoryId,
      ),
    [incomeCategories, expenseCategories, categoryId],
  );

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === contactId),
    [contacts, contactId],
  );

  const parsedAmount = parseFloat(amount) || 0;
  const isAmountEntered = parsedAmount > 0;

  // Handle Type Change
  const handleTypeChange = (newType: "EXPENSE" | "INCOME" | "TRANSFER") => {
    if (type === newType) return;
    setType(newType);
    setError(null);

    if (newType === "TRANSFER") {
      setCategoryId(null);
      setContactId(null);
    } else {
      setToAssetId(null);
    }
  };

  // Field Labels based on Type
  const sourceAssetName = useMemo(() => {
    if (type === "INCOME") return "Deposit To";
    if (type === "EXPENSE") return "Pay From";
    return "From Account";
  }, [type]);

  const destinationAssetName = "To Account";

  // Account Sheet Open Handler
  const openAccountSheet = (target: "from" | "to") => {
    if (!isAmountEntered) {
      return;
    }
    setAccountTarget(target);
    setIsAccountSheetOpen(true);
  };

  const handleSelectAccount = (accId: number) => {
    if (accountTarget === "from") {
      if (type === "INCOME") {
        setToAssetId(accId);
      } else {
        setFromAssetId(accId);
      }
    } else {
      setToAssetId(accId);
    }
    setIsAccountSheetOpen(false);
  };

  // Category Sheet Open Handler
  const openCategorySheet = () => {
    setTempCategoryId(categoryId);
    setIsCategorySheetOpen(true);
  };

  const handleConfirmCategory = () => {
    setCategoryId(tempCategoryId);
    setIsCategorySheetOpen(false);
  };

  // Contact Sheet Open Handler
  const openContactSheet = () => {
    setTempContactId(contactId);
    setIsContactSheetOpen(true);
  };

  const handleConfirmContact = () => {
    setContactId(tempContactId);
    setIsContactSheetOpen(false);
  };

  // Note Sheet Open Handler
  const openNoteSheet = () => {
    setTempNote(note);
    setIsNoteSheetOpen(true);
  };

  const handleConfirmNote = () => {
    setNote(tempNote);
    setIsNoteSheetOpen(false);
  };

  // Date & Time Sheet Open Handler
  const openDateTimeSheet = () => {
    setTempDate(date || getTodayYMD());
    let h = 12;
    let m = 0;
    let p: "AM" | "PM" = "AM";
    if (time && time.includes(":")) {
      const parts = time.split(" ");
      const hm = (parts[0] || "").split(":");
      const parsedH = parseInt(hm[0], 10);
      const parsedM = parseInt(hm[1], 10);
      if (!isNaN(parsedH)) h = parsedH;
      if (!isNaN(parsedM)) m = parsedM;
      if (parts[1] === "PM") p = "PM";
    } else {
      const info = getCurrentTimeInfo();
      h = info.hour12;
      m = info.minute;
      p = info.period;
    }
    setTempHour(h);
    setTempMinute(m);
    setTempPeriod(p);
    setHourInput(String(h).padStart(2, "0"));
    setMinuteInput(String(m).padStart(2, "0"));
    setIsDateTimeSheetOpen(true);
  };

  const handleHourChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    setHourInput(cleaned);
    if (cleaned.length === 2) {
      let num = parseInt(cleaned, 10);
      if (num > 12) num = 12;
      if (num < 1) num = 1;
      setTempHour(num);
      minuteInputRef.current?.focus();
    } else if (cleaned.length === 1) {
      const num = parseInt(cleaned, 10);
      if (num >= 2) {
        setHourInput(`0${num}`);
        setTempHour(num);
        minuteInputRef.current?.focus();
      } else {
        setTempHour(num);
      }
    }
  };

  const handleHourBlur = () => {
    let num = parseInt(hourInput, 10);
    if (isNaN(num) || num < 1) num = 12;
    if (num > 12) num = 12;
    setTempHour(num);
    setHourInput(String(num).padStart(2, "0"));
  };

  const handleMinuteChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    setMinuteInput(cleaned);
    if (cleaned.length === 2) {
      let num = parseInt(cleaned, 10);
      if (num > 59) num = 59;
      if (num < 0) num = 0;
      setTempMinute(num);
      Keyboard.dismiss();
    } else if (cleaned.length === 1) {
      const num = parseInt(cleaned, 10);
      if (num >= 6) {
        setMinuteInput(`0${num}`);
        setTempMinute(num);
        Keyboard.dismiss();
      } else {
        setTempMinute(num);
      }
    }
  };

  const handleMinuteBlur = () => {
    let num = parseInt(minuteInput, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    setTempMinute(num);
    setMinuteInput(String(num).padStart(2, "0"));
  };

  const handleConfirmDateTime = () => {
    Keyboard.dismiss();
    let h = parseInt(hourInput, 10);
    if (isNaN(h) || h < 1) h = tempHour || 12;
    if (h > 12) h = 12;

    let m = parseInt(minuteInput, 10);
    if (isNaN(m) || m < 0) m = tempMinute || 0;
    if (m > 59) m = 59;

    setDate(tempDate);
    setTime(formatTime(h, m, tempPeriod));
    setIsDateTimeSheetOpen(false);
  };

  // Date display preview
  const datePreview = useMemo(() => {
    const today = getTodayYMD();
    const isToday = date === today;
    const dateText = isToday ? "Today" : formatDisplayDate(date);
    return `${dateText}, ${time}`;
  }, [date, time]);

  // Submit / Save Transaction
  const handleSave = () => {
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Please enter a valid amount.");
      setIsSubmitting(false);
      return;
    }

    if (type === "EXPENSE" && !fromAssetId) {
      setError("Please choose an account to pay from.");
      setIsSubmitting(false);
      return;
    }

    if (type === "INCOME" && !toAssetId) {
      setError("Please choose an account to deposit to.");
      setIsSubmitting(false);
      return;
    }

    if (type === "TRANSFER") {
      if (!fromAssetId || !toAssetId) {
        setError("Please select both source and destination accounts.");
        setIsSubmitting(false);
        return;
      }
      if (fromAssetId === toAssetId) {
        setError("Source and destination accounts must be different.");
        setIsSubmitting(false);
        return;
      }
    }

    if (type !== "TRANSFER" && !categoryId) {
      setError("Please select a category.");
      setIsSubmitting(false);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const authRule =
      mode === "edit" ? "createTransaction" : "createTransaction";
    const authTitle =
      mode === "edit" ? "Authorize Update" : "Authorize Transaction";

    requireSecurityAuth({
      ruleKey: authRule,
      title: authTitle,
      description: "Verify your identity to proceed.",
      onSuccess: async () => {
        try {
          if (mode === "create") {
            await createTransaction({
              amount: parsedAmount,
              type: type as TransactionType,
              fromAssetId: type === "INCOME" ? null : fromAssetId,
              toAssetId: type === "EXPENSE" ? null : toAssetId,
              categoryId: type === "TRANSFER" ? null : categoryId,
              contactId: contactId || null,
              date: date || getTodayYMD(),
              note: note.trim() || null,
            });
          } else if (mode === "edit" && initialData) {
            await updateTransaction(initialData.id, {
              amount: parsedAmount,
              type: type as TransactionType,
              fromAssetId: type === "INCOME" ? null : fromAssetId,
              toAssetId: type === "EXPENSE" ? null : toAssetId,
              categoryId: type === "TRANSFER" ? null : categoryId,
              contactId: contactId || null,
              date: date || getTodayYMD(),
              note: note.trim() || null,
            });
          }
          setIsSubmitting(false);
          router.back();
        } catch (err) {
          console.error("Save transaction failed:", err);
          setError("Failed to save transaction.");
          setIsSubmitting(false);
        }
      },
      onCancel: () => {
        setIsSubmitting(false);
      },
    });
  };

  // Delete Transaction Handler (Edit mode)
  const handleDelete = () => {
    if (!initialData) return;
    const currentTx = initialData;

    showConfirm({
      title: "Delete Transaction",
      message:
        "Are you sure you want to permanently delete this transaction record?",
      type: "danger",
      confirmText: "Delete",
      isDestructive: true,
      onConfirm: () => {
        requireSecurityAuth({
          ruleKey: "deleteTransaction",
          title: "Authorize Deletion",
          description: "Verify your identity to delete this transaction.",
          onSuccess: async () => {
            try {
              setIsDeleting(true);
              await deleteTransaction(currentTx.id);
              router.back();
            } catch (err) {
              console.error("Delete transaction error:", err);
              showAlert({
                title: "Error",
                message: "Could not delete transaction.",
                type: "danger",
              });
            } finally {
              setIsDeleting(false);
            }
          },
        });
      },
    });
  };

  // Available categories for current transaction type
  const availableCategories =
    type === "INCOME" ? incomeCategories : expenseCategories;

  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Header Bar */}
        <View className="px-5 py-3 flex-row items-center justify-between border-b border-dark-border/40">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-card"
          >
            <Ionicons name="chevron-back" size={20} color="#F8FAFC" />
          </TouchableOpacity>

          <Text className="text-dark-text text-lg font-bold">
            {mode === "create"
              ? "Add New Transaction"
              : isEditing
                ? "Edit Transaction"
                : "Transaction Details"}
          </Text>

          {mode === "edit" ? (
            isEditing ? (
              <TouchableOpacity
                onPress={resetToInitial}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-card"
              >
                <Ionicons name="close" size={20} color="#F8FAFC" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-card"
              >
                <Ionicons name="pencil" size={17} color="#F8FAFC" />
              </TouchableOpacity>
            )
          ) : (
            <View className="w-10" />
          )}
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
              <Text className="text-rose-400 text-xs font-semibold flex-1">
                {error}
              </Text>
            </View>
          ) : null}

          {/* 1. Hero Amount Display / Input */}
          {mode === "create" ? (
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
          ) : (
            <View className="mb-6 w-full pt-3 pb-1 items-center justify-center">
              <View className="flex-row items-baseline justify-center w-full px-2">
                <Text
                  className={`font-black text-5xl tracking-tight ${
                    type === "EXPENSE"
                      ? "text-rose-400"
                      : type === "INCOME"
                        ? "text-emerald-400"
                        : "text-brand-accent"
                  }`}
                >
                  {type === "EXPENSE" ? "-" : type === "INCOME" ? "+" : ""}
                  {currencySymbol}{" "}
                  {parsedAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </Text>
              </View>
              {isEditing ? (
                <View className="flex-row items-center gap-1.5 mt-2">
                  <Ionicons name="lock-closed" size={13} color="#60677C" />
                  <Text className="text-dark-muted text-xs font-medium">
                    Amount cannot be edited
                  </Text>
                </View>
              ) : (
                <View className="items-center justify-center mt-2.5 px-6">
                  <Text
                    className={`text-sm font-semibold ${
                      type === "EXPENSE"
                        ? "text-rose-400"
                        : type === "INCOME"
                          ? "text-emerald-400"
                          : "text-brand-accent"
                    }`}
                  >
                    {type === "EXPENSE"
                      ? "Expense"
                      : type === "INCOME"
                        ? "Income"
                        : "Transfer"}
                  </Text>
                  {note ? (
                    <Text className="text-dark-muted text-sm font-medium text-center mt-1.5 leading-relaxed">
                      {note}
                    </Text>
                  ) : null}
                </View>
              )}
            </View>
          )}

          {/* 2. Transaction Type Display / Selector */}
          {mode === "create" ? (
            <View className="bg-dark-surface p-1 rounded-2xl flex-row items-center border border-dark-border mb-6">
              {(["EXPENSE", "INCOME", "TRANSFER"] as const).map((t) => {
                const isActive = type === t;
                const label =
                  t === "EXPENSE"
                    ? "Expense"
                    : t === "INCOME"
                      ? "Income"
                      : "Transfer";

                return (
                  <TouchableOpacity
                    key={t}
                    onPress={() => handleTypeChange(t)}
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
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : isEditing ? (
            <View className="items-center mb-6">
              <Text
                className={`text-sm font-semibold ${
                  type === "EXPENSE"
                    ? "text-rose-400"
                    : type === "INCOME"
                      ? "text-emerald-400"
                      : "text-brand-accent"
                }`}
              >
                {type === "EXPENSE"
                  ? "Expense"
                  : type === "INCOME"
                    ? "Income"
                    : "Transfer"}
              </Text>
            </View>
          ) : null}

          {/* 3. Source Asset (Pay From / Deposit To / From Account) */}
          <FieldRow
            icon={
              type === "INCOME" ? "arrow-down-circle-outline" : "wallet-outline"
            }
            label={sourceAssetName}
            value={type === "INCOME" ? toAccount?.name : fromAccount?.name}
            placeholder={
              !isAmountEntered ? "Enter amount first" : "Select account"
            }
            disabled={mode === "edit" || !isAmountEntered}
            isReadOnly={!isEditing}
            isLocked={mode === "edit" && isEditing}
            onPress={() => openAccountSheet(type === "INCOME" ? "to" : "from")}
          />

          {/* 4. Destination Asset (Only for Transfer) */}
          {type === "TRANSFER" ? (
            <FieldRow
              icon="arrow-forward-circle-outline"
              label={destinationAssetName}
              value={toAccount?.name}
              placeholder={
                !isAmountEntered ? "Enter amount first" : "Select account"
              }
              disabled={mode === "edit" || !isAmountEntered}
              isReadOnly={!isEditing}
              isLocked={mode === "edit" && isEditing}
              onPress={() => openAccountSheet("to")}
            />
          ) : null}

          {/* 5. Category (Only for Expense & Income) */}
          {type !== "TRANSFER" ? (
            <FieldRow
              icon={(selectedCategory?.icon as any) || "grid-outline"}
              label="Category"
              value={selectedCategory?.name}
              placeholder="Select category"
              disabled={!isEditing}
              isReadOnly={!isEditing}
              onPress={openCategorySheet}
            />
          ) : null}

          {/* 6. Contacts (Hidden for Transfer) */}
          {type !== "TRANSFER" && (isEditing || selectedContact) ? (
            <FieldRow
              icon="person-outline"
              label="Contact"
              value={selectedContact?.name}
              placeholder="Optional"
              disabled={!isEditing}
              isReadOnly={!isEditing}
              onPress={openContactSheet}
            />
          ) : null}

          {/* 7. Note (Shown in edit form mode; in preview mode it is already right beneath the amount) */}
          {isEditing ? (
            <FieldRow
              icon="document-text-outline"
              label="Note"
              value={note || null}
              placeholder="Add note"
              onPress={openNoteSheet}
            />
          ) : null}

          {/* 8. Date & Time */}
          <FieldRow
            icon="calendar-outline"
            label="Date & Time"
            value={datePreview}
            disabled={!isEditing}
            isReadOnly={!isEditing}
            onPress={openDateTimeSheet}
          />

          {/* Bottom Spacing */}
          <View className="h-28" />
        </ScrollView>

        {/* Action Button at Bottom: Only render if create mode, edit mode, or if viewing the latest transaction */}
        {mode === "create" || isEditing || isLatestTransaction ? (
          <View className="px-5 pb-5 pt-3 bg-dark-bg/95 border-t border-dark-border/40">
            {mode === "create" ? (
              <SlideButton
                title="Slide to create"
                onConfirm={handleSave}
                isLoading={isSubmitting}
              />
            ) : isEditing ? (
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSubmitting}
                activeOpacity={0.8}
                className="bg-brand-accent py-4 rounded-2xl items-center justify-center active:opacity-90"
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#0B0D12" />
                ) : (
                  <Text className="text-dark-bg font-extrabold text-base">
                    Save Changes
                  </Text>
                )}
              </TouchableOpacity>
            ) : isLatestTransaction ? (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={isDeleting}
                activeOpacity={0.8}
                className="bg-rose-500/10 border border-rose-500/25 py-4 rounded-2xl items-center justify-center flex-row gap-2 active:bg-rose-500/20"
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#F43F5E" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#F43F5E" />
                    <Text className="text-rose-400 font-bold text-base">
                      Delete Transaction
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </KeyboardAvoidingView>

      {/* --- FLY-UP 1: Account Selection --- */}
      <HawkFlyUp
        visible={isAccountSheetOpen}
        onClose={() => setIsAccountSheetOpen(false)}
        title={
          accountTarget === "from"
            ? type === "INCOME"
              ? "Select Deposit Account"
              : "Select Payment Account"
            : "Select Destination Account"
        }
        subtitle={`Required: ${currencySymbol}${parsedAmount.toFixed(2)}`}
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
                  className={`text-sm ${
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

        {accounts.filter((a) => a.assetType === accountTypeTab).length === 0 ? (
          <View className="py-8 items-center justify-center">
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
            <Text className="text-dark-text font-bold text-sm mb-1">
              {accountTypeTab === "BANK"
                ? "No Bank Accounts"
                : "No Cash Wallets"}
            </Text>
            <Text className="text-dark-muted text-xs text-center mb-5 max-w-[220px]">
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
              className="bg-brand-accent px-5 py-3 rounded-full flex-row items-center gap-2 active:opacity-90"
            >
              <Ionicons name="add" size={18} color="#0B0D12" />
              <Text className="text-brand-accentDark font-bold text-sm">
                {accountTypeTab === "BANK"
                  ? "Create Bank Account"
                  : "Create Cash Wallet"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            className="max-h-[300px]"
            showsVerticalScrollIndicator={false}
          >
            {accounts
              .filter((a) => a.assetType === accountTypeTab)
              .map((acc) => {
                const isSelected =
                  accountTarget === "from"
                    ? fromAssetId === acc.id
                    : toAssetId === acc.id;

                const isAlreadySource =
                  accountTarget === "to" && acc.id === fromAssetId;

                const isInsufficient =
                  accountTarget === "from" &&
                  type !== "INCOME" &&
                  (acc.currentBalance ?? 0) < parsedAmount;

                const isDisabled = isAlreadySource || isInsufficient;

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
                          className={`text-sm font-bold ${
                            isSelected ? "text-brand-accent" : "text-dark-text"
                          }`}
                        >
                          {acc.name}
                        </Text>
                        {acc.accountNumber ? (
                          <Text className="text-dark-muted text-[11px]">
                            {acc.accountNumber}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View className="items-end">
                      <Text
                        className={`text-sm font-bold ${
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
                        <Text className="text-rose-400 text-[10px]">
                          Low balance
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        )}
      </HawkFlyUp>

      {/* --- FLY-UP 2: Category Grid --- */}
      <HawkFlyUp
        visible={isCategorySheetOpen}
        onClose={() => setIsCategorySheetOpen(false)}
        title={type === "INCOME" ? "Income Categories" : "Expense Categories"}
      >
        <ScrollView
          className="max-h-[380px]"
          showsVerticalScrollIndicator={false}
        >
          <View className="flex-row flex-wrap justify-between gap-y-3.5 px-1 py-2">
            {availableCategories.map((c) => {
              const isSelected = tempCategoryId === c.id;
              const iconColor = isSelected ? "#D4F938" : "#F8FAFC";

              return (
                <TouchableOpacity
                  key={c.id}
                  onPress={() => setTempCategoryId(c.id)}
                  activeOpacity={0.7}
                  className={`w-[30%] items-center p-2.5 rounded-2xl border ${
                    isSelected
                      ? "bg-brand-accent/15 border-brand-accent"
                      : "bg-dark-card/40 border-dark-border"
                  }`}
                >
                  <View
                    style={{
                      backgroundColor: isSelected
                        ? "rgba(212, 249, 56, 0.2)"
                        : "#1E293B",
                    }}
                    className="w-12 h-12 rounded-2xl items-center justify-center mb-1.5"
                  >
                    <Ionicons
                      name={(c.icon as any) || "grid-outline"}
                      size={22}
                      color={iconColor}
                    />
                  </View>
                  <Text
                    numberOfLines={1}
                    className={`text-xs text-center ${
                      isSelected
                        ? "text-brand-accent font-bold"
                        : "text-dark-text font-medium"
                    }`}
                  >
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <View className="flex-row items-center gap-3 mt-4">
          <TouchableOpacity
            onPress={() => {
              setIsCategorySheetOpen(false);
              router.push("/(categories)/create-category");
            }}
            activeOpacity={0.8}
            className="flex-1 bg-dark-card border border-dark-border py-3.5 rounded-2xl items-center justify-center flex-row gap-1.5"
          >
            <Ionicons name="add-circle-outline" size={18} color="#D4F938" />
            <Text className="text-brand-accent font-bold text-sm">
              New Category
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleConfirmCategory}
            activeOpacity={0.8}
            className="flex-1 bg-brand-accent py-3.5 rounded-2xl items-center justify-center"
          >
            <Text className="text-dark-bg font-bold text-base">Select</Text>
          </TouchableOpacity>
        </View>
      </HawkFlyUp>

      {/* --- FLY-UP 3: Contacts List --- */}
      <HawkFlyUp
        visible={isContactSheetOpen}
        onClose={() => setIsContactSheetOpen(false)}
        title="Select Contact"
      >
        {contacts.length === 0 ? (
          <View className="py-8 items-center justify-center">
            <View className="w-12 h-12 rounded-full bg-dark-surface border border-dark-border items-center justify-center mb-3">
              <Ionicons name="people-outline" size={22} color="#60677C" />
            </View>
            <Text className="text-dark-text font-bold text-sm mb-1">
              No Contacts Yet
            </Text>
            <Text className="text-dark-muted text-xs text-center mb-5 max-w-[220px]">
              Add a contact to link transactions to people or companies.
            </Text>
            <TouchableOpacity
              onPress={() => setIsCreateContactOpen(true)}
              activeOpacity={0.8}
              className="bg-brand-accent px-5 py-3 rounded-full flex-row items-center gap-2 active:opacity-90"
            >
              <Ionicons name="person-add" size={18} color="#0B0D12" />
              <Text className="text-brand-accentDark font-bold text-sm">
                New Contact
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <ScrollView
              className="max-h-[350px]"
              showsVerticalScrollIndicator={false}
            >
              <View className="flex-row flex-wrap gap-4 py-2 justify-center">
                {contacts.map((c) => {
                  const isSelected = tempContactId === c.id;
                  const initial = c.name ? c.name[0].toUpperCase() : "?";

                  return (
                    <View key={c.id} className="items-center w-[22%]">
                      <TouchableOpacity
                        onPress={() =>
                          setTempContactId(isSelected ? null : c.id)
                        }
                        activeOpacity={0.7}
                        className={`w-14 h-14 rounded-full items-center justify-center border-2 ${
                          isSelected
                            ? "border-brand-accent bg-brand-accent/20"
                            : "border-dark-border bg-dark-card"
                        }`}
                      >
                        <Text
                          className={`text-lg font-bold ${
                            isSelected ? "text-brand-accent" : "text-dark-text"
                          }`}
                        >
                          {initial}
                        </Text>
                      </TouchableOpacity>
                      <Text
                        className={`text-xs text-center mt-1 ${
                          isSelected
                            ? "text-brand-accent font-bold"
                            : "text-dark-textSecondary"
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

            <View className="flex-row items-center gap-3 mt-4">
              <TouchableOpacity
                onPress={() => setIsCreateContactOpen(true)}
                activeOpacity={0.8}
                className="flex-1 bg-dark-card border border-dark-border py-3.5 rounded-2xl items-center justify-center flex-row gap-1.5"
              >
                <Ionicons name="person-add-outline" size={18} color="#D4F938" />
                <Text className="text-brand-accent font-bold text-sm">
                  New Contact
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleConfirmContact}
                activeOpacity={0.8}
                className="flex-1 bg-brand-accent py-3.5 rounded-2xl items-center justify-center"
              >
                <Text className="text-dark-bg font-bold text-base">Select</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </HawkFlyUp>

      {/* --- FLY-UP 4: Note Editor --- */}
      <HawkFlyUp
        visible={isNoteSheetOpen}
        onClose={() => setIsNoteSheetOpen(false)}
        title="Add Note"
      >
        <View className="bg-dark-card border border-dark-border rounded-2xl p-4 mb-2">
          <TextInput
            value={tempNote}
            onChangeText={setTempNote}
            placeholder="Enter your note here..."
            placeholderTextColor="#60677C"
            multiline={true}
            numberOfLines={4}
            maxLength={250}
            autoFocus={true}
            className="text-dark-text text-base min-h-[120px] text-top"
            textAlignVertical="top"
          />
          <View className="items-end mt-2">
            <Text className="text-dark-muted text-xs font-medium">
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

      {/* --- FLY-UP 5: Date & Digital Time Entry --- */}
      <HawkFlyUp
        visible={isDateTimeSheetOpen}
        onClose={() => {
          Keyboard.dismiss();
          setIsDateTimeSheetOpen(false);
        }}
        title="Select Date & Time"
      >
        <Calendar
          value={tempDate}
          onChange={setTempDate}
          maxDate={getTodayYMD()}
          className="mb-3"
        />

        {/* Digital Time Picker Box */}
        <View className="bg-dark-card border border-dark-border rounded-2xl p-3.5 mb-3">
          <View className="flex-row items-center justify-between mb-2">
            <TouchableOpacity
              onPress={() => {
                const now = getCurrentTimeInfo();
                setTempHour(now.hour12);
                setTempMinute(now.minute);
                setTempPeriod(now.period);
                setHourInput(String(now.hour12).padStart(2, "0"));
                setMinuteInput(String(now.minute).padStart(2, "0"));
              }}
              className="bg-dark-surface border border-dark-border rounded-xl px-2.5 py-1 active:bg-dark-cardHover"
            >
              <Text className="text-brand-accent text-xs font-semibold">
                Set to Now
              </Text>
            </TouchableOpacity>
          </View>

          {/* Digital Input Row */}
          <View className="flex-row items-center justify-center gap-3 py-1">
            <View className="items-center">
              <TextInput
                ref={hourInputRef}
                value={hourInput}
                onChangeText={handleHourChange}
                onBlur={handleHourBlur}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
                returnKeyType="next"
                onSubmitEditing={() => minuteInputRef.current?.focus()}
                className="w-16 h-14 bg-dark-surface border border-dark-border rounded-xl text-center text-dark-text font-bold text-2xl font-mono"
              />
              <Text className="text-dark-muted text-[10px] mt-1 font-semibold uppercase">
                Hour
              </Text>
            </View>

            <Text className="text-dark-text font-bold text-2xl pb-4">:</Text>

            <View className="items-center">
              <TextInput
                ref={minuteInputRef}
                value={minuteInput}
                onChangeText={handleMinuteChange}
                onBlur={handleMinuteBlur}
                keyboardType="number-pad"
                maxLength={2}
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={() => Keyboard.dismiss()}
                className="w-16 h-14 bg-dark-surface border border-dark-border rounded-xl text-center text-dark-text font-bold text-2xl font-mono"
              />
              <Text className="text-dark-muted text-[10px] mt-1 font-semibold uppercase">
                Minute
              </Text>
            </View>

            {/* AM / PM Segmented Buttons */}
            <View className="ml-2 flex-row bg-dark-surface border border-dark-border rounded-xl p-1">
              <TouchableOpacity
                onPress={() => setTempPeriod("AM")}
                activeOpacity={0.8}
                className={`px-3.5 py-2.5 rounded-lg ${
                  tempPeriod === "AM" ? "bg-brand-accent" : "bg-transparent"
                }`}
              >
                <Text
                  className={`font-bold text-sm ${
                    tempPeriod === "AM" ? "text-dark-bg" : "text-dark-muted"
                  }`}
                >
                  AM
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setTempPeriod("PM")}
                activeOpacity={0.8}
                className={`px-3.5 py-2.5 rounded-lg ${
                  tempPeriod === "PM" ? "bg-brand-accent" : "bg-transparent"
                }`}
              >
                <Text
                  className={`font-bold text-sm ${
                    tempPeriod === "PM" ? "text-dark-bg" : "text-dark-muted"
                  }`}
                >
                  PM
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleConfirmDateTime}
          activeOpacity={0.8}
          className="bg-brand-accent py-3.5 rounded-2xl items-center justify-center"
        >
          <Text className="text-dark-bg font-bold text-base">Done</Text>
        </TouchableOpacity>
      </HawkFlyUp>

      {/* Create Contact Modal */}
      <CreateContact
        visible={isCreateContactOpen}
        onClose={() => setIsCreateContactOpen(false)}
        onCreated={(newContactId) => {
          setTempContactId(newContactId);
          setContactId(newContactId);
          setIsCreateContactOpen(false);
        }}
      />
    </SafeAreaView>
  );
}

interface FieldRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  placeholder?: string;
  disabled?: boolean;
  isReadOnly?: boolean;
  isLocked?: boolean;
  onPress: () => void;
}

function FieldRow({
  icon,
  label,
  value,
  placeholder = "Select",
  disabled = false,
  isReadOnly = false,
  isLocked = false,
  onPress,
}: FieldRowProps) {
  const isActionDisabled = disabled || isReadOnly || isLocked;

  const displayValue = useMemo(() => {
    if (!value) return placeholder;
    if (value.length > 22) {
      return `${value.slice(0, 20)}...`;
    }
    return value;
  }, [value, placeholder]);

  return (
    <TouchableOpacity
      disabled={isActionDisabled}
      onPress={onPress}
      activeOpacity={0.7}
      className={`bg-dark-card/60 border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center justify-between mb-3 ${
        isReadOnly || isLocked ? "" : "active:bg-dark-card"
      }`}
    >
      <View className="flex-row items-center flex-1 mr-3">
        <View className="w-11 h-11 rounded-full bg-dark-surface border border-dark-border items-center justify-center mr-3">
          <Ionicons name={icon} size={20} color="#F8FAFC" />
        </View>
        <Text className="text-dark-text text-sm font-semibold">{label}</Text>
      </View>

      <View className="flex-row items-center gap-1.5 flex-shrink">
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className={`text-sm max-w-[170px] ${
            isReadOnly || isLocked
              ? "text-dark-text font-medium"
              : disabled
                ? "text-dark-muted opacity-40 font-normal"
                : value
                  ? "text-dark-textSecondary font-medium"
                  : "text-dark-muted font-normal"
          }`}
        >
          {displayValue}
        </Text>
        {isLocked ? (
          <Ionicons name="lock-closed" size={16} color="#60677C" />
        ) : !isReadOnly ? (
          <Ionicons
            name="chevron-forward"
            size={16}
            color={disabled ? "#334155" : "#60677C"}
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default TransactionForm;
