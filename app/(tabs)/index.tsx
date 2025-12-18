import { useState, useEffect } from "react";
import {
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Picker } from "@react-native-picker/picker";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { trpc } from "@/lib/trpc";
import { useThemeColor } from "@/hooks/use-theme-color";

const CATEGORIES = [
  { label: "Tutte le categorie", value: "all" },
  { label: "Tecnologia", value: "technology" },
  { label: "Business", value: "business" },
  { label: "Finanza", value: "finance" },
  { label: "Salute", value: "health" },
  { label: "Sport", value: "sports" },
  { label: "Intrattenimento", value: "entertainment" },
  { label: "Politica", value: "politics" },
  { label: "Lifestyle", value: "lifestyle" },
  { label: "Generale", value: "general" },
];

const COUNTRIES = [
  { label: "Tutti i paesi", value: "all" },
  { label: "🇮🇹 Italia", value: "IT" },
  { label: "🇺🇸 USA", value: "US" },
  { label: "🇬🇧 Regno Unito", value: "GB" },
  { label: "🇫🇷 Francia", value: "FR" },
  { label: "🇩🇪 Germania", value: "DE" },
  { label: "🇪🇸 Spagna", value: "ES" },
  { label: "🇨🇦 Canada", value: "CA" },
  { label: "🇦🇺 Australia", value: "AU" },
  { label: "🇯🇵 Giappone", value: "JP" },
  { label: "🇮🇳 India", value: "IN" },
  { label: "🇧🇷 Brasile", value: "BR" },
  { label: "🇲🇽 Messico", value: "MX" },
  { label: "🇦🇷 Argentina", value: "AR" },
];

export default function HomeScreen() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("all");
  const [country, setCountry] = useState("all");
  const [boilerplate, setBoilerplate] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [sending, setSending] = useState(false);
  
  const insets = useSafeAreaInsets();
  
  // Get journalist count
  const { data: journalistCount, isLoading: countLoading } = trpc.journalists.count.useQuery();
  
  // Get journalists filtered by category and country
  const { data: journalists } = trpc.journalists.list.useQuery({
    category: category !== "all" ? category : undefined,
    country: country !== "all" ? country : undefined,
    isActive: true,
  });
  
  const filteredCount = journalists?.length ?? 0;
  
  // Create press release mutation
  const createPressRelease = trpc.pressReleases.create.useMutation();
  const sendPressRelease = trpc.pressReleases.send.useMutation();
  
  const backgroundColor = useThemeColor({}, "background");
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");

  const handleSend = async () => {
    if (!title.trim()) {
      Alert.alert("Errore", "Inserisci un titolo per l'articolo");
      return;
    }
    if (!content.trim()) {
      Alert.alert("Errore", "Inserisci il contenuto dell'articolo");
      return;
    }
    if (filteredCount === 0) {
      Alert.alert("Errore", "Nessun giornalista trovato per i filtri selezionati");
      return;
    }

    const categoryLabel = CATEGORIES.find(c => c.value === category)?.label || "";
    const countryLabel = COUNTRIES.find(c => c.value === country)?.label || "";
    
    Alert.alert(
      "Conferma Invio",
      `Stai per inviare "${title}" a ${filteredCount} giornalisti.\n\nFiltri: ${categoryLabel}${country !== "all" ? `, ${countryLabel}` : ""}\n\nContinuare?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Invia",
          onPress: async () => {
            setSending(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              const pressReleaseId = await createPressRelease.mutateAsync({
                title: title.trim(),
                subtitle: subtitle.trim() || undefined,
                content: content.trim(),
                category: category !== "all" ? category as any : undefined,
                boilerplate: boilerplate.trim() || undefined,
                contactName: contactName.trim() || undefined,
                contactEmail: contactEmail.trim() || undefined,
              });

              const result = await sendPressRelease.mutateAsync({
                pressReleaseId,
                categoryFilter: category !== "all" ? category : undefined,
              });

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

              Alert.alert(
                "Invio Completato",
                `Comunicato inviato con successo!\n\n✅ Inviati: ${result.totalSent}\n❌ Falliti: ${result.totalFailed}`,
                [
                  {
                    text: "OK",
                    onPress: () => {
                      setTitle("");
                      setSubtitle("");
                      setContent("");
                      setBoilerplate("");
                    },
                  },
                ]
              );
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Errore", error.message || "Si è verificato un errore durante l'invio");
            } finally {
              setSending(false);
            }
          },
        },
      ]
    );
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
          { 
            paddingTop: Math.max(insets.top, 16) + 8,
            paddingBottom: Math.max(insets.bottom, 20) + 100 
          },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.headerTitle}>G-Press</ThemedText>
          <ThemedText style={styles.headerSubtitle}>Distribuzione Comunicati Stampa</ThemedText>
        </View>

        {/* Stats Card */}
        <View style={[styles.statsCard, { backgroundColor: "#1E88E5" }]}>
          <View style={styles.statItem}>
            <ThemedText style={styles.statValue}>
              {countLoading ? "..." : journalistCount ?? 0}
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              Giornalisti Totali
            </ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText style={[styles.statValue, { color: "#4CAF50" }]}>
              {filteredCount}
            </ThemedText>
            <ThemedText style={styles.statLabel}>
              Destinatari
            </ThemedText>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filtersRow}>
          <View style={styles.filterItem}>
            <ThemedText style={styles.filterLabel}>Categoria</ThemedText>
            <View style={[styles.pickerContainer, { borderColor: "#E0E0E0" }]}>
              <Picker
                selectedValue={category}
                onValueChange={setCategory}
                style={[styles.picker, { color: textColor }]}
              >
                {CATEGORIES.map((cat) => (
                  <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                ))}
              </Picker>
            </View>
          </View>
          <View style={styles.filterItem}>
            <ThemedText style={styles.filterLabel}>Paese</ThemedText>
            <View style={[styles.pickerContainer, { borderColor: "#E0E0E0" }]}>
              <Picker
                selectedValue={country}
                onValueChange={setCountry}
                style={[styles.picker, { color: textColor }]}
              >
                {COUNTRIES.map((c) => (
                  <Picker.Item key={c.value} label={c.label} value={c.value} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        {/* Title Input */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Titolo *</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: "#E0E0E0", color: textColor }]}
            placeholder="Titolo del comunicato stampa"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
            maxLength={500}
          />
        </View>

        {/* Subtitle Input */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Sottotitolo</ThemedText>
          <TextInput
            style={[styles.input, { borderColor: "#E0E0E0", color: textColor }]}
            placeholder="Sottotitolo o sommario (opzionale)"
            placeholderTextColor="#999"
            value={subtitle}
            onChangeText={setSubtitle}
            maxLength={500}
          />
        </View>

        {/* Content Input */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Contenuto *</ThemedText>
          <TextInput
            style={[styles.textArea, { borderColor: "#E0E0E0", color: textColor }]}
            placeholder="Scrivi qui il tuo comunicato stampa..."
            placeholderTextColor="#999"
            value={content}
            onChangeText={setContent}
            multiline
            numberOfLines={12}
            textAlignVertical="top"
          />
        </View>

        {/* Boilerplate */}
        <View style={styles.inputGroup}>
          <ThemedText style={styles.label}>Nota Aziendale</ThemedText>
          <TextInput
            style={[styles.textAreaSmall, { borderColor: "#E0E0E0", color: textColor }]}
            placeholder="Breve descrizione dell'azienda (opzionale)"
            placeholderTextColor="#999"
            value={boilerplate}
            onChangeText={setBoilerplate}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Contact Info */}
        <View style={[styles.contactSection, { backgroundColor: "#F5F5F5" }]}>
          <ThemedText style={styles.sectionTitle}>Contatti per la Stampa</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: "#FFF", borderColor: "#E0E0E0", color: textColor }]}
            placeholder="Nome contatto"
            placeholderTextColor="#999"
            value={contactName}
            onChangeText={setContactName}
          />
          <TextInput
            style={[styles.input, { backgroundColor: "#FFF", borderColor: "#E0E0E0", color: textColor, marginTop: 12 }]}
            placeholder="Email contatto"
            placeholderTextColor="#999"
            value={contactEmail}
            onChangeText={setContactEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
      </ScrollView>

      {/* Send Button */}
      <View
        style={[styles.buttonContainer, { backgroundColor, paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <Pressable
          style={[
            styles.sendButton,
            { backgroundColor: "#4CAF50" },
            (sending || filteredCount === 0) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={sending || filteredCount === 0}
        >
          {sending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <ThemedText style={styles.sendButtonText}>
              📤 Invia a {filteredCount} Giornalisti
            </ThemedText>
          )}
        </Pressable>
      </View>
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
  header: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  statsCard: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    lineHeight: 40,
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
    textAlign: "center",
  },
  filtersRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#FFF",
  },
  picker: {
    height: 44,
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
    backgroundColor: "#FFF",
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 200,
    backgroundColor: "#FFF",
  },
  textAreaSmall: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: "#FFF",
  },
  contactSection: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  sendButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
});
