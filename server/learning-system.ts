/**
 * G-Press LEARNING SYSTEM
 * 
 * Sistema che impara dai risultati delle campagne per migliorare:
 * - Orari di invio ottimali per ogni paese
 * - Subject line più efficaci
 * - Stili di contenuto che funzionano meglio
 * - Giornalisti più reattivi
 */

import { eq, desc, and, gte, sql, avg, count } from "drizzle-orm";
import { getDb } from "./db.js";
import { 
  distributions, 
  journalists, 
  pressReleases,
  emailEvents,
  sendPatterns
} from "../drizzle/schema.js";

// ============================================
// INTERFACES
// ============================================

interface LearningInsight {
  type: "timing" | "subject" | "content" | "journalist";
  insight: string;
  confidence: number; // 0-100
  actionable: boolean;
  recommendation: string;
}

interface OptimalTiming {
  country: string;
  bestHour: number;
  bestDay: number; // 0-6, Sunday = 0
  openRate: number;
  sampleSize: number;
}

interface SubjectAnalysis {
  pattern: string;
  avgOpenRate: number;
  avgClickRate: number;
  sampleSize: number;
}

interface LearningReport {
  generatedAt: string;
  dataRange: { from: string; to: string };
  insights: LearningInsight[];
  optimalTimings: OptimalTiming[];
  subjectPatterns: SubjectAnalysis[];
  overallScore: number; // 0-100 improvement score
  recommendations: string[];
}

// ============================================
// TIMING LEARNING
// ============================================

/**
 * Analizza i dati per trovare gli orari ottimali per ogni paese
 */
export async function learnOptimalTimings(): Promise<OptimalTiming[]> {
  const db = await getDb();
  if (!db) return [];

  // Query per ottenere open rate per ora e paese
  const timingData = await db
    .select({
      country: journalists.country,
      hour: sql<number>`HOUR(${distributions.sentAt})`,
      dayOfWeek: sql<number>`DAYOFWEEK(${distributions.sentAt})`,
      total: count(),
      opened: sql<number>`SUM(CASE WHEN ${distributions.status} IN ('opened', 'clicked') THEN 1 ELSE 0 END)`,
    })
    .from(distributions)
    .innerJoin(journalists, eq(distributions.journalistId, journalists.id))
    .where(gte(distributions.sentAt, sql`DATE_SUB(NOW(), INTERVAL 30 DAY)`))
    .groupBy(journalists.country, sql`HOUR(${distributions.sentAt})`, sql`DAYOFWEEK(${distributions.sentAt})`);

  // Raggruppa per paese e trova l'orario migliore
  const countryData: Record<string, { hour: number; day: number; rate: number; count: number }[]> = {};
  
  for (const row of timingData) {
    const country = row.country || "UNKNOWN";
    if (!countryData[country]) countryData[country] = [];
    
    const total = Number(row.total);
    const opened = Number(row.opened);
    const rate = total > 0 ? (opened / total) * 100 : 0;
    
    countryData[country].push({
      hour: Number(row.hour),
      day: Number(row.dayOfWeek) - 1, // MySQL DAYOFWEEK is 1-7
      rate,
      count: total,
    });
  }

  // Trova il miglior orario per ogni paese
  const optimalTimings: OptimalTiming[] = [];
  
  for (const [country, data] of Object.entries(countryData)) {
    // Filtra per sample size minimo
    const validData = data.filter(d => d.count >= 5);
    if (validData.length === 0) continue;
    
    // Trova il miglior orario
    const best = validData.reduce((a, b) => a.rate > b.rate ? a : b);
    
    optimalTimings.push({
      country,
      bestHour: best.hour,
      bestDay: best.day,
      openRate: Math.round(best.rate * 100) / 100,
      sampleSize: validData.reduce((sum, d) => sum + d.count, 0),
    });
  }

  // Ordina per open rate
  optimalTimings.sort((a, b) => b.openRate - a.openRate);

  return optimalTimings;
}

// ============================================
// SUBJECT LINE LEARNING
// ============================================

/**
 * Analizza i pattern nei subject line per capire cosa funziona
 */
export async function learnSubjectPatterns(): Promise<SubjectAnalysis[]> {
  const db = await getDb();
  if (!db) return [];

  // Query per ottenere performance per press release
  const subjectData = await db
    .select({
      title: pressReleases.title,
      total: sql<number>`COUNT(${distributions.id})`,
      opened: sql<number>`SUM(CASE WHEN ${distributions.status} IN ('opened', 'clicked') THEN 1 ELSE 0 END)`,
      clicked: sql<number>`SUM(CASE WHEN ${distributions.status} = 'clicked' THEN 1 ELSE 0 END)`,
    })
    .from(pressReleases)
    .innerJoin(distributions, eq(distributions.pressReleaseId, pressReleases.id))
    .where(gte(distributions.sentAt, sql`DATE_SUB(NOW(), INTERVAL 60 DAY)`))
    .groupBy(pressReleases.id);

  // Analizza pattern nei titoli
  const patterns: Record<string, { opens: number; clicks: number; total: number }> = {
    "con_numeri": { opens: 0, clicks: 0, total: 0 },
    "con_domanda": { opens: 0, clicks: 0, total: 0 },
    "con_emoji": { opens: 0, clicks: 0, total: 0 },
    "breve": { opens: 0, clicks: 0, total: 0 }, // < 50 chars
    "lungo": { opens: 0, clicks: 0, total: 0 }, // > 80 chars
    "con_urgenza": { opens: 0, clicks: 0, total: 0 }, // "ora", "oggi", "nuovo"
  };

  for (const row of subjectData) {
    const title = row.title.toLowerCase();
    const total = Number(row.total);
    const opened = Number(row.opened);
    const clicked = Number(row.clicked);

    // Controlla pattern
    if (/\d+/.test(title)) {
      patterns.con_numeri.opens += opened;
      patterns.con_numeri.clicks += clicked;
      patterns.con_numeri.total += total;
    }
    if (/\?/.test(title)) {
      patterns.con_domanda.opens += opened;
      patterns.con_domanda.clicks += clicked;
      patterns.con_domanda.total += total;
    }
    if (/[\u{1F300}-\u{1F9FF}]/u.test(row.title)) {
      patterns.con_emoji.opens += opened;
      patterns.con_emoji.clicks += clicked;
      patterns.con_emoji.total += total;
    }
    if (row.title.length < 50) {
      patterns.breve.opens += opened;
      patterns.breve.clicks += clicked;
      patterns.breve.total += total;
    }
    if (row.title.length > 80) {
      patterns.lungo.opens += opened;
      patterns.lungo.clicks += clicked;
      patterns.lungo.total += total;
    }
    if (/\b(ora|oggi|nuovo|nuova|breaking|esclusivo)\b/i.test(title)) {
      patterns.con_urgenza.opens += opened;
      patterns.con_urgenza.clicks += clicked;
      patterns.con_urgenza.total += total;
    }
  }

  // Calcola medie
  const analysis: SubjectAnalysis[] = [];
  for (const [pattern, data] of Object.entries(patterns)) {
    if (data.total >= 10) { // Minimo sample size
      analysis.push({
        pattern,
        avgOpenRate: Math.round((data.opens / data.total) * 10000) / 100,
        avgClickRate: Math.round((data.clicks / data.total) * 10000) / 100,
        sampleSize: data.total,
      });
    }
  }

  // Ordina per open rate
  analysis.sort((a, b) => b.avgOpenRate - a.avgOpenRate);

  return analysis;
}

// ============================================
// GENERATE INSIGHTS
// ============================================

/**
 * Genera insights actionable dai dati
 */
export async function generateInsights(): Promise<LearningInsight[]> {
  const insights: LearningInsight[] = [];

  // Timing insights
  const timings = await learnOptimalTimings();
  if (timings.length > 0) {
    const bestCountry = timings[0];
    insights.push({
      type: "timing",
      insight: `I giornalisti in ${bestCountry.country} hanno il miglior open rate (${bestCountry.openRate}%) alle ${bestCountry.bestHour}:00`,
      confidence: Math.min(bestCountry.sampleSize / 10, 100),
      actionable: true,
      recommendation: `Programma gli invii per ${bestCountry.country} alle ${bestCountry.bestHour}:00`,
    });
  }

  // Subject insights
  const subjects = await learnSubjectPatterns();
  if (subjects.length > 0) {
    const bestPattern = subjects[0];
    const patternNames: Record<string, string> = {
      con_numeri: "con numeri",
      con_domanda: "con domande",
      con_emoji: "con emoji",
      breve: "brevi (< 50 caratteri)",
      lungo: "lunghi (> 80 caratteri)",
      con_urgenza: "con parole di urgenza",
    };
    
    insights.push({
      type: "subject",
      insight: `I subject line ${patternNames[bestPattern.pattern] || bestPattern.pattern} hanno il miglior open rate (${bestPattern.avgOpenRate}%)`,
      confidence: Math.min(bestPattern.sampleSize / 10, 100),
      actionable: true,
      recommendation: `Usa subject line ${patternNames[bestPattern.pattern] || bestPattern.pattern} per migliorare le aperture`,
    });
  }

  return insights;
}

// ============================================
// MAIN LEARNING REPORT
// ============================================

/**
 * Genera un report completo di learning
 */
export async function generateLearningReport(): Promise<LearningReport> {
  const [insights, timings, subjects] = await Promise.all([
    generateInsights(),
    learnOptimalTimings(),
    learnSubjectPatterns(),
  ]);

  // Calcola score complessivo basato sulla quantità di dati
  const totalSamples = timings.reduce((sum, t) => sum + t.sampleSize, 0);
  const overallScore = Math.min(Math.round(totalSamples / 100), 100);

  // Genera raccomandazioni
  const recommendations: string[] = [];
  
  if (timings.length > 0) {
    const topTimings = timings.slice(0, 3);
    recommendations.push(
      `Orari ottimali: ${topTimings.map(t => `${t.country} alle ${t.bestHour}:00`).join(", ")}`
    );
  }

  if (subjects.length > 0) {
    const bestSubject = subjects[0];
    recommendations.push(
      `Usa subject line con pattern "${bestSubject.pattern}" per migliorare del ${Math.round(bestSubject.avgOpenRate)}%`
    );
  }

  if (totalSamples < 100) {
    recommendations.push(
      "Invia più email per migliorare l'accuratezza delle previsioni"
    );
  }

  return {
    generatedAt: new Date().toISOString(),
    dataRange: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    },
    insights,
    optimalTimings: timings,
    subjectPatterns: subjects,
    overallScore,
    recommendations,
  };
}

/**
 * Salva i pattern appresi nel database per uso futuro
 */
export async function saveLearnings(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const timings = await learnOptimalTimings();
  
  // Salva i pattern di timing
  for (const timing of timings) {
    try {
      await db.insert(sendPatterns).values({
        userId: 1, // Default user
        country: timing.country,
        category: "general",
        dayOfWeek: timing.bestDay,
        hourOfDay: timing.bestHour,
        totalSent: timing.sampleSize,
        totalOpened: Math.round(timing.sampleSize * timing.openRate / 100),
        totalClicked: 0,
        openRate: Math.round(timing.openRate * 100), // Store as integer * 100
        clickRate: 0,
        score: Math.round(timing.openRate * 10),
      }).onDuplicateKeyUpdate({
        set: {
          dayOfWeek: timing.bestDay,
          hourOfDay: timing.bestHour,
          totalSent: timing.sampleSize,
          totalOpened: Math.round(timing.sampleSize * timing.openRate / 100),
          openRate: Math.round(timing.openRate * 100),
          score: Math.round(timing.openRate * 10),
        }
      });
    } catch (error) {
      console.error(`[Learning] Error saving pattern for ${timing.country}:`, error);
    }
  }

  console.log(`[Learning] Saved ${timings.length} timing patterns`);
}
