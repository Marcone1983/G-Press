import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Journalists/Media contacts database
 */
export const journalists = mysqlTable("journalists", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  outlet: varchar("outlet", { length: 255 }), // Testata giornalistica
  position: varchar("position", { length: 255 }), // Ruolo (es: Tech Editor)
  category: mysqlEnum("category", [
    "technology",
    "business",
    "finance",
    "health",
    "sports",
    "entertainment",
    "politics",
    "lifestyle",
    "general"
  ]).default("general").notNull(),
  country: varchar("country", { length: 2 }).default("IT"),
  city: varchar("city", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  twitter: varchar("twitter", { length: 100 }),
  linkedin: varchar("linkedin", { length: 255 }),
  verified: boolean("verified").default(false),
  isActive: boolean("isActive").default(true),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Journalist = typeof journalists.$inferSelect;
export type InsertJournalist = typeof journalists.$inferInsert;

/**
 * Press releases / Articles
 */
export const pressReleases = mysqlTable("pressReleases", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  subtitle: varchar("subtitle", { length: 500 }),
  content: text("content").notNull(),
  category: mysqlEnum("category", [
    "technology",
    "business",
    "finance",
    "health",
    "sports",
    "entertainment",
    "politics",
    "lifestyle",
    "general"
  ]).default("general"),
  status: mysqlEnum("status", ["draft", "scheduled", "sending", "sent", "failed"]).default("draft").notNull(),
  boilerplate: text("boilerplate"), // Company description
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  scheduledAt: timestamp("scheduledAt"),
  sentAt: timestamp("sentAt"),
  recipientCount: int("recipientCount").default(0),
  openCount: int("openCount").default(0),
  clickCount: int("clickCount").default(0),
  isAutopilotActive: boolean("isAutopilotActive").default(false), // Active autopilot campaign
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PressRelease = typeof pressReleases.$inferSelect;
export type InsertPressRelease = typeof pressReleases.$inferInsert;

/**
 * Distribution tracking - tracks each email sent
 */
export const distributions = mysqlTable("distributions", {
  id: int("id").autoincrement().primaryKey(),
  pressReleaseId: int("pressReleaseId").notNull(),
  journalistId: int("journalistId").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "delivered", "opened", "clicked", "bounced", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Distribution = typeof distributions.$inferSelect;
export type InsertDistribution = typeof distributions.$inferInsert;

/**
 * Email templates
 */
export const templates = mysqlTable("templates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  subject: varchar("subject", { length: 500 }),
  content: text("content").notNull(),
  isDefault: boolean("isDefault").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Template = typeof templates.$inferSelect;
export type InsertTemplate = typeof templates.$inferInsert;

/**
 * Email events tracking (opens, clicks, bounces from Resend webhooks)
 */
export const emailEvents = mysqlTable("emailEvents", {
  id: int("id").autoincrement().primaryKey(),
  distributionId: int("distributionId").notNull(),
  eventType: mysqlEnum("eventType", ["sent", "delivered", "opened", "clicked", "bounced", "complained", "unsubscribed"]).notNull(),
  emailId: varchar("emailId", { length: 255 }), // Resend email ID
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  userAgent: text("userAgent"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  country: varchar("country", { length: 2 }),
  city: varchar("city", { length: 100 }),
  clickedUrl: text("clickedUrl"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  rawData: json("rawData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailEvent = typeof emailEvents.$inferSelect;
export type InsertEmailEvent = typeof emailEvents.$inferInsert;

/**
 * Email analytics aggregated by hour/day for auto-timing
 */
export const emailAnalytics = mysqlTable("emailAnalytics", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0-6 (Sunday-Saturday)
  hourOfDay: int("hourOfDay").notNull(), // 0-23
  totalSent: int("totalSent").default(0).notNull(),
  totalOpened: int("totalOpened").default(0).notNull(),
  totalClicked: int("totalClicked").default(0).notNull(),
  avgOpenTimeMinutes: int("avgOpenTimeMinutes"), // Average time to open after send
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailAnalytics = typeof emailAnalytics.$inferSelect;
export type InsertEmailAnalytics = typeof emailAnalytics.$inferInsert;

/**
 * Follow-up queue for automatic re-sends
 */
export const followUpQueue = mysqlTable("followUpQueue", {
  id: int("id").autoincrement().primaryKey(),
  distributionId: int("distributionId").notNull(),
  pressReleaseId: int("pressReleaseId").notNull(),
  journalistId: int("journalistId").notNull(),
  followUpNumber: int("followUpNumber").default(1).notNull(), // 1st, 2nd, 3rd follow-up
  scheduledAt: timestamp("scheduledAt").notNull(),
  status: mysqlEnum("status", ["pending", "sent", "cancelled", "skipped"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FollowUpQueue = typeof followUpQueue.$inferSelect;
export type InsertFollowUpQueue = typeof followUpQueue.$inferInsert;


/**
 * Intelligent send patterns - stores learned patterns for optimal sending
 * This data is PERMANENT and never deleted
 */
export const sendPatterns = mysqlTable("sendPatterns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  country: varchar("country", { length: 2 }).notNull(), // IT, US, UK, etc.
  category: mysqlEnum("category", [
    "technology", "business", "finance", "health", "sports",
    "entertainment", "politics", "lifestyle", "general"
  ]).default("general").notNull(),
  dayOfWeek: int("dayOfWeek").notNull(), // 0=Sunday, 1=Monday, etc.
  hourOfDay: int("hourOfDay").notNull(), // 0-23
  totalSent: int("totalSent").default(0).notNull(),
  totalOpened: int("totalOpened").default(0).notNull(),
  totalClicked: int("totalClicked").default(0).notNull(),
  openRate: int("openRate").default(0).notNull(), // Percentage * 100 for precision
  clickRate: int("clickRate").default(0).notNull(), // Percentage * 100
  score: int("score").default(0).notNull(), // Calculated optimal score
  lastUpdated: timestamp("lastUpdated").defaultNow().onUpdateNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SendPattern = typeof sendPatterns.$inferSelect;
export type InsertSendPattern = typeof sendPatterns.$inferInsert;

/**
 * Autopilot campaigns - tracks active autopilot runs
 */
export const autopilotCampaigns = mysqlTable("autopilotCampaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pressReleaseId: int("pressReleaseId").notNull(),
  status: mysqlEnum("status", ["active", "paused", "completed", "cancelled"]).default("active").notNull(),
  totalJournalists: int("totalJournalists").default(0).notNull(),
  sentCount: int("sentCount").default(0).notNull(),
  openedCount: int("openedCount").default(0).notNull(),
  dailyBatchSize: int("dailyBatchSize").default(1286).notNull(), // 9000/7
  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
  lastBatchAt: timestamp("lastBatchAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AutopilotCampaign = typeof autopilotCampaigns.$inferSelect;
export type InsertAutopilotCampaign = typeof autopilotCampaigns.$inferInsert;
