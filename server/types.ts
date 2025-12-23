/**
 * Tipi condivisi per G-Press Server
 */

export interface Article {
  id: number;
  title: string;
  content: string;
  category?: string;
  tone?: string;
  subject?: string;
  createdAt?: string;
}

export interface JournalistRanking {
  id: number;
  email: string;
  name?: string;
  score: number;
  opens: number;
  clicks: number;
  tier: 'A' | 'B' | 'C';
}

export interface Journalist {
  id: number;
  name: string;
  email: string;
  outlet?: string;
  category?: string;
  country?: string;
  isActive: boolean;
}

export interface PressRelease {
  id: number;
  title: string;
  content: string;
  subject?: string;
  category?: string;
  recipientsCount: number;
  status?: string;
  sentAt?: string;
  createdAt: string;
}

export interface EmailEvent {
  id: number;
  pressReleaseId?: number;
  journalistEmail: string;
  journalistName?: string;
  eventType: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
  eventData?: any;
  createdAt: string;
}

export interface CategoryStats {
  category: string;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  avgOpenRate: number;
  avgClickRate: number;
}

export interface ToneStats {
  tone: string;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  avgOpenRate: number;
  avgClickRate: number;
}
