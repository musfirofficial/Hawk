import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ScreenHeader } from "../../components/ScreenHeader";
import { useAlert } from "../../context/alert";
import { CategoryItem, useCategories } from "../../context/categories";

export default function CategoriesScreen() {
  const router = useRouter();
  const { categories, isLoading, deleteCategory } = useCategories();
  const { showConfirm, showAlert } = useAlert();

  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return categories;
    }
    const q = searchQuery.toLowerCase().trim();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchQuery]);

  function handleAddCategory() {
    router.push("/(categories)/create-category" as any);
  }

  function handleEditCategory(cat: CategoryItem) {
    router.push({
      pathname: "/(categories)/create-category" as any,
      params: { id: cat.id.toString() },
    });
  }

  function handleDeleteCategory(cat: CategoryItem) {
    const warningMessage =
      cat.transactionCount > 0
        ? `"${cat.name}" is currently linked to ${cat.transactionCount} transaction${
            cat.transactionCount === 1 ? "" : "s"
          }. Deleting it will keep the transactions but remove this category. Are you sure?`
        : `Are you sure you want to delete category "${cat.name}"?`;

    showConfirm({
      title: "Delete Category",
      message: warningMessage,
      confirmText: "Delete",
      cancelText: "Cancel",
      isDestructive: true,
      onConfirm: async () => {
        try {
          await deleteCategory(cat.id);
          showAlert({
            title: "Category Deleted",
            message: `"${cat.name}" was successfully deleted.`,
            type: "success",
          });
        } catch (err: any) {
          showAlert({
            title: "Error",
            message: err?.message || "Failed to delete category.",
            type: "danger",
          });
        }
      },
    });
  }

  const renderItem = ({ item }: { item: CategoryItem }) => {
    return (
      <View className="bg-dark-surface border border-dark-border/80 rounded-2xl p-2 mb-3 flex-row items-center justify-between">
        {/* Left: Icon & Name */}
        <TouchableOpacity
          onPress={() => handleEditCategory(item)}
          activeOpacity={0.7}
          className="flex-row items-center gap-3.5 flex-1 pr-3"
        >
          {/* Icon Circle */}
          <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center">
            <Ionicons
              name={(item.icon as any) || "pricetag-outline"}
              size={20}
              color="#F8FAFC"
            />
          </View>

          {/* Name */}
          <View className="flex-1">
            <Text
              className="text-dark-text font-bold text-base"
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Right: Delete Button */}
        <TouchableOpacity
          onPress={() => handleDeleteCategory(item)}
          className="w-9 h-9 rounded-full bg-dark-card border border-dark-border items-center justify-center active:bg-rose-500/20 mr-1"
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={15} color="#F43F5E" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-dark-bg">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        {/* Top Header - No plus icon in title bar */}
        <ScreenHeader
          title="Categories"
          showBack={true}
          onBack={() => router.back()}
        />

        {/* Content */}
        <View className="flex-1 px-5 pt-3">
          {/* Top Add Category Banner */}
          <TouchableOpacity
            onPress={handleAddCategory}
            className="bg-brand-accent rounded-2xl p-3 flex-row items-center justify-between shadow-lg mb-4"
            activeOpacity={0.85}
          >
            <View className="flex-row items-center gap-3.5 flex-1 pr-2">
              <View className="w-10 h-10 rounded-full bg-dark-bg items-center justify-center">
                <Ionicons name="add" size={22} color="#D4F938" />
              </View>
              <View className="flex-1">
                <Text className="text-dark-bg font-extrabold text-base">
                  Add New Category
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#0B0D12" />
          </TouchableOpacity>

          {/* Search Box */}
          <View className="bg-dark-surface border border-dark-border rounded-xl px-3.5 py-3.5 flex-row items-center gap-2.5 mb-4">
            <Ionicons name="search-outline" size={18} color="#60677C" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search categories..."
              placeholderTextColor="#60677C"
              className="flex-1 text-dark-text text-sm font-medium py-0"
              autoCapitalize="none"
              clearButtonMode="while-editing"
            />
            {searchQuery ? (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* List of categories */}
          {isLoading ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color="#D4F938" />
            </View>
          ) : (
            <FlatList
              data={filteredCategories}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 30 }}
              ListEmptyComponent={
                <View className="bg-dark-surface border border-dashed border-dark-border rounded-2xl p-8 items-center justify-center mt-4">
                  <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-3">
                    <Ionicons
                      name="pricetags-outline"
                      size={22}
                      color="#F8FAFC"
                    />
                  </View>
                  <Text className="text-dark-text font-bold text-base mb-1">
                    No Categories Found
                  </Text>
                  <Text className="text-dark-muted text-xs text-center mb-4">
                    {searchQuery
                      ? `No category matches "${searchQuery}"`
                      : "You have not added any categories yet."}
                  </Text>
                  <TouchableOpacity
                    onPress={handleAddCategory}
                    className="bg-brand-accent px-4 py-2.5 rounded-xl flex-row items-center gap-1.5"
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add" size={18} color="#0B0D12" />
                    <Text className="text-dark-bg font-bold text-xs">
                      Create Category
                    </Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
