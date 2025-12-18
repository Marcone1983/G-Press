/**
 * Vercel API Client for G-Press
 * Connects the mobile app to the Vercel backend for AI article generation
 * and all advanced features
 */

// Vercel backend URL
const VERCEL_API_URL = 'https://g-press-gamma.vercel.app';

// ============================================
// TYPES
// ============================================

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
export type RevisionType = 'improve' | 'formal' | 'informal' | 'shorter' | 'longer' | 'rewrite_paragraph';

export interface FactCheckResult {
  claim: string;
  status: 'verified' | 'unverified' | 'inconsistent' | 'not_found';
  source?: string;
  confidence: number;
  note?: string;
}

export interface FactCheckResponse {
  success: boolean;
  facts: FactCheckResult[];
  overallScore: number;
  summary: string;
}

export interface RevisionResponse {
  success: boolean;
  original: string;
  revised: string;
  type: RevisionType;
  suggestions: string[];
}

export interface SearchResult {
  documentName: string;
  relevantExcerpt: string;
  relevanceScore: number;
  matchReason: string;
}

export interface SearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  summary: string;
}

export interface EmailVerificationResult {
  email: string;
  valid: boolean;
  reason?: string;
  score: number;
}

export interface OptimalTimeResult {
  email: string;
  optimalTime: string;
  timezone: string;
  confidence: number;
  reason: string;
}

export interface FollowUpTemplate {
  id: string;
  name: string;
  description: string;
  recommendedDelay: number;
}

export interface LinkedInContact {
  name: string;
  email: string;
  outlet: string;
  category: string;
  country: string;
  position: string;
  source: 'linkedin';
  importedAt: string;
}

export interface FineTuningJob {
  id: string;
  model: string;
  status: string;
  createdAt: number;
  finishedAt?: number;
  trainedTokens?: number;
  fineTunedModel?: string;
}

// ============================================
// HEALTH CHECK
// ============================================

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

// ============================================
// ARTICLE GENERATION
// ============================================

/**
 * Generate an article using OpenAI via Vercel backend
 */
export async function generateArticle(params: {
  documents: Document[];
  companyInfo: CompanyInfo;
  format: ArticleFormat;
  targetAudience?: string;
  tone?: ArticleTone;
  fineTunedModel?: string;
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
 * Generate article with streaming (real-time typing effect)
 */
export async function generateArticleStream(
  params: {
    documents: Document[];
    companyInfo: CompanyInfo;
    format: ArticleFormat;
    customInstructions?: string;
    fineTunedModel?: string;
  },
  onChunk: (text: string) => void,
  onComplete: () => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/ai/generate-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documents: params.documents,
        companyInfo: JSON.stringify(params.companyInfo),
        format: params.format,
        customInstructions: params.customInstructions,
        fineTunedModel: params.fineTunedModel,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No reader available');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.substring(6));
            if (data.content) {
              onChunk(data.content);
            } else if (data.done) {
              onComplete();
              return;
            } else if (data.error) {
              onError(data.error);
              return;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    onComplete();
  } catch (error: any) {
    console.error('[Vercel API] Stream generation failed:', error);
    onError(error.message);
  }
}

// ============================================
// FACT CHECKING
// ============================================

/**
 * Fact-check an article against source documents
 */
export async function factCheckArticle(params: {
  article: string;
  documents: Document[];
}): Promise<FactCheckResponse> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/ai/fact-check`, {
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

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] Fact check failed:', error);
    throw error;
  }
}

// ============================================
// INLINE REVISION
// ============================================

/**
 * Get AI-powered revision suggestions for text
 */
export async function reviseText(params: {
  text: string;
  type: RevisionType;
  context?: string;
  customInstruction?: string;
}): Promise<RevisionResponse> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/ai/revise`, {
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

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] Revision failed:', error);
    throw error;
  }
}

// ============================================
// SEMANTIC SEARCH
// ============================================

/**
 * Search documents using semantic AI understanding
 */
export async function semanticSearch(params: {
  query: string;
  documents: Document[];
}): Promise<SearchResponse> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/ai/search`, {
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

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] Semantic search failed:', error);
    throw error;
  }
}

// ============================================
// EMAIL VERIFICATION
// ============================================

/**
 * Verify email addresses before sending
 */
export async function verifyEmails(emails: string[]): Promise<{
  success: boolean;
  results: EmailVerificationResult[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    validPercentage: number;
  };
}> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/email/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emails }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] Email verification failed:', error);
    throw error;
  }
}

// ============================================
// OPTIMAL TIMING
// ============================================

/**
 * Calculate optimal send times for recipients
 */
export async function getOptimalSendTimes(recipients: Array<{
  email: string;
  country?: string;
  timezone?: string;
  openHistory?: Array<{ hour: number; dayOfWeek: number }>;
}>): Promise<{
  success: boolean;
  results: OptimalTimeResult[];
  groups: Array<{
    scheduledTime: string;
    recipientCount: number;
    recipients: string[];
  }>;
  summary: {
    total: number;
    averageConfidence: number;
  };
}> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/email/optimal-time`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipients }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] Optimal time calculation failed:', error);
    throw error;
  }
}

// ============================================
// AUTO FOLLOW-UP
// ============================================

/**
 * Get available follow-up templates
 */
export async function getFollowUpTemplates(): Promise<{
  success: boolean;
  templates: FollowUpTemplate[];
  defaultSequence: Array<{
    template: string;
    delayHours: number;
  }>;
}> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/email/follow-up`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] Get follow-up templates failed:', error);
    throw error;
  }
}

/**
 * Create an auto follow-up sequence
 */
export async function createFollowUpSequence(params: {
  pressReleaseId: string;
  recipients: string[];
  initialSubject: string;
  initialContent: string;
  sequence: Array<{
    delayHours: number;
    subject: string;
    template: 'gentle_reminder' | 'value_add' | 'last_chance' | 'custom';
    customContent?: string;
  }>;
}): Promise<{
  success: boolean;
  message: string;
  scheduledFollowUps: Array<{
    id: string;
    recipientEmail: string;
    sequenceStep: number;
    scheduledTime: string;
    subject: string;
    status: string;
  }>;
  summary: {
    totalEmails: number;
    recipients: number;
    steps: number;
    firstFollowUp: string;
    lastFollowUp: string;
  };
}> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/email/follow-up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'create_sequence',
        config: params,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] Create follow-up sequence failed:', error);
    throw error;
  }
}

/**
 * Preview a follow-up email
 */
export async function previewFollowUp(params: {
  template: string;
  originalSubject: string;
  originalContent: string;
  customContent?: string;
}): Promise<{
  success: boolean;
  preview: {
    subject: string;
    content: string;
  };
}> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/email/follow-up`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'preview',
        ...params,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] Preview follow-up failed:', error);
    throw error;
  }
}

// ============================================
// LINKEDIN IMPORT
// ============================================

/**
 * Import contacts from LinkedIn CSV export
 */
export async function importLinkedInCSV(params: {
  csvContent: string;
  filterJournalistsOnly?: boolean;
}): Promise<{
  success: boolean;
  imported: LinkedInContact[];
  skipped: Array<{ name: string; reason: string }>;
  summary: {
    totalInCSV: number;
    imported: number;
    skipped: number;
    categories: string[];
    countries: string[];
  };
}> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/contacts/import-linkedin`, {
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

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] LinkedIn import failed:', error);
    throw error;
  }
}

// ============================================
// FINE-TUNING
// ============================================

/**
 * Prepare training data for fine-tuning
 */
export async function prepareTrainingData(examples: Array<{
  prompt: string;
  completion: string;
}>): Promise<{
  success: boolean;
  trainingData: string;
  exampleCount: number;
  estimatedCost: string;
  instructions: string[];
}> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/ai/fine-tune`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'prepare_training_data',
        examples,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] Prepare training data failed:', error);
    throw error;
  }
}

/**
 * List fine-tuning jobs
 */
export async function listFineTuningJobs(): Promise<{
  success: boolean;
  jobs: FineTuningJob[];
}> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/ai/fine-tune`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] List fine-tuning jobs failed:', error);
    throw error;
  }
}

/**
 * Check fine-tuning job status
 */
export async function checkFineTuningStatus(jobId: string): Promise<{
  success: boolean;
  job: FineTuningJob & { error?: any };
  events: Array<{
    message: string;
    createdAt: number;
    level: string;
  }>;
}> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/ai/fine-tune`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'check_status',
        jobId,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] Check fine-tuning status failed:', error);
    throw error;
  }
}

/**
 * List available fine-tuned models
 */
export async function listFineTunedModels(): Promise<{
  success: boolean;
  models: Array<{
    id: string;
    created: number;
    ownedBy: string;
  }>;
}> {
  try {
    const response = await fetch(`${VERCEL_API_URL}/api/ai/fine-tune`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'list_models',
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('[Vercel API] List fine-tuned models failed:', error);
    throw error;
  }
}

// ============================================
// UTILITY
// ============================================

/**
 * Get the Vercel API URL (for debugging)
 */
export function getApiUrl(): string {
  return VERCEL_API_URL;
}
