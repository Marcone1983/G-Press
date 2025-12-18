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
