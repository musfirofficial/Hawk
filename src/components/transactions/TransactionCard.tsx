import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/auth";
import { TransactionItem } from "../../context/transactions";
import { formatCurrency } from "../../services/currency";
import { getTodayYMD } from "../calendar";

interface TransactionCardProps {
  transaction: TransactionItem;
  onPress?: () => void;
}

export function TransactionCard({
  transaction,
  onPress,
}: TransactionCardProps) {
  const { settings } = useAuth();

  const isIncome = transaction.type === "INCOME";
  const isExpense = transaction.type === "EXPENSE";
  const isTransfer = transaction.type === "TRANSFER";
  const isLend =
    transaction.type === "LEND" || transaction.type === "DEBT PAID";
  const isBorrow =
    transaction.type === "BORROW" || transaction.type === "DEBT RECEIVED";

  // Category Icon configuration (colored icon on dark circular badge)
  let iconName: any = (transaction.categoryIcon as any) || "receipt-outline";

  if (isTransfer) {
    iconName = "swap-horizontal";
  } else if (transaction.categoryIcon) {
    iconName = transaction.categoryIcon as any;
  } else if (isIncome) {
    iconName = "arrow-down";
  } else if (isExpense) {
    iconName = "arrow-up";
  } else if (isLend) {
    iconName = "arrow-up-circle-outline";
  } else if (isBorrow) {
    iconName = "arrow-down-circle-outline";
  }

  // Icon Color & Amount Styling
  let iconColor = "#F43F5E";
  let amountClass = "text-brand-expense";
  let sign = "-";

  if (isIncome) {
    iconColor = transaction.categoryColor || "#22C55E";
    amountClass = "text-brand-income";
    sign = "+";
  } else if (isExpense) {
    iconColor = transaction.categoryColor || "#F43F5E";
    amountClass = "text-brand-expense";
    sign = "-";
  } else if (isTransfer) {
    iconColor = "#38BDF8";
    amountClass = "text-brand-transfer";
    sign = "";
  } else if (isLend) {
    iconColor = "#F59E0B";
    amountClass = "text-brand-lend";
    sign = "-";
  } else if (isBorrow) {
    iconColor = "#A855F7";
    amountClass = "text-brand-borrow";
    sign = "+";
  }

  // 1. Title calculation
  const title = useMemo(() => {
    let raw = "";
    if (isTransfer) {
      const toName = transaction.toAssetName || "Account";
      raw = `Transfer to ${toName}`;
    } else if (isLend) {
      const contact = transaction.contactName || "Contact";
      raw = `Given to ${contact}`;
    } else if (isBorrow) {
      const contact = transaction.contactName || "Contact";
      raw = `Received from ${contact}`;
    } else {
      raw =
        transaction.categoryName ||
        (isIncome ? "Income" : "Expense");
    }

    if (raw.length > 28) {
      return `${raw.slice(0, 28).trim()}...`;
    }
    return raw;
  }, [
    isTransfer,
    isLend,
    isBorrow,
    transaction.toAssetName,
    transaction.contactName,
    transaction.categoryName,
    isIncome,
  ]);

  // 2. Subtext calculation (Account name / source / destination)
  const subText = useMemo(() => {
    let raw = "";
    if (isTransfer) {
      if (transaction.fromAssetName) {
        raw = `From ${transaction.fromAssetName}`;
      } else {
        raw = `to ${transaction.toAssetName || "Account"}`;
      }
    } else if (isLend) {
      // Where it was given from
      raw = transaction.fromAssetName || "Account";
    } else if (isBorrow) {
      // Where it is stored
      raw =
        transaction.toAssetName ||
        transaction.fromAssetName ||
        "Account";
    } else {
      // Normal transaction account name
      raw =
        transaction.fromAssetName ||
        transaction.toAssetName ||
        "Account";
    }

    if (raw.length > 30) {
      return `${raw.slice(0, 30).trim()}...`;
    }
    return raw;
  }, [
    isTransfer,
    isLend,
    isBorrow,
    transaction.fromAssetName,
    transaction.toAssetName,
  ]);

  // 3. Date & Time calculation (Formatted as "Today • 09:00" or "17 Sep • 10:34")
  const displayDateTime = useMemo(() => {
    let datePart = "";
    const today = getTodayYMD();

    if (transaction.date === today) {
      datePart = "Today";
    } else if (transaction.date) {
      const yesterdayDate = new Date();
      yesterdayDate.setDate(yesterdayDate.getDate() - 1);
      const yesterdayYMD = yesterdayDate.toISOString().split("T")[0];

      if (transaction.date === yesterdayYMD) {
        datePart = "Yesterday";
      } else {
        try {
          const parts = transaction.date.split("-");
          if (parts.length === 3) {
            const d = new Date(
              parseInt(parts[0], 10),
              parseInt(parts[1], 10) - 1,
              parseInt(parts[2], 10)
            );
            datePart = d.toLocaleDateString("en-US", {
              day: "numeric",
              month: "short",
            });
          } else {
            datePart = transaction.date;
          }
        } catch {
          datePart = transaction.date;
        }
      }
    }

    let timePart = "";
    if (transaction.createdAt) {
      try {
        const d = new Date(
          transaction.createdAt.includes("T")
            ? transaction.createdAt
            : transaction.createdAt.replace(" ", "T") + "Z"
        );
        if (!isNaN(d.getTime())) {
          const hours = d.getHours().toString().padStart(2, "0");
          const minutes = d.getMinutes().toString().padStart(2, "0");
          timePart = `${hours}:${minutes}`;
        }
      } catch {}
    }

    if (datePart && timePart) {
      return `${datePart} • ${timePart}`;
    }
    return datePart || timePart || "";
  }, [transaction.date, transaction.createdAt]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between"
    >
      {/* Left: Circular Icon Badge */}
      <View className="flex-row items-center gap-3.5 flex-1 mr-3">
        <View className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center">
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>

        {/* Center: Title & Subtext */}
        <View className="flex-1">
          <Text
            className="text-dark-text font-bold text-base leading-5"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {title}
          </Text>
          <Text
            className="text-dark-muted font-medium text-xs mt-1 leading-4"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {subText}
          </Text>
        </View>
      </View>

      {/* Right: Colored Amount on Row 1, Date & Time on Row 2 */}
      <View className="items-end min-w-[85px]">
        <Text
          className={`font-bold text-base tracking-tight ${amountClass}`}
          numberOfLines={1}
        >
          {sign}
          {formatCurrency(
            transaction.amount,
            settings?.currency,
            settings?.numberFormat
          )}
        </Text>
        {displayDateTime ? (
          <Text className="text-dark-muted font-medium text-xs mt-1">
            {displayDateTime}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export default TransactionCard;
