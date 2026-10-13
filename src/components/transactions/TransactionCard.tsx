import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/auth";
import { TransactionItem } from "../../context/transactions";
import { formatCurrency } from "../../services/currency";
import { formatDisplayDate, getTodayYMD } from "../calendar";

interface TransactionCardProps {
  transaction: TransactionItem;
  onPress?: () => void;
}

export function TransactionCard({
  transaction,
  onPress,
}: TransactionCardProps) {
  const { settings } = useAuth();

  const isIncome =
    transaction.type === "INCOME" ||
    transaction.type === "BORROW" ||
    transaction.type === "DEBT RECEIVED";

  const isExpense =
    transaction.type === "EXPENSE" ||
    transaction.type === "LEND" ||
    transaction.type === "DEBT PAID";

  const isTransfer = transaction.type === "TRANSFER";

  // Category Icon configuration (white icon on dark circular badge)
  let iconName: any = (transaction.categoryIcon as any) || "receipt-outline";

  if (isTransfer) {
    iconName = "swap-horizontal";
  } else if (transaction.categoryIcon) {
    iconName = transaction.categoryIcon as any;
  } else if (isIncome) {
    iconName = "arrow-down";
  } else if (isExpense) {
    iconName = "arrow-up";
  }

  // Amount sign and styling
  let amountClass = "text-dark-text";
  let sign = "";
  let iconColor = "#F43F5E"; // Vibrant coral red (default expense)

  if (transaction.categoryColor) {
    iconColor = transaction.categoryColor;
  } else if (isIncome) {
    iconColor = "#22C55E";
  } else if (isExpense) {
    iconColor = "#F43F5E";
  } else if (isTransfer) {
    iconColor = "#38BDF8";
  }

  if (isIncome) {
    amountClass = "text-brand-income";
    sign = "+";
  } else if (isExpense) {
    amountClass = "text-brand-expense";
    sign = "-";
  } else if (isTransfer) {
    amountClass = "text-brand-transfer";
    sign = "";
  }

  if (transaction.type === "LEND" || transaction.type === "DEBT PAID") {
    amountClass = "text-brand-lend";
    sign = "-";
    if (!transaction.categoryColor) iconColor = "#F59E0B";
  } else if (
    transaction.type === "BORROW" ||
    transaction.type === "DEBT RECEIVED"
  ) {
    amountClass = "text-brand-borrow";
    sign = "+";
    if (!transaction.categoryColor) iconColor = "#A855F7";
  }

  // Main text: Account name (or names for transfer)
  const mainText = useMemo(() => {
    if (isTransfer) {
      const from = transaction.fromAssetName || "Account";
      const to = transaction.toAssetName || "Account";
      return `${from} → ${to}`;
    }
    return (
      transaction.fromAssetName ||
      transaction.toAssetName ||
      "Account"
    );
  }, [
    isTransfer,
    transaction.fromAssetName,
    transaction.toAssetName,
  ]);

  // Subtitle: Date below main text
  const displayDate = useMemo(() => {
    if (!transaction.date) return "";
    const today = getTodayYMD();
    if (transaction.date === today) return "Today";
    return formatDisplayDate(transaction.date);
  }, [transaction.date]);

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between"
    >
      <View className="flex-row items-center gap-3 flex-1 mr-3">
        <View className="w-11 h-11 rounded-full bg-dark-card items-center justify-center border border-dark-border">
          <Ionicons name={iconName} size={20} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-dark-text font-bold text-sm" numberOfLines={1}>
            {mainText}
          </Text>
          <Text className="text-dark-muted text-xs mt-0.5" numberOfLines={1}>
            {displayDate}
          </Text>
        </View>
      </View>

      <Text className={`font-bold text-base ${amountClass}`}>
        {sign}
        {formatCurrency(
          transaction.amount,
          settings?.currency,
          settings?.numberFormat
        )}
      </Text>
    </TouchableOpacity>
  );
}

export default TransactionCard;
