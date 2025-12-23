import { eq, and, sql } from "drizzle-orm";
import { getDb } from "./db.js";
import { emailEvents, emailAnalytics, distributions, followUpQueue, InsertEmailEvent } from "../drizzle/schema.js";

/**
 * Save an email event from Resend webhook
 */
export async function saveEmailEvent(data: {
  emailId?: string;
  eventType: string;
  recipientEmail?: string;
  userAgent?: string;
  ipAddress?: string;
  clickedUrl?: string;
  timestamp: Date;
  rawData?: any;
}) {
  const db = await getDb();
  if (!db) {
    console.error("[Email Tracking] Database not available");
    return null;
  }

  // Find the distribution by email ID or recipient email
  let distributionId: number | null = null;
  
  if (data.recipientEmail) {
    // Find the most recent distribution for this recipient
    const result = await db
      .select({ id: distributions.id })
      .from(distributions)
      .where(eq(distributions.status, "sent"))
      .orderBy(sql`${distributions.sentAt} DESC`)
      .limit(1);
    
    if (result.length > 0) {
      distributionId = result[0].id;
    }
  }

  if (!distributionId) {
    console.log("[Email Tracking] Could not find distribution for event");
    return null;
  }

  const eventData: InsertEmailEvent = {
    distributionId,
    eventType: data.eventType as any,
    emailId: data.emailId,
    recipientEmail: data.recipientEmail,
    userAgent: data.userAgent,
    ipAddress: data.ipAddress,
    clickedUrl: data.clickedUrl,
    timestamp: data.timestamp,
    rawData: data.rawData,
  };

  const result = await db.insert(emailEvents).values(eventData) as any;
  return result?.insertId || result?.[0]?.insertId || null;
}

/**
 * Update distribution status based on email event
 */
export async function updateDistributionFromEvent(
  emailId: string | undefined,
  eventType: string,
  recipientEmail?: string
) {
  const db = await getDb();
  if (!db) return;

  // Map event type to distribution status
  const statusMap: Record<string, string> = {
    delivered: "delivered",
    opened: "opened",
    clicked: "clicked",
    bounced: "bounced",
  };

  const newStatus = statusMap[eventType];
  if (!newStatus) return;

  // Find and update the distribution
  if (recipientEmail) {
    // Get journalist ID from email
    const journalistResult = await db.execute(
      sql`SELECT j.id FROM journalists j 
          JOIN distributions d ON d.journalistId = j.id 
          WHERE j.email = ${recipientEmail} 
          ORDER BY d.sentAt DESC LIMIT 1`
    ) as any;

    if (journalistResult && journalistResult.length > 0) {
      const journalistId = journalistResult[0].id;
      
      const updateData: any = { status: newStatus };
      if (eventType === "opened") {
        updateData.openedAt = new Date();
      } else if (eventType === "clicked") {
        updateData.clickedAt = new Date();
      }

      await db
        .update(distributions)
        .set(updateData)
        .where(eq(distributions.journalistId, journalistId));
    }
  }
}

/**
 * Update analytics for auto-timing algorithm
 */
export async function updateAnalytics(
  recipientEmail: string | undefined,
  eventType: string,
  timestamp?: string
) {
  const db = await getDb();
  if (!db) return;

  const eventDate = timestamp ? new Date(timestamp) : new Date();
  const dayOfWeek = eventDate.getDay(); // 0-6
  const hourOfDay = eventDate.getHours(); // 0-23

  // Get user ID from distribution (simplified - in production, track per user)
  const userId = 1; // Default user for now

  // Check if analytics record exists for this time slot
  const existing = await db
    .select()
    .from(emailAnalytics)
    .where(
      and(
        eq(emailAnalytics.userId, userId),
        eq(emailAnalytics.dayOfWeek, dayOfWeek),
        eq(emailAnalytics.hourOfDay, hourOfDay)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing record
    const record = existing[0];
    const updateData: any = {};
    
    if (eventType === "opened") {
      updateData.totalOpened = record.totalOpened + 1;
    } else if (eventType === "clicked") {
      updateData.totalClicked = record.totalClicked + 1;
    }

    await db
      .update(emailAnalytics)
      .set(updateData)
      .where(eq(emailAnalytics.id, record.id));
  } else {
    // Create new record
    await db.insert(emailAnalytics).values({
      userId,
      dayOfWeek,
      hourOfDay,
      totalSent: 0,
      totalOpened: eventType === "opened" ? 1 : 0,
      totalClicked: eventType === "clicked" ? 1 : 0,
    });
  }
}

/**
 * Cancel pending follow-ups when email is opened
 */
export async function cancelFollowUpsForOpened(
  emailId: string | undefined,
  recipientEmail?: string
) {
  const db = await getDb();
  if (!db) return;

  if (!recipientEmail) return;

  // Find journalist by email
  const journalistResult = await db.execute(
    sql`SELECT id FROM journalists WHERE email = ${recipientEmail} LIMIT 1`
  ) as any;

  if (journalistResult && journalistResult.length > 0) {
    const journalistId = journalistResult[0].id;

    // Cancel all pending follow-ups for this journalist
    await db
      .update(followUpQueue)
      .set({ status: "cancelled" })
      .where(
        and(
          eq(followUpQueue.journalistId, journalistId),
          eq(followUpQueue.status, "pending")
        )
      );
  }
}

/**
 * Get best send times based on analytics
 */
export async function getBestSendTimes(userId: number): Promise<Array<{
  dayOfWeek: number;
  hourOfDay: number;
  openRate: number;
}>> {
  const db = await getDb();
  if (!db) return [];

  const analytics = await db
    .select()
    .from(emailAnalytics)
    .where(eq(emailAnalytics.userId, userId));

  // Calculate open rate for each time slot
  const results = analytics
    .filter((a: any) => a.totalSent > 0)
    .map((a: any) => ({
      dayOfWeek: a.dayOfWeek,
      hourOfDay: a.hourOfDay,
      openRate: a.totalSent > 0 ? (a.totalOpened / a.totalSent) * 100 : 0,
    }))
    .sort((a: any, b: any) => b.openRate - a.openRate);

  return results.slice(0, 5); // Top 5 best times
}

/**
 * Get email statistics for a press release
 */
export async function getEmailStats(pressReleaseId: number) {
  const db = await getDb();
  if (!db) return null;

  const stats = await db
    .select({
      total: sql<number>`COUNT(*)`,
      sent: sql<number>`SUM(CASE WHEN status != 'pending' THEN 1 ELSE 0 END)`,
      delivered: sql<number>`SUM(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END)`,
      opened: sql<number>`SUM(CASE WHEN status IN ('opened', 'clicked') THEN 1 ELSE 0 END)`,
      clicked: sql<number>`SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END)`,
      bounced: sql<number>`SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END)`,
    })
    .from(distributions)
    .where(eq(distributions.pressReleaseId, pressReleaseId));

  if (stats.length === 0) return null;

  const s = stats[0];
  return {
    total: Number(s.total) || 0,
    sent: Number(s.sent) || 0,
    delivered: Number(s.delivered) || 0,
    opened: Number(s.opened) || 0,
    clicked: Number(s.clicked) || 0,
    bounced: Number(s.bounced) || 0,
    openRate: s.sent > 0 ? ((Number(s.opened) / Number(s.sent)) * 100).toFixed(1) : "0",
    clickRate: s.opened > 0 ? ((Number(s.clicked) / Number(s.opened)) * 100).toFixed(1) : "0",
  };
}

/**
 * Get overall statistics for dashboard
 */
export async function getOverallStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  // Get all distributions for user's press releases
  const stats = await db.execute(sql`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN d.status != 'pending' THEN 1 ELSE 0 END) as sent,
      SUM(CASE WHEN d.status IN ('delivered', 'opened', 'clicked') THEN 1 ELSE 0 END) as delivered,
      SUM(CASE WHEN d.status IN ('opened', 'clicked') THEN 1 ELSE 0 END) as opened,
      SUM(CASE WHEN d.status = 'clicked' THEN 1 ELSE 0 END) as clicked,
      SUM(CASE WHEN d.status = 'bounced' THEN 1 ELSE 0 END) as bounced
    FROM distributions d
    JOIN pressReleases pr ON d.pressReleaseId = pr.id
    WHERE pr.userId = ${userId}
  `) as any;

  if (!stats || stats.length === 0) return null;

  const s = stats[0] as any;
  return {
    total: Number(s.total) || 0,
    sent: Number(s.sent) || 0,
    delivered: Number(s.delivered) || 0,
    opened: Number(s.opened) || 0,
    clicked: Number(s.clicked) || 0,
    bounced: Number(s.bounced) || 0,
    openRate: s.sent > 0 ? ((Number(s.opened) / Number(s.sent)) * 100).toFixed(1) : "0",
    clickRate: s.opened > 0 ? ((Number(s.clicked) / Number(s.opened)) * 100).toFixed(1) : "0",
  };
}

/**
 * Get opens by hour for chart
 */
export async function getOpensByHour(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const analytics = await db
    .select({
      hour: emailAnalytics.hourOfDay,
      opens: emailAnalytics.totalOpened,
    })
    .from(emailAnalytics)
    .where(eq(emailAnalytics.userId, userId))
    .orderBy(emailAnalytics.hourOfDay);

  // Fill in missing hours with 0
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    opens: 0,
  }));

  for (const a of analytics) {
    hourlyData[a.hour].opens += a.opens;
  }

  return hourlyData;
}

/**
 * Get opens by day for chart
 */
export async function getOpensByDay(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const dayNames = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

  const analytics = await db
    .select({
      day: emailAnalytics.dayOfWeek,
      opens: sql<number>`SUM(${emailAnalytics.totalOpened})`,
    })
    .from(emailAnalytics)
    .where(eq(emailAnalytics.userId, userId))
    .groupBy(emailAnalytics.dayOfWeek)
    .orderBy(emailAnalytics.dayOfWeek);

  // Fill in missing days with 0
  const dailyData = dayNames.map((name, i) => ({
    day: name,
    opens: 0,
  }));

  for (const a of analytics) {
    dailyData[a.day].opens = Number(a.opens) || 0;
  }

  return dailyData;
}


/**
 * Get statistics by category for virality prediction
 */
export async function getCategoryStats(category: string): Promise<{
  category: string;
  totalSent: number;
  totalOpened: number;
  avgOpenRate: number;
  avgClickRate: number;
}> {
  const db = await getDb();
  if (!db) {
    return { category, totalSent: 0, totalOpened: 0, avgOpenRate: 0.5, avgClickRate: 0.1 };
  }

  try {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as totalSent,
        SUM(CASE WHEN d.status IN ('opened', 'clicked') THEN 1 ELSE 0 END) as totalOpened,
        SUM(CASE WHEN d.status = 'clicked' THEN 1 ELSE 0 END) as totalClicked
      FROM distributions d
      JOIN pressReleases pr ON d.pressReleaseId = pr.id
      WHERE pr.category = ${category}
    `) as any;

    if (!stats || stats.length === 0) {
      return { category, totalSent: 0, totalOpened: 0, avgOpenRate: 0.5, avgClickRate: 0.1 };
    }

    const s = stats[0];
    const totalSent = Number(s.totalSent) || 0;
    const totalOpened = Number(s.totalOpened) || 0;
    const totalClicked = Number(s.totalClicked) || 0;

    return {
      category,
      totalSent,
      totalOpened,
      avgOpenRate: totalSent > 0 ? totalOpened / totalSent : 0.5,
      avgClickRate: totalOpened > 0 ? totalClicked / totalOpened : 0.1,
    };
  } catch (error) {
    console.error("[Email Tracking] Error getting category stats:", error);
    return { category, totalSent: 0, totalOpened: 0, avgOpenRate: 0.5, avgClickRate: 0.1 };
  }
}

/**
 * Get statistics by tone for virality prediction
 */
export async function getToneStats(tone: string): Promise<{
  tone: string;
  totalSent: number;
  totalOpened: number;
  avgOpenRate: number;
  avgClickRate: number;
}> {
  // Tone stats are not tracked in the current schema
  // Return default values based on tone type
  const toneDefaults: Record<string, { avgOpenRate: number; avgClickRate: number }> = {
    formal: { avgOpenRate: 0.45, avgClickRate: 0.08 },
    casual: { avgOpenRate: 0.55, avgClickRate: 0.12 },
    urgent: { avgOpenRate: 0.65, avgClickRate: 0.15 },
    informative: { avgOpenRate: 0.50, avgClickRate: 0.10 },
  };

  const defaults = toneDefaults[tone] || { avgOpenRate: 0.5, avgClickRate: 0.1 };

  return {
    tone,
    totalSent: 0,
    totalOpened: 0,
    ...defaults,
  };
}

/**
 * Get journalist engagement statistics
 */
export async function getJournalistStats(journalistId: number): Promise<{
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  openRate: number;
  clickRate: number;
  lastEngagement: string | null;
  avgResponseTime: number;
  preferredHour: number;
}> {
  const db = await getDb();
  if (!db) {
    return {
      totalSent: 0,
      totalOpened: 0,
      totalClicked: 0,
      openRate: 0,
      clickRate: 0,
      lastEngagement: null,
      avgResponseTime: 24,
      preferredHour: 9,
    };
  }

  try {
    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as totalSent,
        SUM(CASE WHEN status IN ('opened', 'clicked') THEN 1 ELSE 0 END) as totalOpened,
        SUM(CASE WHEN status = 'clicked' THEN 1 ELSE 0 END) as totalClicked,
        MAX(CASE WHEN status IN ('opened', 'clicked') THEN openedAt END) as lastEngagement
      FROM distributions
      WHERE journalistId = ${journalistId}
    `) as any;

    if (!stats || stats.length === 0) {
      return {
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        openRate: 0,
        clickRate: 0,
        lastEngagement: null,
        avgResponseTime: 24,
        preferredHour: 9,
      };
    }

    const s = stats[0];
    const totalSent = Number(s.totalSent) || 0;
    const totalOpened = Number(s.totalOpened) || 0;
    const totalClicked = Number(s.totalClicked) || 0;

    return {
      totalSent,
      totalOpened,
      totalClicked,
      openRate: totalSent > 0 ? totalOpened / totalSent : 0,
      clickRate: totalOpened > 0 ? totalClicked / totalOpened : 0,
      lastEngagement: s.lastEngagement || null,
      avgResponseTime: 24, // Default, would need more data to calculate
      preferredHour: 9, // Default morning hour
    };
  } catch (error) {
    console.error("[Email Tracking] Error getting journalist stats:", error);
    return {
      totalSent: 0,
      totalOpened: 0,
      totalClicked: 0,
      openRate: 0,
      clickRate: 0,
      lastEngagement: null,
      avgResponseTime: 24,
      preferredHour: 9,
    };
  }
}
