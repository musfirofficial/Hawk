import { Ionicons } from "@expo/vector-icons";
import { Tabs, useRouter } from "expo-router";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface TabRoute {
  key: string;
  name: string;
  params?: any;
}

interface CustomTabBarProps {
  state: {
    index: number;
    routes: TabRoute[];
  };
  descriptors: Record<string, { options: any }>;
  navigation: {
    emit: (event: any) => { defaultPrevented: boolean };
    navigate: (name: string, params?: any) => void;
  };
}

function FloatingTabBar({ state, descriptors, navigation }: CustomTabBarProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // Margin matching screen horizontal padding (px-5 = 20px)
  const bottomOffset = Math.max(16, insets.bottom + 4);

  return (
    <View
      style={{
        position: "absolute",
        left: 20,
        right: 20,
        bottom: bottomOffset,
        height: 64,
        backgroundColor: "rgba(19, 22, 32, 0.9)",
        borderRadius: 26,
        borderWidth: 0.5,
        borderColor: "#262B3A",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 0,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 18,
        elevation: 12,
      }}
    >
      {state.routes.map((route: TabRoute, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: "tabLongPress",
            target: route.key,
          });
        };

        let iconName: any = "home";
        if (route.name === "index") {
          iconName = isFocused ? "home" : "home-outline";
        } else if (route.name === "budget") {
          iconName = isFocused ? "pie-chart" : "pie-chart-outline";
        } else if (route.name === "debts") {
          iconName = isFocused ? "swap-horizontal" : "swap-horizontal-outline";
        } else if (route.name === "contacts") {
          iconName = isFocused ? "people" : "people-outline";
        }

        return (
          <React.Fragment key={route.key}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options?.tabBarAccessibilityLabel}
              testID={options?.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              activeOpacity={0.7}
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Circular bubble with Electric Lime fill when focused */}
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: isFocused ? "#D4F938" : "transparent",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                }}
              >
                <Ionicons
                  name={iconName}
                  size={22}
                  color={isFocused ? "#0B0D12" : "#94A3B8"}
                />
              </View>
            </TouchableOpacity>

            {/* Plus button at centre (inserted after tab 1: Budget, before tab 2: Debts) */}
            {index === 1 && (
              <TouchableOpacity
                key="center-create-button"
                accessibilityRole="button"
                accessibilityLabel="Create Transaction"
                onPress={() => router.push("/(transaction)/create" as any)}
                activeOpacity={0.7}
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "#1C202C",
                    borderWidth: 0.5,
                    borderColor: "#2E364A",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                >
                  <Ionicons name="add" size={24} color="#F8FAFC" />
                </View>
              </TouchableOpacity>
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props: any) => <FloatingTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="budget" options={{ title: "Budget" }} />
      <Tabs.Screen name="debts" options={{ title: "Debts" }} />
      <Tabs.Screen name="contacts" options={{ title: "Contacts" }} />
    </Tabs>
  );
}
