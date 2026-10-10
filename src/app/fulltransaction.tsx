import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../components/ScreenHeader";
import { CreateTransaction } from "../components/transactions/CreateTransaction";
import { EditTransaction } from "../components/transactions/EditTransaction";
import { TransactionCard } from "../components/transactions/TransactionCard";
import { useAccounts } from "../context/accounts";
import {
  TransactionItem,
  useTransactions,
} from "../context/transactions";

export default function FullTransactionScreen() {
  const router = useRouter();
  const { transactions } = useTransactions();
  const { accounts } = useAccounts();

  const [selectedFilter, setSelectedFilter] = useState("ALL");
  const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TransactionItem | null>(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Type filter
      if (selectedFilter === "INCOME" && t.type !== "INCOME") return false;
      if (selectedFilter === "EXPENSE" && t.type !== "EXPENSE") return false;
      if (selectedFilter === "TRANSFER" && t.type !== "TRANSFER") return false;
      if (
        selectedFilter === "DEBTS" &&
        !["LEND", "BORROW", "DEBT PAID", "DEBT RECEIVED"].includes(t.type)
      ) {
        return false;
      }

      // Asset filter
      if (
        selectedAssetId !== null &&
        t.fromAssetId !== selectedAssetId &&
        t.toAssetId !== selectedAssetId
      ) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNote = t.note?.toLowerCase().includes(q);
        const matchesCategory = t.categoryName?.toLowerCase().includes(q);
        const matchesContact = t.contactName?.toLowerCase().includes(q);
        const matchesAmount = String(t.amount).includes(q);
        if (!matchesNote && !matchesCategory && !matchesContact && !matchesAmount) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, selectedFilter, selectedAssetId, searchQuery]);

  // Group by date
  const groupedByDate = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000)
      .toISOString()
      .split("T")[0];

    const groups: { [date: string]: TransactionItem[] } = {};
    for (const t of filteredTransactions) {
      if (!groups[t.date]) {
        groups[t.date] = [];
      }
      groups[t.date].push(t);
    }

    return Object.entries(groups).map(([dateStr, items]) => {
      let label = dateStr;
      if (dateStr === today) label = "Today";
      else if (dateStr === yesterday) label = "Yesterday";

      return { label, dateStr, items };
    });
  }, [filteredTransactions]);

  const selectedAccountName = useMemo(() => {
    if (selectedAssetId === null) return "All Liquid Assets";
    const found = accounts.find((a) => a.id === selectedAssetId);
    return found ? found.name : "All Liquid Assets";
  }, [accounts, selectedAssetId]);

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
      {/* Top Header */}
      <ScreenHeader
        title="Transactions"
        rightElement={
          <View className="flex-row items-center gap-2">
            <TouchableOpacity
              onPress={() => setShowSearch(!showSearch)}
              className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="search" size={18} color="#F8FAFC" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsCreateOpen(true)}
              className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center"
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={22} color="#0B0D12" />
            </TouchableOpacity>
          </View>
        }
      />

      {/* Optional Search Bar */}
      {showSearch && (
        <View className="px-5 pt-3">
          <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-2.5 flex-row items-center gap-2">
            <Ionicons name="search" size={18} color="#60677C" />
            <TextInput
              placeholder="Search by note, category, contact..."
              placeholderTextColor="#60677C"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-dark-text text-sm py-0"
              autoFocus
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={18} color="#60677C" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      )}

      {/* Account Selector Pill Badge */}
      <View className="px-5 my-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="flex-row gap-2"
        >
          <TouchableOpacity
            onPress={() => setSelectedAssetId(null)}
            className={`px-3.5 py-1.5 rounded-full border flex-row items-center gap-1.5 ${
              selectedAssetId === null
                ? "bg-dark-surface border-brand-accent"
                : "bg-dark-surface/60 border-dark-border"
            }`}
          >
            <View
              className={`w-2 h-2 rounded-full ${
                selectedAssetId === null ? "bg-brand-accent" : "bg-dark-muted"
              }`}
            />
            <Text
              className={`text-xs font-bold ${
                selectedAssetId === null
                  ? "text-brand-accent"
                  : "text-dark-muted"
              }`}
            >
              All Assets
            </Text>
          </TouchableOpacity>

          {accounts.map((a) => (
            <TouchableOpacity
              key={a.id}
              onPress={() => setSelectedAssetId(a.id)}
              className={`px-3.5 py-1.5 rounded-full border flex-row items-center gap-1.5 ${
                selectedAssetId === a.id
                  ? "bg-dark-surface border-brand-accent"
                  : "bg-dark-surface/60 border-dark-border"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedAssetId === a.id
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

      {/* Transaction Type Filter Pills */}
      <View className="px-5 mb-3">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="gap-2 flex-row"
        >
          {["ALL", "INCOME", "EXPENSE", "TRANSFER", "DEBTS"].map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSelectedFilter(tab)}
              className={`px-3.5 py-1.5 rounded-full border ${
                selectedFilter === tab
                  ? "bg-brand-accent border-brand-accent"
                  : "bg-dark-surface border-dark-border"
              }`}
              activeOpacity={0.7}
            >
              <Text
                className={`text-xs font-bold ${
                  selectedFilter === tab ? "text-dark-bg" : "text-dark-muted"
                }`}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Grouped Transaction List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
        className="flex-1 px-5"
      >
        {groupedByDate.length === 0 ? (
          <TouchableOpacity
            onPress={() => setIsCreateOpen(true)}
            activeOpacity={0.7}
            className="bg-dark-surface border border-dashed border-dark-border p-8 rounded-2xl items-center justify-center mt-6"
          >
            <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2.5">
              <Ionicons name="receipt-outline" size={22} color="#F8FAFC" />
            </View>
            <Text className="text-dark-text font-bold text-sm">
              No Transactions Found
            </Text>
            <Text className="text-dark-muted text-xs mt-1 text-center">
              Tap + to record your first income, expense, or transfer
            </Text>
          </TouchableOpacity>
        ) : (
          groupedByDate.map((group) => (
            <View key={group.dateStr} className="mb-4">
              <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2.5">
                {group.label}
              </Text>
              <View className="space-y-2.5 gap-2.5">
                {group.items.map((tx) => (
                  <TransactionCard
                    key={tx.id}
                    transaction={tx}
                    onPress={() => setSelectedTx(tx)}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Transaction Modal */}
      <CreateTransaction
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Edit / View Transaction Modal */}
      <EditTransaction
        visible={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        transaction={selectedTx}
      />
    </SafeAreaView>
  );
}
