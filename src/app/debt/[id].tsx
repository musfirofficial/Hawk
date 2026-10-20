import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { formatDisplayDate, getTodayYMD } from "../../components/calendar";
import { ContactAvatar } from "../../components/ContactAvatar";
import { HawkAlertModal } from "../../components/HawkAlertModal";
import { HawkFlyUp } from "../../components/HawkFlyUp";
import { TransactionCard } from "../../components/transactions/TransactionCard";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { useContacts } from "../../context/contacts";
import {
  DebtLogItem,
  DebtTransactionItem,
  useDebts,
} from "../../context/debts";
import { TransactionItem } from "../../context/transactions";
import { useSafeRouter } from "../../hooks/useSafeRouter";
import { formatCurrency } from "../../services/currency";

interface TimelineItem {
  id: string;
  type: "PAYMENT" | "LOG";
  timestamp: string;
  payment?: DebtTransactionItem;
  log?: DebtLogItem;
}

const WRITE_OFF_PRESETS = [
  "Forgiven / Friendly favor",
  "Uncollectible / Unable to pay",
  "Mutual agreement / Settled dispute",
  "Exchanged via barter / services",
  "Waived as personal gift",
];

export default function DebtDetailScreen() {
  const router = useRouter();
  const { safePush } = useSafeRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const debtId = id ? parseInt(id, 10) : null;

  const {
    debts,
    deleteDebt,
    settleDebtManually,
    toggleSettleManually,
    getDebtLogs,
    getDebtTransactions,
  } = useDebts();
  const { contacts } = useContacts();
  const { settings } = useAuth();
  const { showAlert } = useAlert();

  const debt = useMemo(() => {
    if (!debtId) return null;
    return debts.find((d) => d.id === debtId) || null;
  }, [debts, debtId]);

  const contact = useMemo(() => {
    if (!debt) return null;
    return contacts.find((c) => c.id === debt.contactId) || null;
  }, [contacts, debt]);

  // Fetch transactions and logs for this debt
  const transactions = useMemo(() => {
    if (!debtId) return [];
    return getDebtTransactions(debtId);
  }, [debtId, getDebtTransactions, debts]);

  const logs = useMemo(() => {
    if (!debtId) return [];
    return getDebtLogs(debtId);
  }, [debtId, getDebtLogs, debts]);

  // Combine payments and logs into a single sorted timeline (newest first)
  const timelineItems: TimelineItem[] = useMemo(() => {
    const list: TimelineItem[] = [];

    // Filter for repayment transactions (exclude the initial loan creation transaction)
    const repayments = transactions.filter(
      (t) => t.type === "DEBT PAID" || t.type === "DEBT RECEIVED",
    );

    repayments.forEach((t) => {
      list.push({
        id: `payment-${t.id}`,
        type: "PAYMENT",
        timestamp: t.createdAt || t.date,
        payment: t,
      });
    });

    logs.forEach((l) => {
      list.push({
        id: `log-${l.id}`,
        type: "LOG",
        timestamp: l.createdAt,
        log: l,
      });
    });

    return list.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      return timeB - timeA;
    });
  }, [transactions, logs]);

  // Status computation
  const isLend = debt?.type === "LEND";
  const isSettledManually = debt?.state === "WRITTEN_OFF";
  const isRepaid = debt?.state === "REPAID";
  const isOngoing = debt?.state === "ONGOING";

  // Initial Loan Transaction to retrieve disbursement/deposit account
  const initialTx = useMemo(() => {
    return (
      transactions.find((t) => t.type === "LEND" || t.type === "BORROW") || null
    );
  }, [transactions]);

  const initialAccountName = useMemo(() => {
    if (!initialTx) return null;
    return initialTx.fromAssetName || initialTx.toAssetName || null;
  }, [initialTx]);

  // Amount Repaid Progress %
  const progressPercent = useMemo(() => {
    if (!debt || debt.amount <= 0) return 0;
    const pct = (debt.repaidAmount / debt.amount) * 100;
    return Math.min(Math.max(pct, 0), 100);
  }, [debt]);

  // Formatted Creation Date & Time (Parts for header display)
  const createdDateParts = useMemo(() => {
    if (!debt?.createdAt) return { date: "", time: "" };
    try {
      const datePart = formatDisplayDate(debt.createdAt.split("T")[0]);
      const d = new Date(debt.createdAt);
      if (isNaN(d.getTime())) return { date: datePart, time: "" };
      let hours = d.getHours();
      const minutes = d.getMinutes();
      const period = hours >= 12 ? "PM" : "AM";
      const hour12 = hours % 12 || 12;
      const h = String(hour12).padStart(2, "0");
      const m = String(minutes).padStart(2, "0");
      return {
        date: datePart,
        time: `${h}:${m} ${period}`,
      };
    } catch {
      return { date: "", time: "" };
    }
  }, [debt?.createdAt]);

  // Due Date Status & Time Left (Hour-based difference between debt created day and due date end hour)
  const dueDateInfo = useMemo(() => {
    if (!debt?.dueDate) return null;
    const today = getTodayYMD();
    const isPastDate = debt.dueDate < today;

    // Due date end is next day 00:00:00 (user has time until end of due date day)
    const dueParts = debt.dueDate.split("-").map((v) => parseInt(v, 10));
    const dueEndDate = new Date(
      dueParts[0],
      dueParts[1] - 1,
      dueParts[2] + 1,
      0,
      0,
      0,
      0,
    );

    let totalSpanHours = 24;
    let elapsedHours = 0;
    let timePercent = 0;

    if (debt.createdAt) {
      const createdRaw = new Date(debt.createdAt);
      // Debt created hour (ignore minutes and seconds)
      const startHourDate = !isNaN(createdRaw.getTime())
        ? new Date(
            createdRaw.getFullYear(),
            createdRaw.getMonth(),
            createdRaw.getDate(),
            createdRaw.getHours(),
            0,
            0,
            0,
          )
        : new Date(debt.createdAt.split("T")[0]);

      totalSpanHours = Math.max(
        1,
        (dueEndDate.getTime() - startHourDate.getTime()) / (1000 * 60 * 60),
      );

      // If debt is settled/written off, freeze elapsed time at settlement
      const isSettledOrWrittenOff = debt.state !== "ONGOING";
      let evalDate = new Date();
      if (isSettledOrWrittenOff) {
        const settleRaw = debt.settledAt || debt.updatedAt;
        if (settleRaw) {
          const s = new Date(settleRaw);
          if (!isNaN(s.getTime())) evalDate = s;
        }
      }

      elapsedHours = Math.max(
        0,
        (evalDate.getTime() - startHourDate.getTime()) / (1000 * 60 * 60),
      );
      timePercent = (elapsedHours / totalSpanHours) * 100;
    } else {
      timePercent = isPastDate ? 100 : 0;
    }

    const isOverdue = timePercent >= 100 || isPastDate;
    const clampedBarPercent = Math.min(100, Math.max(0, timePercent));

    const now = new Date();
    const diffHoursTotal = Math.round(
      (dueEndDate.getTime() - now.getTime()) / (1000 * 60 * 60),
    );
    const diffDays = Math.ceil(diffHoursTotal / 24);

    let text = "";
    if (isOverdue) {
      const daysAgo = Math.max(1, Math.abs(diffDays));
      text =
        daysAgo <= 1
          ? "Overdue today"
          : `Overdue by ${daysAgo} day${daysAgo > 1 ? "s" : ""}`;
    } else if (diffDays <= 1) {
      text = "Due today";
    } else {
      text = `${diffDays} day${diffDays > 1 ? "s" : ""} left`;
    }

    // Colors:
    // below 75% -> green
    // >= 75% && < 100% -> orange
    // >= 100% or overdue -> red
    let barColor = "bg-emerald-500";
    let textColor = "text-emerald-400";
    let iconColor = "#10B981";

    if (isOverdue) {
      barColor = "bg-rose-500";
      textColor = "text-rose-400";
      iconColor = "#F43F5E";
    } else if (timePercent >= 75) {
      barColor = "bg-amber-500";
      textColor = "text-amber-400";
      iconColor = "#F59E0B";
    }

    return {
      dueDate: debt.dueDate,
      formattedDate: formatDisplayDate(debt.dueDate),
      isExpired: isOverdue,
      diffDays,
      text,
      timePercent,
      clampedBarPercent,
      barColor,
      textColor,
      iconColor,
    };
  }, [debt]);

  // Modals State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isNotFoundDeleteOpen, setIsNotFoundDeleteOpen] = useState(false);

  // Write Off Fly-Up State
  const [isWriteOffOpen, setIsWriteOffOpen] = useState(false);
  const [selectedReason, setSelectedReason] = useState<string>(
    WRITE_OFF_PRESETS[0],
  );
  const [isCustomReason, setIsCustomReason] = useState(false);
  const [customReasonText, setCustomReasonText] = useState("");
  const [isSubmittingWriteOff, setIsSubmittingWriteOff] = useState(false);

  function handleOpenWriteOff() {
    setSelectedReason(WRITE_OFF_PRESETS[0]);
    setIsCustomReason(false);
    setCustomReasonText("");
    setIsWriteOffOpen(true);
  }

  async function handleConfirmWriteOff() {
    if (!debt) return;
    const finalReason = isCustomReason
      ? customReasonText.trim() || "Written off"
      : selectedReason;

    try {
      setIsSubmittingWriteOff(true);
      await settleDebtManually(debt.id, finalReason);
      setIsWriteOffOpen(false);
    } catch (err: any) {
      console.error("Write off debt error:", err);
      showAlert({
        title: "Error",
        message: err?.message || "Failed to write off debt.",
        type: "danger",
      });
    } finally {
      setIsSubmittingWriteOff(false);
    }
  }

  // Handle Debt Reopen (From Written Off state)
  const [isReopening, setIsReopening] = useState(false);

  async function handleReopenDebt() {
    if (!debt) return;
    try {
      setIsReopening(true);
      await toggleSettleManually(debt.id);
      showAlert({
        title: "Debt Reopened",
        message: "This debt is now active and ongoing.",
        type: "info",
      });
    } catch (err: any) {
      console.error("Reopen debt error:", err);
      showAlert({
        title: "Error",
        message: err?.message || "Could not reopen debt.",
        type: "danger",
      });
    } finally {
      setIsReopening(false);
    }
  }

  // Handle Debt Deletion
  async function handleConfirmDelete() {
    if (!debt) return;
    try {
      await deleteDebt(debt.id);
      setIsDeleteModalOpen(false);
      router.back();
    } catch (err: any) {
      console.error("Delete debt error:", err);
      showAlert({
        title: "Delete Failed",
        message: err?.message || "Could not delete debt.",
        type: "danger",
      });
    }
  }

  async function handleNotFoundDelete() {
    if (!debtId) return;
    try {
      await deleteDebt(debtId, true);
      setIsNotFoundDeleteOpen(false);
      router.back();
    } catch (err: any) {
      console.error("Delete not found debt error:", err);
      showAlert({
        title: "Delete Failed",
        message: err?.message || "Could not delete debt record.",
        type: "danger",
      });
    }
  }

  // Date formatter helper
  function formatTimestamp(ts: string) {
    try {
      const d = new Date(ts);
      if (isNaN(d.getTime())) return ts;
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return ts;
    }
  }

  if (!debt) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 bg-dark-bg justify-center items-center px-6"
      >
        <View className="w-16 h-16 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-4">
          <Ionicons name="receipt-outline" size={28} color="#94A3B8" />
        </View>
        <Text className="text-dark-text font-bold text-xl mb-2 text-center">
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
        {debtId ? (
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

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      {/* 1. Title Bar */}
      <View className="px-5 py-3 flex-row items-center justify-between border-b border-dark-border/40">
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-card"
        >
          <Ionicons name="chevron-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>

        <Text className="text-dark-text text-lg font-bold font-sans">
          Debt Details
        </Text>

        {/* 1. In title bar show bin if eligible to delete, otherwise don't show any other options */}
        {isOngoing && debt.repaymentCount === 0 ? (
          <TouchableOpacity
            onPress={() => setIsDeleteModalOpen(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-card"
          >
            <Ionicons name="trash-outline" size={18} color="#F43F5E" />
          </TouchableOpacity>
        ) : (
          <View className="w-10" />
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: isOngoing || isSettledManually ? 110 : 40,
          paddingHorizontal: 20,
        }}
        className="flex-1 pt-6"
      >
        {/* 2. Top Header Section */}
        <View className="mb-6">
          {/* Avatar on left side + Name and monochrome pencil on right */}
          {/* Avatar on left side + Name and Date/Time top right, Edit button below */}
          <View className="flex-row items-center mb-4">
            <ContactAvatar
              name={debt.contactName}
              avatarSvg={contact?.avatarSvg}
              size={50}
            />
            <View className="flex-1 ml-3.5">
              <View className="flex-row items-center justify-between">
                <Text
                  className="text-dark-text text-xl font-bold font-sans flex-1 mr-2"
                  numberOfLines={1}
                >
                  {debt.contactName}
                </Text>

                {/* Date top, time bottom (where edit button was) */}
                {createdDateParts.date ? (
                  <View className="items-end ml-2">
                    <Text className="text-dark-text text-xs font-semibold font-sans">
                      {createdDateParts.date}
                    </Text>
                    {createdDateParts.time ? (
                      <Text className="text-dark-muted text-[11px] font-medium font-sans mt-0.5">
                        {createdDateParts.time}
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Initial Amount in center */}
          <View className="items-center my-3">
            <Text className="text-4xl font-black text-brand-accent tracking-tight font-sans text-center">
              {formatCurrency(
                debt.amount,
                settings?.currency,
                settings?.numberFormat,
              )}
            </Text>

            {/* Note user given below amount at center */}
            {debt.note && debt.note.trim().length > 0 ? (
              <Text className="text-dark-muted text-sm font-medium text-center mt-1.5 px-6 leading-relaxed font-sans">
                {debt.note.trim()}
              </Text>
            ) : null}

            {isRepaid ? (
              <View className="flex-row items-center gap-1 mt-2">
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text className="text-emerald-400 text-xs font-bold font-sans">
                  Repaid in full
                </Text>
              </View>
            ) : isSettledManually ? (
              <View className="flex-row items-center gap-1 mt-2">
                <Ionicons name="information-circle" size={14} color="#F59E0B" />
                <Text className="text-amber-400 text-xs font-bold font-sans">
                  Written Off
                </Text>
              </View>
            ) : null}
          </View>

          {/* Amount Repaid Progress Bar (No card, no bg or borders) */}
          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-dark-muted text-xs font-medium font-sans">
                Repaid:{" "}
                <Text className="text-dark-text font-bold">
                  {formatCurrency(
                    debt.repaidAmount,
                    settings?.currency,
                    settings?.numberFormat,
                  )}
                </Text>
              </Text>
              <Text className="text-dark-muted text-xs font-medium font-sans">
                Remaining:{" "}
                <Text className="text-brand-accent font-bold">
                  {formatCurrency(
                    debt.remainingAmount,
                    settings?.currency,
                    settings?.numberFormat,
                  )}
                </Text>
              </Text>
            </View>
            <View className="h-2 bg-dark-surface rounded-full overflow-hidden w-full">
              <View
                style={{ width: `${progressPercent}%` }}
                className={`h-full rounded-full ${
                  isRepaid ? "bg-emerald-400" : "bg-brand-accent"
                }`}
              />
            </View>
          </View>

          {/* Due date / Time Left Bar (If no due date, show NOTHING, no card, no bg or borders) */}
          {dueDateInfo ? (
            <View className="mb-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-1.5">
                  <Ionicons
                    name={
                      dueDateInfo.isExpired && isOngoing
                        ? "alert-circle"
                        : "calendar-outline"
                    }
                    size={15}
                    color={
                      !isOngoing
                        ? isRepaid
                          ? "#10B981"
                          : "#F59E0B"
                        : dueDateInfo.iconColor
                    }
                  />
                  <Text
                    className={`text-xs font-bold font-sans ${
                      !isOngoing
                        ? isRepaid
                          ? "text-emerald-400"
                          : "text-amber-400"
                        : dueDateInfo.textColor
                    }`}
                  >
                    {!isOngoing
                      ? isRepaid
                        ? "Settled"
                        : "Written Off"
                      : dueDateInfo.text}
                  </Text>
                </View>
                <Text
                  className={`text-xs font-medium font-sans ${
                    dueDateInfo.isExpired && isOngoing
                      ? "text-rose-400/80"
                      : "text-dark-muted"
                  }`}
                >
                  Due {dueDateInfo.formattedDate}
                </Text>
              </View>
              <View className="h-2 bg-dark-surface rounded-full overflow-hidden w-full">
                <View
                  style={{
                    width: `${dueDateInfo.clampedBarPercent}%`,
                  }}
                  className={`h-full rounded-full ${
                    !isOngoing
                      ? isRepaid
                        ? "bg-emerald-400"
                        : "bg-amber-400"
                      : dueDateInfo.barColor
                  }`}
                />
              </View>
            </View>
          ) : null}
        </View>
        {/* Centered round edit button */}
        {isOngoing ? (
          <View className="items-center w-full">
            <TouchableOpacity
              onPress={() =>
                safePush(`/createdebt?debtId=${debt.id}&mode=edit`)
              }
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              className="w-8 h-8 rounded-full items-center justify-center bg-dark-surface/80 border border-dark-border active:bg-dark-card"
            >
              <Ionicons name="pencil" size={14} color="#e8e9e5ff" />
            </TouchableOpacity>
          </View>
        ) : null}
        {/* 3. Payment History Section */}
        <View className="mt-2">
          <Text className="text-dark-text font-bold text-base mb-3 font-sans">
            Payment History
          </Text>

          {timelineItems.length === 0 ? (
            <View className="py-8 bg-dark-surface/50 rounded-2xl border border-dark-border/60 items-center justify-center">
              <Text className="text-dark-muted text-xs font-sans">
                No payments or activity recorded yet.
              </Text>
            </View>
          ) : (
            <View className="gap-3">
              {timelineItems.map((item) => {
                // Payment Card: Use TransactionCard with red border if paid after due date
                if (item.type === "PAYMENT" && item.payment) {
                  const p = item.payment;
                  const txItem: TransactionItem = {
                    id: p.id,
                    amount: p.amount,
                    type: p.type as any,
                    date: p.date,
                    note: p.note,
                    fromAssetId: p.fromAssetId,
                    toAssetId: p.toAssetId,
                    fromAssetName: p.fromAssetName,
                    toAssetName: p.toAssetName,
                    contactId: debt.contactId,
                    contactName: debt.contactName,
                    debtId: debt.id,
                    categoryId: null,
                    categoryName: null,
                    categoryIcon: null,
                    categoryColor: null,
                    dueDate: null,
                    createdAt: p.createdAt,
                    updatedAt: p.createdAt,
                  };

                  const isLatePayment = Boolean(
                    debt.dueDate && p.date && p.date > debt.dueDate,
                  );

                  return (
                    <TransactionCard
                      key={item.id}
                      transaction={txItem}
                      isLate={isLatePayment}
                      onPress={() => {
                        safePush(
                          `/createdebt?debtId=${debt.id}&txId=${p.id}&mode=preview&from=debt`,
                        );
                      }}
                    />
                  );
                }

                // Debt Log: Clean centered text (no borders, no accents, no icons)
                if (item.type === "LOG" && item.log) {
                  const l = item.log;
                  if (l.type === "AMOUNT_CHANGED") {
                    const oldStr = formatCurrency(
                      l.oldAmount || 0,
                      settings?.currency,
                      settings?.numberFormat,
                    );
                    const newStr = formatCurrency(
                      l.newAmount || 0,
                      settings?.currency,
                      settings?.numberFormat,
                    );
                    return (
                      <View
                        key={item.id}
                        className="py-2.5 items-center justify-center px-4"
                      >
                        <Text className="text-dark-muted text-xs text-center font-sans">
                          Amount {oldStr} was changed to {newStr} at{" "}
                          {formatTimestamp(l.createdAt)}
                        </Text>
                      </View>
                    );
                  }

                  if (l.type === "SETTLED_MANUALLY") {
                    return (
                      <View
                        key={item.id}
                        className="py-2.5 items-center justify-center px-4"
                      >
                        <Text className="text-dark-muted text-xs text-center font-sans">
                          This debt was settled manually at{" "}
                          {formatTimestamp(l.createdAt)}
                          {l.note ? ` for "${l.note}"` : ""}
                        </Text>
                      </View>
                    );
                  }
                }

                return null;
              })}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 4. Bottom Action Bar:
          - If Ongoing: Left = Write Off, Right = Add Payment
          - If Written Off: Full-width Reopen Debt button
      */}
      {isOngoing ? (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-dark-bg/95 border-t border-dark-border/40 flex-row gap-3">
          {/* Left: Write Off Button */}
          <TouchableOpacity
            onPress={handleOpenWriteOff}
            activeOpacity={0.8}
            className="flex-1 py-4 rounded-2xl bg-dark-card border border-amber-500/30 items-center justify-center active:bg-dark-surface"
          >
            <Text className="text-amber-400 font-bold text-base font-sans">
              Write Off
            </Text>
          </TouchableOpacity>

          {/* Right: Add Payment Button */}
          <TouchableOpacity
            onPress={() =>
              safePush(`/createdebt?debtId=${debt.id}&mode=payment`)
            }
            activeOpacity={0.8}
            className="flex-1 py-4 rounded-2xl bg-brand-accent items-center justify-center shadow-lg active:opacity-90"
          >
            <Text className="text-dark-bg font-extrabold text-base tracking-wide font-sans">
              Add Payment
            </Text>
          </TouchableOpacity>
        </View>
      ) : isSettledManually ? (
        <View className="absolute bottom-0 left-0 right-0 p-5 bg-dark-bg/95 border-t border-dark-border/40">
          <TouchableOpacity
            onPress={handleReopenDebt}
            disabled={isReopening}
            activeOpacity={0.8}
            className="w-full py-4 rounded-2xl bg-dark-card border border-brand-accent/50 items-center justify-center flex-row gap-2 active:bg-dark-surface"
          >
            {isReopening ? (
              <ActivityIndicator size="small" color="#FACC15" />
            ) : (
              <>
                <Ionicons name="refresh-outline" size={18} color="#FACC15" />
                <Text className="text-brand-accent font-bold text-base font-sans">
                  Reopen Debt
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {/* --- FLY-UP: Write Off Debt --- */}
      <HawkFlyUp
        visible={isWriteOffOpen}
        onClose={() => setIsWriteOffOpen(false)}
        title="Write Off Debt"
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="px-1 pb-4"
        >
          {!isCustomReason ? (
            <View>
              <Text className="text-dark-muted text-xs mb-3 font-sans">
                Select a reason for writing off the remaining balance of{" "}
                <Text className="text-dark-text font-sans ">
                  {formatCurrency(
                    debt.remainingAmount,
                    settings?.currency,
                    settings?.numberFormat,
                  )}
                </Text>
                , This cannot be undone.
              </Text>

              <View className="gap-2.5 mb-5">
                {WRITE_OFF_PRESETS.map((reason) => {
                  const isSelected = selectedReason === reason;
                  return (
                    <TouchableOpacity
                      key={reason}
                      onPress={() => setSelectedReason(reason)}
                      activeOpacity={0.7}
                      className={`flex-row items-center p-3.5 rounded-2xl border ${
                        isSelected
                          ? "bg-dark-surface border-brand-accent/70"
                          : "bg-dark-card/50 border-dark-border/60"
                      }`}
                    >
                      <View
                        className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                          isSelected
                            ? "border-brand-accent"
                            : "border-dark-muted"
                        }`}
                      >
                        {isSelected ? (
                          <View className="w-2.5 h-2.5 rounded-full bg-brand-accent" />
                        ) : null}
                      </View>
                      <Text
                        className={`text-sm font-sans flex-1 ${
                          isSelected
                            ? "text-dark-text font-bold"
                            : "text-dark-muted font-medium"
                        }`}
                      >
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {/* 6th Option: Custom Reason */}
                <TouchableOpacity
                  onPress={() => setIsCustomReason(true)}
                  activeOpacity={0.7}
                  className="flex-row items-center p-3.5 rounded-2xl border bg-dark-card/50 border-dark-border/60"
                >
                  <View className="w-5 h-5 rounded-full border-2 border-dark-muted mr-3 items-center justify-center" />
                  <Text className="text-sm font-sans text-dark-muted font-medium flex-1">
                    Custom Reason...
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color="#60677C" />
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View className="mb-5">
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-dark-text font-bold text-sm font-sans">
                  Custom Reason
                </Text>
                <TouchableOpacity
                  onPress={() => setIsCustomReason(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text className="text-brand-accent text-xs font-semibold font-sans">
                    Back to presets
                  </Text>
                </TouchableOpacity>
              </View>

              <TextInput
                value={customReasonText}
                onChangeText={setCustomReasonText}
                placeholder="Enter custom reason for write off..."
                placeholderTextColor="#60677C"
                multiline={true}
                numberOfLines={3}
                autoFocus={true}
                className="bg-dark-surface p-4 rounded-2xl border border-dark-border text-dark-text text-sm font-sans min-h-[90px]"
                textAlignVertical="top"
              />
            </View>
          )}

          {/* Confirm Button */}
          <TouchableOpacity
            onPress={handleConfirmWriteOff}
            disabled={isSubmittingWriteOff}
            activeOpacity={0.8}
            className="w-full py-4 rounded-2xl bg-amber-500 items-center justify-center shadow-lg active:opacity-90"
          >
            <Text className="text-dark-bg font-extrabold text-base tracking-wide font-sans">
              {isSubmittingWriteOff ? "Processing..." : "Confirm Write Off"}
            </Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </HawkFlyUp>

      {/* Confirmation Modal for Debt Delete */}
      <HawkAlertModal
        visible={isDeleteModalOpen}
        title="Delete Debt"
        message={
          (debt?.repaymentCount ?? 0) > 0
            ? `This debt has ${debt?.repaymentCount} recorded repayment${
                (debt?.repaymentCount ?? 0) > 1 ? "s" : ""
              } totaling ${formatCurrency(
                debt?.repaidAmount ?? 0,
                settings?.currency,
                settings?.numberFormat,
              )}. Deleting this debt will also delete all repayments and restore the funds to their respective accounts.`
            : "Are you sure you want to delete this debt? The initial transaction will be reversed and the account balance will be restored."
        }
        type="danger"
        buttons={[
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => setIsDeleteModalOpen(false),
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: handleConfirmDelete,
          },
        ]}
        onClose={() => setIsDeleteModalOpen(false)}
      />
    </SafeAreaView>
  );
}
