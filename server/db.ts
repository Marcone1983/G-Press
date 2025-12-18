import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// TODO: add feature queries here as your schema grows.

// ============================================
// JOURNALIST FUNCTIONS
// ============================================

import { and, sql } from "drizzle-orm";
import { 
  journalists, InsertJournalist,
  pressReleases, InsertPressRelease,
  distributions, InsertDistribution,
  templates, InsertTemplate
} from "../drizzle/schema";

export async function getAllJournalists(filters?: {
  category?: string;
  country?: string;
  search?: string;
  isActive?: boolean;
}) {
  const db = await getDb();
  if (!db) return [];

  let query = db.select().from(journalists);
  
  const conditions = [];
  
  if (filters?.category && filters.category !== 'all') {
    conditions.push(eq(journalists.category, filters.category as any));
  }
  if (filters?.country) {
    conditions.push(eq(journalists.country, filters.country));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(journalists.isActive, filters.isActive));
  }
  if (filters?.search) {
    conditions.push(
      sql`(${journalists.name} LIKE ${`%${filters.search}%`} OR ${journalists.outlet} LIKE ${`%${filters.search}%`} OR ${journalists.email} LIKE ${`%${filters.search}%`})`
    );
  }
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  return query;
}

export async function getJournalistById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(journalists).where(eq(journalists.id, id));
  return result[0] ?? null;
}

export async function createJournalist(data: InsertJournalist) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(journalists).values(data);
  return result[0].insertId;
}

export async function updateJournalist(id: number, data: Partial<InsertJournalist>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(journalists).set(data).where(eq(journalists.id, id));
}

export async function deleteJournalist(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(journalists).where(eq(journalists.id, id));
}

export async function getJournalistCount() {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` }).from(journalists).where(eq(journalists.isActive, true));
  return result[0]?.count ?? 0;
}

export async function bulkCreateJournalists(data: InsertJournalist[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (data.length === 0) return;
  
  const batchSize = 50;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await db.insert(journalists).values(batch).onDuplicateKeyUpdate({
      set: { updatedAt: new Date() }
    });
  }
}

// ============================================
// PRESS RELEASE FUNCTIONS
// ============================================

export async function getAllPressReleases(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(pressReleases).where(eq(pressReleases.userId, userId)).orderBy(sql`${pressReleases.createdAt} DESC`);
}

export async function getPressReleaseById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(pressReleases).where(eq(pressReleases.id, id));
  return result[0] ?? null;
}

export async function createPressRelease(data: InsertPressRelease) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(pressReleases).values(data);
  return result[0].insertId;
}

export async function updatePressRelease(id: number, data: Partial<InsertPressRelease>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(pressReleases).set(data).where(eq(pressReleases.id, id));
}

export async function deletePressRelease(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(pressReleases).where(eq(pressReleases.id, id));
}

// ============================================
// DISTRIBUTION FUNCTIONS
// ============================================

export async function createDistributions(pressReleaseId: number, journalistIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const data: InsertDistribution[] = journalistIds.map(journalistId => ({
    pressReleaseId,
    journalistId,
    status: "pending" as const,
  }));
  
  if (data.length > 0) {
    await db.insert(distributions).values(data);
  }
}

export async function getDistributionsByPressRelease(pressReleaseId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(distributions).where(eq(distributions.pressReleaseId, pressReleaseId));
}

export async function updateDistribution(id: number, data: Partial<InsertDistribution>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(distributions).set(data).where(eq(distributions.id, id));
}

export async function getDistributionStats(pressReleaseId: number) {
  const db = await getDb();
  if (!db) return { total: 0, sent: 0, opened: 0, clicked: 0, failed: 0 };
  
  const result = await db.select({
    status: distributions.status,
    count: sql<number>`count(*)`
  }).from(distributions)
    .where(eq(distributions.pressReleaseId, pressReleaseId))
    .groupBy(distributions.status);
  
  const stats = { total: 0, sent: 0, opened: 0, clicked: 0, failed: 0, pending: 0 };
  result.forEach(row => {
    stats[row.status as keyof typeof stats] = row.count;
    stats.total += row.count;
  });
  
  return stats;
}

// ============================================
// TEMPLATE FUNCTIONS
// ============================================

export async function getAllTemplates(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(templates).where(eq(templates.userId, userId));
}

export async function createTemplate(data: InsertTemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(templates).values(data);
  return result[0].insertId;
}

export async function deleteTemplate(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(templates).where(eq(templates.id, id));
}
