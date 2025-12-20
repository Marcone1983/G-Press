/**
 * Article Cache System
 * 
 * Memorizza gli articoli con alto engagement per riutilizzarli.
 * Quando un articolo ha un open rate > 25% o click rate > 5%,
 * viene salvato nella cache per essere riutilizzato come template.
 * 
 * Questo evita chiamate API costose - l'AI può generare variazioni
 * di articoli già provati invece di partire da zero.
 */

import { getDb } from "./db.js";
import { successfulArticles, pressReleases } from "../drizzle/schema.js";
import { eq, desc, and, gte, sql } from "drizzle-orm";

// Soglie per considerare un articolo "di successo"
const SUCCESS_THRESHOLDS = {
  minOpenRate: 25, // 25% open rate
  minClickRate: 5,  // 5% click rate
  minSent: 50,      // Almeno 50 email inviate per avere dati significativi
};

interface ArticlePerformance {
  pressReleaseId: number;
  title: string;
  subtitle?: string;
  content: string;
  category: string;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  trendKeywords?: string[];
  trendSource?: string;
}

/**
 * Analizza le performance di un articolo e lo salva in cache se è di successo
 */
export async function analyzeAndCacheArticle(
  performance: ArticlePerformance,
  userId: number
): Promise<{ cached: boolean; reason: string }> {
  const db = await getDb();
  if (!db) {
    return { cached: false, reason: "Database non disponibile" };
  }

  // Verifica se soddisfa le soglie
  if (performance.totalSent < SUCCESS_THRESHOLDS.minSent) {
    return { 
      cached: false, 
      reason: `Dati insufficienti: ${performance.totalSent}/${SUCCESS_THRESHOLDS.minSent} email inviate` 
    };
  }

  const meetsOpenThreshold = performance.openRate >= SUCCESS_THRESHOLDS.minOpenRate;
  const meetsClickThreshold = performance.clickRate >= SUCCESS_THRESHOLDS.minClickRate;

  if (!meetsOpenThreshold && !meetsClickThreshold) {
    return { 
      cached: false, 
      reason: `Performance sotto soglia: ${performance.openRate}% open, ${performance.clickRate}% click` 
    };
  }

  try {
    // Controlla se esiste già
    const existing = await db.select()
      .from(successfulArticles)
      .where(eq(successfulArticles.pressReleaseId, performance.pressReleaseId))
      .limit(1);

    if (existing.length > 0) {
      // Aggiorna le metriche
      await db.update(successfulArticles)
        .set({
          totalSent: performance.totalSent,
          totalOpened: performance.totalOpened,
          totalClicked: performance.totalClicked,
          openRate: Math.round(performance.openRate * 100),
          clickRate: Math.round(performance.clickRate * 100),
        })
        .where(eq(successfulArticles.id, existing[0].id));

      return { cached: true, reason: "Metriche aggiornate" };
    }

    // Salva nuovo articolo di successo
    await db.insert(successfulArticles).values({
      userId,
      pressReleaseId: performance.pressReleaseId,
      title: performance.title,
      subtitle: performance.subtitle || null,
      content: performance.content,
      category: performance.category as any,
      totalSent: performance.totalSent,
      totalOpened: performance.totalOpened,
      totalClicked: performance.totalClicked,
      openRate: Math.round(performance.openRate * 100),
      clickRate: Math.round(performance.clickRate * 100),
      trendKeywords: performance.trendKeywords ? JSON.stringify(performance.trendKeywords) : null,
      trendSource: performance.trendSource || null,
    });

    console.log(`[ArticleCache] Cached successful article: "${performance.title}" (${performance.openRate}% open, ${performance.clickRate}% click)`);

    return { 
      cached: true, 
      reason: `Articolo salvato in cache: ${performance.openRate}% open, ${performance.clickRate}% click` 
    };
  } catch (error) {
    console.error("[ArticleCache] Error caching article:", error);
    return { cached: false, reason: "Errore durante il salvataggio" };
  }
}

/**
 * Recupera gli articoli di successo per una categoria
 * Ordinati per performance (open rate + click rate)
 */
export async function getSuccessfulArticles(
  category?: string,
  limit: number = 10
): Promise<typeof successfulArticles.$inferSelect[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    let query = db.select()
      .from(successfulArticles)
      .orderBy(desc(sql`${successfulArticles.openRate} + ${successfulArticles.clickRate}`))
      .limit(limit);

    if (category) {
      const results = await db.select()
        .from(successfulArticles)
        .where(eq(successfulArticles.category, category as any))
        .orderBy(desc(sql`${successfulArticles.openRate} + ${successfulArticles.clickRate}`))
        .limit(limit);
      return results;
    }

    return await query;
  } catch (error) {
    console.error("[ArticleCache] Error fetching successful articles:", error);
    return [];
  }
}

/**
 * Trova un articolo simile da usare come template
 * Basato su categoria e keywords del trend
 */
export async function findSimilarSuccessfulArticle(
  category: string,
  trendKeywords: string[]
): Promise<typeof successfulArticles.$inferSelect | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Prima cerca per categoria
    const categoryArticles = await db.select()
      .from(successfulArticles)
      .where(eq(successfulArticles.category, category as any))
      .orderBy(desc(sql`${successfulArticles.openRate} + ${successfulArticles.clickRate}`))
      .limit(20);

    if (categoryArticles.length === 0) {
      // Fallback: prendi il migliore in assoluto
      const best = await db.select()
        .from(successfulArticles)
        .orderBy(desc(sql`${successfulArticles.openRate} + ${successfulArticles.clickRate}`))
        .limit(1);
      return best[0] || null;
    }

    // Cerca match con keywords
    for (const article of categoryArticles) {
      if (article.trendKeywords) {
        try {
          const articleKeywords = JSON.parse(article.trendKeywords) as string[];
          const hasMatch = trendKeywords.some(kw => 
            articleKeywords.some(ak => 
              ak.toLowerCase().includes(kw.toLowerCase()) || 
              kw.toLowerCase().includes(ak.toLowerCase())
            )
          );
          if (hasMatch) {
            return article;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    // Nessun match keywords, ritorna il migliore della categoria
    return categoryArticles[0];
  } catch (error) {
    console.error("[ArticleCache] Error finding similar article:", error);
    return null;
  }
}

/**
 * Genera una variazione di un articolo di successo
 * Cambia solo alcuni elementi mantenendo la struttura vincente
 */
export function generateArticleVariation(
  template: typeof successfulArticles.$inferSelect,
  newTrend: { title: string; description: string; keywords: string[] }
): { title: string; content: string } {
  // Sostituisci il trend nel titolo
  let newTitle = template.title;
  let newContent = template.content;

  // Pattern comuni da sostituire
  const patterns = [
    /il trend del momento/gi,
    /la tendenza attuale/gi,
    /il fenomeno/gi,
    /la novità/gi,
  ];

  // Sostituisci con il nuovo trend
  for (const pattern of patterns) {
    newTitle = newTitle.replace(pattern, newTrend.title);
    newContent = newContent.replace(pattern, newTrend.title);
  }

  // Aggiungi menzione del nuovo trend se non presente
  if (!newContent.toLowerCase().includes(newTrend.title.toLowerCase())) {
    // Inserisci nel primo paragrafo
    const paragraphs = newContent.split('\n\n');
    if (paragraphs.length > 0) {
      paragraphs[0] = `${paragraphs[0]} In particolare, ${newTrend.title} sta emergendo come elemento chiave in questo contesto.`;
      newContent = paragraphs.join('\n\n');
    }
  }

  return { title: newTitle, content: newContent };
}

/**
 * Incrementa il contatore di riutilizzo
 */
export async function markArticleReused(articleId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  try {
    await db.update(successfulArticles)
      .set({
        timesReused: sql`${successfulArticles.timesReused} + 1`,
        lastReusedAt: new Date(),
      })
      .where(eq(successfulArticles.id, articleId));
  } catch (error) {
    console.error("[ArticleCache] Error marking article as reused:", error);
  }
}

/**
 * Analizza tutti i press releases e aggiorna la cache
 * Da chiamare periodicamente (es. ogni giorno)
 */
export async function refreshArticleCache(userId: number): Promise<{
  analyzed: number;
  cached: number;
}> {
  const db = await getDb();
  if (!db) return { analyzed: 0, cached: 0 };

  try {
    // Recupera tutti i press releases con le loro metriche
    const releases = await db.select()
      .from(pressReleases)
      .where(eq(pressReleases.userId, userId));

    let analyzed = 0;
    let cached = 0;

    for (const release of releases) {
      analyzed++;

      // Calcola metriche (in produzione queste verrebbero da emailTracking)
      // Per ora usiamo i dati salvati nel press release
      const performance: ArticlePerformance = {
        pressReleaseId: release.id,
        title: release.title,
        subtitle: release.subtitle || undefined,
        content: release.content,
        category: release.category || "general",
        totalSent: 0, // TODO: calcolare da emailTracking
        totalOpened: 0,
        totalClicked: 0,
        openRate: 0,
        clickRate: 0,
      };

      // Solo se ha dati significativi
      if (performance.totalSent >= SUCCESS_THRESHOLDS.minSent) {
        const result = await analyzeAndCacheArticle(performance, userId);
        if (result.cached) {
          cached++;
        }
      }
    }

    console.log(`[ArticleCache] Refresh complete: ${analyzed} analyzed, ${cached} cached`);
    return { analyzed, cached };
  } catch (error) {
    console.error("[ArticleCache] Error refreshing cache:", error);
    return { analyzed: 0, cached: 0 };
  }
}

/**
 * Statistiche della cache
 */
export async function getCacheStats(): Promise<{
  totalCached: number;
  avgOpenRate: number;
  avgClickRate: number;
  mostReused: string | null;
  byCategory: Record<string, number>;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalCached: 0,
      avgOpenRate: 0,
      avgClickRate: 0,
      mostReused: null,
      byCategory: {},
    };
  }

  try {
    const all = await db.select().from(successfulArticles);
    
    if (all.length === 0) {
      return {
        totalCached: 0,
        avgOpenRate: 0,
        avgClickRate: 0,
        mostReused: null,
        byCategory: {},
      };
    }

    const avgOpenRate = all.reduce((sum, a) => sum + a.openRate, 0) / all.length / 100;
    const avgClickRate = all.reduce((sum, a) => sum + a.clickRate, 0) / all.length / 100;
    
    const mostReusedArticle = all.sort((a, b) => b.timesReused - a.timesReused)[0];
    
    const byCategory: Record<string, number> = {};
    for (const article of all) {
      byCategory[article.category] = (byCategory[article.category] || 0) + 1;
    }

    return {
      totalCached: all.length,
      avgOpenRate,
      avgClickRate,
      mostReused: mostReusedArticle?.title || null,
      byCategory,
    };
  } catch (error) {
    console.error("[ArticleCache] Error getting stats:", error);
    return {
      totalCached: 0,
      avgOpenRate: 0,
      avgClickRate: 0,
      mostReused: null,
      byCategory: {},
    };
  }
}
