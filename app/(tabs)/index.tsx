import { useState } from "react";
import {
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Linking from "expo-linking";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useContacts, useArticles } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function HomeScreen() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  
  const { contacts, loading: contactsLoading } = useContacts();
  const { addArticle } = useArticles();
  const insets = useSafeAreaInsets();
  
  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");

  const handleSend = async () => {
    if (!title.trim()) {
      Alert.alert("Errore", "Inserisci un titolo per l'articolo");
      return;
    }
    if (!content.trim()) {
      Alert.alert("Errore", "Inserisci il contenuto dell'articolo");
      return;
    }
    if (contacts.length === 0) {
      Alert.alert(
        "Nessun contatto",
        "Aggiungi almeno un contatto nella sezione Contatti prima di inviare"
      );
      return;
    }

    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Build email content
      const subject = encodeURIComponent(title.trim());
      const body = encodeURIComponent(content.trim());
      const emails = contacts.map((c) => c.email).join(",");
      
      // Create mailto link
      const mailtoUrl = `mailto:${emails}?subject=${subject}&body=${body}`;
      
      // Check if we can open mail
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        
        // Save to history
        await addArticle({
          title: title.trim(),
          content: content.trim(),
          recipientCount: contacts.length,
        });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        Alert.alert(
          "Articolo Pronto",
          `L'app email si è aperta con ${contacts.length} destinatari. Premi Invia per completare.`,
          [
            {
              text: "OK",
              onPress: () => {
                setTitle("");
                setContent("");
              },
            },
          ]
        );
      } else {
        Alert.alert(
          "Errore",
          "Impossibile aprire l'app email. Assicurati di avere un'app email configurata."
        );
      }
    } catch (error) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Errore", "Si è verificato un errore durante l'invio");
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 20) + 100 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Recipient Counter */}
        <ThemedView style={[styles.counterCard, { backgroundColor: surfaceColor }]}>
          <ThemedText style={[styles.counterLabel, { color: textSecondaryColor }]}>
            Destinatari
          </ThemedText>
          <ThemedText style={[styles.counterValue, { color: tintColor }]}>
            {contactsLoading ? "..." : contacts.length}
          </ThemedText>
          <ThemedText style={[styles.counterHint, { color: textSecondaryColor }]}>
            {contacts.length === 0
              ? "Aggiungi contatti per iniziare"
              : contacts.length === 1
              ? "contatto"
              : "contatti"}
          </ThemedText>
        </ThemedView>

        {/* Title Input */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Titolo *</ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: surfaceColor,
                borderColor,
                color: textColor,
              },
            ]}
            placeholder="Titolo del comunicato stampa"
            placeholderTextColor={textSecondaryColor}
            value={title}
            onChangeText={setTitle}
            maxLength={200}
          />
        </ThemedView>

        {/* Content Input */}
        <ThemedView style={styles.inputGroup}>
          <ThemedText style={styles.label}>Contenuto *</ThemedText>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: surfaceColor,
                borderColor,
                color: textColor,
              },
            ]}
            placeholder="Scrivi qui il tuo articolo o comunicato stampa..."
            placeholderTextColor={textSecondaryColor}
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={10}
            textAlignVertical="top"
          />
        </ThemedView>
      </ScrollView>

      {/* Send Button - Fixed at bottom */}
      <ThemedView
        style={[
          styles.buttonContainer,
          {
            backgroundColor,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <Pressable
          style={[
            styles.sendButton,
            { backgroundColor: tintColor },
            (sending || contacts.length === 0) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={sending || contacts.length === 0}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.sendButtonText}>
              Invia a Tutti ({contacts.length})
            </ThemedText>
          )}
        </Pressable>
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  counterCard: {
    alignItems: "center",
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
  },
  counterLabel: {
    fontSize: 14,
    marginBottom: 4,
  },
  counterValue: {
    fontSize: 48,
    fontWeight: "bold",
    lineHeight: 56,
  },
  counterHint: {
    fontSize: 14,
    marginTop: 4,
  },
  inputGroup: {
    marginBottom: 16,
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
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 200,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  sendButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
