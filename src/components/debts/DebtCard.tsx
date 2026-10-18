import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { ContactAvatar } from "../ContactAvatar";
import { useAuth } from "../../context/auth";
import { useContacts } from "../../context/contacts";
import { DebtItem } from "../../context/debts";
import { formatCurrency } from "../../services/currency";

interface DebtCardProps {
  debt: DebtItem;
  onPress?: () => void;
}

export function DebtCard({ debt, onPress }: DebtCardProps) {
  const { settings } = useAuth();
  const { contacts } = useContacts();

  const contact = contacts.find((c) => c.id === debt.contactId);
  const isLend = debt.type === "LEND";

  // Progress percentage (0 - 100)
  const progress = Math.min(100, Math.max(0, debt.progressPercent));

  // Calculate dynamic due date status (returns null if no due date)
  const dueStatus = useMemo(() => {
    if (debt.isSettled) {
      return {
        text: "Settled",
        colorClass: "text-emerald-400 font-semibold",
      };
    }

    if (!debt.dueDate) {
      return null;
    }

    const dueTime = new Date(`${debt.dueDate}T23:59:59`).getTime();
    const now = Date.now();
    const diffMs = dueTime - now;

    // Expired
    if (diffMs <= 0) {
      return {
        text: "Due date expired",
        colorClass: "text-brand-expense font-bold",
      };
    }

    const oneHourMs = 60 * 60 * 1000;
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Less than 1 hour left
    if (diffMs < oneHourMs) {
      return {
        text: "Due in less than 1 hour",
        colorClass: "text-brand-lend font-bold",
      };
    }

    // Less than 1 day left -> show hours in orange
    if (diffMs < oneDayMs) {
      const hours = Math.ceil(diffMs / oneHourMs);
      return {
        text: `Due in ${hours} ${hours === 1 ? "hour" : "hours"}`,
        colorClass: "text-brand-lend font-bold",
      };
    }

    // 1 day or more
    const days = Math.ceil(diffMs / oneDayMs);
    return {
      text: `${days} ${days === 1 ? "day" : "days"} left`,
      colorClass: "text-dark-muted font-medium",
    };
  }, [debt.dueDate, debt.isSettled]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="bg-dark-surface p-4 rounded-3xl border border-dark-border active:bg-dark-card mb-3"
    >
      {/* Top Header: Avatar + Main Title ("Lent to / Borrowed from <Contact>") on Left, Days Left on Right */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-3.5 flex-1 mr-3">
          <ContactAvatar
            name={debt.contactName}
            avatarSvg={contact?.avatarSvg}
            size={42}
          />
          <View className="flex-1">
            {/* Main Title matching TransactionCard main title font size (text-base font-bold leading-5) */}
            <Text
              className="text-dark-text font-bold text-base leading-5 tracking-tight"
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {isLend
                ? `Lent to ${debt.contactName}`
                : `Borrowed from ${debt.contactName}`}
            </Text>
          </View>
        </View>

        {/* Right: Days left (replaces remaining amount, no calendar icon, nothing if no due date) */}
        {dueStatus ? (
          <View className="items-end min-w-[70px]">
            <Text className={`text-xs ${dueStatus.colorClass}`}>
              {dueStatus.text}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Progress & Amount (Remaining on left, repaid / total on right) */}
      <View className="mt-1">
        <View className="flex-row items-center justify-between mb-1.5">
          {/* Replaced % repaid with amount remaining */}
          <Text className="text-dark-muted font-medium text-xs">
            {debt.isSettled
              ? "Settled"
              : `${formatCurrency(
                  debt.remainingAmount,
                  settings?.currency,
                  settings?.numberFormat
                )} remaining`}
          </Text>

          {/* Numbers: repaid / total */}
          <Text className="text-dark-text font-bold text-xs tracking-tight">
            {formatCurrency(
              debt.repaidAmount,
              settings?.currency,
              settings?.numberFormat
            )}{" "}
            /{" "}
            {formatCurrency(
              debt.amount,
              settings?.currency,
              settings?.numberFormat
            )}
          </Text>
        </View>

        {/* Progress Bar with assigned colors: LEND = Amber, BORROW = Purple */}
        <View className="w-full bg-dark-card h-2 rounded-full overflow-hidden">
          <View
            className={`h-full rounded-full ${
              isLend ? "bg-brand-lend" : "bg-brand-borrow"
            }`}
            style={{ width: `${progress}%` }}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}
