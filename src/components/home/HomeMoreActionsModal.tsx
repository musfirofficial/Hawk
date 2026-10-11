import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useAlert } from "../../context/alert";
import { HawkFlyUp } from "../HawkFlyUp";

interface HomeMoreActionsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function HomeMoreActionsModal({
  visible,
  onClose,
}: HomeMoreActionsModalProps) {
  const router = useRouter();
  const { showAlert } = useAlert();

  function handleCategoriesPress() {
    onClose();
    router.push("/(categories)/categories" as any);
  }

  function handleBudgetPress() {
    showAlert({
      title: "Budgets",
      message:
        "Budget management is currently in active development and will be available in an upcoming update.",
      type: "info",
    });
  }

  return (
    <HawkFlyUp
      visible={visible}
      onClose={onClose}
      title="More Features"
    >
      {/* Options List */}
      <View className="space-y-3 gap-3">
        {/* 1. Manage Categories */}
        <TouchableOpacity
          onPress={handleCategoriesPress}
          className="bg-dark-card border border-dark-border/60 p-2 rounded-2xl flex-row items-center justify-between active:bg-dark-border/20"
          activeOpacity={0.7}
        >
          <View className="flex-row items-center gap-3.5 flex-1">
            <View className="w-12 h-12 rounded-full bg-dark-surface border border-dark-border items-center justify-center">
              <Ionicons
                name="pricetags-outline"
                size={20}
                color="#F8FAFC"
              />
            </View>
            <View className="flex-1">
              <Text className="text-dark-text font-bold text-sm">
                Manage Categories
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#60677C" />
        </TouchableOpacity>

        {/* 2. Manage Budget (Not implemented yet) */}
        <TouchableOpacity
          onPress={handleBudgetPress}
          className="bg-dark-card border border-dark-border/60 p-2 rounded-2xl flex-row items-center justify-between active:bg-dark-border/20"
          activeOpacity={0.7}
        >
          <View className="flex-row items-center gap-3.5 flex-1">
            <View className="w-12 h-12 rounded-full bg-dark-surface border border-dark-border items-center justify-center">
              <Ionicons
                name="pie-chart-outline"
                size={20}
                color="#F8FAFC"
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-dark-text font-bold text-sm">
                  Manage Budget
                </Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#60677C" />
        </TouchableOpacity>
      </View>
    </HawkFlyUp>
  );
}
