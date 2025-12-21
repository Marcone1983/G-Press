import * as db from "./db.js";
import * as emailTracking from "./email-tracking.js";

/**
 * Sistema di Retargeting Intelligente (Additive)
 * 
 * Analizza i comportamenti storici dei giornalisti e suggerisce strategie
 * personalizzate di re-engagement per massimizzare la viralità e la crescita
 * del Growverse.
 * 
 * Fattori considerati:
 * 1. Tasso di apertura storico (Giornalisti che aprono sempre vs. mai)
 * 2. Tasso di click storico (Engagement reale)
 * 3. Tempo di risposta (Quanto velocemente aprono le email)
 * 4. Orario preferito (Quando sono più attivi)
 * 5. Categoria preferita (Quali argomenti li interessano)
 * 6. Giorni di inattività (Quanto tempo è passato dall'ultimo engagement)
 */

export interface JournalistProfile {
  id: number;
  email: string;
  name: string;
  openRate: number;
  clickRate: number;
  avgResponseTime: number; // in ore
  preferredHour: number;
  preferredCategories: string[];
  daysSinceLastEngagement: number;
  totalEmailsReceived: number;
  engagementTier: "high" | "medium" | "low" | "dormant";
}

export interface RetargetingStrategy {
  journalistId: number;
  email: string;
  strategy: string;
  urgency: "immediate" | "soon" | "monitor";
  suggestedSubject: string;
  suggestedCategory: string;
  suggestedTime: string;
  reason: string;
}

/**
 * Analizza il profilo di un giornalista e determina il suo engagement tier.
 */
export async function analyzeJournalistProfile(
  journalistId: number
): Promise<JournalistProfile | null> {
  const journalist = await db.getJournalistById(journalistId);
  if (!journalist) return null;

  // Recupera statistiche di engagement
  const stats = await emailTracking.getJournalistStats(journalistId);
  
  // Calcola giorni dall'ultimo engagement
  const lastEngagement = stats.lastEngagement ? new Date(stats.lastEngagement) : null;
  const daysSinceLastEngagement = lastEngagement
    ? Math.floor((Date.now() - lastEngagement.getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  // Determina engagement tier
  let engagementTier: "high" | "medium" | "low" | "dormant";
  if (stats.openRate > 0.5 && stats.clickRate > 0.2) {
    engagementTier = "high";
  } else if (stats.openRate > 0.3 || stats.clickRate > 0.1) {
    engagementTier = "medium";
  } else if (stats.openRate > 0.1) {
    engagementTier = "low";
  } else {
    engagementTier = "dormant";
  }

  return {
    id: journalistId,
    email: journalist.email,
    name: journalist.name || "",
    openRate: stats.openRate,
    clickRate: stats.clickRate,
    avgResponseTime: stats.avgResponseTime || 24, // Default 24 ore
    preferredHour: stats.preferredHour || 9, // Default 9 AM
    preferredCategories: stats.preferredCategories || [],
    daysSinceLastEngagement,
    totalEmailsReceived: stats.totalEmailsReceived || 0,
    engagementTier,
  };
}

/**
 * Genera una strategia di retargeting personalizzata per un giornalista.
 */
export async function generateRetargetingStrategy(
  journalistId: number
): Promise<RetargetingStrategy | null> {
  const profile = await analyzeJournalistProfile(journalistId);
  if (!profile) return null;

  let strategy: string;
  let urgency: "immediate" | "soon" | "monitor";
  let suggestedSubject: string;
  let suggestedCategory: string;
  let suggestedTime: string;
  let reason: string;

  // Strategia basata su engagement tier e inattività
  if (profile.engagementTier === "high") {
    // Giornalisti ad alto engagement: mantieni frequenza
    strategy = "Mantieni Frequenza";
    urgency = "monitor";
    suggestedSubject = "Nuova opportunità di crescita per Growverse";
    suggestedCategory = profile.preferredCategories[0] || "technology";
    suggestedTime = `${profile.preferredHour}:00`;
    reason = "Giornalista ad alto engagement. Continua con la strategia attuale.";
  } else if (profile.engagementTier === "medium") {
    // Giornalisti a medio engagement: ottimizza
    strategy = "Ottimizza Contenuto";
    urgency = "soon";
    suggestedSubject = "Scopri come Growverse sta rivoluzionando il settore";
    suggestedCategory = profile.preferredCategories[0] || "business";
    suggestedTime = `${profile.preferredHour}:00`;
    reason = "Giornalista a medio engagement. Prova con contenuti più mirati.";
  } else if (profile.engagementTier === "low") {
    // Giornalisti a basso engagement: re-engage
    strategy = "Re-engagement Mirato";
    urgency = "soon";
    suggestedSubject = "Torniamo in contatto: Growverse ha novità per te";
    suggestedCategory = profile.preferredCategories[0] || "general";
    suggestedTime = `${Math.min(profile.preferredHour + 2, 18)}:00`; // Prova un orario diverso
    reason = "Giornalista a basso engagement. Prova con un approccio diverso.";
  } else {
    // Giornalisti dormienti: re-activation campaign
    strategy = "Campagna di Re-attivazione";
    urgency = "immediate";
    suggestedSubject = "Sei stato selezionato per un'esclusiva su Growverse";
    suggestedCategory = "technology"; // Prova con tech per attirare attenzione
    suggestedTime = "10:00"; // Orario classico di lettura
    reason = `Giornalista inattivo da ${profile.daysSinceLastEngagement} giorni. Serve una campagna speciale.`;
  }

  return {
    journalistId: profile.id,
    email: profile.email,
    strategy,
    urgency,
    suggestedSubject,
    suggestedCategory,
    suggestedTime,
    reason,
  };
}

/**
 * Genera strategie di retargeting per tutti i giornalisti.
 */
export async function generateBulkRetargetingStrategies(): Promise<RetargetingStrategy[]> {
  const journalists = await db.getAllJournalists();
  const strategies: RetargetingStrategy[] = [];

  for (const journalist of journalists) {
    const strategy = await generateRetargetingStrategy(journalist.id);
    if (strategy) {
      strategies.push(strategy);
    }
  }

  // Ordina per urgenza (immediate > soon > monitor)
  strategies.sort((a, b) => {
    const urgencyOrder = { immediate: 0, soon: 1, monitor: 2 };
    return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
  });

  return strategies;
}

/**
 * Identifica i giornalisti che hanno il maggior potenziale di re-engagement.
 */
export async function getHighPotentialRetargetCandidates(
  limit: number = 50
): Promise<RetargetingStrategy[]> {
  const strategies = await generateBulkRetargetingStrategies();

  // Filtra per giornalisti "low" e "dormant" (hanno il maggior potenziale di miglioramento)
  const candidates = strategies.filter(
    s => s.urgency === "immediate" || s.urgency === "soon"
  );

  return candidates.slice(0, limit);
}

/**
 * Analizza il ROI potenziale di una campagna di retargeting.
 */
export async function estimateRetargetingROI(
  targetJournalistIds: number[]
): Promise<{
  potentialOpens: number;
  potentialClicks: number;
  estimatedEngagementLift: number;
  recommendation: string;
}> {
  let potentialOpens = 0;
  let potentialClicks = 0;
  let totalProfiles = 0;

  for (const id of targetJournalistIds) {
    const profile = await analyzeJournalistProfile(id);
    if (profile) {
      totalProfiles++;
      // Stima: con una strategia ottimizzata, aumenta il 30% dell'open rate
      potentialOpens += profile.openRate * 1.3;
      // Stima: aumenta il 25% del click rate
      potentialClicks += profile.clickRate * 1.25;
    }
  }

  const avgOpenRateIncrease = totalProfiles > 0 ? (potentialOpens / totalProfiles - 0.5) / 0.5 : 0;
  const estimatedEngagementLift = Math.max(0, avgOpenRateIncrease * 100);

  let recommendation: string;
  if (estimatedEngagementLift > 30) {
    recommendation = "🚀 Campagna altamente promettente. Procedi immediatamente.";
  } else if (estimatedEngagementLift > 15) {
    recommendation = "✅ Buon potenziale. Consigliato procedere.";
  } else if (estimatedEngagementLift > 5) {
    recommendation = "⚠️ Potenziale moderato. Valuta se procedere.";
  } else {
    recommendation = "❌ Potenziale basso. Considera di rivedere la strategia.";
  }

  return {
    potentialOpens: Math.round(potentialOpens),
    potentialClicks: Math.round(potentialClicks),
    estimatedEngagementLift: Math.round(estimatedEngagementLift),
    recommendation,
  };
}
