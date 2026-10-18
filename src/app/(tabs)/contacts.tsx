import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContactAvatar } from "../../components/ContactAvatar";
import { SearchBar } from "../../components/SearchBar";
import { Editcontact } from "../../components/contacts/Editcontact";
import { ContactItem, useContacts } from "../../context/contacts";

export default function ContactsScreen() {
  const router = useRouter();
  const { contacts } = useContacts();

  const [search, setSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<ContactItem | null>(
    null,
  );

  const filteredContacts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.mobileNumber && c.mobileNumber.toLowerCase().includes(q)) ||
        (c.note && c.note.toLowerCase().includes(q)),
    );
  }, [contacts, search]);

  const sortedContacts = useMemo(() => {
    return [...filteredContacts].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );
  }, [filteredContacts]);

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-dark-bg">
      <View className="px-5 pt-3 flex-1">
        {/* 1. First contacts heading like in budget tab/page */}
        <View className="pt-2 pb-5 items-center justify-center">
          <Text className="text-dark-text text-xl font-bold text-center">
            Contacts
          </Text>
        </View>

        {/* 2. Search bar component and monochrome create button next to it */}
        <View className="flex-row items-center gap-2.5 mb-4">
          <SearchBar
            value={search}
            onChangeText={setSearch}
            placeholder="Search contacts..."
            className="flex-1"
          />
          <TouchableOpacity
            onPress={() => router.push("/createcontact" as any)}
            className="h-12 w-12 rounded-xl bg-dark-surface border border-dark-border items-center justify-center active:bg-dark-card"
            activeOpacity={0.7}
          >
            <Ionicons name="person-add-outline" size={20} color="#F8FAFC" />
          </TouchableOpacity>
        </View>

        {/* 3. Below all contacts listed alphabetically - just avatar and name */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {sortedContacts.length === 0 ? (
            <TouchableOpacity
              onPress={() => router.push("/createcontact" as any)}
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
                  : "Tap here to add your first contact or counterparty"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="gap-2.5">
              {sortedContacts.map((contact) => (
                <TouchableOpacity
                  key={contact.id}
                  onPress={() => setSelectedContact(contact)}
                  activeOpacity={0.7}
                  className="bg-dark-surface p-3.5 rounded-2xl border border-dark-border flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3.5 flex-1 pr-2">
                    <ContactAvatar
                      name={contact.name}
                      avatarSvg={contact.avatarSvg}
                      size={44}
                    />
                    <Text
                      className="text-dark-text font-bold text-sm flex-1"
                      numberOfLines={1}
                    >
                      {contact.name}
                    </Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#60677C" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* Edit Contact Modal */}
      <Editcontact
        visible={Boolean(selectedContact)}
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
      />
    </SafeAreaView>
  );
}
