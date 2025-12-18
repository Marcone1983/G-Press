import { useState } from "react";
import {
  StyleSheet,
  FlatList,
  Pressable,
  View,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { trpc } from "@/lib/trpc";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/hooks/use-auth";

const STATUS_COLORS: Record<string, string> = {
  draft: "#9E9E9E",
  scheduled: "#FF9800",
  sending: "#2196F3",
  sent: "#4CAF50",
  failed: "#F44336",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Bozza",
  scheduled: "Programmato",
  sending: "In invio...",
  sent: "Inviato",
  failed: "Fallito",
};

export default function HistoryScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, "background");
  
  const { isAuthenticated } = useAuth();
  
  // Fetch press releases
  const { data: pressReleases, isLoading, refetch } = trpc.pressReleases.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "N/A";
    const d = new Date(date);
    return d.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderPressRelease = ({ item }: { item: any }) => (
    <Pressable
      style={styles.card}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
          item.title,
          `${item.subtitle ? item.subtitle + "\n\n" : ""}${item.content.slice(0, 300)}${item.content.length > 300 ? "..." : ""}\n\n📧 Destinatari: ${item.recipientCount || 0}\n📅 Inviato: ${formatDate(item.sentAt)}`,
          [{ text: "Chiudi" }]
        );
      }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleContainer}>
          <ThemedText style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </ThemedText>
          {item.subtitle && (
            <ThemedText style={styles.cardSubtitle} numberOfLines={1}>
              {item.subtitle}
            </ThemedText>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] || "#9E9E9E" }]}>
          <ThemedText style={styles.statusText}>
            {STATUS_LABELS[item.status] || item.status}
          </ThemedText>
        </View>
      </View>
      
      <ThemedText style={styles.cardContent} numberOfLines={2}>
        {item.content}
      </ThemedText>
      
      <View style={styles.cardFooter}>
        <View style={styles.footerItem}>
          <ThemedText style={styles.footerLabel}>Destinatari</ThemedText>
          <ThemedText style={styles.footerValue}>{item.recipientCount || 0}</ThemedText>
        </View>
        <View style={styles.footerItem}>
          <ThemedText style={styles.footerLabel}>Data</ThemedText>
          <ThemedText style={styles.footerValue}>
            {formatDate(item.sentAt || item.createdAt)}
          </ThemedText>
        </View>
        {item.category && (
          <View style={styles.footerItem}>
            <ThemedText style={styles.footerLabel}>Categoria</ThemedText>
            <ThemedText style={styles.footerValue}>{item.category}</ThemedText>
          </View>
        )}
      </View>
    </Pressable>
  );

  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
          <ThemedText style={styles.title}>Storico Invii</ThemedText>
        </View>
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyTitle}>Accesso richiesto</ThemedText>
          <ThemedText style={styles.emptyText}>
            Effettua il login per visualizzare lo storico dei tuoi comunicati stampa.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
        <ThemedText style={styles.title}>Storico Invii</ThemedText>
        <ThemedText style={styles.subtitle}>
          {pressReleases?.length || 0} comunicati
        </ThemedText>
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <ThemedText style={styles.loadingText}>Caricamento storico...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={pressReleases}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPressRelease}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 60 }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyTitle}>Nessun comunicato</ThemedText>
              <ThemedText style={styles.emptyText}>
                I comunicati stampa inviati appariranno qui.
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
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E8E8E8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#333",
    lineHeight: 22,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  cardContent: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
    gap: 16,
  },
  footerItem: {
    flex: 1,
  },
  footerLabel: {
    fontSize: 11,
    color: "#999",
    marginBottom: 2,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
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
    flex: 1,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});
