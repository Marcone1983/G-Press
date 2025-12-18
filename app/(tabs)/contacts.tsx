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
      style={styles.journalistCard}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
          item.name,
          `📧 ${item.email}\n📰 ${item.outlet || "N/A"}\n🌍 ${COUNTRY_FLAGS[item.country || ""] || ""} ${item.country || "N/A"}\n🏷️ ${item.category}`,
          [{ text: "OK" }]
        );
      }}
    >
      <View style={styles.journalistHeader}>
        <View style={styles.journalistInfo}>
          <ThemedText style={styles.journalistName}>{item.name}</ThemedText>
          <ThemedText style={styles.journalistOutlet}>{item.outlet || "Freelance"}</ThemedText>
        </View>
        <View style={styles.badges}>
          <ThemedText style={styles.countryFlag}>
            {COUNTRY_FLAGS[item.country || ""] || "🌍"}
          </ThemedText>
          <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_COLORS[item.category] || "#607D8B" }]}>
            <ThemedText style={styles.categoryText}>
              {item.category?.slice(0, 4).toUpperCase()}
            </ThemedText>
          </View>
        </View>
      </View>
      <ThemedText style={styles.journalistEmail}>{item.email}</ThemedText>
    </Pressable>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <ThemedText style={styles.title}>Database Giornalisti</ThemedText>
        <ThemedText style={styles.subtitle}>
          {filteredJournalists.length} contatti in {groupedByCountry.length} paesi
        </ThemedText>
      </View>

      {/* Search & Filter */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { color: textColor }]}
          placeholder="🔍 Cerca per nome, testata, email..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterPicker}>
          <Picker
            selectedValue={categoryFilter}
            onValueChange={setCategoryFilter}
            style={[styles.picker, { color: textColor }]}
          >
            {CATEGORIES.map((cat) => (
              <Picker.Item key={cat.value} label={cat.label} value={cat.value} />
            ))}
          </Picker>
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {groupedByCountry.slice(0, 5).map(([country, list]) => (
          <View key={country} style={styles.statBadge}>
            <ThemedText style={styles.statFlag}>{COUNTRY_FLAGS[country] || "🌍"}</ThemedText>
            <ThemedText style={styles.statCount}>{list.length}</ThemedText>
          </View>
        ))}
        {groupedByCountry.length > 5 && (
          <View style={styles.statBadge}>
            <ThemedText style={styles.statCount}>+{groupedByCountry.length - 5}</ThemedText>
          </View>
        )}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <ThemedText style={styles.loadingText}>Caricamento contatti...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredJournalists}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderJournalist}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 60 }
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>
                Nessun giornalista trovato
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#4CAF50",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    padding: 10,
    fontSize: 15,
    backgroundColor: "#FFF",
  },
  filterPicker: {
    width: 100,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
    backgroundColor: "#FFF",
    overflow: "hidden",
  },
  picker: {
    height: 42,
  },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexWrap: "wrap",
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  statFlag: {
    fontSize: 16,
  },
  statCount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  listContent: {
    padding: 16,
  },
  journalistCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  journalistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  journalistInfo: {
    flex: 1,
  },
  journalistName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  journalistOutlet: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  journalistEmail: {
    fontSize: 13,
    color: "#4CAF50",
  },
  badges: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  countryFlag: {
    fontSize: 18,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFF",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    color: "#999",
    fontSize: 16,
  },
});
