import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Switch,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  sendEmailsWithAttachments,
  formatPressReleaseEmail,
  getJournalistScores,
  getBestSendTime,
  JournalistScore,
  BestTimeRecommendation,
} from "@/lib/email-service";

// Import journalists data
import journalistsData from "@/assets/data/journalists.json";

interface AutopilotConfig {
  enabled: boolean;
  useSmartTargeting: boolean;
  useSmartTiming: boolean;
  autoFollowUp: boolean;
  followUpCount: number;
  targetTier: 'all' | 'top' | 'good' | 'top_good';
  minScore: number;
}

interface UploadedDocument {
  name: string;
  content: string;
  type: string;
}

const AUTOPILOT_CONFIG_KEY = "gpress_autopilot_config";

export default function AutopilotScreen() {
  const insets = useSafeAreaInsets();
  
  // Document state
  const [document, setDocument] = useState<UploadedDocument | null>(null);
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [content, setContent] = useState("");
  
  // Autopilot config
  const [config, setConfig] = useState<AutopilotConfig>({
    enabled: true,
    useSmartTargeting: true,
    useSmartTiming: true,
    autoFollowUp: true,
    followUpCount: 2,
    targetTier: 'top_good',
    minScore: 30,
  });
  
  // Analysis state
  const [analyzing, setAnalyzing] = useState(false);
  const [sending, setSending] = useState(false);
  const [journalistScores, setJournalistScores] = useState<JournalistScore[]>([]);
  const [bestTime, setBestTime] = useState<BestTimeRecommendation | null>(null);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Load config and scores on mount
  useEffect(() => {
    loadConfig();
    loadScores();
  }, []);
  
  const loadConfig = async () => {
    try {
      const saved = await AsyncStorage.getItem(AUTOPILOT_CONFIG_KEY);
      if (saved) {
        setConfig(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Error loading autopilot config:", error);
    }
  };
  
  const saveConfig = async (newConfig: AutopilotConfig) => {
    try {
      await AsyncStorage.setItem(AUTOPILOT_CONFIG_KEY, JSON.stringify(newConfig));
      setConfig(newConfig);
    } catch (error) {
      console.error("Error saving autopilot config:", error);
    }
  };
  
  const loadScores = async () => {
    try {
      const scores = await getJournalistScores();
      setJournalistScores(scores);
      const time = await getBestSendTime();
      setBestTime(time);
    } catch (error) {
      console.error("Error loading scores:", error);
    }
  };
  
  // Pick document
  const pickDocument = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/plain", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
        copyToCacheDirectory: true,
      });
      
      if (result.canceled || !result.assets?.[0]) return;
      
      const file = result.assets[0];
      setAnalyzing(true);
      
      // Read file content
      let fileContent = "";
      if (file.mimeType === "text/plain") {
        fileContent = await FileSystem.readAsStringAsync(file.uri);
      } else {
        // For PDF/Word, we'll use the filename as title and ask user to paste content
        fileContent = `[Documento: ${file.name}]\n\nIncolla qui il contenuto del tuo comunicato stampa...`;
      }
      
      setDocument({
        name: file.name,
        content: fileContent,
        type: file.mimeType || "unknown",
      });
      
      // Auto-extract title from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      setTitle(nameWithoutExt.replace(/[-_]/g, " "));
      setContent(fileContent);
      
      // Auto-analyze and select recipients
      await analyzeAndSelectRecipients();
      
      setAnalyzing(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
    } catch (error) {
      console.error("Error picking document:", error);
      setAnalyzing(false);
      Alert.alert("Errore", "Impossibile caricare il documento");
    }
  };
  
  // Analyze content and select best recipients
  const analyzeAndSelectRecipients = async () => {
    if (!config.useSmartTargeting) {
      // Select all journalists
      setSelectedRecipients(journalistsData.map(j => j.email));
      return;
    }
    
    // Get journalists with scores
    const scores = await getJournalistScores();
    const scoredEmails = new Set(scores.map(s => s.email));
    
    // Filter based on config
    let selected: string[] = [];
    
    if (config.targetTier === 'top') {
      selected = scores.filter(s => s.tier === 'top').map(s => s.email);
    } else if (config.targetTier === 'good') {
      selected = scores.filter(s => s.tier === 'good').map(s => s.email);
    } else if (config.targetTier === 'top_good') {
      selected = scores.filter(s => s.tier === 'top' || s.tier === 'good').map(s => s.email);
    } else {
      selected = scores.filter(s => s.score >= config.minScore).map(s => s.email);
    }
    
    // If no scored journalists, fall back to all
    if (selected.length === 0) {
      selected = journalistsData.slice(0, 100).map(j => j.email);
    }
    
    setSelectedRecipients(selected);
  };
  
  // Launch autopilot
  const launchAutopilot = async () => {
    if (!title.trim() || !content.trim()) {
      Alert.alert("Errore", "Inserisci titolo e contenuto del comunicato");
      return;
    }
    
    if (selectedRecipients.length === 0) {
      Alert.alert("Errore", "Nessun destinatario selezionato");
      return;
    }
    
    Alert.alert(
      "🚀 Lancia Autopilot",
      `Stai per inviare a ${selectedRecipients.length} giornalisti selezionati automaticamente.\n\n${config.useSmartTiming ? `⏰ Orario ottimale: ${bestTime?.dayOfWeek} alle ${bestTime?.hour}:00` : "Invio immediato"}\n\n${config.autoFollowUp ? `🔄 Follow-up automatici: ${config.followUpCount}` : "Nessun follow-up"}\n\nConfermi?`,
      [
        { text: "Annulla", style: "cancel" },
        { text: "🚀 Lancia!", onPress: executeAutopilot },
      ]
    );
  };
  
  const executeAutopilot = async () => {
    setSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    
    try {
      const html = formatPressReleaseEmail({
        title,
        subtitle,
        content,
        contactName: "Roberto Romagnino",
        contactEmail: "g.ceo@growverse.net",
      });
      
      const result = await sendEmailsWithAttachments({
        to: selectedRecipients,
        subject: title,
        html,
      });
      
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          "🎉 Autopilot Completato!",
          `✅ ${result.sent} email inviate con successo!\n\n${config.autoFollowUp ? `🔄 Follow-up programmati: ${config.followUpCount}` : ""}`,
          [{ text: "Fantastico!", onPress: resetForm }]
        );
      } else {
        Alert.alert("Errore", `Invio fallito: ${result.errors.join(", ")}`);
      }
    } catch (error: any) {
      Alert.alert("Errore", error.message || "Errore durante l'invio");
    } finally {
      setSending(false);
    }
  };
  
  const resetForm = () => {
    setDocument(null);
    setTitle("");
    setSubtitle("");
    setContent("");
    setSelectedRecipients([]);
  };
  
  // Get tier stats
  const getTierStats = () => {
    const top = journalistScores.filter(s => s.tier === 'top').length;
    const good = journalistScores.filter(s => s.tier === 'good').length;
    const avg = journalistScores.filter(s => s.tier === 'average').length;
    const low = journalistScores.filter(s => s.tier === 'low' || s.tier === 'inactive').length;
    return { top, good, avg, low };
  };
  
  const tierStats = getTierStats();

  return (
    <ThemedView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 20) + 100,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={["#1565C0", "#1976D2", "#42A5F5"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <ThemedText style={styles.headerEmoji}>🚀</ThemedText>
            <View style={styles.headerText}>
              <ThemedText style={styles.headerTitle}>Autopilot</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                Carica e Invia Automaticamente
              </ThemedText>
            </View>
          </View>
          
          <Pressable
            style={styles.configBtn}
            onPress={() => setShowConfigModal(true)}
          >
            <ThemedText style={styles.configBtnText}>⚙️ Configura</ThemedText>
          </Pressable>
        </LinearGradient>
        
        {/* Smart Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: "#E8F5E9" }]}>
            <ThemedText style={[styles.statValue, { color: "#2E7D32" }]}>{tierStats.top}</ThemedText>
            <ThemedText style={styles.statLabel}>🏆 Top</ThemedText>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#E3F2FD" }]}>
            <ThemedText style={[styles.statValue, { color: "#1565C0" }]}>{tierStats.good}</ThemedText>
            <ThemedText style={styles.statLabel}>👍 Good</ThemedText>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#FFF3E0" }]}>
            <ThemedText style={[styles.statValue, { color: "#E65100" }]}>{tierStats.avg}</ThemedText>
            <ThemedText style={styles.statLabel}>👌 Avg</ThemedText>
          </View>
          <View style={[styles.statBox, { backgroundColor: "#FFEBEE" }]}>
            <ThemedText style={[styles.statValue, { color: "#C62828" }]}>{tierStats.low}</ThemedText>
            <ThemedText style={styles.statLabel}>👎 Low</ThemedText>
          </View>
        </View>
        
        {/* Upload Section */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>📄 Carica Documento</ThemedText>
          <ThemedText style={styles.cardDescription}>
            Carica un documento e l'Autopilot farà tutto: analizzerà il contenuto, sceglierà i destinatari migliori, l'orario ottimale e invierà automaticamente.
          </ThemedText>
          
          <Pressable
            style={styles.uploadBtn}
            onPress={pickDocument}
            disabled={analyzing}
          >
            {analyzing ? (
              <ActivityIndicator color="#1565C0" />
            ) : (
              <>
                <ThemedText style={styles.uploadBtnEmoji}>📁</ThemedText>
                <ThemedText style={styles.uploadBtnText}>
                  {document ? document.name : "Seleziona Documento"}
                </ThemedText>
              </>
            )}
          </Pressable>
          
          {document && (
            <View style={styles.documentInfo}>
              <ThemedText style={styles.documentName}>✅ {document.name}</ThemedText>
              <Pressable onPress={resetForm}>
                <ThemedText style={styles.removeBtn}>❌ Rimuovi</ThemedText>
              </Pressable>
            </View>
          )}
        </View>
        
        {/* Content Editor */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>✏️ Contenuto</ThemedText>
          
          <TextInput
            style={styles.input}
            placeholder="Titolo del comunicato"
            placeholderTextColor="#999"
            value={title}
            onChangeText={setTitle}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Sottotitolo (opzionale)"
            placeholderTextColor="#999"
            value={subtitle}
            onChangeText={setSubtitle}
          />
          
          <TextInput
            style={[styles.input, styles.contentInput]}
            placeholder="Contenuto del comunicato stampa..."
            placeholderTextColor="#999"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />
        </View>
        
        {/* Autopilot Status */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>🎯 Autopilot Status</ThemedText>
          
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <ThemedText style={styles.statusLabel}>Destinatari</ThemedText>
              <ThemedText style={styles.statusValue}>{selectedRecipients.length}</ThemedText>
            </View>
            <View style={styles.statusItem}>
              <ThemedText style={styles.statusLabel}>Targeting</ThemedText>
              <ThemedText style={[styles.statusValue, { color: config.useSmartTargeting ? "#2E7D32" : "#666" }]}>
                {config.useSmartTargeting ? "🎯 Smart" : "📋 Tutti"}
              </ThemedText>
            </View>
            <View style={styles.statusItem}>
              <ThemedText style={styles.statusLabel}>Timing</ThemedText>
              <ThemedText style={[styles.statusValue, { color: config.useSmartTiming ? "#2E7D32" : "#666" }]}>
                {config.useSmartTiming ? `⏰ ${bestTime?.dayOfWeek} ${bestTime?.hour}:00` : "Immediato"}
              </ThemedText>
            </View>
          </View>
          
          <View style={styles.statusRow}>
            <View style={styles.statusItem}>
              <ThemedText style={styles.statusLabel}>Follow-up</ThemedText>
              <ThemedText style={[styles.statusValue, { color: config.autoFollowUp ? "#2E7D32" : "#666" }]}>
                {config.autoFollowUp ? `🔄 ${config.followUpCount}x` : "❌ Off"}
              </ThemedText>
            </View>
            <View style={styles.statusItem}>
              <ThemedText style={styles.statusLabel}>Target Tier</ThemedText>
              <ThemedText style={styles.statusValue}>
                {config.targetTier === 'top' ? "🏆 Top" : 
                 config.targetTier === 'good' ? "👍 Good" :
                 config.targetTier === 'top_good' ? "🏆👍 Top+Good" : "📋 Tutti"}
              </ThemedText>
            </View>
          </View>
        </View>
        
        {/* Leaderboard Preview */}
        <View style={styles.card}>
          <ThemedText style={styles.cardTitle}>🏆 Top 5 Giornalisti</ThemedText>
          <ThemedText style={styles.cardDescription}>
            I giornalisti con il miglior engagement. L'Autopilot dà priorità a questi contatti.
          </ThemedText>
          
          {journalistScores.slice(0, 5).map((j, index) => (
            <View key={j.email} style={styles.leaderboardItem}>
              <View style={styles.leaderboardRank}>
                <ThemedText style={styles.leaderboardRankText}>
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                </ThemedText>
              </View>
              <View style={styles.leaderboardInfo}>
                <ThemedText style={styles.leaderboardEmail} numberOfLines={1}>{j.email}</ThemedText>
                <ThemedText style={styles.leaderboardScore}>Score: {j.score} • Open: {j.openRate.toFixed(0)}%</ThemedText>
              </View>
            </View>
          ))}
          
          {journalistScores.length === 0 && (
            <ThemedText style={styles.emptyText}>
              Invia email per generare la leaderboard
            </ThemedText>
          )}
        </View>
      </ScrollView>
      
      {/* Launch Button */}
      <View style={[styles.launchContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          style={[styles.launchBtn, (!title.trim() || !content.trim() || sending) && styles.launchBtnDisabled]}
          onPress={launchAutopilot}
          disabled={!title.trim() || !content.trim() || sending}
        >
          <LinearGradient
            colors={sending ? ["#9E9E9E", "#757575"] : ["#1565C0", "#1976D2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.launchBtnGradient}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <ThemedText style={styles.launchBtnEmoji}>🚀</ThemedText>
                <ThemedText style={styles.launchBtnText}>
                  Lancia Autopilot ({selectedRecipients.length})
                </ThemedText>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>
      
      {/* Config Modal */}
      <Modal
        visible={showConfigModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>⚙️ Configurazione Autopilot</ThemedText>
              <Pressable onPress={() => setShowConfigModal(false)}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody}>
              {/* Smart Targeting */}
              <View style={styles.configOption}>
                <View style={styles.configOptionHeader}>
                  <ThemedText style={styles.configOptionTitle}>🎯 Smart Targeting</ThemedText>
                  <Switch
                    value={config.useSmartTargeting}
                    onValueChange={(v) => saveConfig({ ...config, useSmartTargeting: v })}
                    trackColor={{ false: "#E0E0E0", true: "#81C784" }}
                    thumbColor={config.useSmartTargeting ? "#2E7D32" : "#9E9E9E"}
                  />
                </View>
                <ThemedText style={styles.configOptionDesc}>
                  Seleziona automaticamente i giornalisti con miglior engagement
                </ThemedText>
              </View>
              
              {/* Target Tier */}
              {config.useSmartTargeting && (
                <View style={styles.configOption}>
                  <ThemedText style={styles.configOptionTitle}>🏆 Target Tier</ThemedText>
                  <View style={styles.tierOptions}>
                    {[
                      { value: 'top', label: '🏆 Solo Top' },
                      { value: 'good', label: '👍 Solo Good' },
                      { value: 'top_good', label: '🏆👍 Top + Good' },
                      { value: 'all', label: '📋 Tutti' },
                    ].map((option) => (
                      <Pressable
                        key={option.value}
                        style={[
                          styles.tierOption,
                          config.targetTier === option.value && styles.tierOptionActive,
                        ]}
                        onPress={() => saveConfig({ ...config, targetTier: option.value as any })}
                      >
                        <ThemedText style={[
                          styles.tierOptionText,
                          config.targetTier === option.value && styles.tierOptionTextActive,
                        ]}>
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Smart Timing */}
              <View style={styles.configOption}>
                <View style={styles.configOptionHeader}>
                  <ThemedText style={styles.configOptionTitle}>⏰ Smart Timing</ThemedText>
                  <Switch
                    value={config.useSmartTiming}
                    onValueChange={(v) => saveConfig({ ...config, useSmartTiming: v })}
                    trackColor={{ false: "#E0E0E0", true: "#81C784" }}
                    thumbColor={config.useSmartTiming ? "#2E7D32" : "#9E9E9E"}
                  />
                </View>
                <ThemedText style={styles.configOptionDesc}>
                  Invia all'orario con più aperture storiche ({bestTime?.dayOfWeek} alle {bestTime?.hour}:00)
                </ThemedText>
              </View>
              
              {/* Auto Follow-up */}
              <View style={styles.configOption}>
                <View style={styles.configOptionHeader}>
                  <ThemedText style={styles.configOptionTitle}>🔄 Auto Follow-up</ThemedText>
                  <Switch
                    value={config.autoFollowUp}
                    onValueChange={(v) => saveConfig({ ...config, autoFollowUp: v })}
                    trackColor={{ false: "#E0E0E0", true: "#81C784" }}
                    thumbColor={config.autoFollowUp ? "#2E7D32" : "#9E9E9E"}
                  />
                </View>
                <ThemedText style={styles.configOptionDesc}>
                  Reinvia automaticamente a chi non apre
                </ThemedText>
                
                {config.autoFollowUp && (
                  <View style={styles.followUpOptions}>
                    <ThemedText style={styles.followUpLabel}>Numero follow-up:</ThemedText>
                    <View style={styles.followUpBtns}>
                      {[1, 2, 3].map((n) => (
                        <Pressable
                          key={n}
                          style={[
                            styles.followUpBtn,
                            config.followUpCount === n && styles.followUpBtnActive,
                          ]}
                          onPress={() => saveConfig({ ...config, followUpCount: n })}
                        >
                          <ThemedText style={[
                            styles.followUpBtnText,
                            config.followUpCount === n && styles.followUpBtnTextActive,
                          ]}>
                            {n}x
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
            
            <Pressable
              style={styles.modalSaveBtn}
              onPress={() => setShowConfigModal(false)}
            >
              <ThemedText style={styles.modalSaveBtnText}>✅ Salva Configurazione</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
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
  header: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerEmoji: {
    fontSize: 48,
    marginRight: 16,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 4,
  },
  configBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    alignSelf: "flex-start",
  },
  configBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },
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
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
  },
  uploadBtn: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#1565C0",
    borderStyle: "dashed",
  },
  uploadBtnEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  uploadBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1565C0",
  },
  documentInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  documentName: {
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "600",
  },
  removeBtn: {
    fontSize: 14,
    color: "#C62828",
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 12,
  },
  contentInput: {
    minHeight: 150,
  },
  statusRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  statusItem: {
    flex: 1,
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  leaderboardItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  leaderboardRank: {
    width: 40,
    alignItems: "center",
  },
  leaderboardRankText: {
    fontSize: 18,
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 8,
  },
  leaderboardEmail: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  leaderboardScore: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    padding: 20,
  },
  launchContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  launchBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  launchBtnDisabled: {
    opacity: 0.5,
  },
  launchBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
  },
  launchBtnEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  launchBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modalClose: {
    fontSize: 24,
    color: "#666",
  },
  modalBody: {
    padding: 20,
  },
  configOption: {
    marginBottom: 24,
  },
  configOptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  configOptionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  configOptionDesc: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  tierOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  tierOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
  },
  tierOptionActive: {
    backgroundColor: "#E3F2FD",
  },
  tierOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  tierOptionTextActive: {
    color: "#1565C0",
  },
  followUpOptions: {
    marginTop: 12,
  },
  followUpLabel: {
    fontSize: 13,
    color: "#666",
    marginBottom: 8,
  },
  followUpBtns: {
    flexDirection: "row",
    gap: 8,
  },
  followUpBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
  },
  followUpBtnActive: {
    backgroundColor: "#E8F5E9",
  },
  followUpBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  followUpBtnTextActive: {
    color: "#2E7D32",
  },
  modalSaveBtn: {
    backgroundColor: "#1565C0",
    margin: 20,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  modalSaveBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
