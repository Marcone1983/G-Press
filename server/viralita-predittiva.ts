import * as db from "./db.js";
import * as emailTracking from "./email-tracking.js";
import { Article, JournalistRanking } from "./types.js"; // Assumo l'esistenza di un file types.js o simili

/**
 * Modello di Viralità Predittiva (Additive)
 * 
 * Questo sistema analizza i dati storici per assegnare un "Viralità Score" (0-100)
 * a un nuovo articolo prima che venga inviato.
 * 
 * Fattori considerati:
 * 1. Performance storica della Categoria (Open Rate medio)
 * 2. Performance storica del Tone (Click Rate medio)
 * 3. Ranking medio dei Giornalisti target (Tier A/B/C)
 * 4. Lunghezza dell'articolo (Articoli più brevi/lunghi tendono a performare meglio?)
 * 5. Presenza di parole chiave ad alta viralità (es. "AI", "Growverse", "Unico")
 */

// Pesi dei fattori nel calcolo del punteggio (regolabili)
const WEIGHTS = {
    categoryPerformance: 0.3,
    tonePerformance: 0.2,
    journalistRanking: 0.3,
    articleLength: 0.1,
    viralKeywords: 0.1,
};

// Soglie per la normalizzazione
const MAX_JOURNALIST_SCORE = 100; // Assumendo che il ranking massimo sia 100
const MAX_LENGTH = 5000; // Max lunghezza caratteri per l'articolo

/**
 * Calcola il punteggio di viralità per un articolo.
 * @param article L'articolo da analizzare.
 * @param targetJournalists Il ranking dei giornalisti a cui l'articolo è destinato.
 * @returns Un oggetto contenente il punteggio di viralità e i dettagli del calcolo.
 */
export async function calculateViralityScore(
    article: Article,
    targetJournalists: JournalistRanking[]
): Promise<{ score: number, details: Record<string, number> }> {
    // 1. Performance storica della Categoria
    const categoryStats = await emailTracking.getCategoryStats(article.category || 'general');
    const categoryScore = categoryStats.avgOpenRate * 100; // Normalizza a 0-100

    // 2. Performance storica del Tone (Assumendo che il tone sia salvato nell'articolo o si possa dedurre)
    // Per semplicità, assumiamo un tone predefinito se non specificato
    const tone = article.tone || "formal"; 
    const toneStats = await emailTracking.getToneStats(tone);
    const toneScore = toneStats.avgClickRate * 100; // Normalizza a 0-100

    // 3. Ranking medio dei Giornalisti target
    const avgJournalistScore = targetJournalists.length > 0
        ? targetJournalists.reduce((sum, j) => sum + j.score, 0) / targetJournalists.length
        : 0;
    const journalistScore = (avgJournalistScore / MAX_JOURNALIST_SCORE) * 100;

    // 4. Lunghezza dell'articolo
    const lengthScore = Math.min(1, article.content.length / MAX_LENGTH) * 100;

    // 5. Presenza di parole chiave ad alta viralità (Focus Growverse)
    const viralKeywords = ["Growverse", "viralità", "crescita", "unico", "tecnologico", "futuro"];
    let keywordCount = 0;
    const contentLower = article.content.toLowerCase();
    viralKeywords.forEach(keyword => {
        if (contentLower.includes(keyword.toLowerCase())) {
            keywordCount++;
        }
    });
    const keywordScore = (keywordCount / viralKeywords.length) * 100;

    // Calcolo del punteggio finale
    const score = (
        categoryScore * WEIGHTS.categoryPerformance +
        toneScore * WEIGHTS.tonePerformance +
        journalistScore * WEIGHTS.journalistRanking +
        lengthScore * WEIGHTS.articleLength +
        keywordScore * WEIGHTS.viralKeywords
    );

    const details = {
        categoryScore,
        toneScore,
        journalistScore,
        lengthScore,
        keywordScore,
    };

    return { score: Math.round(score), details };
}

/**
 * Funzione di Decisione: Suggerisce se inviare l'articolo ora o ottimizzare.
 * @param score Il punteggio di viralità calcolato.
 * @returns Un suggerimento di azione.
 */
export function getActionSuggestion(score: number): string {
    if (score >= 85) {
        return "🚀 **Invio Immediato Consigliato!** Punteggio di viralità eccezionale. Massima priorità.";
    } else if (score >= 70) {
        return "✅ **Invio Consigliato.** Buon potenziale di viralità. Procedi con l'invio.";
    } else if (score >= 50) {
        return "⚠️ **Ottimizzazione Consigliata.** Potenziale medio. Considera di ottimizzare l'oggetto o il contenuto per aumentare il punteggio.";
    } else {
        return "❌ **Rischio Basso di Viralità.** Fortemente consigliato rivedere la strategia (categoria, tono, contenuto) prima dell'invio.";
    }
}

// Aggiungo una funzione per l'endpoint API
export async function getViralityAnalysis(articleId: number, targetJournalistIds: number[]) {
    const article = await db.getArticleById(articleId);
    if (!article) {
        throw new Error("Articolo non trovato.");
    }

    const targetJournalists = await db.getJournalistRankingsByIds(targetJournalistIds);
    
    const { score, details } = await calculateViralityScore(article, targetJournalists);

    return {
        articleId: article.id,
        title: article.title,
        viralityScore: score,
        suggestion: getActionSuggestion(score),
        details,
    };
}
