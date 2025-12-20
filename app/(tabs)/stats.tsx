import { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { trpc } from "@/lib/trpc";
import {
  getAggregateStats,
  getEmailsList,
  EmailStats,
  EmailDetail,
} from "@/lib/email-service";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DAY_NAMES = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

export default function StatsScreen() {
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [emails, setEmails] = useState<EmailDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bestTimes, setBestTimes] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [showRanking, setShowRanking] = useState(false);
  const insets = useSafeAreaInsets();
  
  // Journalist ranking query
  const rankingQuery = trpc.ranking.getAll.useQuery(undefined, {
    enabled: false,
    retry: false,
  });

  // tRPC queries for database stats
  const statsQuery = trpc.stats.overview.useQuery(undefined, {
    enabled: false,
    retry: false,
  });
  const bestTimesQuery = trpc.stats.bestSendTimes.useQuery(undefined, {
    enabled: false,
    retry: false,
  });
  const hourlyQuery = trpc.stats.opensByHour.useQuery(undefined, {
    enabled: false,
    retry: false,
  });
  const dailyQuery = trpc.stats.opensByDay.useQuery(undefined, {
    enabled: false,
    retry: false,
  });

  const loadStats = useCallback(async () => {
    try {
      // Try to get stats from database first
      const [dbStats, dbBestTimes, dbHourly, dbDaily] = await Promise.all([
        statsQuery.refetch().catch(() => null),
        bestTimesQuery.refetch().catch(() => null),
        hourlyQuery.refetch().catch(() => null),
        dailyQuery.refetch().catch(() => null),
      ]);

      if (dbStats?.data) {
        setStats({
          total: dbStats.data.total,
          delivered: dbStats.data.delivered,
          opened: dbStats.data.opened,
          clicked: dbStats.data.clicked,
          bounced: dbStats.data.bounced,
          complained: 0,
        });
      } else {
        // Fallback to Resend API
        const [statsData, emailsData] = await Promise.all([
          getAggregateStats(),
          getEmailsList(50),
        ]);
        setStats(statsData);
        setEmails(emailsData);
      }

      if (dbBestTimes?.data) {
        setBestTimes(dbBestTimes.data);
      }
      if (dbHourly?.data) {
        setHourlyData(dbHourly.data);
      }
      if (dbDaily?.data) {
        setDailyData(dbDaily.data);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
      // Fallback to Resend API
      const [statsData, emailsData] = await Promise.all([
        getAggregateStats(),
        getEmailsList(50),
      ]);
      setStats(statsData);
      setEmails(emailsData);
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

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  const formatDayTime = (dayOfWeek: number, hourOfDay: number) => {
    return `${DAY_NAMES[dayOfWeek]} ${formatHour(hourOfDay)}`;
  };

  // Calculate max value for chart scaling
  const maxHourlyOpens = Math.max(...hourlyData.map((d) => d.opens), 1);
  const maxDailyOpens = Math.max(...dailyData.map((d) => d.opens), 1);

  // API is always configured via backend - no need to check

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
                Analytics Email in Tempo Reale
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
                <ThemedText style={styles.statLabel}>📧 Inviate</ThemedText>
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

            {/* Best Send Times */}
            {bestTimes.length > 0 && (
              <View style={styles.card}>
                <ThemedText style={styles.cardTitle}>⏰ Orari Migliori per Inviare</ThemedText>
                <ThemedText style={styles.cardSubtitle}>
                  Basato sui tuoi dati di apertura
                </ThemedText>
                {bestTimes.slice(0, 5).map((time, index) => (
                  <View key={index} style={styles.bestTimeRow}>
                    <View style={styles.bestTimeRank}>
                      <ThemedText style={styles.bestTimeRankText}>#{index + 1}</ThemedText>
                    </View>
                    <ThemedText style={styles.bestTimeText}>
                      {formatDayTime(time.dayOfWeek, time.hourOfDay)}
                    </ThemedText>
                    <View style={styles.bestTimeRate}>
                      <ThemedText style={styles.bestTimeRateText}>
                        {time.openRate.toFixed(1)}% aperture
                      </ThemedText>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Hourly Chart */}
            {hourlyData.length > 0 && (
              <View style={styles.card}>
                <ThemedText style={styles.cardTitle}>📈 Aperture per Ora</ThemedText>
                <View style={styles.chartContainer}>
                  <View style={styles.barChart}>
                    {hourlyData.map((data, index) => (
                      <View key={index} style={styles.barContainer}>
                        <View
                          style={[
                            styles.bar,
                            {
                              height: `${(data.opens / maxHourlyOpens) * 100}%`,
                              backgroundColor: data.opens > 0 ? "#2E7D32" : "#E0E0E0",
                            },
                          ]}
                        />
                        {index % 4 === 0 && (
                          <ThemedText style={styles.barLabel}>{data.hour}</ThemedText>
                        )}
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )}

            {/* Daily Chart */}
            {dailyData.length > 0 && (
              <View style={styles.card}>
                <ThemedText style={styles.cardTitle}>📅 Aperture per Giorno</ThemedText>
                <View style={styles.dayChartContainer}>
                  {dailyData.map((data, index) => (
                    <View key={index} style={styles.dayBarContainer}>
                      <View
                        style={[
                          styles.dayBar,
                          {
                            height: `${(data.opens / maxDailyOpens) * 100}%`,
                            backgroundColor: data.opens > 0 ? "#2196F3" : "#E0E0E0",
                          },
                        ]}
                      />
                      <ThemedText style={styles.dayLabel}>{data.day}</ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Journalist Ranking */}
            <Pressable 
              style={styles.card}
              onPress={() => {
                setShowRanking(!showRanking);
                if (!showRanking) rankingQuery.refetch();
              }}
            >
              <View style={styles.cardTitleRow}>
                <ThemedText style={styles.cardTitle}>🏆 Ranking Giornalisti</ThemedText>
                <ThemedText style={styles.expandIcon}>{showRanking ? "▲" : "▼"}</ThemedText>
              </View>
              <ThemedText style={styles.cardSubtitle}>
                Classifica basata su aperture e click
              </ThemedText>
              
              {showRanking && (
                <View style={styles.rankingList}>
                  {rankingQuery.isLoading ? (
                    <ActivityIndicator size="small" color="#2E7D32" />
                  ) : rankingQuery.data && rankingQuery.data.length > 0 ? (
                    rankingQuery.data.slice(0, 20).map((journalist: any, index: number) => (
                      <View key={journalist.id} style={styles.rankingItem}>
                        <View style={[
                          styles.rankBadge,
                          journalist.tier === "A" && styles.tierA,
                          journalist.tier === "B" && styles.tierB,
                          journalist.tier === "C" && styles.tierC,
                        ]}>
                          <ThemedText style={styles.rankBadgeText}>#{index + 1}</ThemedText>
                        </View>
                        <View style={styles.rankingInfo}>
                          <ThemedText style={styles.rankingName} numberOfLines={1}>
                            {journalist.name || journalist.email}
                          </ThemedText>
                          <ThemedText style={styles.rankingEmail} numberOfLines={1}>
                            {journalist.email}
                          </ThemedText>
                        </View>
                        <View style={styles.rankingStats}>
                          <ThemedText style={styles.rankingScore}>
                            {journalist.score.toFixed(1)}
                          </ThemedText>
                          <ThemedText style={styles.rankingRate}>
                            {journalist.openRate.toFixed(0)}% open
                          </ThemedText>
                        </View>
                        <View style={[
                          styles.tierBadge,
                          journalist.tier === "A" && styles.tierBadgeA,
                          journalist.tier === "B" && styles.tierBadgeB,
                          journalist.tier === "C" && styles.tierBadgeC,
                        ]}>
                          <ThemedText style={styles.tierBadgeText}>{journalist.tier}</ThemedText>
                        </View>
                      </View>
                    ))
                  ) : (
                    <ThemedText style={styles.emptyText}>
                      Il ranking verrà calcolato dopo l'invio delle prime email
                    </ThemedText>
                  )}
                </View>
              )}
            </Pressable>

            {/* Recent Emails */}
            <View style={styles.card}>
              <ThemedText style={styles.cardTitle}>📬 Email Recenti</ThemedText>
              {emails.length === 0 ? (
                <ThemedText style={styles.emptyText}>
                  Le statistiche dettagliate appariranno dopo l'invio delle prime email
                </ThemedText>
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
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginTop: 2,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: "#666",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "800",
    color: "#333",
  },
  statLabel: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
    marginBottom: 12,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
    marginTop: -8,
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
  bestTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  bestTimeRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  bestTimeRankText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2E7D32",
  },
  bestTimeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  bestTimeRate: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestTimeRateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1976D2",
  },
  chartContainer: {
    height: 120,
    marginTop: 8,
  },
  barChart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    gap: 2,
  },
  barContainer: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },
  bar: {
    width: "80%",
    borderRadius: 2,
    minHeight: 2,
  },
  barLabel: {
    fontSize: 9,
    color: "#999",
    marginTop: 4,
  },
  dayChartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 120,
    gap: 8,
    marginTop: 8,
  },
  dayBarContainer: {
    flex: 1,
    alignItems: "center",
    height: 100,
    justifyContent: "flex-end",
  },
  dayBar: {
    width: "70%",
    borderRadius: 4,
    minHeight: 4,
  },
  dayLabel: {
    fontSize: 11,
    color: "#666",
    marginTop: 6,
    fontWeight: "500",
  },
  emailItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  emailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  emailSubject: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#fff",
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
    fontSize: 14,
    color: "#999",
    textAlign: "center",
    paddingVertical: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
  },
  
  // Ranking styles
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  expandIcon: {
    fontSize: 14,
    color: "#666",
  },
  rankingList: {
    marginTop: 16,
  },
  rankingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  rankBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E0E0E0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rankBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#666",
  },
  tierA: {
    backgroundColor: "#FFD700",
  },
  tierB: {
    backgroundColor: "#C0C0C0",
  },
  tierC: {
    backgroundColor: "#CD7F32",
  },
  rankingInfo: {
    flex: 1,
    marginRight: 12,
  },
  rankingName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  rankingEmail: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  rankingStats: {
    alignItems: "flex-end",
    marginRight: 12,
  },
  rankingScore: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2E7D32",
  },
  rankingRate: {
    fontSize: 11,
    color: "#666",
  },
  tierBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E0E0E0",
  },
  tierBadgeA: {
    backgroundColor: "#4CAF50",
  },
  tierBadgeB: {
    backgroundColor: "#2196F3",
  },
  tierBadgeC: {
    backgroundColor: "#FF9800",
  },
  tierBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
