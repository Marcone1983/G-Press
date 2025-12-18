import { useState } from "react";
import {
  StyleSheet,
  FlatList,
  Pressable,
  Modal,
  View,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useArticles, Article } from "@/hooks/use-storage";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function HistoryScreen() {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const { articles, loading } = useArticles();
  const insets = useSafeAreaInsets();

  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const successColor = useThemeColor({}, "success");

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderArticle = ({ item }: { item: Article }) => (
    <Pressable onPress={() => setSelectedArticle(item)}>
      <ThemedView style={[styles.articleCard, { backgroundColor: surfaceColor }]}>
        <View style={styles.articleHeader}>
          <ThemedText style={styles.articleTitle} numberOfLines={2}>
            {item.title}
          </ThemedText>
          <View style={[styles.badge, { backgroundColor: successColor }]}>
            <ThemedText style={styles.badgeText}>
              {item.recipientCount}
            </ThemedText>
          </View>
        </View>
        <ThemedText
          style={[styles.articlePreview, { color: textSecondaryColor }]}
          numberOfLines={2}
        >
          {item.content}
        </ThemedText>
        <ThemedText style={[styles.articleDate, { color: textSecondaryColor }]}>
          {formatDate(item.sentAt)}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );

  const renderEmptyList = () => (
    <ThemedView style={styles.emptyContainer}>
      <IconSymbol name="clock.fill" size={64} color={textSecondaryColor} />
      <ThemedText style={[styles.emptyTitle, { color: textSecondaryColor }]}>
        Nessun articolo inviato
      </ThemedText>
      <ThemedText style={[styles.emptySubtitle, { color: textSecondaryColor }]}>
        Gli articoli che invierai appariranno qui
      </ThemedText>
    </ThemedView>
  );

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <FlatList
        data={articles}
        keyExtractor={(item) => item.id}
        renderItem={renderArticle}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
        ListEmptyComponent={loading ? null : renderEmptyList}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />

      {/* Article Detail Modal */}
      <Modal
        visible={selectedArticle !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedArticle(null)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor }]}>
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}>
            <View style={{ width: 60 }} />
            <ThemedText style={styles.modalTitle}>Dettaglio</ThemedText>
            <Pressable
              onPress={() => setSelectedArticle(null)}
              style={styles.closeButton}
            >
              <ThemedText style={[styles.closeText, { color: tintColor }]}>
                Chiudi
              </ThemedText>
            </Pressable>
          </View>

          {selectedArticle && (
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={[
                styles.modalContent,
                { paddingBottom: Math.max(insets.bottom, 20) },
              ]}
            >
              <ThemedText style={styles.detailTitle}>
                {selectedArticle.title}
              </ThemedText>

              <View style={styles.metaRow}>
                <View style={[styles.metaBadge, { backgroundColor: successColor }]}>
                  <IconSymbol name="checkmark.circle.fill" size={16} color="#FFFFFF" />
                  <ThemedText style={styles.metaBadgeText}>
                    Inviato a {selectedArticle.recipientCount} contatti
                  </ThemedText>
                </View>
              </View>

              <ThemedText style={[styles.detailDate, { color: textSecondaryColor }]}>
                {formatDate(selectedArticle.sentAt)}
              </ThemedText>

              <View style={[styles.divider, { backgroundColor: borderColor }]} />

              <ThemedText style={styles.detailContent}>
                {selectedArticle.content}
              </ThemedText>
            </ScrollView>
          )}
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  articleCard: {
    padding: 16,
    borderRadius: 12,
  },
  articleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  articleTitle: {
    fontSize: 17,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  articlePreview: {
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 8,
  },
  articleDate: {
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  closeButton: {
    width: 60,
    alignItems: "flex-end",
  },
  closeText: {
    fontSize: 17,
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: "bold",
    lineHeight: 30,
    marginBottom: 16,
  },
  metaRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  metaBadgeText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  detailDate: {
    fontSize: 14,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  detailContent: {
    fontSize: 16,
    lineHeight: 26,
  },
});
