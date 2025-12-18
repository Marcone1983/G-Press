import { useState, useMemo } from "react";
import {
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  View,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { trpc } from "@/lib/trpc";
import { useThemeColor } from "@/hooks/use-theme-color";

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

const COUNTRY_FLAGS: Record<string, string> = {
  IT: "🇮🇹", US: "🇺🇸", GB: "🇬🇧", FR: "🇫🇷", DE: "🇩🇪", ES: "🇪🇸",
  CA: "🇨🇦", AU: "🇦🇺", JP: "🇯🇵", IN: "🇮🇳", BR: "🇧🇷", MX: "🇲🇽",
  AR: "🇦🇷", CN: "🇨🇳", RU: "🇷🇺", HK: "🇭🇰", SG: "🇸🇬", KR: "🇰🇷",
  IL: "🇮🇱", ZA: "🇿🇦", NZ: "🇳🇿", QA: "🇶🇦", SA: "🇸🇦", AE: "🇦🇪",
  CL: "🇨🇱", PE: "🇵🇪", BE: "🇧🇪",
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
  
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  
  // Fetch journalists
  const { data: journalists, isLoading } = trpc.journalists.list.useQuery({
    category: categoryFilter !== "all" ? categoryFilter : undefined,
    isActive: true,
  });

  // Filter by search
  const filteredJournalists = useMemo(() => {
    if (!journalists) return [];
    if (!searchQuery.trim()) return journalists;
    
    const query = searchQuery.toLowerCase();
    return journalists.filter(j => 
      j.name.toLowerCase().includes(query) ||
      j.outlet?.toLowerCase().includes(query) ||
      j.email.toLowerCase().includes(query) ||
      j.country?.toLowerCase().includes(query)
    );
  }, [journalists, searchQuery]);

  // Group by country
  const groupedByCountry = useMemo(() => {
    const groups: Record<string, typeof filteredJournalists> = {};
    filteredJournalists.forEach(j => {
      const country = j.country || "XX";
      if (!groups[country]) groups[country] = [];
      groups[country].push(j);
    });
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filteredJournalists]);

  const renderJournalist = ({ item }: { item: any }) => (
    <Pressable 
      style={({ pressed }) => [
        styles.journalistCard,
        pressed && styles.journalistCardPressed,
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
          item.name,
          `📧 ${item.email}\n📰 ${item.outlet || "N/A"}\n🌍 ${COUNTRY_FLAGS[item.country || ""] || ""} ${item.country || "N/A"}\n🏷️ ${item.category}`,
          [{ text: "OK" }]
        );
      }}
    >
      <View style={styles.cardLeft}>
        <View style={[styles.avatar, { backgroundColor: CATEGORY_COLORS[item.category] || "#607D8B" }]}>
          <ThemedText style={styles.avatarText}>
            {item.name?.charAt(0)?.toUpperCase() || "?"}
          </ThemedText>
        </View>
      </View>
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <ThemedText style={styles.journalistName} numberOfLines={1}>
            {item.name || item.outlet}
          </ThemedText>
          <ThemedText style={styles.countryFlag}>
            {COUNTRY_FLAGS[item.country || ""] || "🌍"}
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
        <ThemedText style={styles.title}>Database Giornalisti</ThemedText>
        <ThemedText style={styles.subtitle}>
          {filteredJournalists.length.toLocaleString()} contatti • {groupedByCountry.length} paesi
        </ThemedText>
        
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
                Prova a modificare i filtri di ricerca
              </ThemedText>
            </View>
          }
        />
      )}
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
  },
});
