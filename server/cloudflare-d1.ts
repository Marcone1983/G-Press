/**
 * Cloudflare D1 Database Service
 * Database persistente sotto il controllo dell'utente
 * 
 * Account ID: af495621eec5c53e3f99f7e0b1fbbe7b
 * Database ID: 93354d3d-7050-4565-a28a-949bae431eac
 * Database Name: gpress
 * 
 * TUTTE le tabelle:
 * - knowledge_documents: Documenti Knowledge Base
 * - finetuning_qa: Q&A per fine-tuning
 * - press_releases: Comunicati stampa inviati
 * - email_tracking: Tracking aperture/click
 * - autopilot_state: Stato autopilota
 * - successful_articles: Cache articoli di successo
 * - send_patterns: Pattern di invio (learning)
 * - journalist_rankings: Ranking giornalisti
 * - custom_journalists: Giornalisti personalizzati
 * - email_templates: Template email
 * - training_examples: Esempi training AI
 * - followup_sequences: Sequenze follow-up
 * - app_settings: Impostazioni app
 */

const CLOUDFLARE_ACCOUNT_ID = "af495621eec5c53e3f99f7e0b1fbbe7b";
const CLOUDFLARE_DATABASE_ID = "93354d3d-7050-4565-a28a-949bae431eac";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_D1_TOKEN || "7uXBsLMHZFK1NUvRJBjavLmUN8liMkriYWJzzwlr";

const D1_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_DATABASE_ID}`;

interface D1QueryResult {
  success: boolean;
  results?: any[];
  meta?: {
    changes: number;
    last_row_id: number;
    rows_read: number;
    rows_written: number;
  };
  error?: string;
}

/**
 * Esegue una query SQL su Cloudflare D1
 */
export async function executeQuery(sql: string, params: any[] = []): Promise<D1QueryResult> {
  try {
    const response = await fetch(`${D1_API_BASE}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sql,
        params,
      }),
    });

    const data = await response.json() as any;
    
    if (!data.success) {
      console.error("[D1] Query error:", data.errors);
      return { success: false, error: data.errors?.[0]?.message || "Query failed" };
    }

    return {
      success: true,
      results: data.result?.[0]?.results || [],
      meta: data.result?.[0]?.meta,
    };
  } catch (error) {
    console.error("[D1] Connection error:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Inizializza le tabelle nel database D1
 */
export async function initializeDatabase(): Promise<boolean> {
  console.log("[D1] Initializing database tables...");

  const tables = [
    // Knowledge Base Documents
    `CREATE TABLE IF NOT EXISTS knowledge_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'document',
      category TEXT,
      tags TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Fine-tuning Q&A
    `CREATE TABLE IF NOT EXISTS finetuning_qa (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Press Releases (comunicati inviati)
    `CREATE TABLE IF NOT EXISTS press_releases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      subject TEXT,
      category TEXT,
      recipients_count INTEGER DEFAULT 0,
      sent_at TEXT DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'sent'
    )`,

    // Email Tracking
    `CREATE TABLE IF NOT EXISTS email_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      press_release_id INTEGER,
      journalist_email TEXT NOT NULL,
      journalist_name TEXT,
      event_type TEXT NOT NULL,
      event_data TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Autopilot State
    `CREATE TABLE IF NOT EXISTS autopilot_state (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      is_active INTEGER DEFAULT 0,
      trends_analyzed INTEGER DEFAULT 0,
      articles_generated INTEGER DEFAULT 0,
      articles_sent INTEGER DEFAULT 0,
      last_run TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Successful Articles Cache
    `CREATE TABLE IF NOT EXISTS successful_articles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      subject TEXT,
      category TEXT,
      open_rate REAL DEFAULT 0,
      click_rate REAL DEFAULT 0,
      keywords TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Send Patterns (Learning)
    `CREATE TABLE IF NOT EXISTS send_patterns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      country TEXT,
      category TEXT,
      best_hour INTEGER,
      best_day INTEGER,
      avg_open_rate REAL DEFAULT 0,
      avg_click_rate REAL DEFAULT 0,
      sample_size INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Journalist Rankings
    `CREATE TABLE IF NOT EXISTS journalist_rankings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journalist_email TEXT NOT NULL UNIQUE,
      journalist_name TEXT,
      tier TEXT DEFAULT 'C',
      engagement_score REAL DEFAULT 0,
      opens INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0,
      total_sent INTEGER DEFAULT 0,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Custom Journalists
    `CREATE TABLE IF NOT EXISTS custom_journalists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      outlet TEXT,
      category TEXT DEFAULT 'general',
      country TEXT DEFAULT 'IT',
      is_vip INTEGER DEFAULT 0,
      is_blacklisted INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Email Templates
    `CREATE TABLE IF NOT EXISTS email_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT,
      content TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Training Examples
    `CREATE TABLE IF NOT EXISTS training_examples (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prompt TEXT NOT NULL,
      completion TEXT NOT NULL,
      category TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // Follow-up Sequences
    `CREATE TABLE IF NOT EXISTS followup_sequences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      journalist_email TEXT NOT NULL,
      original_subject TEXT NOT NULL,
      original_content TEXT,
      step INTEGER DEFAULT 1,
      next_send_at TEXT,
      status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,

    // App Settings
    `CREATE TABLE IF NOT EXISTS app_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  for (const sql of tables) {
    const result = await executeQuery(sql);
    if (!result.success) {
      console.error("[D1] Failed to create table:", result.error);
      return false;
    }
  }

  // Inserisci stato autopilot iniziale se non esiste
  await executeQuery(
    "INSERT OR IGNORE INTO autopilot_state (id, is_active) VALUES (1, 0)"
  );

  console.log("[D1] Database initialized successfully!");
  return true;
}

// ============================================
// KNOWLEDGE BASE FUNCTIONS
// ============================================

export async function saveDocument(doc: {
  title: string;
  content: string;
  type?: string;
  category?: string;
  tags?: string[];
}): Promise<number | null> {
  const result = await executeQuery(
    `INSERT INTO knowledge_documents (title, content, type, category, tags) 
     VALUES (?, ?, ?, ?, ?)`,
    [doc.title, doc.content, doc.type || "document", doc.category || null, JSON.stringify(doc.tags || [])]
  );
  
  if (result.success && result.meta) {
    return result.meta.last_row_id;
  }
  return null;
}

export async function getAllDocuments(): Promise<any[]> {
  const result = await executeQuery("SELECT * FROM knowledge_documents ORDER BY created_at DESC");
  return result.results || [];
}

export async function getDocumentById(id: number): Promise<any | null> {
  const result = await executeQuery("SELECT * FROM knowledge_documents WHERE id = ?", [id]);
  return result.results?.[0] || null;
}

export async function updateDocument(id: number, doc: {
  title?: string;
  content?: string;
  type?: string;
  category?: string;
  tags?: string[];
}): Promise<boolean> {
  const setClauses: string[] = [];
  const params: any[] = [];

  if (doc.title !== undefined) {
    setClauses.push("title = ?");
    params.push(doc.title);
  }
  if (doc.content !== undefined) {
    setClauses.push("content = ?");
    params.push(doc.content);
  }
  if (doc.type !== undefined) {
    setClauses.push("type = ?");
    params.push(doc.type);
  }
  if (doc.category !== undefined) {
    setClauses.push("category = ?");
    params.push(doc.category);
  }
  if (doc.tags !== undefined) {
    setClauses.push("tags = ?");
    params.push(JSON.stringify(doc.tags));
  }

  setClauses.push("updated_at = CURRENT_TIMESTAMP");
  params.push(id);

  const result = await executeQuery(
    `UPDATE knowledge_documents SET ${setClauses.join(", ")} WHERE id = ?`,
    params
  );
  return result.success;
}

export async function deleteDocument(id: number): Promise<boolean> {
  const result = await executeQuery("DELETE FROM knowledge_documents WHERE id = ?", [id]);
  return result.success;
}

// ============================================
// FINE-TUNING Q&A FUNCTIONS
// ============================================

export async function saveQA(qa: {
  question: string;
  answer: string;
  category?: string;
}): Promise<number | null> {
  const result = await executeQuery(
    `INSERT INTO finetuning_qa (question, answer, category) VALUES (?, ?, ?)`,
    [qa.question, qa.answer, qa.category || null]
  );
  
  if (result.success && result.meta) {
    return result.meta.last_row_id;
  }
  return null;
}

export async function getAllQA(): Promise<any[]> {
  const result = await executeQuery("SELECT * FROM finetuning_qa ORDER BY created_at DESC");
  return result.results || [];
}

export async function deleteQA(id: number): Promise<boolean> {
  const result = await executeQuery("DELETE FROM finetuning_qa WHERE id = ?", [id]);
  return result.success;
}

// ============================================
// TRAINING EXAMPLES FUNCTIONS
// ============================================

export async function saveTrainingExample(example: {
  prompt: string;
  completion: string;
  category?: string;
}): Promise<number | null> {
  const result = await executeQuery(
    `INSERT INTO training_examples (prompt, completion, category) VALUES (?, ?, ?)`,
    [example.prompt, example.completion, example.category || null]
  );
  
  if (result.success && result.meta) {
    return result.meta.last_row_id;
  }
  return null;
}

export async function getAllTrainingExamples(): Promise<any[]> {
  const result = await executeQuery("SELECT * FROM training_examples ORDER BY created_at DESC");
  return result.results || [];
}

export async function deleteTrainingExample(id: number): Promise<boolean> {
  const result = await executeQuery("DELETE FROM training_examples WHERE id = ?", [id]);
  return result.success;
}

// ============================================
// PRESS RELEASES FUNCTIONS
// ============================================

export async function savePressRelease(pr: {
  title: string;
  content: string;
  subject?: string;
  category?: string;
  recipientsCount: number;
}): Promise<number | null> {
  const result = await executeQuery(
    `INSERT INTO press_releases (title, content, subject, category, recipients_count) 
     VALUES (?, ?, ?, ?, ?)`,
    [pr.title, pr.content, pr.subject || null, pr.category || null, pr.recipientsCount]
  );
  
  if (result.success && result.meta) {
    return result.meta.last_row_id;
  }
  return null;
}

export async function getAllPressReleases(): Promise<any[]> {
  const result = await executeQuery("SELECT * FROM press_releases ORDER BY sent_at DESC");
  return result.results || [];
}

export async function getPressReleaseById(id: number): Promise<any | null> {
  const result = await executeQuery("SELECT * FROM press_releases WHERE id = ?", [id]);
  return result.results?.[0] || null;
}

// ============================================
// EMAIL TRACKING FUNCTIONS
// ============================================

export async function trackEmailEvent(event: {
  pressReleaseId?: number;
  journalistEmail: string;
  journalistName?: string;
  eventType: string;
  eventData?: any;
}): Promise<boolean> {
  const result = await executeQuery(
    `INSERT INTO email_tracking (press_release_id, journalist_email, journalist_name, event_type, event_data) 
     VALUES (?, ?, ?, ?, ?)`,
    [
      event.pressReleaseId || null,
      event.journalistEmail,
      event.journalistName || null,
      event.eventType,
      JSON.stringify(event.eventData || {})
    ]
  );
  return result.success;
}

export async function getEmailStats(): Promise<{
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
}> {
  const sentResult = await executeQuery(
    "SELECT COUNT(*) as count FROM email_tracking WHERE event_type = 'sent'"
  );
  const openedResult = await executeQuery(
    "SELECT COUNT(*) as count FROM email_tracking WHERE event_type = 'opened'"
  );
  const clickedResult = await executeQuery(
    "SELECT COUNT(*) as count FROM email_tracking WHERE event_type = 'clicked'"
  );

  const totalSent = sentResult.results?.[0]?.count || 0;
  const totalOpened = openedResult.results?.[0]?.count || 0;
  const totalClicked = clickedResult.results?.[0]?.count || 0;

  return {
    totalSent,
    totalOpened,
    totalClicked,
    openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
    clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
  };
}

export async function getEmailTrackingHistory(limit: number = 100): Promise<any[]> {
  const result = await executeQuery(
    "SELECT * FROM email_tracking ORDER BY created_at DESC LIMIT ?",
    [limit]
  );
  return result.results || [];
}

// ============================================
// AUTOPILOT STATE FUNCTIONS
// ============================================

export async function getAutopilotState(): Promise<{
  isActive: boolean;
  trendsAnalyzed: number;
  articlesGenerated: number;
  articlesSent: number;
  lastRun: string | null;
}> {
  const result = await executeQuery("SELECT * FROM autopilot_state WHERE id = 1");
  const state = result.results?.[0];
  
  return {
    isActive: state?.is_active === 1,
    trendsAnalyzed: state?.trends_analyzed || 0,
    articlesGenerated: state?.articles_generated || 0,
    articlesSent: state?.articles_sent || 0,
    lastRun: state?.last_run || null,
  };
}

export async function updateAutopilotState(updates: {
  isActive?: boolean;
  trendsAnalyzed?: number;
  articlesGenerated?: number;
  articlesSent?: number;
}): Promise<boolean> {
  const setClauses: string[] = [];
  const params: any[] = [];

  if (updates.isActive !== undefined) {
    setClauses.push("is_active = ?");
    params.push(updates.isActive ? 1 : 0);
  }
  if (updates.trendsAnalyzed !== undefined) {
    setClauses.push("trends_analyzed = ?");
    params.push(updates.trendsAnalyzed);
  }
  if (updates.articlesGenerated !== undefined) {
    setClauses.push("articles_generated = ?");
    params.push(updates.articlesGenerated);
  }
  if (updates.articlesSent !== undefined) {
    setClauses.push("articles_sent = ?");
    params.push(updates.articlesSent);
  }

  setClauses.push("last_run = CURRENT_TIMESTAMP");
  setClauses.push("updated_at = CURRENT_TIMESTAMP");

  const result = await executeQuery(
    `UPDATE autopilot_state SET ${setClauses.join(", ")} WHERE id = 1`,
    params
  );
  return result.success;
}

// ============================================
// JOURNALIST RANKING FUNCTIONS
// ============================================

export async function updateJournalistRanking(ranking: {
  email: string;
  name?: string;
  opens?: number;
  clicks?: number;
  totalSent?: number;
}): Promise<boolean> {
  // Calcola engagement score e tier
  const opens = ranking.opens || 0;
  const clicks = ranking.clicks || 0;
  const totalSent = ranking.totalSent || 1;
  
  const openRate = opens / totalSent;
  const clickRate = clicks / totalSent;
  const engagementScore = (openRate * 0.4) + (clickRate * 0.6);
  
  let tier = "C";
  if (engagementScore > 0.3) tier = "A";
  else if (engagementScore > 0.15) tier = "B";

  const result = await executeQuery(
    `INSERT INTO journalist_rankings (journalist_email, journalist_name, tier, engagement_score, opens, clicks, total_sent)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(journalist_email) DO UPDATE SET
       journalist_name = excluded.journalist_name,
       tier = excluded.tier,
       engagement_score = excluded.engagement_score,
       opens = excluded.opens,
       clicks = excluded.clicks,
       total_sent = excluded.total_sent,
       updated_at = CURRENT_TIMESTAMP`,
    [ranking.email, ranking.name || null, tier, engagementScore, opens, clicks, totalSent]
  );
  return result.success;
}

export async function getTopJournalists(limit: number = 50): Promise<any[]> {
  const result = await executeQuery(
    `SELECT * FROM journalist_rankings ORDER BY engagement_score DESC LIMIT ?`,
    [limit]
  );
  return result.results || [];
}

export async function getJournalistRanking(email: string): Promise<any | null> {
  const result = await executeQuery(
    "SELECT * FROM journalist_rankings WHERE journalist_email = ?",
    [email]
  );
  return result.results?.[0] || null;
}

// ============================================
// CUSTOM JOURNALISTS FUNCTIONS
// ============================================

export async function saveCustomJournalist(journalist: {
  name: string;
  email: string;
  outlet?: string;
  category?: string;
  country?: string;
  isVip?: boolean;
  isBlacklisted?: boolean;
  notes?: string;
}): Promise<number | null> {
  const result = await executeQuery(
    `INSERT INTO custom_journalists (name, email, outlet, category, country, is_vip, is_blacklisted, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       name = excluded.name,
       outlet = excluded.outlet,
       category = excluded.category,
       country = excluded.country,
       is_vip = excluded.is_vip,
       is_blacklisted = excluded.is_blacklisted,
       notes = excluded.notes`,
    [
      journalist.name,
      journalist.email,
      journalist.outlet || null,
      journalist.category || "general",
      journalist.country || "IT",
      journalist.isVip ? 1 : 0,
      journalist.isBlacklisted ? 1 : 0,
      journalist.notes || null
    ]
  );
  
  if (result.success && result.meta) {
    return result.meta.last_row_id;
  }
  return null;
}

export async function getAllCustomJournalists(): Promise<any[]> {
  const result = await executeQuery("SELECT * FROM custom_journalists ORDER BY created_at DESC");
  return (result.results || []).map(j => ({
    ...j,
    isVip: j.is_vip === 1,
    isBlacklisted: j.is_blacklisted === 1,
  }));
}

export async function deleteCustomJournalist(id: number): Promise<boolean> {
  const result = await executeQuery("DELETE FROM custom_journalists WHERE id = ?", [id]);
  return result.success;
}

export async function updateCustomJournalist(id: number, updates: {
  name?: string;
  outlet?: string;
  category?: string;
  country?: string;
  isVip?: boolean;
  isBlacklisted?: boolean;
  notes?: string;
}): Promise<boolean> {
  const setClauses: string[] = [];
  const params: any[] = [];

  if (updates.name !== undefined) {
    setClauses.push("name = ?");
    params.push(updates.name);
  }
  if (updates.outlet !== undefined) {
    setClauses.push("outlet = ?");
    params.push(updates.outlet);
  }
  if (updates.category !== undefined) {
    setClauses.push("category = ?");
    params.push(updates.category);
  }
  if (updates.country !== undefined) {
    setClauses.push("country = ?");
    params.push(updates.country);
  }
  if (updates.isVip !== undefined) {
    setClauses.push("is_vip = ?");
    params.push(updates.isVip ? 1 : 0);
  }
  if (updates.isBlacklisted !== undefined) {
    setClauses.push("is_blacklisted = ?");
    params.push(updates.isBlacklisted ? 1 : 0);
  }
  if (updates.notes !== undefined) {
    setClauses.push("notes = ?");
    params.push(updates.notes);
  }

  if (setClauses.length === 0) return true;
  params.push(id);

  const result = await executeQuery(
    `UPDATE custom_journalists SET ${setClauses.join(", ")} WHERE id = ?`,
    params
  );
  return result.success;
}

// ============================================
// EMAIL TEMPLATES FUNCTIONS
// ============================================

export async function saveEmailTemplate(template: {
  name: string;
  subject?: string;
  content: string;
  isDefault?: boolean;
}): Promise<number | null> {
  const result = await executeQuery(
    `INSERT INTO email_templates (name, subject, content, is_default) VALUES (?, ?, ?, ?)`,
    [template.name, template.subject || null, template.content, template.isDefault ? 1 : 0]
  );
  
  if (result.success && result.meta) {
    return result.meta.last_row_id;
  }
  return null;
}

export async function getAllEmailTemplates(): Promise<any[]> {
  const result = await executeQuery("SELECT * FROM email_templates ORDER BY created_at DESC");
  return (result.results || []).map(t => ({
    ...t,
    isDefault: t.is_default === 1,
  }));
}

export async function deleteEmailTemplate(id: number): Promise<boolean> {
  const result = await executeQuery("DELETE FROM email_templates WHERE id = ?", [id]);
  return result.success;
}

// ============================================
// FOLLOW-UP SEQUENCES FUNCTIONS
// ============================================

export async function saveFollowupSequence(sequence: {
  journalistEmail: string;
  originalSubject: string;
  originalContent?: string;
  step?: number;
  nextSendAt?: string;
  status?: string;
}): Promise<number | null> {
  const result = await executeQuery(
    `INSERT INTO followup_sequences (journalist_email, original_subject, original_content, step, next_send_at, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      sequence.journalistEmail,
      sequence.originalSubject,
      sequence.originalContent || null,
      sequence.step || 1,
      sequence.nextSendAt || null,
      sequence.status || "pending"
    ]
  );
  
  if (result.success && result.meta) {
    return result.meta.last_row_id;
  }
  return null;
}

export async function getAllFollowupSequences(): Promise<any[]> {
  const result = await executeQuery("SELECT * FROM followup_sequences ORDER BY created_at DESC");
  return result.results || [];
}

export async function getPendingFollowups(): Promise<any[]> {
  const result = await executeQuery(
    `SELECT * FROM followup_sequences 
     WHERE status = 'pending' AND next_send_at <= datetime('now')
     ORDER BY next_send_at ASC`
  );
  return result.results || [];
}

export async function updateFollowupSequence(id: number, updates: {
  step?: number;
  nextSendAt?: string;
  status?: string;
}): Promise<boolean> {
  const setClauses: string[] = [];
  const params: any[] = [];

  if (updates.step !== undefined) {
    setClauses.push("step = ?");
    params.push(updates.step);
  }
  if (updates.nextSendAt !== undefined) {
    setClauses.push("next_send_at = ?");
    params.push(updates.nextSendAt);
  }
  if (updates.status !== undefined) {
    setClauses.push("status = ?");
    params.push(updates.status);
  }

  if (setClauses.length === 0) return true;
  params.push(id);

  const result = await executeQuery(
    `UPDATE followup_sequences SET ${setClauses.join(", ")} WHERE id = ?`,
    params
  );
  return result.success;
}

export async function deleteFollowupSequence(id: number): Promise<boolean> {
  const result = await executeQuery("DELETE FROM followup_sequences WHERE id = ?", [id]);
  return result.success;
}

export async function cancelFollowupByEmail(email: string): Promise<boolean> {
  const result = await executeQuery(
    "UPDATE followup_sequences SET status = 'cancelled' WHERE journalist_email = ? AND status = 'pending'",
    [email]
  );
  return result.success;
}

// ============================================
// SUCCESSFUL ARTICLES CACHE
// ============================================

export async function cacheSuccessfulArticle(article: {
  title: string;
  content: string;
  subject?: string;
  category?: string;
  openRate: number;
  clickRate: number;
  keywords?: string[];
}): Promise<boolean> {
  const result = await executeQuery(
    `INSERT INTO successful_articles (title, content, subject, category, open_rate, click_rate, keywords)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      article.title,
      article.content,
      article.subject || null,
      article.category || null,
      article.openRate,
      article.clickRate,
      JSON.stringify(article.keywords || [])
    ]
  );
  return result.success;
}

export async function getSuccessfulArticlesFromCache(category?: string, limit: number = 10): Promise<any[]> {
  let sql = "SELECT * FROM successful_articles";
  const params: any[] = [];
  
  if (category) {
    sql += " WHERE category = ?";
    params.push(category);
  }
  
  sql += " ORDER BY open_rate DESC, click_rate DESC LIMIT ?";
  params.push(limit);

  const result = await executeQuery(sql, params);
  return result.results || [];
}

// ============================================
// SEND PATTERNS (LEARNING)
// ============================================

export async function saveSendPattern(pattern: {
  country?: string;
  category?: string;
  bestHour: number;
  bestDay: number;
  avgOpenRate: number;
  avgClickRate: number;
  sampleSize: number;
}): Promise<boolean> {
  const result = await executeQuery(
    `INSERT INTO send_patterns (country, category, best_hour, best_day, avg_open_rate, avg_click_rate, sample_size)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT DO UPDATE SET
       best_hour = excluded.best_hour,
       best_day = excluded.best_day,
       avg_open_rate = excluded.avg_open_rate,
       avg_click_rate = excluded.avg_click_rate,
       sample_size = excluded.sample_size,
       updated_at = CURRENT_TIMESTAMP`,
    [
      pattern.country || null,
      pattern.category || null,
      pattern.bestHour,
      pattern.bestDay,
      pattern.avgOpenRate,
      pattern.avgClickRate,
      pattern.sampleSize
    ]
  );
  return result.success;
}

export async function getBestSendTime(country?: string, category?: string): Promise<{
  hour: number;
  day: number;
} | null> {
  let sql = "SELECT best_hour, best_day FROM send_patterns WHERE 1=1";
  const params: any[] = [];
  
  if (country) {
    sql += " AND country = ?";
    params.push(country);
  }
  if (category) {
    sql += " AND category = ?";
    params.push(category);
  }
  
  sql += " ORDER BY avg_open_rate DESC LIMIT 1";

  const result = await executeQuery(sql, params);
  const pattern = result.results?.[0];
  
  if (pattern) {
    return { hour: pattern.best_hour, day: pattern.best_day };
  }
  return null;
}

export async function getAllSendPatterns(): Promise<any[]> {
  const result = await executeQuery("SELECT * FROM send_patterns ORDER BY avg_open_rate DESC");
  return result.results || [];
}

// ============================================
// APP SETTINGS FUNCTIONS
// ============================================

export async function getSetting(key: string): Promise<string | null> {
  const result = await executeQuery("SELECT value FROM app_settings WHERE key = ?", [key]);
  return result.results?.[0]?.value || null;
}

export async function setSetting(key: string, value: string): Promise<boolean> {
  const result = await executeQuery(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
    [key, value]
  );
  return result.success;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const result = await executeQuery("SELECT key, value FROM app_settings");
  const settings: Record<string, string> = {};
  for (const row of result.results || []) {
    settings[row.key] = row.value;
  }
  return settings;
}

// Export per uso globale
export const d1 = {
  executeQuery,
  initializeDatabase,
  // Knowledge Base
  saveDocument,
  getAllDocuments,
  getDocumentById,
  updateDocument,
  deleteDocument,
  // Fine-tuning Q&A
  saveQA,
  getAllQA,
  deleteQA,
  // Training Examples
  saveTrainingExample,
  getAllTrainingExamples,
  deleteTrainingExample,
  // Press Releases
  savePressRelease,
  getAllPressReleases,
  getPressReleaseById,
  // Email Tracking
  trackEmailEvent,
  getEmailStats,
  getEmailTrackingHistory,
  // Autopilot
  getAutopilotState,
  updateAutopilotState,
  // Rankings
  updateJournalistRanking,
  getTopJournalists,
  getJournalistRanking,
  // Custom Journalists
  saveCustomJournalist,
  getAllCustomJournalists,
  deleteCustomJournalist,
  updateCustomJournalist,
  // Templates
  saveEmailTemplate,
  getAllEmailTemplates,
  deleteEmailTemplate,
  // Follow-ups
  saveFollowupSequence,
  getAllFollowupSequences,
  getPendingFollowups,
  updateFollowupSequence,
  deleteFollowupSequence,
  cancelFollowupByEmail,
  // Cache
  cacheSuccessfulArticle,
  getSuccessfulArticlesFromCache,
  // Learning
  saveSendPattern,
  getBestSendTime,
  getAllSendPatterns,
  // Settings
  getSetting,
  setSetting,
  getAllSettings,
};
