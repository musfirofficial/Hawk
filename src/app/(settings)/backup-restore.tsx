import React from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ScreenHeader";

export default function BackupRestoreScreen() {
  return (
    <SafeAreaView className="flex-1 bg-dark-bg" edges={["top", "bottom"]}>
      <ScreenHeader title="Backup & Restore" />
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-dark-muted text-sm text-center">
          Backup & Restore features coming soon.
        </Text>
      </View>
    </SafeAreaView>
  );
}
