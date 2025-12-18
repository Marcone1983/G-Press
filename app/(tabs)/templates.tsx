import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

interface EmailTemplate {
  id: string;
  name: string;
  category: 'lancio' | 'evento' | 'partnership' | 'aggiornamento' | 'custom';
  subject: string;
  content: string;
  isBuiltIn: boolean;
}

const TEMPLATES_KEY = "gpress_custom_templates";

// Template professionali pre-costruiti
const BUILT_IN_TEMPLATES: EmailTemplate[] = [
  {
    id: "launch_product",
    name: "Lancio Prodotto",
    category: "lancio",
    subject: "[COMUNICATO STAMPA] {AZIENDA} lancia {PRODOTTO}",
    content: `{CITTÀ}, {DATA} - {AZIENDA}, leader nel settore {SETTORE}, annuncia oggi il lancio di {PRODOTTO}, una soluzione innovativa che {BENEFICIO_PRINCIPALE}.

{DESCRIZIONE_PRODOTTO}

"{CITAZIONE_CEO}", ha dichiarato {NOME_CEO}, CEO di {AZIENDA}.

Caratteristiche principali:
• {FEATURE_1}
• {FEATURE_2}
• {FEATURE_3}

{PRODOTTO} sarà disponibile a partire da {DATA_DISPONIBILITÀ} al prezzo di {PREZZO}.

Per ulteriori informazioni: {SITO_WEB}

---
Contatto stampa:
{NOME_CONTATTO}
{EMAIL_CONTATTO}
{TELEFONO_CONTATTO}`,
    isBuiltIn: true,
  },
  {
    id: "event_announcement",
    name: "Annuncio Evento",
    category: "evento",
    subject: "[SAVE THE DATE] {NOME_EVENTO} - {DATA}",
    content: `{CITTÀ}, {DATA} - {AZIENDA} è lieta di invitarvi a {NOME_EVENTO}, che si terrà il {DATA_EVENTO} presso {LOCATION}.

L'evento rappresenta un'occasione unica per {OBIETTIVO_EVENTO}.

Programma:
{ORA_1} - {ATTIVITÀ_1}
{ORA_2} - {ATTIVITÀ_2}
{ORA_3} - {ATTIVITÀ_3}

Tra gli speaker:
• {SPEAKER_1} - {RUOLO_1}
• {SPEAKER_2} - {RUOLO_2}

La partecipazione è gratuita previa registrazione su {LINK_REGISTRAZIONE}.

Per accredito stampa contattare: {EMAIL_STAMPA}

---
Contatto stampa:
{NOME_CONTATTO}
{EMAIL_CONTATTO}`,
    isBuiltIn: true,
  },
  {
    id: "partnership",
    name: "Annuncio Partnership",
    category: "partnership",
    subject: "[COMUNICATO] {AZIENDA_1} e {AZIENDA_2} annunciano partnership strategica",
    content: `{CITTÀ}, {DATA} - {AZIENDA_1} e {AZIENDA_2} annunciano oggi una partnership strategica volta a {OBIETTIVO_PARTNERSHIP}.

Questa collaborazione permetterà di {BENEFICIO_1} e {BENEFICIO_2}, offrendo ai clienti {VALORE_AGGIUNTO}.

"{CITAZIONE_CEO_1}", ha commentato {NOME_CEO_1}, CEO di {AZIENDA_1}.

"{CITAZIONE_CEO_2}", ha aggiunto {NOME_CEO_2}, CEO di {AZIENDA_2}.

I primi risultati della partnership saranno visibili a partire da {TIMELINE}.

Per maggiori informazioni:
{AZIENDA_1}: {SITO_1}
{AZIENDA_2}: {SITO_2}

---
Contatti stampa:
{AZIENDA_1}: {EMAIL_1}
{AZIENDA_2}: {EMAIL_2}`,
    isBuiltIn: true,
  },
  {
    id: "company_update",
    name: "Aggiornamento Aziendale",
    category: "aggiornamento",
    subject: "[NEWS] {AZIENDA}: {TITOLO_AGGIORNAMENTO}",
    content: `{CITTÀ}, {DATA} - {AZIENDA} comunica {TITOLO_AGGIORNAMENTO}.

{DETTAGLIO_AGGIORNAMENTO}

Questo traguardo rappresenta {SIGNIFICATO} per l'azienda e conferma {POSIZIONAMENTO}.

"{CITAZIONE}", ha dichiarato {NOME_PORTAVOCE}, {RUOLO_PORTAVOCE} di {AZIENDA}.

Prossimi passi:
{PROSSIMI_PASSI}

---
Contatto stampa:
{NOME_CONTATTO}
{EMAIL_CONTATTO}
{TELEFONO_CONTATTO}`,
    isBuiltIn: true,
  },
  {
    id: "funding_announcement",
    name: "Annuncio Finanziamento",
    category: "lancio",
    subject: "[BREAKING] {AZIENDA} chiude round da {IMPORTO}",
    content: `{CITTÀ}, {DATA} - {AZIENDA}, startup innovativa nel settore {SETTORE}, annuncia la chiusura di un round di finanziamento {TIPO_ROUND} da {IMPORTO}, guidato da {LEAD_INVESTOR}.

I fondi saranno utilizzati per:
• {USO_FONDI_1}
• {USO_FONDI_2}
• {USO_FONDI_3}

"{CITAZIONE_CEO}", ha dichiarato {NOME_CEO}, fondatore e CEO di {AZIENDA}.

"{CITAZIONE_INVESTOR}", ha commentato {NOME_INVESTOR}, Partner di {LEAD_INVESTOR}.

{AZIENDA} ha raggiunto {METRICHE_CHIAVE} e prevede di {OBIETTIVI_FUTURI}.

---
Contatto stampa:
{NOME_CONTATTO}
{EMAIL_CONTATTO}`,
    isBuiltIn: true,
  },
];

const CATEGORY_LABELS: Record<string, { label: string; emoji: string; color: string }> = {
  lancio: { label: "Lancio", emoji: "🚀", color: "#1565C0" },
  evento: { label: "Evento", emoji: "📅", color: "#7B1FA2" },
  partnership: { label: "Partnership", emoji: "🤝", color: "#2E7D32" },
  aggiornamento: { label: "Aggiornamento", emoji: "📢", color: "#E65100" },
  custom: { label: "Personalizzato", emoji: "✏️", color: "#455A64" },
};

export default function TemplatesScreen() {
  const insets = useSafeAreaInsets();
  const [templates, setTemplates] = useState<EmailTemplate[]>(BUILT_IN_TEMPLATES);
  const [customTemplates, setCustomTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  
  // New template form
  const [newName, setNewName] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newContent, setNewContent] = useState("");
  
  useEffect(() => {
    loadCustomTemplates();
  }, []);
  
  const loadCustomTemplates = async () => {
    try {
      const saved = await AsyncStorage.getItem(TEMPLATES_KEY);
      if (saved) {
        const custom = JSON.parse(saved);
        setCustomTemplates(custom);
        setTemplates([...BUILT_IN_TEMPLATES, ...custom]);
      }
    } catch (error) {
      console.error("Error loading custom templates:", error);
    }
  };
  
  const saveCustomTemplate = async () => {
    if (!newName.trim() || !newSubject.trim() || !newContent.trim()) {
      Alert.alert("Errore", "Compila tutti i campi");
      return;
    }
    
    const newTemplate: EmailTemplate = {
      id: `custom_${Date.now()}`,
      name: newName.trim(),
      category: "custom",
      subject: newSubject.trim(),
      content: newContent.trim(),
      isBuiltIn: false,
    };
    
    const updated = [...customTemplates, newTemplate];
    setCustomTemplates(updated);
    setTemplates([...BUILT_IN_TEMPLATES, ...updated]);
    
    try {
      await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCreateModal(false);
      setNewName("");
      setNewSubject("");
      setNewContent("");
      Alert.alert("Successo", "Template salvato!");
    } catch (error) {
      Alert.alert("Errore", "Impossibile salvare il template");
    }
  };
  
  const deleteTemplate = async (template: EmailTemplate) => {
    if (template.isBuiltIn) {
      Alert.alert("Errore", "Non puoi eliminare i template predefiniti");
      return;
    }
    
    Alert.alert(
      "Elimina Template",
      `Vuoi eliminare "${template.name}"?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            const updated = customTemplates.filter(t => t.id !== template.id);
            setCustomTemplates(updated);
            setTemplates([...BUILT_IN_TEMPLATES, ...updated]);
            await AsyncStorage.setItem(TEMPLATES_KEY, JSON.stringify(updated));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  };
  
  const copyToClipboard = async (text: string) => {
    // In a real app, use Clipboard API
    Alert.alert("Copiato!", "Il template è stato copiato. Vai su Home per incollarlo.");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };
  
  const filteredTemplates = filterCategory
    ? templates.filter(t => t.category === filterCategory)
    : templates;

  return (
    <ThemedView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 20) + 80,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={["#7B1FA2", "#9C27B0", "#BA68C8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <ThemedText style={styles.headerEmoji}>📝</ThemedText>
            <View style={styles.headerText}>
              <ThemedText style={styles.headerTitle}>Templates</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                {templates.length} template disponibili
              </ThemedText>
            </View>
          </View>
        </LinearGradient>
        
        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterContent}
        >
          <Pressable
            style={[styles.filterChip, !filterCategory && styles.filterChipActive]}
            onPress={() => setFilterCategory(null)}
          >
            <ThemedText style={[styles.filterChipText, !filterCategory && styles.filterChipTextActive]}>
              📋 Tutti
            </ThemedText>
          </Pressable>
          {Object.entries(CATEGORY_LABELS).map(([key, { label, emoji }]) => (
            <Pressable
              key={key}
              style={[styles.filterChip, filterCategory === key && styles.filterChipActive]}
              onPress={() => setFilterCategory(key)}
            >
              <ThemedText style={[styles.filterChipText, filterCategory === key && styles.filterChipTextActive]}>
                {emoji} {label}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
        
        {/* Templates List */}
        <View style={styles.templatesList}>
          {filteredTemplates.map((template) => {
            const cat = CATEGORY_LABELS[template.category];
            return (
              <Pressable
                key={template.id}
                style={styles.templateCard}
                onPress={() => {
                  setSelectedTemplate(template);
                  setShowPreview(true);
                }}
              >
                <View style={styles.templateHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: cat.color + "20" }]}>
                    <ThemedText style={[styles.categoryBadgeText, { color: cat.color }]}>
                      {cat.emoji} {cat.label}
                    </ThemedText>
                  </View>
                  {!template.isBuiltIn && (
                    <Pressable onPress={() => deleteTemplate(template)}>
                      <ThemedText style={styles.deleteBtn}>🗑️</ThemedText>
                    </Pressable>
                  )}
                </View>
                <ThemedText style={styles.templateName}>{template.name}</ThemedText>
                <ThemedText style={styles.templateSubject} numberOfLines={1}>
                  {template.subject}
                </ThemedText>
                <ThemedText style={styles.templatePreview} numberOfLines={2}>
                  {template.content.substring(0, 100)}...
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      
      {/* Create Button */}
      <View style={[styles.createContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable
          style={styles.createBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <LinearGradient
            colors={["#7B1FA2", "#9C27B0"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.createBtnGradient}
          >
            <ThemedText style={styles.createBtnText}>➕ Crea Template</ThemedText>
          </LinearGradient>
        </Pressable>
      </View>
      
      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        animationType="slide"
        transparent
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                {selectedTemplate?.name}
              </ThemedText>
              <Pressable onPress={() => setShowPreview(false)}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <ThemedText style={styles.previewLabel}>Oggetto:</ThemedText>
              <ThemedText style={styles.previewSubject}>
                {selectedTemplate?.subject}
              </ThemedText>
              
              <ThemedText style={styles.previewLabel}>Contenuto:</ThemedText>
              <ThemedText style={styles.previewContent}>
                {selectedTemplate?.content}
              </ThemedText>
              
              <ThemedText style={styles.helpText}>
                💡 Sostituisci i campi tra {"{PARENTESI}"} con i tuoi dati
              </ThemedText>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <Pressable
                style={styles.copyBtn}
                onPress={() => {
                  if (selectedTemplate) {
                    copyToClipboard(selectedTemplate.content);
                    setShowPreview(false);
                  }
                }}
              >
                <ThemedText style={styles.copyBtnText}>📋 Usa Template</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Create Modal */}
      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Nuovo Template</ThemedText>
              <Pressable onPress={() => setShowCreateModal(false)}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </Pressable>
            </View>
            
            <ScrollView style={styles.modalBody}>
              <ThemedText style={styles.inputLabel}>Nome Template</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Es. Lancio Nuovo Prodotto"
                placeholderTextColor="#999"
                value={newName}
                onChangeText={setNewName}
              />
              
              <ThemedText style={styles.inputLabel}>Oggetto Email</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Es. [COMUNICATO] {AZIENDA} lancia..."
                placeholderTextColor="#999"
                value={newSubject}
                onChangeText={setNewSubject}
              />
              
              <ThemedText style={styles.inputLabel}>Contenuto</ThemedText>
              <TextInput
                style={[styles.input, styles.contentInput]}
                placeholder="Scrivi il contenuto del template..."
                placeholderTextColor="#999"
                value={newContent}
                onChangeText={setNewContent}
                multiline
                textAlignVertical="top"
              />
              
              <ThemedText style={styles.helpText}>
                💡 Usa {"{CAMPI}"} per i dati variabili
              </ThemedText>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <Pressable style={styles.saveBtn} onPress={saveCustomTemplate}>
                <ThemedText style={styles.saveBtnText}>💾 Salva Template</ThemedText>
              </Pressable>
            </View>
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
  filterScroll: {
    marginBottom: 16,
  },
  filterContent: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipActive: {
    backgroundColor: "#7B1FA2",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  templatesList: {
    gap: 12,
  },
  templateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  deleteBtn: {
    fontSize: 18,
  },
  templateName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  templateSubject: {
    fontSize: 13,
    color: "#7B1FA2",
    fontWeight: "600",
    marginBottom: 8,
  },
  templatePreview: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  createContainer: {
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
  createBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  createBtnGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  createBtnText: {
    fontSize: 16,
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
    maxHeight: "85%",
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
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  previewSubject: {
    fontSize: 16,
    fontWeight: "600",
    color: "#7B1FA2",
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  previewContent: {
    fontSize: 14,
    color: "#1A1A1A",
    lineHeight: 22,
    padding: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  helpText: {
    fontSize: 13,
    color: "#666",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FFF8E1",
    borderRadius: 8,
  },
  modalActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  copyBtn: {
    backgroundColor: "#7B1FA2",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  copyBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    fontSize: 15,
    color: "#1A1A1A",
    marginBottom: 16,
  },
  contentInput: {
    minHeight: 200,
  },
  saveBtn: {
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
