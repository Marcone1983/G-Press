/**
 * G-Press AUTOPILOT SYSTEM
 * 
 * Sistema completamente autonomo che:
 * 1. Ogni ora controlla i trend
 * 2. Se trova opportunità per GROWVERSE, genera articolo
 * 3. USA SOLO i documenti della Knowledge Base (NIENTE INVENZIONI)
 * 4. Manda notifica per approvazione
 * 5. Dopo approvazione, invia ai giornalisti migliori (ranking)
 * 6. Impara dai risultati
 */

import { eq, desc, and, gte, sql, asc } from "drizzle-orm";
import { getDb } from "./db.js";
import { 
  pressReleases, 
  journalists, 
  distributions,
  emailEvents,
  autopilotCampaigns,
  sendPatterns
} from "../drizzle/schema.js";
import { detectTrends, shouldGenerateArticle, type TrendResult } from "./trend-detection.js";
import { runMultiAgentPipeline } from "./ai-agents.js";
import { notifyOwner } from "./_core/notification.js";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// ============================================
// INTERFACES
// ============================================

interface KnowledgeDocument {
  id: string;
  name: string;
  content: string;
  category: string;
}

interface AutopilotArticle {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  trend: TrendResult;
  status: "pending_approval" | "approved" | "rejected" | "sent";
  createdAt: string;
  approvedAt?: string;
  sentAt?: string;
}

interface JournalistRanking {
  id: number;
  email: string;
  name: string;
  score: number;
  openRate: number;
  clickRate: number;
  lastEngagement: string | null;
  tier: "A" | "B" | "C";
}

// ============================================
// KNOWLEDGE BASE - LEGGE SOLO I DOCUMENTI CARICATI
// ============================================

import { knowledgeDocuments, autopilotState as autopilotStateTable } from "../drizzle/schema.js";

/**
 * Recupera tutti i documenti dalla Knowledge Base dal DATABASE
 * QUESTI SONO GLI UNICI DATI CHE L'AI PUÒ USARE
 */
async function getKnowledgeBaseDocuments(): Promise<KnowledgeDocument[]> {
  const db = await getDb();
  if (!db) {
    console.error("[Autopilot] Database not available");
    return [];
  }
  
  try {
    console.log("[Autopilot] Fetching Knowledge Base documents from database...");
    
    const docs = await db.select().from(knowledgeDocuments);
    
    console.log(`[Autopilot] Found ${docs.length} documents in Knowledge Base`);
    
    return docs.map(doc => ({
      id: String(doc.id),
      name: doc.name,
      content: doc.content,
      category: doc.category,
    }));
  } catch (error) {
    console.error("[Autopilot] Error fetching Knowledge Base:", error);
    return [];
  }
}

/**
 * Genera articolo su GROWVERSE usando SOLO i documenti della Knowledge Base
 * collegandosi al trend rilevato
 */
async function generateGrowverseArticle(
  trend: TrendResult,
  documents: KnowledgeDocument[]
): Promise<{ title: string; subtitle: string; content: string } | null> {
  
  if (documents.length === 0) {
    console.error("[Autopilot] ERRORE: Nessun documento nella Knowledge Base!");
    console.error("[Autopilot] L'AI non può generare articoli senza documenti verificati.");
    return null;
  }

  // Prepara il contesto con i documenti
  const documentsContext = documents.map(doc => 
    `=== DOCUMENTO: ${doc.name} (${doc.category}) ===\n${doc.content}\n`
  ).join("\n\n");

  // Prompt specifico per GROWVERSE
  const systemPrompt = `Sei un giornalista esperto che scrive articoli su GROWVERSE.

## REGOLE ASSOLUTE - LEGGI ATTENTAMENTE

1. **USA SOLO I DOCUMENTI FORNITI**
   - Puoi scrivere SOLO informazioni presenti nei documenti
   - NON inventare NULLA
   - NON aggiungere dettagli che non sono nei documenti
   - Se un'informazione non è nei documenti, NON scriverla

2. **COLLEGA AL TREND**
   - Il trend attuale è: "${trend.title}"
   - Usa questo trend come GANCIO per parlare di GROWVERSE
   - L'articolo deve sembrare attuale e rilevante

3. **STRUTTURA**
   - Titolo: Max 70 caratteri, deve catturare attenzione
   - Sottotitolo: Espande il titolo
   - Lead: Chi, cosa, quando, dove, perché in 50 parole
   - Corpo: 3-4 paragrafi con fatti dai documenti
   - Chiusura: Prospettiva futura

4. **STILE**
   - Professionale, non promozionale
   - Giornalistico, non pubblicitario
   - Fatti, non opinioni
   - Neutro ma coinvolgente

## OUTPUT
Scrivi l'articolo in questo formato:
# [TITOLO]
## [SOTTOTITOLO]

[CONTENUTO]`;

  const userPrompt = `TREND ATTUALE DA SFRUTTARE:
Titolo: ${trend.title}
Descrizione: ${trend.description}
Keywords: ${trend.matchedKeywords.join(", ")}
Angolo suggerito: ${trend.suggestedAngle}

DOCUMENTI GROWVERSE (USA SOLO QUESTI):
${documentsContext}

Scrivi un articolo su GROWVERSE che si collega a questo trend.
RICORDA: Usa SOLO le informazioni dai documenti sopra!`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const output = response.choices[0]?.message?.content || "";
    
    // Parse output
    const lines = output.split('\n');
    let title = "";
    let subtitle = "";
    let contentLines: string[] = [];
    let foundTitle = false;
    let foundSubtitle = false;

    for (const line of lines) {
      if (line.startsWith('# ') && !foundTitle) {
        title = line.replace('# ', '').trim();
        foundTitle = true;
      } else if (line.startsWith('## ') && foundTitle && !foundSubtitle) {
        subtitle = line.replace('## ', '').trim();
        foundSubtitle = true;
      } else if (foundSubtitle) {
        contentLines.push(line);
      }
    }

    return {
      title: title || "Articolo Growverse",
      subtitle: subtitle || "",
      content: contentLines.join('\n').trim()
    };

  } catch (error) {
    console.error("[Autopilot] Error generating article:", error);
    return null;
  }
}

// ============================================
// RANKING GIORNALISTI
// ============================================

/**
 * Calcola il ranking dei giornalisti basato su engagement
 */
export async function calculateJournalistRankings(): Promise<JournalistRanking[]> {
  const db = await getDb();
  if (!db) return [];

  // Query per ottenere statistiche di engagement per ogni giornalista
  const journalistStats = await db
    .select({
      id: journalists.id,
      email: journalists.email,
      name: journalists.name,
      // Conta email inviate
      totalSent: sql<number>`(
        SELECT COUNT(*) FROM ${distributions} 
        WHERE ${distributions.journalistId} = ${journalists.id}
      )`,
      // Conta aperture
      totalOpened: sql<number>`(
        SELECT COUNT(*) FROM ${distributions} 
        WHERE ${distributions.journalistId} = ${journalists.id} 
        AND ${distributions.status} IN ('opened', 'clicked')
      )`,
      // Conta click
      totalClicked: sql<number>`(
        SELECT COUNT(*) FROM ${distributions} 
        WHERE ${distributions.journalistId} = ${journalists.id} 
        AND ${distributions.status} = 'clicked'
      )`,
      // Ultimo engagement
      lastEngagement: sql<string>`(
        SELECT MAX(${distributions.sentAt}) FROM ${distributions} 
        WHERE ${distributions.journalistId} = ${journalists.id} 
        AND ${distributions.status} IN ('opened', 'clicked')
      )`,
    })
    .from(journalists)
    .where(eq(journalists.isActive, true));

  // Calcola score e tier per ogni giornalista
  const rankings: JournalistRanking[] = journalistStats.map(j => {
    const totalSent = Number(j.totalSent) || 0;
    const totalOpened = Number(j.totalOpened) || 0;
    const totalClicked = Number(j.totalClicked) || 0;

    const openRate = totalSent > 0 ? (totalOpened / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (totalClicked / totalSent) * 100 : 0;

    // Score: weighted combination of open rate and click rate
    // Click vale di più perché indica interesse reale
    const score = (openRate * 0.3) + (clickRate * 0.7 * 10); // Click rate moltiplicato per dare più peso

    // Tier basato su score
    let tier: "A" | "B" | "C";
    if (score >= 50 || clickRate >= 5) {
      tier = "A"; // Top performers
    } else if (score >= 20 || openRate >= 30) {
      tier = "B"; // Good performers
    } else {
      tier = "C"; // Need improvement
    }

    return {
      id: j.id,
      email: j.email,
      name: j.name || "",
      score: Math.round(score * 100) / 100,
      openRate: Math.round(openRate * 100) / 100,
      clickRate: Math.round(clickRate * 100) / 100,
      lastEngagement: j.lastEngagement,
      tier
    };
  });

  // Ordina per score decrescente
  rankings.sort((a, b) => b.score - a.score);

  return rankings;
}

/**
 * Ottieni i giornalisti migliori per una campagna
 * Priorità: Tier A prima, poi B, poi C
 */
export async function getTopJournalistsForCampaign(
  limit: number = 1286, // Default: batch giornaliero
  category?: string,
  country?: string
): Promise<JournalistRanking[]> {
  const allRankings = await calculateJournalistRankings();
  
  // Filtra per categoria/paese se specificato
  let filtered = allRankings;
  
  // TODO: Implementare filtri per categoria e paese
  // Per ora ritorna tutti ordinati per score
  
  // Prendi i top N
  return filtered.slice(0, limit);
}

// ============================================
// AUTOPILOT MAIN LOOP
// ============================================

interface AutopilotStatus {
  active: boolean;
  lastCheck: string | null;
  lastArticleGenerated: string | null;
  pendingApproval: AutopilotArticle | null;
  stats: {
    trendsChecked: number;
    articlesGenerated: number;
    articlesSent: number;
    totalEmailsSent: number;
  };
}

// In-memory cache, synced with database
let autopilotStateCache: AutopilotStatus = {
  active: false,
  lastCheck: null,
  lastArticleGenerated: null,
  pendingApproval: null,
  stats: {
    trendsChecked: 0,
    articlesGenerated: 0,
    articlesSent: 0,
    totalEmailsSent: 0,
  }
};

// Default user ID for autopilot (owner)
const AUTOPILOT_USER_ID = 1;

/**
 * Load autopilot state from database
 */
async function loadAutopilotState(): Promise<AutopilotStatus> {
  const db = await getDb();
  if (!db) return autopilotStateCache;
  
  try {
    const result = await db.select().from(autopilotStateTable).where(eq(autopilotStateTable.userId, AUTOPILOT_USER_ID)).limit(1);
    
    if (result.length > 0) {
      const state = result[0];
      autopilotStateCache = {
        active: state.active,
        lastCheck: state.lastCheck?.toISOString() || null,
        lastArticleGenerated: state.lastArticleGenerated?.toISOString() || null,
        pendingApproval: state.pendingArticleData ? JSON.parse(state.pendingArticleData) : null,
        stats: {
          trendsChecked: state.trendsChecked,
          articlesGenerated: state.articlesGenerated,
          articlesSent: state.articlesSent,
          totalEmailsSent: state.totalEmailsSent,
        }
      };
    }
  } catch (error) {
    console.error("[Autopilot] Error loading state:", error);
  }
  
  return autopilotStateCache;
}

/**
 * Save autopilot state to database
 */
async function saveAutopilotState(): Promise<void> {
  const db = await getDb();
  if (!db) return;
  
  try {
    const values = {
      userId: AUTOPILOT_USER_ID,
      active: autopilotStateCache.active,
      lastCheck: autopilotStateCache.lastCheck ? new Date(autopilotStateCache.lastCheck) : null,
      lastArticleGenerated: autopilotStateCache.lastArticleGenerated ? new Date(autopilotStateCache.lastArticleGenerated) : null,
      trendsChecked: autopilotStateCache.stats.trendsChecked,
      articlesGenerated: autopilotStateCache.stats.articlesGenerated,
      articlesSent: autopilotStateCache.stats.articlesSent,
      totalEmailsSent: autopilotStateCache.stats.totalEmailsSent,
      pendingArticleId: autopilotStateCache.pendingApproval?.id || null,
      pendingArticleData: autopilotStateCache.pendingApproval ? JSON.stringify(autopilotStateCache.pendingApproval) : null,
    };
    
    await db.insert(autopilotStateTable).values(values).onDuplicateKeyUpdate({
      set: values
    });
  } catch (error) {
    console.error("[Autopilot] Error saving state:", error);
  }
}

/**
 * MAIN: Ciclo autopilota - chiamato ogni ora
 */
export async function runAutopilotCycle(): Promise<{
  action: string;
  details: any;
}> {
  console.log("[Autopilot] Starting cycle...");
  autopilotStateCache.lastCheck = new Date().toISOString();
  autopilotStateCache.stats.trendsChecked++;

  // 1. Rileva trend
  const trendAnalysis = await detectTrends();
  console.log(`[Autopilot] Found ${trendAnalysis.totalFound} relevant trends`);

  // 2. Controlla se generare articolo
  const { should, trend, reason } = await shouldGenerateArticle(trendAnalysis);
  
  if (!should || !trend) {
    console.log(`[Autopilot] No article needed: ${reason}`);
    return {
      action: "no_action",
      details: { reason, trendsFound: trendAnalysis.totalFound }
    };
  }

  console.log(`[Autopilot] Generating article for trend: ${trend.title}`);

  // 3. Recupera documenti Knowledge Base
  const documents = await getKnowledgeBaseDocuments();
  
  if (documents.length === 0) {
    console.error("[Autopilot] BLOCKED: No documents in Knowledge Base!");
    
    // Notifica owner che deve caricare documenti
    await notifyOwner({
      title: "⚠️ Autopilot Bloccato",
      content: "L'autopilot ha trovato un trend interessante ma non può generare articoli perché la Knowledge Base è vuota. Carica i documenti su Growverse per attivare la generazione automatica."
    });
    
    return {
      action: "blocked_no_documents",
      details: { trend: trend.title, reason: "Knowledge Base vuota" }
    };
  }

  // 4. Genera articolo usando SOLO i documenti
  const article = await generateGrowverseArticle(trend, documents);
  
  if (!article) {
    return {
      action: "generation_failed",
      details: { trend: trend.title }
    };
  }

  autopilotStateCache.stats.articlesGenerated++;
  autopilotStateCache.lastArticleGenerated = new Date().toISOString();

  // 5. Salva articolo in attesa di approvazione
  const pendingArticle: AutopilotArticle = {
    id: `auto_${Date.now()}`,
    title: article.title,
    subtitle: article.subtitle,
    content: article.content,
    trend: trend,
    status: "pending_approval",
    createdAt: new Date().toISOString(),
  };

  autopilotStateCache.pendingApproval = pendingArticle;

  // 6. Notifica owner per approvazione
  await notifyOwner({
    title: "📝 Nuovo Articolo da Approvare",
    content: `L'autopilot ha generato un nuovo articolo basato sul trend "${trend.title}".\n\nTitolo: ${article.title}\n\nApri l'app per approvare o modificare.`
  });

  console.log(`[Autopilot] Article generated and pending approval: ${article.title}`);

  return {
    action: "article_pending_approval",
    details: {
      articleId: pendingArticle.id,
      title: article.title,
      trend: trend.title,
    }
  };
}

/**
 * Approva un articolo generato dall'autopilot
 */
export async function approveAutopilotArticle(articleId: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!autopilotStateCache.pendingApproval || autopilotStateCache.pendingApproval.id !== articleId) {
    return { success: false, message: "Articolo non trovato" };
  }

  const article = autopilotStateCache.pendingApproval;
  article.status = "approved";
  article.approvedAt = new Date().toISOString();

  // Salva come press release nel database
  const db = await getDb();
  if (db) {
    await db.insert(pressReleases).values({
      userId: 1, // Default user for autopilot
      title: article.title,
      subtitle: article.subtitle,
      content: article.content,
      status: "draft",
      createdAt: new Date(),
    });
  }

  // Avvia invio ai giornalisti top-ranked
  // TODO: Implementare invio effettivo
  
  autopilotStateCache.pendingApproval = null;
  autopilotStateCache.stats.articlesSent++;

  return { 
    success: true, 
    message: `Articolo "${article.title}" approvato e in coda per l'invio` 
  };
}

/**
 * Rifiuta un articolo generato dall'autopilot
 */
export async function rejectAutopilotArticle(articleId: string, reason?: string): Promise<{
  success: boolean;
  message: string;
}> {
  if (!autopilotStateCache.pendingApproval || autopilotStateCache.pendingApproval.id !== articleId) {
    return { success: false, message: "Articolo non trovato" };
  }

  autopilotStateCache.pendingApproval.status = "rejected";
  autopilotStateCache.pendingApproval = null;

  return { 
    success: true, 
    message: "Articolo rifiutato" 
  };
}

/**
 * Ottieni lo stato corrente dell'autopilot
 */
export async function getAutopilotStatus(): Promise<AutopilotStatus> {
  await loadAutopilotState(); // Sync from database
  return { ...autopilotStateCache };
}

/**
 * Attiva/disattiva l'autopilot
 */
export async function setAutopilotActive(active: boolean): Promise<void> {
  autopilotStateCache.active = active;
  await saveAutopilotState(); // Persist to database
  console.log(`[Autopilot] ${active ? "Activated" : "Deactivated"}`);
}

// ============================================
// LEARNING SYSTEM
// ============================================

/**
 * Analizza i risultati delle campagne per migliorare
 */
export async function analyzeAndLearn(): Promise<{
  insights: string[];
  recommendations: string[];
}> {
  const db = await getDb();
  if (!db) return { insights: [], recommendations: [] };

  const insights: string[] = [];
  const recommendations: string[] = [];

  // Analizza open rate per orario
  const hourlyStats = await db
    .select({
      hour: sql<number>`HOUR(${distributions.sentAt})`,
      total: sql<number>`COUNT(*)`,
      opened: sql<number>`SUM(CASE WHEN ${distributions.status} IN ('opened', 'clicked') THEN 1 ELSE 0 END)`,
    })
    .from(distributions)
    .where(gte(distributions.sentAt, sql`DATE_SUB(NOW(), INTERVAL 30 DAY)`))
    .groupBy(sql`HOUR(${distributions.sentAt})`);

  // Trova orario migliore
  let bestHour = 9;
  let bestRate = 0;
  for (const stat of hourlyStats) {
    const rate = Number(stat.total) > 0 ? Number(stat.opened) / Number(stat.total) : 0;
    if (rate > bestRate) {
      bestRate = rate;
      bestHour = Number(stat.hour);
    }
  }

  insights.push(`Orario migliore per invio: ${bestHour}:00 (${Math.round(bestRate * 100)}% open rate)`);

  // Analizza performance per categoria giornalista
  // TODO: Implementare analisi per categoria

  // Genera raccomandazioni
  if (bestRate < 0.2) {
    recommendations.push("Open rate basso - considera di migliorare i subject line");
  }
  if (bestRate > 0.4) {
    recommendations.push("Ottimo open rate! Mantieni questo stile di comunicazione");
  }

  return { insights, recommendations };
}
