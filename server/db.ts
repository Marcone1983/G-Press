import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema.js";
import { ENV } from "./_core/env.js";

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
} from "../drizzle/schema.js";

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


// ============================================
// AI ARTICLE CACHE FUNCTIONS
// ============================================

import crypto from "crypto";

function hashInput(input: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

export async function getCachedArticle(userId: number, input: unknown) {
  const db = await getDb();
  if (!db) return null;
  
  const inputHash = hashInput(input);
  
  // Check if we have a cached article that's less than 7 days old
  const result = await db.execute(sql`
    SELECT * FROM ai_articles_cache 
    WHERE user_id = ${userId} 
    AND input_hash = ${inputHash}
    AND created_at > DATE_SUB(NOW(), INTERVAL 7 DAY)
    ORDER BY created_at DESC
    LIMIT 1
  `);
  
  const rows = (result as any)[0] as any[];
  if (rows && rows.length > 0) {
    const row = rows[0];
    return {
      id: row.id,
      title: row.title,
      subtitle: row.subtitle,
      content: row.content,
      tags: JSON.parse(row.tags || "[]"),
      suggestedCategories: JSON.parse(row.suggested_categories || "[]"),
      estimatedReadTime: row.estimated_read_time,
    };
  }
  
  return null;
}

export async function cacheArticle(userId: number, input: unknown, article: {
  title: string;
  subtitle: string;
  content: string;
  tags: string[];
  suggestedCategories: string[];
  estimatedReadTime: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const inputHash = hashInput(input);
  
  const result = await db.execute(sql`
    INSERT INTO ai_articles_cache 
    (user_id, input_hash, title, subtitle, content, tags, suggested_categories, estimated_read_time, status)
    VALUES (
      ${userId},
      ${inputHash},
      ${article.title},
      ${article.subtitle},
      ${article.content},
      ${JSON.stringify(article.tags)},
      ${JSON.stringify(article.suggestedCategories)},
      ${article.estimatedReadTime},
      'draft'
    )
  `);
  
  return (result[0] as any).insertId;
}

export async function getUserArticles(userId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  
  let query = sql`SELECT * FROM ai_articles_cache WHERE user_id = ${userId}`;
  if (status) {
    query = sql`SELECT * FROM ai_articles_cache WHERE user_id = ${userId} AND status = ${status}`;
  }
  query = sql`${query} ORDER BY created_at DESC`;
  
  const result = await db.execute(query);
  const rows = (result as any)[0] as any[];
  
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    subtitle: row.subtitle,
    content: row.content,
    tags: JSON.parse(row.tags || "[]"),
    suggestedCategories: JSON.parse(row.suggested_categories || "[]"),
    estimatedReadTime: row.estimated_read_time,
    status: row.status,
    createdAt: row.created_at,
  }));
}

export async function updateArticleStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.execute(sql`UPDATE ai_articles_cache SET status = ${status} WHERE id = ${id}`);
}

export async function deleteArticle(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.execute(sql`DELETE FROM ai_articles_cache WHERE id = ${id}`);
}

// ============================================
// KNOWLEDGE BASE FUNCTIONS
// ============================================

export async function getKnowledgeDocuments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db.execute(sql`
    SELECT * FROM knowledge_documents 
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
  `);
  
  const rows = (result as any)[0] as any[];
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    content: row.content,
    category: row.category,
    fileType: row.file_type,
    fileSize: row.file_size,
    createdAt: row.created_at,
  }));
}

export async function createKnowledgeDocument(userId: number, data: {
  name: string;
  content: string;
  category?: string;
  fileType?: string;
  fileSize?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.execute(sql`
    INSERT INTO knowledge_documents 
    (user_id, name, content, category, file_type, file_size)
    VALUES (
      ${userId},
      ${data.name},
      ${data.content},
      ${data.category || "general"},
      ${data.fileType || "text"},
      ${data.fileSize || 0}
    )
  `);
  
  return (result[0] as any).insertId;
}

export async function deleteKnowledgeDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.execute(sql`DELETE FROM knowledge_documents WHERE id = ${id}`);
}

export async function getCompanyInfo(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.execute(sql`
    SELECT * FROM company_info WHERE user_id = ${userId} LIMIT 1
  `);
  
  const rows = (result as any)[0] as any[];
  if (rows && rows.length > 0) {
    const row = rows[0];
    return {
      name: row.name,
      ceo: row.ceo,
      industry: row.industry,
      products: JSON.parse(row.products || "[]"),
      strengths: JSON.parse(row.strengths || "[]"),
      boilerplate: row.boilerplate,
      website: row.website,
    };
  }
  
  return null;
}

export async function saveCompanyInfo(userId: number, data: {
  name: string;
  ceo?: string;
  industry?: string;
  products?: string[];
  strengths?: string[];
  boilerplate?: string;
  website?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Try to update first, if no rows affected, insert
  const updateResult = await db.execute(sql`
    UPDATE company_info SET
      name = ${data.name},
      ceo = ${data.ceo || null},
      industry = ${data.industry || null},
      products = ${JSON.stringify(data.products || [])},
      strengths = ${JSON.stringify(data.strengths || [])},
      boilerplate = ${data.boilerplate || null},
      website = ${data.website || null}
    WHERE user_id = ${userId}
  `);
  
  if ((updateResult[0] as any).affectedRows === 0) {
    await db.execute(sql`
      INSERT INTO company_info 
      (user_id, name, ceo, industry, products, strengths, boilerplate, website)
      VALUES (
        ${userId},
        ${data.name},
        ${data.ceo || null},
        ${data.industry || null},
        ${JSON.stringify(data.products || [])},
        ${JSON.stringify(data.strengths || [])},
        ${data.boilerplate || null},
        ${data.website || null}
      )
    `);
  }
}
