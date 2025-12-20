import { eq, and, sql, notInArray, desc, asc } from "drizzle-orm";
import { getDb } from "./db.js";
import { 
  pressReleases, 
  journalists, 
  distributions, 
  sendPatterns,
  autopilotCampaigns,
  emailEvents
} from "../drizzle/schema.js";

const DEFAULT_DAILY_BATCH = 1286; // 9000 / 7

// Timezone offsets for major regions (hours from UTC)
const TIMEZONE_OFFSETS: Record<string, number> = {
  IT: 1, ES: 1, FR: 1, DE: 1, NL: 1, BE: 1, AT: 1, CH: 1, // Central Europe
  UK: 0, IE: 0, PT: 0, // Western Europe
  US: -5, CA: -5, // Eastern US/Canada (average)
  BR: -3, AR: -3, // South America
  JP: 9, KR: 9, // East Asia
  AU: 10, NZ: 12, // Oceania
  IN: 5.5, // India
  AE: 4, SA: 3, // Middle East
  ZA: 2, // South Africa
};

/**
 * Get the best hour to send to a specific country based on learned patterns
 * Returns local time that historically has best open rates
 */
export async function getBestSendHour(userId: number, country: string, category: string = "general") {
  const db = await getDb();
  if (!db) return { dayOfWeek: 2, hourOfDay: 9 }; // Default: Tuesday 9am

  // Get patterns for this country/category, sorted by score
  const patterns = await db
    .select()
    .from(sendPatterns)
    .where(
      and(
        eq(sendPatterns.userId, userId),
        eq(sendPatterns.country, country),
        sql`${sendPatterns.category} = ${category}`
      )
    )
    .orderBy(desc(sendPatterns.score))
    .limit(1);

  if (patterns.length > 0 && patterns[0].totalSent >= 10) {
    // We have enough data, use learned pattern
    return {
      dayOfWeek: patterns[0].dayOfWeek,
      hourOfDay: patterns[0].hourOfDay,
      confidence: Math.min(patterns[0].totalSent / 100, 1), // 0-1 confidence
      openRate: patterns[0].openRate / 100
    };
  }

  // Not enough data, use smart defaults based on timezone
  const offset = TIMEZONE_OFFSETS[country] || 0;
  // Target 9-10am local time
  const utcHour = (9 - offset + 24) % 24;
  
  return {
    dayOfWeek: 2, // Tuesday (generally best for B2B)
    hourOfDay: utcHour,
    confidence: 0,
    openRate: 0
  };
}

/**
 * Update send patterns after an email event (open, click, etc.)
 * This is the LEARNING function - called every time we get feedback
 */
export async function updateSendPattern(
  userId: number,
  country: string,
  category: string,
  dayOfWeek: number,
  hourOfDay: number,
  eventType: "sent" | "opened" | "clicked"
) {
  const db = await getDb();
  if (!db) return;

  // Find or create pattern record
  const existing = await db
    .select()
    .from(sendPatterns)
    .where(
      and(
        eq(sendPatterns.userId, userId),
        eq(sendPatterns.country, country),
        sql`${sendPatterns.category} = ${category}`,
        eq(sendPatterns.dayOfWeek, dayOfWeek),
        eq(sendPatterns.hourOfDay, hourOfDay)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing pattern
    const pattern = existing[0];
    const newTotalSent = eventType === "sent" ? pattern.totalSent + 1 : pattern.totalSent;
    const newTotalOpened = eventType === "opened" ? pattern.totalOpened + 1 : pattern.totalOpened;
    const newTotalClicked = eventType === "clicked" ? pattern.totalClicked + 1 : pattern.totalClicked;
    
    // Calculate rates (stored as percentage * 100 for precision)
    const newOpenRate = newTotalSent > 0 ? Math.round((newTotalOpened / newTotalSent) * 10000) : 0;
    const newClickRate = newTotalSent > 0 ? Math.round((newTotalClicked / newTotalSent) * 10000) : 0;
    
    // Calculate score: weighted combination of open rate and volume
    // Score = openRate * log(totalSent + 1) to balance quality and quantity
    const newScore = Math.round(newOpenRate * Math.log10(newTotalSent + 1));

    await db
      .update(sendPatterns)
      .set({
        totalSent: newTotalSent,
        totalOpened: newTotalOpened,
        totalClicked: newTotalClicked,
        openRate: newOpenRate,
        clickRate: newClickRate,
        score: newScore
      })
      .where(eq(sendPatterns.id, pattern.id));
  } else {
    // Create new pattern
    const totalSent = eventType === "sent" ? 1 : 0;
    const totalOpened = eventType === "opened" ? 1 : 0;
    const totalClicked = eventType === "clicked" ? 1 : 0;

    await db.insert(sendPatterns).values({
      userId,
      country,
      category: category as any,
      dayOfWeek,
      hourOfDay,
      totalSent,
      totalOpened,
      totalClicked,
      openRate: 0,
      clickRate: 0,
      score: 0
    });
  }
}

/**
 * Get journalists to send to, optimized by country/timezone
 * Groups journalists by country and returns those whose optimal send time is NOW
 */
export async function getOptimalBatchForNow(
  userId: number,
  pressReleaseId: number,
  maxBatchSize: number = DEFAULT_DAILY_BATCH
) {
  const db = await getDb();
  if (!db) return [];

  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDay();

  // Get IDs of journalists who already received this press release
  const sentDistributions = await db
    .select({ journalistId: distributions.journalistId })
    .from(distributions)
    .where(eq(distributions.pressReleaseId, pressReleaseId));

  const sentIds = sentDistributions.map(d => d.journalistId);

  // Get all unsent journalists grouped by country
  let unsentQuery = db
    .select()
    .from(journalists)
    .where(eq(journalists.isActive, true));

  if (sentIds.length > 0) {
    unsentQuery = db
      .select()
      .from(journalists)
      .where(
        and(
          eq(journalists.isActive, true),
          notInArray(journalists.id, sentIds)
        )
      );
  }

  const unsentJournalists = await unsentQuery;

  // Group by country
  const byCountry: Record<string, typeof unsentJournalists> = {};
  for (const j of unsentJournalists) {
    const country = j.country || "IT";
    if (!byCountry[country]) byCountry[country] = [];
    byCountry[country].push(j);
  }

  // For each country, check if NOW is a good time to send
  const toSendNow: typeof unsentJournalists = [];

  for (const [country, countryJournalists] of Object.entries(byCountry)) {
    const bestTime = await getBestSendHour(userId, country, "general");
    
    // Check if current hour is within 1 hour of best time
    const hourDiff = Math.abs(currentHour - bestTime.hourOfDay);
    const dayMatch = (bestTime.confidence || 0) < 0.5 || currentDay === bestTime.dayOfWeek;
    
    if (hourDiff <= 1 && dayMatch) {
      // Good time to send to this country!
      toSendNow.push(...countryJournalists);
    }
  }

  // If we don't have enough for optimal timing, add some anyway
  // (to ensure we hit daily quota)
  if (toSendNow.length < maxBatchSize) {
    const remaining = maxBatchSize - toSendNow.length;
    const toSendIds = new Set(toSendNow.map(j => j.id));
    
    for (const j of unsentJournalists) {
      if (!toSendIds.has(j.id)) {
        toSendNow.push(j);
        if (toSendNow.length >= maxBatchSize) break;
      }
    }
  }

  return toSendNow.slice(0, maxBatchSize);
}

/**
 * Start an autopilot campaign
 */
export async function startAutopilot(userId: number, pressReleaseId: number) {
  const db = await getDb();
  if (!db) return null;

  // Count total journalists
  const totalCount = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(journalists)
    .where(eq(journalists.isActive, true));

  const total = Number(totalCount[0]?.count) || 0;

  // Create campaign
  const result = await db.insert(autopilotCampaigns).values({
    userId,
    pressReleaseId,
    status: "active",
    totalJournalists: total,
    sentCount: 0,
    openedCount: 0,
    dailyBatchSize: DEFAULT_DAILY_BATCH
  });

  // Mark press release as autopilot active
  await db
    .update(pressReleases)
    .set({ isAutopilotActive: true })
    .where(eq(pressReleases.id, pressReleaseId));

  return { campaignId: (result as any).insertId || 0, totalJournalists: total };
}

/**
 * Get autopilot status
 */
export async function getAutopilotStatus(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const campaign = await db
    .select()
    .from(autopilotCampaigns)
    .where(
      and(
        eq(autopilotCampaigns.userId, userId),
        eq(autopilotCampaigns.status, "active")
      )
    )
    .limit(1);

  if (campaign.length === 0) {
    return { active: false };
  }

  const c = campaign[0];
  const progress = c.totalJournalists > 0 
    ? Math.round((c.sentCount / c.totalJournalists) * 100) 
    : 0;
  const daysRemaining = Math.ceil((c.totalJournalists - c.sentCount) / c.dailyBatchSize);

  // Get press release info
  const pr = await db
    .select({ title: pressReleases.title })
    .from(pressReleases)
    .where(eq(pressReleases.id, c.pressReleaseId))
    .limit(1);

  return {
    active: true,
    campaignId: c.id,
    pressReleaseId: c.pressReleaseId,
    pressReleaseTitle: pr[0]?.title || "Unknown",
    totalJournalists: c.totalJournalists,
    sentCount: c.sentCount,
    openedCount: c.openedCount,
    progress,
    daysRemaining,
    dailyBatchSize: c.dailyBatchSize,
    startedAt: c.startedAt,
    lastBatchAt: c.lastBatchAt
  };
}

/**
 * Pause or resume autopilot
 */
export async function toggleAutopilot(userId: number, pause: boolean) {
  const db = await getDb();
  if (!db) return;

  await db
    .update(autopilotCampaigns)
    .set({ status: pause ? "paused" : "active" })
    .where(
      and(
        eq(autopilotCampaigns.userId, userId),
        eq(autopilotCampaigns.status, pause ? "active" : "paused")
      )
    );
}

/**
 * Stop autopilot completely
 */
export async function stopAutopilot(userId: number) {
  const db = await getDb();
  if (!db) return;

  const campaign = await db
    .select()
    .from(autopilotCampaigns)
    .where(
      and(
        eq(autopilotCampaigns.userId, userId),
        eq(autopilotCampaigns.status, "active")
      )
    )
    .limit(1);

  if (campaign.length > 0) {
    await db
      .update(autopilotCampaigns)
      .set({ status: "cancelled", completedAt: new Date() })
      .where(eq(autopilotCampaigns.id, campaign[0].id));

    await db
      .update(pressReleases)
      .set({ isAutopilotActive: false })
      .where(eq(pressReleases.id, campaign[0].pressReleaseId));
  }
}

/**
 * Get learning statistics - how much the system has learned
 */
export async function getLearningStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const patterns = await db
    .select({
      totalPatterns: sql<number>`COUNT(*)`,
      totalDataPoints: sql<number>`SUM(totalSent)`,
      avgOpenRate: sql<number>`AVG(openRate)`,
      countriesCovered: sql<number>`COUNT(DISTINCT country)`
    })
    .from(sendPatterns)
    .where(eq(sendPatterns.userId, userId));

  const p = patterns[0];
  const dataPoints = Number(p?.totalDataPoints) || 0;
  
  // Calculate confidence level based on data points
  let confidenceLevel: "learning" | "improving" | "optimized" | "expert";
  if (dataPoints < 100) confidenceLevel = "learning";
  else if (dataPoints < 500) confidenceLevel = "improving";
  else if (dataPoints < 2000) confidenceLevel = "optimized";
  else confidenceLevel = "expert";

  return {
    totalPatterns: Number(p?.totalPatterns) || 0,
    totalDataPoints: dataPoints,
    avgOpenRate: (Number(p?.avgOpenRate) || 0) / 100, // Convert back to percentage
    countriesCovered: Number(p?.countriesCovered) || 0,
    confidenceLevel,
    confidenceDescription: {
      learning: "Raccogliendo dati iniziali...",
      improving: "Pattern emergenti rilevati",
      optimized: "Ottimizzazione attiva",
      expert: "Sistema esperto - massima precisione"
    }[confidenceLevel]
  };
}
