import { eq, and, sql, lt } from "drizzle-orm";
import { getDb } from "./db.js";
import { followUpQueue, distributions, pressReleases, journalists } from "../drizzle/schema.js";

/**
 * Build HTML content for follow-up email
 */
function buildFollowUpEmail(
  pressRelease: any,
  journalist: any,
  followUpNumber: number
): string {
  const greeting = journalist.name ? `Gentile ${journalist.name},` : "Gentile Redazione,";
  
  const followUpMessages = [
    "Le scrivo per verificare se ha avuto modo di leggere il nostro comunicato stampa.",
    "Volevo assicurarmi che il nostro comunicato stampa non fosse sfuggito alla sua attenzione.",
    "Un gentile promemoria riguardo al nostro comunicato stampa inviato alcuni giorni fa.",
  ];
  
  const message = followUpMessages[Math.min(followUpNumber - 1, followUpMessages.length - 1)];
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
    h1 { color: #1E88E5; font-size: 22px; margin-bottom: 10px; }
    .intro { margin-bottom: 20px; color: #555; }
    .content { margin: 20px 0; padding: 15px; background: #f9f9f9; border-left: 4px solid #1E88E5; }
    .cta { margin: 25px 0; }
    .cta a { display: inline-block; padding: 12px 24px; background: #1E88E5; color: white; text-decoration: none; border-radius: 6px; }
    .footer { margin-top: 30px; font-size: 12px; color: #999; }
    .signature { margin-top: 20px; }
  </style>
</head>
<body>
  <p>${greeting}</p>
  
  <p class="intro">${message}</p>
  
  <div class="content">
    <h1>${pressRelease.title}</h1>
    <p>${pressRelease.content?.substring(0, 300)}${pressRelease.content?.length > 300 ? '...' : ''}</p>
  </div>
  
  <p>Restiamo a disposizione per ulteriori informazioni, interviste o materiale aggiuntivo.</p>
  
  <div class="signature">
    <p>Cordiali saluti,</p>
    <p><strong>Roberto Romagnino</strong><br>
    Founder & CEO<br>
    GROWVERSE, LLC</p>
  </div>
  
  <div class="footer">
    <p>Questo è un promemoria automatico inviato tramite G-Press.</p>
  </div>
</body>
</html>
  `.trim();
}

import { sendEmailUtility } from "./email-utility.js";
async function sendFollowUpEmail(options: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const result = await sendEmailUtility({
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
  return result.success;
}

/**
 * Schedule follow-ups for a press release distribution
 * Called after initial email send
 */
export async function scheduleFollowUps(
  pressReleaseId: number,
  distributionId: number,
  journalistId: number,
  delayDays: number = 3
) {
  const db = await getDb();
  if (!db) return;

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + delayDays);

  // Create follow-up entry
  await db.insert(followUpQueue).values({
    distributionId,
    pressReleaseId,
    journalistId,
    followUpNumber: 1,
    scheduledAt,
    status: "pending",
  });

  console.log(`[Follow-up] Scheduled follow-up for journalist ${journalistId} in ${delayDays} days`);
}

/**
 * Schedule follow-ups for multiple journalists
 */
export async function scheduleFollowUpsForAll(
  pressReleaseId: number,
  journalistDistributions: Array<{ journalistId: number; distributionId: number }>,
  delayDays: number = 3
) {
  const db = await getDb();
  if (!db) return;

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + delayDays);

  // Create follow-up entries for each journalist
  for (const { journalistId, distributionId } of journalistDistributions) {
    await db.insert(followUpQueue).values({
      distributionId,
      pressReleaseId,
      journalistId,
      followUpNumber: 1,
      scheduledAt,
      status: "pending",
    });
  }

  console.log(`[Follow-up] Scheduled ${journalistDistributions.length} follow-ups for ${delayDays} days from now`);
}

/**
 * Process pending follow-ups
 * Should be called by a cron job every hour
 */
export async function processPendingFollowUps() {
  const db = await getDb();
  if (!db) return { processed: 0, sent: 0, cancelled: 0 };

  const now = new Date();

  // Get pending follow-ups that are due
  const pendingFollowUps = await db
    .select({
      followUp: followUpQueue,
      pressRelease: pressReleases,
      journalist: journalists,
      distribution: distributions,
    })
    .from(followUpQueue)
    .innerJoin(pressReleases, eq(followUpQueue.pressReleaseId, pressReleases.id))
    .innerJoin(journalists, eq(followUpQueue.journalistId, journalists.id))
    .leftJoin(distributions, eq(followUpQueue.distributionId, distributions.id))
    .where(
      and(
        eq(followUpQueue.status, "pending"),
        lt(followUpQueue.scheduledAt, now)
      )
    )
    .limit(50); // Process in batches

  let sent = 0;
  let cancelled = 0;

  for (const item of pendingFollowUps) {
    // Check if email was already opened
    if (item.distribution?.status === "opened" || item.distribution?.status === "clicked") {
      // Cancel follow-up - email was already opened
      await db
        .update(followUpQueue)
        .set({ status: "cancelled" })
        .where(eq(followUpQueue.id, item.followUp.id));
      cancelled++;
      continue;
    }

    // Send actual follow-up email
    try {
      // Build follow-up email content
      const followUpSubject = `[Promemoria] ${item.pressRelease.title}`;
      const followUpHtml = buildFollowUpEmail(item.pressRelease, item.journalist, item.followUp.followUpNumber);
      
      // Send the email
      const emailSent = await sendFollowUpEmail({
        to: item.journalist.email,
        subject: followUpSubject,
        html: followUpHtml,
      });

      if (!emailSent) {
        // Mark as skipped if email failed
        await db
          .update(followUpQueue)
          .set({ status: "skipped" })
          .where(eq(followUpQueue.id, item.followUp.id));
        continue;
      }

      // Mark as sent
      await db
        .update(followUpQueue)
        .set({ 
          status: "sent",
          sentAt: new Date(),
        })
        .where(eq(followUpQueue.id, item.followUp.id));
      
      sent++;
      console.log(`[Follow-up] Sent follow-up #${item.followUp.followUpNumber} to ${item.journalist.email}`);
    } catch (error) {
      console.error(`[Follow-up] Error processing follow-up for ${item.journalist.email}:`, error);
      
      // Mark as skipped on error
      await db
        .update(followUpQueue)
        .set({ status: "skipped" })
        .where(eq(followUpQueue.id, item.followUp.id));
    }
  }

  console.log(`[Follow-up] Processed ${pendingFollowUps.length}, sent ${sent}, cancelled ${cancelled}`);
  
  return {
    processed: pendingFollowUps.length,
    sent,
    cancelled,
  };
}

/**
 * Get follow-up status for a press release
 */
export async function getFollowUpStatus(pressReleaseId: number) {
  const db = await getDb();
  if (!db) return null;

  const stats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      pending: sql<number>`SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)`,
      sent: sql<number>`SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END)`,
      cancelled: sql<number>`SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END)`,
      skipped: sql<number>`SUM(CASE WHEN status = 'skipped' THEN 1 ELSE 0 END)`,
    })
    .from(followUpQueue)
    .where(eq(followUpQueue.pressReleaseId, pressReleaseId));

  if (stats.length === 0) return null;

  const s = stats[0];
  return {
    total: Number(s.total) || 0,
    pending: Number(s.pending) || 0,
    sent: Number(s.sent) || 0,
    cancelled: Number(s.cancelled) || 0,
    skipped: Number(s.skipped) || 0,
  };
}

/**
 * Cancel all pending follow-ups for a press release
 */
export async function cancelFollowUps(pressReleaseId: number) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(followUpQueue)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(followUpQueue.pressReleaseId, pressReleaseId),
        eq(followUpQueue.status, "pending")
      )
    );
}

/**
 * Cancel pending follow-ups for a specific journalist (when they open the email)
 */
export async function cancelFollowUpsForJournalist(journalistId: number, pressReleaseId?: number) {
  const db = await getDb();
  if (!db) return;

  const conditions = [
    eq(followUpQueue.journalistId, journalistId),
    eq(followUpQueue.status, "pending"),
  ];

  if (pressReleaseId) {
    conditions.push(eq(followUpQueue.pressReleaseId, pressReleaseId));
  }

  await db
    .update(followUpQueue)
    .set({ status: "cancelled" })
    .where(and(...conditions));
}

/**
 * Get pending follow-ups count for dashboard
 */
export async function getPendingFollowUpsCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.execute(sql`
    SELECT COUNT(*) as count
    FROM followUpQueue fq
    JOIN pressReleases pr ON fq.pressReleaseId = pr.id
    WHERE pr.userId = ${userId} AND fq.status = 'pending'
  `) as any;

  return result?.[0]?.count || 0;
}
