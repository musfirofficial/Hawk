import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { HawkToggle } from "../components/HawkToggle";
import { useSecurityGuard } from "../context/security";

export default function SecurityPermissionsScreen() {
  const router = useRouter();
  const { permissions, togglePermission } = useSecurityGuard();

  const deleteActions = permissions.filter((p) => p.actionGroup === "DELETE");
  const createActions = permissions.filter((p) => p.actionGroup === "CREATE");
  const systemActions = permissions.filter((p) => p.actionGroup === "SYSTEM");

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* Top Header */}
      <View className="px-5 pt-3 pb-3 flex-row items-center justify-between border-b border-dark-border/30">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-dark-surface border border-dark-border items-center justify-center -ml-1"
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color="#F8FAFC" />
        </TouchableOpacity>
        <Text className="text-dark-text text-lg font-bold">
          Security Checks
        </Text>
        <View className="w-10" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        className="flex-1 px-5 pt-5"
      >
        {/* Deletions Section */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2 ml-1">
            Deletions
          </Text>
          <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
            {deleteActions.map((item, idx) => (
              <View
                key={item.actionKey}
                className={`flex-row items-center justify-between p-4 ${
                  idx < deleteActions.length - 1
                    ? "border-b border-dark-border/40"
                    : ""
                }`}
              >
                <Text className="text-dark-text font-medium text-sm">
                  {item.title}
                </Text>
                <HawkToggle
                  value={Boolean(item.isEnabled)}
                  onValueChange={(val) => togglePermission(item.actionKey, val)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Creations Section */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2 ml-1">
            Creations
          </Text>
          <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
            {createActions.map((item, idx) => (
              <View
                key={item.actionKey}
                className={`flex-row items-center justify-between p-4 ${
                  idx < createActions.length - 1
                    ? "border-b border-dark-border/40"
                    : ""
                }`}
              >
                <Text className="text-dark-text font-medium text-sm">
                  {item.title}
                </Text>
                <HawkToggle
                  value={Boolean(item.isEnabled)}
                  onValueChange={(val) => togglePermission(item.actionKey, val)}
                />
              </View>
            ))}
          </View>
        </View>

        {/* System & Data Section */}
        <View className="mb-6">
          <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2 ml-1">
            Account & System
          </Text>
          <View className="bg-dark-surface rounded-2xl border border-dark-border overflow-hidden">
            {systemActions.map((item, idx) => (
              <View
                key={item.actionKey}
                className={`flex-row items-center justify-between p-4 ${
                  idx < systemActions.length - 1
                    ? "border-b border-dark-border/40"
                    : ""
                }`}
              >
                <Text className="text-dark-text font-medium text-sm">
                  {item.title}
                </Text>
                <HawkToggle
                  value={Boolean(item.isEnabled)}
                  onValueChange={(val) => togglePermission(item.actionKey, val)}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
