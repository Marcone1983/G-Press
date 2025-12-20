/**
 * Hook per accedere ai dati persistenti su Cloudflare D1
 * 
 * Questo hook fornisce un'interfaccia React per accedere ai dati
 * salvati su D1, con caching locale e sincronizzazione automatica.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApiBaseUrl } from '@/constants/oauth';
import * as Auth from '@/lib/auth';

// Cache keys per fallback locale
const CACHE_KEYS = {
  DOCUMENTS: 'gpress_d1_cache_documents',
  JOURNALISTS: 'gpress_d1_cache_journalists',
  TEMPLATES: 'gpress_d1_cache_templates',
  TRAINING: 'gpress_d1_cache_training',
  RELEASES: 'gpress_d1_cache_releases',
  STATS: 'gpress_d1_cache_stats',
  RANKINGS: 'gpress_d1_cache_rankings',
  SETTINGS: 'gpress_d1_cache_settings',
};

// Helper per chiamate API
async function apiCall<T>(endpoint: string, method: 'GET' | 'POST' = 'GET', body?: any): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const token = await Auth.getSessionToken();
  
  const response = await fetch(`${baseUrl}/api/d1/${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// KNOWLEDGE BASE DOCUMENTS
// ============================================

export interface KBDocument {
  id: number;
  title: string;
  content: string;
  type?: string;
  category?: string;
  tags?: string[];
  created_at: string;
  updated_at: string;
}

export function useKnowledgeBase() {
  const [documents, setDocuments] = useState<KBDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall<any[]>('documents');
      const docs = result.map((doc: any) => ({
        ...doc,
        tags: doc.tags ? (typeof doc.tags === 'string' ? JSON.parse(doc.tags) : doc.tags) : [],
      }));
      setDocuments(docs);
      // Cache locally
      await AsyncStorage.setItem(CACHE_KEYS.DOCUMENTS, JSON.stringify(docs));
    } catch (err: any) {
      console.error('[D1] Error loading documents:', err);
      setError(err.message);
      // Try to load from cache
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.DOCUMENTS);
        if (cached) setDocuments(JSON.parse(cached));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  const saveDocument = useCallback(async (doc: { title: string; content: string; type?: string; category?: string; tags?: string[] }) => {
    try {
      const result = await apiCall<{ id: number }>('documents', 'POST', doc);
      await loadDocuments(); // Refresh list
      return result.id;
    } catch (err: any) {
      console.error('[D1] Error saving document:', err);
      throw err;
    }
  }, [loadDocuments]);

  const deleteDocument = useCallback(async (id: number) => {
    try {
      await apiCall<void>(`documents/${id}`, 'POST', { action: 'delete' });
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      console.error('[D1] Error deleting document:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return { documents, loading, error, refresh: loadDocuments, save: saveDocument, delete: deleteDocument };
}

// ============================================
// CUSTOM JOURNALISTS
// ============================================

export interface CustomJournalist {
  id: number;
  name: string;
  email: string;
  outlet?: string;
  category?: string;
  country?: string;
  isVip: boolean;
  isBlacklisted: boolean;
  notes?: string;
  created_at: string;
}

export function useCustomJournalists() {
  const [journalists, setJournalists] = useState<CustomJournalist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadJournalists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall<any[]>('journalists');
      const mapped = result.map((j: any) => ({
        ...j,
        isVip: j.is_vip === 1 || j.isVip === true,
        isBlacklisted: j.is_blacklisted === 1 || j.isBlacklisted === true,
      }));
      setJournalists(mapped);
      await AsyncStorage.setItem(CACHE_KEYS.JOURNALISTS, JSON.stringify(mapped));
    } catch (err: any) {
      console.error('[D1] Error loading journalists:', err);
      setError(err.message);
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.JOURNALISTS);
        if (cached) setJournalists(JSON.parse(cached));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  const saveJournalist = useCallback(async (journalist: Omit<CustomJournalist, 'id' | 'created_at'>) => {
    try {
      const result = await apiCall<{ id: number }>('journalists', 'POST', journalist);
      await loadJournalists();
      return result.id;
    } catch (err: any) {
      console.error('[D1] Error saving journalist:', err);
      throw err;
    }
  }, [loadJournalists]);

  const updateJournalist = useCallback(async (id: number, updates: Partial<Omit<CustomJournalist, 'id' | 'email' | 'created_at'>>) => {
    try {
      await apiCall<void>(`journalists/${id}`, 'POST', { action: 'update', ...updates });
      await loadJournalists();
    } catch (err: any) {
      console.error('[D1] Error updating journalist:', err);
      throw err;
    }
  }, [loadJournalists]);

  const deleteJournalist = useCallback(async (id: number) => {
    try {
      await apiCall<void>(`journalists/${id}`, 'POST', { action: 'delete' });
      setJournalists(prev => prev.filter(j => j.id !== id));
    } catch (err: any) {
      console.error('[D1] Error deleting journalist:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadJournalists();
  }, [loadJournalists]);

  return { journalists, loading, error, refresh: loadJournalists, save: saveJournalist, update: updateJournalist, delete: deleteJournalist };
}

// ============================================
// TRAINING EXAMPLES
// ============================================

export interface TrainingExample {
  id: number;
  prompt: string;
  completion: string;
  category?: string;
  created_at: string;
}

export function useTrainingExamples() {
  const [examples, setExamples] = useState<TrainingExample[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExamples = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall<TrainingExample[]>('training');
      setExamples(result);
      await AsyncStorage.setItem(CACHE_KEYS.TRAINING, JSON.stringify(result));
    } catch (err: any) {
      console.error('[D1] Error loading training examples:', err);
      setError(err.message);
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.TRAINING);
        if (cached) setExamples(JSON.parse(cached));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  const saveExample = useCallback(async (example: Omit<TrainingExample, 'id' | 'created_at'>) => {
    try {
      const result = await apiCall<{ id: number }>('training', 'POST', example);
      await loadExamples();
      return result.id;
    } catch (err: any) {
      console.error('[D1] Error saving training example:', err);
      throw err;
    }
  }, [loadExamples]);

  const deleteExample = useCallback(async (id: number) => {
    try {
      await apiCall<void>(`training/${id}`, 'POST', { action: 'delete' });
      setExamples(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      console.error('[D1] Error deleting training example:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadExamples();
  }, [loadExamples]);

  return { examples, loading, error, refresh: loadExamples, save: saveExample, delete: deleteExample };
}

// ============================================
// EMAIL STATS
// ============================================

export interface EmailStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
}

export function useEmailStats() {
  const [stats, setStats] = useState<EmailStats>({
    totalSent: 0,
    totalOpened: 0,
    totalClicked: 0,
    openRate: 0,
    clickRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall<EmailStats>('tracking/stats');
      setStats(result);
      await AsyncStorage.setItem(CACHE_KEYS.STATS, JSON.stringify(result));
    } catch (err: any) {
      console.error('[D1] Error loading email stats:', err);
      setError(err.message);
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.STATS);
        if (cached) setStats(JSON.parse(cached));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  const trackEvent = useCallback(async (event: {
    pressReleaseId?: number;
    journalistEmail: string;
    journalistName?: string;
    eventType: string;
    eventData?: any;
  }) => {
    try {
      await apiCall<void>('tracking', 'POST', event);
    } catch (err: any) {
      console.error('[D1] Error tracking event:', err);
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return { stats, loading, error, refresh: loadStats, track: trackEvent };
}

// ============================================
// JOURNALIST RANKINGS
// ============================================

export interface JournalistRanking {
  id: number;
  journalist_email: string;
  journalist_name?: string;
  tier: string;
  engagement_score: number;
  opens: number;
  clicks: number;
  total_sent: number;
  updated_at: string;
}

export function useJournalistRankings() {
  const [rankings, setRankings] = useState<JournalistRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRankings = useCallback(async (limit?: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall<JournalistRanking[]>(`rankings?limit=${limit || 50}`);
      setRankings(result);
      await AsyncStorage.setItem(CACHE_KEYS.RANKINGS, JSON.stringify(result));
    } catch (err: any) {
      console.error('[D1] Error loading rankings:', err);
      setError(err.message);
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.RANKINGS);
        if (cached) setRankings(JSON.parse(cached));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  const updateRanking = useCallback(async (ranking: {
    email: string;
    name?: string;
    opens?: number;
    clicks?: number;
    totalSent?: number;
  }) => {
    try {
      await apiCall<void>('rankings', 'POST', ranking);
      await loadRankings();
    } catch (err: any) {
      console.error('[D1] Error updating ranking:', err);
    }
  }, [loadRankings]);

  useEffect(() => {
    loadRankings();
  }, [loadRankings]);

  return { rankings, loading, error, refresh: loadRankings, update: updateRanking };
}

// ============================================
// PRESS RELEASES HISTORY
// ============================================

export interface PressRelease {
  id: number;
  title: string;
  content: string;
  subject?: string;
  category?: string;
  recipients_count: number;
  sent_at: string;
  status: string;
}

export function usePressReleases() {
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReleases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall<PressRelease[]>('releases');
      setReleases(result);
      await AsyncStorage.setItem(CACHE_KEYS.RELEASES, JSON.stringify(result));
    } catch (err: any) {
      console.error('[D1] Error loading press releases:', err);
      setError(err.message);
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.RELEASES);
        if (cached) setReleases(JSON.parse(cached));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  const saveRelease = useCallback(async (release: Omit<PressRelease, 'id' | 'sent_at' | 'status'>) => {
    try {
      const result = await apiCall<{ id: number }>('releases', 'POST', {
        title: release.title,
        content: release.content,
        subject: release.subject,
        category: release.category,
        recipientsCount: release.recipients_count,
      });
      await loadReleases();
      return result.id;
    } catch (err: any) {
      console.error('[D1] Error saving press release:', err);
      throw err;
    }
  }, [loadReleases]);

  useEffect(() => {
    loadReleases();
  }, [loadReleases]);

  return { releases, loading, error, refresh: loadReleases, save: saveRelease };
}

// ============================================
// APP SETTINGS
// ============================================

export function useAppSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCall<Record<string, string>>('settings');
      setSettings(result);
      await AsyncStorage.setItem(CACHE_KEYS.SETTINGS, JSON.stringify(result));
    } catch (err: any) {
      console.error('[D1] Error loading settings:', err);
      setError(err.message);
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEYS.SETTINGS);
        if (cached) setSettings(JSON.parse(cached));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  const getSetting = useCallback((key: string): string | undefined => {
    return settings[key];
  }, [settings]);

  const setSetting = useCallback(async (key: string, value: string) => {
    try {
      await apiCall<void>('settings', 'POST', { key, value });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (err: any) {
      console.error('[D1] Error setting value:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return { settings, loading, error, refresh: loadSettings, get: getSetting, set: setSetting };
}

// ============================================
// INITIALIZE D1 DATABASE
// ============================================

export function useD1Init() {
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    try {
      await apiCall<void>('init', 'POST');
      setInitialized(true);
      console.log('[D1] Database initialized successfully');
    } catch (err: any) {
      console.error('[D1] Error initializing database:', err);
      setError(err.message);
    }
  }, []);

  return { initialized, error, initialize };
}
