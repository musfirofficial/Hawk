import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function ContactsScreen() {
  const [search, setSearch] = useState("");

  const contactsList = [
    {
      id: 1,
      name: "Henrik Jansen",
      mobile: "+1 (555) 234-5678",
      status: "Owes you $450.00",
      statusColor: "text-brand-lend",
    },
    {
      id: 2,
      name: "Matteo Ricci",
      mobile: "+1 (555) 876-5432",
      status: "Owes you $650.00",
      statusColor: "text-brand-lend",
    },
    {
      id: 3,
      name: "Eva Novak",
      mobile: "+1 (555) 345-6789",
      status: "Employer / Client",
      statusColor: "text-dark-muted",
    },
    {
      id: 4,
      name: "Binance P2P",
      mobile: "Merchant account",
      status: "Exchange Counterparty",
      statusColor: "text-dark-muted",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 py-4 border-b border-dark-border">
        <Text className="text-dark-text text-xl font-bold">Contacts</Text>
        <TouchableOpacity
          className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center"
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={20} color="#0B0D12" />
        </TouchableOpacity>
      </View>

      <View className="px-5 pt-3 flex-1">
        {/* Search Bar */}
        <View className="bg-dark-surface border border-dark-border rounded-2xl px-4 py-2.5 flex-row items-center gap-2 mb-4">
          <Ionicons name="search" size={18} color="#60677C" />
          <TextInput
            placeholder="Search contact or company..."
            placeholderTextColor="#60677C"
            value={search}
            onChangeText={setSearch}
            className="flex-1 text-dark-text text-sm py-0"
          />
        </View>

        {/* Contacts List */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="space-y-2.5 gap-2.5">
            {contactsList.map((contact) => (
              <View
                key={contact.id}
                className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between"
              >
                <View className="flex-row items-center gap-3">
                  <View className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                    <Text className="text-dark-text font-bold text-sm">
                      {contact.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </Text>
                  </View>
                  <View>
                    <Text className="text-dark-text font-bold text-sm">
                      {contact.name}
                    </Text>
                    <Text className="text-dark-muted text-xs">{contact.mobile}</Text>
                  </View>
                </View>

                <View className="items-end">
                  <Text className={`text-xs font-semibold ${contact.statusColor}`}>
                    {contact.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}
