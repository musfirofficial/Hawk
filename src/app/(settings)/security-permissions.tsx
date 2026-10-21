import React from "react";
import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ScreenHeader";
import { HawkToggle } from "../../components/HawkToggle";
import { useSecurityGuard } from "../../context/security";
import { SecurityRuleKey } from "../../db/schema";

interface RuleItem {
  key: SecurityRuleKey;
  title: string;
}

const DELETION_RULES: RuleItem[] = [
  { key: "deleteTransaction", title: "Delete Transactions" },
  { key: "deleteAccount", title: "Delete Accounts & Assets" },
  { key: "deleteContact", title: "Delete Contacts" },
  { key: "deleteDebt", title: "Delete Debts" },
];

const CREATION_RULES: RuleItem[] = [
  { key: "createTransaction", title: "Create Transactions" },
  { key: "createAccount", title: "Create Accounts & Assets" },
];

const SYSTEM_RULES: RuleItem[] = [
  { key: "editProfile", title: "Edit Profile & Details" },
  { key: "manageAccount", title: "Connect or Disconnect Mail" },
  { key: "backupRestore", title: "Backup & Restore Database" },
  { key: "resetData", title: "Erase & Reset All Data" },
];

export default function SecurityPermissionsScreen() {
  const { rules, updateRule } = useSecurityGuard();

  function renderGroup(title: string, items: RuleItem[]) {
    return (
      <View className="mb-6">
        <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2 ml-1">
          {title}
        </Text>
        <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
          {items.map((item, idx) => {
            const isEnabled = rules ? Boolean(rules[item.key]) : true;
            return (
              <View
                key={item.key}
                className={`flex-row items-center justify-between p-4 ${
                  idx < items.length - 1
                    ? "border-b border-dark-border/40"
                    : ""
                }`}
              >
                <Text className="text-dark-text font-medium text-sm">
                  {item.title}
                </Text>
                <HawkToggle
                  value={isEnabled}
                  onValueChange={(val) => updateRule(item.key, val)}
                />
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      <ScreenHeader title="Security Checks" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-5 pt-5"
      >
        {renderGroup("Deletions", DELETION_RULES)}
        {renderGroup("Creations", CREATION_RULES)}
        {renderGroup("Account & System", SYSTEM_RULES)}
      </ScrollView>
    </SafeAreaView>
  );
}
