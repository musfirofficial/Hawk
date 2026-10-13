import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SearchBar } from "../../components/SearchBar";
import { CreateContact } from "../../components/contacts/CreateContact";
import { Editcontact } from "../../components/contacts/Editcontact";
import { useAuth } from "../../context/auth";
import { ContactItem, useContacts } from "../../context/contacts";
import { formatCurrency } from "../../services/currency";

export default function ContactsScreen() {
  const { contacts } = useContacts();
  const { settings } = useAuth();

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(
    null
  );

  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.mobileNumber && c.mobileNumber.toLowerCase().includes(q)) ||
        (c.note && c.note.toLowerCase().includes(q))
    );
  }, [contacts, search]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-1">
        <Text className="text-dark-text text-xl font-bold">Contacts</Text>
        <TouchableOpacity
          onPress={() => setIsCreateOpen(true)}
          className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center"
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={20} color="#0B0D12" />
        </TouchableOpacity>
      </View>

      <View className="px-5 pt-2 flex-1">
        {/* Search Bar */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder="Search contact or company..."
          className="mb-4"
        />

        {/* Contacts List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {filteredContacts.length === 0 ? (
            <TouchableOpacity
              onPress={() => setIsCreateOpen(true)}
              activeOpacity={0.7}
              className="bg-dark-surface border border-dashed border-dark-border p-8 rounded-2xl items-center justify-center mt-4"
            >
              <View className="w-12 h-12 rounded-full bg-dark-card border border-dark-border items-center justify-center mb-2.5">
                <Ionicons name="people-outline" size={22} color="#F8FAFC" />
              </View>
              <Text className="text-dark-text font-bold text-sm">
                {search ? "No matching contacts" : "No Contacts Yet"}
              </Text>
              <Text className="text-dark-muted text-xs mt-1 text-center">
                {search
                  ? "Try searching for a different name or phone number"
                  : "Tap here to add your first counterparty, friend, or merchant"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="space-y-2.5 gap-2.5">
              {filteredContacts.map((contact) => {
                const initials = contact.name
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase();

                return (
                  <TouchableOpacity
                    key={contact.id}
                    onPress={() => setSelectedContact(contact)}
                    activeOpacity={0.7}
                    className="bg-dark-surface p-4 rounded-2xl border border-dark-border flex-row items-center justify-between"
                  >
                    <View className="flex-row items-center gap-3 flex-1 mr-2">
                      <View className="w-11 h-11 rounded-full bg-dark-card border border-dark-border items-center justify-center">
                        <Text className="text-dark-text font-bold text-sm">
                          {initials || "C"}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className="text-dark-text font-bold text-sm"
                          numberOfLines={1}
                        >
                          {contact.name}
                        </Text>
                        <Text
                          className="text-dark-muted text-xs"
                          numberOfLines={1}
                        >
                          {contact.mobileNumber || contact.note || "Contact"}
                        </Text>
                      </View>
                    </View>

                    <View className="items-end">
                      {contact.totalOwedToMe > 0 ? (
                        <Text className="text-xs font-bold text-brand-lend">
                          Owes you{" "}
                          {formatCurrency(
                            contact.totalOwedToMe,
                            settings?.currency,
                            settings?.numberFormat
                          )}
                        </Text>
                      ) : contact.totalIOwe > 0 ? (
                        <Text className="text-xs font-bold text-brand-borrow">
                          You owe{" "}
                          {formatCurrency(
                            contact.totalIOwe,
                            settings?.currency,
                            settings?.numberFormat
                          )}
                        </Text>
                      ) : (
                        <Text className="text-xs font-semibold text-dark-muted">
                          {contact.note || "No balance"}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Create Contact Modal */}
      <CreateContact
        visible={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />

      {/* Edit Contact Modal */}
      <Editcontact
        visible={Boolean(selectedContact)}
        onClose={() => setSelectedContact(null)}
        contact={selectedContact}
      />
    </SafeAreaView>
  );
}
