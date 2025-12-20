/**
 * D1 Storage Service - Client-side wrapper per Cloudflare D1
 * 
 * Questo modulo sostituisce AsyncStorage con chiamate API al backend
 * che persiste i dati su Cloudflare D1 (database dell'utente)
 * 
 * IMPORTANTE: Tutti i dati vengono salvati permanentemente nel database
 * Cloudflare D1 dell'utente e NON vengono persi quando l'app viene reinstallata
 */

import { getApiBaseUrl } from '@/constants/oauth';
import * as Auth from '@/lib/auth';

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

export const knowledgeBase = {
  async getAll(): Promise<KBDocument[]> {
    try {
      const result = await apiCall<any[]>('documents');
      return result.map((doc: any) => ({
        ...doc,
        tags: doc.tags ? JSON.parse(doc.tags) : [],
      }));
    } catch (error) {
      console.error('[D1] Error fetching documents:', error);
      return [];
    }
  },

  async save(doc: { title: string; content: string; type?: string; category?: string; tags?: string[] }): Promise<number | null> {
    try {
      const result = await apiCall<{ id: number }>('documents', 'POST', doc);
      return result.id || null;
    } catch (error) {
      console.error('[D1] Error saving document:', error);
      return null;
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      await apiCall<void>(`documents/${id}`, 'POST', { action: 'delete' });
      return true;
    } catch (error) {
      console.error('[D1] Error deleting document:', error);
      return false;
    }
  },
};

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

export const customJournalists = {
  async getAll(): Promise<CustomJournalist[]> {
    try {
      return await apiCall<CustomJournalist[]>('journalists');
    } catch (error) {
      console.error('[D1] Error fetching custom journalists:', error);
      return [];
    }
  },

  async save(journalist: Omit<CustomJournalist, 'id' | 'created_at'>): Promise<number | null> {
    try {
      const result = await apiCall<{ id: number }>('journalists', 'POST', journalist);
      return result.id || null;
    } catch (error) {
      console.error('[D1] Error saving journalist:', error);
      return null;
    }
  },

  async update(id: number, updates: Partial<Omit<CustomJournalist, 'id' | 'email' | 'created_at'>>): Promise<boolean> {
    try {
      await apiCall<void>(`journalists/${id}`, 'POST', { action: 'update', ...updates });
      return true;
    } catch (error) {
      console.error('[D1] Error updating journalist:', error);
      return false;
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      await apiCall<void>(`journalists/${id}`, 'POST', { action: 'delete' });
      return true;
    } catch (error) {
      console.error('[D1] Error deleting journalist:', error);
      return false;
    }
  },
};

// ============================================
// EMAIL TEMPLATES
// ============================================

export interface EmailTemplate {
  id: number;
  name: string;
  subject?: string;
  content: string;
  isDefault: boolean;
  created_at: string;
}

export const emailTemplates = {
  async getAll(): Promise<EmailTemplate[]> {
    try {
      return await apiCall<EmailTemplate[]>('templates');
    } catch (error) {
      console.error('[D1] Error fetching templates:', error);
      return [];
    }
  },

  async save(template: Omit<EmailTemplate, 'id' | 'created_at'>): Promise<number | null> {
    try {
      const result = await apiCall<{ id: number }>('templates', 'POST', template);
      return result.id || null;
    } catch (error) {
      console.error('[D1] Error saving template:', error);
      return null;
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      await apiCall<void>(`templates/${id}`, 'POST', { action: 'delete' });
      return true;
    } catch (error) {
      console.error('[D1] Error deleting template:', error);
      return false;
    }
  },
};

// ============================================
// TRAINING EXAMPLES (FINE-TUNING)
// ============================================

export interface TrainingExample {
  id: number;
  prompt: string;
  completion: string;
  category?: string;
  created_at: string;
}

export const trainingExamples = {
  async getAll(): Promise<TrainingExample[]> {
    try {
      return await apiCall<TrainingExample[]>('training');
    } catch (error) {
      console.error('[D1] Error fetching training examples:', error);
      return [];
    }
  },

  async save(example: Omit<TrainingExample, 'id' | 'created_at'>): Promise<number | null> {
    try {
      const result = await apiCall<{ id: number }>('training', 'POST', example);
      return result.id || null;
    } catch (error) {
      console.error('[D1] Error saving training example:', error);
      return null;
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      await apiCall<void>(`training/${id}`, 'POST', { action: 'delete' });
      return true;
    } catch (error) {
      console.error('[D1] Error deleting training example:', error);
      return false;
    }
  },
};

// ============================================
// PRESS RELEASES (SENT HISTORY)
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

export const pressReleases = {
  async getAll(): Promise<PressRelease[]> {
    try {
      return await apiCall<PressRelease[]>('releases');
    } catch (error) {
      console.error('[D1] Error fetching press releases:', error);
      return [];
    }
  },

  async save(pr: Omit<PressRelease, 'id' | 'sent_at' | 'status'>): Promise<number | null> {
    try {
      const result = await apiCall<{ id: number }>('releases', 'POST', {
        title: pr.title,
        content: pr.content,
        subject: pr.subject,
        category: pr.category,
        recipientsCount: pr.recipients_count,
      });
      return result.id || null;
    } catch (error) {
      console.error('[D1] Error saving press release:', error);
      return null;
    }
  },
};

// ============================================
// EMAIL TRACKING & STATS
// ============================================

export interface EmailStats {
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
}

export const emailTracking = {
  async getStats(): Promise<EmailStats> {
    try {
      return await apiCall<EmailStats>('tracking/stats');
    } catch (error) {
      console.error('[D1] Error fetching email stats:', error);
      return { totalSent: 0, totalOpened: 0, totalClicked: 0, openRate: 0, clickRate: 0 };
    }
  },

  async track(event: {
    pressReleaseId?: number;
    journalistEmail: string;
    journalistName?: string;
    eventType: string;
    eventData?: any;
  }): Promise<boolean> {
    try {
      await apiCall<void>('tracking', 'POST', event);
      return true;
    } catch (error) {
      console.error('[D1] Error tracking email event:', error);
      return false;
    }
  },

  async getHistory(limit?: number): Promise<any[]> {
    try {
      return await apiCall<any[]>(`tracking/history?limit=${limit || 100}`);
    } catch (error) {
      console.error('[D1] Error fetching tracking history:', error);
      return [];
    }
  },
};

// ============================================
// AUTOPILOT STATE
// ============================================

export interface AutopilotState {
  isActive: boolean;
  trendsAnalyzed: number;
  articlesGenerated: number;
  articlesSent: number;
  lastRun: string | null;
}

export const autopilotState = {
  async get(): Promise<AutopilotState> {
    try {
      return await apiCall<AutopilotState>('autopilot');
    } catch (error) {
      console.error('[D1] Error fetching autopilot state:', error);
      return { isActive: false, trendsAnalyzed: 0, articlesGenerated: 0, articlesSent: 0, lastRun: null };
    }
  },

  async update(updates: Partial<AutopilotState>): Promise<boolean> {
    try {
      await apiCall<void>('autopilot', 'POST', updates);
      return true;
    } catch (error) {
      console.error('[D1] Error updating autopilot state:', error);
      return false;
    }
  },
};

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

export const journalistRankings = {
  async getTop(limit?: number): Promise<JournalistRanking[]> {
    try {
      return await apiCall<JournalistRanking[]>(`rankings?limit=${limit || 50}`);
    } catch (error) {
      console.error('[D1] Error fetching journalist rankings:', error);
      return [];
    }
  },

  async update(ranking: {
    email: string;
    name?: string;
    opens?: number;
    clicks?: number;
    totalSent?: number;
  }): Promise<boolean> {
    try {
      await apiCall<void>('rankings', 'POST', ranking);
      return true;
    } catch (error) {
      console.error('[D1] Error updating journalist ranking:', error);
      return false;
    }
  },
};

// ============================================
// FOLLOW-UP SEQUENCES
// ============================================

export interface FollowupSequence {
  id: number;
  journalist_email: string;
  original_subject: string;
  original_content?: string;
  step: number;
  next_send_at?: string;
  status: string;
  created_at: string;
}

export const followupSequences = {
  async getAll(): Promise<FollowupSequence[]> {
    try {
      return await apiCall<FollowupSequence[]>('followups');
    } catch (error) {
      console.error('[D1] Error fetching followup sequences:', error);
      return [];
    }
  },

  async getPending(): Promise<FollowupSequence[]> {
    try {
      return await apiCall<FollowupSequence[]>('followups/pending');
    } catch (error) {
      console.error('[D1] Error fetching pending followups:', error);
      return [];
    }
  },

  async save(sequence: Omit<FollowupSequence, 'id' | 'created_at'>): Promise<number | null> {
    try {
      const result = await apiCall<{ id: number }>('followups', 'POST', {
        journalistEmail: sequence.journalist_email,
        originalSubject: sequence.original_subject,
        originalContent: sequence.original_content,
        step: sequence.step,
        nextSendAt: sequence.next_send_at,
        status: sequence.status,
      });
      return result.id || null;
    } catch (error) {
      console.error('[D1] Error saving followup sequence:', error);
      return null;
    }
  },

  async update(id: number, updates: Partial<Pick<FollowupSequence, 'step' | 'next_send_at' | 'status'>>): Promise<boolean> {
    try {
      await apiCall<void>(`followups/${id}`, 'POST', {
        action: 'update',
        step: updates.step,
        nextSendAt: updates.next_send_at,
        status: updates.status,
      });
      return true;
    } catch (error) {
      console.error('[D1] Error updating followup sequence:', error);
      return false;
    }
  },

  async delete(id: number): Promise<boolean> {
    try {
      await apiCall<void>(`followups/${id}`, 'POST', { action: 'delete' });
      return true;
    } catch (error) {
      console.error('[D1] Error deleting followup sequence:', error);
      return false;
    }
  },

  async cancelByEmail(email: string): Promise<boolean> {
    try {
      await apiCall<void>('followups/cancel', 'POST', { email });
      return true;
    } catch (error) {
      console.error('[D1] Error cancelling followup by email:', error);
      return false;
    }
  },
};

// ============================================
// SUCCESSFUL ARTICLES CACHE
// ============================================

export interface SuccessfulArticle {
  id: number;
  title: string;
  content: string;
  subject?: string;
  category?: string;
  open_rate: number;
  click_rate: number;
  keywords?: string[];
  created_at: string;
}

export const successfulArticles = {
  async getAll(category?: string, limit?: number): Promise<SuccessfulArticle[]> {
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (limit) params.append('limit', String(limit));
      const result = await apiCall<any[]>(`cache?${params.toString()}`);
      return result.map((a: any) => ({
        ...a,
        keywords: a.keywords ? JSON.parse(a.keywords) : [],
      }));
    } catch (error) {
      console.error('[D1] Error fetching successful articles:', error);
      return [];
    }
  },

  async save(article: Omit<SuccessfulArticle, 'id' | 'created_at'>): Promise<boolean> {
    try {
      await apiCall<void>('cache', 'POST', {
        title: article.title,
        content: article.content,
        subject: article.subject,
        category: article.category,
        openRate: article.open_rate,
        clickRate: article.click_rate,
        keywords: article.keywords,
      });
      return true;
    } catch (error) {
      console.error('[D1] Error saving successful article:', error);
      return false;
    }
  },
};

// ============================================
// SEND PATTERNS (LEARNING)
// ============================================

export interface SendPattern {
  id: number;
  country?: string;
  category?: string;
  best_hour: number;
  best_day: number;
  avg_open_rate: number;
  avg_click_rate: number;
  sample_size: number;
  updated_at: string;
}

export const sendPatterns = {
  async getAll(): Promise<SendPattern[]> {
    try {
      return await apiCall<SendPattern[]>('patterns');
    } catch (error) {
      console.error('[D1] Error fetching send patterns:', error);
      return [];
    }
  },

  async getBestTime(country?: string, category?: string): Promise<{ hour: number; day: number } | null> {
    try {
      const params = new URLSearchParams();
      if (country) params.append('country', country);
      if (category) params.append('category', category);
      return await apiCall<{ hour: number; day: number } | null>(`patterns/best?${params.toString()}`);
    } catch (error) {
      console.error('[D1] Error fetching best send time:', error);
      return null;
    }
  },

  async save(pattern: Omit<SendPattern, 'id' | 'updated_at'>): Promise<boolean> {
    try {
      await apiCall<void>('patterns', 'POST', {
        country: pattern.country,
        category: pattern.category,
        bestHour: pattern.best_hour,
        bestDay: pattern.best_day,
        avgOpenRate: pattern.avg_open_rate,
        avgClickRate: pattern.avg_click_rate,
        sampleSize: pattern.sample_size,
      });
      return true;
    } catch (error) {
      console.error('[D1] Error saving send pattern:', error);
      return false;
    }
  },
};

// ============================================
// APP SETTINGS
// ============================================

export const appSettings = {
  async get(key: string): Promise<string | null> {
    try {
      const result = await apiCall<{ value: string | null }>(`settings/${key}`);
      return result.value;
    } catch (error) {
      console.error('[D1] Error fetching setting:', error);
      return null;
    }
  },

  async getAll(): Promise<Record<string, string>> {
    try {
      return await apiCall<Record<string, string>>('settings');
    } catch (error) {
      console.error('[D1] Error fetching all settings:', error);
      return {};
    }
  },

  async set(key: string, value: string): Promise<boolean> {
    try {
      await apiCall<void>('settings', 'POST', { key, value });
      return true;
    } catch (error) {
      console.error('[D1] Error setting value:', error);
      return false;
    }
  },
};

// ============================================
// INITIALIZE DATABASE
// ============================================

export const initializeD1 = async (): Promise<boolean> => {
  try {
    await apiCall<void>('init', 'POST');
    console.log('[D1] Database initialized successfully');
    return true;
  } catch (error) {
    console.error('[D1] Error initializing database:', error);
    return false;
  }
};

// Export all services
export const d1Storage = {
  knowledgeBase,
  customJournalists,
  emailTemplates,
  trainingExamples,
  pressReleases,
  emailTracking,
  autopilotState,
  journalistRankings,
  followupSequences,
  successfulArticles,
  sendPatterns,
  appSettings,
  initialize: initializeD1,
};
