import { useState } from "react";
import {
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  Modal,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useContacts, Contact } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function ContactsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [outlet, setOutlet] = useState("");

  const { contacts, addContact, removeContact, loading } = useContacts();
  const insets = useSafeAreaInsets();

  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const dangerColor = useThemeColor({}, "danger");

  const handleAddContact = async () => {
    if (!name.trim()) {
      Alert.alert("Errore", "Inserisci il nome del contatto");
      return;
    }
    if (!email.trim()) {
      Alert.alert("Errore", "Inserisci l'email del contatto");
      return;
    }
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert("Errore", "Inserisci un indirizzo email valido");
      return;
    }

    await addContact({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      outlet: outlet.trim() || undefined,
    });

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setModalVisible(false);
    setName("");
    setEmail("");
    setOutlet("");
  };

  const handleDeleteContact = (contact: Contact) => {
    Alert.alert(
      "Elimina Contatto",
      `Vuoi eliminare ${contact.name}?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            await removeContact(contact.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };

  const renderContact = ({ item }: { item: Contact }) => (
    <ThemedView style={[styles.contactCard, { backgroundColor: surfaceColor }]}>
      <View style={styles.contactInfo}>
        <ThemedText style={styles.contactName}>{item.name}</ThemedText>
        <ThemedText style={[styles.contactEmail, { color: textSecondaryColor }]}>
          {item.email}
        </ThemedText>
        {item.outlet && (
          <ThemedText style={[styles.contactOutlet, { color: tintColor }]}>
            {item.outlet}
          </ThemedText>
        )}
      </View>
      <Pressable
        style={styles.deleteButton}
        onPress={() => handleDeleteContact(item)}
        hitSlop={8}
      >
        <IconSymbol name="trash.fill" size={20} color={dangerColor} />
      </Pressable>
    </ThemedView>
  );

  const renderEmptyList = () => (
    <ThemedView style={styles.emptyContainer}>
      <IconSymbol name="person.2.fill" size={64} color={textSecondaryColor} />
      <ThemedText style={[styles.emptyTitle, { color: textSecondaryColor }]}>
        Nessun contatto
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: textSecondaryColor }]}>
        Aggiungi giornalisti e testate per iniziare a inviare i tuoi articoli
      </ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 80 },
        ]}
        ListEmptyComponent={loading ? null : renderEmptyList}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {/* FAB - Add Contact */}
      <Pressable
        style={[
          styles.fab,
          { backgroundColor: tintColor, bottom: Math.max(insets.bottom, 16) + 16 },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <IconSymbol name="plus" size={28} color="#FFFFFF" />
      </Pressable>

      {/* Add Contact Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { backgroundColor }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <Pressable onPress={() => setModalVisible(false)}>
              <ThemedText style={[styles.modalCancel, { color: dangerColor }]}>
                Annulla
              </ThemedText>
            </Pressable>
            <ThemedText style={styles.modalTitle}>Nuovo Contatto</ThemedText>
            <Pressable onPress={handleAddContact}>
              <ThemedText style={[styles.modalSave, { color: tintColor }]}>
                Salva
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Nome *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: surfaceColor, borderColor, color: textColor },
                ]}
                placeholder="Nome e cognome"
                placeholderTextColor={textSecondaryColor}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email *</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: surfaceColor, borderColor, color: textColor },
                ]}
                placeholder="email@esempio.com"
                placeholderTextColor={textSecondaryColor}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Testata (opzionale)</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: surfaceColor, borderColor, color: textColor },
                ]}
                placeholder="Es: Il Corriere, La Repubblica..."
                placeholderTextColor={textSecondaryColor}
                value={outlet}
                onChangeText={setOutlet}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 4,
  },
  contactEmail: {
    fontSize: 15,
  },
  contactOutlet: {
    fontSize: 14,
    marginTop: 4,
    fontWeight: "500",
  },
  deleteButton: {
    padding: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalCancel: {
    fontSize: 17,
  },
  modalSave: {
    fontSize: 17,
    fontWeight: "600",
  },
  modalContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
});
