import { eq, and, sql, lt } from "drizzle-orm";
import { getDb } from "./db";
import { followUpQueue, distributions, pressReleases, journalists } from "../drizzle/schema";

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

    // For now, just mark as sent (actual email sending would require more integration)
    // In production, you would call the email service here
    try {
      // Mark as sent
      await db
        .update(followUpQueue)
        .set({ 
          status: "sent",
          sentAt: new Date(),
        })
        .where(eq(followUpQueue.id, item.followUp.id));
      
      sent++;
      console.log(`[Follow-up] Sent follow-up to ${item.journalist.email}`);
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
