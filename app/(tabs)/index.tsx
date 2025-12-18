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
import * as ImagePicker from "expo-image-picker";
import { Picker } from "@react-native-picker/picker";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { sendEmailsWithAttachments, isEmailConfigured, formatPressReleaseEmail } from "@/lib/email-service";

// Import static JSON data
import journalistsData from "@/assets/data/journalists.json";

const STORAGE_KEY = "gpress_custom_journalists";
const HISTORY_KEY = "gpress_sent_history";
const TEMPLATES_KEY = "gpress_templates";
const GROUPS_KEY = "gpress_saved_groups";

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

interface SavedGroup {
  id: number;
  name: string;
  journalistIds: number[];
  createdAt: string;
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

interface SelectedImage {
  uri: string;
  base64?: string;
  fileName: string;
  mimeType: string;
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
  { label: "🇨🇳 Cina", value: "CN" },
  { label: "🇷🇺 Russia", value: "RU" },
  { label: "🥽 Metaverso", value: "Metaverso" },
  { label: "🌍 Internazionale", value: "Internazionale" },
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
  
  // Images state
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [customJournalists, setCustomJournalists] = useState<Journalist[]>([]);
  
  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  
  // Selection state - per selezione singoli giornalisti
  const [selectedJournalistIds, setSelectedJournalistIds] = useState<Set<number>>(new Set());
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [useManualSelection, setUseManualSelection] = useState(false);
  
  // Email preview state
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  
  // Groups state
  const [savedGroups, setSavedGroups] = useState<SavedGroup[]>([]);
  const [showGroupsModal, setShowGroupsModal] = useState(false);
  const [showSaveGroupModal, setShowSaveGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, "background");
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");

  // Load journalists, templates and groups on mount
  useEffect(() => {
    loadJournalists();
    loadTemplates();
    loadGroups();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await AsyncStorage.getItem(TEMPLATES_KEY);
      if (data) setTemplates(JSON.parse(data));
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  };

  const loadGroups = async () => {
    try {
      const data = await AsyncStorage.getItem(GROUPS_KEY);
      if (data) setSavedGroups(JSON.parse(data));
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  };

  const saveGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert("Errore", "Inserisci un nome per il gruppo");
      return;
    }
    if (selectedJournalistIds.size === 0) {
      Alert.alert("Errore", "Seleziona almeno un giornalista per creare un gruppo");
      return;
    }

    const newGroup: SavedGroup = {
      id: Date.now(),
      name: groupName.trim(),
      journalistIds: Array.from(selectedJournalistIds),
      createdAt: new Date().toISOString(),
    };

    const updated = [...savedGroups, newGroup];
    await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(updated));
    setSavedGroups(updated);
    setGroupName("");
    setShowSaveGroupModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert("Salvato!", `Gruppo "${newGroup.name}" salvato con ${newGroup.journalistIds.length} giornalisti`);
  };

  const loadGroup = (group: SavedGroup) => {
    setSelectedJournalistIds(new Set(group.journalistIds));
    setUseManualSelection(true);
    setShowGroupsModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const deleteGroup = async (id: number) => {
    Alert.alert(
      "Elimina Gruppo",
      "Sei sicuro di voler eliminare questo gruppo?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            const updated = savedGroups.filter(g => g.id !== id);
            await AsyncStorage.setItem(GROUPS_KEY, JSON.stringify(updated));
            setSavedGroups(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
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

  // Image picker functions
  const pickImage = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          "Permesso Negato",
          "Per aggiungere immagini è necessario concedere l'accesso alla galleria."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.8,
        base64: true,
        selectionLimit: 5 - selectedImages.length, // Max 5 images total
      });

      if (!result.canceled && result.assets) {
        const newImages: SelectedImage[] = result.assets.map((asset, index) => ({
          uri: asset.uri,
          base64: asset.base64 || undefined,
          fileName: asset.fileName || `image_${Date.now()}_${index}.jpg`,
          mimeType: asset.mimeType || 'image/jpeg',
        }));
        
        setSelectedImages(prev => [...prev, ...newImages].slice(0, 5));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Errore", "Impossibile selezionare l'immagine");
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
  
  // Calcola destinatari effettivi: se selezione manuale usa quella, altrimenti usa filtri
  const effectiveRecipients = useMemo(() => {
    if (useManualSelection && selectedJournalistIds.size > 0) {
      return allJournalists.filter(j => selectedJournalistIds.has(j.id));
    }
    return filteredJournalists;
  }, [useManualSelection, selectedJournalistIds, filteredJournalists, allJournalists]);
  
  const filteredCount = effectiveRecipients.length;
  
  // Giornalisti cercati nel modal
  const searchedJournalists = useMemo(() => {
    if (!recipientSearch.trim()) return allJournalists;
    const query = recipientSearch.toLowerCase();
    return allJournalists.filter(j => 
      j.name?.toLowerCase().includes(query) ||
      j.outlet?.toLowerCase().includes(query) ||
      j.email?.toLowerCase().includes(query) ||
      j.country?.toLowerCase().includes(query)
    );
  }, [allJournalists, recipientSearch]);
  
  // Toggle selezione giornalista
  const toggleJournalistSelection = (id: number) => {
    setSelectedJournalistIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
    if (!useManualSelection) setUseManualSelection(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  // Seleziona tutti i filtrati
  const selectAllFiltered = () => {
    const ids = new Set(filteredJournalists.map(j => j.id));
    setSelectedJournalistIds(ids);
    setUseManualSelection(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };
  
  // Deseleziona tutti
  const deselectAll = () => {
    setSelectedJournalistIds(new Set());
    setUseManualSelection(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

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
    const imageCount = selectedImages.length;
    
    Alert.alert(
      "Conferma Invio",
      `Stai per inviare "${title}" a ${filteredCount} giornalisti.\n\nFiltri: ${categoryLabel}${country !== "all" ? `, ${countryLabel}` : ""}${imageCount > 0 ? `\n\nAllegati: ${imageCount} immagine/i` : ""}\n\nContinuare?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Invia",
          onPress: async () => {
            setSending(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            try {
              // Get all emails from effective recipients
              const emails = effectiveRecipients.map(j => j.email);
              
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
                imageCount: imageCount,
              });

              // Check if Resend API is configured
              if (!isEmailConfigured()) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(
                  "❌ Errore Configurazione",
                  "API Resend non configurata.\n\nContatta l'amministratore per configurare la chiave API.",
                  [{ text: "OK" }]
                );
                return;
              }

              // Use Resend API for automatic sending
              const htmlContent = formatPressReleaseEmail({
                title: title.trim(),
                subtitle: subtitle.trim(),
                content: content.trim(),
                boilerplate: boilerplate.trim(),
                contactName: contactName.trim(),
                contactEmail: contactEmail.trim(),
              });

              // Prepare attachments from selected images
              const attachments = selectedImages
                .filter(img => img.base64)
                .map(img => ({
                  filename: img.fileName,
                  content: img.base64!,
                  type: img.mimeType,
                }));

              const result = await sendEmailsWithAttachments({
                to: emails,
                subject: title.trim(),
                html: htmlContent,
                attachments: attachments.length > 0 ? attachments : undefined,
              });

              if (result.success) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                  "✅ Invio Completato!",
                  `Email inviata con successo a ${result.sent} giornalisti.${imageCount > 0 ? `\n\n${imageCount} immagine/i allegata/e.` : ""}`,
                  [
                    {
                      text: "OK",
                      onPress: () => {
                        setTitle("");
                        setSubtitle("");
                        setContent("");
                        setBoilerplate("");
                        setSelectedImages([]);
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

        {/* Recipients Preview Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <ThemedText style={styles.cardTitle}>📨 Destinatari ({filteredCount})</ThemedText>
            <View style={styles.templateButtons}>
              {useManualSelection && (
                <Pressable
                  style={[styles.templateBtn, { backgroundColor: "#FFF3E0" }]}
                  onPress={deselectAll}
                >
                  <ThemedText style={[styles.templateBtnText, { color: "#E65100" }]}>✖ Reset</ThemedText>
                </Pressable>
              )}
              <Pressable
                style={[styles.templateBtn, styles.templateBtnSave]}
                onPress={() => setShowRecipientsModal(true)}
              >
                <ThemedText style={[styles.templateBtnText, { color: "#fff" }]}>🔍 Cerca</ThemedText>
              </Pressable>
            </View>
          </View>
          
          {/* Mode indicator */}
          <View style={styles.modeIndicator}>
            <ThemedText style={styles.modeText}>
              {useManualSelection 
                ? `✅ Selezione manuale: ${selectedJournalistIds.size} giornalisti` 
                : `🎯 Filtro automatico: ${category !== "all" ? CATEGORIES.find(c => c.value === category)?.label : "Tutte le categorie"}${country !== "all" ? " - " + COUNTRIES.find(c => c.value === country)?.label : ""}`}
            </ThemedText>
          </View>
          
          {/* Groups buttons */}
          <View style={styles.groupsRow}>
            <Pressable
              style={[styles.groupBtn, { backgroundColor: "#E3F2FD" }]}
              onPress={() => setShowGroupsModal(true)}
            >
              <ThemedText style={[styles.groupBtnText, { color: "#1565C0" }]}>📁 Carica Gruppo ({savedGroups.length})</ThemedText>
            </Pressable>
            {selectedJournalistIds.size > 0 && (
              <Pressable
                style={[styles.groupBtn, { backgroundColor: "#E8F5E9" }]}
                onPress={() => setShowSaveGroupModal(true)}
              >
                <ThemedText style={[styles.groupBtnText, { color: "#2E7D32" }]}>💾 Salva Gruppo</ThemedText>
              </Pressable>
            )}
          </View>
          
          {/* Recipients list preview - show first 5 */}
          {effectiveRecipients.length > 0 ? (
            <View style={styles.recipientsList}>
              {effectiveRecipients.slice(0, 5).map((j) => (
                <View key={j.id} style={styles.recipientItem}>
                  <View style={styles.recipientInfo}>
                    <ThemedText style={styles.recipientName}>{j.name}</ThemedText>
                    <ThemedText style={styles.recipientOutlet}>{j.outlet}</ThemedText>
                  </View>
                  <ThemedText style={styles.recipientEmail}>{j.email}</ThemedText>
                </View>
              ))}
              {effectiveRecipients.length > 5 && (
                <Pressable 
                  style={styles.showMoreBtn}
                  onPress={() => setShowRecipientsModal(true)}
                >
                  <ThemedText style={styles.showMoreText}>
                    +{effectiveRecipients.length - 5} altri destinatari - Tocca per vedere tutti
                  </ThemedText>
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.noRecipients}>
              <ThemedText style={styles.noRecipientsText}>
                ⚠️ Nessun destinatario selezionato
              </ThemedText>
              <ThemedText style={styles.noRecipientsHint}>
                Modifica i filtri o cerca giornalisti specifici
              </ThemedText>
            </View>
          )}
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

          {/* Images Section */}
          <View style={styles.inputGroup}>
            <ThemedText style={styles.inputLabel}>
              📷 Immagini (opzionale)
            </ThemedText>
            <ThemedText style={styles.imageHint}>
              Aggiungi fino a 5 immagini da allegare al comunicato
            </ThemedText>
            
            {/* Image Preview Grid */}
            {selectedImages.length > 0 && (
              <View style={styles.imageGrid}>
                {selectedImages.map((img, index) => (
                  <View key={index} style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: img.uri }}
                      style={styles.imagePreview}
                      contentFit="cover"
                    />
                    <Pressable
                      style={styles.removeImageBtn}
                      onPress={() => removeImage(index)}
                    >
                      <ThemedText style={styles.removeImageText}>✕</ThemedText>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            
            {/* Add Image Button */}
            {selectedImages.length < 5 && (
              <Pressable
                style={styles.addImageBtn}
                onPress={pickImage}
              >
                <ThemedText style={styles.addImageIcon}>📷</ThemedText>
                <ThemedText style={styles.addImageText}>
                  {selectedImages.length === 0 
                    ? "Aggiungi Immagini" 
                    : `Aggiungi Altre (${5 - selectedImages.length} rimanenti)`}
                </ThemedText>
              </Pressable>
            )}
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

      {/* Recipients Selection Modal */}
      <Modal
        visible={showRecipientsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowRecipientsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.recipientsModalContent}>
            <View style={styles.recipientsModalHeader}>
              <ThemedText style={styles.modalTitle}>👥 Seleziona Destinatari</ThemedText>
              <Pressable onPress={() => setShowRecipientsModal(false)}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>
            
            {/* Search bar */}
            <View style={styles.recipientsSearchBar}>
              <ThemedText style={{ marginRight: 8 }}>🔍</ThemedText>
              <TextInput
                style={styles.recipientsSearchInput}
                placeholder="Cerca per nome, testata, email..."
                placeholderTextColor="#999"
                value={recipientSearch}
                onChangeText={setRecipientSearch}
              />
              {recipientSearch.length > 0 && (
                <Pressable onPress={() => setRecipientSearch("")}>
                  <ThemedText style={{ color: "#999" }}>✕</ThemedText>
                </Pressable>
              )}
            </View>
            
            {/* Action buttons */}
            <View style={styles.recipientsActions}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#E8F5E9" }]}
                onPress={selectAllFiltered}
              >
                <ThemedText style={[styles.actionBtnText, { color: "#2E7D32" }]}>
                  ✅ Seleziona tutti ({filteredJournalists.length})
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: "#FFF3E0" }]}
                onPress={deselectAll}
              >
                <ThemedText style={[styles.actionBtnText, { color: "#E65100" }]}>
                  ✖ Deseleziona tutti
                </ThemedText>
              </Pressable>
            </View>
            
            {/* Selected count */}
            <View style={{ paddingHorizontal: 16, marginBottom: 8 }}>
              <ThemedText style={{ fontSize: 13, color: "#666" }}>
                {selectedJournalistIds.size > 0 
                  ? `${selectedJournalistIds.size} selezionati su ${searchedJournalists.length} mostrati`
                  : `${searchedJournalists.length} giornalisti trovati`}
              </ThemedText>
            </View>
            
            {/* Journalists list */}
            <FlatList
              data={searchedJournalists}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => {
                const isSelected = selectedJournalistIds.has(item.id);
                return (
                  <Pressable
                    style={[styles.recipientSelectItem, isSelected && styles.recipientSelectItemSelected]}
                    onPress={() => toggleJournalistSelection(item.id)}
                  >
                    <View style={[styles.recipientCheckbox, isSelected && styles.recipientCheckboxSelected]}>
                      {isSelected && <ThemedText style={styles.recipientCheckmark}>✓</ThemedText>}
                    </View>
                    <View style={styles.recipientSelectInfo}>
                      <ThemedText style={styles.recipientSelectName}>{item.name}</ThemedText>
                      <ThemedText style={styles.recipientSelectOutlet}>{item.outlet} • {item.country}</ThemedText>
                      <ThemedText style={styles.recipientSelectEmail}>{item.email}</ThemedText>
                    </View>
                  </Pressable>
                );
              }}
              style={{ maxHeight: 400 }}
            />
          </View>
        </View>
      </Modal>

      {/* Groups Modal */}
      <Modal
        visible={showGroupsModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowGroupsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>📁 Gruppi Salvati</ThemedText>
              <Pressable onPress={() => setShowGroupsModal(false)}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>
            
            {savedGroups.length === 0 ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ThemedText style={{ fontSize: 48, marginBottom: 16 }}>📂</ThemedText>
                <ThemedText style={{ fontSize: 16, color: "#666", textAlign: "center" }}>
                  Nessun gruppo salvato.{"\n"}Seleziona dei giornalisti e salva un gruppo!
                </ThemedText>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {savedGroups.map((group) => (
                  <View key={group.id} style={styles.groupItem}>
                    <View style={styles.groupInfo}>
                      <ThemedText style={styles.groupName}>{group.name}</ThemedText>
                      <ThemedText style={styles.groupCount}>{group.journalistIds.length} giornalisti</ThemedText>
                    </View>
                    <View style={styles.groupActions}>
                      <Pressable
                        style={[styles.groupActionBtn, { backgroundColor: "#E8F5E9" }]}
                        onPress={() => loadGroup(group)}
                      >
                        <ThemedText style={{ color: "#2E7D32", fontWeight: "600" }}>✔ Usa</ThemedText>
                      </Pressable>
                      <Pressable
                        style={[styles.groupActionBtn, { backgroundColor: "#FFEBEE" }]}
                        onPress={() => deleteGroup(group.id)}
                      >
                        <ThemedText style={{ color: "#C62828", fontWeight: "600" }}>🗑</ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Save Group Modal */}
      <Modal
        visible={showSaveGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSaveGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>💾 Salva Gruppo</ThemedText>
              <Pressable onPress={() => setShowSaveGroupModal(false)}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>
            
            <View style={{ padding: 16 }}>
              <ThemedText style={{ fontSize: 14, color: "#666", marginBottom: 16 }}>
                Stai per salvare {selectedJournalistIds.size} giornalisti in un nuovo gruppo.
              </ThemedText>
              
              <TextInput
                style={styles.input}
                placeholder="Nome del gruppo (es. Tech Italia, Business USA)"
                placeholderTextColor="#9E9E9E"
                value={groupName}
                onChangeText={setGroupName}
              />
              
              <Pressable
                style={[styles.sendButton, { marginTop: 16 }]}
                onPress={saveGroup}
              >
                <LinearGradient
                  colors={["#1565C0", "#1976D2"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.sendButtonGradient}
                >
                  <ThemedText style={styles.sendButtonText}>💾 Salva Gruppo</ThemedText>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Email Preview Modal */}
      <Modal
        visible={showPreviewModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowPreviewModal(false)}
      >
        <View style={[styles.previewContainer, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>👁 Anteprima Email</ThemedText>
            <Pressable onPress={() => setShowPreviewModal(false)}>
              <ThemedText style={styles.modalClose}>✕</ThemedText>
            </Pressable>
          </View>
          
          <ScrollView style={{ flex: 1 }}>
            <View style={styles.previewContent}>
              <ThemedText style={styles.previewTitle}>{title || "[Titolo]"}</ThemedText>
              {subtitle && <ThemedText style={styles.previewSubtitle}>{subtitle}</ThemedText>}
              <ThemedText style={styles.previewBody}>{content || "[Contenuto del comunicato]"}</ThemedText>
              
              {boilerplate && (
                <View style={styles.previewBoilerplate}>
                  <ThemedText style={styles.previewBoilerplateTitle}>Chi siamo</ThemedText>
                  <ThemedText style={styles.previewBoilerplateText}>{boilerplate}</ThemedText>
                </View>
              )}
              
              {(contactName || contactEmail) && (
                <View style={styles.previewContact}>
                  <ThemedText style={styles.previewContactTitle}>Contatti per la stampa</ThemedText>
                  {contactName && <ThemedText style={styles.previewContactText}>{contactName}</ThemedText>}
                  {contactEmail && <ThemedText style={[styles.previewContactText, { color: "#1565C0" }]}>{contactEmail}</ThemedText>}
                </View>
              )}
              
              {selectedImages.length > 0 && (
                <View style={styles.previewImages}>
                  <ThemedText style={styles.previewImagesTitle}>📎 Allegati ({selectedImages.length} immagini)</ThemedText>
                  <View style={styles.previewImageRow}>
                    {selectedImages.map((img, idx) => (
                      <Image key={idx} source={{ uri: img.uri }} style={styles.previewImageThumb} />
                    ))}
                  </View>
                </View>
              )}
              
              <View style={styles.previewFooter}>
                <ThemedText style={styles.previewFooterText}>
                  Roberto Romagnino{"\n"}Founder & CEO{"\n"}GROWVERSE, LLC{"\n\n"}Inviato con G-Press - Distribuzione Comunicati Stampa
                </ThemedText>
              </View>
            </View>
          </ScrollView>
          
          <View style={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) }}>
            <Pressable
              style={styles.sendButton}
              onPress={() => {
                setShowPreviewModal(false);
                handleSend();
              }}
              disabled={sending || filteredCount === 0}
            >
              <LinearGradient
                colors={filteredCount === 0 ? ["#BDBDBD", "#9E9E9E"] : ["#2E7D32", "#43A047"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sendButtonGradient}
              >
                <ThemedText style={styles.sendButtonText}>
                  📤 Invia a {filteredCount.toLocaleString()} Giornalisti
                </ThemedText>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Floating Send Button */}
      <View
        style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        {/* Preview button */}
        <Pressable
          style={({ pressed }) => [
            styles.previewButton,
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => setShowPreviewModal(true)}
        >
          <ThemedText style={styles.previewButtonText}>👁</ThemedText>
        </Pressable>
        
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            { flex: 1 },
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
                  {selectedImages.length > 0 && ` (${selectedImages.length} 📷)`}
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
  
  // Image Section
  imageHint: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  imagePreviewContainer: {
    position: "relative",
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  removeImageText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  addImageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F0F7F0",
    borderWidth: 2,
    borderColor: "#C8E6C9",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
  },
  addImageIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  addImageText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E7D32",
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
    flexDirection: "row",
    alignItems: "center",
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
  
  // Recipients section styles
  modeIndicator: {
    backgroundColor: "#F0F7F0",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  modeText: {
    fontSize: 13,
    color: "#2E7D32",
    textAlign: "center",
  },
  recipientsList: {
    gap: 8,
  },
  recipientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 12,
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  recipientOutlet: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  recipientEmail: {
    fontSize: 11,
    color: "#43A047",
    marginLeft: 8,
  },
  showMoreBtn: {
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  showMoreText: {
    fontSize: 13,
    color: "#2E7D32",
    fontWeight: "600",
  },
  noRecipients: {
    alignItems: "center",
    padding: 20,
  },
  noRecipientsText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E65100",
  },
  noRecipientsHint: {
    fontSize: 13,
    color: "#999",
    marginTop: 4,
  },
  
  // Recipients modal styles
  recipientsModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "85%",
  },
  recipientsModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  recipientsSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    margin: 16,
    paddingHorizontal: 12,
  },
  recipientsSearchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#1A1A1A",
  },
  recipientsActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  recipientSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  recipientSelectItemSelected: {
    backgroundColor: "#E8F5E9",
  },
  recipientCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#CCC",
    marginRight: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  recipientCheckboxSelected: {
    backgroundColor: "#43A047",
    borderColor: "#43A047",
  },
  recipientCheckmark: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  recipientSelectInfo: {
    flex: 1,
  },
  recipientSelectName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  recipientSelectOutlet: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  recipientSelectEmail: {
    fontSize: 12,
    color: "#43A047",
    marginTop: 2,
  },
  groupsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  groupBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  groupBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  groupItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  groupCount: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  groupActions: {
    flexDirection: "row",
    gap: 8,
  },
  groupActionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  previewContent: {
    backgroundColor: "#FFFFFF",
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#2E7D32",
    marginBottom: 8,
  },
  previewSubtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  previewBody: {
    fontSize: 15,
    lineHeight: 24,
    color: "#333",
    marginBottom: 20,
  },
  previewBoilerplate: {
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 16,
    marginTop: 16,
  },
  previewBoilerplateTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  previewBoilerplateText: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  previewContact: {
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 14,
    marginTop: 16,
  },
  previewContactTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
  },
  previewContactText: {
    fontSize: 14,
    color: "#666",
  },
  previewFooter: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    alignItems: "center",
  },
  previewFooterText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },
  previewImages: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    paddingTop: 16,
  },
  previewImagesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 10,
  },
  previewImageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  previewImageThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  previewButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  previewButtonText: {
    fontSize: 24,
  },
});
