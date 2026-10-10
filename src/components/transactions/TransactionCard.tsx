import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../../context/auth";
import { TransactionItem } from "../../context/transactions";
import { formatCurrency } from "../../services/currency";

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

  // Icon configuration
  let iconName: any = (transaction.categoryIcon as any) || "receipt-outline";
  let iconColor = "#F8FAFC";
  let amountClass = "text-dark-text";
  let sign = "";

  if (isIncome) {
    iconName = (transaction.categoryIcon as any) || "arrow-down";
    iconColor = "#22C55E";
    amountClass = "text-brand-income";
    sign = "+";
  } else if (isExpense) {
    iconName = (transaction.categoryIcon as any) || "arrow-up";
    iconColor = "#F43F5E";
    amountClass = "text-brand-expense";
    sign = "-";
  } else if (isTransfer) {
    iconName = "swap-horizontal";
    iconColor = "#38BDF8";
    amountClass = "text-brand-transfer";
    sign = "";
  }

  if (transaction.type === "LEND") {
    iconName = "arrow-up";
    iconColor = "#F59E0B";
    amountClass = "text-brand-lend";
    sign = "-";
  } else if (transaction.type === "BORROW") {
    iconName = "arrow-down";
    iconColor = "#A855F7";
    amountClass = "text-brand-borrow";
    sign = "+";
  } else if (transaction.type === "DEBT RECEIVED") {
    iconName = "repeat";
    iconColor = "#F59E0B";
    amountClass = "text-brand-lend";
    sign = "+";
  } else if (transaction.type === "DEBT PAID") {
    iconName = "repeat";
    iconColor = "#A855F7";
    amountClass = "text-brand-borrow";
    sign = "-";
  }

  // Primary label
  let title = transaction.note || "Transaction";
  if (isTransfer) {
    title = `${transaction.fromAssetName || "Account"} → ${
      transaction.toAssetName || "Account"
    }`;
  } else if (transaction.contactName) {
    title = transaction.contactName;
  } else if (transaction.categoryName) {
    title = transaction.categoryName;
  }

  // Secondary subtitle
  let subtitle = transaction.date;
  if (isTransfer) {
    subtitle = `Transfer • ${transaction.date}`;
  } else if (transaction.categoryName && transaction.contactName) {
    subtitle = `${transaction.categoryName} • ${transaction.fromAssetName || transaction.toAssetName || ""}`;
  } else if (transaction.fromAssetName) {
    subtitle = `${transaction.fromAssetName} • ${transaction.date}`;
  } else if (transaction.toAssetName) {
    subtitle = `${transaction.toAssetName} • ${transaction.date}`;
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
      className="bg-dark-surface p-3.5 rounded-2xl border border-dark-border flex-row items-center justify-between"
    >
      <View className="flex-row items-center gap-3 flex-1 mr-2">
        <View className="w-10 h-10 rounded-full bg-dark-card items-center justify-center border border-dark-border">
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
        <View className="flex-1">
          <Text className="text-dark-text font-bold text-sm" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-dark-muted text-xs" numberOfLines={1}>
            {subtitle}
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
