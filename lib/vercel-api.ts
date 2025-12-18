/**
 * Vercel API Client for G-Press
 * Connects the mobile app to the Vercel backend for AI article generation
 */

// Vercel backend URL
const VERCEL_API_URL = 'https://g-press-gamma.vercel.app';

export interface Document {
  name: string;
  category: string;
  content: string;
}

export interface CompanyInfo {
  name: string;
  ceo: string;
  industry: string;
  products?: string[];
  strengths?: string[];
}

export interface GeneratedArticle {
  title: string;
  subtitle: string;
  content: string;
  tags: string[];
  suggestedCategories: string[];
  estimatedReadTime: number;
}

export interface GenerateArticleResponse {
  success: boolean;
  article: GeneratedArticle;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export type ArticleFormat = 'news_brief' | 'deep_dive' | 'interview' | 'case_study' | 'announcement';
export type ArticleTone = 'professional' | 'formal' | 'technical';

/**
 * Check if the Vercel API is healthy
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/health`);
    const data = await response.json();
    return data.ok === true;
  } catch (error) {
    console.error('[Vercel API] Health check failed:', error);
    return false;
  }
}

/**
 * Generate an article using OpenAI via Vercel backend
 */
export async function generateArticle(params: {
  documents: Document[];
  companyInfo: CompanyInfo;
  format: ArticleFormat;
  targetAudience?: string;
  tone?: ArticleTone;
}): Promise<GenerateArticleResponse> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/ai/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Vercel API] Generate article failed:', error);
    throw error;
  }
}

/**
 * Get the Vercel API URL (for debugging)
 */
export function getApiUrl(): string {
  return VERCEL_API_URL;
}
