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
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { trpc } from "@/lib/trpc";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/hooks/use-auth";

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string }> = {
  draft: { color: "#757575", bg: "#F5F5F5", icon: "📝" },
  scheduled: { color: "#F57C00", bg: "#FFF3E0", icon: "⏰" },
  sending: { color: "#1976D2", bg: "#E3F2FD", icon: "📤" },
  sent: { color: "#388E3C", bg: "#E8F5E9", icon: "✅" },
  failed: { color: "#D32F2F", bg: "#FFEBEE", icon: "❌" },
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

  const getRelativeTime = (date: Date | string | null) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Oggi";
    if (days === 1) return "Ieri";
    if (days < 7) return `${days} giorni fa`;
    if (days < 30) return `${Math.floor(days / 7)} sett. fa`;
    return `${Math.floor(days / 30)} mesi fa`;
  };

  const renderPressRelease = ({ item }: { item: any }) => {
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.draft;
    
    return (
      <Pressable
        style={({ pressed }) => [
          styles.card,
          pressed && styles.cardPressed,
        ]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          Alert.alert(
            item.title,
            `${item.subtitle ? item.subtitle + "\n\n" : ""}${item.content.slice(0, 300)}${item.content.length > 300 ? "..." : ""}\n\n📧 Destinatari: ${item.recipientCount || 0}\n📅 Inviato: ${formatDate(item.sentAt)}`,
            [{ text: "Chiudi" }]
          );
        }}
      >
        {/* Status indicator bar */}
        <View style={[styles.statusBar, { backgroundColor: statusConfig.color }]} />
        
        <View style={styles.cardBody}>
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
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <ThemedText style={styles.statusIcon}>{statusConfig.icon}</ThemedText>
              <ThemedText style={[styles.statusText, { color: statusConfig.color }]}>
                {STATUS_LABELS[item.status] || item.status}
              </ThemedText>
            </View>
          </View>
          
          <ThemedText style={styles.cardContent} numberOfLines={2}>
            {item.content}
          </ThemedText>
          
          <View style={styles.cardFooter}>
            <View style={styles.footerStat}>
              <ThemedText style={styles.footerIcon}>📧</ThemedText>
              <ThemedText style={styles.footerValue}>{item.recipientCount || 0}</ThemedText>
              <ThemedText style={styles.footerLabel}>destinatari</ThemedText>
            </View>
            <View style={styles.footerDivider} />
            <View style={styles.footerStat}>
              <ThemedText style={styles.footerIcon}>📅</ThemedText>
              <ThemedText style={styles.footerValue}>
                {getRelativeTime(item.sentAt || item.createdAt)}
              </ThemedText>
            </View>
            {item.category && (
              <>
                <View style={styles.footerDivider} />
                <View style={styles.categoryTag}>
                  <ThemedText style={styles.categoryText}>{item.category}</ThemedText>
                </View>
              </>
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  if (!isAuthenticated) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
        <LinearGradient
          colors={["#2E7D32", "#43A047"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}
        >
          <ThemedText style={styles.title}>Storico Invii</ThemedText>
        </LinearGradient>
        <View style={styles.loginPrompt}>
          <View style={styles.loginIcon}>
            <ThemedText style={styles.loginIconText}>🔐</ThemedText>
          </View>
          <ThemedText style={styles.loginTitle}>Accesso richiesto</ThemedText>
          <ThemedText style={styles.loginText}>
            Effettua il login per visualizzare lo storico dei tuoi comunicati stampa.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Calculate stats
  const totalSent = pressReleases?.filter(p => p.status === "sent").length || 0;
  const totalRecipients = pressReleases?.reduce((acc, p) => acc + (p.recipientCount || 0), 0) || 0;

  return (
    <ThemedView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={["#2E7D32", "#43A047"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}
      >
        <ThemedText style={styles.title}>Storico Invii</ThemedText>
        <ThemedText style={styles.subtitle}>
          {pressReleases?.length || 0} comunicati totali
        </ThemedText>
        
        {/* Quick Stats */}
        <View style={styles.quickStats}>
          <View style={styles.quickStatItem}>
            <ThemedText style={styles.quickStatValue}>{totalSent}</ThemedText>
            <ThemedText style={styles.quickStatLabel}>Inviati</ThemedText>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatItem}>
            <ThemedText style={styles.quickStatValue}>{totalRecipients.toLocaleString()}</ThemedText>
            <ThemedText style={styles.quickStatLabel}>Email totali</ThemedText>
          </View>
        </View>
      </LinearGradient>

      {/* List */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#43A047" />
          <ThemedText style={styles.loadingText}>Caricamento storico...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={pressReleases}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderPressRelease}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 80 }
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              tintColor="#43A047"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <ThemedText style={styles.emptyIcon}>📭</ThemedText>
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
  quickStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  quickStatItem: {
    flex: 1,
    alignItems: "center",
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginHorizontal: 16,
  },
  quickStatValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  quickStatLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 4,
  },
  
  // List
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
    flexDirection: "row",
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  statusBar: {
    width: 4,
  },
  cardBody: {
    flex: 1,
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  cardTitleContainer: {
    flex: 1,
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    lineHeight: 22,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  cardContent: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
  },
  footerStat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  footerIcon: {
    fontSize: 14,
  },
  footerValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  footerLabel: {
    fontSize: 12,
    color: "#999",
  },
  footerDivider: {
    width: 1,
    height: 16,
    backgroundColor: "#E0E0E0",
    marginHorizontal: 12,
  },
  categoryTag: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
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
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  
  // Login Prompt
  loginPrompt: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loginIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  loginIconText: {
    fontSize: 36,
  },
  loginTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  loginText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});
