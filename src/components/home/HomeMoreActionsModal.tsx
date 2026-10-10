import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, Text, TouchableOpacity, View } from "react-native";
import { useAlert } from "../../context/alert";
import { HawkModal } from "../HawkModal";

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
    <HawkModal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/70">
        <Pressable className="flex-1" onPress={onClose} />

        <View className="bg-dark-surface rounded-t-3xl px-5 pt-3 pb-8">
          {/* Top Pill Handle */}
          <View className="items-center mb-3">
            <View className="w-12 h-1.5 bg-dark-border rounded-full" />
          </View>

          {/* Sheet Header */}
          <View className="flex-row items-center justify-between pb-3 mb-3 border-b border-dark-border/40">
            <View>
              <Text className="text-dark-text text-lg font-bold">
                More Features
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="w-8 h-8 rounded-full bg-dark-card border border-dark-border items-center justify-center"
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color="#94A3B8" />
            </TouchableOpacity>
          </View>

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
        </View>
      </View>
    </HawkModal>
  );
}
