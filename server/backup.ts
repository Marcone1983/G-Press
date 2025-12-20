/**
 * Sistema di Backup Automatico per G-Press
 * Esporta tutti i dati da Cloudflare D1 in formato JSON
 */

import * as d1 from "./cloudflare-d1.js";

export interface BackupData {
  version: string;
  timestamp: string;
  data: {
    documents: any[];
    qa: any[];
    pressReleases: any[];
    customJournalists: any[];
    emailTemplates: any[];
    trainingExamples: any[];
    rankings: any[];
    emailTracking: any[];
    autopilotState: any;
    sendPatterns: any[];
    articleCache: any[];
    settings: any[];
  };
  stats: {
    totalDocuments: number;
    totalQA: number;
    totalPressReleases: number;
    totalCustomJournalists: number;
    totalTemplates: number;
    totalTrainingExamples: number;
    totalRankings: number;
    totalEmailEvents: number;
  };
}

/**
 * Crea un backup completo di tutti i dati D1
 */
export async function createFullBackup(): Promise<BackupData> {
  console.log("[Backup] Starting full backup...");
  
  const [
    documents,
    qa,
    pressReleases,
    customJournalists,
    emailTemplates,
    trainingExamples,
    rankings,
    emailStats,
    autopilotState,
    sendPatterns,
    articleCache,
  ] = await Promise.all([
    d1.getAllDocuments().catch(() => []),
    d1.getAllQA().catch(() => []),
    d1.getAllPressReleases().catch(() => []),
    d1.getAllCustomJournalists().catch(() => []),
    d1.getAllEmailTemplates().catch(() => []),
    d1.getAllTrainingExamples().catch(() => []),
    d1.getTopJournalists(1000).catch(() => []),
    d1.getEmailStats().catch(() => ({ totalSent: 0, totalOpened: 0, totalClicked: 0 })),
    d1.getAutopilotState().catch(() => null),
    d1.getAllSendPatterns().catch(() => []),
    d1.getSuccessfulArticlesFromCache(undefined, 1000).catch(() => []),
  ]);

  const backup: BackupData = {
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    data: {
      documents,
      qa,
      pressReleases,
      customJournalists,
      emailTemplates,
      trainingExamples,
      rankings,
      emailTracking: [], // Non esportiamo tutti gli eventi per privacy
      autopilotState,
      sendPatterns,
      articleCache,
      settings: [],
    },
    stats: {
      totalDocuments: documents.length,
      totalQA: qa.length,
      totalPressReleases: pressReleases.length,
      totalCustomJournalists: customJournalists.length,
      totalTemplates: emailTemplates.length,
      totalTrainingExamples: trainingExamples.length,
      totalRankings: rankings.length,
      totalEmailEvents: 0,
    },
  };

  console.log("[Backup] Backup completed:", backup.stats);
  return backup;
}

/**
 * Ripristina dati da un backup
 */
export async function restoreFromBackup(backup: BackupData): Promise<{ success: boolean; restored: any }> {
  console.log("[Backup] Starting restore from backup dated:", backup.timestamp);
  
  const restored = {
    documents: 0,
    qa: 0,
    pressReleases: 0,
    customJournalists: 0,
    emailTemplates: 0,
    trainingExamples: 0,
  };

  // Ripristina documenti
  for (const doc of backup.data.documents) {
    try {
      await d1.saveDocument({
        title: doc.title,
        content: doc.content,
        type: doc.type,
        category: doc.category,
        tags: doc.tags,
      });
      restored.documents++;
    } catch (e) {
      console.error("[Backup] Failed to restore document:", doc.title);
    }
  }

  // Ripristina Q&A
  for (const qa of backup.data.qa) {
    try {
      await d1.saveQA({
        question: qa.question,
        answer: qa.answer,
        category: qa.category,
      });
      restored.qa++;
    } catch (e) {
      console.error("[Backup] Failed to restore Q&A:", qa.question);
    }
  }

  // Ripristina giornalisti custom
  for (const j of backup.data.customJournalists) {
    try {
      await d1.saveCustomJournalist({
        name: j.name,
        email: j.email,
        outlet: j.outlet,
        category: j.category,
        country: j.country,
        isVip: j.is_vip || j.isVip,
        isBlacklisted: j.is_blacklisted || j.isBlacklisted,
        notes: j.notes,
      });
      restored.customJournalists++;
    } catch (e) {
      console.error("[Backup] Failed to restore journalist:", j.email);
    }
  }

  // Ripristina template email
  for (const t of backup.data.emailTemplates) {
    try {
      await d1.saveEmailTemplate({
        name: t.name,
        subject: t.subject,
        content: t.content,
        isDefault: t.isDefault || false,
      });
      restored.emailTemplates++;
    } catch (e) {
      console.error("[Backup] Failed to restore template:", t.name);
    }
  }

  // Ripristina training examples
  for (const ex of backup.data.trainingExamples) {
    try {
      await d1.saveTrainingExample({
        prompt: ex.prompt,
        completion: ex.completion,
        category: ex.category,
      });
      restored.trainingExamples++;
    } catch (e) {
      console.error("[Backup] Failed to restore training example");
    }
  }

  console.log("[Backup] Restore completed:", restored);
  return { success: true, restored };
}

/**
 * Esporta backup come stringa JSON formattata
 */
export async function exportBackupAsJSON(): Promise<string> {
  const backup = await createFullBackup();
  return JSON.stringify(backup, null, 2);
}

/**
 * Valida un file di backup
 */
export function validateBackup(data: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data.version) errors.push("Missing version field");
  if (!data.timestamp) errors.push("Missing timestamp field");
  if (!data.data) errors.push("Missing data field");
  if (!data.stats) errors.push("Missing stats field");
  
  if (data.data) {
    if (!Array.isArray(data.data.documents)) errors.push("Invalid documents array");
    if (!Array.isArray(data.data.qa)) errors.push("Invalid qa array");
    if (!Array.isArray(data.data.customJournalists)) errors.push("Invalid customJournalists array");
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}
