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
import { sendEmailsWithAttachments, formatPressReleaseEmail } from "@/lib/email-service";
import { trpc } from "@/lib/trpc";

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

interface SelectedImage {
  uri: string;
  base64?: string;
  fileName: string;
  mimeType: string;
}

const BASE_CATEGORIES = [
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
  
  // Images state
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [customJournalists, setCustomJournalists] = useState<Journalist[]>([]);
  
  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  
  // Recipients list modal and manual selection
  const [showRecipientsModal, setShowRecipientsModal] = useState(false);
  const [manuallySelectedIds, setManuallySelectedIds] = useState<Set<number>>(new Set());
  const [useManualSelection, setUseManualSelection] = useState(false);
  
  // Auto-timing state
  const [bestSendTime, setBestSendTime] = useState<{ dayOfWeek: number; hourOfDay: number; openRate: number } | null>(null);
  
  // Autopilot state
  const [showAutopilotModal, setShowAutopilotModal] = useState(false);
  const autopilotStatus = trpc.autopilot.status.useQuery(undefined, { enabled: false, retry: false });
  const autopilotLearning = trpc.autopilot.learningStats.useQuery(undefined, { enabled: false, retry: false });
  const startAutopilot = trpc.autopilot.start.useMutation();
  const stopAutopilot = trpc.autopilot.stop.useMutation();
  
  // Autonomous Autopilot (GROWVERSE)
  const autonomousStatus = trpc.autonomousAutopilot.getStatus.useQuery(undefined, { refetchInterval: 30000 });
  const setAutonomousActive = trpc.autonomousAutopilot.setActive.useMutation();
  const approveArticle = trpc.autonomousAutopilot.approveArticle.useMutation();
  const rejectArticle = trpc.autonomousAutopilot.rejectArticle.useMutation();
  const trendAnalysis = trpc.trends.detect.useQuery(undefined, { enabled: false, retry: false });
  
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, "background");
  const tintColor = useThemeColor({}, "tint");
  const textColor = useThemeColor({}, "text");

  // tRPC query for best send times
  const bestTimesQuery = trpc.stats.bestSendTimes.useQuery(undefined, {
    enabled: false,
    retry: false,
  });

  // Load journalists, templates, best times, and autopilot status on mount
  useEffect(() => {
    loadJournalists();
    loadTemplates();
    loadBestSendTime();
    autopilotStatus.refetch();
    autopilotLearning.refetch();
  }, []);

  const loadBestSendTime = async () => {
    try {
      const result = await bestTimesQuery.refetch();
      if (result.data && result.data.length > 0) {
        setBestSendTime(result.data[0]);
      }
    } catch (error) {
      console.log("Best times not available yet");
    }
  };

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
  
  // Dynamic categories from custom journalists
  const CATEGORIES = useMemo(() => {
    const customCategories = new Set<string>();
    customJournalists.forEach(j => {
      if (j.category && !BASE_CATEGORIES.some(c => c.value === j.category)) {
        customCategories.add(j.category);
      }
    });
    const dynamicCats = Array.from(customCategories).map(cat => ({
      label: `📁 ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
      value: cat,
    }));
    return [...BASE_CATEGORIES, ...dynamicCats];
  }, [customJournalists]);

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
  
  // Final recipients: either manually selected or filtered
  const finalRecipients = useMemo(() => {
    if (useManualSelection && manuallySelectedIds.size > 0) {
      return allJournalists.filter(j => manuallySelectedIds.has(j.id));
    }
    return filteredJournalists;
  }, [useManualSelection, manuallySelectedIds, allJournalists, filteredJournalists]);
  
  const recipientCount = finalRecipients.length;
  
  // Toggle journalist selection
  const toggleJournalistSelection = (id: number) => {
    setManuallySelectedIds(prev => {
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
  
  // Clear manual selection and use filters
  const clearManualSelection = () => {
    setManuallySelectedIds(new Set());
    setUseManualSelection(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                imageCount: imageCount,
              });

              // Send via backend API (which has RESEND_API_KEY configured)
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

        {/* Autopilot Status Card */}
        {autopilotStatus.data?.active && (
          <Pressable 
            style={styles.autopilotCard}
            onPress={() => setShowAutopilotModal(true)}
          >
            <View style={styles.autopilotHeader}>
              <ThemedText style={styles.autopilotTitle}>🤖 Autopilota Attivo</ThemedText>
              <View style={styles.autopilotBadge}>
                <ThemedText style={styles.autopilotBadgeText}>
                  {autopilotLearning.data?.confidenceLevel === "expert" ? "🎯 Esperto" :
                   autopilotLearning.data?.confidenceLevel === "optimized" ? "✅ Ottimizzato" :
                   autopilotLearning.data?.confidenceLevel === "improving" ? "📈 Migliorando" : "🧠 Imparando"}
                </ThemedText>
              </View>
            </View>
            <View style={styles.autopilotProgress}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${autopilotStatus.data.progress || 0}%` }]} />
              </View>
              <ThemedText style={styles.autopilotProgressText}>
                {autopilotStatus.data.sentCount?.toLocaleString()} / {autopilotStatus.data.totalJournalists?.toLocaleString()} inviati
              </ThemedText>
            </View>
            <ThemedText style={styles.autopilotSubtext}>
              📅 ~{autopilotStatus.data.daysRemaining} giorni rimanenti • Tocca per dettagli
            </ThemedText>
          </Pressable>
        )}

        {/* AUTONOMOUS AUTOPILOT PANEL - Always visible */}
        <View style={styles.autonomousPanel}>
          <LinearGradient
            colors={autonomousStatus.data?.active ? ["#1565C0", "#1976D2"] : ["#424242", "#616161"]}
            style={styles.autonomousPanelGradient}
          >
            <View style={styles.autonomousHeader}>
              <ThemedText style={styles.autonomousTitle}>
                🤖 Autopilota Autonomo GROWVERSE
              </ThemedText>
              <Pressable
                style={[
                  styles.autonomousToggle,
                  autonomousStatus.data?.active && styles.autonomousToggleActive
                ]}
                onPress={() => {
                  const newActive = !autonomousStatus.data?.active;
                  setAutonomousActive.mutate({ active: newActive }, {
                    onSuccess: () => {
                      Haptics.notificationAsync(
                        newActive 
                          ? Haptics.NotificationFeedbackType.Success 
                          : Haptics.NotificationFeedbackType.Warning
                      );
                    }
                  });
                }}
              >
                <ThemedText style={styles.autonomousToggleText}>
                  {autonomousStatus.data?.active ? "ON" : "OFF"}
                </ThemedText>
              </Pressable>
            </View>
            
            <ThemedText style={styles.autonomousDescription}>
              {autonomousStatus.data?.active 
                ? "✅ Monitora trend ogni ora e genera articoli automaticamente"
                : "⚠️ Attiva per monitorare trend e generare articoli su GROWVERSE"}
            </ThemedText>
            
            {/* Stats */}
            <View style={styles.autonomousStats}>
              <View style={styles.autonomousStat}>
                <ThemedText style={styles.autonomousStatNumber}>
                  {autonomousStatus.data?.stats?.trendsChecked || 0}
                </ThemedText>
                <ThemedText style={styles.autonomousStatLabel}>Trend Analizzati</ThemedText>
              </View>
              <View style={styles.autonomousStat}>
                <ThemedText style={styles.autonomousStatNumber}>
                  {autonomousStatus.data?.stats?.articlesGenerated || 0}
                </ThemedText>
                <ThemedText style={styles.autonomousStatLabel}>Articoli Generati</ThemedText>
              </View>
              <View style={styles.autonomousStat}>
                <ThemedText style={styles.autonomousStatNumber}>
                  {autonomousStatus.data?.stats?.articlesSent || 0}
                </ThemedText>
                <ThemedText style={styles.autonomousStatLabel}>Articoli Inviati</ThemedText>
              </View>
            </View>
            
            {/* Pending Approval */}
            {autonomousStatus.data?.pendingApproval && (
              <View style={styles.pendingApproval}>
                <ThemedText style={styles.pendingTitle}>
                  📝 Articolo in Attesa di Approvazione
                </ThemedText>
                <ThemedText style={styles.pendingArticleTitle}>
                  {autonomousStatus.data.pendingApproval.title}
                </ThemedText>
                <ThemedText style={styles.pendingTrend}>
                  Trend: {autonomousStatus.data.pendingApproval.trend?.title}
                </ThemedText>
                <View style={styles.pendingActions}>
                  <Pressable
                    style={styles.approveBtn}
                    onPress={() => {
                      approveArticle.mutate(
                        { articleId: autonomousStatus.data!.pendingApproval!.id },
                        {
                          onSuccess: () => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                            Alert.alert("✅ Approvato", "L'articolo verrà inviato ai giornalisti");
                          }
                        }
                      );
                    }}
                  >
                    <ThemedText style={styles.approveBtnText}>✅ Approva</ThemedText>
                  </Pressable>
                  <Pressable
                    style={styles.rejectBtn}
                    onPress={() => {
                      rejectArticle.mutate(
                        { articleId: autonomousStatus.data!.pendingApproval!.id },
                        {
                          onSuccess: () => {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                          }
                        }
                      );
                    }}
                  >
                    <ThemedText style={styles.rejectBtnText}>❌ Rifiuta</ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
            
            {/* Last Check */}
            {autonomousStatus.data?.lastCheck && (
              <ThemedText style={styles.lastCheck}>
                Ultimo controllo: {new Date(autonomousStatus.data.lastCheck).toLocaleString("it-IT")}
              </ThemedText>
            )}
          </LinearGradient>
        </View>

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

      {/* Floating Send Button with Recipients Preview */}
      <View
        style={[styles.buttonContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        {/* Best send time suggestion */}
        {bestSendTime && (
          <View style={styles.bestTimeBanner}>
            <ThemedText style={styles.bestTimeBannerText}>
              ⏰ Orario migliore: {["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"][bestSendTime.dayOfWeek]} ore {bestSendTime.hourOfDay}:00 ({bestSendTime.openRate.toFixed(0)}% aperture)
            </ThemedText>
          </View>
        )}
        
        {/* Button to see recipients list */}
        <Pressable
          style={styles.viewRecipientsButton}
          onPress={() => setShowRecipientsModal(true)}
        >
          <ThemedText style={styles.viewRecipientsText}>
            👥 {useManualSelection ? "Selezionati" : "Filtrati"}: {recipientCount} giornalisti - Tocca per vedere/selezionare
          </ThemedText>
        </Pressable>
        
        <Pressable
          style={({ pressed }) => [
            styles.sendButton,
            (sending || recipientCount === 0) && styles.sendButtonDisabled,
            pressed && styles.sendButtonPressed,
          ]}
          onPress={handleSend}
          disabled={sending || recipientCount === 0}
        >
          <LinearGradient
            colors={recipientCount === 0 ? ["#BDBDBD", "#9E9E9E"] : ["#2E7D32", "#43A047"]}
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
                  Invia a {recipientCount.toLocaleString()} Giornalisti
                  {selectedImages.length > 0 && ` (${selectedImages.length} 📷)`}
                </ThemedText>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
      
      {/* Recipients List Modal */}
      <Modal
        visible={showRecipientsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRecipientsModal(false)}
      >
        <View style={[styles.recipientsModalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowRecipientsModal(false)}>
              <ThemedText style={styles.modalClose}>✕</ThemedText>
            </Pressable>
            <ThemedText style={styles.modalTitle}>
              {useManualSelection ? "Giornalisti Selezionati" : "Destinatari Filtrati"}
            </ThemedText>
            <View style={{ width: 30 }} />
          </View>
          
          {useManualSelection && manuallySelectedIds.size > 0 && (
            <Pressable style={styles.clearSelectionBtn} onPress={clearManualSelection}>
              <ThemedText style={styles.clearSelectionText}>🗑️ Usa filtri invece della selezione manuale</ThemedText>
            </Pressable>
          )}
          
          <ThemedText style={styles.recipientsHint}>
            Tocca un giornalista per selezionarlo/deselezionarlo manualmente
          </ThemedText>
          
          <FlatList
            data={filteredJournalists}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => {
              const isSelected = useManualSelection 
                ? manuallySelectedIds.has(item.id)
                : true;
              return (
                <Pressable
                  style={[
                    styles.recipientItem,
                    isSelected && styles.recipientItemSelected
                  ]}
                  onPress={() => toggleJournalistSelection(item.id)}
                >
                  <View style={styles.recipientCheckbox}>
                    {isSelected && <ThemedText style={styles.checkmark}>✓</ThemedText>}
                  </View>
                  <View style={styles.recipientInfo}>
                    <ThemedText style={styles.recipientName}>{item.name}</ThemedText>
                    <ThemedText style={styles.recipientOutlet}>{item.outlet}</ThemedText>
                    <ThemedText style={styles.recipientEmail}>{item.email}</ThemedText>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={
              <ThemedText style={styles.emptyText}>Nessun giornalista trovato con i filtri attuali</ThemedText>
            }
          />
          
          <View style={styles.modalFooter}>
            <ThemedText style={styles.selectedCount}>
              {useManualSelection ? manuallySelectedIds.size : filteredCount} giornalisti selezionati
            </ThemedText>
            <Pressable
              style={styles.confirmRecipientsBtn}
              onPress={() => setShowRecipientsModal(false)}
            >
              <ThemedText style={styles.confirmRecipientsBtnText}>Conferma</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  
  // Recipients Modal Styles
  viewRecipientsButton: {
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    alignItems: "center",
  },
  viewRecipientsText: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },
  clearSelectionBtn: {
    backgroundColor: "#FFF3E0",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  clearSelectionText: {
    color: "#E65100",
    fontSize: 14,
    fontWeight: "500",
  },
  recipientsHint: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  recipientItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "transparent",
  },
  recipientItemSelected: {
    backgroundColor: "#E8F5E9",
    borderColor: "#4CAF50",
  },
  recipientCheckbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    backgroundColor: "#FFFFFF",
  },
  checkmark: {
    color: "#4CAF50",
    fontSize: 16,
    fontWeight: "700",
  },
  recipientInfo: {
    flex: 1,
  },
  recipientName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  recipientOutlet: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  recipientEmail: {
    fontSize: 12,
    color: "#2E7D32",
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  selectedCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  confirmRecipientsBtn: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  confirmRecipientsBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  recipientsModalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  bestTimeBanner: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#90CAF9",
  },
  bestTimeBannerText: {
    fontSize: 13,
    color: "#1565C0",
    fontWeight: "600",
    textAlign: "center",
  },
  
  // Autopilot Styles
  autopilotCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#4CAF50",
  },
  autopilotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  autopilotTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2E7D32",
  },
  autopilotBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  autopilotBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  autopilotProgress: {
    marginBottom: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: "#C8E6C9",
    borderRadius: 4,
    marginBottom: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#4CAF50",
    borderRadius: 4,
  },
  autopilotProgressText: {
    fontSize: 13,
    color: "#2E7D32",
    fontWeight: "500",
  },
  autopilotSubtext: {
    fontSize: 12,
    color: "#666",
  },
  startAutopilotBtn: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
  },
  startAutopilotGradient: {
    padding: 20,
    alignItems: "center",
  },
  startAutopilotText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  startAutopilotSubtext: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
  },
  
  // Autonomous Autopilot Panel
  autonomousPanel: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  autonomousPanelGradient: {
    padding: 20,
  },
  autonomousHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  autonomousTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    flex: 1,
  },
  autonomousToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  autonomousToggleActive: {
    backgroundColor: "#4CAF50",
  },
  autonomousToggleText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  autonomousDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 16,
    lineHeight: 20,
  },
  autonomousStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  autonomousStat: {
    alignItems: "center",
  },
  autonomousStatNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  autonomousStatLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.7)",
    marginTop: 4,
    textTransform: "uppercase",
  },
  pendingApproval: {
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  pendingTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1565C0",
    marginBottom: 8,
  },
  pendingArticleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  pendingTrend: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
  },
  pendingActions: {
    flexDirection: "row",
    gap: 12,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  approveBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#F44336",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  rejectBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  lastCheck: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
});
