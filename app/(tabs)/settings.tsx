/**
 * Settings Screen - Impostazioni e Backup
 * Gestione backup/restore dati, impostazioni app
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Share,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "@/hooks/use-auth";
import { trpc } from "@/lib/trpc";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  // tRPC mutations
  const createBackup = trpc.cloudflare.backup.create.useMutation();
  const restoreBackup = trpc.cloudflare.backup.restore.useMutation();

  // Esporta backup
  const handleExportBackup = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert("Errore", "Devi essere autenticato per esportare i dati");
      return;
    }

    setIsExporting(true);
    try {
      const backup = await createBackup.mutateAsync();
      const jsonString = JSON.stringify(backup, null, 2);
      
      // Salva file
      const filename = `gpress-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      // Per tutte le piattaforme, usa Share API o download
      if (Platform.OS === 'web') {
        // Per web, usa download diretto
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Per mobile, usa Share API nativa
        await Share.share({
          message: jsonString,
          title: filename,
        });
      }
      
      setLastBackup(new Date().toLocaleString('it-IT'));
      Alert.alert("Successo", `Backup esportato: ${backup.stats.totalDocuments} documenti, ${backup.stats.totalQA} Q&A, ${backup.stats.totalCustomJournalists} giornalisti custom`);
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert("Errore", "Impossibile esportare il backup");
    } finally {
      setIsExporting(false);
    }
  }, [isAuthenticated, createBackup]);

  // Importa backup
  const handleImportBackup = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert("Errore", "Devi essere autenticato per importare i dati");
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      const file = result.assets[0];
      
      Alert.alert(
        "Conferma Import",
        "Vuoi importare questo backup? I dati esistenti verranno mantenuti, i nuovi dati saranno aggiunti.",
        [
          { text: "Annulla", style: "cancel" },
          {
            text: "Importa",
            onPress: async () => {
              setIsImporting(true);
              try {
                // Leggi il contenuto del file
                const response = await fetch(file.uri);
                const content = await response.text();
                const backupData = JSON.parse(content);
                
                const result = await restoreBackup.mutateAsync(backupData);
                
                Alert.alert(
                  "Successo",
                  `Backup importato!\n\nRipristinati:\n- ${result.restored.documents} documenti\n- ${result.restored.qa} Q&A\n- ${result.restored.customJournalists} giornalisti\n- ${result.restored.emailTemplates} template`
                );
              } catch (error) {
                console.error("Import error:", error);
                Alert.alert("Errore", "File di backup non valido o corrotto");
              } finally {
                setIsImporting(false);
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Document picker error:", error);
      Alert.alert("Errore", "Impossibile selezionare il file");
    }
  }, [isAuthenticated, restoreBackup]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: Math.max(insets.bottom, 20) + 20 },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerIcon}>⚙️</Text>
        <Text style={styles.headerTitle}>Impostazioni</Text>
        <Text style={styles.headerSubtitle}>Gestisci backup e preferenze</Text>
      </View>

      {/* Account Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👤 Account</Text>
        {isAuthenticated && user ? (
          <View style={styles.accountInfo}>
            <Text style={styles.accountName}>{user.name || user.email || "Utente"}</Text>
            <Text style={styles.accountEmail}>{user.email || user.openId}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>✓ Autenticato</Text>
            </View>
          </View>
        ) : (
          <View style={styles.accountInfo}>
            <Text style={styles.notAuthText}>Non autenticato</Text>
            <Text style={styles.notAuthHint}>Effettua il login per abilitare backup cloud</Text>
          </View>
        )}
      </View>

      {/* Backup Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>💾 Backup Dati</Text>
        <Text style={styles.cardDescription}>
          Esporta tutti i tuoi dati (documenti, Q&A, giornalisti custom, template) in un file JSON che puoi salvare e reimportare in qualsiasi momento.
        </Text>

        {lastBackup && (
          <View style={styles.lastBackupInfo}>
            <Text style={styles.lastBackupLabel}>Ultimo backup:</Text>
            <Text style={styles.lastBackupDate}>{lastBackup}</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <Pressable
            style={[styles.button, styles.exportButton, isExporting && styles.buttonDisabled]}
            onPress={handleExportBackup}
            disabled={isExporting || !isAuthenticated}
          >
            {isExporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>📤</Text>
                <Text style={styles.buttonText}>Esporta Backup</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={[styles.button, styles.importButton, isImporting && styles.buttonDisabled]}
            onPress={handleImportBackup}
            disabled={isImporting || !isAuthenticated}
          >
            {isImporting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.buttonIcon}>📥</Text>
                <Text style={styles.buttonText}>Importa Backup</Text>
              </>
            )}
          </Pressable>
        </View>

        {!isAuthenticated && (
          <Text style={styles.authWarning}>
            ⚠️ Effettua il login per abilitare le funzioni di backup
          </Text>
        )}
      </View>

      {/* Storage Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>☁️ Storage Cloud</Text>
        <Text style={styles.cardDescription}>
          I tuoi dati sono salvati su Cloudflare D1, un database cloud sicuro e veloce. I dati persistono anche dopo la reinstallazione dell'app.
        </Text>
        
        <View style={styles.storageInfo}>
          <View style={styles.storageItem}>
            <Text style={styles.storageIcon}>📚</Text>
            <Text style={styles.storageLabel}>Knowledge Base</Text>
            <Text style={styles.storageStatus}>Sincronizzato</Text>
          </View>
          <View style={styles.storageItem}>
            <Text style={styles.storageIcon}>🎯</Text>
            <Text style={styles.storageLabel}>Fine-Tuning Q&A</Text>
            <Text style={styles.storageStatus}>Sincronizzato</Text>
          </View>
          <View style={styles.storageItem}>
            <Text style={styles.storageIcon}>👤</Text>
            <Text style={styles.storageLabel}>Giornalisti Custom</Text>
            <Text style={styles.storageStatus}>Sincronizzato</Text>
          </View>
          <View style={styles.storageItem}>
            <Text style={styles.storageIcon}>📧</Text>
            <Text style={styles.storageLabel}>Template Email</Text>
            <Text style={styles.storageStatus}>Sincronizzato</Text>
          </View>
          <View style={styles.storageItem}>
            <Text style={styles.storageIcon}>📊</Text>
            <Text style={styles.storageLabel}>Statistiche</Text>
            <Text style={styles.storageStatus}>Sincronizzato</Text>
          </View>
        </View>
      </View>

      {/* App Info */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>ℹ️ Informazioni App</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Versione</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Database Giornalisti</Text>
          <Text style={styles.infoValue}>9,001 contatti</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Storage</Text>
          <Text style={styles.infoValue}>Cloudflare D1</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email Provider</Text>
          <Text style={styles.infoValue}>Resend</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>AI Provider</Text>
          <Text style={styles.infoValue}>OpenAI GPT-4</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>G-Press © 2024</Text>
        <Text style={styles.footerSubtext}>Distribuzione Comunicati Stampa AI-Powered</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  content: {
    padding: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
    paddingTop: 8,
  },
  headerIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
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
  cardDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 16,
  },
  accountInfo: {
    alignItems: "center",
    paddingVertical: 8,
  },
  accountName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  accountEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  statusBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2E7D32",
  },
  notAuthText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginBottom: 4,
  },
  notAuthHint: {
    fontSize: 13,
    color: "#999",
  },
  lastBackupInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  lastBackupLabel: {
    fontSize: 13,
    color: "#666",
    marginRight: 8,
  },
  lastBackupDate: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  exportButton: {
    backgroundColor: "#2E7D32",
  },
  importButton: {
    backgroundColor: "#1976D2",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonIcon: {
    fontSize: 18,
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  authWarning: {
    fontSize: 13,
    color: "#F57C00",
    textAlign: "center",
    marginTop: 12,
  },
  storageInfo: {
    gap: 12,
  },
  storageItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  storageIcon: {
    fontSize: 20,
    width: 32,
  },
  storageLabel: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  storageStatus: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2E7D32",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  infoLabel: {
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  footer: {
    alignItems: "center",
    paddingVertical: 24,
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#999",
  },
  footerSubtext: {
    fontSize: 12,
    color: "#BBB",
    marginTop: 4,
  },
});
