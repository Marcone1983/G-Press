import { useState, useEffect } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  Modal,
  Alert,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";

interface ScheduledPost {
  id: string;
  title: string;
  description: string;
  scheduledDate: string;
  category: string;
  status: "draft" | "scheduled" | "sent";
  recipients?: number;
  createdAt: string;
}

const CALENDAR_KEY = "g-press-calendar";

const CATEGORIES = [
  { id: "product", label: "🚀 Lancio Prodotto", color: "#2196F3" },
  { id: "event", label: "📅 Evento", color: "#9C27B0" },
  { id: "partnership", label: "🤝 Partnership", color: "#4CAF50" },
  { id: "funding", label: "💰 Funding", color: "#FF9800" },
  { id: "milestone", label: "🏆 Milestone", color: "#F44336" },
  { id: "other", label: "📝 Altro", color: "#607D8B" },
];

export default function CalendarScreen() {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  
  // Form state
  const [newPost, setNewPost] = useState({
    title: "",
    description: "",
    scheduledDate: new Date(),
    category: "product",
  });

  useEffect(() => {
    loadPosts();
  }, []);

  const loadPosts = async () => {
    try {
      const saved = await AsyncStorage.getItem(CALENDAR_KEY);
      if (saved) {
        setPosts(JSON.parse(saved));
      }
    } catch (error) {
      console.error("Errore caricamento calendario:", error);
    }
  };

  const savePosts = async (newPosts: ScheduledPost[]) => {
    try {
      await AsyncStorage.setItem(CALENDAR_KEY, JSON.stringify(newPosts));
      setPosts(newPosts);
    } catch (error) {
      console.error("Errore salvataggio calendario:", error);
    }
  };

  const addPost = () => {
    if (!newPost.title.trim()) {
      Alert.alert("Errore", "Inserisci un titolo per il comunicato");
      return;
    }

    const post: ScheduledPost = {
      id: Date.now().toString(),
      title: newPost.title,
      description: newPost.description,
      scheduledDate: newPost.scheduledDate.toISOString(),
      category: newPost.category,
      status: "scheduled",
      createdAt: new Date().toISOString(),
    };

    savePosts([...posts, post]);
    setShowAddModal(false);
    setNewPost({
      title: "",
      description: "",
      scheduledDate: new Date(),
      category: "product",
    });
    Alert.alert("✅ Aggiunto", "Comunicato aggiunto al calendario!");
  };

  const deletePost = (id: string) => {
    Alert.alert(
      "Elimina",
      "Vuoi eliminare questo comunicato dal calendario?",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: () => savePosts(posts.filter((p) => p.id !== id)),
        },
      ]
    );
  };

  const markAsSent = (id: string) => {
    savePosts(
      posts.map((p) => (p.id === id ? { ...p, status: "sent" as const } : p))
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty slots for days before first day of month
    for (let i = 0; i < (firstDay.getDay() || 7) - 1; i++) {
      days.push(null);
    }

    // Add all days of month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const getPostsForDate = (date: Date) => {
    return posts.filter((p) => {
      const postDate = new Date(p.scheduledDate);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("it-IT", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const days = getDaysInMonth(selectedMonth);
  const monthName = selectedMonth.toLocaleDateString("it-IT", {
    month: "long",
    year: "numeric",
  });

  // Stats
  const scheduledCount = posts.filter((p) => p.status === "scheduled").length;
  const sentCount = posts.filter((p) => p.status === "sent").length;
  const thisMonthPosts = posts.filter((p) => {
    const d = new Date(p.scheduledDate);
    return (
      d.getMonth() === selectedMonth.getMonth() &&
      d.getFullYear() === selectedMonth.getFullYear()
    );
  });

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 20) + 80,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2E7D32"
          />
        }
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
            <Image
              source={require("@/assets/images/icon.png")}
              style={styles.logo}
              contentFit="contain"
            />
            <View style={styles.headerText}>
              <ThemedText style={styles.headerTitle}>
                Calendario Editoriale
              </ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                Pianifica i tuoi comunicati stampa
              </ThemedText>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{scheduledCount}</ThemedText>
              <ThemedText style={styles.statLabel}>Programmati</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{sentCount}</ThemedText>
              <ThemedText style={styles.statLabel}>Inviati</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {thisMonthPosts.length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Questo mese</ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* View Mode Toggle */}
        <View style={styles.viewToggle}>
          <Pressable
            style={[
              styles.toggleBtn,
              viewMode === "calendar" && styles.toggleBtnActive,
            ]}
            onPress={() => setViewMode("calendar")}
          >
            <ThemedText
              style={[
                styles.toggleText,
                viewMode === "calendar" && styles.toggleTextActive,
              ]}
            >
              📅 Calendario
            </ThemedText>
          </Pressable>
          <Pressable
            style={[
              styles.toggleBtn,
              viewMode === "list" && styles.toggleBtnActive,
            ]}
            onPress={() => setViewMode("list")}
          >
            <ThemedText
              style={[
                styles.toggleText,
                viewMode === "list" && styles.toggleTextActive,
              ]}
            >
              📋 Lista
            </ThemedText>
          </Pressable>
        </View>

        {viewMode === "calendar" ? (
          <>
            {/* Month Navigation */}
            <View style={styles.monthNav}>
              <Pressable
                style={styles.navBtn}
                onPress={() =>
                  setSelectedMonth(
                    new Date(
                      selectedMonth.getFullYear(),
                      selectedMonth.getMonth() - 1
                    )
                  )
                }
              >
                <ThemedText style={styles.navBtnText}>◀</ThemedText>
              </Pressable>
              <ThemedText style={styles.monthTitle}>{monthName}</ThemedText>
              <Pressable
                style={styles.navBtn}
                onPress={() =>
                  setSelectedMonth(
                    new Date(
                      selectedMonth.getFullYear(),
                      selectedMonth.getMonth() + 1
                    )
                  )
                }
              >
                <ThemedText style={styles.navBtnText}>▶</ThemedText>
              </Pressable>
            </View>

            {/* Calendar Grid */}
            <View style={styles.calendarCard}>
              {/* Weekday Headers */}
              <View style={styles.weekdayRow}>
                {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
                  <View key={day} style={styles.weekdayCell}>
                    <ThemedText style={styles.weekdayText}>{day}</ThemedText>
                  </View>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {days.map((day, index) => {
                  const dayPosts = day ? getPostsForDate(day) : [];
                  const isToday =
                    day &&
                    day.toDateString() === new Date().toDateString();

                  return (
                    <View
                      key={index}
                      style={[
                        styles.dayCell,
                        isToday && styles.todayCell,
                        dayPosts.length > 0 && styles.hasPostsCell,
                      ]}
                    >
                      {day && (
                        <>
                          <ThemedText
                            style={[
                              styles.dayNumber,
                              isToday && styles.todayNumber,
                            ]}
                          >
                            {day.getDate()}
                          </ThemedText>
                          {dayPosts.length > 0 && (
                            <View style={styles.postDots}>
                              {dayPosts.slice(0, 3).map((p, i) => {
                                const cat = CATEGORIES.find(
                                  (c) => c.id === p.category
                                );
                                return (
                                  <View
                                    key={i}
                                    style={[
                                      styles.postDot,
                                      { backgroundColor: cat?.color || "#666" },
                                    ]}
                                  />
                                );
                              })}
                            </View>
                          )}
                        </>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {CATEGORIES.map((cat) => (
                <View key={cat.id} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, { backgroundColor: cat.color }]}
                  />
                  <ThemedText style={styles.legendText}>{cat.label}</ThemedText>
                </View>
              ))}
            </View>
          </>
        ) : (
          /* List View */
          <View style={styles.listContainer}>
            {posts.length === 0 ? (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyEmoji}>📅</ThemedText>
                <ThemedText style={styles.emptyTitle}>
                  Nessun comunicato pianificato
                </ThemedText>
                <ThemedText style={styles.emptyText}>
                  Aggiungi il tuo primo comunicato al calendario editoriale
                </ThemedText>
              </View>
            ) : (
              posts
                .sort(
                  (a, b) =>
                    new Date(a.scheduledDate).getTime() -
                    new Date(b.scheduledDate).getTime()
                )
                .map((post) => {
                  const cat = CATEGORIES.find((c) => c.id === post.category);
                  const isPast =
                    new Date(post.scheduledDate) < new Date() &&
                    post.status !== "sent";

                  return (
                    <View key={post.id} style={styles.postCard}>
                      <View style={styles.postHeader}>
                        <View
                          style={[
                            styles.categoryBadge,
                            { backgroundColor: cat?.color || "#666" },
                          ]}
                        >
                          <ThemedText style={styles.categoryText}>
                            {cat?.label.split(" ")[0]}
                          </ThemedText>
                        </View>
                        <ThemedText
                          style={[
                            styles.postDate,
                            isPast && styles.pastDate,
                          ]}
                        >
                          {formatDate(post.scheduledDate)}
                        </ThemedText>
                      </View>

                      <ThemedText style={styles.postTitle}>
                        {post.title}
                      </ThemedText>
                      {post.description && (
                        <ThemedText
                          style={styles.postDescription}
                          numberOfLines={2}
                        >
                          {post.description}
                        </ThemedText>
                      )}

                      <View style={styles.postActions}>
                        <View
                          style={[
                            styles.statusBadge,
                            post.status === "sent"
                              ? styles.sentBadge
                              : post.status === "scheduled"
                              ? styles.scheduledBadge
                              : styles.draftBadge,
                          ]}
                        >
                          <ThemedText style={styles.statusText}>
                            {post.status === "sent"
                              ? "✅ Inviato"
                              : post.status === "scheduled"
                              ? "📅 Programmato"
                              : "📝 Bozza"}
                          </ThemedText>
                        </View>

                        <View style={styles.actionBtns}>
                          {post.status !== "sent" && (
                            <Pressable
                              style={styles.actionBtn}
                              onPress={() => markAsSent(post.id)}
                            >
                              <ThemedText style={styles.actionBtnText}>
                                ✓
                              </ThemedText>
                            </Pressable>
                          )}
                          <Pressable
                            style={[styles.actionBtn, styles.deleteBtn]}
                            onPress={() => deletePost(post.id)}
                          >
                            <ThemedText style={styles.deleteBtnText}>
                              🗑
                            </ThemedText>
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Button */}
      <Pressable
        style={styles.addButton}
        onPress={() => setShowAddModal(true)}
      >
        <LinearGradient
          colors={["#1565C0", "#1976D2"]}
          style={styles.addButtonGradient}
        >
          <ThemedText style={styles.addButtonText}>+ Nuovo</ThemedText>
        </LinearGradient>
      </Pressable>

      {/* Add Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>
                📅 Nuovo Comunicato
              </ThemedText>
              <Pressable onPress={() => setShowAddModal(false)}>
                <ThemedText style={styles.closeBtn}>✕</ThemedText>
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <ThemedText style={styles.inputLabel}>Titolo *</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Es: Lancio nuovo prodotto XYZ"
                value={newPost.title}
                onChangeText={(text) =>
                  setNewPost({ ...newPost, title: text })
                }
                placeholderTextColor="#999"
              />

              <ThemedText style={styles.inputLabel}>Descrizione</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Breve descrizione del comunicato..."
                value={newPost.description}
                onChangeText={(text) =>
                  setNewPost({ ...newPost, description: text })
                }
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />

              <ThemedText style={styles.inputLabel}>Data Prevista</ThemedText>
              <Pressable
                style={styles.dateBtn}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText style={styles.dateBtnText}>
                  📅 {newPost.scheduledDate.toLocaleDateString("it-IT", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </ThemedText>
              </Pressable>

              {showDatePicker && (
                <DateTimePicker
                  value={newPost.scheduledDate}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowDatePicker(false);
                    if (date) {
                      setNewPost({ ...newPost, scheduledDate: date });
                    }
                  }}
                />
              )}

              <ThemedText style={styles.inputLabel}>Categoria</ThemedText>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.id}
                    style={[
                      styles.categoryOption,
                      newPost.category === cat.id && {
                        backgroundColor: cat.color,
                        borderColor: cat.color,
                      },
                    ]}
                    onPress={() =>
                      setNewPost({ ...newPost, category: cat.id })
                    }
                  >
                    <ThemedText
                      style={[
                        styles.categoryOptionText,
                        newPost.category === cat.id && { color: "#fff" },
                      ]}
                    >
                      {cat.label}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Pressable style={styles.saveBtn} onPress={addPost}>
              <LinearGradient
                colors={["#1565C0", "#1976D2"]}
                style={styles.saveBtnGradient}
              >
                <ThemedText style={styles.saveBtnText}>
                  ✅ Aggiungi al Calendario
                </ThemedText>
              </LinearGradient>
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
    marginBottom: 20,
  },
  logo: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  headerText: {
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  statDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#F0F0F0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 10,
  },
  toggleBtnActive: {
    backgroundColor: "#fff",
  },
  toggleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  toggleTextActive: {
    color: "#1565C0",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E3F2FD",
    alignItems: "center",
    justifyContent: "center",
  },
  navBtnText: {
    fontSize: 18,
    color: "#1565C0",
  },
  monthTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
    textTransform: "capitalize",
  },
  calendarCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  todayCell: {
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
  },
  hasPostsCell: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  dayNumber: {
    fontSize: 14,
    color: "#1A1A1A",
  },
  todayNumber: {
    fontWeight: "700",
    color: "#1565C0",
  },
  postDots: {
    flexDirection: "row",
    gap: 2,
    marginTop: 2,
  },
  postDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 11,
    color: "#666",
  },
  listContainer: {
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 60,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  postCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 16,
  },
  postDate: {
    fontSize: 13,
    color: "#666",
    fontWeight: "600",
  },
  pastDate: {
    color: "#F44336",
  },
  postTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  postDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sentBadge: {
    backgroundColor: "#E8F5E9",
  },
  scheduledBadge: {
    backgroundColor: "#E3F2FD",
  },
  draftBadge: {
    backgroundColor: "#FFF3E0",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  actionBtns: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F5E9",
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: {
    fontSize: 16,
  },
  deleteBtn: {
    backgroundColor: "#FFEBEE",
  },
  deleteBtnText: {
    fontSize: 16,
  },
  addButton: {
    position: "absolute",
    bottom: 100,
    right: 20,
    borderRadius: 25,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
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
    borderBottomColor: "#F0F0F0",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  closeBtn: {
    fontSize: 24,
    color: "#666",
  },
  modalScroll: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F8F9FA",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: "#1A1A1A",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  dateBtn: {
    backgroundColor: "#E3F2FD",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  dateBtnText: {
    fontSize: 15,
    color: "#1565C0",
    fontWeight: "600",
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    backgroundColor: "#F8F9FA",
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  saveBtn: {
    margin: 20,
    borderRadius: 12,
    overflow: "hidden",
  },
  saveBtnGradient: {
    padding: 16,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
