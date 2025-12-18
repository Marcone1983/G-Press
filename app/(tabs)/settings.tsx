import { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/contexts/theme-context";

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { themeMode, isDark, setThemeMode } = useTheme();
  
  // Smart Embargo Zones settings
  const [smartEmbargoEnabled, setSmartEmbargoEnabled] = useState(true);
  const [avoidWeekends, setAvoidWeekends] = useState(true);
  const [avoidHolidays, setAvoidHolidays] = useState(true);
  
  // AI features settings
  const [aiSubjectEnabled, setAiSubjectEnabled] = useState(true);
  const [viralScoreEnabled, setViralScoreEnabled] = useState(true);
  const [moodTrackerEnabled, setMoodTrackerEnabled] = useState(true);
  
  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settings = await AsyncStorage.getItem('gpress_settings');
        if (settings) {
          const parsed = JSON.parse(settings);
          setSmartEmbargoEnabled(parsed.smartEmbargoEnabled ?? true);
          setAvoidWeekends(parsed.avoidWeekends ?? true);
          setAvoidHolidays(parsed.avoidHolidays ?? true);
          setAiSubjectEnabled(parsed.aiSubjectEnabled ?? true);
          setViralScoreEnabled(parsed.viralScoreEnabled ?? true);
          setMoodTrackerEnabled(parsed.moodTrackerEnabled ?? true);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    };
    loadSettings();
  }, []);
  
  // Save settings
  const saveSettings = async (key: string, value: boolean) => {
    try {
      const settings = await AsyncStorage.getItem('gpress_settings');
      const parsed = settings ? JSON.parse(settings) : {};
      parsed[key] = value;
      await AsyncStorage.setItem('gpress_settings', JSON.stringify(parsed));
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setThemeMode(mode);
  };

  return (
    <ThemedView style={[styles.container, isDark && styles.containerDark]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16),
            paddingBottom: Math.max(insets.bottom, 20) + 20,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <LinearGradient
          colors={isDark ? ["#1B5E20", "#2E7D32", "#388E3C"] : ["#2E7D32", "#43A047", "#66BB6A"]}
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
              <ThemedText style={styles.headerTitle}>Impostazioni</ThemedText>
              <ThemedText style={styles.headerSubtitle}>
                Personalizza G-Press
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Theme Section */}
        <View style={[styles.section, isDark && styles.sectionDark]}>
          <ThemedText style={[styles.sectionTitle, isDark && styles.textLight]}>🎨 Tema</ThemedText>
          
          <View style={styles.themeOptions}>
            <Pressable
              style={[
                styles.themeOption,
                themeMode === 'light' && styles.themeOptionActive,
                isDark && styles.themeOptionDark,
              ]}
              onPress={() => handleThemeChange('light')}
            >
              <ThemedText style={styles.themeIcon}>☀️</ThemedText>
              <ThemedText style={[styles.themeLabel, isDark && styles.textLight]}>Chiaro</ThemedText>
              {themeMode === 'light' && <ThemedText style={styles.checkmark}>✓</ThemedText>}
            </Pressable>
            
            <Pressable
              style={[
                styles.themeOption,
                themeMode === 'dark' && styles.themeOptionActive,
                isDark && styles.themeOptionDark,
              ]}
              onPress={() => handleThemeChange('dark')}
            >
              <ThemedText style={styles.themeIcon}>🌙</ThemedText>
              <ThemedText style={[styles.themeLabel, isDark && styles.textLight]}>Scuro</ThemedText>
              {themeMode === 'dark' && <ThemedText style={styles.checkmark}>✓</ThemedText>}
            </Pressable>
            
            <Pressable
              style={[
                styles.themeOption,
                themeMode === 'system' && styles.themeOptionActive,
                isDark && styles.themeOptionDark,
              ]}
              onPress={() => handleThemeChange('system')}
            >
              <ThemedText style={styles.themeIcon}>📱</ThemedText>
              <ThemedText style={[styles.themeLabel, isDark && styles.textLight]}>Sistema</ThemedText>
              {themeMode === 'system' && <ThemedText style={styles.checkmark}>✓</ThemedText>}
            </Pressable>
          </View>
        </View>

        {/* Smart Embargo Zones Section */}
        <View style={[styles.section, isDark && styles.sectionDark]}>
          <ThemedText style={[styles.sectionTitle, isDark && styles.textLight]}>🌍 Smart Embargo Zones</ThemedText>
          <ThemedText style={[styles.sectionDescription, isDark && styles.textMuted]}>
            Evita automaticamente invii in momenti non ottimali basandosi su fusi orari e festività
          </ThemedText>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, isDark && styles.textLight]}>Attiva Smart Embargo</ThemedText>
              <ThemedText style={[styles.settingHint, isDark && styles.textMuted]}>Rileva automaticamente orari morti</ThemedText>
            </View>
            <Switch
              value={smartEmbargoEnabled}
              onValueChange={(v) => {
                setSmartEmbargoEnabled(v);
                saveSettings('smartEmbargoEnabled', v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: '#E0E0E0', true: '#81C784' }}
              thumbColor={smartEmbargoEnabled ? '#2E7D32' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, isDark && styles.textLight]}>Evita Weekend</ThemedText>
              <ThemedText style={[styles.settingHint, isDark && styles.textMuted]}>Non inviare sabato e domenica</ThemedText>
            </View>
            <Switch
              value={avoidWeekends}
              onValueChange={(v) => {
                setAvoidWeekends(v);
                saveSettings('avoidWeekends', v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: '#E0E0E0', true: '#81C784' }}
              thumbColor={avoidWeekends ? '#2E7D32' : '#f4f3f4'}
              disabled={!smartEmbargoEnabled}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, isDark && styles.textLight]}>Evita Festività</ThemedText>
              <ThemedText style={[styles.settingHint, isDark && styles.textMuted]}>Rileva festività nazionali per paese</ThemedText>
            </View>
            <Switch
              value={avoidHolidays}
              onValueChange={(v) => {
                setAvoidHolidays(v);
                saveSettings('avoidHolidays', v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: '#E0E0E0', true: '#81C784' }}
              thumbColor={avoidHolidays ? '#2E7D32' : '#f4f3f4'}
              disabled={!smartEmbargoEnabled}
            />
          </View>
        </View>

        {/* AI Features Section */}
        <View style={[styles.section, isDark && styles.sectionDark]}>
          <ThemedText style={[styles.sectionTitle, isDark && styles.textLight]}>🤖 Funzionalità AI</ThemedText>
          <ThemedText style={[styles.sectionDescription, isDark && styles.textMuted]}>
            Abilita o disabilita le funzionalità di intelligenza artificiale
          </ThemedText>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, isDark && styles.textLight]}>AI Subject Optimizer</ThemedText>
              <ThemedText style={[styles.settingHint, isDark && styles.textMuted]}>Suggerisce oggetti email ottimali</ThemedText>
            </View>
            <Switch
              value={aiSubjectEnabled}
              onValueChange={(v) => {
                setAiSubjectEnabled(v);
                saveSettings('aiSubjectEnabled', v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: '#E0E0E0', true: '#81C784' }}
              thumbColor={aiSubjectEnabled ? '#2E7D32' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, isDark && styles.textLight]}>Viral Potential Score</ThemedText>
              <ThemedText style={[styles.settingHint, isDark && styles.textMuted]}>Calcola potenziale virale del comunicato</ThemedText>
            </View>
            <Switch
              value={viralScoreEnabled}
              onValueChange={(v) => {
                setViralScoreEnabled(v);
                saveSettings('viralScoreEnabled', v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: '#E0E0E0', true: '#81C784' }}
              thumbColor={viralScoreEnabled ? '#2E7D32' : '#f4f3f4'}
            />
          </View>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, isDark && styles.textLight]}>Journalist Mood Tracker</ThemedText>
              <ThemedText style={[styles.settingHint, isDark && styles.textMuted]}>Traccia engagement e orari preferiti</ThemedText>
            </View>
            <Switch
              value={moodTrackerEnabled}
              onValueChange={(v) => {
                setMoodTrackerEnabled(v);
                saveSettings('moodTrackerEnabled', v);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              trackColor={{ false: '#E0E0E0', true: '#81C784' }}
              thumbColor={moodTrackerEnabled ? '#2E7D32' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* About Section */}
        <View style={[styles.section, isDark && styles.sectionDark]}>
          <ThemedText style={[styles.sectionTitle, isDark && styles.textLight]}>ℹ️ Informazioni</ThemedText>
          
          <View style={styles.aboutRow}>
            <ThemedText style={[styles.aboutLabel, isDark && styles.textLight]}>Versione</ThemedText>
            <ThemedText style={[styles.aboutValue, isDark && styles.textMuted]}>5.0.0</ThemedText>
          </View>
          
          <View style={styles.aboutRow}>
            <ThemedText style={[styles.aboutLabel, isDark && styles.textLight]}>Sviluppato da</ThemedText>
            <ThemedText style={[styles.aboutValue, isDark && styles.textMuted]}>GROWVERSE, LLC</ThemedText>
          </View>
          
          <Pressable
            style={[styles.linkButton, isDark && styles.linkButtonDark]}
            onPress={() => Linking.openURL('mailto:g.ceo@growverse.net')}
          >
            <ThemedText style={styles.linkButtonText}>📧 Contattaci</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  containerDark: {
    backgroundColor: "#121212",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  header: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  section: {
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
  sectionDark: {
    backgroundColor: "#1E1E1E",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 16,
    lineHeight: 20,
  },
  textLight: {
    color: "#ECEDEE",
  },
  textMuted: {
    color: "#9BA1A6",
  },
  themeOptions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  themeOption: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  themeOptionDark: {
    backgroundColor: "#2A2A2A",
  },
  themeOptionActive: {
    borderColor: "#2E7D32",
    backgroundColor: "#E8F5E9",
  },
  themeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    fontSize: 14,
    color: "#2E7D32",
    fontWeight: "700",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  settingHint: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  aboutRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  aboutLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
  },
  aboutValue: {
    fontSize: 15,
    color: "#666",
  },
  linkButton: {
    backgroundColor: "#E8F5E9",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 16,
  },
  linkButtonDark: {
    backgroundColor: "#1B5E20",
  },
  linkButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#2E7D32",
  },
});
