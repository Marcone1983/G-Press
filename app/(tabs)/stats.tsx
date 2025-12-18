import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  getAggregateStats,
  getEmailsList,
  isEmailConfigured,
  EmailStats,
  EmailDetail,
} from "@/lib/email-service";

export default function StatsScreen() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [emails, setEmails] = useState<EmailDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const loadStats = useCallback(async () => {
    try {
      const [statsData, emailsData] = await Promise.all([
        getAggregateStats(),
        getEmailsList(50),
      ]);
      setStats(statsData);
      setEmails(emailsData);
    } catch (error) {
      console.error("Error loading stats:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadStats();
  }, [loadStats]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered":
        return "#4CAF50";
      case "opened":
        return "#2196F3";
      case "clicked":
        return "#9C27B0";
      case "bounced":
        return "#F44336";
      case "complained":
        return "#FF9800";
      default:
        return "#9E9E9E";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "delivered":
        return "Consegnata";
      case "opened":
        return "Aperta";
      case "clicked":
        return "Cliccata";
      case "bounced":
        return "Respinta";
      case "complained":
        return "Spam";
      case "sent":
        return "Inviata";
      default:
        return status;
    }
  };

  if (!isEmailConfigured()) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.errorContainer}>
          <ThemedText style={styles.errorIcon}>⚠️</ThemedText>
          <ThemedText style={styles.errorTitle}>API Non Configurata</ThemedText>
          <ThemedText style={styles.errorText}>
            Configura la chiave API Resend per visualizzare le statistiche delle email inviate.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2E7D32" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={["#2E7D32", "#43A047", "#66BB6A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <View style={styles.headerText}>
              <ThemedText style={styles.headerTitle}>Statistiche</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                Monitoraggio Email Resend
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <ThemedText style={styles.loadingText}>Caricamento statistiche...</ThemedText>
          </View>
        ) : (
          <>
            {/* Stats Cards */}
            <View style={styles.statsGrid}>
              <View style={[styles.statCard, { backgroundColor: "#E3F2FD" }]}>
                <ThemedText style={styles.statNumber}>{stats?.total || 0}</ThemedText>
                <ThemedText style={styles.statLabel}>📧 Totali</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#E8F5E9" }]}>
                <ThemedText style={[styles.statNumber, { color: "#4CAF50" }]}>
                  {stats?.delivered || 0}
                </ThemedText>
                <ThemedText style={styles.statLabel}>✅ Consegnate</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#E3F2FD" }]}>
                <ThemedText style={[styles.statNumber, { color: "#2196F3" }]}>
                  {stats?.opened || 0}
                </ThemedText>
                <ThemedText style={styles.statLabel}>👁️ Aperte</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#F3E5F5" }]}>
                <ThemedText style={[styles.statNumber, { color: "#9C27B0" }]}>
                  {stats?.clicked || 0}
                </ThemedText>
                <ThemedText style={styles.statLabel}>🖱️ Cliccate</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#FFEBEE" }]}>
                <ThemedText style={[styles.statNumber, { color: "#F44336" }]}>
                  {stats?.bounced || 0}
                </ThemedText>
                <ThemedText style={styles.statLabel}>❌ Respinte</ThemedText>
              </View>
              <View style={[styles.statCard, { backgroundColor: "#FFF3E0" }]}>
                <ThemedText style={[styles.statNumber, { color: "#FF9800" }]}>
                  {stats?.complained || 0}
                </ThemedText>
                <ThemedText style={styles.statLabel}>🚫 Spam</ThemedText>
              </View>
            </View>

            {/* Percentages */}
            {stats && stats.total > 0 && (
              <View style={styles.card}>
                <ThemedText style={styles.cardTitle}>📊 Tassi di Performance</ThemedText>
                <View style={styles.percentageRow}>
                  <View style={styles.percentageItem}>
                    <ThemedText style={styles.percentageValue}>
                      {((stats.delivered / stats.total) * 100).toFixed(1)}%
                    </ThemedText>
                    <ThemedText style={styles.percentageLabel}>Delivery Rate</ThemedText>
                  </View>
                  <View style={styles.percentageItem}>
                    <ThemedText style={[styles.percentageValue, { color: "#2196F3" }]}>
                      {stats.delivered > 0
                        ? ((stats.opened / stats.delivered) * 100).toFixed(1)
                        : "0"}%
                    </ThemedText>
                    <ThemedText style={styles.percentageLabel}>Open Rate</ThemedText>
                  </View>
                  <View style={styles.percentageItem}>
                    <ThemedText style={[styles.percentageValue, { color: "#9C27B0" }]}>
                      {stats.opened > 0
                        ? ((stats.clicked / stats.opened) * 100).toFixed(1)
                        : "0"}%
                    </ThemedText>
                    <ThemedText style={styles.percentageLabel}>Click Rate</ThemedText>
                  </View>
                </View>
              </View>
            )}

            {/* Recent Emails */}
            <View style={styles.card}>
              <ThemedText style={styles.cardTitle}>📬 Email Recenti</ThemedText>
              {emails.length === 0 ? (
                <ThemedText style={styles.emptyText}>Nessuna email inviata</ThemedText>
              ) : (
                emails.slice(0, 20).map((email, index) => (
                  <View key={email.id || index} style={styles.emailItem}>
                    <View style={styles.emailHeader}>
                      <ThemedText style={styles.emailSubject} numberOfLines={1}>
                        {email.subject || "Senza oggetto"}
                      </ThemedText>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: getStatusColor(email.last_event) },
                        ]}
                      >
                        <ThemedText style={styles.statusText}>
                          {getStatusLabel(email.last_event)}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.emailMeta}>
                      <ThemedText style={styles.emailTo}>
                        A: {email.to?.length || 0} destinatari
                      </ThemedText>
                      <ThemedText style={styles.emailDate}>
                        {formatDate(email.created_at)}
                      </ThemedText>
                    </View>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  headerText: {
    marginLeft: 16,
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: "#666",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: "31%",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    textAlign: "center",
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
    marginBottom: 16,
  },
  percentageRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  percentageItem: {
    alignItems: "center",
  },
  percentageValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#4CAF50",
  },
  percentageLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  emailItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  emailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  emailSubject: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  emailMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  emailTo: {
    fontSize: 13,
    color: "#666",
  },
  emailDate: {
    fontSize: 13,
    color: "#999",
  },
  emptyText: {
    textAlign: "center",
    color: "#999",
    padding: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
});
