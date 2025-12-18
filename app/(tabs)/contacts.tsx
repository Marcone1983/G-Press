import { useState, useMemo, useEffect } from "react";
import {
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  View,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

// Import static JSON data
import journalistsData from "@/assets/data/journalists.json";

const STORAGE_KEY = "gpress_custom_journalists";
const TEMPLATES_KEY = "gpress_templates";

interface Journalist {
  id: number;
  name: string;
  email: string;
  outlet: string;
  country: string;
  category: string;
  active: boolean;
  isCustom?: boolean;
}

const CATEGORIES = [
  { label: "Tutte", value: "all" },
  { label: "Tech", value: "technology" },
  { label: "Business", value: "business" },
  { label: "Finanza", value: "finance" },
  { label: "Salute", value: "health" },
  { label: "Sport", value: "sports" },
  { label: "Politica", value: "politics" },
  { label: "Generale", value: "general" },
];

const CATEGORY_OPTIONS = [
  { label: "Tecnologia", value: "technology" },
  { label: "Business", value: "business" },
  { label: "Finanza", value: "finance" },
  { label: "Salute", value: "health" },
  { label: "Sport", value: "sports" },
  { label: "Politica", value: "politics" },
  { label: "Generale", value: "general" },
];

const COUNTRY_FLAGS: Record<string, string> = {
  "Italia": "🇮🇹", "IT": "🇮🇹",
  "Stati Uniti": "🇺🇸", "US": "🇺🇸", "USA": "🇺🇸",
  "Regno Unito": "🇬🇧", "UK": "🇬🇧", "GB": "🇬🇧",
  "Francia": "🇫🇷", "FR": "🇫🇷",
  "Germania": "🇩🇪", "DE": "🇩🇪",
  "Spagna": "🇪🇸", "ES": "🇪🇸",
  "Canada": "🇨🇦", "CA": "🇨🇦",
  "Australia": "🇦🇺", "AU": "🇦🇺",
  "Giappone": "🇯🇵", "JP": "🇯🇵",
  "India": "🇮🇳", "IN": "🇮🇳",
  "Brasile": "🇧🇷", "BR": "🇧🇷",
  "Messico": "🇲🇽", "MX": "🇲🇽",
  "Argentina": "🇦🇷", "AR": "🇦🇷",
  "Cina": "🇨🇳", "CN": "🇨🇳",
  "Russia": "🇷🇺", "RU": "🇷🇺",
  "Internazionale": "🌍",
};

const CATEGORY_COLORS: Record<string, string> = {
  technology: "#2196F3",
  business: "#4CAF50",
  finance: "#FF9800",
  health: "#E91E63",
  sports: "#9C27B0",
  entertainment: "#00BCD4",
  politics: "#795548",
  lifestyle: "#FF5722",
  general: "#607D8B",
};

export default function ContactsScreen() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [customJournalists, setCustomJournalists] = useState<Journalist[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Form state for adding new journalist
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newOutlet, setNewOutlet] = useState("");
  const [newCountry, setNewCountry] = useState("");
  const [newCategory, setNewCategory] = useState("general");
  const [importing, setImporting] = useState(false);
  
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");

  // Load journalists on mount
  useEffect(() => {
    loadJournalists();
  }, []);

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

  const saveCustomJournalist = async () => {
    if (!newName.trim() || !newEmail.trim()) {
      Alert.alert("Errore", "Nome ed email sono obbligatori");
      return;
    }
    
    if (!newEmail.includes("@")) {
      Alert.alert("Errore", "Inserisci un'email valida");
      return;
    }
    
    const newJournalist: Journalist = {
      id: Date.now(),
      name: newName.trim(),
      email: newEmail.trim().toLowerCase(),
      outlet: newOutlet.trim() || "Freelance",
      country: newCountry.trim() || "Internazionale",
      category: newCategory,
      active: true,
      isCustom: true,
    };
    
    const updatedCustom = [...customJournalists, newJournalist];
    
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));
      setCustomJournalists(updatedCustom);
      
      // Reset form
      setNewName("");
      setNewEmail("");
      setNewOutlet("");
      setNewCountry("");
      setNewCategory("general");
      setShowAddModal(false);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Successo", `${newJournalist.name} aggiunto al database!`);
    } catch (error) {
      Alert.alert("Errore", "Impossibile salvare il contatto");
    }
  };

  const deleteCustomJournalist = async (id: number) => {
    Alert.alert(
      "Elimina Contatto",
      "Sei sicuro di voler eliminare questo contatto?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            const updated = customJournalists.filter(j => j.id !== id);
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
            setCustomJournalists(updated);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
        }
      ]
    );
  };

  // Import CSV function
  const importCSV = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/csv", "text/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setImporting(true);
      const file = result.assets[0];
      
      // Read file content
      const content = await FileSystem.readAsStringAsync(file.uri);
      const lines = content.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        Alert.alert("Errore", "Il file CSV deve contenere almeno un'intestazione e una riga di dati");
        setImporting(false);
        return;
      }

      // Parse header
      const header = lines[0].toLowerCase().split(/[,;\t]/).map(h => h.trim().replace(/"/g, ""));
      
      // Find column indices
      const nameIdx = header.findIndex(h => h.includes("nome") || h.includes("name"));
      const emailIdx = header.findIndex(h => h.includes("email") || h.includes("mail"));
      const outletIdx = header.findIndex(h => h.includes("testata") || h.includes("outlet") || h.includes("giornale") || h.includes("media"));
      const countryIdx = header.findIndex(h => h.includes("paese") || h.includes("country") || h.includes("nazione"));
      const categoryIdx = header.findIndex(h => h.includes("categoria") || h.includes("category") || h.includes("settore"));

      if (emailIdx === -1) {
        Alert.alert("Errore", "Il file CSV deve contenere una colonna 'email'");
        setImporting(false);
        return;
      }

      // Parse data rows
      const newContacts: Journalist[] = [];
      const existingEmails = new Set([...customJournalists, ...journalists].map(j => j.email.toLowerCase()));
      let duplicates = 0;
      let invalid = 0;

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(/[,;\t]/).map(v => v.trim().replace(/"/g, ""));
        
        const email = values[emailIdx]?.toLowerCase();
        if (!email || !email.includes("@")) {
          invalid++;
          continue;
        }

        if (existingEmails.has(email)) {
          duplicates++;
          continue;
        }

        existingEmails.add(email);
        newContacts.push({
          id: Date.now() + i,
          name: nameIdx >= 0 ? values[nameIdx] || email.split("@")[0] : email.split("@")[0],
          email: email,
          outlet: outletIdx >= 0 ? values[outletIdx] || "Importato" : "Importato",
          country: countryIdx >= 0 ? values[countryIdx] || "Internazionale" : "Internazionale",
          category: categoryIdx >= 0 ? values[categoryIdx]?.toLowerCase() || "general" : "general",
          active: true,
          isCustom: true,
        });
      }

      if (newContacts.length === 0) {
        Alert.alert(
          "Nessun contatto importato",
          `${duplicates} duplicati, ${invalid} email non valide`
        );
        setImporting(false);
        return;
      }

      // Save to AsyncStorage
      const updatedCustom = [...customJournalists, ...newContacts];
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedCustom));
      setCustomJournalists(updatedCustom);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Importazione completata!",
        `✅ ${newContacts.length} nuovi contatti importati\n⏭️ ${duplicates} duplicati saltati\n❌ ${invalid} email non valide`
      );
    } catch (error: any) {
      console.error("Import error:", error);
      Alert.alert("Errore", "Impossibile importare il file: " + (error.message || "Errore sconosciuto"));
    } finally {
      setImporting(false);
    }
  };

  // Combine static and custom journalists
  const allJournalists = useMemo(() => {
    return [...customJournalists, ...journalists];
  }, [journalists, customJournalists]);

  // Filter by category and search
  const filteredJournalists = useMemo(() => {
    let filtered = allJournalists;
    
    if (categoryFilter !== "all") {
      filtered = filtered.filter(j => j.category === categoryFilter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(j => 
        j.name?.toLowerCase().includes(query) ||
        j.outlet?.toLowerCase().includes(query) ||
        j.email?.toLowerCase().includes(query) ||
        j.country?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [allJournalists, categoryFilter, searchQuery]);

  // Group by country for stats
  const groupedByCountry = useMemo(() => {
    const groups: Record<string, typeof filteredJournalists> = {};
    filteredJournalists.forEach(j => {
      const country = j.country || "Internazionale";
      if (!groups[country]) groups[country] = [];
      groups[country].push(j);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredJournalists]);

  const renderJournalist = ({ item }: { item: Journalist }) => (
    <Pressable 
      style={({ pressed }) => [
        styles.journalistCard,
        pressed && styles.journalistCardPressed,
        item.isCustom && styles.customCard,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const actions = item.isCustom 
          ? [
              { text: "Elimina", style: "destructive" as const, onPress: () => deleteCustomJournalist(item.id) },
              { text: "OK" }
            ]
          : [{ text: "OK" }];
        
        Alert.alert(
          item.name,
          `📧 ${item.email}\n📰 ${item.outlet || "N/A"}\n🌍 ${COUNTRY_FLAGS[item.country] || "🌍"} ${item.country || "N/A"}\n🏷️ ${item.category}${item.isCustom ? "\n⭐ Aggiunto manualmente" : ""}`,
          actions
        );
      }}
    >
      <View style={styles.cardLeft}>
        <View style={[
          styles.avatar, 
          { backgroundColor: item.isCustom ? "#FF9800" : (CATEGORY_COLORS[item.category] || "#607D8B") }
        ]}>
          <ThemedText style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || "?"}
          </ThemedText>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.journalistName} numberOfLines={1}>
            {item.isCustom ? "⭐ " : ""}{item.name || item.outlet}
          </ThemedText>
          <ThemedText style={styles.countryFlag}>
            {COUNTRY_FLAGS[item.country] || "🌍"}
          </ThemedText>
        </View>
        <ThemedText style={styles.journalistOutlet} numberOfLines={1}>
          {item.outlet || "Freelance"}
        </ThemedText>
        <View style={styles.cardFooter}>
          <ThemedText style={styles.journalistEmail} numberOfLines={1}>
            {item.email}
          </ThemedText>
          <View style={[styles.categoryPill, { backgroundColor: `${CATEGORY_COLORS[item.category] || "#607D8B"}20` }]}>
            <ThemedText style={[styles.categoryPillText, { color: CATEGORY_COLORS[item.category] || "#607D8B" }]}>
              {item.category}
            </ThemedText>
          </View>
        </View>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={["#2E7D32", "#43A047"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}
      >
        <View style={styles.headerTop}>
          <View>
            <ThemedText style={styles.title}>Database Giornalisti</ThemedText>
            <ThemedText style={styles.subtitle}>
              {filteredJournalists.length.toLocaleString()} contatti • {customJournalists.length} personalizzati
            </ThemedText>
          </View>
          <View style={styles.headerButtons}>
            <Pressable
              style={[styles.addButton, importing && { opacity: 0.6 }]}
              onPress={importCSV}
              disabled={importing}
            >
              <ThemedText style={styles.addButtonText}>
                {importing ? "..." : "📂 CSV"}
              </ThemedText>
            </Pressable>
            <Pressable
              style={styles.addButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowAddModal(true);
              }}
            >
              <ThemedText style={styles.addButtonText}>+ Aggiungi</ThemedText>
            </Pressable>
          </View>
        </View>
        
        {/* Search Bar */}
        <View style={styles.searchBar}>
          <ThemedText style={styles.searchIcon}>🔍</ThemedText>
          <TextInput
            style={styles.searchInput}
            placeholder="Cerca nome, testata, email..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      {/* Filter Pills */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={CATEGORIES}
          keyExtractor={(item) => item.value}
          contentContainerStyle={styles.filterList}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterPill,
                categoryFilter === item.value && styles.filterPillActive,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setCategoryFilter(item.value);
              }}
            >
              <ThemedText
                style={[
                  styles.filterPillText,
                  categoryFilter === item.value && styles.filterPillTextActive,
                ]}
              >
                {item.label}
              </ThemedText>
            </Pressable>
          )}
        />
      </View>

      {/* Country Stats */}
      <View style={styles.statsContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={groupedByCountry.slice(0, 8)}
          keyExtractor={([country]) => country}
          contentContainerStyle={styles.statsList}
          renderItem={({ item: [country, list] }) => (
            <View style={styles.statChip}>
              <ThemedText style={styles.statFlag}>{COUNTRY_FLAGS[country] || "🌍"}</ThemedText>
              <ThemedText style={styles.statCount}>{list.length.toLocaleString()}</ThemedText>
            </View>
          )}
          ListFooterComponent={
            groupedByCountry.length > 8 ? (
              <View style={styles.statChipMore}>
                <ThemedText style={styles.statCountMore}>+{groupedByCountry.length - 8}</ThemedText>
              </View>
            ) : null
          }
        />
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#43A047" />
          <ThemedText style={styles.loadingText}>Caricamento contatti...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredJournalists}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderJournalist}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 80 }
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyIcon}>📭</ThemedText>
              <ThemedText style={styles.emptyText}>
                Nessun giornalista trovato
              </ThemedText>
              <ThemedText style={styles.emptySubtext}>
                Prova a modificare i filtri o aggiungi un nuovo contatto
              </ThemedText>
            </View>
          }
        />
      )}

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <View style={[styles.modalHeader, { paddingTop: Math.max(insets.top, 20) }]}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <ThemedText style={styles.modalCancel}>Annulla</ThemedText>
            </Pressable>
            <ThemedText style={styles.modalTitle}>Nuovo Contatto</ThemedText>
            <Pressable onPress={saveCustomJournalist}>
              <ThemedText style={styles.modalSave}>Salva</ThemedText>
            </Pressable>
          </View>
          
          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Nome *</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="Es: Mario Rossi"
                placeholderTextColor="#999"
                value={newName}
                onChangeText={setNewName}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Email *</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="Es: mario.rossi@giornale.it"
                placeholderTextColor="#999"
                value={newEmail}
                onChangeText={setNewEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Testata</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="Es: Il Sole 24 Ore"
                placeholderTextColor="#999"
                value={newOutlet}
                onChangeText={setNewOutlet}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Paese</ThemedText>
              <TextInput
                style={styles.formInput}
                placeholder="Es: Italia"
                placeholderTextColor="#999"
                value={newCountry}
                onChangeText={setNewCountry}
              />
            </View>
            
            <View style={styles.formGroup}>
              <ThemedText style={styles.formLabel}>Categoria</ThemedText>
              <View style={styles.categoryGrid}>
                {CATEGORY_OPTIONS.map(cat => (
                  <Pressable
                    key={cat.value}
                    style={[
                      styles.categoryOption,
                      newCategory === cat.value && styles.categoryOptionActive,
                    ]}
                    onPress={() => setNewCategory(cat.value)}
                  >
                    <ThemedText style={[
                      styles.categoryOptionText,
                      newCategory === cat.value && styles.categoryOptionTextActive,
                    ]}>
                      {cat.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
            
            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  addButton: {
    backgroundColor: "rgba(255,255,255,0.25)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 12,
    marginTop: 16,
    paddingHorizontal: 14,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#FFFFFF",
  },
  
  // Filters
  filterContainer: {
    marginTop: 16,
  },
  filterList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: "#2E7D32",
    borderColor: "#2E7D32",
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  
  // Stats
  statsContainer: {
    marginTop: 12,
    marginBottom: 8,
  },
  statsList: {
    paddingHorizontal: 16,
    gap: 8,
  },
  statChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statChipMore: {
    backgroundColor: "#E8E8E8",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statFlag: {
    fontSize: 16,
    marginRight: 6,
  },
  statCount: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
  },
  statCountMore: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  
  // List
  listContent: {
    padding: 16,
  },
  journalistCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  journalistCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  customCard: {
    borderWidth: 2,
    borderColor: "#FF9800",
  },
  cardLeft: {
    marginRight: 14,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  journalistName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
    marginRight: 8,
  },
  countryFlag: {
    fontSize: 18,
  },
  journalistOutlet: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
  },
  journalistEmail: {
    fontSize: 12,
    color: "#43A047",
    flex: 1,
    marginRight: 8,
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  
  // Loading & Empty
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
    fontSize: 15,
  },
  emptyContainer: {
    padding: 60,
    alignItems: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    color: "#333",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    color: "#999",
    fontSize: 14,
    marginTop: 4,
    textAlign: "center",
  },
  
  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  modalCancel: {
    color: "#666",
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  modalSave: {
    color: "#43A047",
    fontSize: 16,
    fontWeight: "700",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  formInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1A1A1A",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  categoryOptionActive: {
    backgroundColor: "#43A047",
    borderColor: "#43A047",
  },
  categoryOptionText: {
    fontSize: 14,
    color: "#666",
  },
  categoryOptionTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
