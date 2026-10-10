import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useAlert } from "../../context/alert";
import { useCategories } from "../../context/categories";

// Curated icons tailored for Hawk financial tracker & transactions
const CATEGORY_ICONS: (keyof typeof Ionicons.glyphMap)[] = [
  "home-outline",
  "hourglass-outline",
  "key-outline",
  "laptop-outline",
  "bulb-outline",
  "location-outline",
  "lock-closed-outline",
  "link-outline",
  "people-outline",
  "cash-outline",
  "wallet-outline",
  "card-outline",
  "trending-up-outline",
  "briefcase-outline",
  "cart-outline",
  "bag-handle-outline",
  "pricetag-outline",
  "fast-food-outline",
  "restaurant-outline",
  "cafe-outline",
  "car-outline",
  "bus-outline",
  "airplane-outline",
  "flash-outline",
  "water-outline",
  "medkit-outline",
  "fitness-outline",
  "film-outline",
  "game-controller-outline",
  "musical-notes-outline",
  "book-outline",
  "gift-outline",
  "receipt-outline",
  "shield-checkmark-outline",
  "pie-chart-outline",
];

export default function CreateCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const categoryId = params.id ? parseInt(params.id, 10) : null;

  const { categories, createCategory, updateCategory } = useCategories();
  const { showAlert } = useAlert();

  const existingCategory = categoryId
    ? categories.find((c) => c.id === categoryId)
    : null;

  const isEditing = Boolean(existingCategory);

  const [name, setName] = useState(existingCategory ? existingCategory.name : "");
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>(
    (existingCategory?.icon as any) || "pricetag-outline"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (existingCategory) {
      setName(existingCategory.name);
      if (existingCategory.icon) {
        setSelectedIcon(existingCategory.icon as any);
      }
    }
  }, [existingCategory]);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg("Please enter a category name");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      if (isEditing && existingCategory) {
        await updateCategory(existingCategory.id, {
          name: trimmed,
          icon: selectedIcon,
        });
        showAlert({
          title: "Category Updated",
          message: `Category "${trimmed}" was updated successfully.`,
          type: "success",
          onDismiss: () => router.back(),
        });
      } else {
        await createCategory({
          name: trimmed,
          icon: selectedIcon,
        });
        showAlert({
          title: "Category Created",
          message: `Category "${trimmed}" has been added.`,
          type: "success",
          onDismiss: () => router.back(),
        });
      }
    } catch (err: any) {
      console.error("Save category error:", err);
      setErrorMsg(err?.message || "Failed to save category.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Top Header - Title in Title bar matching all other pages */}
        <ScreenHeader
          title={isEditing ? "Edit Category" : "Add New Category"}
          showBack={true}
          onBack={() => router.back()}
        />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
          className="flex-1 px-5 pt-4"
        >
          {/* Category Name Section */}
          <View className="mb-6">
            <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-2 ml-1">
              Category Name
            </Text>

            <View
              style={{ borderColor: errorMsg ? "#F43F5E" : "#262B3A" }}
              className="bg-dark-surface border rounded-2xl px-4 py-3.5 flex-row items-center gap-3"
            >
              {/* Selected Icon preview on the left */}
              <View className="w-10 h-10 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                <Ionicons name={selectedIcon} size={20} color="#F8FAFC" />
              </View>

              {/* Name Input */}
              <TextInput
                value={name}
                onChangeText={(val) => {
                  setName(val);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="e.g. Family & Friends"
                placeholderTextColor="#60677C"
                className="flex-1 text-dark-text font-semibold text-base py-0"
                autoCapitalize="words"
              />

              {/* Edit Pencil Icon on the right */}
              <Ionicons name="pencil-outline" size={18} color="#94A3B8" />
            </View>

            {errorMsg ? (
              <Text className="text-rose-500 text-xs mt-1.5 ml-2 font-medium">
                {errorMsg}
              </Text>
            ) : null}
          </View>

          {/* Category Icon Grid - Arranged neatly with equal spacing */}
          <View className="mb-8">
            <Text className="text-dark-muted text-xs font-bold uppercase tracking-wider mb-3 ml-1">
              Category Icon
            </Text>

            <View className="flex-row flex-wrap justify-between gap-y-3.5">
              {CATEGORY_ICONS.map((iconName) => {
                const isSelected = selectedIcon === iconName;
                return (
                  <View key={iconName} className="w-[18%] items-center justify-center">
                    <TouchableOpacity
                      onPress={() => setSelectedIcon(iconName)}
                      activeOpacity={0.7}
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 24,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                        backgroundColor: isSelected ? "#D4F938" : "#141720",
                        borderColor: isSelected ? "#D4F938" : "#262B3A",
                      }}
                    >
                      <Ionicons
                        name={iconName}
                        size={22}
                        color={isSelected ? "#0B0D12" : "#F8FAFC"}
                      />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSubmitting}
            className="w-full py-4 rounded-2xl bg-brand-accent items-center justify-center shadow-lg active:opacity-90 mb-6"
            activeOpacity={0.8}
          >
            <Text className="text-dark-bg font-extrabold text-base tracking-wide">
              {isEditing ? "Save Changes" : "Create Category"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
