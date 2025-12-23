/**
 * Hook per accedere ai dati persistenti su Cloudflare D1
 * 
 * Questo hook fornisce un'interfaccia React per accedere ai dati
 * salvati su D1 tramite tRPC, con caching locale e sincronizzazione automatica.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { trpc } from '@/lib/trpc';

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

  // tRPC queries
  const documentsQuery = trpc.cloudflare.documents.list.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const saveMutation = trpc.cloudflare.documents.save.useMutation();
  const deleteMutation = trpc.cloudflare.documents.delete.useMutation();

  // Sync tRPC data to local state
  useEffect(() => {
    if (documentsQuery.data) {
      const docs = documentsQuery.data.map((doc: any) => ({
        ...doc,
        tags: doc.tags ? (typeof doc.tags === 'string' ? JSON.parse(doc.tags) : doc.tags) : [],
      }));
      setDocuments(docs);
      // Cache locally for offline access
      AsyncStorage.setItem(CACHE_KEYS.DOCUMENTS, JSON.stringify(docs)).catch(() => {});
    }
    setLoading(documentsQuery.isLoading);
    if (documentsQuery.error) {
      setError(documentsQuery.error.message);
      // Try to load from cache on error
      AsyncStorage.getItem(CACHE_KEYS.DOCUMENTS).then(cached => {
        if (cached) setDocuments(JSON.parse(cached));
      }).catch(() => {});
    }
  }, [documentsQuery.data, documentsQuery.isLoading, documentsQuery.error]);

  const loadDocuments = useCallback(async () => {
    await documentsQuery.refetch();
  }, [documentsQuery]);

  const saveDocument = useCallback(async (doc: { title: string; content: string; type?: string; category?: string; tags?: string[] }) => {
    try {
      const result = await saveMutation.mutateAsync(doc);
      await documentsQuery.refetch();
      return result.id;
    } catch (err: any) {
      console.error('[D1] Error saving document:', err);
      throw err;
    }
  }, [saveMutation, documentsQuery]);

  const deleteDocument = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      console.error('[D1] Error deleting document:', err);
      throw err;
    }
  }, [deleteMutation]);

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

  const journalistsQuery = trpc.cloudflare.customJournalists.list.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const saveMutation = trpc.cloudflare.customJournalists.save.useMutation();
  const updateMutation = trpc.cloudflare.customJournalists.update.useMutation();
  const deleteMutation = trpc.cloudflare.customJournalists.delete.useMutation();

  useEffect(() => {
    if (journalistsQuery.data) {
      const mapped = journalistsQuery.data.map((j: any) => ({
        ...j,
        isVip: j.is_vip === 1 || j.isVip === true,
        isBlacklisted: j.is_blacklisted === 1 || j.isBlacklisted === true,
      }));
      setJournalists(mapped);
      AsyncStorage.setItem(CACHE_KEYS.JOURNALISTS, JSON.stringify(mapped)).catch(() => {});
    }
    setLoading(journalistsQuery.isLoading);
    if (journalistsQuery.error) {
      setError(journalistsQuery.error.message);
      AsyncStorage.getItem(CACHE_KEYS.JOURNALISTS).then(cached => {
        if (cached) setJournalists(JSON.parse(cached));
      }).catch(() => {});
    }
  }, [journalistsQuery.data, journalistsQuery.isLoading, journalistsQuery.error]);

  const loadJournalists = useCallback(async () => {
    await journalistsQuery.refetch();
  }, [journalistsQuery]);

  const saveJournalist = useCallback(async (journalist: Omit<CustomJournalist, 'id' | 'created_at'>) => {
    try {
      const result = await saveMutation.mutateAsync(journalist);
      await journalistsQuery.refetch();
      return result.id;
    } catch (err: any) {
      console.error('[D1] Error saving journalist:', err);
      throw err;
    }
  }, [saveMutation, journalistsQuery]);

  const updateJournalist = useCallback(async (id: number, updates: Partial<Omit<CustomJournalist, 'id' | 'email' | 'created_at'>>) => {
    try {
      await updateMutation.mutateAsync({ id, ...updates });
      await journalistsQuery.refetch();
    } catch (err: any) {
      console.error('[D1] Error updating journalist:', err);
      throw err;
    }
  }, [updateMutation, journalistsQuery]);

  const deleteJournalist = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      setJournalists(prev => prev.filter(j => j.id !== id));
    } catch (err: any) {
      console.error('[D1] Error deleting journalist:', err);
      throw err;
    }
  }, [deleteMutation]);

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

  const examplesQuery = trpc.cloudflare.trainingExamples.list.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const saveMutation = trpc.cloudflare.trainingExamples.save.useMutation();
  const deleteMutation = trpc.cloudflare.trainingExamples.delete.useMutation();

  useEffect(() => {
    if (examplesQuery.data) {
      setExamples(examplesQuery.data);
      AsyncStorage.setItem(CACHE_KEYS.TRAINING, JSON.stringify(examplesQuery.data)).catch(() => {});
    }
    setLoading(examplesQuery.isLoading);
    if (examplesQuery.error) {
      setError(examplesQuery.error.message);
      AsyncStorage.getItem(CACHE_KEYS.TRAINING).then(cached => {
        if (cached) setExamples(JSON.parse(cached));
      }).catch(() => {});
    }
  }, [examplesQuery.data, examplesQuery.isLoading, examplesQuery.error]);

  const loadExamples = useCallback(async () => {
    await examplesQuery.refetch();
  }, [examplesQuery]);

  const saveExample = useCallback(async (example: Omit<TrainingExample, 'id' | 'created_at'>) => {
    try {
      const result = await saveMutation.mutateAsync(example);
      await examplesQuery.refetch();
      return result.id;
    } catch (err: any) {
      console.error('[D1] Error saving training example:', err);
      throw err;
    }
  }, [saveMutation, examplesQuery]);

  const deleteExample = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      setExamples(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      console.error('[D1] Error deleting training example:', err);
      throw err;
    }
  }, [deleteMutation]);

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

  const statsQuery = trpc.cloudflare.tracking.stats.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const trackMutation = trpc.cloudflare.tracking.track.useMutation();

  useEffect(() => {
    if (statsQuery.data) {
      setStats(statsQuery.data);
      AsyncStorage.setItem(CACHE_KEYS.STATS, JSON.stringify(statsQuery.data)).catch(() => {});
    }
    setLoading(statsQuery.isLoading);
    if (statsQuery.error) {
      setError(statsQuery.error.message);
      AsyncStorage.getItem(CACHE_KEYS.STATS).then(cached => {
        if (cached) setStats(JSON.parse(cached));
      }).catch(() => {});
    }
  }, [statsQuery.data, statsQuery.isLoading, statsQuery.error]);

  const loadStats = useCallback(async () => {
    await statsQuery.refetch();
  }, [statsQuery]);

  const trackEvent = useCallback(async (event: {
    pressReleaseId?: number;
    journalistEmail: string;
    journalistName?: string;
    eventType: string;
    eventData?: any;
  }) => {
    try {
      await trackMutation.mutateAsync(event);
    } catch (err: any) {
      console.error('[D1] Error tracking event:', err);
    }
  }, [trackMutation]);

  return { stats, loading, error, refresh: loadStats, trackEvent };
}

// ============================================
// PRESS RELEASES
// ============================================

export interface PressRelease {
  id: number;
  title: string;
  content: string;
  subject?: string;
  category?: string;
  recipientsCount: number;
  status?: string;
  sent_at?: string;
  created_at: string;
}

export function usePressReleases() {
  const [releases, setReleases] = useState<PressRelease[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const releasesQuery = trpc.cloudflare.pressReleases.list.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const saveMutation = trpc.cloudflare.pressReleases.save.useMutation();

  useEffect(() => {
    if (releasesQuery.data) {
      setReleases(releasesQuery.data);
      AsyncStorage.setItem(CACHE_KEYS.RELEASES, JSON.stringify(releasesQuery.data)).catch(() => {});
    }
    setLoading(releasesQuery.isLoading);
    if (releasesQuery.error) {
      setError(releasesQuery.error.message);
      AsyncStorage.getItem(CACHE_KEYS.RELEASES).then(cached => {
        if (cached) setReleases(JSON.parse(cached));
      }).catch(() => {});
    }
  }, [releasesQuery.data, releasesQuery.isLoading, releasesQuery.error]);

  const loadReleases = useCallback(async () => {
    await releasesQuery.refetch();
  }, [releasesQuery]);

  const saveRelease = useCallback(async (release: {
    title: string;
    content: string;
    recipientsCount: number;
    subject?: string;
    category?: string;
  }) => {
    try {
      const result = await saveMutation.mutateAsync(release);
      await releasesQuery.refetch();
      return result.id;
    } catch (err: any) {
      console.error('[D1] Error saving press release:', err);
      throw err;
    }
  }, [saveMutation, releasesQuery]);

  return { releases, loading, error, refresh: loadReleases, save: saveRelease };
}

// ============================================
// JOURNALIST RANKINGS
// ============================================

export interface JournalistRanking {
  email: string;
  name?: string;
  score: number;
  opens: number;
  clicks: number;
  tier: 'A' | 'B' | 'C';
  updated_at: string;
}

export function useJournalistRankings() {
  const [rankings, setRankings] = useState<JournalistRanking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const rankingsQuery = trpc.cloudflare.rankings.top.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const updateMutation = trpc.cloudflare.rankings.update.useMutation();

  useEffect(() => {
    if (rankingsQuery.data) {
      setRankings(rankingsQuery.data);
      AsyncStorage.setItem(CACHE_KEYS.RANKINGS, JSON.stringify(rankingsQuery.data)).catch(() => {});
    }
    setLoading(rankingsQuery.isLoading);
    if (rankingsQuery.error) {
      setError(rankingsQuery.error.message);
      AsyncStorage.getItem(CACHE_KEYS.RANKINGS).then(cached => {
        if (cached) setRankings(JSON.parse(cached));
      }).catch(() => {});
    }
  }, [rankingsQuery.data, rankingsQuery.isLoading, rankingsQuery.error]);

  const loadRankings = useCallback(async () => {
    await rankingsQuery.refetch();
  }, [rankingsQuery]);

  const updateRanking = useCallback(async (ranking: Omit<JournalistRanking, 'updated_at'>) => {
    try {
      await updateMutation.mutateAsync(ranking);
      await rankingsQuery.refetch();
    } catch (err: any) {
      console.error('[D1] Error updating ranking:', err);
      throw err;
    }
  }, [updateMutation, rankingsQuery]);

  return { rankings, loading, error, refresh: loadRankings, update: updateRanking };
}

// ============================================
// EMAIL TEMPLATES
// ============================================

export interface EmailTemplate {
  id: number;
  name: string;
  subject?: string;
  content: string;
  isDefault?: boolean;
  created_at: string;
}

export function useEmailTemplates() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const templatesQuery = trpc.cloudflare.templates.list.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const saveMutation = trpc.cloudflare.templates.save.useMutation();
  const deleteMutation = trpc.cloudflare.templates.delete.useMutation();

  useEffect(() => {
    if (templatesQuery.data) {
      setTemplates(templatesQuery.data);
      AsyncStorage.setItem(CACHE_KEYS.TEMPLATES, JSON.stringify(templatesQuery.data)).catch(() => {});
    }
    setLoading(templatesQuery.isLoading);
    if (templatesQuery.error) {
      setError(templatesQuery.error.message);
      AsyncStorage.getItem(CACHE_KEYS.TEMPLATES).then(cached => {
        if (cached) setTemplates(JSON.parse(cached));
      }).catch(() => {});
    }
  }, [templatesQuery.data, templatesQuery.isLoading, templatesQuery.error]);

  const loadTemplates = useCallback(async () => {
    await templatesQuery.refetch();
  }, [templatesQuery]);

  const saveTemplate = useCallback(async (template: {
    name: string;
    content: string;
    subject?: string;
    isDefault?: boolean;
  }) => {
    try {
      const result = await saveMutation.mutateAsync(template);
      await templatesQuery.refetch();
      return result.id;
    } catch (err: any) {
      console.error('[D1] Error saving template:', err);
      throw err;
    }
  }, [saveMutation, templatesQuery]);

  const deleteTemplate = useCallback(async (id: number) => {
    try {
      await deleteMutation.mutateAsync({ id });
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err: any) {
      console.error('[D1] Error deleting template:', err);
      throw err;
    }
  }, [deleteMutation]);

  return { templates, loading, error, refresh: loadTemplates, save: saveTemplate, delete: deleteTemplate };
}

// ============================================
// APP SETTINGS
// ============================================

export function useAppSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const settingsQuery = trpc.cloudflare.settings.getAll.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const setMutation = trpc.cloudflare.settings.set.useMutation();

  useEffect(() => {
    if (settingsQuery.data) {
      // getAllSettings returns Record<string, string> directly
      const settingsMap = settingsQuery.data as Record<string, string>;
      setSettings(settingsMap);
      AsyncStorage.setItem(CACHE_KEYS.SETTINGS, JSON.stringify(settingsMap)).catch(() => {});
    }
    setLoading(settingsQuery.isLoading);
    if (settingsQuery.error) {
      setError(settingsQuery.error.message);
      AsyncStorage.getItem(CACHE_KEYS.SETTINGS).then(cached => {
        if (cached) setSettings(JSON.parse(cached));
      }).catch(() => {});
    }
  }, [settingsQuery.data, settingsQuery.isLoading, settingsQuery.error]);

  const loadSettings = useCallback(async () => {
    await settingsQuery.refetch();
  }, [settingsQuery]);

  const setSetting = useCallback(async (key: string, value: string) => {
    try {
      await setMutation.mutateAsync({ key, value });
      setSettings(prev => ({ ...prev, [key]: value }));
    } catch (err: any) {
      console.error('[D1] Error setting value:', err);
      throw err;
    }
  }, [setMutation]);

  const getSetting = useCallback((key: string, defaultValue: string = '') => {
    return settings[key] || defaultValue;
  }, [settings]);

  return { settings, loading, error, refresh: loadSettings, set: setSetting, get: getSetting };
}

// ============================================
// AUTOPILOT STATE
// ============================================

export interface AutopilotState {
  isActive: boolean;
  lastCheck?: string;
  lastArticle?: string;
  stats?: {
    trendsChecked: number;
    articlesGenerated: number;
    articlesSent: number;
  };
}

export function useAutopilotState() {
  const [state, setState] = useState<AutopilotState>({ isActive: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stateQuery = trpc.cloudflare.autopilot.status.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const updateMutation = trpc.cloudflare.autopilot.update.useMutation();

  useEffect(() => {
    if (stateQuery.data) {
      setState(stateQuery.data);
    }
    setLoading(stateQuery.isLoading);
    if (stateQuery.error) {
      setError(stateQuery.error.message);
    }
  }, [stateQuery.data, stateQuery.isLoading, stateQuery.error]);

  const loadState = useCallback(async () => {
    await stateQuery.refetch();
  }, [stateQuery]);

  const updateState = useCallback(async (updates: Partial<AutopilotState>) => {
    try {
      await updateMutation.mutateAsync(updates);
      setState(prev => ({ ...prev, ...updates }));
    } catch (err: any) {
      console.error('[D1] Error updating autopilot state:', err);
      throw err;
    }
  }, [updateMutation]);

  return { state, loading, error, refresh: loadState, update: updateState };
}

// ============================================
// FOLLOW-UP SEQUENCES
// ============================================

export interface FollowupSequence {
  id: number;
  journalistEmail: string;
  originalSubject: string;
  originalContent?: string;
  step: number;
  nextSendAt?: string;
  status: 'pending' | 'sent' | 'cancelled';
  created_at: string;
}

export function useFollowupSequences() {
  const [sequences, setSequences] = useState<FollowupSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sequencesQuery = trpc.cloudflare.followups.list.useQuery(undefined, {
    retry: 2,
    refetchOnWindowFocus: false,
  });
  
  const saveMutation = trpc.cloudflare.followups.save.useMutation();
  const cancelMutation = trpc.cloudflare.followups.cancelByEmail.useMutation();

  useEffect(() => {
    if (sequencesQuery.data) {
      setSequences(sequencesQuery.data);
    }
    setLoading(sequencesQuery.isLoading);
    if (sequencesQuery.error) {
      setError(sequencesQuery.error.message);
    }
  }, [sequencesQuery.data, sequencesQuery.isLoading, sequencesQuery.error]);

  const loadSequences = useCallback(async () => {
    await sequencesQuery.refetch();
  }, [sequencesQuery]);

  const saveSequence = useCallback(async (sequence: {
    journalistEmail: string;
    originalSubject: string;
    originalContent?: string;
    step?: number;
    nextSendAt?: string;
    status?: string;
  }) => {
    try {
      const result = await saveMutation.mutateAsync(sequence);
      await sequencesQuery.refetch();
      return result.id;
    } catch (err: any) {
      console.error('[D1] Error saving follow-up sequence:', err);
      throw err;
    }
  }, [saveMutation, sequencesQuery]);

  const cancelByEmail = useCallback(async (email: string) => {
    try {
      await cancelMutation.mutateAsync({ email });
      await sequencesQuery.refetch();
    } catch (err: any) {
      console.error('[D1] Error cancelling follow-ups:', err);
      throw err;
    }
  }, [cancelMutation, sequencesQuery]);

  return { sequences, loading, error, refresh: loadSequences, save: saveSequence, cancelByEmail };
}
