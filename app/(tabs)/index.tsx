import { useState, useEffect, useMemo } from "react";
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
  Linking,
  Modal,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Picker } from "@react-native-picker/picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { sendEmails, isEmailConfigured, formatPressReleaseEmail } from "@/lib/email-service";

// Import static JSON data
import journalistsData from "@/assets/data/journalists.json";

const STORAGE_KEY = "gpress_custom_journalists";
const HISTORY_KEY = "gpress_sent_history";
const TEMPLATES_KEY = "gpress_templates";

interface Template {
  id: number;
  name: string;
  title: string;
  subtitle: string;
  content: string;
  boilerplate: string;
  contactName: string;
  contactEmail: string;
}

interface Journalist {
  id: number;
  name: string;
  email: string;
  outlet: string;
  country: string;
  category: string;
  active: boolean;
}

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
  const [isLoading, setIsLoading] = useState(true);
  
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [customJournalists, setCustomJournalists] = useState<Journalist[]>([]);
  
  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, "background");
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");

  // Load journalists and templates on mount
  useEffect(() => {
    loadJournalists();
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await AsyncStorage.getItem(TEMPLATES_KEY);
      if (data) setTemplates(JSON.parse(data));
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const saveTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert("Errore", "Inserisci un nome per il template");
      return;
    }
    if (!title.trim() && !content.trim()) {
      Alert.alert("Errore", "Il template deve avere almeno un titolo o un contenuto");
      return;
    }

    const newTemplate: Template = {
      id: Date.now(),
      name: templateName.trim(),
      title: title.trim(),
      subtitle: subtitle.trim(),
      content: content.trim(),
      boilerplate: boilerplate.trim(),
      contactName: contactName.trim(),
      contactEmail: contactEmail.trim(),
    };

    const updated = [...templates, newTemplate];
    await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
    setTemplates(updated);
    setTemplateName("");
    setShowSaveTemplateModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Salvato!", `Template "${newTemplate.name}" salvato con successo`);
  };

  const loadTemplate = (template: Template) => {
    setTitle(template.title);
    setSubtitle(template.subtitle);
    setContent(template.content);
    setBoilerplate(template.boilerplate);
    setContactName(template.contactName);
    setContactEmail(template.contactEmail);
    setShowTemplatesModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const deleteTemplate = async (id: number) => {
    Alert.alert(
      "Elimina Template",
      "Sei sicuro di voler eliminare questo template?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            const updated = templates.filter(t => t.id !== id);
            await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
            setTemplates(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  const loadJournalists = async () => {
    setIsLoading(true);
    try {
      // Load static data
      const staticData = journalistsData as Journalist[];
      
      // Load custom journalists from AsyncStorage
      const customData = await AsyncStorage.getItem(STORAGE_KEY);
      const custom = customData ? JSON.parse(customData) : [];
      
      setJournalists(staticData);
      setCustomJournalists(custom);
    } catch (error) {
      console.error("Error loading journalists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Combine and filter journalists
  const allJournalists = useMemo(() => {
    return [...customJournalists, ...journalists];
  }, [journalists, customJournalists]);

  const filteredJournalists = useMemo(() => {
    let filtered = allJournalists;
    
    if (category !== "all") {
      filtered = filtered.filter(j => j.category === category);
    }
    
    if (country !== "all") {
      filtered = filtered.filter(j => j.country === country);
    }
    
    return filtered;
  }, [allJournalists, category, country]);

  const totalCount = allJournalists.length;
  const filteredCount = filteredJournalists.length;

  const saveToHistory = async (pressRelease: any) => {
    try {
      const historyData = await AsyncStorage.getItem(HISTORY_KEY);
      const history = historyData ? JSON.parse(historyData) : [];
      history.unshift(pressRelease);
      // Keep only last 50 items
      if (history.length > 50) history.pop();
      await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

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
              // Get all emails
              const emails = filteredJournalists.map(j => j.email);
              
              // Save to history first
              await saveToHistory({
                id: Date.now(),
                title: title.trim(),
                subtitle: subtitle.trim(),
                content: content.trim(),
                boilerplate: boilerplate.trim(),
                contactName: contactName.trim(),
                contactEmail: contactEmail.trim(),
                sentAt: new Date().toISOString(),
                recipientCount: filteredCount,
                category: category,
                country: country,
              });

              // Check if Resend API is configured
              if (isEmailConfigured()) {
                // Use Resend API for automatic sending
                const htmlContent = formatPressReleaseEmail({
                  title: title.trim(),
                  subtitle: subtitle.trim(),
                  content: content.trim(),
                  boilerplate: boilerplate.trim(),
                  contactName: contactName.trim(),
                  contactEmail: contactEmail.trim(),
                });

                const result = await sendEmails({
                  to: emails,
                  subject: title.trim(),
                  html: htmlContent,
                });

                if (result.success) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert(
                    "✅ Invio Completato!",
                    `Email inviata con successo a ${result.sent} giornalisti.`,
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
                } else {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  Alert.alert(
                    "⚠️ Invio Parziale",
                    `Inviate: ${result.sent}\nFallite: ${result.failed}\n\n${result.errors.join("\n")}`,
                    [{ text: "OK" }]
                  );
                }
              } else {
                // Fallback to mailto for manual sending
                let body = content.trim();
                if (subtitle.trim()) {
                  body = `${subtitle.trim()}\n\n${body}`;
                }
                if (boilerplate.trim()) {
                  body += `\n\n---\n${boilerplate.trim()}`;
                }
                if (contactName.trim() || contactEmail.trim()) {
                  body += `\n\nContatti:\n${contactName.trim()}${contactEmail.trim() ? ` - ${contactEmail.trim()}` : ""}`;
                }
                
                const batchSize = 50;
                const firstBatch = emails.slice(0, batchSize);
                const mailtoUrl = `mailto:?bcc=${firstBatch.join(",")}&subject=${encodeURIComponent(title.trim())}&body=${encodeURIComponent(body)}`;
                
                const canOpen = await Linking.canOpenURL(mailtoUrl);
                if (canOpen) {
                  await Linking.openURL(mailtoUrl);
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  Alert.alert(
                    "Email Preparata",
                    `L'app email si è aperta con ${Math.min(firstBatch.length, filteredCount)} destinatari.\n\nAPI Resend non configurata - usando client email.`,
                    [{ text: "OK" }]
                  );
                } else {
                  Alert.alert("Errore", "Impossibile aprire l'app email.");
                }
              }
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
      style={[styles.container, { backgroundColor: "#F8F9FA" }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { 
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 20) + 100 
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Header with Gradient */}
        <LinearGradient
          colors={["#2E7D32", "#43A047", "#66BB6A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroHeader}
        >
          <View style={styles.heroContent}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <View style={styles.heroText}>
              <ThemedText style={styles.heroTitle}>G-Press</ThemedText>
              <ThemedText style={styles.heroSubtitle}>
                Distribuzione Comunicati Stampa
              </ThemedText>
            </View>
          </View>
          
          {/* Stats inside hero */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <ThemedText style={styles.statNumber}>
                {isLoading ? "..." : totalCount.toLocaleString()}
              </ThemedText>
              <ThemedText style={styles.statText}>Giornalisti</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <ThemedText style={[styles.statNumber, { color: "#C8E6C9" }]}>
                {filteredCount.toLocaleString()}
              </ThemedText>
              <ThemedText style={styles.statText}>Destinatari</ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Filters Card */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>🎯 Filtra Destinatari</ThemedText>
          <View style={styles.filtersRow}>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>Categoria</ThemedText>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={category}
                  onValueChange={setCategory}
                  style={styles.picker}
                  dropdownIconColor="#666"
                >
                  {CATEGORIES.map((cat) => (
                    <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
                  ))}
                </Picker>
              </View>
            </View>
            <View style={styles.filterItem}>
              <ThemedText style={styles.filterLabel}>Paese</ThemedText>
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={country}
                  onValueChange={setCountry}
                  style={styles.picker}
                  dropdownIconColor="#666"
                >
                  {COUNTRIES.map((c) => (
                    <Picker.Item key={c.value} label={c.label} value={c.value} />
                  ))}
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Press Release Form Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <ThemedText style={styles.cardTitle}>📝 Comunicato Stampa</ThemedText>
            <View style={styles.templateButtons}>
              <Pressable
                style={styles.templateBtn}
                onPress={() => setShowTemplatesModal(true)}
              >
                <ThemedText style={styles.templateBtnText}>📂 Carica</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.templateBtn, styles.templateBtnSave]}
                onPress={() => setShowSaveTemplateModal(true)}
              >
                <ThemedText style={[styles.templateBtnText, { color: "#fff" }]}>💾 Salva</ThemedText>
              </Pressable>
            </View>
          </View>
          
          {/* Title Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>
              Titolo <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Es: Lancio del nuovo prodotto XYZ"
              placeholderTextColor="#9E9E9E"
              value={title}
              onChangeText={setTitle}
              maxLength={500}
            />
          </View>

          {/* Subtitle Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Sottotitolo</ThemedText>
            <TextInput
              style={styles.input}
              placeholder="Breve sommario (opzionale)"
              placeholderTextColor="#9E9E9E"
              value={subtitle}
              onChangeText={setSubtitle}
              maxLength={500}
            />
          </View>

          {/* Content Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>
              Contenuto <ThemedText style={styles.required}>*</ThemedText>
            </ThemedText>
            <TextInput
              style={styles.textArea}
              placeholder="Scrivi qui il tuo comunicato stampa completo..."
              placeholderTextColor="#9E9E9E"
              value={content}
              onChangeText={setContent}
              multiline
              numberOfLines={12}
              textAlignVertical="top"
            />
            <ThemedText style={styles.charCount}>
              {content.length} caratteri
            </ThemedText>
          </View>
        </View>

        {/* Additional Info Card */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>ℹ️ Informazioni Aggiuntive</ThemedText>
          
          {/* Boilerplate */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>Nota Aziendale</ThemedText>
            <TextInput
              style={styles.textAreaSmall}
              placeholder="Chi siamo, cosa facciamo... (opzionale)"
              placeholderTextColor="#9E9E9E"
              value={boilerplate}
              onChangeText={setBoilerplate}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Contact Section */}
          <View style={styles.contactSection}>
            <ThemedText style={styles.contactTitle}>Contatti per la Stampa</ThemedText>
            <View style={styles.contactRow}>
              <TextInput
                style={[styles.input, styles.contactInput]}
                placeholder="Nome"
                placeholderTextColor="#9E9E9E"
                value={contactName}
                onChangeText={setContactName}
              />
              <TextInput
                style={[styles.input, styles.contactInput]}
                placeholder="Email"
                placeholderTextColor="#9E9E9E"
                value={contactEmail}
                onChangeText={setContactEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Templates Modal */}
      <Modal
        visible={showTemplatesModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowTemplatesModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>📂 Template Salvati</ThemedText>
              <Pressable onPress={() => setShowTemplatesModal(false)}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>
            <ScrollView style={styles.modalScroll}>
              {templates.length === 0 ? (
                <ThemedText style={styles.emptyText}>Nessun template salvato</ThemedText>
              ) : (
                templates.map((template) => (
                  <View key={template.id} style={styles.templateItem}>
                    <Pressable
                      style={styles.templateItemContent}
                      onPress={() => loadTemplate(template)}
                    >
                      <ThemedText style={styles.templateItemName}>{template.name}</ThemedText>
                      <ThemedText style={styles.templateItemPreview} numberOfLines={1}>
                        {template.title || template.content.substring(0, 50)}
                      </ThemedText>
                    </Pressable>
                    <Pressable onPress={() => deleteTemplate(template.id)}>
                      <ThemedText style={styles.templateDelete}>🗑️</ThemedText>
                    </Pressable>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Save Template Modal */}
      <Modal
        visible={showSaveTemplateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSaveTemplateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>💾 Salva Template</ThemedText>
              <Pressable onPress={() => setShowSaveTemplateModal(false)}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome del template"
              placeholderTextColor="#9E9E9E"
              value={templateName}
              onChangeText={setTemplateName}
            />
            <Pressable style={styles.modalSaveBtn} onPress={saveTemplate}>
              <ThemedText style={styles.modalSaveBtnText}>Salva Template</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Floating Send Button */}
      <View
        style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (sending || filteredCount === 0) && styles.sendButtonDisabled,
            pressed && styles.sendButtonPressed,
          ]}
          onPress={handleSend}
          disabled={sending || filteredCount === 0}
        >
          <LinearGradient
            colors={filteredCount === 0 ? ["#BDBDBD", "#9E9E9E"] : ["#2E7D32", "#43A047"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sendButtonGradient}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <ThemedText style={styles.sendButtonIcon}>📤</ThemedText>
                <ThemedText style={styles.sendButtonText}>
                  Invia a {filteredCount.toLocaleString()} Giornalisti
                </ThemedText>
              </>
            )}
          </LinearGradient>
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
    paddingHorizontal: 16,
  },
  
  // Hero Header
  heroHeader: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  heroContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 60,
    height: 60,
    borderRadius: 12,
  },
  heroText: {
    marginLeft: 16,
    flex: 1,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 16,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 16,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  
  // Cards
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  templateButtons: {
    flexDirection: "row",
    gap: 8,
  },
  templateBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F0F0F0",
  },
  templateBtnSave: {
    backgroundColor: "#2E7D32",
  },
  templateBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#333",
  },
  
  // Filters
  filtersRow: {
    flexDirection: "row",
    gap: 12,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickerWrapper: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    overflow: "hidden",
  },
  picker: {
    height: 48,
    color: "#333",
  },
  
  // Inputs
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  required: {
    color: "#E53935",
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: "#1A1A1A",
  },
  textArea: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    minHeight: 180,
    color: "#1A1A1A",
  },
  textAreaSmall: {
    backgroundColor: "#F8F9FA",
    borderWidth: 1,
    borderColor: "#E8E8E8",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    minHeight: 100,
    color: "#1A1A1A",
  },
  charCount: {
    fontSize: 12,
    color: "#9E9E9E",
    textAlign: "right",
    marginTop: 6,
  },
  
  // Contact Section
  contactSection: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  contactTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 12,
  },
  contactRow: {
    flexDirection: "row",
    gap: 12,
  },
  contactInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  
  // Send Button
  buttonContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: "#F8F9FA",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  sendButton: {
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#2E7D32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sendButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  sendButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
  },
  sendButtonPressed: {
    transform: [{ scale: 0.98 }],
  },
  sendButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  sendButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: "70%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modalClose: {
    fontSize: 24,
    color: "#666",
    padding: 4,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  modalSaveBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    padding: 20,
  },
  templateItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  templateItemContent: {
    flex: 1,
  },
  templateItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  templateItemPreview: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  templateDelete: {
    fontSize: 18,
    padding: 8,
  },
});
