import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
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
import {
  Calendar,
  formatDisplayDate,
  getTodayYMD,
  isFutureTime,
  localDateTimeToIso,
} from "../components/calendar";
import { ContactAvatar } from "../components/ContactAvatar";
import { CreateContact } from "../components/contacts/CreateContact";
import { Dropdown, DropdownOption } from "../components/Dropdown";
import { HawkAlertModal } from "../components/HawkAlertModal";
import { HawkFlyUp } from "../components/HawkFlyUp";
import { SearchBar } from "../components/SearchBar";
import { SlideButton } from "../components/SlideButton";
import { useAccounts } from "../context/accounts";
import { useAlert } from "../context/alert";
import { useAuth } from "../context/auth";
import { useContacts } from "../context/contacts";
import { useDebts } from "../context/debts";
import { useSecurityGuard } from "../context/security";
import { useTransactions } from "../context/transactions";
import { DebtType } from "../db/schema";
import { formatCurrency, getCurrencySymbol } from "../services/currency";

const DEBT_TYPE_OPTIONS: DropdownOption<DebtType>[] = [
  { value: "LEND", label: "Lent", icon: "arrow-up-circle-outline" },
  { value: "BORROW", label: "Borrowed", icon: "arrow-down-circle-outline" },
];

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

function parseIsoToTimeInfo(isoString?: string | null) {
  if (!isoString) return getCurrentTimeInfo();
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return getCurrentTimeInfo();
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const period: "AM" | "PM" = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return {
    hour12,
    minute: minutes,
    period,
  };
}

interface FieldRowProps {
  icon: any;
  label: string;
  value?: string | null;
  placeholder?: string;
  disabled?: boolean;
  isReadOnly?: boolean;
  isLocked?: boolean;
  onPress?: () => void;
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
    if (value.length > 24) {
      return `${value.slice(0, 22)}...`;
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
        <Text className="text-dark-text text-sm font-semibold font-sans">
          {label}
        </Text>
      </View>

      <View className="flex-row items-center gap-1.5 flex-shrink">
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          className={`text-sm font-sans max-w-[170px] ${
            disabled
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

interface SelectorFieldProps {
  label: string;
  value?: string | null;
  placeholder?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}

function SelectorField({
  label,
  value,
  placeholder = "Select",
  icon,
  onPress,
}: SelectorFieldProps) {
  return (
    <View>
      <Text className="text-dark-text text-sm font-semibold mb-2 font-sans">
        {label}
      </Text>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center justify-between active:bg-dark-card"
      >
        <View className="flex-row items-center flex-1 mr-3">
          <Ionicons name={icon} size={18} color="#94A3B8" />
          <Text
            numberOfLines={1}
            className={`text-sm font-sans ml-3 flex-1 ${
              value
                ? "text-dark-text font-medium"
                : "text-dark-muted font-normal"
            }`}
          >
            {value || placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#60677C" />
      </TouchableOpacity>
    </View>
  );
}

export default function DedicatedDebtScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    debtId?: string;
    txId?: string;
    mode?: "create" | "preview" | "edit" | "payment";
    from?: "transactions" | "debt";
  }>();

  const {
    debts,
    createDebt,
    updateDebt,
    deleteDebt,
    recordRepayment,
    getDebtTransactions,
  } = useDebts();
  const { transactions, deleteTransaction, updateTransaction } =
    useTransactions();
  const { contacts } = useContacts();
  const { accounts } = useAccounts();
  const { settings } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const { requireSecurityAuth } = useSecurityGuard();

  // Resolve IDs
  const resolvedDebtId = useMemo(() => {
    if (params.debtId) return parseInt(params.debtId, 10);
    if (params.id) return parseInt(params.id, 10);
    return null;
  }, [params.debtId, params.id]);

  const resolvedTxId = useMemo(() => {
    if (params.txId) return parseInt(params.txId, 10);
    return null;
  }, [params.txId]);

  // Target transaction
  const targetTx = useMemo(() => {
    if (resolvedTxId) {
      const fromAll = transactions.find((t) => t.id === resolvedTxId);
      if (fromAll) return fromAll;
    }
    if (resolvedDebtId) {
      const debtTxs = getDebtTransactions(resolvedDebtId);
      if (resolvedTxId) {
        return debtTxs.find((t) => t.id === resolvedTxId) || null;
      }
      return (
        debtTxs.find((t) => t.type === "LEND" || t.type === "BORROW") || null
      );
    }
    return null;
  }, [resolvedTxId, resolvedDebtId, transactions, getDebtTransactions]);

  // Target debt
  const targetDebt = useMemo(() => {
    if (resolvedDebtId) {
      const d = debts.find((item) => item.id === resolvedDebtId);
      if (d) return d;
    }
    const txDebtId = (targetTx as any)?.debtId;
    if (txDebtId) {
      return debts.find((item) => item.id === txDebtId) || null;
    }
    return null;
  }, [resolvedDebtId, debts, targetTx]);

  const [currentModeOverride, setCurrentModeOverride] = useState<
    "create" | "preview" | "edit" | "payment" | null
  >(null);
  const currentMode =
    currentModeOverride ??
    (params.mode || (resolvedTxId || resolvedDebtId ? "preview" : "create"));

  const currencySymbol = getCurrencySymbol(settings?.currency || "USD");

  // --- CREATE MODE STATE ---
  const [createType, setCreateType] = useState<DebtType>("LEND");
  const [createAmount, setCreateAmount] = useState("");
  const [createContactId, setCreateContactId] = useState<number | null>(null);
  const [createAssetId, setCreateAssetId] = useState<number | null>(null);
  const [createDate, setCreateDate] = useState<string>(getTodayYMD());
  const [createTime, setCreateTime] = useState<string>(() => {
    const t = getCurrentTimeInfo();
    return formatTime(t.hour12, t.minute, t.period);
  });
  const [createDueDate, setCreateDueDate] = useState<string>("");
  const [createNote, setCreateNote] = useState("");

  // Create Mode Date & Time Fly-Up State
  const [isDateTimeSheetOpen, setIsDateTimeSheetOpen] = useState(false);
  const [tempCreateDate, setTempCreateDate] = useState<string>(getTodayYMD());
  const [tempHour, setTempHour] = useState<number>(12);
  const [tempMinute, setTempMinute] = useState<number>(0);
  const [tempPeriod, setTempPeriod] = useState<"AM" | "PM">("AM");
  const [hourInput, setHourInput] = useState<string>("12");
  const [minuteInput, setMinuteInput] = useState<string>("00");
  const hourInputRef = useRef<TextInput>(null);
  const minuteInputRef = useRef<TextInput>(null);

  // --- EDIT MODE STATE ---
  const [customEditAmount, setCustomEditAmount] = useState<string | null>(null);
  const [customEditContactId, setCustomEditContactId] = useState<number | null>(
    null,
  );
  const [customEditDate, setCustomEditDate] = useState<string | null>(null);
  const [customEditTime, setCustomEditTime] = useState<string | null>(null);
  const [customEditDueDate, setCustomEditDueDate] = useState<string | null>(
    null,
  );
  const [customEditNote, setCustomEditNote] = useState<string | null>(null);

  const editAmount =
    customEditAmount ?? (targetDebt ? String(targetDebt.amount) : "");
  const editContactId = customEditContactId ?? (targetDebt?.contactId || null);
  const editDate =
    customEditDate ??
    (targetDebt?.createdAt
      ? targetDebt.createdAt.split("T")[0]
      : getTodayYMD());

  const editTime = useMemo(() => {
    if (customEditTime) return customEditTime;
    if (targetDebt?.createdAt) {
      const t = parseIsoToTimeInfo(targetDebt.createdAt);
      return formatTime(t.hour12, t.minute, t.period);
    }
    const t = getCurrentTimeInfo();
    return formatTime(t.hour12, t.minute, t.period);
  }, [customEditTime, targetDebt?.createdAt]);

  const editDueDate = customEditDueDate ?? (targetDebt?.dueDate || "");
  const editNote = customEditNote ?? (targetDebt?.note || "");

  // --- PAYMENT MODE STATE ---
  const [paymentAmount, setPaymentAmount] = useState("");
  const [selectedPaymentAssetId, setSelectedPaymentAssetId] = useState<
    number | null
  >(null);
  const paymentAssetId = selectedPaymentAssetId ?? (accounts[0]?.id || null);
  const [paymentDate, setPaymentDate] = useState(getTodayYMD());
  const [paymentTime, setPaymentTime] = useState(() => {
    const t = getCurrentTimeInfo();
    return formatTime(t.hour12, t.minute, t.period);
  });
  const [paymentNote, setPaymentNote] = useState("");

  // --- TRANSACTION EDIT STATE ---
  const [isEditingTx, setIsEditingTx] = useState(false);
  const [txEditDate, setTxEditDate] = useState<string>("");
  const [txEditTime, setTxEditTime] = useState<string>("");
  const [txEditNote, setTxEditNote] = useState<string>("");

  useEffect(() => {
    if (targetTx) {
      setTxEditDate(targetTx.date || getTodayYMD());
      if (targetTx.createdAt) {
        const t = parseIsoToTimeInfo(targetTx.createdAt);
        setTxEditTime(formatTime(t.hour12, t.minute, t.period));
      } else {
        const t = getCurrentTimeInfo();
        setTxEditTime(formatTime(t.hour12, t.minute, t.period));
      }
      setTxEditNote(targetTx.note || "");
    }
  }, [targetTx]);

  // Sub-modal Fly-Up states
  const [isContactSheetOpen, setIsContactSheetOpen] = useState(false);
  const [isCreateContactOpen, setIsCreateContactOpen] = useState(false);
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isDateSheetOpen, setIsDateSheetOpen] = useState(false);
  const [isNoteSheetOpen, setIsNoteSheetOpen] = useState(false);

  // Temporary Fly-up holding states
  const [tempContactId, setTempContactId] = useState<number | null>(null);
  const [tempAssetId, setTempAssetId] = useState<number | null>(null);
  const [accountTypeTab, setAccountTypeTab] = useState<"BANK" | "CASH">("BANK");
  const [tempDueDate, setTempDueDate] = useState<string>("");
  const [tempNote, setTempNote] = useState("");
  const [contactSearch, setContactSearch] = useState("");

  // Loading & Delete states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isNotFoundDeleteOpen, setIsNotFoundDeleteOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived Objects
  const selectedContact = useMemo(() => {
    let id: number | null = null;
    if (currentMode === "create") id = createContactId;
    else if (currentMode === "edit") id = editContactId;
    else id = targetDebt?.contactId || null;
    return contacts.find((c) => c.id === id) || null;
  }, [contacts, currentMode, createContactId, editContactId, targetDebt]);

  const selectedAccount = useMemo(() => {
    let id: number | null = null;
    if (currentMode === "create") id = createAssetId;
    else if (currentMode === "payment") id = paymentAssetId;
    else id = targetTx?.fromAssetId || targetTx?.toAssetId || null;
    return accounts.find((a) => a.id === id) || null;
  }, [accounts, currentMode, createAssetId, paymentAssetId, targetTx]);

  const filteredContacts = useMemo(() => {
    if (!contactSearch.trim()) return contacts;
    return contacts.filter((c) =>
      c.name.toLowerCase().includes(contactSearch.toLowerCase()),
    );
  }, [contacts, contactSearch]);


  // Open Fly-up Helpers
  function openContactSheet() {
    setTempContactId(
      currentMode === "create" ? createContactId : editContactId,
    );
    setContactSearch("");
    setIsContactSheetOpen(true);
  }

  function handleConfirmContact() {
    if (currentMode === "create") {
      setCreateContactId(tempContactId);
    } else if (currentMode === "edit") {
      setCustomEditContactId(tempContactId);
    }
    if (error) setError(null);
    setIsContactSheetOpen(false);
  }

  function openAccountSheet() {
    setTempAssetId(currentMode === "create" ? createAssetId : paymentAssetId);
    setIsAccountSheetOpen(true);
  }

  function handleConfirmAccount() {
    if (currentMode === "create") {
      setCreateAssetId(tempAssetId);
    } else if (currentMode === "payment") {
      if (tempAssetId) setSelectedPaymentAssetId(tempAssetId);
    }
    setIsAccountSheetOpen(false);
  }

  function openDateSheet() {
    const today = getTodayYMD();
    if (isEditingTx) {
      setTempDueDate(txEditDate || today);
    } else if (currentMode === "create") {
      setTempDueDate(
        createDueDate && createDueDate >= today ? createDueDate : today,
      );
    } else if (currentMode === "edit") {
      setTempDueDate(editDueDate && editDueDate >= today ? editDueDate : today);
    } else if (currentMode === "payment") {
      const debtCreatedDate = targetDebt?.createdAt
        ? targetDebt.createdAt.split("T")[0]
        : "";
      const initial = paymentDate || today;
      setTempDueDate(
        debtCreatedDate && initial < debtCreatedDate
          ? debtCreatedDate
          : initial > today
            ? today
            : initial,
      );
    }
    setIsDateSheetOpen(true);
  }

  // Date & Time Handlers for Create, Edit, Payment & TxEdit Modes
  const openDateTimeSheet = () => {
    let activeDate = createDate || getTodayYMD();
    let activeTime = createTime;

    if (isEditingTx) {
      activeDate = txEditDate || getTodayYMD();
      activeTime = txEditTime;
    } else if (currentMode === "edit") {
      activeDate = editDate;
      activeTime = editTime;
    } else if (currentMode === "payment") {
      activeDate = paymentDate || getTodayYMD();
      activeTime = paymentTime;
    }

    setTempCreateDate(activeDate);
    let h = 12;
    let m = 0;
    let p: "AM" | "PM" = "AM";
    if (activeTime && activeTime.includes(":")) {
      const parts = activeTime.split(" ");
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

  const openCreateDateTimeSheet = openDateTimeSheet;

  const handleHourChange = (val: string) => {
    const cleaned = val.replace(/[^0-9]/g, "");
    setHourInput(cleaned);
    if (cleaned.length === 2) {
      let num = parseInt(cleaned, 10);
      if (num > 12) num = 12;
      if (num < 1) num = 1;
      setTempHour(num);
      minuteInputRef.current?.focus();
    }
  };

  const handleHourBlur = () => {
    let num = parseInt(hourInput, 10);
    if (isNaN(num) || num < 1) num = tempHour || 12;
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
    }
  };

  const handleMinuteBlur = () => {
    let num = parseInt(minuteInput, 10);
    if (isNaN(num) || num < 0) num = tempMinute || 0;
    if (num > 59) num = 59;
    setTempMinute(num);
    setMinuteInput(String(num).padStart(2, "0"));
  };

  const handleConfirmDateTime = () => {
    const debtCreatedDate = targetDebt?.createdAt
      ? targetDebt.createdAt.split("T")[0]
      : "";

    let h = parseInt(hourInput, 10);
    if (isNaN(h) || h < 1) h = tempHour || 12;
    if (h > 12) h = 12;

    let m = parseInt(minuteInput, 10);
    if (isNaN(m) || m < 0) m = tempMinute || 0;
    if (m > 59) m = 59;

    const formattedTime = formatTime(h, m, tempPeriod);

    const today = getTodayYMD();
    if (tempCreateDate === today && isFutureTime(tempCreateDate, h, m, tempPeriod)) {
      showAlert({
        title: "Invalid Time",
        message: "You cannot select a time later than the current time.",
        type: "danger",
      });
      return;
    }

    if (isEditingTx) {
      if (
        debtCreatedDate &&
        (targetTx?.type === "DEBT PAID" ||
          targetTx?.type === "DEBT RECEIVED") &&
        tempCreateDate < debtCreatedDate
      ) {
        showAlert({
          title: "Invalid Date",
          message: `Repayment date cannot be earlier than the debt creation date (${formatDisplayDate(
            debtCreatedDate,
          )}).`,
          type: "danger",
        });
        return;
      }
      setTxEditDate(tempCreateDate);
      setTxEditTime(formattedTime);
      setIsDateTimeSheetOpen(false);
      return;
    }

    if (currentMode === "payment") {
      if (debtCreatedDate && tempCreateDate < debtCreatedDate) {
        showAlert({
          title: "Invalid Payment Date",
          message: `Payment date cannot be earlier than the debt creation date (${formatDisplayDate(
            debtCreatedDate,
          )}).`,
          type: "danger",
        });
        return;
      }
      const today = getTodayYMD();
      if (tempCreateDate > today) {
        showAlert({
          title: "Invalid Payment Date",
          message: "Payment date cannot be in the future.",
          type: "danger",
        });
        return;
      }
      setPaymentDate(tempCreateDate);
      setPaymentTime(formattedTime);
      setIsDateTimeSheetOpen(false);
      return;
    }

    if (currentMode === "edit") {
      setCustomEditDate(tempCreateDate);
      setCustomEditTime(formattedTime);
    } else {
      setCreateDate(tempCreateDate);
      setCreateTime(formattedTime);
    }
    setIsDateTimeSheetOpen(false);
  };

  const createDateTimePreview = useMemo(() => {
    const today = getTodayYMD();
    const isToday = createDate === today;
    const dateText = isToday ? "Today" : formatDisplayDate(createDate);
    return `${dateText}, ${createTime}`;
  }, [createDate, createTime]);

  function handleConfirmDate() {
    const debtCreatedDate = targetDebt?.createdAt
      ? targetDebt.createdAt.split("T")[0]
      : "";

    if (isEditingTx) {
      if (
        debtCreatedDate &&
        (targetTx?.type === "DEBT PAID" ||
          targetTx?.type === "DEBT RECEIVED") &&
        tempDueDate < debtCreatedDate
      ) {
        showAlert({
          title: "Invalid Date",
          message: `Repayment date cannot be earlier than the debt creation date (${formatDisplayDate(
            debtCreatedDate,
          )}).`,
          type: "danger",
        });
        return;
      }
      setTxEditDate(tempDueDate);
      setIsDateSheetOpen(false);
      return;
    }

    if (currentMode === "payment") {
      if (debtCreatedDate && tempDueDate < debtCreatedDate) {
        showAlert({
          title: "Invalid Payment Date",
          message: `Payment date cannot be earlier than the debt creation date (${formatDisplayDate(
            debtCreatedDate,
          )}).`,
          type: "danger",
        });
        return;
      }
      const today = getTodayYMD();
      if (tempDueDate > today) {
        showAlert({
          title: "Invalid Payment Date",
          message: "Payment date cannot be in the future.",
          type: "danger",
        });
        return;
      }
      setPaymentDate(tempDueDate);
      setIsDateSheetOpen(false);
      return;
    }

    const today = getTodayYMD();
    if (tempDueDate && tempDueDate < today) {
      showAlert({
        title: "Invalid Due Date",
        message: "Due date cannot be in the past.",
        type: "danger",
      });
      return;
    }
    if (currentMode === "create") setCreateDueDate(tempDueDate);
    else if (currentMode === "edit") setCustomEditDueDate(tempDueDate);
    setIsDateSheetOpen(false);
  }

  function openNoteSheet() {
    if (isEditingTx) setTempNote(txEditNote);
    else if (currentMode === "create") setTempNote(createNote);
    else if (currentMode === "edit") setTempNote(editNote);
    else if (currentMode === "payment") setTempNote(paymentNote);
    setIsNoteSheetOpen(true);
  }

  function handleConfirmNote() {
    if (isEditingTx) {
      setTxEditNote(tempNote);
      setIsNoteSheetOpen(false);
      return;
    }
    if (currentMode === "create") setCreateNote(tempNote);
    else if (currentMode === "edit") setCustomEditNote(tempNote);
    else if (currentMode === "payment") setPaymentNote(tempNote);
    setIsNoteSheetOpen(false);
  }

  async function handleSaveTransactionEdit() {
    if (!targetTx) return;
    try {
      setIsSubmitting(true);
      let createdAtTimestamp: string | undefined = undefined;
      if (txEditDate && txEditTime) {
        createdAtTimestamp = localDateTimeToIso(txEditDate, txEditTime);
      }

      await updateTransaction(targetTx.id, {
        date: txEditDate,
        createdAt: createdAtTimestamp,
        note: txEditNote.trim() || null,
      });

      setIsEditingTx(false);
      showAlert({
        title: "Success",
        message: "Transaction updated successfully.",
        type: "success",
      });
    } catch (err: any) {
      console.error("Save transaction error:", err);
      showAlert({
        title: "Update Failed",
        message: err?.message || "Could not update transaction record.",
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // --- SUBMISSIONS ---

  // 1. Create Brand New Debt
  async function handleCreateDebt() {
    if (!createContactId) {
      showAlert({
        title: "Contact Required",
        message: "Please select a contact for this debt.",
        type: "danger",
      });
      return;
    }

    const parsed = parseFloat(createAmount);
    if (!createAmount || isNaN(parsed) || parsed <= 0) {
      showAlert({
        title: "Invalid Amount",
        message: "Please enter a valid positive amount.",
        type: "danger",
      });
      return;
    }

    // Check account balance only if an account was selected and type is Lent
    if (createType === "LEND" && createAssetId) {
      const acct = accounts.find((a) => a.id === createAssetId);
      if (acct && parsed > acct.currentBalance) {
        showAlert({
          title: "Insufficient Balance",
          message: `Amount exceeds available account balance (${currencySymbol}${acct.currentBalance.toFixed(
            2,
          )})`,
          type: "danger",
        });
        return;
      }
    }

    // Ensure due date is not earlier than loan date
    if (
      createDueDate &&
      createDueDate.trim() &&
      createDueDate.trim() < createDate
    ) {
      showAlert({
        title: "Invalid Due Date",
        message: "Due date cannot be earlier than the loan date.",
        type: "danger",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await createDebt({
        contactId: createContactId,
        type: createType,
        amount: parsed,
        assetId: createAssetId,
        date: createDate,
        time: createTime,
        dueDate: createDueDate.trim() || null,
        note: createNote.trim() || null,
      });
      router.back();
    } catch (err: any) {
      console.error("Create debt error:", err);
      showAlert({
        title: "Error",
        message: err?.message || "Failed to create debt record.",
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // 2. Save Edit Mode Changes (Amount, Contact, Due Date & Note)
  async function handleSaveEdit() {
    if (!targetDebt) return;
    const parsed = parseFloat(editAmount);
    if (!editAmount || isNaN(parsed) || parsed <= 0) {
      showAlert({
        title: "Invalid Amount",
        message: "Please enter a valid positive amount.",
        type: "danger",
      });
      return;
    }

    if (parsed < targetDebt.repaidAmount) {
      showAlert({
        title: "Invalid Amount",
        message: `Amount cannot be less than the already repaid amount (${currencySymbol}${targetDebt.repaidAmount.toFixed(
          2,
        )}).`,
        type: "danger",
      });
      return;
    }

    if (!editContactId) {
      showAlert({
        title: "Contact Required",
        message: "Please select a contact for this debt.",
        type: "danger",
      });
      return;
    }

    // Ensure edited due date is not in the past
    const today = getTodayYMD();
    if (editDueDate && editDueDate.trim() && editDueDate.trim() < today) {
      showAlert({
        title: "Invalid Due Date",
        message: "Due date cannot be in the past.",
        type: "danger",
      });
      return;
    }

    // If LEND and amount increased, check account balance
    const diff = parsed - targetDebt.amount;
    if (diff > 0 && targetDebt.type === "LEND") {
      const acct = accounts.find(
        (a) => a.id === (targetTx?.fromAssetId || targetTx?.toAssetId),
      );
      if (acct && acct.currentBalance < diff) {
        showAlert({
          title: "Insufficient Balance",
          message: `Increasing the loan amount requires an additional ${currencySymbol}${diff.toFixed(
            2,
          )}, which exceeds the available balance in ${acct.name} (${currencySymbol}${acct.currentBalance.toFixed(
            2,
          )}).`,
          type: "danger",
        });
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await updateDebt(targetDebt.id, {
        amount: parsed,
        contactId: editContactId,
        date: editDate,
        time: editTime,
        dueDate: editDueDate.trim() || null,
        note: editNote.trim() || null,
      });
      showAlert({
        title: "Changes Saved",
        message: "Debt record updated successfully.",
        type: "info",
      });
      if (params.mode === "edit") {
        router.back();
      } else {
        setCurrentModeOverride("preview");
      }
    } catch (err: any) {
      console.error("Update debt error:", err);
      showAlert({
        title: "Error",
        message: err?.message || "Failed to update debt record.",
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // Handle Permanent Debt Deletion
  function handleDeleteDebt() {
    if (!targetDebt) return;
    const hasRepayments = (targetDebt.repaymentCount ?? 0) > 0;

    showConfirm({
      title: hasRepayments ? "Delete Debt & All Payments" : "Delete Debt",
      message: hasRepayments
        ? `This debt has ${targetDebt.repaymentCount} recorded repayment(s) totaling ${formatCurrency(
            targetDebt.repaidAmount,
            settings?.currency,
            settings?.numberFormat,
          )}. Deleting this debt will also delete all repayments and restore the funds to their respective accounts.`
        : "Are you sure you want to permanently delete this debt record? The initial transaction and account balance will be automatically reverted.",
      type: "danger",
      confirmText: hasRepayments ? "Delete All" : "Delete",
      isDestructive: true,
      onConfirm: () => {
        requireSecurityAuth({
          ruleKey: "deleteDebt",
          title: "Authorize Deletion",
          description: "Verify your identity to delete this debt.",
          onSuccess: async () => {
            try {
              setIsDeleting(true);
              await deleteDebt(targetDebt.id);
              router.back();
            } catch (err: any) {
              console.error("Delete debt error:", err);
              showAlert({
                title: "Error",
                message: err?.message || "Could not delete debt.",
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

  // 3. Record Repayment Payment
  async function handleRecordPayment() {
    if (!targetDebt) return;
    const parsed = parseFloat(paymentAmount);
    if (!paymentAmount || isNaN(parsed) || parsed <= 0) {
      showAlert({
        title: "Invalid Amount",
        message: "Please enter a valid payment amount.",
        type: "danger",
      });
      return;
    }

    if (parsed > targetDebt.remainingAmount) {
      showAlert({
        title: "Amount Exceeded",
        message: `Amount cannot exceed remaining balance (${currencySymbol}${targetDebt.remainingAmount.toFixed(
          2,
        )}).`,
        type: "danger",
      });
      return;
    }

    if (!paymentAssetId) {
      showAlert({
        title: "Account Required",
        message: "Please select an account for this payment.",
        type: "danger",
      });
      return;
    }

    const debtCreatedDate = targetDebt.createdAt
      ? targetDebt.createdAt.split("T")[0]
      : "";
    if (debtCreatedDate && paymentDate < debtCreatedDate) {
      showAlert({
        title: "Invalid Payment Date",
        message: `Payment date cannot be earlier than the debt creation date (${formatDisplayDate(
          debtCreatedDate,
        )}).`,
        type: "danger",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      await recordRepayment({
        debtId: targetDebt.id,
        amount: parsed,
        assetId: paymentAssetId,
        date: paymentDate,
        time: paymentTime,
        note: paymentNote.trim() || undefined,
      });
      router.back();
    } catch (err: any) {
      console.error("Record repayment error:", err);
      showAlert({
        title: "Error",
        message: err?.message || "Failed to record payment.",
        type: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // 4. Delete Transaction (Available anytime, reverts account balance and debt state)
  function handleDeleteTransaction() {
    if (!targetTx) return;
    const isInitialDebtTx =
      (targetTx.type === "LEND" || targetTx.type === "BORROW") && !!targetDebt;
    const hasRepayments =
      isInitialDebtTx && targetDebt && (targetDebt.repaymentCount ?? 0) > 0;

    const title = hasRepayments
      ? "Delete Debt & All Payments"
      : "Delete Transaction";
    const message = hasRepayments
      ? `This initial loan transaction is linked to a debt with ${targetDebt.repaymentCount} recorded repayment(s). Deleting it will also delete the entire debt and all repayments, reverting funds to their respective accounts.`
      : "Are you sure you want to permanently delete this transaction record? The debt balance and account funds will be automatically updated.";

    showConfirm({
      title,
      message,
      type: "danger",
      confirmText: hasRepayments ? "Delete All" : "Delete",
      isDestructive: true,
      onConfirm: () => {
        requireSecurityAuth({
          ruleKey: "deleteTransaction",
          title: "Authorize Deletion",
          description: "Verify your identity to delete this transaction.",
          onSuccess: async () => {
            try {
              setIsDeleting(true);
              await deleteTransaction(targetTx.id);
              router.back();
            } catch (err: any) {
              console.error("Delete transaction error:", err);
              showAlert({
                title: "Error",
                message: err?.message || "Could not delete transaction.",
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

  // Handle not-found cleanup
  async function handleNotFoundDelete() {
    if (!resolvedDebtId) return;
    try {
      await deleteDebt(resolvedDebtId, true);
      setIsNotFoundDeleteOpen(false);
      router.back();
    } catch (err: any) {
      console.error("Delete debt error:", err);
      showAlert({
        title: "Delete Failed",
        message: err?.message || "Could not delete debt record.",
        type: "danger",
      });
    }
  }

  // Compute display values for Preview/Edit — must come BEFORE any early return (Rules of Hooks)
  const previewAmount = targetTx?.amount || targetDebt?.amount || 0;
  const previewContactName =
    targetDebt?.contactName ||
    (targetTx as any)?.contactName ||
    selectedContact?.name ||
    "Contact";
  const previewAccountName =
    targetTx?.fromAssetName ||
    targetTx?.toAssetName ||
    selectedAccount?.name ||
    "Account";
  const previewDate = targetTx?.date || targetDebt?.dueDate || getTodayYMD();
  const previewTime = useMemo(() => {
    if (!targetTx?.createdAt) return "";
    const t = parseIsoToTimeInfo(targetTx.createdAt);
    return formatTime(t.hour12, t.minute, t.period);
  }, [targetTx?.createdAt]);
  const previewNote = targetTx?.note || targetDebt?.note || "";

  // Title calculation
  const titleText =
    currentMode === "create"
      ? "Create Debt"
      : currentMode === "edit"
        ? "Edit Debt"
        : currentMode === "payment"
          ? "Add Payment"
          : isEditingTx
            ? "Edit Transaction"
            : "Transaction Details";

  // NOT FOUND STATE (if debtId was provided but records don't exist)
  if (currentMode !== "create" && !targetDebt && !targetTx) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 bg-dark-bg justify-center items-center px-6"
      >
        <View className="w-16 h-16 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-4">
          <Ionicons name="receipt-outline" size={28} color="#94A3B8" />
        </View>
        <Text className="text-dark-text font-bold text-xl mb-2 text-center font-sans">
          Debt Not Found
        </Text>
        <Text className="text-dark-muted text-sm text-center mb-6 font-sans">
          This record may have been deleted or archived.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-6 py-3 rounded-2xl bg-brand-accent active:opacity-90 w-48 items-center"
        >
          <Text className="text-dark-bg font-bold text-base font-sans">
            Go Back
          </Text>
        </TouchableOpacity>
        {resolvedDebtId ? (
          <TouchableOpacity
            onPress={() => setIsNotFoundDeleteOpen(true)}
            className="mt-4 flex-row items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 active:bg-rose-500/20 w-48"
          >
            <Ionicons name="trash-outline" size={16} color="#F43F5E" />
            <Text className="text-rose-400 font-bold text-base font-sans">
              Delete Debt
            </Text>
          </TouchableOpacity>
        ) : null}

        <HawkAlertModal
          visible={isNotFoundDeleteOpen}
          title="Delete Debt"
          message="Are you sure you want to permanently delete this debt record and any remaining linked transactions?"
          type="danger"
          buttons={[
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => setIsNotFoundDeleteOpen(false),
            },
            {
              text: "Delete",
              style: "destructive",
              onPress: handleNotFoundDelete,
            },
          ]}
          onClose={() => setIsNotFoundDeleteOpen(false)}
        />
      </SafeAreaView>
    );
  }

  // (preview values and titleText already computed above, before the not-found guard)

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
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

          <Text className="text-dark-text text-lg font-bold font-sans">
            {titleText}
          </Text>

          {/* Right Header Element based on Mode */}
          {currentMode === "preview" ? (
            isEditingTx ? (
              <TouchableOpacity
                onPress={() => {
                  setTxEditDate(targetTx?.date || getTodayYMD());
                  if (targetTx?.createdAt) {
                    const t = parseIsoToTimeInfo(targetTx.createdAt);
                    setTxEditTime(formatTime(t.hour12, t.minute, t.period));
                  } else {
                    const t = getCurrentTimeInfo();
                    setTxEditTime(formatTime(t.hour12, t.minute, t.period));
                  }
                  setTxEditNote(targetTx?.note || "");
                  setIsEditingTx(false);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-card"
              >
                <Ionicons name="close" size={20} color="#F8FAFC" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => {
                  setTxEditDate(targetTx?.date || getTodayYMD());
                  if (targetTx?.createdAt) {
                    const t = parseIsoToTimeInfo(targetTx.createdAt);
                    setTxEditTime(formatTime(t.hour12, t.minute, t.period));
                  } else {
                    const t = getCurrentTimeInfo();
                    setTxEditTime(formatTime(t.hour12, t.minute, t.period));
                  }
                  setTxEditNote(targetTx?.note || "");
                  setIsEditingTx(true);
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-card"
              >
                <Ionicons name="pencil" size={17} color="#F8FAFC" />
              </TouchableOpacity>
            )
          ) : currentMode === "edit" ? (
            targetDebt ? (
              <TouchableOpacity
                onPress={handleDeleteDebt}
                disabled={isDeleting}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                className="w-10 h-10 rounded-full bg-rose-500/10 border border-rose-500/30 items-center justify-center active:bg-rose-500/20"
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#F43F5E" />
                ) : (
                  <Ionicons name="trash-outline" size={18} color="#F43F5E" />
                )}
              </TouchableOpacity>
            ) : (
              <View className="w-10" />
            )
          ) : (
            <View className="w-10" />
          )}
        </View>

        <ScrollView
          className="flex-1 px-6 pt-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Error Banner */}
          {error ? (
            <View className="bg-rose-500/10 border border-rose-500/30 p-3 rounded-2xl mb-5 flex-row items-center gap-2">
              <Ionicons name="alert-circle" size={18} color="#F43F5E" />
              <Text className="text-rose-400 font-semibold text-xs flex-1 font-sans">
                {error}
              </Text>
            </View>
          ) : null}

          {/* ========================================================================= */}
          {/* CREATE MODE: Exactly like Create Account Page                             */}
          {/* 1. Debt Type Dropdown                                                     */}
          {/* 2. Amount                                                                 */}
          {/* 3. Paid From / Deposit To (Selector field with AccountForm height)        */}
          {/* 4. Contact (Selector field with AccountForm height)                       */}
          {/* 5. Due Date (Selector field with AccountForm height)                      */}
          {/* 6. Note (TextInput matching AccountForm note)                             */}
          {/* ========================================================================= */}
          {currentMode === "create" ? (
            <View className="gap-5 mb-8">
              {/* 1. Debt Type Dropdown */}
              <Dropdown<DebtType>
                label="Debt Type"
                selectedValue={createType}
                onSelect={(val) => setCreateType(val)}
                options={DEBT_TYPE_OPTIONS}
              />

              {/* 2. Amount */}
              <View>
                <Text className="text-dark-text text-sm font-semibold mb-2 font-sans">
                  Amount
                </Text>
                <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center">
                  <Text className="text-brand-accent font-bold text-sm mr-2.5 font-sans">
                    {currencySymbol}
                  </Text>
                  <TextInput
                    placeholder="0.00"
                    placeholderTextColor="#60677C"
                    value={createAmount}
                    onChangeText={(val) => {
                      setCreateAmount(val);
                      if (error) setError(null);
                    }}
                    keyboardType="decimal-pad"
                    className="flex-1 text-dark-text text-sm py-0 font-sans"
                  />
                </View>
              </View>

              {/* 3. Paid From / Deposit To Selector */}
              <SelectorField
                label={createType === "LEND" ? "Paid From" : "Deposit To"}
                icon="wallet-outline"
                value={selectedAccount?.name}
                placeholder="Optional (Prior loan / No account)"
                onPress={openAccountSheet}
              />

              {/* 4. Contact Selector */}
              <SelectorField
                label="Contact"
                icon="person-outline"
                value={selectedContact?.name}
                placeholder="Select contact"
                onPress={openContactSheet}
              />

              {/* 5. Date & Time Selector */}
              <SelectorField
                label="Date & Time"
                icon="calendar-outline"
                value={createDateTimePreview}
                onPress={openCreateDateTimeSheet}
              />

              {/* 6. Due Date Selector */}
              <SelectorField
                label="Due Date"
                icon="calendar-outline"
                value={createDueDate ? formatDisplayDate(createDueDate) : null}
                placeholder="Optional"
                onPress={openDateSheet}
              />

              {/* 6. Note */}
              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-dark-text text-sm font-semibold font-sans">
                    Note
                  </Text>
                  <Text className="text-dark-muted text-xs font-sans">
                    Optional
                  </Text>
                </View>
                <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5">
                  <TextInput
                    placeholder="e.g. Loan for business expense"
                    placeholderTextColor="#60677C"
                    value={createNote}
                    onChangeText={setCreateNote}
                    multiline
                    numberOfLines={2}
                    className="text-dark-text text-sm py-0 min-h-[48px] font-sans"
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          ) : currentMode === "payment" ? (
            // =========================================================================
            // PAYMENT MODE: Add Payment
            // =========================================================================
            <View>
              <View className="mb-6 w-full items-center justify-center">
                <View className="border-b-2 border-brand-accent pb-3 pt-2 w-full flex-row items-baseline justify-center px-2">
                  <Text className="text-brand-accent font-bold text-3xl mr-2 self-center font-sans">
                    {currencySymbol}
                  </Text>
                  <TextInput
                    value={paymentAmount}
                    onChangeText={(val) => {
                      setPaymentAmount(val);
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
                    className="font-black text-dark-text text-5xl py-1 max-w-[78%] font-sans"
                  />
                </View>
                {targetDebt ? (
                  <View className="mt-3 items-center">
                    <Text className="text-dark-muted text-xs font-sans">
                      Repayment to{" "}
                      <Text className="text-dark-text font-bold">
                        {targetDebt.contactName}
                      </Text>
                      {" · Remaining: "}
                      <Text className="text-brand-accent font-bold">
                        {formatCurrency(
                          targetDebt.remainingAmount,
                          settings?.currency,
                          settings?.numberFormat,
                        )}
                      </Text>
                    </Text>
                  </View>
                ) : null}
              </View>

              <FieldRow
                icon="person-outline"
                label="Contact"
                value={targetDebt?.contactName}
                isLocked={true}
              />
              <FieldRow
                icon="wallet-outline"
                label={targetDebt?.type === "LEND" ? "Deposit To" : "Paid From"}
                value={selectedAccount?.name}
                placeholder="Select account"
                onPress={openAccountSheet}
              />
              <FieldRow
                icon="calendar-outline"
                label="Date & Time"
                value={`${
                  paymentDate === getTodayYMD()
                    ? "Today"
                    : formatDisplayDate(paymentDate)
                }, ${paymentTime}`}
                onPress={openDateTimeSheet}
              />
              <FieldRow
                icon="document-text-outline"
                label="Note"
                value={paymentNote || null}
                placeholder="Optional note"
                onPress={openNoteSheet}
              />
            </View>
          ) : currentMode === "edit" ? (
            // =========================================================================
            // EDIT MODE: Exactly like Edit Account Page
            // 1. Debt Type (Locked with lock-closed icon)
            // 2. Amount (Editable text input)
            // 3. Paid From / Deposit To (Locked with lock-closed icon)
            // 4. Contact (Selector field with AccountForm height, editable)
            // 5. Due Date (Selector field with AccountForm height, editable)
            // 6. Note (TextInput matching AccountForm note, editable)
            // =========================================================================
            <View className="gap-5 mb-8">
              {/* 1. Locked Debt Type */}
              <View>
                <Text className="text-dark-text text-sm font-semibold mb-2 font-sans">
                  Debt Type
                </Text>
                <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2.5">
                    <Ionicons
                      name={
                        targetDebt?.type === "LEND"
                          ? "arrow-up-circle-outline"
                          : "arrow-down-circle-outline"
                      }
                      size={18}
                      color="#60677C"
                    />
                    <Text className="text-dark-text font-medium text-sm font-sans">
                      {targetDebt?.type === "LEND" ? "Lent" : "Borrowed"}
                    </Text>
                  </View>
                  <Ionicons name="lock-closed" size={16} color="#60677C" />
                </View>
              </View>

              {/* 2. Amount (Editable) */}
              <View>
                <Text className="text-dark-text text-sm font-semibold mb-2 font-sans">
                  Amount
                </Text>
                <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center">
                  <Text className="text-brand-accent font-bold text-sm mr-2.5 font-sans">
                    {currencySymbol}
                  </Text>
                  <TextInput
                    placeholder="0.00"
                    placeholderTextColor="#60677C"
                    value={editAmount}
                    onChangeText={(val) => {
                      setCustomEditAmount(val);
                      if (error) setError(null);
                    }}
                    keyboardType="decimal-pad"
                    className="flex-1 text-dark-text text-sm py-0 font-sans"
                  />
                </View>
                {targetDebt && targetDebt.repaidAmount > 0 ? (
                  <Text className="text-dark-muted text-xs mt-1.5 font-sans">
                    Already repaid:{" "}
                    <Text className="text-brand-accent font-semibold font-sans">
                      {formatCurrency(
                        targetDebt.repaidAmount,
                        settings?.currency,
                        settings?.numberFormat,
                      )}
                    </Text>
                  </Text>
                ) : null}
              </View>

              {/* 3. Paid From / Deposit To (Locked) */}
              <View>
                <Text className="text-dark-text text-sm font-semibold mb-2 font-sans">
                  {targetDebt?.type === "LEND" ? "Paid From" : "Deposit To"}
                </Text>
                <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2.5">
                    <Ionicons name="wallet-outline" size={18} color="#60677C" />
                    <Text className="text-dark-text font-medium text-sm font-sans">
                      {previewAccountName}
                    </Text>
                  </View>
                  <Ionicons name="lock-closed" size={16} color="#60677C" />
                </View>
              </View>

              {/* 4. Contact Selector (Editable) */}
              <SelectorField
                label="Contact"
                icon="person-outline"
                value={selectedContact?.name || previewContactName}
                placeholder="Select contact"
                onPress={openContactSheet}
              />

              {/* Date & Time Selector (Editable) */}
              <SelectorField
                label="Date & Time"
                icon="calendar-outline"
                value={`${
                  editDate === getTodayYMD()
                    ? "Today"
                    : formatDisplayDate(editDate)
                }, ${editTime}`}
                placeholder="Select date & time"
                onPress={openDateTimeSheet}
              />

              {/* 5. Due Date Selector (Editable) */}
              <SelectorField
                label="Due Date"
                icon="calendar-outline"
                value={editDueDate ? formatDisplayDate(editDueDate) : null}
                placeholder="Optional"
                onPress={openDateSheet}
              />

              {/* 6. Note (Editable) */}
              <View>
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-dark-text text-sm font-semibold font-sans">
                    Note
                  </Text>
                  <Text className="text-dark-muted text-xs font-sans">
                    Optional
                  </Text>
                </View>
                <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-3.5">
                  <TextInput
                    placeholder="e.g. Loan for business expense"
                    placeholderTextColor="#60677C"
                    value={editNote}
                    onChangeText={(val) => setCustomEditNote(val)}
                    multiline
                    numberOfLines={2}
                    className="text-dark-text text-sm py-0 min-h-[48px] font-sans"
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          ) : (
            // =========================================================================
            // PREVIEW & TRANSACTION EDIT MODE
            // =========================================================================
            <View>
              <View className="mb-6 w-full pt-3 pb-1 items-center justify-center">
                <Text
                  className={`font-black text-5xl tracking-tight font-sans ${
                    targetTx?.type === "BORROW" ||
                    targetTx?.type === "DEBT RECEIVED"
                      ? "text-emerald-400"
                      : targetTx?.type === "LEND" ||
                          targetTx?.type === "DEBT PAID"
                        ? "text-rose-400"
                        : "text-brand-accent"
                  }`}
                >
                  {targetTx?.type === "BORROW" ||
                  targetTx?.type === "DEBT RECEIVED"
                    ? "+"
                    : targetTx?.type === "LEND" ||
                        targetTx?.type === "DEBT PAID"
                      ? "-"
                      : ""}
                  {formatCurrency(
                    previewAmount,
                    settings?.currency,
                    settings?.numberFormat,
                  )}
                </Text>

                {isEditingTx ? (
                  <View className="flex-row items-center gap-1.5 mt-2">
                    <Ionicons name="lock-closed" size={13} color="#60677C" />
                    <Text className="text-dark-muted text-xs font-medium font-sans">
                      Amount cannot be edited
                    </Text>
                  </View>
                ) : (
                  <View className="items-center justify-center mt-2 px-6">
                    <Text
                      className={`font-semibold text-sm font-sans tracking-wide ${
                        targetTx?.type === "BORROW" ||
                        targetTx?.type === "DEBT RECEIVED"
                          ? "text-emerald-400"
                          : targetTx?.type === "LEND" ||
                              targetTx?.type === "DEBT PAID"
                            ? "text-rose-400"
                            : "text-brand-accent"
                      }`}
                    >
                      {targetTx?.type === "LEND"
                        ? "Lent"
                        : targetTx?.type === "BORROW"
                          ? "Borrowed"
                          : targetTx?.type === "DEBT PAID"
                            ? "Debt Paid"
                            : targetTx?.type === "DEBT RECEIVED"
                              ? "Debt Received"
                              : "Transfer"}
                    </Text>

                    {previewNote ? (
                      <Text className="text-dark-muted text-sm font-medium text-center mt-1.5 px-6 leading-relaxed font-sans">
                        {previewNote}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>

              <FieldRow
                icon="person-outline"
                label="Contact"
                value={previewContactName}
                isReadOnly={!isEditingTx}
                isLocked={isEditingTx}
              />
              <FieldRow
                icon="wallet-outline"
                label={
                  targetTx?.type === "LEND" || targetTx?.type === "DEBT PAID"
                    ? "Paid From"
                    : "Deposit To"
                }
                value={previewAccountName}
                isReadOnly={!isEditingTx}
                isLocked={isEditingTx}
              />
              <FieldRow
                icon="calendar-outline"
                label={isEditingTx ? "Date & Time" : "Date"}
                value={
                  isEditingTx
                    ? `${
                        txEditDate === getTodayYMD()
                          ? "Today"
                          : formatDisplayDate(txEditDate)
                      }, ${txEditTime}`
                    : `${formatDisplayDate(previewDate)}${
                        previewTime ? `, ${previewTime}` : ""
                      }`
                }
                isReadOnly={!isEditingTx}
                onPress={() => {
                  if (isEditingTx) {
                    openDateTimeSheet();
                  }
                }}
              />
              {isEditingTx && (
                <FieldRow
                  icon="document-text-outline"
                  label="Note"
                  value={txEditNote || null}
                  placeholder="Add note"
                  onPress={openNoteSheet}
                />
              )}
            </View>
          )}

          <View className="h-10" />
        </ScrollView>

        {/* ========================================================================= */}
        {/* FOOTER ACTION BUTTON: Pinned at bottom                                    */}
        {/* ========================================================================= */}
        <View className="px-6 pb-6 pt-3 bg-dark-bg/95 border-t border-dark-border/40">
          {currentMode === "preview" && isEditingTx ? (
            <TouchableOpacity
              onPress={handleSaveTransactionEdit}
              disabled={isSubmitting}
              activeOpacity={0.8}
              className="bg-brand-accent py-4 rounded-2xl items-center justify-center active:opacity-90"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#0B0D12" />
              ) : (
                <Text className="text-dark-bg font-extrabold text-base font-sans">
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          ) : currentMode === "create" ? (
            // Requirement 7: At bottom create debt button (not slider)
            <TouchableOpacity
              onPress={handleCreateDebt}
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-brand-accent items-center justify-center shadow-lg active:opacity-90"
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#0B0D12" size="small" />
              ) : (
                <Text className="font-bold text-base font-sans text-dark-bg">
                  Create Debt
                </Text>
              )}
            </TouchableOpacity>
          ) : currentMode === "edit" ? (
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={isSubmitting}
              activeOpacity={0.8}
              className="bg-brand-accent py-4 rounded-2xl items-center justify-center active:opacity-90"
            >
              {isSubmitting ? (
                <ActivityIndicator color="#0B0D12" />
              ) : (
                <Text className="text-dark-bg font-extrabold text-base font-sans">
                  Save Changes
                </Text>
              )}
            </TouchableOpacity>
          ) : currentMode === "payment" ? (
            <SlideButton
              title="Slide to record payment"
              onConfirm={handleRecordPayment}
              isLoading={isSubmitting}
            />
          ) : currentMode === "preview" && !isEditingTx ? (
            <TouchableOpacity
              onPress={handleDeleteTransaction}
              disabled={isDeleting}
              activeOpacity={0.8}
              className="bg-rose-500/10 border border-rose-500/25 py-4 rounded-2xl items-center justify-center flex-row gap-2 active:bg-rose-500/20"
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#F43F5E" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={18} color="#F43F5E" />
                  <Text className="text-rose-400 font-bold text-base font-sans">
                    Delete Transaction
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </KeyboardAvoidingView>

      {/* --- FLY-UP 1: Account Selection (Matches create transaction account fly-up exactly) --- */}
      <HawkFlyUp
        visible={isAccountSheetOpen}
        onClose={() => setIsAccountSheetOpen(false)}
        title={
          currentMode === "create"
            ? createType === "LEND"
              ? "Select Payment Account"
              : "Select Deposit Account"
            : currentMode === "payment"
              ? targetDebt?.type === "LEND"
                ? "Select Deposit Account"
                : "Select Payment Account"
              : "Select Account"
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

        {/* Optional No Account / Prior Loan Card for Create Mode */}
        {currentMode === "create" ? (
          <TouchableOpacity
            onPress={() => setTempAssetId(null)}
            activeOpacity={0.7}
            className={`flex-row items-center justify-between p-3.5 rounded-2xl mb-3 border ${
              tempAssetId === null
                ? "bg-brand-accent/10 border-brand-accent"
                : "bg-dark-card/50 border-dark-border"
            }`}
          >
            <View className="flex-row items-center gap-3">
              <View className="w-10 h-10 rounded-xl bg-dark-surface border border-dark-border items-center justify-center">
                <Ionicons
                  name="ban-outline"
                  size={18}
                  color={tempAssetId === null ? "#D4F938" : "#94A3B8"}
                />
              </View>
              <View>
                <Text
                  className={`text-sm font-bold font-sans ${
                    tempAssetId === null
                      ? "text-brand-accent"
                      : "text-dark-text"
                  }`}
                >
                  No Account (Prior / External)
                </Text>
                <Text className="text-dark-muted text-[11px] font-sans">
                  Does not deduct from current account balances
                </Text>
              </View>
            </View>

            {tempAssetId === null ? (
              <Ionicons name="checkmark-circle" size={18} color="#D4F938" />
            ) : null}
          </TouchableOpacity>
        ) : null}

        {accounts.filter((a) => a.assetType === accountTypeTab).length === 0 ? (
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
            <Text className="text-dark-muted text-xs text-center mb-5 max-w-[220px] font-sans">
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
              <Text className="text-brand-accentDark font-bold text-sm font-sans">
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
                const isSelected = tempAssetId === acc.id;

                return (
                  <TouchableOpacity
                    key={acc.id}
                    onPress={() => setTempAssetId(isSelected ? null : acc.id)}
                    activeOpacity={0.7}
                    className={`flex-row items-center justify-between p-3.5 rounded-2xl mb-2 border ${
                      isSelected
                        ? "bg-brand-accent/10 border-brand-accent"
                        : "bg-dark-card/50 border-dark-border"
                    }`}
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
                            isSelected
                              ? "text-brand-accent"
                              : "text-dark-text"
                          }`}
                        >
                          {acc.name}
                        </Text>
                        {acc.accountNumber ? (
                          <Text className="text-dark-muted text-[11px] font-sans">
                            {acc.accountNumber}
                          </Text>
                        ) : null}
                      </View>
                    </View>

                    <View className="items-end">
                      <Text className="text-sm font-bold text-dark-text font-sans">
                        {formatCurrency(
                          acc.currentBalance ?? 0,
                          settings?.currency,
                          settings?.numberFormat,
                        )}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
          </ScrollView>
        )}

        <View className="mt-4">
          <TouchableOpacity
            onPress={handleConfirmAccount}
            activeOpacity={0.8}
            className="w-full py-3.5 rounded-2xl items-center justify-center bg-brand-accent"
          >
            <Text className="text-dark-bg font-bold text-base font-sans">
              Done
            </Text>
          </TouchableOpacity>
        </View>
      </HawkFlyUp>

      {/* --- FLY-UP 2: Universal Contact Selection Grid (Exact match with TransactionForm) --- */}
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
            onPress={() => setIsCreateContactOpen(true)}
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
            <Text className="text-dark-muted text-xs text-center mb-5 max-w-[220px] font-sans">
              {contacts.length === 0
                ? "Add a contact to link transactions to people or companies."
                : "No contacts match your search."}
            </Text>
            {contacts.length === 0 ? (
              <TouchableOpacity
                onPress={() => setIsCreateContactOpen(true)}
                activeOpacity={0.8}
                className="bg-brand-accent px-5 py-3 rounded-full flex-row items-center gap-2 active:opacity-90"
              >
                <Ionicons name="person-add" size={18} color="#0B0D12" />
                <Text className="text-brand-accentDark font-bold text-sm font-sans">
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

      {/* Create Contact Modal */}
      <CreateContact
        visible={isCreateContactOpen}
        onClose={() => setIsCreateContactOpen(false)}
        onCreated={(newContactId) => {
          setTempContactId(newContactId);
          setCreateContactId(newContactId);
          setIsCreateContactOpen(false);
        }}
      />

      {/* --- FLY-UP 3: Calendar Date Picker --- */}
      <HawkFlyUp
        visible={isDateSheetOpen}
        onClose={() => setIsDateSheetOpen(false)}
        title="Select Date"
      >
        <View className="px-1 pb-4">
          <Calendar
            value={tempDueDate}
            onChange={setTempDueDate}
            minDate={
              currentMode === "payment"
                ? targetDebt?.createdAt
                  ? targetDebt.createdAt.split("T")[0]
                  : undefined
                : isEditingTx
                  ? targetDebt &&
                    (targetTx?.type === "DEBT PAID" ||
                      targetTx?.type === "DEBT RECEIVED")
                    ? targetDebt.createdAt
                      ? targetDebt.createdAt.split("T")[0]
                      : undefined
                    : undefined
                  : getTodayYMD()
            }
            maxDate={
              currentMode === "payment" || isEditingTx
                ? getTodayYMD()
                : undefined
            }
          />
          <TouchableOpacity
            onPress={handleConfirmDate}
            activeOpacity={0.8}
            className="w-full py-3.5 rounded-2xl bg-brand-accent items-center justify-center mt-4"
          >
            <Text className="text-dark-bg font-extrabold text-sm font-sans">
              Confirm Date
            </Text>
          </TouchableOpacity>
        </View>
      </HawkFlyUp>

      {/* --- FLY-UP 4: Note Input (Used in Edit & Payment modes) --- */}
      <HawkFlyUp
        visible={isNoteSheetOpen}
        onClose={() => setIsNoteSheetOpen(false)}
        title="Note"
      >
        <View className="px-1 pb-4">
          <TextInput
            value={tempNote}
            onChangeText={setTempNote}
            placeholder="Add note details..."
            placeholderTextColor="#60677C"
            multiline={true}
            numberOfLines={4}
            autoFocus={true}
            className="bg-dark-surface p-4 rounded-2xl border border-dark-border text-dark-text text-sm font-sans min-h-[100px] mb-4"
            textAlignVertical="top"
          />
          <TouchableOpacity
            onPress={handleConfirmNote}
            activeOpacity={0.8}
            className="w-full py-3.5 rounded-2xl bg-brand-accent items-center justify-center"
          >
            <Text className="text-dark-bg font-extrabold text-sm font-sans">
              Confirm Note
            </Text>
          </TouchableOpacity>
        </View>
      </HawkFlyUp>
      {/* --- FLY-UP 5: Create Debt Date & Time Picker --- */}
      <HawkFlyUp
        visible={isDateTimeSheetOpen}
        onClose={() => setIsDateTimeSheetOpen(false)}
        title="Date & Time"
      >
        <View className="mb-4">
          <Calendar
            value={tempCreateDate}
            onChange={setTempCreateDate}
            minDate={
              currentMode === "payment"
                ? targetDebt?.createdAt
                  ? targetDebt.createdAt.split("T")[0]
                  : undefined
                : isEditingTx
                  ? targetDebt &&
                    (targetTx?.type === "DEBT PAID" ||
                      targetTx?.type === "DEBT RECEIVED")
                    ? targetDebt.createdAt
                      ? targetDebt.createdAt.split("T")[0]
                      : undefined
                    : undefined
                  : undefined
            }
            maxDate={getTodayYMD()}
          />
        </View>

        {/* Digital Time Picker Section */}
        <View className="bg-dark-surface/80 border border-dark-border rounded-2xl p-4 mb-5">
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
              className="bg-dark-card border border-dark-border rounded-xl px-2.5 py-1 active:bg-dark-surface"
            >
              <Text className="text-dark-muted text-xs font-semibold font-sans">
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
              <Text className="text-dark-muted text-[10px] mt-1 font-semibold uppercase font-sans">
                Hour
              </Text>
            </View>

            <Text className="text-dark-text font-bold text-2xl pb-4 font-sans">
              :
            </Text>

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
              <Text className="text-dark-muted text-[10px] mt-1 font-semibold uppercase font-sans">
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
                  className={`font-bold text-sm font-sans ${
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
                  className={`font-bold text-sm font-sans ${
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
          <Text className="text-dark-bg font-bold text-base font-sans">
            Done
          </Text>
        </TouchableOpacity>
      </HawkFlyUp>
    </SafeAreaView>
  );
}
