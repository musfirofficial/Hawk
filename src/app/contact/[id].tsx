import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContactAvatar } from "../../components/ContactAvatar";
import { Editcontact } from "../../components/contacts/Editcontact";
import { useAlert } from "../../context/alert";
import { useAuth } from "../../context/auth";
import { useContacts } from "../../context/contacts";
import { useDebts } from "../../context/debts";
import { useSecurityGuard } from "../../context/security";
import { useTransactions } from "../../context/transactions";
import { useSafeRouter } from "../../hooks/useSafeRouter";
import { formatCurrency } from "../../services/currency";

export default function ContactDetailScreen() {
  const router = useSafeRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const contactId = id ? parseInt(id, 10) : null;

  const { contacts, deleteContact } = useContacts();
  const { transactions } = useTransactions();
  const { debts } = useDebts();
  const { settings } = useAuth();
  const { showAlert, showConfirm } = useAlert();
  const { requireSecurityAuth } = useSecurityGuard();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const contact = useMemo(() => {
    if (!contactId) return null;
    return contacts.find((c) => c.id === contactId) || null;
  }, [contacts, contactId]);

  // Transactions linked to this contact
  const contactTransactions = useMemo(() => {
    if (!contactId) return [];
    return transactions.filter((t) => t.contactId === contactId);
  }, [transactions, contactId]);

  // Debts linked to this contact
  const contactDebts = useMemo(() => {
    if (!contactId) return [];
    return debts.filter((d) => d.contactId === contactId);
  }, [debts, contactId]);

  // 1. Transaction stats (only calculated with Income and Expense, excluding debts)
  const regularTransactions = useMemo(() => {
    return contactTransactions.filter(
      (t) => t.type === "INCOME" || t.type === "EXPENSE",
    );
  }, [contactTransactions]);

  const totalTransactionsCount = regularTransactions.length;

  // 2. Income breakdown (category-wise)
  const incomeBreakdown = useMemo(() => {
    const incomeTxns = contactTransactions.filter((t) => t.type === "INCOME");
    const totalIncome = incomeTxns.reduce((acc, t) => acc + (t.amount || 0), 0);

    const categoryMap = new Map<
      string,
      {
        categoryId: number | null;
        categoryName: string;
        categoryIcon: string | null;
        count: number;
        total: number;
      }
    >();

    for (const t of incomeTxns) {
      const key = t.categoryId
        ? String(t.categoryId)
        : `name_${t.categoryName || "Uncategorized"}`;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.count += 1;
        existing.total += t.amount;
      } else {
        categoryMap.set(key, {
          categoryId: t.categoryId,
          categoryName: t.categoryName || "Uncategorized",
          categoryIcon: t.categoryIcon || "pricetag-outline",
          count: 1,
          total: t.amount,
        });
      }
    }

    const categories = Array.from(categoryMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    return {
      totalIncome,
      count: incomeTxns.length,
      categories,
    };
  }, [contactTransactions]);

  // 3. Expense breakdown (category-wise)
  const expenseBreakdown = useMemo(() => {
    const expenseTxns = contactTransactions.filter((t) => t.type === "EXPENSE");
    const totalExpense = expenseTxns.reduce(
      (acc, t) => acc + (t.amount || 0),
      0,
    );

    const categoryMap = new Map<
      string,
      {
        categoryId: number | null;
        categoryName: string;
        categoryIcon: string | null;
        count: number;
        total: number;
      }
    >();

    for (const t of expenseTxns) {
      const key = t.categoryId
        ? String(t.categoryId)
        : `name_${t.categoryName || "Uncategorized"}`;
      const existing = categoryMap.get(key);
      if (existing) {
        existing.count += 1;
        existing.total += t.amount;
      } else {
        categoryMap.set(key, {
          categoryId: t.categoryId,
          categoryName: t.categoryName || "Uncategorized",
          categoryIcon: t.categoryIcon || "pricetag-outline",
          count: 1,
          total: t.amount,
        });
      }
    }

    const categories = Array.from(categoryMap.values()).sort(
      (a, b) => b.total - a.total,
    );

    return {
      totalExpense,
      count: expenseTxns.length,
      categories,
    };
  }, [contactTransactions]);

  const netVolume = useMemo(() => {
    return incomeBreakdown.totalIncome - expenseBreakdown.totalExpense;
  }, [incomeBreakdown.totalIncome, expenseBreakdown.totalExpense]);

  // 4. Borrow and Lent breakdown
  const debtBreakdown = useMemo(() => {
    const lendDebts = contactDebts.filter((d) => d.type === "LEND");
    const borrowDebts = contactDebts.filter((d) => d.type === "BORROW");

    const totalLent = lendDebts.reduce((acc, d) => acc + (d.amount || 0), 0);
    const activeLentRemaining = lendDebts
      .filter((d) => d.state === "ONGOING")
      .reduce((acc, d) => acc + (d.remainingAmount || 0), 0);

    const totalBorrowed = borrowDebts.reduce(
      (acc, d) => acc + (d.amount || 0),
      0,
    );
    const activeBorrowedRemaining = borrowDebts
      .filter((d) => d.state === "ONGOING")
      .reduce((acc, d) => acc + (d.remainingAmount || 0), 0);

    return {
      totalLent,
      activeLentRemaining,
      lentCount: lendDebts.length,
      totalBorrowed,
      activeBorrowedRemaining,
      borrowedCount: borrowDebts.length,
    };
  }, [contactDebts]);

  // Delete / Archive contact handler
  const handleDeleteContact = () => {
    if (!contact) return;
    const currentContact = contact;
    const hasHistory =
      currentContact.activityCount > 0 ||
      contactTransactions.length > 0 ||
      contactDebts.length > 0;

    const alertTitle = hasHistory ? "Archive Contact" : "Delete Contact";
    const alertMessage = hasHistory
      ? `This contact is linked to past transaction or debt records. To preserve history, this contact will be safely archived.`
      : "Are you sure you want to permanently delete this contact?";

    showConfirm({
      title: alertTitle,
      message: alertMessage,
      type: "danger",
      confirmText: hasHistory ? "Archive" : "Delete",
      isDestructive: true,
      onConfirm: () => {
        requireSecurityAuth({
          ruleKey: "deleteContact",
          title: hasHistory ? "Authorize Archive" : "Authorize Deletion",
          description: "Verify your identity to remove this contact.",
          onSuccess: async () => {
            try {
              setIsDeleting(true);
              const result = await deleteContact(currentContact.id);
              router.back();
              if (result.archived) {
                showAlert({
                  title: "Contact Archived",
                  message:
                    "Contact was archived to keep historical debt & transaction records intact.",
                  type: "info",
                });
              }
            } catch (err: any) {
              console.error("Delete contact failed:", err);
              showAlert({
                title: "Error",
                message: err?.message || "Could not delete contact.",
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

  if (!contact) {
    return (
      <SafeAreaView
        edges={["top"]}
        className="flex-1 bg-dark-bg justify-center items-center px-6"
      >
        <View className="w-16 h-16 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-4">
          <Ionicons name="person-outline" size={28} color="#94A3B8" />
        </View>
        <Text className="text-dark-text font-bold text-xl mb-2 text-center">
          Contact Not Found
        </Text>
        <Text className="text-dark-muted text-sm text-center mb-6 font-sans">
          This contact may have been deleted or archived.
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="px-6 py-3 rounded-2xl bg-brand-accent active:opacity-90 w-48 items-center"
        >
          <Text className="text-dark-bg font-bold text-base font-sans">
            Go Back
          </Text>
        </TouchableOpacity>
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
          Contact Details
        </Text>

        <TouchableOpacity
          onPress={handleDeleteContact}
          disabled={isDeleting}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-card"
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#F43F5E" />
          ) : (
            <Ionicons name="trash-outline" size={18} color="#F43F5E" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: 60,
          paddingHorizontal: 20,
        }}
        className="flex-1 pt-6"
      >
        {/* 2. Contact Avatar, Name and Phone (same layout as debt details) */}
        <View className="flex-row items-center mb-4">
          <ContactAvatar
            name={contact.name}
            avatarSvg={contact.avatarSvg}
            size={50}
          />
          <View className="flex-1 ml-3.5 justify-center">
            <Text
              className="text-dark-text text-xl font-bold font-sans"
              numberOfLines={1}
            >
              {contact.name}
            </Text>
            {contact.mobileNumber ? (
              <Text className="text-dark-muted text-sm font-medium font-sans mt-0.5">
                {contact.mobileNumber}
              </Text>
            ) : null}
          </View>
        </View>

        {/* 3. Below Note */}
        {contact.note && contact.note.trim().length > 0 ? (
          <View className="mb-3.5 items-center justify-center">
            <Text className="text-dark-muted text-sm font-sans leading-relaxed">
              {contact.note.trim()}
            </Text>
          </View>
        ) : null}

        {/* 4. Below Edit Button */}
        <TouchableOpacity
          onPress={() => setIsEditOpen(true)}
          activeOpacity={0.7}
          className="flex-row items-center justify-center gap-2 py-3 px-4 rounded-xl bg-dark-surface border border-dark-border active:bg-dark-card mb-6"
        >
          <Ionicons name="pencil-outline" size={16} color="#F8FAFC" />
          <Text className="text-dark-text text-sm font-bold font-sans">
            Edit Contact
          </Text>
        </TouchableOpacity>

        {/* 5. Below Summary */}
        <View className="mb-4">
          <Text className="text-dark-text text-lg font-bold font-sans">
            Transactions Summary
          </Text>
        </View>

        {/* 5.1 Total Transactions Count & Volume Tile */}
        <View className="mb-3.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View>
                <Text className="text-dark-muted text-xs font-medium font-sans">
                  Transactions Made
                </Text>
                <Text className="text-dark-text text-base font-bold font-sans mt-0.5">
                  {totalTransactionsCount}{" "}
                  {totalTransactionsCount === 1
                    ? "Transaction"
                    : "Transactions"}
                </Text>
              </View>
            </View>
            <View className="items-end">
              <Text className="text-dark-muted text-xs font-medium font-sans">
                Net Volume
              </Text>
              <Text
                className={`text-base font-extrabold font-sans mt-0.5 ${
                  netVolume > 0
                    ? "text-emerald-400"
                    : netVolume < 0
                      ? "text-rose-400"
                      : "text-dark-text"
                }`}
              >
                {netVolume > 0 ? "+" : netVolume < 0 ? "-" : ""}
                {formatCurrency(
                  Math.abs(netVolume),
                  settings?.currency,
                  settings?.numberFormat,
                )}
              </Text>
            </View>
          </View>
        </View>

        {/* 5.2 Total Income From Him (Wise Category) */}
        <View className="bg-dark-surface border border-dark-border/60 rounded-2xl p-4 mb-3.5">
          <View className="flex-row items-center justify-between pb-3 border-b border-dark-border/40">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg bg-emerald-500/10 items-center justify-center">
                <Ionicons
                  name="trending-up-outline"
                  size={15}
                  color="#10B981"
                />
              </View>
              <Text className="text-dark-text text-sm font-bold font-sans">
                Total Income
              </Text>
            </View>
            <Text className="text-emerald-400 text-base font-extrabold font-sans">
              +
              {formatCurrency(
                incomeBreakdown.totalIncome,
                settings?.currency,
                settings?.numberFormat,
              )}
            </Text>
          </View>

          {incomeBreakdown.categories.length === 0 ? (
            <View className="py-4 items-center justify-center">
              <Text className="text-dark-muted text-xs font-sans text-center">
                No income transactions recorded with this contact.
              </Text>
            </View>
          ) : (
            <View className="pt-3 gap-3">
              {incomeBreakdown.categories.map((cat, idx) => {
                const pct =
                  incomeBreakdown.totalIncome > 0
                    ? Math.round(
                        (cat.total / incomeBreakdown.totalIncome) * 100,
                      )
                    : 0;

                return (
                  <View key={cat.categoryId ?? `income-cat-${idx}`}>
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                        <View className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                          <Ionicons
                            name={
                              (cat.categoryIcon as any) || "pricetag-outline"
                            }
                            size={15}
                            color="#F8FAFC"
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-dark-text text-sm font-semibold font-sans"
                            numberOfLines={1}
                          >
                            {cat.categoryName}
                          </Text>
                          <Text className="text-dark-muted text-[11px] font-sans">
                            {cat.count}{" "}
                            {cat.count === 1 ? "transaction" : "transactions"} (
                            {pct}%)
                          </Text>
                        </View>
                      </View>
                      <Text className="text-emerald-400 text-sm font-bold font-sans">
                        +
                        {formatCurrency(
                          cat.total,
                          settings?.currency,
                          settings?.numberFormat,
                        )}
                      </Text>
                    </View>

                    {/* Category percentage bar */}
                    <View className="h-1.5 w-full bg-dark-card rounded-full overflow-hidden">
                      <View
                        style={{ width: `${Math.min(pct, 100)}%` }}
                        className="h-full rounded-full bg-emerald-500"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 5.4 Total Expense For Him (Wise Category) */}
        <View className="bg-dark-surface border border-dark-border/60 rounded-2xl p-4 mb-4">
          <View className="flex-row items-center justify-between pb-3 border-b border-dark-border/40">
            <View className="flex-row items-center gap-2">
              <View className="w-7 h-7 rounded-lg bg-rose-500/10 items-center justify-center">
                <Ionicons
                  name="trending-down-outline"
                  size={15}
                  color="#F43F5E"
                />
              </View>
              <Text className="text-dark-text text-sm font-bold font-sans">
                Total Expense
              </Text>
            </View>
            <Text className="text-rose-400 text-base font-extrabold font-sans">
              -
              {formatCurrency(
                expenseBreakdown.totalExpense,
                settings?.currency,
                settings?.numberFormat,
              )}
            </Text>
          </View>

          {expenseBreakdown.categories.length === 0 ? (
            <View className="py-4 items-center justify-center">
              <Text className="text-dark-muted text-xs font-sans text-center">
                No expense transactions recorded with this contact.
              </Text>
            </View>
          ) : (
            <View className="pt-3 gap-3">
              {expenseBreakdown.categories.map((cat, idx) => {
                const pct =
                  expenseBreakdown.totalExpense > 0
                    ? Math.round(
                        (cat.total / expenseBreakdown.totalExpense) * 100,
                      )
                    : 0;

                return (
                  <View key={cat.categoryId ?? `expense-cat-${idx}`}>
                    <View className="flex-row items-center justify-between mb-1.5">
                      <View className="flex-row items-center gap-2.5 flex-1 pr-2">
                        <View className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                          <Ionicons
                            name={
                              (cat.categoryIcon as any) || "pricetag-outline"
                            }
                            size={15}
                            color="#F8FAFC"
                          />
                        </View>
                        <View className="flex-1">
                          <Text
                            className="text-dark-text text-sm font-semibold font-sans"
                            numberOfLines={1}
                          >
                            {cat.categoryName}
                          </Text>
                          <Text className="text-dark-muted text-[11px] font-sans">
                            {cat.count}{" "}
                            {cat.count === 1 ? "transaction" : "transactions"} (
                            {pct}%)
                          </Text>
                        </View>
                      </View>
                      <Text className="text-rose-400 text-sm font-bold font-sans">
                        -
                        {formatCurrency(
                          cat.total,
                          settings?.currency,
                          settings?.numberFormat,
                        )}
                      </Text>
                    </View>

                    {/* Category percentage bar */}
                    <View className="h-1.5 w-full bg-dark-card rounded-full overflow-hidden">
                      <View
                        style={{ width: `${Math.min(pct, 100)}%` }}
                        className="h-full rounded-full bg-rose-500"
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View className="mb-4">
          <Text className="text-dark-text text-lg font-bold font-sans">
            Debt Summary
          </Text>
        </View>

        {/* 5.3 Borrow and Lent Summary */}
        <View className="flex-row bg-dark-surface border border-dark-border/60 rounded-2xl gap-3 mb-3.5 p-4">
          {/* Lent Card */}
          <View className="flex-1 ">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-dark-muted text-xs font-semibold  tracking-wider font-sans">
                Total Lent
              </Text>
            </View>
            <Text className="text-dark-text text-lg font-black font-sans">
              {formatCurrency(
                debtBreakdown.totalLent,
                settings?.currency,
                settings?.numberFormat,
              )}
            </Text>
            <Text className="text-dark-muted text-[11px] font-sans mt-1">
              {debtBreakdown.activeLentRemaining > 0
                ? `${formatCurrency(
                    debtBreakdown.activeLentRemaining,
                    settings?.currency,
                    settings?.numberFormat,
                  )} ongoing`
                : debtBreakdown.totalLent > 0
                  ? "Fully settled"
                  : "No loans"}
            </Text>
          </View>

          {/* Borrowed Card */}
          <View className="flex-1 ">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-dark-muted text-xs font-semibold  tracking-wider font-sans">
                Total Borrowed
              </Text>
            </View>
            <Text className="text-dark-text text-lg font-black font-sans">
              {formatCurrency(
                debtBreakdown.totalBorrowed,
                settings?.currency,
                settings?.numberFormat,
              )}
            </Text>
            <Text className="text-dark-muted text-[11px] font-sans mt-1">
              {debtBreakdown.activeBorrowedRemaining > 0
                ? `${formatCurrency(
                    debtBreakdown.activeBorrowedRemaining,
                    settings?.currency,
                    settings?.numberFormat,
                  )} ongoing`
                : debtBreakdown.totalBorrowed > 0
                  ? "Fully settled"
                  : "No borrowings"}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Edit Contact Modal */}
      <Editcontact
        visible={isEditOpen}
        contact={contact}
        onClose={() => setIsEditOpen(false)}
      />
    </SafeAreaView>
  );
}
