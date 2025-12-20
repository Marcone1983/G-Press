import { eq, desc, and, gte } from "drizzle-orm";
import { getDb } from "./db.js";

/**
 * TREND DETECTION SERVICE
 * 
 * Monitora news/riviste e trova trend dove GROWVERSE può inserirsi.
 * Keywords rilevanti: metaverso, gaming, crypto, NFT, Web3, blockchain, virtual world, etc.
 */

// Keywords che indicano opportunità per Growverse
const GROWVERSE_KEYWORDS = [
  // Metaverso
  "metaverse", "metaverso", "virtual world", "mondo virtuale", "virtual reality", "VR",
  // Gaming
  "gaming", "play to earn", "P2E", "game", "videogame", "esports",
  // Crypto/Blockchain
  "crypto", "cryptocurrency", "blockchain", "token", "NFT", "web3", "Web 3.0",
  // Tech
  "digital asset", "virtual land", "avatar", "immersive", "3D world",
  // Business
  "startup", "tech startup", "innovation", "digital transformation",
];

// Categorie di news da monitorare
const NEWS_CATEGORIES = [
  "technology", "crypto", "gaming", "business", "startup", "blockchain"
];

export interface TrendResult {
  title: string;
  description: string;
  source: string;
  url: string;
  publishedAt: string;
  relevanceScore: number;
  matchedKeywords: string[];
  suggestedAngle: string;
}

interface TrendAnalysis {
  trends: TrendResult[];
  topTrend: TrendResult | null;
  analysisTimestamp: string;
  totalFound: number;
  highRelevanceCount: number;
}

/**
 * Calcola il punteggio di rilevanza per un articolo
 */
function calculateRelevanceScore(title: string, description: string): { score: number; keywords: string[] } {
  const text = `${title} ${description}`.toLowerCase();
  const matchedKeywords: string[] = [];
  let score = 0;

  for (const keyword of GROWVERSE_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) {
      matchedKeywords.push(keyword);
      // Keywords più specifiche valgono di più
      if (["metaverse", "metaverso", "play to earn", "P2E", "virtual world"].includes(keyword.toLowerCase())) {
        score += 3;
      } else if (["NFT", "web3", "blockchain", "gaming"].includes(keyword.toLowerCase())) {
        score += 2;
      } else {
        score += 1;
      }
    }
  }

  return { score, keywords: matchedKeywords };
}

/**
 * Genera un suggerimento per l'angolo dell'articolo su Growverse
 */
function generateSuggestedAngle(matchedKeywords: string[], title: string): string {
  if (matchedKeywords.some(k => ["metaverse", "metaverso", "virtual world"].includes(k.toLowerCase()))) {
    return "Collegare Growverse come esempio innovativo nel settore metaverso, evidenziando le caratteristiche uniche";
  }
  if (matchedKeywords.some(k => ["play to earn", "P2E", "gaming"].includes(k.toLowerCase()))) {
    return "Posizionare Growverse nel contesto del gaming Web3, enfatizzando l'esperienza di gioco e le opportunità";
  }
  if (matchedKeywords.some(k => ["NFT", "crypto", "blockchain"].includes(k.toLowerCase()))) {
    return "Presentare Growverse come caso d'uso concreto della tecnologia blockchain nel gaming";
  }
  if (matchedKeywords.some(k => ["startup", "innovation"].includes(k.toLowerCase()))) {
    return "Raccontare Growverse come startup innovativa che sta ridefinendo il settore";
  }
  return "Collegare Growverse al trend attuale evidenziando i punti di forza del progetto";
}

/**
 * Fetch news da NewsAPI o altre fonti
 * Per ora usa un mock, in produzione integra con API reali
 */
async function fetchNewsFromAPI(category: string): Promise<any[]> {
  // In produzione, usa NewsAPI, Google News API, o scraping
  // Per ora ritorna mock data per test
  
  const NEWS_API_KEY = process.env.NEWS_API_KEY;
  
  if (NEWS_API_KEY) {
    try {
      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?category=${category}&language=en&apiKey=${NEWS_API_KEY}`
      );
      const data = await response.json();
      return data.articles || [];
    } catch (error) {
      console.error("[TrendDetection] NewsAPI error:", error);
    }
  }

  // Fallback: Google News RSS (no API key needed)
  try {
    const keywords = GROWVERSE_KEYWORDS.slice(0, 5).join(" OR ");
    const response = await fetch(
      `https://news.google.com/rss/search?q=${encodeURIComponent(keywords)}&hl=en-US&gl=US&ceid=US:en`
    );
    const text = await response.text();
    // Parse RSS XML
    const articles = parseRSSFeed(text);
    return articles;
  } catch (error) {
    console.error("[TrendDetection] Google News RSS error:", error);
  }

  return [];
}

/**
 * Parse RSS feed XML to articles
 */
function parseRSSFeed(xml: string): any[] {
  const articles: any[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const titleRegex = /<title>([\s\S]*?)<\/title>/;
  const linkRegex = /<link>([\s\S]*?)<\/link>/;
  const descRegex = /<description>([\s\S]*?)<\/description>/;
  const pubDateRegex = /<pubDate>([\s\S]*?)<\/pubDate>/;

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const item = match[1];
    const title = titleRegex.exec(item)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
    const link = linkRegex.exec(item)?.[1] || "";
    const description = descRegex.exec(item)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/g, "$1") || "";
    const pubDate = pubDateRegex.exec(item)?.[1] || "";

    articles.push({
      title: title.trim(),
      url: link.trim(),
      description: description.trim().replace(/<[^>]*>/g, ""), // Remove HTML tags
      publishedAt: pubDate,
      source: { name: "Google News" }
    });
  }

  return articles;
}

/**
 * MAIN: Rileva trend rilevanti per Growverse
 */
export async function detectTrends(): Promise<TrendAnalysis> {
  console.log("[TrendDetection] Starting trend analysis...");
  
  const allArticles: any[] = [];
  
  // Fetch da multiple categorie
  for (const category of NEWS_CATEGORIES) {
    const articles = await fetchNewsFromAPI(category);
    allArticles.push(...articles);
  }

  console.log(`[TrendDetection] Found ${allArticles.length} total articles`);

  // Analizza e filtra per rilevanza
  const trends: TrendResult[] = [];
  
  for (const article of allArticles) {
    const { score, keywords } = calculateRelevanceScore(
      article.title || "",
      article.description || ""
    );

    if (score > 0) {
      trends.push({
        title: article.title || "",
        description: article.description || "",
        source: article.source?.name || "Unknown",
        url: article.url || "",
        publishedAt: article.publishedAt || new Date().toISOString(),
        relevanceScore: score,
        matchedKeywords: keywords,
        suggestedAngle: generateSuggestedAngle(keywords, article.title || ""),
      });
    }
  }

  // Ordina per rilevanza
  trends.sort((a, b) => b.relevanceScore - a.relevanceScore);

  // Prendi i top 10
  const topTrends = trends.slice(0, 10);
  const highRelevance = trends.filter(t => t.relevanceScore >= 3);

  const analysis: TrendAnalysis = {
    trends: topTrends,
    topTrend: topTrends[0] || null,
    analysisTimestamp: new Date().toISOString(),
    totalFound: trends.length,
    highRelevanceCount: highRelevance.length,
  };

  console.log(`[TrendDetection] Analysis complete: ${trends.length} relevant, ${highRelevance.length} high relevance`);

  return analysis;
}

/**
 * Salva l'analisi dei trend nel database per storico
 */
export async function saveTrendAnalysis(analysis: TrendAnalysis): Promise<void> {
  // TODO: Creare tabella trend_analyses nel database
  // Per ora logga
  console.log("[TrendDetection] Trend analysis saved:", {
    timestamp: analysis.analysisTimestamp,
    totalFound: analysis.totalFound,
    highRelevance: analysis.highRelevanceCount,
    topTrend: analysis.topTrend?.title,
  });
}

/**
 * Controlla se c'è un trend abbastanza rilevante per generare un articolo
 */
export async function shouldGenerateArticle(analysis: TrendAnalysis): Promise<{
  should: boolean;
  trend: TrendResult | null;
  reason: string;
}> {
  // Genera articolo se:
  // 1. C'è almeno un trend con score >= 4 (molto rilevante)
  // 2. Oppure ci sono 3+ trend con score >= 2 (trend generale nel settore)
  
  if (analysis.topTrend && analysis.topTrend.relevanceScore >= 4) {
    return {
      should: true,
      trend: analysis.topTrend,
      reason: `Trend molto rilevante trovato: "${analysis.topTrend.title}" (score: ${analysis.topTrend.relevanceScore})`,
    };
  }

  if (analysis.highRelevanceCount >= 3) {
    return {
      should: true,
      trend: analysis.topTrend,
      reason: `${analysis.highRelevanceCount} trend rilevanti nel settore - momento opportuno per comunicato`,
    };
  }

  return {
    should: false,
    trend: null,
    reason: `Nessun trend sufficientemente rilevante (top score: ${analysis.topTrend?.relevanceScore || 0})`,
  };
}
