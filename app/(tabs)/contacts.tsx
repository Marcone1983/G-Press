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
import { useSafeAreaInsets, SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";

// Import static JSON data
import journalistsData from "@/assets/data/journalists.json";

const STORAGE_KEY = "gpress_custom_journalists";
const TEMPLATES_KEY = "gpress_templates";
const NOTES_KEY = "gpress_journalist_notes";
const BLACKLIST_KEY = "gpress_blacklist";
const VIP_KEY = "gpress_vip_list";

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

interface JournalistNote {
  email: string;
  note: string;
  tags: string[];
  lastContact: string;
  updatedAt: string;
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
  "Metaverso": "🥽",
};

const COUNTRY_OPTIONS = [
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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedJournalist, setSelectedJournalist] = useState<Journalist | null>(null);
  
  // Notes, Blacklist, VIP
  const [notes, setNotes] = useState<Record<string, JournalistNote>>({});
  const [blacklist, setBlacklist] = useState<string[]>([]);
  const [vipList, setVipList] = useState<string[]>([]);
  const [currentNote, setCurrentNote] = useState("");
  const [currentTags, setCurrentTags] = useState("");
  
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
      
      // Load notes, blacklist, VIP
      const notesData = await AsyncStorage.getItem(NOTES_KEY);
      const blacklistData = await AsyncStorage.getItem(BLACKLIST_KEY);
      const vipData = await AsyncStorage.getItem(VIP_KEY);
      
      setJournalists(staticData);
      setCustomJournalists(custom);
      setNotes(notesData ? JSON.parse(notesData) : {});
      setBlacklist(blacklistData ? JSON.parse(blacklistData) : []);
      setVipList(vipData ? JSON.parse(vipData) : []);
    } catch (error) {
      console.error("Error loading journalists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Save note for journalist
  const saveNote = async (email: string, note: string, tags: string) => {
    const updatedNotes = {
      ...notes,
      [email]: {
        email,
        note,
        tags: tags.split(",").map(t => t.trim()).filter(t => t),
        lastContact: notes[email]?.lastContact || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
    setNotes(updatedNotes);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  // Toggle blacklist
  const toggleBlacklist = async (email: string) => {
    const updated = blacklist.includes(email)
      ? blacklist.filter(e => e !== email)
      : [...blacklist, email];
    await AsyncStorage.setItem(BLACKLIST_KEY, JSON.stringify(updated));
    setBlacklist(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Toggle VIP
  const toggleVIP = async (email: string) => {
    const updated = vipList.includes(email)
      ? vipList.filter(e => e !== email)
      : [...vipList, email];
    await AsyncStorage.setItem(VIP_KEY, JSON.stringify(updated));
    setVipList(updated);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Open journalist detail
  const openJournalistDetail = (journalist: Journalist) => {
    setSelectedJournalist(journalist);
    const existingNote = notes[journalist.email];
    setCurrentNote(existingNote?.note || "");
    setCurrentTags(existingNote?.tags?.join(", ") || "");
    setShowDetailModal(true);
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

  const renderJournalist = ({ item }: { item: Journalist }) => {
    const isVIP = vipList.includes(item.email);
    const isBlacklisted = blacklist.includes(item.email);
    const hasNote = notes[item.email]?.note;
    
    return (
      <Pressable 
        style={({ pressed }) => [
          styles.journalistCard,
          pressed && styles.journalistCardPressed,
          item.isCustom && styles.customCard,
          isBlacklisted && styles.blacklistedCard,
          isVIP && styles.vipCard,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          openJournalistDetail(item);
        }}
        onLongPress={() => {
          if (item.isCustom) {
            Alert.alert(
              "Elimina contatto",
              `Vuoi eliminare ${item.name}?`,
              [
                { text: "Annulla", style: "cancel" },
                { text: "Elimina", style: "destructive", onPress: () => deleteCustomJournalist(item.id) },
              ]
            );
          }
        }}
      >
        <View style={styles.cardLeft}>
          <View style={[
            styles.avatar, 
            { backgroundColor: isVIP ? "#FFD700" : isBlacklisted ? "#9E9E9E" : item.isCustom ? "#FF9800" : (CATEGORY_COLORS[item.category] || "#607D8B") }
          ]}>
            <ThemedText style={styles.avatarText}>
              {isVIP ? "🌟" : item.name?.charAt(0)?.toUpperCase() || "?"}
            </ThemedText>
          </View>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <ThemedText style={[styles.journalistName, isBlacklisted && styles.blacklistedText]} numberOfLines={1}>
              {isVIP ? "🌟 " : ""}{item.isCustom ? "⭐ " : ""}{item.name || item.outlet}
            </ThemedText>
            <View style={styles.badgeRow}>
              {hasNote && <ThemedText style={styles.noteBadge}>📝</ThemedText>}
              {isBlacklisted && <ThemedText style={styles.blacklistBadge}>🚫</ThemedText>}
              <ThemedText style={styles.countryFlag}>
                {COUNTRY_FLAGS[item.country] || "🌍"}
              </ThemedText>
            </View>
          </View>
          <ThemedText style={[styles.journalistOutlet, isBlacklisted && styles.blacklistedText]} numberOfLines={1}>
            {item.outlet || "Freelance"}
          </ThemedText>
          <View style={styles.cardFooter}>
            <ThemedText style={[styles.journalistEmail, isBlacklisted && styles.blacklistedText]} numberOfLines={1}>
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
  };

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
              <View style={styles.pickerWrapper}>
                <Picker
                  selectedValue={newCountry}
                  onValueChange={setNewCountry}
                  style={styles.picker}
                  dropdownIconColor="#666"
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <Picker.Item key={c.value} label={c.label} value={c.value} />
                  ))}
                </Picker>
              </View>
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

      {/* Journalist Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowDetailModal(false)}
      >
        <SafeAreaView style={styles.detailModalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setShowDetailModal(false)}>
              <ThemedText style={styles.modalCancel}>Chiudi</ThemedText>
            </Pressable>
            <ThemedText style={styles.modalTitle}>Dettaglio Giornalista</ThemedText>
            <View style={{ width: 60 }} />
          </View>
          
          {selectedJournalist && (
            <ScrollView>
              <View style={styles.detailHeader}>
                <View style={[
                  styles.detailAvatar,
                  { backgroundColor: vipList.includes(selectedJournalist.email) ? "#FFD700" : CATEGORY_COLORS[selectedJournalist.category] || "#607D8B" }
                ]}>
                  <ThemedText style={styles.detailAvatarText}>
                    {vipList.includes(selectedJournalist.email) ? "🌟" : selectedJournalist.name?.charAt(0)?.toUpperCase() || "?"}
                  </ThemedText>
                </View>
                <ThemedText style={styles.detailName}>{selectedJournalist.name}</ThemedText>
                <ThemedText style={styles.detailOutlet}>{selectedJournalist.outlet || "Freelance"}</ThemedText>
                <ThemedText style={styles.detailEmail}>{selectedJournalist.email}</ThemedText>
                <ThemedText style={[styles.categoryPill, { backgroundColor: `${CATEGORY_COLORS[selectedJournalist.category] || "#607D8B"}20`, marginTop: 8, paddingHorizontal: 12, paddingVertical: 6 }]}>
                  <ThemedText style={[styles.categoryPillText, { color: CATEGORY_COLORS[selectedJournalist.category] || "#607D8B" }]}>
                    {COUNTRY_FLAGS[selectedJournalist.country] || "🌍"} {selectedJournalist.country} • {selectedJournalist.category}
                  </ThemedText>
                </ThemedText>
                
                {/* VIP and Blacklist buttons */}
                <View style={styles.detailActions}>
                  <Pressable
                    style={[
                      styles.actionButton,
                      vipList.includes(selectedJournalist.email) ? styles.vipButtonActive : styles.vipButton,
                    ]}
                    onPress={() => toggleVIP(selectedJournalist.email)}
                  >
                    <ThemedText style={{ fontSize: 16 }}>🌟</ThemedText>
                    <ThemedText style={[styles.actionButtonText, { color: vipList.includes(selectedJournalist.email) ? "#000" : "#FF8F00" }]}>
                      {vipList.includes(selectedJournalist.email) ? "VIP" : "Aggiungi VIP"}
                    </ThemedText>
                  </Pressable>
                  
                  <Pressable
                    style={[
                      styles.actionButton,
                      blacklist.includes(selectedJournalist.email) ? styles.blacklistButtonActive : styles.blacklistButton,
                    ]}
                    onPress={() => toggleBlacklist(selectedJournalist.email)}
                  >
                    <ThemedText style={{ fontSize: 16 }}>🚫</ThemedText>
                    <ThemedText style={[styles.actionButtonText, { color: blacklist.includes(selectedJournalist.email) ? "#FFF" : "#F44336" }]}>
                      {blacklist.includes(selectedJournalist.email) ? "Blacklist" : "Blocca"}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
              
              {/* Notes Section */}
              <View style={styles.detailSection}>
                <ThemedText style={styles.sectionTitle}>📝 Note e Relazione</ThemedText>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Aggiungi note su questo giornalista...\nEs: Preferisce essere contattato via email, interessato a tech e startup"
                  placeholderTextColor="#999"
                  value={currentNote}
                  onChangeText={setCurrentNote}
                  multiline
                  numberOfLines={4}
                />
                <TextInput
                  style={styles.tagsInput}
                  placeholder="Tag (separati da virgola): tech, startup, finanza"
                  placeholderTextColor="#999"
                  value={currentTags}
                  onChangeText={setCurrentTags}
                />
                <Pressable
                  style={styles.saveNoteButton}
                  onPress={() => {
                    saveNote(selectedJournalist.email, currentNote, currentTags);
                    Alert.alert("Salvato!", "Note e tag aggiornati");
                  }}
                >
                  <ThemedText style={styles.saveNoteButtonText}>💾 Salva Note</ThemedText>
                </Pressable>
                {notes[selectedJournalist.email]?.updatedAt && (
                  <ThemedText style={styles.lastContactText}>
                    Ultimo aggiornamento: {new Date(notes[selectedJournalist.email].updatedAt).toLocaleDateString("it-IT")}
                  </ThemedText>
                )}
              </View>
              
              {/* Stats Section if available */}
              {notes[selectedJournalist.email]?.tags?.length > 0 && (
                <View style={styles.detailSection}>
                  <ThemedText style={styles.sectionTitle}>🏷️ Tag</ThemedText>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {notes[selectedJournalist.email].tags.map((tag, i) => (
                      <View key={i} style={[styles.categoryPill, { backgroundColor: "#E8F5E9" }]}>
                        <ThemedText style={[styles.categoryPillText, { color: "#2E7D32" }]}>
                          {tag}
                        </ThemedText>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </SafeAreaView>
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
  pickerWrapper: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    overflow: "hidden",
  },
  picker: {
    height: 50,
    color: "#1A1A1A",
  },
  
  // VIP and Blacklist styles
  blacklistedCard: {
    opacity: 0.6,
    backgroundColor: "#F5F5F5",
  },
  vipCard: {
    borderWidth: 2,
    borderColor: "#FFD700",
  },
  blacklistedText: {
    textDecorationLine: "line-through",
    color: "#9E9E9E",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  noteBadge: {
    fontSize: 12,
  },
  blacklistBadge: {
    fontSize: 12,
  },
  
  // Detail Modal
  detailModalContainer: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  detailHeader: {
    alignItems: "center",
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  detailAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  detailAvatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  detailOutlet: {
    fontSize: 16,
    color: "#666",
    marginTop: 4,
  },
  detailEmail: {
    fontSize: 14,
    color: "#43A047",
    marginTop: 8,
  },
  detailActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 16,
    marginTop: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
  },
  vipButton: {
    backgroundColor: "#FFF8E1",
  },
  vipButtonActive: {
    backgroundColor: "#FFD700",
  },
  blacklistButton: {
    backgroundColor: "#FFEBEE",
  },
  blacklistButtonActive: {
    backgroundColor: "#F44336",
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  detailSection: {
    backgroundColor: "#FFFFFF",
    marginTop: 16,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 12,
  },
  noteInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1A1A1A",
    minHeight: 100,
    textAlignVertical: "top",
  },
  tagsInput: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#1A1A1A",
    marginTop: 12,
  },
  saveNoteButton: {
    backgroundColor: "#43A047",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 16,
  },
  saveNoteButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  lastContactText: {
    fontSize: 13,
    color: "#999",
    marginTop: 8,
    textAlign: "center",
  },
});
