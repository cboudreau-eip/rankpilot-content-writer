import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, InsertProject, articles, InsertArticle, outlines, InsertOutline } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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

// ---- User Helpers ----

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
      values.role = 'admin';
      updateSet.role = 'admin';
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

// ---- Project Helpers ----

export async function getProjectsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
  return result;
}

export async function getProjectById(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createProject(data: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(data);
  const insertId = result[0].insertId;
  return getProjectById(insertId);
}

export async function updateProject(projectId: number, data: Partial<Pick<InsertProject, "name" | "color" | "domain" | "description">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(eq(projects.id, projectId));
  return getProjectById(projectId);
}

export async function deleteProject(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projects).where(eq(projects.id, projectId));
  return { success: true };
}

// ---- Outline Helpers ----

export async function getOutlinesByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(outlines).where(eq(outlines.projectId, projectId)).orderBy(desc(outlines.updatedAt));
}

export async function getOutlinesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(outlines).where(eq(outlines.userId, userId)).orderBy(desc(outlines.updatedAt));
}

export async function getOutlineById(outlineId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(outlines).where(eq(outlines.id, outlineId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOutline(data: InsertOutline) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(outlines).values(data);
  return getOutlineById(result[0].insertId);
}

export async function updateOutline(outlineId: number, data: Partial<Pick<InsertOutline, "title" | "keyword" | "sections" | "settings" | "status">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(outlines).set(data).where(eq(outlines.id, outlineId));
  return getOutlineById(outlineId);
}

export async function deleteOutline(outlineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(outlines).where(eq(outlines.id, outlineId));
  return { success: true };
}

// ---- Article Helpers ----

export async function getArticlesByProject(projectId: number, statusFilter?: string) {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter && statusFilter !== "all") {
    return db.select().from(articles)
      .where(and(eq(articles.projectId, projectId), eq(articles.status, statusFilter as any)))
      .orderBy(desc(articles.updatedAt));
  }
  return db.select().from(articles).where(eq(articles.projectId, projectId)).orderBy(desc(articles.updatedAt));
}

export async function getArticlesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(articles).where(eq(articles.userId, userId)).orderBy(desc(articles.updatedAt));
}

export async function getArticleById(articleId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createArticle(data: InsertArticle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(articles).values(data);
  return getArticleById(result[0].insertId);
}

export async function updateArticle(articleId: number, data: Partial<Pick<InsertArticle, "title" | "content" | "excerpt" | "keyword" | "keywords" | "metaTitle" | "metaDescription" | "slug" | "wordCount" | "status" | "contentType">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(articles).set(data).where(eq(articles.id, articleId));
  return getArticleById(articleId);
}

export async function deleteArticle(articleId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(articles).where(eq(articles.id, articleId));
  return { success: true };
}

export async function getArticleStats(projectId: number) {
  const db = await getDb();
  if (!db) return { total: 0, draft: 0, review: 0, complete: 0, published: 0, totalWords: 0 };
  const result = await db.select({
    status: articles.status,
    count: sql<number>`count(*)`,
    words: sql<number>`COALESCE(sum(${articles.wordCount}), 0)`,
  }).from(articles).where(eq(articles.projectId, projectId)).groupBy(articles.status);

  const stats = { total: 0, draft: 0, review: 0, complete: 0, published: 0, totalWords: 0 };
  for (const row of result) {
    const count = Number(row.count);
    const words = Number(row.words);
    stats.total += count;
    stats.totalWords += words;
    if (row.status === "draft") stats.draft = count;
    if (row.status === "review") stats.review = count;
    if (row.status === "complete") stats.complete = count;
    if (row.status === "published") stats.published = count;
  }
  return stats;
}
