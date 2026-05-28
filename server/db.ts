import { eq, desc, and, sql, like, inArray, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, projects, InsertProject, articles, InsertArticle, outlines, InsertOutline, outlineVersions, InsertOutlineVersion, sitemaps, InsertSitemap, citationSources, InsertCitationSource, scheduledJobs, InsertScheduledJob, keywordQueue, InsertKeywordQueueItem, jobRunHistory, InsertJobRunHistoryEntry, schedulerRunLogs, InsertSchedulerRunLog, projectKeywords, InsertProjectKeyword, ideas, InsertIdea, pipelineJobs, InsertPipelineJob, pipelineSettings, InsertPipelineSettings, pipelineBriefs, InsertPipelineBrief } from "../drizzle/schema";
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

export async function updateProject(projectId: number, data: Partial<Pick<InsertProject, "name" | "color" | "domain" | "description" | "icpPrimaryName" | "icpWhoTheyAre" | "icpPains" | "icpGoals" | "icpObjections" | "icpDecisionTriggers" | "icpTrustSignals" | "bannedPhrases">>) {
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

// ---- ICP Profile Helpers ----

import { icpProfiles, InsertICPProfile, brandVoices, InsertBrandVoice, ctaTemplates, InsertCTATemplate } from "../drizzle/schema";

export async function getICPsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(icpProfiles).where(eq(icpProfiles.projectId, projectId)).orderBy(desc(icpProfiles.updatedAt));
}

export async function getICPById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(icpProfiles).where(eq(icpProfiles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createICP(data: InsertICPProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(icpProfiles).values(data);
  return getICPById(result[0].insertId);
}

export async function updateICP(id: number, data: Partial<Omit<InsertICPProfile, "id" | "projectId" | "userId" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(icpProfiles).set(data).where(eq(icpProfiles.id, id));
  return getICPById(id);
}

export async function deleteICP(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(icpProfiles).where(eq(icpProfiles.id, id));
  return { success: true };
}

// ---- Brand Voice Helpers ----

export async function getBrandVoicesByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brandVoices).where(eq(brandVoices.projectId, projectId)).orderBy(desc(brandVoices.updatedAt));
}

export async function getBrandVoiceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(brandVoices).where(eq(brandVoices.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createBrandVoice(data: InsertBrandVoice) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(brandVoices).values(data);
  return getBrandVoiceById(result[0].insertId);
}

export async function updateBrandVoice(id: number, data: Partial<Omit<InsertBrandVoice, "id" | "projectId" | "userId" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(brandVoices).set(data).where(eq(brandVoices.id, id));
  return getBrandVoiceById(id);
}

export async function deleteBrandVoice(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(brandVoices).where(eq(brandVoices.id, id));
  return { success: true };
}

// ---- CTA Template Helpers ----

export async function getCTAsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ctaTemplates).where(eq(ctaTemplates.projectId, projectId)).orderBy(desc(ctaTemplates.updatedAt));
}

export async function getCTAById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ctaTemplates).where(eq(ctaTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCTA(data: InsertCTATemplate) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ctaTemplates).values(data);
  return getCTAById(result[0].insertId);
}

export async function updateCTA(id: number, data: Partial<Omit<InsertCTATemplate, "id" | "projectId" | "userId" | "createdAt" | "updatedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ctaTemplates).set(data).where(eq(ctaTemplates.id, id));
  return getCTAById(id);
}

export async function deleteCTA(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ctaTemplates).where(eq(ctaTemplates.id, id));
  return { success: true };
}

// ---- Sitemap Helpers ----

export async function getSitemapsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sitemaps).where(eq(sitemaps.projectId, projectId)).orderBy(desc(sitemaps.createdAt));
}

export async function getSitemapById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(sitemaps).where(eq(sitemaps.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSitemap(data: InsertSitemap) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sitemaps).values(data);
  return getSitemapById(result[0].insertId);
}

export async function updateSitemap(id: number, data: Partial<Pick<InsertSitemap, "url" | "parsedUrls" | "urlCount" | "lastParsed">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sitemaps).set(data).where(eq(sitemaps.id, id));
  return getSitemapById(id);
}

export async function deleteSitemap(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sitemaps).where(eq(sitemaps.id, id));
  return { success: true };
}

// ---- Citation Source Helpers ----

export async function getCitationsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(citationSources).where(eq(citationSources.projectId, projectId)).orderBy(desc(citationSources.createdAt));
}

export async function getCitationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(citationSources).where(eq(citationSources.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createCitation(data: InsertCitationSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(citationSources).values(data);
  return getCitationById(result[0].insertId);
}

export async function updateCitation(id: number, data: Partial<Pick<InsertCitationSource, "name" | "url" | "description" | "category">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(citationSources).set(data).where(eq(citationSources.id, id));
  return getCitationById(id);
}

export async function deleteCitation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(citationSources).where(eq(citationSources.id, id));
  return { success: true };
}

// ---- Cross Check (Reference Doc) Helpers ----

export async function updateProjectReferenceDocMeta(projectId: number, s3Key: string | null, docName: string | null, docLength: number | null, docContent: string | null = null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set({
    referenceDocS3Key: s3Key,
    referenceDocName: docName,
    referenceDocLength: docLength,
    referenceDocContent: docContent,
  }).where(eq(projects.id, projectId));
  return getProjectById(projectId);
}


// ---- Scheduled Jobs Helpers ----

export async function getScheduledJobsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduledJobs).where(eq(scheduledJobs.projectId, projectId)).orderBy(desc(scheduledJobs.createdAt));
}

export async function getScheduledJobsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduledJobs).where(eq(scheduledJobs.userId, userId)).orderBy(desc(scheduledJobs.createdAt));
}

export async function getScheduledJobById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(scheduledJobs).where(eq(scheduledJobs.id, id));
  return rows[0] ?? null;
}

export async function createScheduledJob(data: InsertScheduledJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scheduledJobs).values(data);
  const id = result[0].insertId;
  return getScheduledJobById(id);
}

export async function updateScheduledJob(id: number, data: Partial<Pick<InsertScheduledJob, "name" | "keywordSource" | "frequency" | "dayOfWeek" | "dayOfMonth" | "hourUtc" | "articleSettings" | "status" | "totalGenerated" | "lastRunAt" | "nextRunAt" | "isRunning">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(scheduledJobs).set(data).where(eq(scheduledJobs.id, id));
  return getScheduledJobById(id);
}

export async function deleteScheduledJob(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete associated keyword queue items and run history
  await db.delete(keywordQueue).where(eq(keywordQueue.jobId, id));
  await db.delete(jobRunHistory).where(eq(jobRunHistory.jobId, id));
  await db.delete(scheduledJobs).where(eq(scheduledJobs.id, id));
}

/** Get all active jobs that are due to run (nextRunAt <= now and not currently running) */
export async function getDueScheduledJobs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scheduledJobs).where(
    and(
      eq(scheduledJobs.status, "active"),
      eq(scheduledJobs.isRunning, 0),
      sql`${scheduledJobs.nextRunAt} <= NOW()`
    )
  );
}

// ---- Keyword Queue Helpers ----

export async function getKeywordQueueByJob(jobId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(keywordQueue).where(eq(keywordQueue.jobId, jobId)).orderBy(keywordQueue.sortOrder);
}

export async function getKeywordQueueItemById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(keywordQueue).where(eq(keywordQueue.id, id));
  return rows[0] ?? null;
}

export async function addKeywordToQueue(data: InsertKeywordQueueItem) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(keywordQueue).values(data);
  const id = result[0].insertId;
  return getKeywordQueueItemById(id);
}

export async function addKeywordsToQueue(items: InsertKeywordQueueItem[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return [];
  await db.insert(keywordQueue).values(items);
  return getKeywordQueueByJob(items[0].jobId);
}

export async function updateKeywordQueueItem(id: number, data: Partial<Pick<InsertKeywordQueueItem, "keyword" | "secondaryKeywords" | "sortOrder" | "status" | "generatedArticleId" | "errorMessage" | "processedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(keywordQueue).set(data).where(eq(keywordQueue.id, id));
  return getKeywordQueueItemById(id);
}

export async function deleteKeywordQueueItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(keywordQueue).where(eq(keywordQueue.id, id));
}

/** Get the next pending keyword in the queue for a job */
export async function getNextPendingKeyword(jobId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(keywordQueue)
    .where(and(eq(keywordQueue.jobId, jobId), eq(keywordQueue.status, "pending")))
    .orderBy(keywordQueue.sortOrder)
    .limit(1);
  return rows[0] ?? null;
}

/** Count pending keywords in a job's queue */
export async function countPendingKeywords(jobId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ count: sql<number>`COUNT(*)` }).from(keywordQueue)
    .where(and(eq(keywordQueue.jobId, jobId), eq(keywordQueue.status, "pending")));
  return rows[0]?.count ?? 0;
}

// ---- Job Run History Helpers ----

export async function getJobRunHistory(jobId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(jobRunHistory).where(eq(jobRunHistory.jobId, jobId)).orderBy(desc(jobRunHistory.startedAt)).limit(limit);
}

export async function getJobRunHistoryById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(jobRunHistory).where(eq(jobRunHistory.id, id));
  return rows[0] ?? null;
}

export async function createJobRunHistoryEntry(data: InsertJobRunHistoryEntry) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobRunHistory).values(data);
  const id = result[0].insertId;
  return getJobRunHistoryById(id);
}

export async function updateJobRunHistoryEntry(id: number, data: Partial<Pick<InsertJobRunHistoryEntry, "status" | "articleId" | "outlineId" | "errorMessage" | "durationMs" | "completedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(jobRunHistory).set(data).where(eq(jobRunHistory.id, id));
  return getJobRunHistoryById(id);
}

// ── Scheduler Run Logs ──────────────────────────────────────────────

export async function addSchedulerRunLog(data: { runId: number; jobId: number; step: string; level?: string; message: string; metadata?: Record<string, any> }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  try {
    await db.insert(schedulerRunLogs).values({
      runId: data.runId,
      jobId: data.jobId,
      step: data.step,
      level: data.level ?? "info",
      message: data.message,
      metadata: data.metadata ?? null,
    });
  } catch (err) {
    console.warn("[Scheduler] Failed to write run log:", err);
  }
}

export async function getSchedulerRunLogs(jobId: number, limit = 200) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(schedulerRunLogs).where(eq(schedulerRunLogs.jobId, jobId)).orderBy(desc(schedulerRunLogs.id)).limit(limit);
}

export async function getSchedulerRunLogsByRunId(runId: number, limit = 200) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(schedulerRunLogs).where(eq(schedulerRunLogs.runId, runId)).orderBy(schedulerRunLogs.id).limit(limit);
}


// ---- Project Keywords Helpers ----

/**
 * Calculate priority score (0-100) from volume, competition, and CPC.
 * High volume + low competition + decent CPC = higher priority.
 */
export function calculateKeywordPriority(volume: number, competition: number, cpc: number): { priority: number; priorityLabel: "High" | "Med" | "Low" } {
  // Volume score: 0-40 (log scale to handle wide range)
  let volumeScore = 0;
  if (volume > 0) {
    volumeScore = Math.min(40, Math.round((Math.log10(volume) / Math.log10(100000)) * 40));
  }
  // Competition score: 0-30 (lower competition = higher score)
  const competitionScore = Math.round((1 - competition) * 30);
  // CPC score: 0-30 (higher CPC = higher commercial value)
  let cpcScore = 0;
  if (cpc > 0) {
    cpcScore = Math.min(30, Math.round((Math.log10(cpc + 1) / Math.log10(50)) * 30));
  }
  const priority = Math.min(100, volumeScore + competitionScore + cpcScore);
  const priorityLabel: "High" | "Med" | "Low" = priority >= 66 ? "High" : priority >= 33 ? "Med" : "Low";
  return { priority, priorityLabel };
}

export async function getProjectKeywordsList(projectId: number, search?: string, sortBy?: string, sortDir?: "asc" | "desc") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(projectKeywords.projectId, projectId)];
  if (search && search.trim()) {
    conditions.push(like(projectKeywords.keyword, `%${search.trim()}%`));
  }
  const orderCol = sortBy === "volume" ? projectKeywords.volume
    : sortBy === "cpc" ? projectKeywords.cpc
    : sortBy === "competition" ? projectKeywords.competition
    : sortBy === "keyword" ? projectKeywords.keyword
    : projectKeywords.priority;
  const orderFn = sortDir === "asc" ? asc : desc;
  return db.select().from(projectKeywords).where(and(...conditions)).orderBy(orderFn(orderCol));
}

export async function getProjectKeywordById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(projectKeywords).where(eq(projectKeywords.id, id));
  return row ?? null;
}

export async function addProjectKeyword(data: InsertProjectKeyword) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(projectKeywords).values(data).$returningId();
  return result;
}

export async function addProjectKeywordsBulk(rows: InsertProjectKeyword[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (rows.length === 0) return { inserted: 0, skipped: 0 };

  let inserted = 0;
  let skipped = 0;
  // Insert one-by-one to handle duplicate (projectId, keyword) gracefully
  for (const row of rows) {
    try {
      // Check if keyword already exists for this project
      const [existing] = await db.select({ id: projectKeywords.id })
        .from(projectKeywords)
        .where(and(
          eq(projectKeywords.projectId, row.projectId),
          eq(projectKeywords.keyword, row.keyword),
        ));
      if (existing) {
        skipped++;
        continue;
      }
      await db.insert(projectKeywords).values(row);
      inserted++;
    } catch {
      skipped++;
    }
  }
  return { inserted, skipped };
}

export async function deleteProjectKeyword(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectKeywords).where(eq(projectKeywords.id, id));
}

export async function deleteProjectKeywordsBulk(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  await db.delete(projectKeywords).where(inArray(projectKeywords.id, ids));
}

export async function updateProjectKeywordPage(id: number, pageUrl: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectKeywords).set({ pageUrl }).where(eq(projectKeywords.id, id));
}

export async function getProjectKeywordsCount(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select({ count: sql<number>`COUNT(*)`, totalVolume: sql<number>`COALESCE(SUM(volume), 0)` }).from(projectKeywords).where(eq(projectKeywords.projectId, projectId));
  return { count: row?.count ?? 0, totalVolume: row?.totalVolume ?? 0 };
}

/**
 * Match project keywords against existing articles by keyword.
 * Updates status and articleId for any matches found.
 */
export async function matchKeywordsToArticles(projectId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Get all articles for this project
  const projectArticles = await db.select({ id: articles.id, keyword: articles.keyword })
    .from(articles)
    .where(eq(articles.projectId, projectId));
  if (projectArticles.length === 0) return 0;

  // Get all keywords for this project
  const keywords = await db.select({ id: projectKeywords.id, keyword: projectKeywords.keyword })
    .from(projectKeywords)
    .where(eq(projectKeywords.projectId, projectId));

  let matched = 0;
  for (const kw of keywords) {
    const matchingArticle = projectArticles.find(a =>
      a.keyword && a.keyword.toLowerCase() === kw.keyword.toLowerCase()
    );
    if (matchingArticle) {
      await db.update(projectKeywords)
        .set({ status: "article", articleId: matchingArticle.id })
        .where(eq(projectKeywords.id, kw.id));
      matched++;
    }
  }
  return matched;
}

// ---- Ideas Helpers ----

export async function getIdeasByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ideas).where(eq(ideas.projectId, projectId)).orderBy(desc(ideas.createdAt));
}

export async function getIdeaById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(ideas).where(eq(ideas.id, id));
  return row ?? null;
}

export async function createIdea(data: InsertIdea) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(ideas).values(data).$returningId();
  return result;
}

export async function createIdeasBulk(rows: InsertIdea[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (rows.length === 0) return { inserted: 0 };
  await db.insert(ideas).values(rows);
  return { inserted: rows.length };
}

export async function updateIdea(id: number, data: Partial<Omit<InsertIdea, "id" | "createdAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ideas).set(data).where(eq(ideas.id, id));
}

export async function deleteIdea(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ideas).where(eq(ideas.id, id));
}

export async function deleteIdeasBulk(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  await db.delete(ideas).where(inArray(ideas.id, ids));
}

export async function getIdeasCount(projectId: number) {
  const db = await getDb();
  if (!db) return { total: 0, saved: 0, used: 0, archived: 0 };
  const [row] = await db.select({
    total: sql<number>`COUNT(*)`,
    saved: sql<number>`SUM(CASE WHEN idea_status = 'saved' THEN 1 ELSE 0 END)`,
    used: sql<number>`SUM(CASE WHEN idea_status = 'used' THEN 1 ELSE 0 END)`,
    archived: sql<number>`SUM(CASE WHEN idea_status = 'archived' THEN 1 ELSE 0 END)`,
  }).from(ideas).where(eq(ideas.projectId, projectId));
  return {
    total: row?.total ?? 0,
    saved: row?.saved ?? 0,
    used: row?.used ?? 0,
    archived: row?.archived ?? 0,
  };
}


// ---- Dashboard Helpers ----

export async function getDashboardStats(projectId: number) {
  const db = await getDb();
  if (!db) return { totalArticles: 0, draftCount: 0, reviewCount: 0, completeCount: 0, publishedCount: 0, totalKeywords: 0, totalIdeas: 0, savedIdeas: 0 };

  const [articleStats] = await db.select({
    totalArticles: sql<number>`COUNT(*)`,
    draftCount: sql<number>`SUM(CASE WHEN \`articleStatus\` = 'draft' THEN 1 ELSE 0 END)`,
    reviewCount: sql<number>`SUM(CASE WHEN \`articleStatus\` = 'review' THEN 1 ELSE 0 END)`,
    completeCount: sql<number>`SUM(CASE WHEN \`articleStatus\` = 'complete' THEN 1 ELSE 0 END)`,
    publishedCount: sql<number>`SUM(CASE WHEN \`articleStatus\` = 'published' THEN 1 ELSE 0 END)`,
  }).from(articles).where(eq(articles.projectId, projectId));

  const [kwStats] = await db.select({
    totalKeywords: sql<number>`COUNT(*)`,
  }).from(projectKeywords).where(eq(projectKeywords.projectId, projectId));

  const [ideaStats] = await db.select({
    totalIdeas: sql<number>`COUNT(*)`,
    savedIdeas: sql<number>`SUM(CASE WHEN \`ideaStatus\` = 'saved' THEN 1 ELSE 0 END)`,
  }).from(ideas).where(eq(ideas.projectId, projectId));

  return {
    totalArticles: articleStats?.totalArticles ?? 0,
    draftCount: articleStats?.draftCount ?? 0,
    reviewCount: articleStats?.reviewCount ?? 0,
    completeCount: articleStats?.completeCount ?? 0,
    publishedCount: articleStats?.publishedCount ?? 0,
    totalKeywords: kwStats?.totalKeywords ?? 0,
    totalIdeas: ideaStats?.totalIdeas ?? 0,
    savedIdeas: ideaStats?.savedIdeas ?? 0,
  };
}

export async function getRecentArticles(projectId: number, limit = 8) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: articles.id,
    title: articles.title,
    wordCount: articles.wordCount,
    status: articles.status,
    keyword: articles.keyword,
    createdAt: articles.createdAt,
    updatedAt: articles.updatedAt,
  }).from(articles).where(eq(articles.projectId, projectId)).orderBy(desc(articles.updatedAt)).limit(limit);
}

export async function getRecentIdeas(projectId: number, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: ideas.id,
    title: ideas.title,
    keyword: ideas.keyword,
    status: ideas.status,
    rankingPotential: ideas.rankingPotential,
    createdAt: ideas.createdAt,
  }).from(ideas).where(and(eq(ideas.projectId, projectId), eq(ideas.status, "saved"))).orderBy(desc(ideas.createdAt)).limit(limit);
}

export async function getArticlesOverTime(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  // Get articles created per day for the last 30 days
  return db.select({
    date: sql<string>`DATE(\`createdAt\`)`.as("date"),
    count: sql<number>`COUNT(*)`.as("count"),
  }).from(articles)
    .where(and(
      eq(articles.projectId, projectId),
      sql`\`createdAt\` >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
    ))
    .groupBy(sql`DATE(\`createdAt\`)`)
    .orderBy(sql`DATE(\`createdAt\`)`);
}

export async function getRecentActivity(projectId: number, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  // Combine recent articles and ideas into a unified activity feed
  const recentArticleActivity = await db.select({
    id: articles.id,
    title: articles.title,
    status: articles.status,
    createdAt: articles.createdAt,
    updatedAt: articles.updatedAt,
  }).from(articles).where(eq(articles.projectId, projectId)).orderBy(desc(articles.updatedAt)).limit(limit);

  const recentIdeaActivity = await db.select({
    id: ideas.id,
    title: ideas.title,
    status: ideas.status,
    createdAt: ideas.createdAt,
  }).from(ideas).where(eq(ideas.projectId, projectId)).orderBy(desc(ideas.createdAt)).limit(5);

  // Merge and sort by date
  const activities: Array<{ type: "article" | "idea"; id: number; title: string; status: string; date: Date }> = [];

  for (const a of recentArticleActivity) {
    activities.push({ type: "article", id: a.id, title: a.title, status: a.status, date: a.updatedAt });
  }
  for (const i of recentIdeaActivity) {
    activities.push({ type: "idea", id: i.id, title: i.title, status: i.status, date: i.createdAt });
  }

  activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  return activities.slice(0, limit);
}


// ============================================================
// OUTLINE VERSIONS
// ============================================================

export async function getOutlineVersions(outlineId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(outlineVersions).where(eq(outlineVersions.outlineId, outlineId)).orderBy(asc(outlineVersions.versionNumber));
}

export async function getOutlineVersionsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(outlineVersions).where(eq(outlineVersions.projectId, projectId)).orderBy(desc(outlineVersions.createdAt));
}

export async function createOutlineVersion(data: InsertOutlineVersion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(outlineVersions).values(data);
  return result[0].insertId;
}

export async function getNextVersionNumber(outlineId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 1;
  const result = await db.select({ maxVersion: sql<number>`COALESCE(MAX(${outlineVersions.versionNumber}), 0)` })
    .from(outlineVersions)
    .where(eq(outlineVersions.outlineId, outlineId));
  return (result[0]?.maxVersion ?? 0) + 1;
}

export async function deleteOutlineVersions(outlineId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(outlineVersions).where(eq(outlineVersions.outlineId, outlineId));
}


// ---- Pipeline Job Helpers ----

export async function getPipelineJobsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pipelineJobs).where(eq(pipelineJobs.projectId, projectId)).orderBy(desc(pipelineJobs.createdAt));
}

export async function getPipelineJobById(jobId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pipelineJobs).where(eq(pipelineJobs.id, jobId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPipelineJobByFileId(fileId: string, projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pipelineJobs)
    .where(and(eq(pipelineJobs.fileId, fileId), eq(pipelineJobs.projectId, projectId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPipelineJob(data: InsertPipelineJob) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pipelineJobs).values(data);
  return getPipelineJobById(result[0].insertId);
}

export async function updatePipelineJob(jobId: number, data: Partial<Pick<InsertPipelineJob, "status" | "ideaId" | "outlineId" | "articleId" | "errorMessage" | "processedAt">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pipelineJobs).set(data).where(eq(pipelineJobs.id, jobId));
  return getPipelineJobById(jobId);
}

export async function deletePipelineJob(jobId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pipelineJobs).where(eq(pipelineJobs.id, jobId));
  return { success: true };
}

export async function getPipelineQueue(projectId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pipelineJobs)
    .where(and(eq(pipelineJobs.projectId, projectId), eq(pipelineJobs.status, "pending_approval")))
    .orderBy(desc(pipelineJobs.createdAt));
}

// ---- Pipeline Settings Helpers ----

export async function getPipelineSettingsByProject(projectId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pipelineSettings).where(eq(pipelineSettings.projectId, projectId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertPipelineSettings(data: InsertPipelineSettings) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await getPipelineSettingsByProject(data.projectId);
  if (existing) {
    await db.update(pipelineSettings).set({
      bucketUrl: data.bucketUrl,
      enabled: data.enabled,
      autoGenerateOutline: data.autoGenerateOutline,
      autoGenerateArticle: data.autoGenerateArticle,
      defaultWordCount: data.defaultWordCount,
      defaultInstructions: data.defaultInstructions,
    }).where(eq(pipelineSettings.id, existing.id));
    return getPipelineSettingsByProject(data.projectId);
  } else {
    const result = await db.insert(pipelineSettings).values(data);
    return getPipelineSettingsByProject(data.projectId);
  }
}


// ---- Pipeline Brief Helpers ----

export async function createPipelineBrief(data: InsertPipelineBrief) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(pipelineBriefs).values(data);
  return getBriefById(result[0].insertId);
}

export async function getBriefById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pipelineBriefs).where(eq(pipelineBriefs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getBriefsByProject(projectId: number, status?: "pending_review" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(pipelineBriefs.projectId, projectId)];
  if (status) {
    conditions.push(eq(pipelineBriefs.status, status));
  }
  return db.select().from(pipelineBriefs)
    .where(and(...conditions))
    .orderBy(desc(pipelineBriefs.createdAt));
}

export async function getBriefByJobId(pipelineJobId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pipelineBriefs)
    .where(eq(pipelineBriefs.pipelineJobId, pipelineJobId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateBrief(id: number, data: Partial<Pick<InsertPipelineBrief, "title" | "primaryKeyword" | "secondaryKeywords" | "description" | "suggestedLinkCount" | "suggestedWordCount" | "editedFields">>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pipelineBriefs).set(data).where(eq(pipelineBriefs.id, id));
  return getBriefById(id);
}

export async function approveBrief(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pipelineBriefs).set({ status: "approved", approvedAt: new Date() }).where(eq(pipelineBriefs.id, id));
  return getBriefById(id);
}

export async function rejectBrief(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(pipelineBriefs).set({ status: "rejected" }).where(eq(pipelineBriefs.id, id));
  return getBriefById(id);
}
