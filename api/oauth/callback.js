var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// drizzle/schema.ts
import { int, float, json, mediumtext, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";
var users, projects, outlines, outlineVersions, articles, icpProfiles, brandVoices, ctaTemplates, sitemaps, citationSources, gscExports, appUsers, projectKeywords, ideas;
var init_schema = __esm({
  "drizzle/schema.ts"() {
    "use strict";
    users = mysqlTable("users", {
      id: int("id").autoincrement().primaryKey(),
      openId: varchar("openId", { length: 64 }).notNull().unique(),
      name: text("name"),
      email: varchar("email", { length: 320 }),
      loginMethod: varchar("loginMethod", { length: 64 }),
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      negativeKeywords: json("negativeKeywords").$type(),
      theme: mysqlEnum("theme", ["light", "dark", "system"]).default("light").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
    });
    projects = mysqlTable("projects", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      color: varchar("color", { length: 32 }).default("#6366f1").notNull(),
      domain: varchar("domain", { length: 512 }),
      description: text("description"),
      /** ICP: Primary name (e.g., "Medicare-eligible seniors in Florida") */
      icpPrimaryName: varchar("icpPrimaryName", { length: 512 }),
      /** ICP: Who they are — 1-2 sentence description */
      icpWhoTheyAre: text("icpWhoTheyAre"),
      /** ICP: Pain points (max 5 bullet items) */
      icpPains: json("icpPains").$type(),
      /** ICP: Goals and motivations (max 5 bullet items) */
      icpGoals: json("icpGoals").$type(),
      /** ICP: Common objections (max 5 bullet items) */
      icpObjections: json("icpObjections").$type(),
      /** ICP: Decision triggers (max 5 bullet items) */
      icpDecisionTriggers: json("icpDecisionTriggers").$type(),
      /** ICP: Trust signals (max 5 bullet items) */
      icpTrustSignals: json("icpTrustSignals").$type(),
      /** S3 key for the reference document used by Cross Check feature */
      referenceDocS3Key: varchar("referenceDocS3Key", { length: 1024 }),
      /** Original filename of the reference document for display */
      referenceDocName: varchar("referenceDocName", { length: 512 }),
      /** Character count of the reference document (for display without fetching from S3) */
      referenceDocLength: int("referenceDocLength"),
      /** Full content of the reference document (primary storage — DB is source of truth, S3 is backup) */
      referenceDocContent: mediumtext("referenceDocContent"),
      /** Banned phrases that should never appear in generated content (JSON array of strings) */
      bannedPhrases: json("bannedPhrases").$type(),
      /** LLM provider: 'builtin' (default Gemini via Forge) or 'claude' (Anthropic Claude) */
      llmProvider: varchar("llmProvider", { length: 32 }).default("builtin").notNull(),
      /** Claude model to use when llmProvider is 'claude' */
      llmModel: varchar("llmModel", { length: 128 }),
      /** Minimum number of internal links the LLM must include per generated article (0 = no floor) */
      minInternalLinks: int("minInternalLinks").default(3).notNull(),
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    outlines = mysqlTable("outlines", {
      id: int("id").autoincrement().primaryKey(),
      title: varchar("title", { length: 512 }).notNull(),
      /** Target keyword for this outline */
      keyword: varchar("keyword", { length: 255 }),
      /** JSON array of outline sections: { heading, subheading?, points?, type: 'h2'|'h3' } */
      sections: json("sections").$type().notNull(),
      /** Additional generation settings stored as JSON */
      settings: json("settings").$type(),
      status: mysqlEnum("outlineStatus", ["draft", "approved", "generating", "complete"]).default("draft").notNull(),
      projectId: int("projectId").notNull(),
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    outlineVersions = mysqlTable("outline_versions", {
      id: int("id").autoincrement().primaryKey(),
      outlineId: int("outlineId").notNull(),
      versionNumber: int("versionNumber").notNull(),
      label: varchar("label", { length: 255 }).notNull(),
      /** JSON array of sections at this version */
      sections: json("sections").$type().notNull(),
      /** Optional raw text that was pasted (for original versions) */
      rawText: text("rawText"),
      /** Score at this version (from AI analysis) */
      score: int("score"),
      /** Summary of changes from previous version */
      changeSummary: text("changeSummary"),
      projectId: int("projectId").notNull(),
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull()
    });
    articles = mysqlTable("articles", {
      id: int("id").autoincrement().primaryKey(),
      title: varchar("title", { length: 512 }).notNull(),
      /** Full HTML content of the article */
      content: text("content"),
      /** Plain text excerpt for previews */
      excerpt: text("excerpt"),
      /** Primary target keyword */
      keyword: varchar("keyword", { length: 255 }),
      /** Additional keywords as JSON array */
      keywords: json("keywords").$type(),
      /** SEO meta title */
      metaTitle: varchar("metaTitle", { length: 255 }),
      /** SEO meta description */
      metaDescription: text("metaDescription"),
      /** Permalink slug */
      slug: varchar("slug", { length: 512 }),
      /** Word count of the article */
      wordCount: int("wordCount").default(0),
      /** Article status workflow */
      status: mysqlEnum("articleStatus", ["draft", "review", "complete", "published"]).default("draft").notNull(),
      /** Content type: blog, comparison, guide, listicle, etc. */
      contentType: varchar("contentType", { length: 64 }),
      /** Link to the outline used to generate this article */
      outlineId: int("outlineId"),
      projectId: int("projectId").notNull(),
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    icpProfiles = mysqlTable("icp_profiles", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      /** Target demographics: age range, location, income, education, etc. */
      demographics: json("demographics").$type(),
      /** Pain points the ICP experiences */
      painPoints: json("painPoints").$type(),
      /** Goals and motivations */
      goals: json("goals").$type(),
      /** Objections or concerns */
      objections: json("objections").$type(),
      /** Preferred content formats and channels */
      contentPreferences: json("contentPreferences").$type(),
      /** Search behavior: what they search for, how they search */
      searchBehavior: text("searchBehavior"),
      /** Whether this is the default ICP for the project */
      isDefault: int("isDefault").default(0).notNull(),
      projectId: int("projectId").notNull(),
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    brandVoices = mysqlTable("brand_voices", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      /** Serialized tone traits: "PRIMARY:Friendly,Professional|SUPPORTING:Empathetic,Calm,Trustworthy" */
      toneTraits: text("toneTraits"),
      /** Writing perspective: first, second, third */
      perspective: varchar("perspective", { length: 32 }).default("second").notNull(),
      /** Sentence style: short, mixed, detailed */
      sentenceStyle: varchar("sentenceStyle", { length: 32 }).default("mixed").notNull(),
      /** 1-3 paragraph sample demonstrating the ideal voice */
      writingStyleSample: text("writingStyleSample"),
      /** Serialized avoid list: "PRESETS:jargon,salesy|CUSTOM:competitor mentions" */
      avoidList: text("avoidList"),
      /** Whether this is the default voice for the project */
      isDefault: int("isDefault").default(0).notNull(),
      projectId: int("projectId").notNull(),
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    ctaTemplates = mysqlTable("cta_templates", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      /** The CTA text/HTML content */
      content: text("content").notNull(),
      /** CTA type: inline, banner, sidebar, footer, popup */
      type: varchar("type", { length: 64 }).default("inline").notNull(),
      /** Where in the article to place this CTA */
      placement: varchar("placement", { length: 64 }).default("end").notNull(),
      /** Optional URL the CTA links to */
      url: varchar("url", { length: 1024 }),
      /** Optional button text */
      buttonText: varchar("buttonText", { length: 255 }),
      /** Whether this is the default CTA for the project */
      isDefault: int("isDefault").default(0).notNull(),
      projectId: int("projectId").notNull(),
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    sitemaps = mysqlTable("sitemaps", {
      id: int("id").autoincrement().primaryKey(),
      /** The sitemap URL (e.g., https://example.com/sitemap.xml) */
      url: varchar("url", { length: 2048 }).notNull(),
      /** JSON array of parsed URLs from the sitemap */
      parsedUrls: json("parsedUrls").$type().notNull(),
      /** Number of URLs found in the sitemap */
      urlCount: int("urlCount").default(0).notNull(),
      projectId: int("projectId").notNull(),
      lastParsed: timestamp("lastParsed").defaultNow().notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    citationSources = mysqlTable("citation_sources", {
      id: int("id").autoincrement().primaryKey(),
      /** Display name (e.g., "Medicare.gov - Official Medicare Information") */
      name: varchar("name", { length: 512 }).notNull(),
      /** Base URL (e.g., "https://www.medicare.gov") */
      url: varchar("url", { length: 2048 }).notNull(),
      /** Optional description of what this source covers */
      description: text("description"),
      /** Optional category (e.g., "Government", "Research", "Industry") */
      category: varchar("category", { length: 128 }),
      projectId: int("projectId").notNull(),
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    gscExports = mysqlTable("gsc_exports", {
      id: int("id").autoincrement().primaryKey(),
      /** Original filename of the uploaded Excel file */
      fileName: varchar("fileName", { length: 512 }).notNull(),
      /** Date range from the Filters sheet (e.g., "Last 3 months") */
      dateRange: varchar("dateRange", { length: 128 }),
      /** Total number of queries parsed from the Queries sheet */
      totalQueries: int("totalQueries").default(0).notNull(),
      /** Total number of pages parsed from the Pages sheet */
      totalPages: int("totalPages").default(0).notNull(),
      /** All raw query rows: { query, clicks, impressions, ctr, position }[] */
      queries: json("queries").$type().notNull(),
      /** All raw page rows: { page, clicks, impressions, ctr, position }[] */
      pages: json("pages").$type().notNull(),
      /** Chart/trend data: { date, clicks, impressions, ctr, position }[] */
      chartData: json("chartData").$type(),
      /** Near-jump keywords (pos 5–30 depending on threshold) — pre-computed */
      nearJumpKeywords: json("nearJumpKeywords").$type(),
      /** High impression / low CTR keywords — pre-computed */
      highImpressionLowCtr: json("highImpressionLowCtr").$type(),
      /** Quick win keywords — pre-computed */
      quickWinKeywords: json("quickWinKeywords").$type(),
      /** Zero-click pages — pre-computed */
      zeroClickPages: json("zeroClickPages").$type(),
      /** Cannibalization groups — pre-computed */
      cannibalizationGroups: json("cannibalizationGroups").$type(),
      projectId: int("projectId").notNull(),
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    appUsers = mysqlTable("app_users", {
      id: int("id").autoincrement().primaryKey(),
      name: varchar("name", { length: 255 }).notNull(),
      email: varchar("email", { length: 320 }).notNull().unique(),
      /** bcrypt hash of the user's password */
      passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
      role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
      /** Whether the account is active (admins can disable accounts) */
      isActive: int("isActive").default(1).notNull(),
      /** Whether the user must change their password on next login */
      mustChangePassword: int("mustChangePassword").default(0).notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
      lastLoginAt: timestamp("lastLoginAt"),
      /** User's preferred theme: light, dark, or system */
      theme: mysqlEnum("theme", ["light", "dark", "system"]).default("light").notNull()
    });
    projectKeywords = mysqlTable("project_keywords", {
      id: int("id").autoincrement().primaryKey(),
      /** Reference to the parent project */
      projectId: int("projectId").notNull(),
      /** The keyword text */
      keyword: varchar("keyword", { length: 255 }).notNull(),
      /** Monthly search volume */
      volume: int("volume").default(0).notNull(),
      /** Cost per click (USD) */
      cpc: float("cpc").default(0).notNull(),
      /** Raw competition score (0-1) */
      competition: float("competition").default(0).notNull(),
      /** Human-readable competition label */
      competitionLabel: mysqlEnum("competitionLabel", ["Low", "Medium", "High"]).default("Low").notNull(),
      /** Trend direction based on recent search data */
      trendDirection: mysqlEnum("trendDirection", ["rising", "declining", "stable"]).default("stable").notNull(),
      /** 12-month trend data as JSON array of { month, year, value } */
      trendData: json("trendData").$type(),
      /** Keyword difficulty score (0-100), nullable for future use */
      kd: int("kd"),
      /** Current SERP position, nullable for future use */
      position: int("position"),
      /** Calculated priority score (0-100) based on volume, competition, CPC */
      priority: int("priority").default(0).notNull(),
      /** Priority bucket label */
      priorityLabel: mysqlEnum("priorityLabel", ["High", "Med", "Low"]).default("Low").notNull(),
      /** Content status for this keyword */
      status: mysqlEnum("keywordStatus", ["none", "article", "outline"]).default("none").notNull(),
      /** Link to existing article if matched */
      articleId: int("articleId"),
      /** Associated page URL on the site */
      pageUrl: varchar("pageUrl", { length: 1024 }),
      /** Source of the keyword: keyword-research, manual, import */
      source: varchar("source", { length: 64 }).default("manual").notNull(),
      /** Who added this keyword */
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
    ideas = mysqlTable("ideas", {
      id: int("id").autoincrement().primaryKey(),
      /** Article title suggestion */
      title: varchar("title", { length: 512 }).notNull(),
      /** Primary target keyword */
      keyword: varchar("keyword", { length: 255 }).notNull(),
      /** Search intent: informational, transactional, local, navigational */
      searchIntent: varchar("searchIntent", { length: 64 }),
      /** Suggested word count range (e.g., "1500-2500") */
      wordCountRange: varchar("wordCountRange", { length: 32 }),
      /** Content angles to cover */
      contentAngles: json("contentAngles").$type(),
      /** Target audience description */
      targetAudience: text("targetAudience"),
      /** Ranking potential: high, medium, low */
      rankingPotential: varchar("rankingPotential", { length: 16 }),
      /** Brief description of what the article would cover */
      description: text("description"),
      /** Content types used during generation (comma-separated) */
      contentTypes: varchar("contentTypes", { length: 512 }),
      /** Status: saved, used (converted to article), archived */
      status: mysqlEnum("ideaStatus", ["saved", "used", "archived"]).default("saved").notNull(),
      /** Reference to generated article if this idea was used */
      articleId: int("articleId"),
      projectId: int("projectId").notNull(),
      userId: int("userId").notNull(),
      createdAt: timestamp("createdAt").defaultNow().notNull(),
      updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull()
    });
  }
});

// server/_core/env.ts
var env_exports = {};
__export(env_exports, {
  ENV: () => ENV
});
var ENV;
var init_env = __esm({
  "server/_core/env.ts"() {
    "use strict";
    ENV = {
      appId: process.env.VITE_APP_ID ?? "",
      cookieSecret: process.env.JWT_SECRET ?? "",
      databaseUrl: process.env.DATABASE_URL ?? "",
      oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
      ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
      isProduction: process.env.NODE_ENV === "production",
      forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
      forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
      anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
      keywordsEverywhereApiKey: process.env.KEYWORDS_EVERYWHERE_API_KEY ?? "",
      teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL ?? "",
      cmsPassword: process.env.CMS_PASSWORD ?? ""
    };
  }
});

// server/db.ts
var db_exports = {};
__export(db_exports, {
  addProjectKeyword: () => addProjectKeyword,
  addProjectKeywordsBulk: () => addProjectKeywordsBulk,
  bulkDeleteCitations: () => bulkDeleteCitations,
  calculateKeywordPriority: () => calculateKeywordPriority,
  createArticle: () => createArticle,
  createBrandVoice: () => createBrandVoice,
  createCTA: () => createCTA,
  createCitation: () => createCitation,
  createICP: () => createICP,
  createIdea: () => createIdea,
  createIdeasBulk: () => createIdeasBulk,
  createOutline: () => createOutline,
  createOutlineVersion: () => createOutlineVersion,
  createProject: () => createProject,
  createSitemap: () => createSitemap,
  deleteArticle: () => deleteArticle,
  deleteBrandVoice: () => deleteBrandVoice,
  deleteCTA: () => deleteCTA,
  deleteCitation: () => deleteCitation,
  deleteICP: () => deleteICP,
  deleteIdea: () => deleteIdea,
  deleteIdeasBulk: () => deleteIdeasBulk,
  deleteOutline: () => deleteOutline,
  deleteOutlineVersions: () => deleteOutlineVersions,
  deleteProject: () => deleteProject,
  deleteProjectKeyword: () => deleteProjectKeyword,
  deleteProjectKeywordsBulk: () => deleteProjectKeywordsBulk,
  deleteSitemap: () => deleteSitemap,
  getArticleById: () => getArticleById,
  getArticleStats: () => getArticleStats,
  getArticlesByProject: () => getArticlesByProject,
  getArticlesByUser: () => getArticlesByUser,
  getArticlesOverTime: () => getArticlesOverTime,
  getBrandVoiceById: () => getBrandVoiceById,
  getBrandVoicesByProject: () => getBrandVoicesByProject,
  getCTAById: () => getCTAById,
  getCTAsByProject: () => getCTAsByProject,
  getCitationById: () => getCitationById,
  getCitationsByProject: () => getCitationsByProject,
  getDashboardStats: () => getDashboardStats,
  getDb: () => getDb,
  getICPById: () => getICPById,
  getICPsByProject: () => getICPsByProject,
  getIdeaById: () => getIdeaById,
  getIdeasByProject: () => getIdeasByProject,
  getIdeasCount: () => getIdeasCount,
  getNextVersionNumber: () => getNextVersionNumber,
  getOutlineById: () => getOutlineById,
  getOutlineVersions: () => getOutlineVersions,
  getOutlineVersionsByProject: () => getOutlineVersionsByProject,
  getOutlinesByProject: () => getOutlinesByProject,
  getOutlinesByUser: () => getOutlinesByUser,
  getProjectById: () => getProjectById,
  getProjectKeywordById: () => getProjectKeywordById,
  getProjectKeywordsCount: () => getProjectKeywordsCount,
  getProjectKeywordsList: () => getProjectKeywordsList,
  getProjectsByUserId: () => getProjectsByUserId,
  getRecentActivity: () => getRecentActivity,
  getRecentArticles: () => getRecentArticles,
  getRecentIdeas: () => getRecentIdeas,
  getSitemapById: () => getSitemapById,
  getSitemapsByProject: () => getSitemapsByProject,
  getUserByOpenId: () => getUserByOpenId,
  matchKeywordsToArticles: () => matchKeywordsToArticles,
  updateArticle: () => updateArticle,
  updateBrandVoice: () => updateBrandVoice,
  updateCTA: () => updateCTA,
  updateCitation: () => updateCitation,
  updateICP: () => updateICP,
  updateIdea: () => updateIdea,
  updateOutline: () => updateOutline,
  updateProject: () => updateProject,
  updateProjectKeywordPage: () => updateProjectKeywordPage,
  updateProjectReferenceDocMeta: () => updateProjectReferenceDocMeta,
  updateSitemap: () => updateSitemap,
  upsertUser: () => upsertUser
});
import { eq, desc, and, sql, like, inArray, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
async function getDb() {
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
async function upsertUser(user) {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values = {
      openId: user.openId
    };
    const updateSet = {};
    const textFields = ["name", "email", "loginMethod"];
    const assignNullable = (field) => {
      const value = user[field];
      if (value === void 0) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== void 0) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== void 0) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = /* @__PURE__ */ new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = /* @__PURE__ */ new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}
async function getUserByOpenId(openId) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return void 0;
  }
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function getProjectsByUserId(userId) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.updatedAt));
  return result;
}
async function getProjectById(projectId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createProject(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(projects).values(data);
  const insertId = result[0].insertId;
  return getProjectById(insertId);
}
async function updateProject(projectId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(eq(projects.id, projectId));
  return getProjectById(projectId);
}
async function deleteProject(projectId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projects).where(eq(projects.id, projectId));
  return { success: true };
}
async function getOutlinesByProject(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(outlines).where(eq(outlines.projectId, projectId)).orderBy(desc(outlines.updatedAt));
}
async function getOutlinesByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(outlines).where(eq(outlines.userId, userId)).orderBy(desc(outlines.updatedAt));
}
async function getOutlineById(outlineId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(outlines).where(eq(outlines.id, outlineId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createOutline(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(outlines).values(data);
  return getOutlineById(result[0].insertId);
}
async function updateOutline(outlineId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(outlines).set(data).where(eq(outlines.id, outlineId));
  return getOutlineById(outlineId);
}
async function deleteOutline(outlineId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(outlines).where(eq(outlines.id, outlineId));
  return { success: true };
}
async function getArticlesByProject(projectId, statusFilter) {
  const db = await getDb();
  if (!db) return [];
  if (statusFilter && statusFilter !== "all") {
    return db.select().from(articles).where(and(eq(articles.projectId, projectId), eq(articles.status, statusFilter))).orderBy(desc(articles.updatedAt));
  }
  return db.select().from(articles).where(eq(articles.projectId, projectId)).orderBy(desc(articles.updatedAt));
}
async function getArticlesByUser(userId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(articles).where(eq(articles.userId, userId)).orderBy(desc(articles.updatedAt));
}
async function getArticleById(articleId) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createArticle(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(articles).values(data);
  return getArticleById(result[0].insertId);
}
async function updateArticle(articleId, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(articles).set(data).where(eq(articles.id, articleId));
  return getArticleById(articleId);
}
async function deleteArticle(articleId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(articles).where(eq(articles.id, articleId));
  return { success: true };
}
async function getArticleStats(projectId) {
  const db = await getDb();
  if (!db) return { total: 0, draft: 0, review: 0, complete: 0, published: 0, totalWords: 0 };
  const result = await db.select({
    status: articles.status,
    count: sql`count(*)`,
    words: sql`COALESCE(sum(${articles.wordCount}), 0)`
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
async function getICPsByProject(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(icpProfiles).where(eq(icpProfiles.projectId, projectId)).orderBy(desc(icpProfiles.updatedAt));
}
async function getICPById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(icpProfiles).where(eq(icpProfiles.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createICP(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(icpProfiles).values(data);
  return getICPById(result[0].insertId);
}
async function updateICP(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(icpProfiles).set(data).where(eq(icpProfiles.id, id));
  return getICPById(id);
}
async function deleteICP(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(icpProfiles).where(eq(icpProfiles.id, id));
  return { success: true };
}
async function getBrandVoicesByProject(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(brandVoices).where(eq(brandVoices.projectId, projectId)).orderBy(desc(brandVoices.updatedAt));
}
async function getBrandVoiceById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(brandVoices).where(eq(brandVoices.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createBrandVoice(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(brandVoices).values(data);
  return getBrandVoiceById(result[0].insertId);
}
async function updateBrandVoice(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(brandVoices).set(data).where(eq(brandVoices.id, id));
  return getBrandVoiceById(id);
}
async function deleteBrandVoice(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(brandVoices).where(eq(brandVoices.id, id));
  return { success: true };
}
async function getCTAsByProject(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ctaTemplates).where(eq(ctaTemplates.projectId, projectId)).orderBy(desc(ctaTemplates.updatedAt));
}
async function getCTAById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(ctaTemplates).where(eq(ctaTemplates.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createCTA(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ctaTemplates).values(data);
  return getCTAById(result[0].insertId);
}
async function updateCTA(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ctaTemplates).set(data).where(eq(ctaTemplates.id, id));
  return getCTAById(id);
}
async function deleteCTA(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ctaTemplates).where(eq(ctaTemplates.id, id));
  return { success: true };
}
async function getSitemapsByProject(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(sitemaps).where(eq(sitemaps.projectId, projectId)).orderBy(desc(sitemaps.createdAt));
}
async function getSitemapById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(sitemaps).where(eq(sitemaps.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createSitemap(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(sitemaps).values(data);
  return getSitemapById(result[0].insertId);
}
async function updateSitemap(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(sitemaps).set(data).where(eq(sitemaps.id, id));
  return getSitemapById(id);
}
async function deleteSitemap(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(sitemaps).where(eq(sitemaps.id, id));
  return { success: true };
}
async function getCitationsByProject(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(citationSources).where(eq(citationSources.projectId, projectId)).orderBy(desc(citationSources.createdAt));
}
async function getCitationById(id) {
  const db = await getDb();
  if (!db) return void 0;
  const result = await db.select().from(citationSources).where(eq(citationSources.id, id)).limit(1);
  return result.length > 0 ? result[0] : void 0;
}
async function createCitation(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(citationSources).values(data);
  return getCitationById(result[0].insertId);
}
async function updateCitation(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(citationSources).set(data).where(eq(citationSources.id, id));
  return getCitationById(id);
}
async function deleteCitation(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(citationSources).where(eq(citationSources.id, id));
  return { success: true };
}
async function bulkDeleteCitations(ids) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return { success: true, deleted: 0 };
  await db.delete(citationSources).where(inArray(citationSources.id, ids));
  return { success: true, deleted: ids.length };
}
async function updateProjectReferenceDocMeta(projectId, s3Key, docName, docLength, docContent = null) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set({
    referenceDocS3Key: s3Key,
    referenceDocName: docName,
    referenceDocLength: docLength,
    referenceDocContent: docContent
  }).where(eq(projects.id, projectId));
  return getProjectById(projectId);
}
function calculateKeywordPriority(volume, competition, cpc) {
  let volumeScore = 0;
  if (volume > 0) {
    volumeScore = Math.min(40, Math.round(Math.log10(volume) / Math.log10(1e5) * 40));
  }
  const competitionScore = Math.round((1 - competition) * 30);
  let cpcScore = 0;
  if (cpc > 0) {
    cpcScore = Math.min(30, Math.round(Math.log10(cpc + 1) / Math.log10(50) * 30));
  }
  const priority = Math.min(100, volumeScore + competitionScore + cpcScore);
  const priorityLabel = priority >= 66 ? "High" : priority >= 33 ? "Med" : "Low";
  return { priority, priorityLabel };
}
async function getProjectKeywordsList(projectId, search, sortBy, sortDir) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const conditions = [eq(projectKeywords.projectId, projectId)];
  if (search && search.trim()) {
    conditions.push(like(projectKeywords.keyword, `%${search.trim()}%`));
  }
  const orderCol = sortBy === "volume" ? projectKeywords.volume : sortBy === "cpc" ? projectKeywords.cpc : sortBy === "competition" ? projectKeywords.competition : sortBy === "keyword" ? projectKeywords.keyword : projectKeywords.priority;
  const orderFn = sortDir === "asc" ? asc : desc;
  return db.select().from(projectKeywords).where(and(...conditions)).orderBy(orderFn(orderCol));
}
async function getProjectKeywordById(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select().from(projectKeywords).where(eq(projectKeywords.id, id));
  return row ?? null;
}
async function addProjectKeyword(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(projectKeywords).values(data).$returningId();
  return result;
}
async function addProjectKeywordsBulk(rows) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (rows.length === 0) return { inserted: 0, skipped: 0 };
  let inserted = 0;
  let skipped = 0;
  for (const row of rows) {
    try {
      const [existing] = await db.select({ id: projectKeywords.id }).from(projectKeywords).where(and(
        eq(projectKeywords.projectId, row.projectId),
        eq(projectKeywords.keyword, row.keyword)
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
async function deleteProjectKeyword(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projectKeywords).where(eq(projectKeywords.id, id));
}
async function deleteProjectKeywordsBulk(ids) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  await db.delete(projectKeywords).where(inArray(projectKeywords.id, ids));
}
async function updateProjectKeywordPage(id, pageUrl) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projectKeywords).set({ pageUrl }).where(eq(projectKeywords.id, id));
}
async function getProjectKeywordsCount(projectId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [row] = await db.select({ count: sql`COUNT(*)`, totalVolume: sql`COALESCE(SUM(volume), 0)` }).from(projectKeywords).where(eq(projectKeywords.projectId, projectId));
  return { count: row?.count ?? 0, totalVolume: row?.totalVolume ?? 0 };
}
async function matchKeywordsToArticles(projectId) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const projectArticles = await db.select({ id: articles.id, keyword: articles.keyword }).from(articles).where(eq(articles.projectId, projectId));
  if (projectArticles.length === 0) return 0;
  const keywords = await db.select({ id: projectKeywords.id, keyword: projectKeywords.keyword }).from(projectKeywords).where(eq(projectKeywords.projectId, projectId));
  let matched = 0;
  for (const kw of keywords) {
    const matchingArticle = projectArticles.find(
      (a) => a.keyword && a.keyword.toLowerCase() === kw.keyword.toLowerCase()
    );
    if (matchingArticle) {
      await db.update(projectKeywords).set({ status: "article", articleId: matchingArticle.id }).where(eq(projectKeywords.id, kw.id));
      matched++;
    }
  }
  return matched;
}
async function getIdeasByProject(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(ideas).where(eq(ideas.projectId, projectId)).orderBy(desc(ideas.createdAt));
}
async function getIdeaById(id) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(ideas).where(eq(ideas.id, id));
  return row ?? null;
}
async function createIdea(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(ideas).values(data).$returningId();
  return result;
}
async function createIdeasBulk(rows) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (rows.length === 0) return { inserted: 0 };
  await db.insert(ideas).values(rows);
  return { inserted: rows.length };
}
async function updateIdea(id, data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ideas).set(data).where(eq(ideas.id, id));
}
async function deleteIdea(id) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ideas).where(eq(ideas.id, id));
}
async function deleteIdeasBulk(ids) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return;
  await db.delete(ideas).where(inArray(ideas.id, ids));
}
async function getIdeasCount(projectId) {
  const db = await getDb();
  if (!db) return { total: 0, saved: 0, used: 0, archived: 0 };
  const [row] = await db.select({
    total: sql`COUNT(*)`,
    saved: sql`SUM(CASE WHEN idea_status = 'saved' THEN 1 ELSE 0 END)`,
    used: sql`SUM(CASE WHEN idea_status = 'used' THEN 1 ELSE 0 END)`,
    archived: sql`SUM(CASE WHEN idea_status = 'archived' THEN 1 ELSE 0 END)`
  }).from(ideas).where(eq(ideas.projectId, projectId));
  return {
    total: row?.total ?? 0,
    saved: row?.saved ?? 0,
    used: row?.used ?? 0,
    archived: row?.archived ?? 0
  };
}
async function getDashboardStats(projectId) {
  const db = await getDb();
  if (!db) return { totalArticles: 0, draftCount: 0, reviewCount: 0, completeCount: 0, publishedCount: 0, totalKeywords: 0, totalIdeas: 0, savedIdeas: 0 };
  const [articleStats] = await db.select({
    totalArticles: sql`COUNT(*)`,
    draftCount: sql`SUM(CASE WHEN \`articleStatus\` = 'draft' THEN 1 ELSE 0 END)`,
    reviewCount: sql`SUM(CASE WHEN \`articleStatus\` = 'review' THEN 1 ELSE 0 END)`,
    completeCount: sql`SUM(CASE WHEN \`articleStatus\` = 'complete' THEN 1 ELSE 0 END)`,
    publishedCount: sql`SUM(CASE WHEN \`articleStatus\` = 'published' THEN 1 ELSE 0 END)`
  }).from(articles).where(eq(articles.projectId, projectId));
  const [kwStats] = await db.select({
    totalKeywords: sql`COUNT(*)`
  }).from(projectKeywords).where(eq(projectKeywords.projectId, projectId));
  const [ideaStats] = await db.select({
    totalIdeas: sql`COUNT(*)`,
    savedIdeas: sql`SUM(CASE WHEN \`ideaStatus\` = 'saved' THEN 1 ELSE 0 END)`
  }).from(ideas).where(eq(ideas.projectId, projectId));
  return {
    totalArticles: articleStats?.totalArticles ?? 0,
    draftCount: articleStats?.draftCount ?? 0,
    reviewCount: articleStats?.reviewCount ?? 0,
    completeCount: articleStats?.completeCount ?? 0,
    publishedCount: articleStats?.publishedCount ?? 0,
    totalKeywords: kwStats?.totalKeywords ?? 0,
    totalIdeas: ideaStats?.totalIdeas ?? 0,
    savedIdeas: ideaStats?.savedIdeas ?? 0
  };
}
async function getRecentArticles(projectId, limit = 8) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: articles.id,
    title: articles.title,
    wordCount: articles.wordCount,
    status: articles.status,
    keyword: articles.keyword,
    createdAt: articles.createdAt,
    updatedAt: articles.updatedAt
  }).from(articles).where(eq(articles.projectId, projectId)).orderBy(desc(articles.updatedAt)).limit(limit);
}
async function getRecentIdeas(projectId, limit = 5) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: ideas.id,
    title: ideas.title,
    keyword: ideas.keyword,
    status: ideas.status,
    rankingPotential: ideas.rankingPotential,
    createdAt: ideas.createdAt
  }).from(ideas).where(and(eq(ideas.projectId, projectId), eq(ideas.status, "saved"))).orderBy(desc(ideas.createdAt)).limit(limit);
}
async function getArticlesOverTime(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    date: sql`DATE(\`createdAt\`)`.as("date"),
    count: sql`COUNT(*)`.as("count")
  }).from(articles).where(and(
    eq(articles.projectId, projectId),
    sql`\`createdAt\` >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
  )).groupBy(sql`DATE(\`createdAt\`)`).orderBy(sql`DATE(\`createdAt\`)`);
}
async function getRecentActivity(projectId, limit = 10) {
  const db = await getDb();
  if (!db) return [];
  const recentArticleActivity = await db.select({
    id: articles.id,
    title: articles.title,
    status: articles.status,
    createdAt: articles.createdAt,
    updatedAt: articles.updatedAt
  }).from(articles).where(eq(articles.projectId, projectId)).orderBy(desc(articles.updatedAt)).limit(limit);
  const recentIdeaActivity = await db.select({
    id: ideas.id,
    title: ideas.title,
    status: ideas.status,
    createdAt: ideas.createdAt
  }).from(ideas).where(eq(ideas.projectId, projectId)).orderBy(desc(ideas.createdAt)).limit(5);
  const activities = [];
  for (const a of recentArticleActivity) {
    activities.push({ type: "article", id: a.id, title: a.title, status: a.status, date: a.updatedAt });
  }
  for (const i of recentIdeaActivity) {
    activities.push({ type: "idea", id: i.id, title: i.title, status: i.status, date: i.createdAt });
  }
  activities.sort((a, b) => b.date.getTime() - a.date.getTime());
  return activities.slice(0, limit);
}
async function getOutlineVersions(outlineId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(outlineVersions).where(eq(outlineVersions.outlineId, outlineId)).orderBy(asc(outlineVersions.versionNumber));
}
async function getOutlineVersionsByProject(projectId) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(outlineVersions).where(eq(outlineVersions.projectId, projectId)).orderBy(desc(outlineVersions.createdAt));
}
async function createOutlineVersion(data) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(outlineVersions).values(data);
  return result[0].insertId;
}
async function getNextVersionNumber(outlineId) {
  const db = await getDb();
  if (!db) return 1;
  const result = await db.select({ maxVersion: sql`COALESCE(MAX(${outlineVersions.versionNumber}), 0)` }).from(outlineVersions).where(eq(outlineVersions.outlineId, outlineId));
  return (result[0]?.maxVersion ?? 0) + 1;
}
async function deleteOutlineVersions(outlineId) {
  const db = await getDb();
  if (!db) return;
  await db.delete(outlineVersions).where(eq(outlineVersions.outlineId, outlineId));
}
var _db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    init_env();
    init_schema();
    _db = null;
  }
});

// server/cmsPublish.ts
var cmsPublish_exports = {};
__export(cmsPublish_exports, {
  generateSlug: () => generateSlug,
  publishToCms: () => publishToCms,
  saveDraftToCms: () => saveDraftToCms
});
function generateSlug(title, maxLength = 50) {
  const raw = title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (raw.length <= maxLength) return raw;
  const truncated = raw.slice(0, maxLength);
  const lastHyphen = truncated.lastIndexOf("-");
  return lastHyphen > 0 ? truncated.slice(0, lastHyphen) : truncated;
}
async function saveDraftToCms(input) {
  const password = ENV.cmsPassword;
  if (!password) {
    throw new Error("CMS_PASSWORD environment variable is not set");
  }
  const body = {
    title: input.title,
    slug: input.slug,
    rawContent: input.rawContent
  };
  if (input.excerpt) body.excerpt = input.excerpt;
  if (input.category) body.category = input.category;
  if (input.author) body.author = input.author;
  if (input.reviewer) body.reviewer = input.reviewer;
  if (input.image) body.image = input.image;
  if (input.imageAlt) body.imageAlt = input.imageAlt;
  if (input.seoTitle) body.seoTitle = input.seoTitle;
  if (input.seoDescription) body.seoDescription = input.seoDescription;
  if (input.keyTakeaways && input.keyTakeaways.length > 0) body.keyTakeaways = input.keyTakeaways;
  const response = await fetch(CMS_DRAFTS_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-cms-password": password
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `CMS draft save failed with status ${response.status}`);
  }
  return {
    id: data.id,
    updatedAt: data.updatedAt,
    slug: input.slug
  };
}
async function publishToCms(input) {
  const password = ENV.cmsPassword;
  if (!password) {
    throw new Error("CMS_PASSWORD environment variable is not set");
  }
  const body = {
    title: input.title,
    slug: input.slug,
    content: input.content
  };
  if (input.excerpt) body.excerpt = input.excerpt;
  if (input.category) body.category = input.category;
  if (input.image) {
    body.image = input.image;
    body.ogImage = input.image;
  }
  if (input.imageAlt) body.imageAlt = input.imageAlt;
  const response = await fetch(CMS_CREATE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cms-password": password
    },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `CMS publish failed with status ${response.status}`);
  }
  return data;
}
var CMS_BASE_URL, CMS_DRAFTS_URL, CMS_CREATE_URL;
var init_cmsPublish = __esm({
  "server/cmsPublish.ts"() {
    "use strict";
    init_env();
    CMS_BASE_URL = "https://medicarefaq-next-nine.vercel.app";
    CMS_DRAFTS_URL = `${CMS_BASE_URL}/api/cms/drafts`;
    CMS_CREATE_URL = `${CMS_BASE_URL}/api/cms/create/`;
  }
});

// server/keywords-everywhere.ts
var keywords_everywhere_exports = {};
__export(keywords_everywhere_exports, {
  getCreditBalance: () => getCreditBalance,
  getKeywordData: () => getKeywordData,
  getPasfKeywords: () => getPasfKeywords,
  getRelatedKeywords: () => getRelatedKeywords
});
async function keRequest(apiKey, method, path, body) {
  const url = `${KE_BASE_URL}${path}`;
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json"
  };
  const init = { method, headers };
  if (body && method === "POST") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const res = await fetch(url, init);
  if (!res.ok) {
    const text2 = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error("Keywords Everywhere API: Invalid or missing API key");
    }
    if (res.status === 402) {
      throw new Error("Keywords Everywhere API: Insufficient credits or invalid subscription");
    }
    throw new Error(`Keywords Everywhere API error ${res.status}: ${text2}`);
  }
  return res.json();
}
async function getKeywordData(apiKey, keywords, options) {
  return keRequest(apiKey, "POST", "/get_keyword_data", {
    kw: keywords,
    country: options?.country ?? "us",
    currency: options?.currency ?? "usd",
    dataSource: options?.dataSource ?? "cli"
  });
}
async function getRelatedKeywords(apiKey, keyword, num = 10) {
  return keRequest(apiKey, "POST", "/get_related_keywords", {
    keyword,
    num
  });
}
async function getPasfKeywords(apiKey, keyword, num = 10) {
  return keRequest(apiKey, "POST", "/get_pasf_keywords", {
    keyword,
    num
  });
}
async function getCreditBalance(apiKey) {
  const res = await keRequest(apiKey, "GET", "/account/credits");
  return Array.isArray(res) ? res[0] ?? 0 : 0;
}
var KE_BASE_URL;
var init_keywords_everywhere = __esm({
  "server/keywords-everywhere.ts"() {
    "use strict";
    KE_BASE_URL = "https://api.keywordseverywhere.com/v1";
  }
});

// server/_core/app.ts
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;
var AXIOS_TIMEOUT_MS = 3e4;
var UNAUTHED_ERR_MSG = "Please login (10001)";
var NOT_ADMIN_ERR_MSG = "You do not have required permission (10002)";

// server/_core/oauth.ts
init_db();

// server/_core/cookies.ts
function isSecureRequest(req) {
  if (req.protocol === "https") return true;
  const forwardedProto = req.headers["x-forwarded-proto"];
  if (!forwardedProto) return false;
  const protoList = Array.isArray(forwardedProto) ? forwardedProto : forwardedProto.split(",");
  return protoList.some((proto) => proto.trim().toLowerCase() === "https");
}
function getSessionCookieOptions(req) {
  const secure = isSecureRequest(req);
  return {
    httpOnly: true,
    path: "/",
    sameSite: secure ? "none" : "lax",
    secure
  };
}

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
init_db();
init_env();
import axios from "axios";
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var EXCHANGE_TOKEN_PATH = `/webdev.v1.WebDevAuthPublicService/ExchangeToken`;
var GET_USER_INFO_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfo`;
var GET_USER_INFO_WITH_JWT_PATH = `/webdev.v1.WebDevAuthPublicService/GetUserInfoWithJwt`;
var OAuthService = class {
  constructor(client) {
    this.client = client;
    console.log("[OAuth] Initialized with baseURL:", ENV.oAuthServerUrl);
    if (!ENV.oAuthServerUrl) {
      console.error(
        "[OAuth] ERROR: OAUTH_SERVER_URL is not configured! Set OAUTH_SERVER_URL environment variable."
      );
    }
  }
  decodeState(state) {
    const redirectUri = atob(state);
    return redirectUri;
  }
  async getTokenByCode(code, state) {
    const payload = {
      clientId: ENV.appId,
      grantType: "authorization_code",
      code,
      redirectUri: this.decodeState(state)
    };
    const { data } = await this.client.post(
      EXCHANGE_TOKEN_PATH,
      payload
    );
    return data;
  }
  async getUserInfoByToken(token) {
    const { data } = await this.client.post(
      GET_USER_INFO_PATH,
      {
        accessToken: token.accessToken
      }
    );
    return data;
  }
};
var createOAuthHttpClient = () => axios.create({
  baseURL: ENV.oAuthServerUrl,
  timeout: AXIOS_TIMEOUT_MS
});
var SDKServer = class {
  client;
  oauthService;
  constructor(client = createOAuthHttpClient()) {
    this.client = client;
    this.oauthService = new OAuthService(this.client);
  }
  deriveLoginMethod(platforms, fallback) {
    if (fallback && fallback.length > 0) return fallback;
    if (!Array.isArray(platforms) || platforms.length === 0) return null;
    const set = new Set(
      platforms.filter((p) => typeof p === "string")
    );
    if (set.has("REGISTERED_PLATFORM_EMAIL")) return "email";
    if (set.has("REGISTERED_PLATFORM_GOOGLE")) return "google";
    if (set.has("REGISTERED_PLATFORM_APPLE")) return "apple";
    if (set.has("REGISTERED_PLATFORM_MICROSOFT") || set.has("REGISTERED_PLATFORM_AZURE"))
      return "microsoft";
    if (set.has("REGISTERED_PLATFORM_GITHUB")) return "github";
    const first = Array.from(set)[0];
    return first ? first.toLowerCase() : null;
  }
  /**
   * Exchange OAuth authorization code for access token
   * @example
   * const tokenResponse = await sdk.exchangeCodeForToken(code, state);
   */
  async exchangeCodeForToken(code, state) {
    return this.oauthService.getTokenByCode(code, state);
  }
  /**
   * Get user information using access token
   * @example
   * const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
   */
  async getUserInfo(accessToken) {
    const data = await this.oauthService.getUserInfoByToken({
      accessToken
    });
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) {
      return /* @__PURE__ */ new Map();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }
  /**
   * Create a session token for a Manus user openId
   * @example
   * const sessionToken = await sdk.createSessionToken(userInfo.openId);
   */
  async createSessionToken(openId, options = {}) {
    return this.signSession(
      {
        openId,
        appId: ENV.appId,
        name: options.name || ""
      },
      options
    );
  }
  async signSession(payload, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: payload.openId,
      appId: payload.appId,
      name: payload.name
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  async verifySession(cookieValue) {
    if (!cookieValue) {
      console.warn("[Auth] Missing session cookie");
      return null;
    }
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"]
      });
      const { openId, appId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(appId) || !isNonEmptyString(name)) {
        console.warn("[Auth] Session payload missing required fields");
        return null;
      }
      return {
        openId,
        appId,
        name
      };
    } catch (error) {
      console.warn("[Auth] Session verification failed", String(error));
      return null;
    }
  }
  async getUserInfoWithJwt(jwtToken) {
    const payload = {
      jwtToken,
      projectId: ENV.appId
    };
    const { data } = await this.client.post(
      GET_USER_INFO_WITH_JWT_PATH,
      payload
    );
    const loginMethod = this.deriveLoginMethod(
      data?.platforms,
      data?.platform ?? data.platform ?? null
    );
    return {
      ...data,
      platform: loginMethod,
      loginMethod
    };
  }
  async authenticateRequest(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Invalid session cookie");
    }
    const sessionUserId = session.openId;
    const signedInAt = /* @__PURE__ */ new Date();
    let user = await getUserByOpenId(sessionUserId);
    if (!user) {
      try {
        const userInfo = await this.getUserInfoWithJwt(sessionCookie ?? "");
        await upsertUser({
          openId: userInfo.openId,
          name: userInfo.name || null,
          email: userInfo.email ?? null,
          loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
          lastSignedIn: signedInAt
        });
        user = await getUserByOpenId(userInfo.openId);
      } catch (error) {
        console.error("[Auth] Failed to sync user from OAuth:", error);
        throw ForbiddenError("Failed to sync user info");
      }
    }
    if (!user) {
      throw ForbiddenError("User not found");
    }
    await upsertUser({
      openId: user.openId,
      lastSignedIn: signedInAt
    });
    return user;
  }
};
var sdk = new SDKServer();

// server/_core/oauth.ts
function getQueryParam(req, key) {
  const value = req.query[key];
  return typeof value === "string" ? value : void 0;
}
function registerOAuthRoutes(app) {
  app.get("/api/oauth/callback", async (req, res) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");
    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }
    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }
      await upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: /* @__PURE__ */ new Date()
      });
      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS
      });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
}

// server/_core/systemRouter.ts
import { z } from "zod";

// server/_core/notification.ts
init_env();
import { TRPCError } from "@trpc/server";
var TITLE_MAX_LENGTH = 1200;
var CONTENT_MAX_LENGTH = 2e4;
var trimValue = (value) => value.trim();
var isNonEmptyString2 = (value) => typeof value === "string" && value.trim().length > 0;
var buildEndpointUrl = (baseUrl) => {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(
    "webdevtoken.v1.WebDevService/SendNotification",
    normalizedBase
  ).toString();
};
var validatePayload = (input) => {
  if (!isNonEmptyString2(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required."
    });
  }
  if (!isNonEmptyString2(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required."
    });
  }
  const title = trimValue(input.title);
  const content = trimValue(input.content);
  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`
    });
  }
  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`
    });
  }
  return { title, content };
};
async function notifyOwner(payload) {
  const { title, content } = validatePayload(payload);
  if (!ENV.forgeApiUrl) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service URL is not configured."
    });
  }
  if (!ENV.forgeApiKey) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification service API key is not configured."
    });
  }
  const endpoint = buildEndpointUrl(ENV.forgeApiUrl);
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${ENV.forgeApiKey}`,
        "content-type": "application/json",
        "connect-protocol-version": "1"
      },
      body: JSON.stringify({ title, content })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.warn(
        `[Notification] Failed to notify owner (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[Notification] Error calling notification service:", error);
    return false;
  }
}

// server/_core/trpc.ts
import { initTRPC, TRPCError as TRPCError2 } from "@trpc/server";
import superjson from "superjson";
var t = initTRPC.context().create({
  transformer: superjson
});
var router = t.router;
var publicProcedure = t.procedure;
var requireUser = t.middleware(async (opts) => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError2({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user
    }
  });
});
var protectedProcedure = t.procedure.use(requireUser);
var adminProcedure = t.procedure.use(
  t.middleware(async (opts) => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError2({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user
      }
    });
  })
);

// server/_core/systemRouter.ts
var systemRouter = router({
  health: publicProcedure.input(
    z.object({
      timestamp: z.number().min(0, "timestamp cannot be negative")
    })
  ).query(() => ({
    ok: true
  })),
  notifyOwner: adminProcedure.input(
    z.object({
      title: z.string().min(1, "title is required"),
      content: z.string().min(1, "content is required")
    })
  ).mutation(async ({ input }) => {
    const delivered = await notifyOwner(input);
    return {
      success: delivered
    };
  })
});

// server/routers.ts
import { TRPCError as TRPCError3 } from "@trpc/server";

// server/customAuth.ts
init_env();
import bcrypt from "bcryptjs";
import { SignJWT as SignJWT2, jwtVerify as jwtVerify2 } from "jose";
var RP_COOKIE_NAME = "rp_session";
var ONE_YEAR_MS2 = 1e3 * 60 * 60 * 24 * 365;
var SALT_ROUNDS = 12;
function getSecretKey() {
  return new TextEncoder().encode(ENV.cookieSecret);
}
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}
async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}
async function signAppSession(payload, expiresInMs = ONE_YEAR_MS2) {
  const secretKey = getSecretKey();
  const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1e3);
  return new SignJWT2({
    userId: payload.userId,
    email: payload.email,
    role: payload.role
  }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
}
async function verifyAppSession(token) {
  if (!token) return null;
  try {
    const secretKey = getSecretKey();
    const { payload } = await jwtVerify2(token, secretKey, {
      algorithms: ["HS256"]
    });
    const { userId, email, role } = payload;
    if (typeof userId !== "number" || typeof email !== "string" || role !== "user" && role !== "admin") {
      return null;
    }
    return { userId, email, role };
  } catch {
    return null;
  }
}
function setSessionCookie(res, req, token) {
  const opts = getSessionCookieOptions(req);
  res.cookie(RP_COOKIE_NAME, token, {
    ...opts,
    maxAge: ONE_YEAR_MS2
  });
}
function clearSessionCookie(res, req) {
  const opts = getSessionCookieOptions(req);
  res.clearCookie(RP_COOKIE_NAME, opts);
}
function getSessionToken(req) {
  const cookies = req.cookies;
  return cookies?.[RP_COOKIE_NAME];
}

// server/routers.ts
init_db();
import { z as z2 } from "zod";

// server/storage.ts
init_env();
function getStorageConfig() {
  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  if (!baseUrl || !apiKey) {
    throw new Error(
      "Storage proxy credentials missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { baseUrl: baseUrl.replace(/\/+$/, ""), apiKey };
}
function buildUploadUrl(baseUrl, relKey) {
  const url = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  url.searchParams.set("path", normalizeKey(relKey));
  return url;
}
async function buildDownloadUrl(baseUrl, relKey, apiKey) {
  const downloadApiUrl = new URL(
    "v1/storage/downloadUrl",
    ensureTrailingSlash(baseUrl)
  );
  downloadApiUrl.searchParams.set("path", normalizeKey(relKey));
  const response = await fetch(downloadApiUrl, {
    method: "GET",
    headers: buildAuthHeaders(apiKey)
  });
  return (await response.json()).url;
}
function ensureTrailingSlash(value) {
  return value.endsWith("/") ? value : `${value}/`;
}
function normalizeKey(relKey) {
  return relKey.replace(/^\/+/, "");
}
function toFormData(data, contentType, fileName) {
  const blob = typeof data === "string" ? new Blob([data], { type: contentType }) : new Blob([data], { type: contentType });
  const form = new FormData();
  form.append("file", blob, fileName || "file");
  return form;
}
function buildAuthHeaders(apiKey) {
  return { Authorization: `Bearer ${apiKey}` };
}
async function storagePut(relKey, data, contentType = "application/octet-stream") {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  const uploadUrl = buildUploadUrl(baseUrl, key);
  const formData = toFormData(data, contentType, key.split("/").pop() ?? key);
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: formData
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(
      `Storage upload failed (${response.status} ${response.statusText}): ${message}`
    );
  }
  const url = (await response.json()).url;
  return { key, url };
}
async function storageGet(relKey) {
  const { baseUrl, apiKey } = getStorageConfig();
  const key = normalizeKey(relKey);
  return {
    key,
    url: await buildDownloadUrl(baseUrl, key, apiKey)
  };
}

// server/applyBackgroundColors.ts
function collectColoredSections(sections) {
  const result = [];
  for (const section of sections) {
    if (section.backgroundColor) {
      result.push({
        heading: section.heading,
        level: section.type === "h3" ? "h3" : "h2",
        backgroundColor: section.backgroundColor
      });
    }
    if (section.subSections) {
      for (const sub of section.subSections) {
        if (sub.backgroundColor) {
          result.push({
            heading: sub.heading,
            level: "h3",
            backgroundColor: sub.backgroundColor
          });
        }
      }
    }
  }
  return result;
}
function normalizeHeading(text2) {
  return text2.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}
function applyBackgroundColors(html, sections) {
  const coloredSections = collectColoredSections(sections);
  if (coloredSections.length === 0) return html;
  let result = html;
  for (const section of coloredSections) {
    const normalizedTarget = normalizeHeading(section.heading);
    const tag = section.level;
    const nextTag = tag;
    const headingRegex = new RegExp(
      `(<${tag}[^>]*>)(.*?)(<\\/${tag}>)`,
      "gi"
    );
    let headingMatch;
    let headingStart = -1;
    let headingEnd = -1;
    while ((headingMatch = headingRegex.exec(result)) !== null) {
      const matchedText = normalizeHeading(headingMatch[2]);
      if (matchedText === normalizedTarget) {
        headingStart = headingMatch.index;
        headingEnd = headingMatch.index + headingMatch[0].length;
        break;
      }
    }
    if (headingStart === -1) continue;
    const before = result.substring(Math.max(0, headingStart - 200), headingStart);
    if (/<div[^>]*style="[^"]*background-color[^"]*"[^>]*>\s*$/i.test(before)) {
      continue;
    }
    const afterHeading = result.substring(headingEnd);
    const nextHeadingRegex = new RegExp(`<${nextTag}[\\s>]`, "i");
    const nextHeadingMatch = nextHeadingRegex.exec(afterHeading);
    let sectionEnd;
    if (nextHeadingMatch) {
      sectionEnd = headingEnd + nextHeadingMatch.index;
    } else {
      sectionEnd = result.length;
    }
    const sectionContent = result.substring(headingStart, sectionEnd).trimEnd();
    const style = `background-color: ${section.backgroundColor}; border-radius: 12px; padding: 24px 28px; margin: 16px 0;`;
    const wrappedSection = `<div style="${style}">
${sectionContent}
</div>`;
    result = result.substring(0, headingStart) + wrappedSection + result.substring(sectionEnd);
  }
  return result;
}

// server/aiReadiness.ts
var EXPECTED_SCHEMA_TYPES = [
  { type: "Organization", description: "Defines the brand entity and builds trust signals for AI citation" },
  { type: "WebSite", description: "Establishes site identity and enables sitelinks search" },
  { type: "WebPage", description: "Labels the page type so AI can categorize it correctly" },
  { type: "Article", description: "Marks editorial content for AI extraction and attribution" },
  { type: "BlogPosting", description: "Variant of Article for blog content" },
  { type: "FAQPage", description: "Structures Q&A content for direct AI answers" },
  { type: "BreadcrumbList", description: "Helps AI understand site hierarchy and navigation paths" },
  { type: "Person", description: "Attributes authorship with credentials for E-E-A-T signals" },
  { type: "HowTo", description: "Structures step-by-step content for AI-powered answers" },
  { type: "Product", description: "Defines product entities with pricing, reviews, availability" },
  { type: "LocalBusiness", description: "Establishes local entity presence for geo-specific AI queries" }
];
var CORE_BUCKETS = {
  org: ["Organization"],
  site: ["WebSite"],
  page: ["WebPage"],
  article: ["Article", "BlogPosting", "NewsArticle", "TechnicalArticle"],
  person: ["Person"]
};
var GENERIC_ANCHOR_PHRASES = /* @__PURE__ */ new Set([
  "click here",
  "read more",
  "learn more",
  "here",
  "link",
  "this",
  "more",
  "see more",
  "view more",
  "details",
  "click",
  "go",
  "source",
  "continue reading",
  "find out more",
  "check it out"
]);
function isolateMainContent(html) {
  const stripTags = (h) => h.replace(/<(script|style|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi, "");
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch && articleMatch[1].length > 200) {
    return { content: stripTags(articleMatch[1]), method: "article-tag" };
  }
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch && mainMatch[1].length > 200) {
    return { content: stripTags(mainMatch[1]), method: "main-tag" };
  }
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;
  return { content: stripTags(bodyContent), method: "body-fallback" };
}
function stripHtmlTags(html) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}
function analyzeSchema(html) {
  const foundTypes = /* @__PURE__ */ new Set();
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  let rawSchemaCount = 0;
  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    rawSchemaCount++;
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      extractTypes(parsed, foundTypes);
    } catch {
    }
  }
  const hasMicrodata = /itemscope|itemtype|itemprop/i.test(html);
  if (hasMicrodata) {
    const microdataRegex = /itemtype=["']https?:\/\/schema\.org\/(\w+)["']/gi;
    let mdMatch;
    while ((mdMatch = microdataRegex.exec(html)) !== null) {
      foundTypes.add(mdMatch[1]);
    }
  }
  const hasRdfa = /typeof=["'][^"']*schema\.org/i.test(html) || /vocab=["']https?:\/\/schema\.org/i.test(html);
  const typesFoundArr = Array.from(foundTypes);
  const details = EXPECTED_SCHEMA_TYPES.map((t2) => ({
    type: t2.type,
    present: foundTypes.has(t2.type),
    note: foundTypes.has(t2.type) ? "Found on page" : t2.description
  }));
  const typesMissing = EXPECTED_SCHEMA_TYPES.filter((t2) => !foundTypes.has(t2.type)).map((t2) => t2.type);
  let score = 0;
  const hasAnyStructuredData = rawSchemaCount > 0 || hasMicrodata || hasRdfa;
  if (hasAnyStructuredData) {
    score = 15;
    let coreBucketCount = 0;
    for (const bucketTypes of Object.values(CORE_BUCKETS)) {
      if (bucketTypes.some((t2) => foundTypes.has(t2))) {
        coreBucketCount++;
      }
    }
    score += coreBucketCount * 12;
    const coreTypeSet = new Set(Object.values(CORE_BUCKETS).flat());
    const bonusTypes = typesFoundArr.filter((t2) => !coreTypeSet.has(t2));
    score += Math.min(bonusTypes.length * 5, 25);
    score = Math.min(score, 100);
  }
  const suggestions = [];
  if (!hasAnyStructuredData) {
    suggestions.push("Add JSON-LD structured data to help AI systems understand your content type and context.");
  }
  if (!foundTypes.has("Organization")) {
    suggestions.push("Add Organization schema to establish your brand entity for AI citation trust.");
  }
  if (!foundTypes.has("Article") && !foundTypes.has("BlogPosting")) {
    suggestions.push("Add Article or BlogPosting schema to mark your content for AI extraction and attribution.");
  }
  if (!foundTypes.has("Person")) {
    suggestions.push("Add Person schema to attribute authorship with credentials for E-E-A-T signals.");
  }
  if (!foundTypes.has("FAQPage")) {
    suggestions.push("Add FAQPage schema to structure Q&A content for direct AI answers.");
  }
  if (!foundTypes.has("BreadcrumbList")) {
    suggestions.push("Add BreadcrumbList schema to help AI understand your site hierarchy.");
  }
  return {
    score,
    typesFound: typesFoundArr,
    typesMissing,
    details,
    rawSchemaCount,
    hasMicrodata,
    hasRdfa,
    suggestions
  };
}
function extractTypes(obj, types) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach((item) => extractTypes(item, types));
    return;
  }
  if (obj["@type"]) {
    const typeVal = obj["@type"];
    if (Array.isArray(typeVal)) {
      typeVal.forEach((t2) => types.add(t2));
    } else if (typeof typeVal === "string") {
      types.add(typeVal);
    }
  }
  if (obj["@graph"] && Array.isArray(obj["@graph"])) {
    obj["@graph"].forEach((item) => extractTypes(item, types));
  }
}
function analyzeContentStructureRaw(html) {
  const { content, method } = isolateMainContent(html);
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  const headingHierarchy = [];
  let headingMatch;
  while ((headingMatch = headingRegex.exec(content)) !== null) {
    const text2 = headingMatch[2].replace(/<[^>]+>/g, "").trim();
    if (text2) {
      headingHierarchy.push({ level: parseInt(headingMatch[1]), text: text2 });
    }
  }
  const hasProperH1 = headingHierarchy.some((h) => h.level === 1);
  const h2Count = headingHierarchy.filter((h) => h.level === 2).length;
  const h3Count = headingHierarchy.filter((h) => h.level === 3).length;
  const totalHeadings = headingHierarchy.length;
  const lists = (content.match(/<(ul|ol)[^>]*>/gi) || []).length;
  const tables = (content.match(/<table[^>]*>/gi) || []).length;
  const definitions = (content.match(/<(dl|details)[^>]*>/gi) || []).length;
  const blockquotes = (content.match(/<blockquote[^>]*>/gi) || []).length;
  const figures = (content.match(/<figure[^>]*>/gi) || []).length;
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs = [];
  let pMatch;
  while ((pMatch = paragraphRegex.exec(content)) !== null) {
    const text2 = stripHtmlTags(pMatch[1]);
    if (text2.length > 10) {
      paragraphs.push(text2);
    }
  }
  const paragraphCount = paragraphs.length;
  const avgParagraphLength = paragraphCount > 0 ? Math.round(paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphCount) : 0;
  const cleanedText = stripHtmlTags(content);
  const estimatedWordCount = cleanedText.split(/\s+/).filter(Boolean).length;
  return {
    headingHierarchy,
    hasProperH1,
    h2Count,
    h3Count,
    totalHeadings,
    semanticElements: { lists, tables, definitions, blockquotes, figures },
    paragraphCount,
    avgParagraphLength,
    estimatedWordCount,
    contentExtractionMethod: method
  };
}
function analyzeInternalLinks(html, pageUrl) {
  const { content, method } = isolateMainContent(html);
  let pageHost;
  try {
    pageHost = new URL(pageUrl).hostname;
  } catch {
    pageHost = "";
  }
  const anchorRegex = /<a\s[^>]*href=["']([^"'#]*?)["'][^>]*>(.*?)<\/a>/gi;
  const allAnchors = [];
  let aMatch;
  while ((aMatch = anchorRegex.exec(content)) !== null) {
    const href = aMatch[1].trim();
    const text2 = stripHtmlTags(aMatch[2]).trim();
    if (!href || !text2) continue;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    allAnchors.push({ href, text: text2 });
  }
  const internalAnchors = [];
  const externalAnchors = [];
  for (const anchor of allAnchors) {
    const isGeneric = GENERIC_ANCHOR_PHRASES.has(anchor.text.toLowerCase().trim());
    const linkAnchor = { text: anchor.text, href: anchor.href, isGeneric };
    if (anchor.href.startsWith("/")) {
      internalAnchors.push(linkAnchor);
    } else {
      try {
        const linkHost = new URL(anchor.href).hostname;
        if (linkHost === pageHost || linkHost.endsWith("." + pageHost)) {
          internalAnchors.push(linkAnchor);
        } else {
          externalAnchors.push(linkAnchor);
        }
      } catch {
        if (anchor.href.startsWith("/") || !anchor.href.includes("://")) {
          internalAnchors.push(linkAnchor);
        } else {
          externalAnchors.push(linkAnchor);
        }
      }
    }
  }
  const internalCount = internalAnchors.length;
  const externalCount = externalAnchors.length;
  const genericAnchors = internalAnchors.filter((a) => a.isGeneric).length;
  const descriptiveAnchors = internalCount - genericAnchors;
  const uniqueInternalTargets = new Set(internalAnchors.map((a) => a.href)).size;
  const cleanedText = stripHtmlTags(content);
  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
  const linkDensity = wordCount > 0 ? Math.round(internalCount / wordCount * 1e3 * 10) / 10 : 0;
  let score = 0;
  if (internalCount === 0) {
    score = 0;
  } else {
    score = 10;
    score += Math.min(internalCount * 3, 30);
    score += Math.round(descriptiveAnchors / internalCount * 30);
    score += Math.min(uniqueInternalTargets * 4, 20);
    if (linkDensity >= 2 && linkDensity <= 8) {
      score += 10;
    } else if (linkDensity > 0) {
      score += 5;
    }
    score = Math.min(score, 100);
  }
  const suggestions = [];
  if (internalCount === 0) {
    suggestions.push("Add internal links to help AI systems discover related content on your site.");
  } else if (internalCount < 3) {
    suggestions.push("Add more internal links (aim for at least 5) to strengthen site connectivity for AI crawlers.");
  }
  if (genericAnchors > 0) {
    suggestions.push(`Replace ${genericAnchors} generic anchor text${genericAnchors > 1 ? "s" : ""} ("click here", "read more") with descriptive text that tells AI what the linked page is about.`);
  }
  if (externalCount === 0) {
    suggestions.push("Add external links to authoritative sources to build trust signals for AI citation.");
  }
  if (linkDensity > 15) {
    suggestions.push("Link density is very high (>15 per 1000 words). Consider reducing to avoid appearing spammy to AI systems.");
  }
  if (uniqueInternalTargets > 0 && internalCount / uniqueInternalTargets > 3) {
    suggestions.push("Many links point to the same targets. Diversify internal link destinations to help AI map more of your site.");
  }
  return {
    score,
    totalLinks: internalCount + externalCount,
    internalLinks: internalCount,
    externalLinks: externalCount,
    genericAnchors,
    descriptiveAnchors,
    uniqueInternalTargets,
    linkDensity,
    anchors: [...internalAnchors, ...externalAnchors].slice(0, 30),
    suggestions
  };
}
function prepareContentForLLM(html, maxChars = 15e3) {
  let cleaned = html.replace(/<(script|style|nav|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned.length > maxChars) {
    cleaned = cleaned.slice(0, maxChars) + "\n[...truncated]";
  }
  return cleaned;
}
function prepareHtmlForLLM(html, maxChars = 15e3) {
  let cleaned = html.replace(/<(script|style|nav|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, "");
  if (cleaned.length > maxChars) {
    cleaned = cleaned.slice(0, maxChars) + "\n[...truncated]";
  }
  return cleaned;
}
function stripMarkdownFences(text2) {
  return text2.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}
function extractPageTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch ? stripHtmlTags(titleMatch[1]).trim() : "Untitled Page";
}

// server/applyTemplateStyles.ts
var PRO_TIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:8px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
function wrapProTip(innerContent) {
  return `<div style="background-color: #ECFDF5; border-left: 4px solid #166534; border-radius: 8px; padding: 20px 24px; margin: 20px 0;" data-template="pro-tip">
<p style="margin: 0 0 8px 0; display: flex; align-items: center;">${PRO_TIP_SVG}<strong style="color: #166534; font-size: 1.05em;">Pro Tip</strong></p>
${innerContent}
</div>`;
}
function wrapSummary(innerContent) {
  return `<div style="background-color: #F9FAFB; border-left: 4px solid #6B7280; border-radius: 8px; padding: 20px 24px; margin: 20px 0;" data-template="summary">
<p style="margin: 0 0 12px 0;"><strong style="font-size: 1.1em;">Summary</strong></p>
${innerContent}
</div>`;
}
function splitUseCaseCards(bodyContent) {
  const strongParagraphRegex = /<p[^>]*>\s*<strong[^>]*>(.*?)<\/strong>\s*<\/p>/gi;
  const matches = [];
  let match;
  while ((match = strongParagraphRegex.exec(bodyContent)) !== null) {
    matches.push({
      index: match.index,
      fullMatch: match[0],
      title: match[1]
    });
  }
  if (matches.length === 0) {
    return { intro: bodyContent, cards: [] };
  }
  const intro = bodyContent.substring(0, matches[0].index).trim();
  const cards = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const contentStart = current.index + current.fullMatch.length;
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index : bodyContent.length;
    const body = bodyContent.substring(contentStart, contentEnd).trim();
    cards.push({ title: current.title, body });
  }
  return { intro, cards };
}
function wrapUseCases(innerContent) {
  const { intro, cards } = splitUseCaseCards(innerContent);
  if (cards.length === 0) {
    return `<div data-template="use-cases">
${intro || innerContent}
</div>`;
  }
  let html = `<div data-template="use-cases">
`;
  if (intro) {
    html += `${intro}
`;
  }
  for (const card of cards) {
    html += `<div style="background-color: #F8FAFC; border-left: 4px solid #334155; border-radius: 8px; padding: 16px 20px; margin: 12px 0;">
<p style="margin: 0 0 4px 0;"><strong style="color: #1E293B; font-size: 1.05em;">${card.title}</strong></p>
${card.body}
</div>
`;
  }
  html += `</div>`;
  return html;
}
var COVERAGE_DOC_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:10px;flex-shrink:0;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
var COVERAGE_CHECK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16A34A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;
var COVERAGE_X_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:6px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`;
var COVERAGE_DOLLAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:8px;flex-shrink:0;"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
function parseCoverageCardContent(bodyContent) {
  const summary = [];
  const covers = [];
  const doesNotCover = [];
  let costNote = "";
  let currentList = null;
  const parts = bodyContent.split(/(?=<(?:p|ul|ol|h3|li)[\s>])/i).filter((p) => p.trim());
  for (const part of parts) {
    const stripped = part.replace(/<[^>]*>/g, "").trim();
    if (!stripped) continue;
    if (/<h3[^>]*>/i.test(part) && /what\s+it\s+covers/i.test(stripped)) {
      currentList = "covers";
      continue;
    }
    if (/<h3[^>]*>/i.test(part) && /what\s+it\s+(doesn.?t|does\s+not)\s+cover/i.test(stripped)) {
      currentList = "doesNotCover";
      continue;
    }
    if (/^\s*<p[^>]*>/i.test(part) && /^\$?\s*cost/i.test(stripped)) {
      costNote = stripped;
      continue;
    }
    if (/<li[^>]*>/i.test(part)) {
      const items = part.match(/<li[^>]*>(.*?)<\/li>/gi) || [];
      for (const item of items) {
        const text2 = item.replace(/<[^>]*>/g, "").trim();
        if (!text2) continue;
        if (currentList === "covers") covers.push(text2);
        else if (currentList === "doesNotCover") doesNotCover.push(text2);
      }
      continue;
    }
    if (currentList && /<p[^>]*>/i.test(part)) {
      const text2 = stripped;
      if (currentList === "covers") covers.push(text2);
      else doesNotCover.push(text2);
      continue;
    }
    if (!currentList) {
      summary.push(stripped);
    }
  }
  return {
    summary: summary.join(" "),
    covers,
    doesNotCover,
    costNote
  };
}
function wrapCoverageCard(innerContent, headingText) {
  const cleanHeading = headingText.replace(/<[^>]*>/g, "").trim();
  const { summary, covers, doesNotCover, costNote } = parseCoverageCardContent(innerContent);
  let html = `<div style="border-radius: 12px; overflow: hidden; margin: 24px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" data-template="coverage-card">`;
  html += `
<div style="background: linear-gradient(135deg, #3B82F6, #2563EB); padding: 16px 24px; display: flex; align-items: center;">`;
  html += `${COVERAGE_DOC_SVG}<strong style="color: white; font-size: 1.15em;">${cleanHeading}</strong>`;
  html += `</div>`;
  html += `
<div style="padding: 24px 28px; background: white;">`;
  if (summary) {
    html += `
<p style="margin: 0 0 20px 0; color: #374151; line-height: 1.6;">${summary}</p>`;
  }
  if (covers.length > 0 || doesNotCover.length > 0) {
    html += `
<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px;">`;
    html += `
<div>`;
    html += `
<p style="margin: 0 0 12px 0; display: flex; align-items: center;">${COVERAGE_CHECK_SVG}<strong style="color: #374151;">What It Covers</strong></p>`;
    for (const item of covers) {
      html += `
<p style="margin: 0 0 8px 0; padding-left: 4px; color: #374151; line-height: 1.5; display: flex; align-items: flex-start;"><span style="color: #16A34A; margin-right: 8px; font-size: 1.2em; line-height: 1;">&#8226;</span>${item}</p>`;
    }
    html += `
</div>`;
    html += `
<div>`;
    html += `
<p style="margin: 0 0 12px 0; display: flex; align-items: center;">${COVERAGE_X_SVG}<strong style="color: #374151;">What It Doesn't Cover</strong></p>`;
    for (const item of doesNotCover) {
      html += `
<p style="margin: 0 0 8px 0; padding-left: 4px; color: #374151; line-height: 1.5; display: flex; align-items: flex-start;"><span style="color: #DC2626; margin-right: 8px; font-size: 1.2em; line-height: 1;">&#8226;</span>${item}</p>`;
    }
    html += `
</div>`;
    html += `
</div>`;
  }
  if (costNote) {
    html += `
<div style="background-color: #EFF6FF; border-radius: 8px; padding: 14px 20px; margin-top: 4px; display: flex; align-items: flex-start;">`;
    html += `${COVERAGE_DOLLAR_SVG}<p style="margin: 0; color: #1E40AF; line-height: 1.5;"><strong style="color: #1E40AF;">Cost:</strong> ${costNote.replace(/^\$?\s*cost:?\s*/i, "")}</p>`;
    html += `</div>`;
  }
  html += `
</div>`;
  html += `
</div>`;
  return html;
}
function normalizeHeading2(text2) {
  return text2.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}
var HEADING_ALIASES = {
  "summary": ["summary", "conclusion", "final thoughts", "in summary", "wrapping up", "key takeaways summary", "to sum up", "article summary"],
  "pro-tip": ["pro tip", "expert tip", "quick tip", "insider tip", "bonus tip", "helpful tip"],
  "use-cases": ["use cases", "common scenarios", "who this applies to", "when to use this", "common use cases", "typical scenarios", "who should consider this", "who benefits", "scenarios"],
  "coverage-card": ["coverage", "what it covers", "coverage overview", "plan coverage", "benefits coverage", "coverage details", "hospital insurance", "medical insurance"]
};
function collectTemplateSections(sections) {
  const result = [];
  let h2Index = 0;
  for (const section of sections) {
    if (section.templateType) {
      result.push({
        heading: section.heading,
        level: section.type === "h3" ? "h3" : "h2",
        templateType: section.templateType,
        outlineIndex: section.type === "h3" ? 0 : h2Index
      });
    }
    if (section.subSections) {
      let h3Index = 0;
      for (const sub of section.subSections) {
        if (sub.templateType) {
          result.push({
            heading: sub.heading,
            level: "h3",
            templateType: sub.templateType,
            outlineIndex: h3Index
          });
        }
        h3Index++;
      }
    }
    if (section.type !== "h3") {
      h2Index++;
    }
  }
  return result;
}
function headingMatchesAlias(matchedText, templateType) {
  const normalizedMatched = normalizeHeading2(matchedText);
  const aliases = HEADING_ALIASES[templateType];
  if (aliases) {
    for (const alias of aliases) {
      if (normalizedMatched === alias) return true;
    }
  }
  return false;
}
function findAllHeadings(html, tag) {
  const regex = new RegExp(`(<${tag}[^>]*>)(.*?)(<\\/${tag}>)`, "gi");
  const headings = [];
  let match;
  let idx = 0;
  while ((match = regex.exec(html)) !== null) {
    headings.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[2],
      index: idx
    });
    idx++;
  }
  return headings;
}
function applyTemplateStyles(html, sections) {
  const templateSections = collectTemplateSections(sections);
  if (templateSections.length === 0) return html;
  const headingsByLevel = {};
  for (const section of templateSections) {
    if (!headingsByLevel[section.level]) {
      headingsByLevel[section.level] = findAllHeadings(html, section.level);
    }
  }
  const claimedIndices = {};
  const replacements = [];
  for (const section of templateSections) {
    const tag = section.level;
    const allHeadings = headingsByLevel[tag] || [];
    if (!claimedIndices[tag]) claimedIndices[tag] = /* @__PURE__ */ new Set();
    const claimed = claimedIndices[tag];
    let matchedHeading = null;
    const normalizedTarget = normalizeHeading2(section.heading);
    for (const h of allHeadings) {
      if (claimed.has(h.index)) continue;
      if (normalizeHeading2(h.text) === normalizedTarget) {
        matchedHeading = h;
        break;
      }
    }
    if (!matchedHeading) {
      for (const h of allHeadings) {
        if (claimed.has(h.index)) continue;
        if (headingMatchesAlias(h.text, section.templateType)) {
          matchedHeading = h;
          break;
        }
      }
    }
    if (!matchedHeading) {
      const targetIndex = section.outlineIndex;
      if (targetIndex < allHeadings.length) {
        const target = allHeadings[targetIndex];
        if (target && !claimed.has(target.index)) {
          matchedHeading = target;
        }
      }
    }
    if (!matchedHeading) continue;
    claimed.add(matchedHeading.index);
    const headingStart = matchedHeading.start;
    const headingEnd = matchedHeading.end;
    const before = html.substring(Math.max(0, headingStart - 300), headingStart);
    if (before.includes(`data-template="${section.templateType}"`)) {
      continue;
    }
    const afterHeading = html.substring(headingEnd);
    const nextHeadingRegex = new RegExp(`<${tag}[\\s>]`, "i");
    const nextHeadingMatch = nextHeadingRegex.exec(afterHeading);
    let sectionEnd;
    if (nextHeadingMatch) {
      sectionEnd = headingEnd + nextHeadingMatch.index;
    } else {
      sectionEnd = html.length;
    }
    const beforeSection = html.substring(Math.max(0, headingStart - 200), headingStart);
    const bgDivMatch = beforeSection.match(/<div[^>]*style="[^"]*background-color[^"]*"[^>]*>\s*$/i);
    let actualStart = headingStart;
    let actualEnd = sectionEnd;
    if (bgDivMatch) {
      actualStart = headingStart - bgDivMatch[0].length;
      const afterSection = html.substring(sectionEnd);
      const closingDivMatch = afterSection.match(/^\s*<\/div>/i);
      if (closingDivMatch) {
        actualEnd = sectionEnd + closingDivMatch[0].length;
      }
    }
    const bodyContent = html.substring(headingEnd, sectionEnd).trim();
    let wrappedSection;
    if (section.templateType === "pro-tip") {
      wrappedSection = wrapProTip(bodyContent);
    } else if (section.templateType === "summary") {
      wrappedSection = wrapSummary(bodyContent);
    } else if (section.templateType === "use-cases") {
      wrappedSection = wrapUseCases(bodyContent);
    } else if (section.templateType === "coverage-card") {
      wrappedSection = wrapCoverageCard(bodyContent, matchedHeading.text);
    } else {
      continue;
    }
    replacements.push({
      actualStart,
      actualEnd,
      replacement: wrappedSection
    });
  }
  replacements.sort((a, b) => b.actualStart - a.actualStart);
  let result = html;
  for (const r of replacements) {
    result = result.substring(0, r.actualStart) + r.replacement + result.substring(r.actualEnd);
  }
  return result;
}

// server/claude.ts
init_env();
import Anthropic from "@anthropic-ai/sdk";
function toAnthropicContent(content) {
  const parts = Array.isArray(content) ? content : [content];
  if (parts.length === 1 && typeof parts[0] === "string") {
    return parts[0];
  }
  const blocks = [];
  for (const part of parts) {
    if (typeof part === "string") {
      blocks.push({ type: "text", text: part });
    } else if (part.type === "text") {
      blocks.push({ type: "text", text: part.text });
    } else if (part.type === "image_url") {
      const url = part.image_url.url;
      if (url.startsWith("data:")) {
        const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          blocks.push({
            type: "image",
            source: {
              type: "base64",
              media_type: match[1],
              data: match[2]
            }
          });
        }
      } else {
        blocks.push({
          type: "image",
          source: {
            type: "url",
            url
          }
        });
      }
    }
  }
  return blocks;
}
function convertMessages(messages) {
  let system;
  const anthropicMessages = [];
  for (const msg of messages) {
    if (msg.role === "system") {
      const content = typeof msg.content === "string" ? msg.content : Array.isArray(msg.content) ? msg.content.map((p) => typeof p === "string" ? p : "text" in p ? p.text : "").join("\n") : "";
      system = system ? `${system}

${content}` : content;
      continue;
    }
    const role = msg.role === "assistant" ? "assistant" : "user";
    anthropicMessages.push({
      role,
      content: toAnthropicContent(msg.content)
    });
  }
  return { system, anthropicMessages };
}
var CLAUDE_MODELS = [
  "claude-sonnet-4-6",
  "claude-sonnet-5",
  "claude-haiku-4-5"
];
var AVAILABLE_CLAUDE_MODELS = CLAUDE_MODELS.map((m) => ({
  id: m,
  label: m === "claude-sonnet-4-6" ? "Claude Sonnet 4.6 (Default)" : m === "claude-sonnet-5" ? "Claude Sonnet 5 (Latest)" : m === "claude-haiku-4-5" ? "Claude Haiku 4.5 (Fast)" : m
}));
async function invokeClaudeLLM(params, model) {
  if (!ENV.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }
  const client = new Anthropic({ apiKey: ENV.anthropicApiKey });
  let { system, anthropicMessages } = convertMessages(params.messages);
  const maxTokens = params.maxTokens ?? params.max_tokens ?? 8192;
  const selectedModel = model || "claude-sonnet-4-6";
  const responseFormat = params.responseFormat ?? params.response_format;
  if (responseFormat && responseFormat.type === "json_schema") {
    const schemaHint = JSON.stringify(responseFormat.json_schema.schema, null, 2);
    const jsonInstruction = `

IMPORTANT: You MUST respond with ONLY valid JSON matching this schema \u2014 no markdown code fences, no explanation:
${schemaHint}`;
    system = system ? `${system}${jsonInstruction}` : jsonInstruction;
  } else if (responseFormat && responseFormat.type === "json_object") {
    const jsonInstruction = `

IMPORTANT: You MUST respond with ONLY valid JSON \u2014 no markdown code fences, no explanation.`;
    system = system ? `${system}${jsonInstruction}` : jsonInstruction;
  }
  const MAX_RETRIES = 3;
  let lastError;
  let response;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      response = await client.messages.create({
        model: selectedModel,
        max_tokens: maxTokens,
        system: system || void 0,
        messages: anthropicMessages
      });
      break;
    } catch (err) {
      lastError = err;
      const status = err?.status ?? err?.statusCode ?? err?.error?.status;
      const isRetryable = [429, 500, 503, 529].includes(status) || typeof err?.message === "string" && /overloaded|rate.?limit|too many|capacity|server error/i.test(err.message);
      if (!isRetryable || attempt === MAX_RETRIES) {
        throw err;
      }
      const delay = Math.pow(2, attempt + 1) * 1e3;
      console.warn(`[Claude] Retryable error (status=${status}), attempt ${attempt + 1}/${MAX_RETRIES}, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  if (!response) {
    throw lastError || new Error("Claude API call failed after retries");
  }
  const textContent = response.content.filter((block) => block.type === "text").map((block) => block.text).join("");
  const result = {
    id: response.id,
    created: Date.now(),
    model: response.model,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content: textContent
        },
        finish_reason: response.stop_reason ?? "stop"
      }
    ],
    usage: {
      prompt_tokens: response.usage.input_tokens,
      completion_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens
    }
  };
  return result;
}

// server/_core/llm.ts
async function invokeLLM(params) {
  return invokeClaudeLLM(params, params.model);
}

// server/sitemap-parser.ts
async function parseSitemap(sitemapUrl) {
  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        "User-Agent": "RankPilot-Bot/1.0"
      },
      signal: AbortSignal.timeout(15e3)
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
    }
    const xmlText = await response.text();
    const urls = [];
    const urlRegex = /<url>([\s\S]*?)<\/url>/g;
    let match;
    while ((match = urlRegex.exec(xmlText)) !== null) {
      const urlBlock = match[1];
      const locMatch = urlBlock.match(/<loc>(.*?)<\/loc>/);
      const url = locMatch ? locMatch[1].trim() : null;
      if (!url) continue;
      const lastmodMatch = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/);
      const lastmod = lastmodMatch ? lastmodMatch[1].trim() : void 0;
      try {
        const urlPath = new URL(url).pathname;
        const pathSegments = urlPath.split("/").filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || "";
        const title = lastSegment.replace(/\.(html|htm|php|asp|aspx)$/i, "").replace(/[-_]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
        urls.push({
          url,
          title: title || url,
          lastmod
        });
      } catch {
        urls.push({ url, title: url, lastmod });
      }
    }
    return urls;
  } catch (error) {
    console.error("Error parsing sitemap:", error);
    return [];
  }
}

// server/routers.ts
init_schema();
init_db();
import { eq as eq2, desc as desc2 } from "drizzle-orm";

// server/entity-prompts.ts
function getEntityAnalysisPrompt(content, primaryKeyword) {
  const keywordInstruction = primaryKeyword ? `
TARGET PRIMARY KEYWORD: "${primaryKeyword}"

IMPORTANT: The user has specified "${primaryKeyword}" as their intended primary entity/keyword. Your analysis should:
1. Evaluate how well the content establishes "${primaryKeyword}" as the primary entity
2. Score "Primary Entity Clarity" based on how effectively "${primaryKeyword}" is positioned as the dominant entity (NOT based on what you think the primary entity should be)
3. Still identify and list all other entities found in the content
4. Assess whether "${primaryKeyword}" has sufficient dominance, early reinforcement, and structural support
5. If "${primaryKeyword}" is NOT well-established as the primary entity, your recommendations should focus on how to better establish it

In the output, set the primaryEntity.name to "${primaryKeyword}" and evaluate the content against this target keyword.
` : `
Determine the PRIMARY ENTITY (central to thesis, appears early, structurally reinforced, discussed in most sections)
Justify why this entity is primary
`;
  return `You are an expert SEO analyst specializing in entity-based optimization and content structure analysis. Analyze the following article content using the comprehensive 6-step Entity + Salience framework.

ARTICLE CONTENT:
---
${content}
---
${keywordInstruction}
Perform the complete analysis following these steps:

STEP 1: ENTITY EXTRACTION
- Identify ALL meaningful entities: Organizations, Products, Government programs, Locations, Named concepts, Plan types/coverage types
- For each entity determine: Entity name, Entity type, Estimated prominence (High/Medium/Low), Rationale for prominence level${!primaryKeyword ? "\n- Determine the PRIMARY ENTITY (central to thesis, appears early, structurally reinforced, discussed in most sections)\n- Justify why this entity is primary" : ""}

STEP 2: SALIENCE STRUCTURE ANALYSIS
Evaluate:
A) Dominance Gap - Grade: Strong dominance / Moderate dominance / Split focus / Competing entities
B) Early Reinforcement - Check: in first paragraph, in heading, within first 120 words
C) Entity Drift - Label: No drift / Minor drift / Moderate drift / Severe dilution

STEP 3: SUPPORTING ENTITY COVERAGE
Evaluate if related sub-entities, expected comparisons, key structural components are covered
Grade: Comprehensive / Adequate / Thin / Incomplete

STEP 4: GEO / AI OVERVIEW EXTRACTABILITY
Evaluate: concise definitions, clear question answering, short answer summary, clean headings, AI extractability
Grade: High / Moderate / Low

STEP 5: SCORING (0-100 for each):
- Primary Entity Clarity (0-40: unclear, 40-70: clear but diluted, 70-90: clear and reinforced, 90-100: dominant)
- Entity Focus (0-40: major drift, 40-70: some dilution, 70-90: strong focus, 90-100: extremely tight)
- Supporting Entity Coverage (0-40: missing core, 40-70: partial, 70-90: solid, 90-100: comprehensive)
- GEO Extractability (0-40: poorly structured, 40-70: some signals, 70-90: clear structure, 90-100: highly citation-ready)
- Calculate Overall Score = (Primary Clarity * 0.3) + (Entity Focus * 0.3) + (Supporting Coverage * 0.2) + (GEO Extractability * 0.2)

STEP 6: ACTIONABLE FIXES
Provide exactly 5 specific, actionable fixes tied directly to entity and salience structure improvements.

ADVANCED ANALYSIS:
- If the current primary entity is too broad, suggest a refined primary entity framing
- Provide a suggested title rewrite aligned to the dominant entity
- Identify 3 missing supporting entities that should be added

Respond with raw JSON only in this exact structure:
{
  "primaryEntity": {
    "name": "Primary entity name",
    "type": "Entity type",
    "justification": "Detailed justification for why this is the primary entity"
  },
  "entities": [
    {
      "name": "Entity name",
      "type": "Organization|Product|Location|Concept|Program|Person|etc",
      "prominence": "High|Medium|Low",
      "rationale": "Why this prominence level"
    }
  ],
  "salienceStructure": {
    "dominanceGap": {
      "grade": "Strong dominance|Moderate dominance|Split focus|Competing entities",
      "description": "Explanation of dominance analysis"
    },
    "earlyReinforcement": {
      "inFirstParagraph": true,
      "inHeading": true,
      "withinFirst120Words": true,
      "summary": "Summary of early reinforcement analysis"
    },
    "entityDrift": {
      "level": "No drift|Minor drift|Moderate drift|Severe dilution",
      "description": "Explanation of any drift detected"
    }
  },
  "supportingCoverage": {
    "grade": "Comprehensive|Adequate|Thin|Incomplete",
    "relatedSubEntities": ["list of related sub-entities found"],
    "missingComponents": ["list of expected but missing components"],
    "evaluation": "Detailed evaluation"
  },
  "geoExtractability": {
    "grade": "High|Moderate|Low",
    "hasConcisenDefinitions": true,
    "hasClearQuestionAnswering": true,
    "hasShortAnswerSummary": true,
    "hasCleanHeadings": true,
    "evaluation": "Detailed evaluation of AI extractability"
  },
  "scores": {
    "primaryEntityClarity": 75,
    "entityFocus": 80,
    "supportingCoverage": 70,
    "geoExtractability": 65,
    "overallScore": 73.5
  },
  "actionableFixes": [
    "Fix 1 - specific actionable recommendation",
    "Fix 2 - specific actionable recommendation",
    "Fix 3 - specific actionable recommendation",
    "Fix 4 - specific actionable recommendation",
    "Fix 5 - specific actionable recommendation"
  ],
  "advancedRecommendations": {
    "refinedPrimaryEntity": "Suggested refined primary entity if current is too broad, or same if adequate",
    "refinedEntityRationale": "Explanation of the refinement",
    "suggestedTitleRewrite": "New title aligned to dominant entity",
    "missingSupportingEntities": ["Entity 1", "Entity 2", "Entity 3"]
  }
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;
}
function getSemanticAnalysisPrompt(content, targetKeyword) {
  return `You are an expert SEO semantic content analyst. Analyze the following article content for semantic quality against the target keyword/topic.

TARGET KEYWORD/TOPIC: "${targetKeyword}"

ARTICLE CONTENT:
---
${content}
---

Perform the following semantic analysis:

## LAYER 1: RELEVANCE ANALYSIS
Measure how semantically close the content is to the target keyword/topic.
- Evaluate the intro/first paragraph alignment to the target keyword
- Evaluate the H2/H3 headings alignment to the target keyword
- Evaluate the full body content alignment
- Score each area 0-100
- Provide an overall relevance score 0-100
- A page can be topically related but not tightly aligned -- your score should reflect that

## LAYER 2: SECTION-LEVEL ANALYSIS
For each identifiable H2 or H3 section in the content:
- Identify the heading and its level (H2/H3)
- Score its relevance to the target keyword (0-100)
- Explain why this score
- Identify which OTHER sections it semantically overlaps with (if any)
- Rate overlap severity: None / Low / Moderate / High
- Describe what unique value this section provides

If two or more sections land in the same semantic neighborhood (meaning they essentially say the same thing or cover the same ground), that indicates redundancy/fluff.

## LAYER 3: REDUNDANCY ANALYSIS
Measure how much repeated meaning exists across sections.
- Identify specific pairs of sections that have high semantic overlap
- For each pair, explain what they share and rate similarity: High / Moderate / Low
- Calculate a uniqueness score (0-100, where 100 = every section is distinct)
- Calculate a redundancy score (0-100, where 100 = extreme redundancy, 0 = no redundancy)
- Provide an overall assessment

## LAYER 4: TOPIC COVERAGE ANALYSIS
Measure whether the content covers the expected concept space for the target keyword.
- List what a comprehensive page on this topic SHOULD cover (expected topics/subtopics)
- List which of those topics ARE covered in the content
- List which topics are MISSING
- Score coverage 0-100
- Provide evaluation explaining gaps

## SCORING
- Relevance Score: 0-100
- Coverage Score: 0-100
- Uniqueness Score: 0-100 (inverse of redundancy)
- Overall Semantic Score = (Relevance x 0.40) + (Coverage x 0.35) + (Uniqueness x 0.25)

## SEMANTIC FIXES
Provide exactly 5 specific, actionable fixes tied directly to semantic relevance, redundancy, and coverage.
Do not provide generic SEO advice.
Every recommendation should reference a specific section, gap, or overlap you identified.

Respond with raw JSON only in this exact structure:
{
  "targetKeyword": "${targetKeyword}",
  "relevance": {
    "score": 75,
    "introRelevance": 80,
    "headingsRelevance": 70,
    "bodyRelevance": 75,
    "evaluation": "Detailed evaluation of semantic relevance to target keyword"
  },
  "redundancy": {
    "score": 20,
    "redundantPairs": [
      {
        "sectionA": "Heading of first section",
        "sectionB": "Heading of second section",
        "similarity": "High|Moderate|Low",
        "explanation": "What they share semantically"
      }
    ],
    "overallAssessment": "Summary of redundancy findings",
    "uniquenessScore": 80
  },
  "coverage": {
    "score": 70,
    "coveredTopics": ["topic1", "topic2"],
    "missingTopics": ["topic1", "topic2"],
    "expectedTopics": ["topic1", "topic2"],
    "evaluation": "Detailed evaluation of topic coverage"
  },
  "sections": [
    {
      "heading": "Section heading text",
      "headingLevel": "H2|H3",
      "relevanceScore": 80,
      "relevanceExplanation": "Why this relevance score",
      "overlapsWith": ["Other section heading if overlaps"],
      "overlapSeverity": "None|Low|Moderate|High",
      "uniqueValue": "What unique value this section provides"
    }
  ],
  "scores": {
    "relevance": 75,
    "coverage": 70,
    "uniqueness": 80,
    "overallSemantic": 74.5
  },
  "semanticFixes": [
    "Fix 1 - specific actionable recommendation referencing a specific section or gap",
    "Fix 2",
    "Fix 3",
    "Fix 4",
    "Fix 5"
  ]
}

Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;
}

// server/gsc-parser.ts
import * as XLSX from "xlsx";
function parseGscExcel(buffer, fileName) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const queries = parseQueriesSheet(workbook);
  const pages = parsePagesSheet(workbook);
  const chartData = parseChartSheet(workbook);
  const dateRange = parseDateRange(workbook);
  const nearJumpKeywords = computeNearJump(queries, 5, 30);
  const highImpressionLowCtr = computeHighImpressionLowCtr(queries);
  const quickWinKeywords = computeQuickWins(queries);
  const zeroClickPages = computeZeroClickPages(pages);
  const cannibalizationGroups = computeCannibalization(queries);
  return {
    fileName,
    dateRange,
    totalQueries: queries.length,
    totalPages: pages.length,
    queries,
    pages,
    chartData,
    nearJumpKeywords,
    highImpressionLowCtr,
    quickWinKeywords,
    zeroClickPages,
    cannibalizationGroups
  };
}
function parseQueriesSheet(workbook) {
  const sheet = workbook.Sheets["Queries"];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const query = String(row[0] ?? "").trim();
    const clicks = parseFloat(String(row[1] ?? "0")) || 0;
    const impressions = parseFloat(String(row[2] ?? "0")) || 0;
    const ctr = parseFloat(String(row[3] ?? "0")) || 0;
    const position = parseFloat(String(row[4] ?? "0")) || 0;
    if (!query || query === "Top queries") continue;
    results.push({ query, clicks, impressions, ctr, position });
  }
  return results;
}
function parsePagesSheet(workbook) {
  const sheet = workbook.Sheets["Pages"];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const page = String(row[0] ?? "").trim();
    const clicks = parseFloat(String(row[1] ?? "0")) || 0;
    const impressions = parseFloat(String(row[2] ?? "0")) || 0;
    const ctr = parseFloat(String(row[3] ?? "0")) || 0;
    const position = parseFloat(String(row[4] ?? "0")) || 0;
    if (!page || page === "Top pages") continue;
    results.push({ page, clicks, impressions, ctr, position });
  }
  return results;
}
function parseChartSheet(workbook) {
  const sheet = workbook.Sheets["Chart"];
  if (!sheet) return [];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  const results = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const rawDate = row[0];
    let date = "";
    if (rawDate instanceof Date) {
      date = rawDate.toISOString().split("T")[0];
    } else if (typeof rawDate === "string") {
      date = rawDate;
    } else if (typeof rawDate === "number") {
      const d = XLSX.SSF.parse_date_code(rawDate);
      date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }
    const clicks = parseFloat(String(row[1] ?? "0")) || 0;
    const impressions = parseFloat(String(row[2] ?? "0")) || 0;
    const ctr = parseFloat(String(row[3] ?? "0")) || 0;
    const position = parseFloat(String(row[4] ?? "0")) || 0;
    if (!date) continue;
    results.push({ date, clicks, impressions, ctr, position });
  }
  return results;
}
function parseDateRange(workbook) {
  const sheet = workbook.Sheets["Filters"];
  if (!sheet) return "";
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (String(row[0]).toLowerCase() === "date") {
      return String(row[1] ?? "");
    }
  }
  return "";
}
function computeNearJump(queries, minPos, maxPos) {
  return queries.filter((q) => q.position >= minPos && q.position <= maxPos).sort((a, b) => b.impressions - a.impressions);
}
function computeHighImpressionLowCtr(queries) {
  return queries.filter((q) => q.impressions >= 200 && q.ctr < 0.05 && q.position <= 20).sort((a, b) => b.impressions - a.impressions);
}
function computeQuickWins(queries) {
  return queries.filter((q) => q.position >= 5 && q.position <= 20 && q.impressions >= 50 && q.clicks < 5).sort((a, b) => b.impressions - a.impressions);
}
function computeZeroClickPages(pages) {
  return pages.filter((p) => p.clicks === 0 && p.impressions >= 100).sort((a, b) => b.impressions - a.impressions);
}
function computeCannibalization(queries) {
  const candidates = queries.filter((q) => q.impressions >= 30);
  const STOPWORDS = /* @__PURE__ */ new Set([
    "the",
    "and",
    "for",
    "are",
    "but",
    "not",
    "you",
    "all",
    "can",
    "her",
    "was",
    "one",
    "our",
    "out",
    "day",
    "get",
    "has",
    "him",
    "his",
    "how",
    "its",
    "may",
    "new",
    "now",
    "old",
    "see",
    "two",
    "who",
    "did",
    "does",
    "from",
    "have",
    "that",
    "this",
    "they",
    "with",
    "will",
    "your",
    "what",
    "when",
    "which",
    "there",
    "their",
    "been",
    "more",
    "also",
    "into",
    "than",
    "then",
    "some",
    "would",
    "make",
    "like",
    "time",
    "just",
    "know",
    "take",
    "year",
    "good",
    "much",
    "need",
    "even",
    "well",
    "back",
    "only",
    "come",
    "over",
    "think",
    "also",
    "after",
    "about",
    "other",
    "many",
    "most"
  ]);
  function tokenize(text2) {
    return new Set(
      text2.toLowerCase().split(/\s+/).map((w) => w.replace(/[^a-z]/g, "")).filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    );
  }
  const tokenSets = candidates.map((q) => ({
    query: q,
    tokens: tokenize(q.query)
  }));
  const groups = /* @__PURE__ */ new Map();
  const assigned = /* @__PURE__ */ new Set();
  for (let i = 0; i < tokenSets.length; i++) {
    if (assigned.has(i)) continue;
    const group = [tokenSets[i].query];
    const groupTokens = new Set(tokenSets[i].tokens);
    for (let j = i + 1; j < tokenSets.length; j++) {
      if (assigned.has(j)) continue;
      const shared = Array.from(tokenSets[j].tokens).filter((t2) => groupTokens.has(t2));
      if (shared.length >= 2) {
        group.push(tokenSets[j].query);
        assigned.add(j);
        Array.from(tokenSets[j].tokens).forEach((t2) => groupTokens.add(t2));
      }
    }
    if (group.length >= 2) {
      const allTokens = group.flatMap((q) => Array.from(tokenize(q.query)));
      const freq = /* @__PURE__ */ new Map();
      allTokens.forEach((t2) => freq.set(t2, (freq.get(t2) ?? 0) + 1));
      const topic = Array.from(freq.entries()).filter(([, count]) => count >= 2).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t2]) => t2).join(" ");
      if (topic) {
        groups.set(topic, group);
      }
      assigned.add(i);
    }
  }
  return Array.from(groups.entries()).map(([topic, queries2]) => ({ topic, queries: queries2 })).sort((a, b) => b.queries.length - a.queries.length).slice(0, 50);
}

// server/routers.ts
function getReferenceDocS3Key(projectId) {
  return `reference-docs/project-${projectId}-${Date.now()}.txt`;
}
async function fetchReferenceDocFromS3(s3Key) {
  try {
    const { url } = await storageGet(s3Key);
    const resp = await fetch(url);
    if (!resp.ok) {
      console.warn(`[RefDoc S3] Fetch returned ${resp.status} for key: ${s3Key}`);
      return null;
    }
    const content = await resp.text();
    if (!content || content.trim().length === 0) return null;
    return content;
  } catch (e) {
    console.warn(`[RefDoc S3] Failed to fetch key ${s3Key}:`, e);
    return null;
  }
}
function buildResearchSection(research) {
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  let section = `
=== RESEARCH FINDINGS - USE THESE TO INFORM THE OUTLINE ===
Current Year: ${currentYear}. Always use the most recent data available. Prefer ${currentYear} data over older data.

`;
  if (research.statistics?.length) {
    section += `STATISTICS & DATA POINTS TO REFERENCE:
`;
    research.statistics.slice(0, 6).forEach((stat, i) => {
      section += `  ${i + 1}. ${stat.value} - ${stat.fact} (${stat.source}${stat.year ? `, ${stat.year}` : ""})
`;
    });
    section += "\n";
  }
  if (research.authoritativeSources?.length) {
    section += `AUTHORITATIVE SOURCES TO CITE:
`;
    research.authoritativeSources.slice(0, 5).forEach((source, i) => {
      section += `  ${i + 1}. ${source.name} (${source.type}) - ${source.description}
`;
    });
    section += "\n";
  }
  if (research.experts?.length) {
    section += `EXPERTS TO REFERENCE FOR E-E-A-T:
`;
    research.experts.slice(0, 4).forEach((expert, i) => {
      section += `  ${i + 1}. ${expert.name}, ${expert.credentials}`;
      if (expert.notableQuote) section += ` - "${expert.notableQuote}"`;
      section += "\n";
    });
    section += "\n";
  }
  if (research.commonQuestions?.length) {
    section += `COMMON QUESTIONS (USE FOR FAQ SECTION):
`;
    research.commonQuestions.slice(0, 6).forEach((q, i) => {
      section += `  ${i + 1}. ${q.question} [${q.intent}]
`;
    });
    section += "\n";
  }
  if (research.competitorAngles?.length) {
    section += `COMPETITOR ANGLES (DIFFERENTIATE FROM THESE):
`;
    research.competitorAngles.slice(0, 4).forEach((angle, i) => {
      section += `  ${i + 1}. ${angle.angle}`;
      if (angle.differentiator) section += ` \u2192 Differentiate by: ${angle.differentiator}`;
      section += "\n";
    });
    section += "\n";
  }
  if (research.keyTakeaways?.length) {
    section += `KEY POINTS TO COVER:
`;
    research.keyTakeaways.forEach((takeaway, i) => {
      section += `  ${i + 1}. ${takeaway}
`;
    });
    section += "\n";
  }
  section += `RESEARCH INTEGRATION REQUIREMENTS:
1. Structure the outline to address the common questions in the FAQ section
2. Reference statistics in relevant sections (include source names)
3. Create content that differentiates from competitor angles
4. Design headings that cover the key takeaways
5. Include expert references where credibility matters
`;
  return section;
}
async function callLLM(params, projectId) {
  if (projectId) {
    const project = await getProjectById(projectId);
    if (project && project.llmProvider === "claude") {
      return invokeClaudeLLM(params, project.llmModel || void 0);
    }
  }
  return invokeLLM(params);
}
function splitSentences(text2) {
  const abbrevPattern = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Inc|Ltd|Corp|vs|etc|e\.g|i\.e|U\.S|U\.K)$/i;
  const raw = text2.match(/[^.!?]*[.!?]+[\s]*/g) || [text2];
  const sentences = [];
  let buffer = "";
  for (const frag of raw) {
    buffer += frag;
    const trimmed = buffer.trim();
    const beforePeriod = trimmed.replace(/[.!?]+$/, "");
    if (abbrevPattern.test(beforePeriod) && frag !== raw[raw.length - 1]) {
      continue;
    }
    sentences.push(buffer.trim());
    buffer = "";
  }
  if (buffer.trim()) sentences.push(buffer.trim());
  return sentences.filter((s) => s.length > 0);
}
function stripMarkdownFences2(content) {
  let stripped = content.replace(/^```(?:json|html|markdown|md)?\s*\n?/i, "");
  stripped = stripped.replace(/\n?```\s*$/i, "");
  return stripped.trim();
}
function extractJSON(raw) {
  const stripped = stripMarkdownFences2(raw);
  try {
    return JSON.parse(stripped);
  } catch {
  }
  const arrayMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
    }
  }
  const objectMatch = raw.match(/\{\s*"[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
    }
  }
  const firstBracket = raw.indexOf("[");
  const firstBrace = raw.indexOf("{");
  const start = firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace) ? firstBracket : firstBrace;
  if (start >= 0) {
    const isArray = raw[start] === "[";
    const lastClose = isArray ? raw.lastIndexOf("]") : raw.lastIndexOf("}");
    if (lastClose > start) {
      try {
        return JSON.parse(raw.slice(start, lastClose + 1));
      } catch {
      }
    }
  }
  return null;
}
function getExpectedCtr(position) {
  const pos = Math.round(position);
  const ctrMap = {
    1: 31.7,
    2: 24.7,
    3: 18.7,
    4: 13.6,
    5: 9.5,
    6: 6.2,
    7: 4.2,
    8: 3.1,
    9: 2.4,
    10: 2.1
  };
  if (pos <= 0) return 31.7;
  if (pos <= 10) return ctrMap[pos] ?? 2.1;
  if (pos <= 20) return 1;
  if (pos <= 30) return 0.5;
  return 0.2;
}
function stripEmDashes(content) {
  let result = content.replace(/\s*\u2014\s*(<\/|\n|$)/g, "$1");
  result = result.replace(/(\w)\s*\u2014\s*(\w)/g, "$1, $2");
  result = result.replace(/\u2014/g, "");
  return result;
}
function stripShortAnswerPrefix(content) {
  let result = content.replace(/<p>\s*(?:<strong>)?Short Answer:?(?:<\/strong>)?\s*/gi, "<p>");
  result = result.replace(/<strong>Short Answer:?<\/strong>\s*/gi, "");
  result = result.replace(/^Short Answer:?\s*/gim, "");
  return result;
}
function stripWrappingStrongTags(content) {
  let result = content;
  result = result.replace(
    /(<(?:p|h[1-6]|li|td|th|div|blockquote)(?:\s[^>]*)?>)\s*<(?:strong|b)>((?:(?!<\/(?:strong|b)>).)*)<\/(?:strong|b)>\s*(<\/(?:p|h[1-6]|li|td|th|div|blockquote)>)/gi,
    "$1$2$3"
  );
  result = result.replace(
    /^<(?:strong|b)>((?:(?!<(?:strong|b)[\s>]).)*)<\/(?:strong|b)>$/gm,
    "$1"
  );
  return result;
}
function stripTargetBlank(content) {
  let result = content.replace(/\s*target="_blank"/gi, "");
  result = result.replace(/\s*target='_blank'/gi, "");
  result = result.replace(/\s*rel="noopener noreferrer"/gi, "");
  result = result.replace(/\s*rel='noopener noreferrer'/gi, "");
  return result;
}
function fixBrokenAnchors(content) {
  let fixed = content.replace(/href="([^"]*)"/gi, (_match, url) => {
    return `href="${url.replace(/\s+/g, "")}"`;
  });
  fixed = fixed.replace(/href="([^"]*)<\/p>\s*<p>([^"]*)"/gi, (_match, before, after) => {
    return `href="${before}${after}"`;
  });
  fixed = fixed.replace(/href="([^"]*)\n([^"]*)"/gi, (_match, before, after) => {
    return `href="${before}${after}"`;
  });
  fixed = fixed.replace(/\n<p>([a-z][^<>\s]*\/">)([\s\S]*?)<\/p>/g, (_match, _fragment, rest) => {
    return `
<p>${rest}</p>`;
  });
  return fixed;
}
function sanitizeInsertedLinks(content, allowedDomains) {
  const normalizedAllowed = allowedDomains.map(
    (d) => d.toLowerCase().replace(/^www\./, "")
  );
  return content.replace(
    /<a\s+([^>]*href="([^"]*)"[^>]*)>((?:(?!<\/a>)[\s\S])*)<\/a>/gi,
    (fullMatch, attrs, href, anchorText) => {
      if (normalizedAllowed.length > 0) {
        try {
          const url = new URL(href);
          const linkDomain = url.hostname.toLowerCase().replace(/^www\./, "");
          const isAllowed = normalizedAllowed.some(
            (allowed) => linkDomain === allowed || linkDomain.endsWith("." + allowed)
          );
          if (!isAllowed) {
            return anchorText;
          }
        } catch {
          return anchorText;
        }
      }
      const plainAnchor = anchorText.replace(/<[^>]+>/g, "").trim();
      const words = plainAnchor.split(/\s+/);
      if (words.length > 10) {
        let trimmedWordCount = 7;
        for (let i = 5; i <= Math.min(8, words.length); i++) {
          const word = words[i];
          if (/^(and|or|but|which|that|including|with|for|from|to|in|at|by|as|is|are|was|were|the|a|an)$/i.test(word)) {
            trimmedWordCount = i;
            break;
          }
        }
        const trimmedText = words.slice(0, trimmedWordCount).join(" ");
        const remainingText = words.slice(trimmedWordCount).join(" ");
        return `<a ${attrs}>${trimmedText}</a> ${remainingText}`;
      }
      return fullMatch;
    }
  );
}
function wrapBareTextInPTags(content) {
  const lines = content.split(/\n/);
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^<(h[1-6]|p|ul|ol|li|table|thead|tbody|tr|td|th|div|blockquote|hr|br|figure|figcaption|section|article|nav|header|footer|pre|code|img|a\s)/i.test(trimmed)) {
      result.push(trimmed);
    } else if (/^<\/(h[1-6]|p|ul|ol|li|table|thead|tbody|tr|td|th|div|blockquote|pre|code|section|article|nav|header|footer|figure|figcaption)>/i.test(trimmed)) {
      result.push(trimmed);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }
  return result.join("\n");
}
function splitLongParagraphs(content, maxSentences, format) {
  if (format === "plaintext") {
    const blocks = content.split(/\n\n+/);
    const result = [];
    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-") || trimmed.startsWith("*") || /^\d+\./.test(trimmed)) {
        result.push(block);
        continue;
      }
      const sentences = splitSentences(trimmed);
      if (sentences.length <= maxSentences) {
        result.push(block);
        continue;
      }
      for (let i = 0; i < sentences.length; i += maxSentences) {
        result.push(sentences.slice(i, i + maxSentences).join(" "));
      }
    }
    return result.join("\n\n");
  }
  return content.replace(/<p>([\s\S]*?)<\/p>/gi, (match, inner) => {
    const text2 = inner.trim();
    if (!text2 || text2.includes("<ul") || text2.includes("<ol") || text2.includes("<table") || text2.includes("<h")) {
      return match;
    }
    const sentences = splitSentences(text2);
    if (sentences.length <= maxSentences) {
      return match;
    }
    const chunks = [];
    for (let i = 0; i < sentences.length; i += maxSentences) {
      chunks.push(`<p>${sentences.slice(i, i + maxSentences).join(" ")}</p>`);
    }
    return chunks.join("\n");
  });
}
var appRouter = router({
  system: systemRouter,
  auth: router({
    /** Return the currently logged-in app user (from JWT cookie), or null */
    me: publicProcedure.query(async ({ ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) return null;
      const db = await getDb();
      if (!db) return null;
      const [user] = await db.select({ id: appUsers.id, name: appUsers.name, email: appUsers.email, role: appUsers.role, mustChangePassword: appUsers.mustChangePassword, theme: appUsers.theme }).from(appUsers).where(eq2(appUsers.id, session.userId));
      return user ?? null;
    }),
    /** Login with email + password */
    login: publicProcedure.input(z2.object({
      email: z2.string().email(),
      password: z2.string().min(1)
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [user] = await db.select().from(appUsers).where(eq2(appUsers.email, input.email.toLowerCase().trim()));
      if (!user) {
        throw new Error("Invalid email or password");
      }
      if (!user.isActive) {
        throw new Error("Account is disabled. Please contact an administrator.");
      }
      const valid = await verifyPassword(input.password, user.passwordHash);
      if (!valid) {
        throw new Error("Invalid email or password");
      }
      await db.update(appUsers).set({ lastLoginAt: /* @__PURE__ */ new Date() }).where(eq2(appUsers.id, user.id));
      const token = await signAppSession({ userId: user.id, email: user.email, role: user.role });
      setSessionCookie(ctx.res, ctx.req, token);
      return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword
      };
    }),
    /** Logout — clear the session cookie */
    logout: publicProcedure.mutation(async ({ ctx }) => {
      clearSessionCookie(ctx.res, ctx.req);
      return { success: true };
    }),
    /** Get the current user's theme preference */
    getTheme: publicProcedure.query(async ({ ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) return { theme: "light" };
      const db = await getDb();
      if (!db) return { theme: "light" };
      const [user] = await db.select({ theme: appUsers.theme }).from(appUsers).where(eq2(appUsers.id, session.userId));
      return { theme: user?.theme ?? "light" };
    }),
    /** Set the current user's theme preference */
    setTheme: publicProcedure.input(z2.object({ theme: z2.enum(["light", "dark", "system"]) })).mutation(async ({ ctx, input }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new Error("Not authenticated");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.update(appUsers).set({ theme: input.theme }).where(eq2(appUsers.id, session.userId));
      return { success: true, theme: input.theme };
    }),
    /** Change password for the currently logged-in user */
    changePassword: publicProcedure.input(z2.object({
      currentPassword: z2.string().min(1),
      newPassword: z2.string().min(8, "Password must be at least 8 characters")
    })).mutation(async ({ ctx, input }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new Error("Not authenticated");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [user] = await db.select().from(appUsers).where(eq2(appUsers.id, session.userId));
      if (!user) throw new Error("User not found");
      const valid = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!valid) throw new Error("Current password is incorrect");
      const newHash = await hashPassword(input.newPassword);
      await db.update(appUsers).set({ passwordHash: newHash, mustChangePassword: 0 }).where(eq2(appUsers.id, user.id));
      return { success: true };
    })
  }),
  /** Admin-only user management */
  adminUsers: router({
    /** List all app users (admin only) */
    list: publicProcedure.query(async ({ ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session || session.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      return db.select({ id: appUsers.id, name: appUsers.name, email: appUsers.email, role: appUsers.role, isActive: appUsers.isActive, mustChangePassword: appUsers.mustChangePassword, createdAt: appUsers.createdAt, lastLoginAt: appUsers.lastLoginAt }).from(appUsers).orderBy(desc2(appUsers.createdAt));
    }),
    /** Create a new user (admin only) */
    create: publicProcedure.input(z2.object({
      name: z2.string().min(1).max(255),
      email: z2.string().email(),
      password: z2.string().min(8, "Password must be at least 8 characters"),
      role: z2.enum(["user", "admin"]).default("user"),
      mustChangePassword: z2.boolean().default(true)
    })).mutation(async ({ ctx, input }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session || session.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const [existing] = await db.select({ id: appUsers.id }).from(appUsers).where(eq2(appUsers.email, input.email.toLowerCase().trim()));
      if (existing) throw new Error("An account with this email already exists");
      const passwordHash = await hashPassword(input.password);
      const [result] = await db.insert(appUsers).values({
        name: input.name,
        email: input.email.toLowerCase().trim(),
        passwordHash,
        role: input.role,
        mustChangePassword: input.mustChangePassword ? 1 : 0
      });
      return { id: result.insertId, success: true };
    }),
    /** Update a user's name, role, or active status (admin only) */
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(1).max(255).optional(),
      role: z2.enum(["user", "admin"]).optional(),
      isActive: z2.boolean().optional(),
      resetPassword: z2.string().min(8).optional()
    })).mutation(async ({ ctx, input }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session || session.role !== "admin") throw new Error("Admin access required");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const updates = {};
      if (input.name !== void 0) updates.name = input.name;
      if (input.role !== void 0) updates.role = input.role;
      if (input.isActive !== void 0) updates.isActive = input.isActive ? 1 : 0;
      if (input.resetPassword !== void 0) {
        updates.passwordHash = await hashPassword(input.resetPassword);
        updates.mustChangePassword = 1;
      }
      if (Object.keys(updates).length === 0) return { success: true };
      await db.update(appUsers).set(updates).where(eq2(appUsers.id, input.id));
      return { success: true };
    }),
    /** Delete a user (admin only) — cannot delete yourself */
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ ctx, input }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session || session.role !== "admin") throw new Error("Admin access required");
      if (session.userId === input.id) throw new Error("You cannot delete your own account");
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      await db.delete(appUsers).where(eq2(appUsers.id, input.id));
      return { success: true };
    })
  }),
  projects: router({
    list: publicProcedure.query(async ({ ctx }) => {
      return getProjectsByUserId(1);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getProjectById(input.id);
    }),
    create: publicProcedure.input(z2.object({
      name: z2.string().min(1).max(255),
      color: z2.string().optional(),
      domain: z2.string().optional(),
      description: z2.string().optional()
    })).mutation(async ({ ctx, input }) => {
      return createProject({
        name: input.name,
        color: input.color ?? "#6366f1",
        domain: input.domain ?? null,
        description: input.description ?? null,
        userId: 1
      });
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(1).max(255).optional(),
      color: z2.string().optional(),
      domain: z2.string().optional(),
      description: z2.string().optional(),
      icpPrimaryName: z2.string().max(512).optional(),
      icpWhoTheyAre: z2.string().optional(),
      icpPains: z2.array(z2.string()).max(5).optional(),
      icpGoals: z2.array(z2.string()).max(5).optional(),
      icpObjections: z2.array(z2.string()).max(5).optional(),
      icpDecisionTriggers: z2.array(z2.string()).max(5).optional(),
      icpTrustSignals: z2.array(z2.string()).max(5).optional(),
      llmProvider: z2.enum(["builtin", "claude"]).optional(),
      llmModel: z2.string().max(128).optional(),
      bannedPhrases: z2.array(z2.string()).optional(),
      minInternalLinks: z2.number().int().min(0).max(20).optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateProject(id, data);
    }),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return deleteProject(input.id);
    })
  }),
  outlines: router({
    list: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      return getOutlinesByProject(input.projectId);
    }),
    listAll: publicProcedure.query(async ({ ctx }) => {
      return getOutlinesByUser(1);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getOutlineById(input.id);
    }),
    create: publicProcedure.input(z2.object({
      title: z2.string().min(1),
      keyword: z2.string().optional(),
      sections: z2.array(z2.any()),
      settings: z2.any().optional(),
      projectId: z2.number()
    })).mutation(async ({ ctx, input }) => {
      return createOutline({
        title: input.title,
        keyword: input.keyword ?? null,
        sections: input.sections,
        settings: input.settings ?? null,
        projectId: input.projectId,
        userId: 1
      });
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      title: z2.string().optional(),
      keyword: z2.string().optional(),
      sections: z2.array(z2.any()).optional(),
      settings: z2.any().optional(),
      status: z2.enum(["draft", "approved", "generating", "complete"]).optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateOutline(id, data);
    }),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return deleteOutline(input.id);
    }),
    /** LLM-powered topic research before outline generation */
    researchTopic: publicProcedure.input(z2.object({
      topic: z2.string().min(1),
      keyword: z2.string().optional(),
      niche: z2.string().optional(),
      projectId: z2.number()
    })).mutation(async ({ input }) => {
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      let referenceDocSection = "";
      try {
        const project = await getProjectById(input.projectId);
        if (project) {
          let refDocContent = project.referenceDocContent || null;
          if (!refDocContent && project.referenceDocS3Key) {
            refDocContent = await fetchReferenceDocFromS3(project.referenceDocS3Key);
          }
          if (refDocContent && project.referenceDocName) {
            const maxChars = 4e4;
            const truncated = refDocContent.length > maxChars ? refDocContent.substring(0, maxChars) + "\n[... document truncated for length ...]" : refDocContent;
            referenceDocSection = `
REFERENCE DOCUMENT \u2014 USE AS SUPPLEMENTARY FACTUAL SOURCE ("${project.referenceDocName}")
================================================================
The following reference document contains verified facts, figures, rules, and details about the topic.
Use this document to SUPPLEMENT and GROUND your research findings.

RULES FOR USING THE REFERENCE DOCUMENT IN RESEARCH:
1. Extract specific statistics, data points, and figures from this document and include them in your statistics section \u2014 these are VERIFIED facts.
2. If the document cites specific sources or URLs, include those in your authoritative sources section.
3. Use the document's content to inform your key takeaways \u2014 ground them in real facts rather than generic observations.
4. If the document mentions specific experts, organizations, or programs, reference them in your findings.
5. The document should SUPPLEMENT your research, not replace it \u2014 still find additional external sources and data points beyond what the document covers.
6. When a statistic from the document conflicts with your training data, PREFER the document's version.

=== REFERENCE DOCUMENT CONTENT ===
${truncated}
=== END REFERENCE DOCUMENT ===
`;
            console.log(`[Research] Reference doc injected: "${project.referenceDocName}" (${refDocContent.length} chars)`);
          }
        }
      } catch (e) {
        console.warn("[Research] Failed to fetch reference doc:", e);
      }
      const researchPrompt = `You are an expert research assistant conducting comprehensive topic research for content creation.

CURRENT DATE: ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
CURRENT YEAR: ${currentYear}

RESEARCH TOPIC: "${input.topic}"
${input.keyword ? `PRIMARY KEYWORD: "${input.keyword}"` : ""}
${input.niche ? `INDUSTRY/NICHE: "${input.niche}"` : ""}
${referenceDocSection}
Conduct thorough research and provide findings in these categories:

1. STATISTICS & DATA POINTS
- Find 5-8 relevant statistics, facts, or data points
- Include specific numbers, percentages, or metrics
- MANDATORY: Prioritize ${currentYear} data first. Only use ${currentYear - 1} data if no ${currentYear} data exists for that specific statistic.
- NEVER use data from ${currentYear - 2} or earlier when more recent data is available.
- All statistics must reflect the most current figures available as of ${currentYear}.
- Cite specific, real sources (government agencies, research organizations, industry reports)

2. AUTHORITATIVE SOURCES
- List 5-7 authoritative sources on this topic
- Include .gov, .edu, major industry publications, and research organizations
- Provide specific URLs where possible
- Categorize by type (government, academic, industry, research, news)

3. EXPERTS & THOUGHT LEADERS
- Identify 3-5 recognized experts in this field
- Include their credentials, organization, and any notable quotes
- Focus on people frequently cited in authoritative content

4. COMMON QUESTIONS (People Also Ask)
- List 6-8 questions people commonly search for on this topic
- Indicate search intent (informational, transactional, navigational)
- These should inform FAQ sections

5. COMPETITOR CONTENT ANGLES
- Identify 4-6 common angles or approaches used in top-ranking content
- Note potential differentiators or underserved angles

6. KEY TAKEAWAYS
- Summarize 3-5 essential points a writer should know before creating content

RESPOND WITH VALID JSON ONLY in this exact format:
{
  "statistics": [
    {
      "fact": "Brief description of the statistic",
      "value": "The specific number or percentage",
      "source": "Source name",
      "sourceUrl": "https://specific-url.com",
      "year": "2026"
    }
  ],
  "authoritativeSources": [
    {
      "name": "Source Name",
      "url": "https://example.gov/specific-page",
      "type": "government",
      "description": "Why this source is authoritative for this topic"
    }
  ],
  "experts": [
    {
      "name": "Dr. Jane Smith",
      "credentials": "PhD, Director of X Institute",
      "organization": "Organization Name",
      "notableQuote": "A relevant quote if available"
    }
  ],
  "commonQuestions": [
    {
      "question": "How does X work?",
      "searchVolume": "high",
      "intent": "informational"
    }
  ],
  "competitorAngles": [
    {
      "angle": "Cost comparison approach",
      "description": "Many articles focus on comparing costs between options",
      "differentiator": "Could differentiate by focusing on hidden costs"
    }
  ],
  "keyTakeaways": [
    "Key point 1 the writer should know",
    "Key point 2 the writer should know"
  ]
}

IMPORTANT RULES:
- The current year is ${currentYear}. ALL data, statistics, and sources MUST be from ${currentYear} whenever available.
- If ${currentYear} data is not yet published for a specific metric, use ${currentYear - 1} data and explicitly note it as "(${currentYear - 1}, latest available)".
- NEVER present ${currentYear - 2} or older data without flagging it as potentially outdated.
- The "year" field in statistics MUST accurately reflect the data year \u2014 do NOT fabricate ${currentYear} dates for older data.
- Only cite real, verifiable sources that actually exist
- Be specific with URLs - use actual page paths, not just homepages
- If you're uncertain about exact URLs, use the base domain
- Make statistics specific and actionable for content creation
- Questions should reflect real user search intent`;
      const response = await callLLM({
        messages: [
          { role: "system", content: `You are an expert research assistant. The current year is ${currentYear}. Always prioritize ${currentYear} data and sources. Return ONLY valid JSON, no markdown fences or explanation.` },
          { role: "user", content: researchPrompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "research_findings",
            strict: true,
            schema: {
              type: "object",
              properties: {
                statistics: { type: "array", items: { type: "object", properties: { fact: { type: "string" }, value: { type: "string" }, source: { type: "string" }, sourceUrl: { type: "string" }, year: { type: "string" } }, required: ["fact", "value", "source", "sourceUrl", "year"], additionalProperties: false } },
                authoritativeSources: { type: "array", items: { type: "object", properties: { name: { type: "string" }, url: { type: "string" }, type: { type: "string" }, description: { type: "string" } }, required: ["name", "url", "type", "description"], additionalProperties: false } },
                experts: { type: "array", items: { type: "object", properties: { name: { type: "string" }, credentials: { type: "string" }, organization: { type: "string" }, notableQuote: { type: "string" } }, required: ["name", "credentials", "organization", "notableQuote"], additionalProperties: false } },
                commonQuestions: { type: "array", items: { type: "object", properties: { question: { type: "string" }, searchVolume: { type: "string" }, intent: { type: "string" } }, required: ["question", "searchVolume", "intent"], additionalProperties: false } },
                competitorAngles: { type: "array", items: { type: "object", properties: { angle: { type: "string" }, description: { type: "string" }, differentiator: { type: "string" } }, required: ["angle", "description", "differentiator"], additionalProperties: false } },
                keyTakeaways: { type: "array", items: { type: "string" } }
              },
              required: ["statistics", "authoritativeSources", "experts", "commonQuestions", "competitorAngles", "keyTakeaways"],
              additionalProperties: false
            }
          }
        }
      }, input.projectId);
      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent.trim() : "";
      if (!content) throw new Error("No research results generated");
      const findings = extractJSON(content);
      if (!findings) throw new Error("Failed to parse research findings");
      const result = {
        topic: input.topic,
        researchedAt: (/* @__PURE__ */ new Date()).toISOString(),
        statistics: findings.statistics || [],
        authoritativeSources: findings.authoritativeSources || [],
        experts: findings.experts || [],
        commonQuestions: findings.commonQuestions || [],
        competitorAngles: findings.competitorAngles || [],
        keyTakeaways: findings.keyTakeaways || []
      };
      return result;
    }),
    /** LLM-powered keyword suggestions for article generation */
    suggestKeywords: publicProcedure.input(z2.object({
      keyword: z2.string().min(1),
      contentType: z2.string().optional(),
      targetAudience: z2.string().optional(),
      targetLocation: z2.string().optional(),
      projectId: z2.number().optional()
    })).mutation(async ({ input }) => {
      const prompt = `You are an expert SEO keyword researcher. Given a primary keyword, suggest related keywords that should be naturally woven into an article to improve topical coverage and semantic relevance.

Primary keyword: "${input.keyword}"
${input.contentType ? `Content type: ${input.contentType}` : ""}
${input.targetAudience ? `Target audience: ${input.targetAudience}` : ""}
${input.targetLocation ? `Target location: ${input.targetLocation}` : ""}

Return a JSON object with exactly these three arrays:
1. "secondary" \u2014 5-8 closely related search terms (synonyms, variations, related queries people also search for)
2. "lsi" \u2014 5-8 LSI/semantic terms (contextually related entities, concepts, and terminology that Google expects to see in comprehensive content on this topic)
3. "longTail" \u2014 3-5 long-tail keyword variations (lower-competition, more specific phrases)

Rules:
- Each keyword should be lowercase
- No duplicates across the three arrays
- Do NOT include the primary keyword itself
- Focus on terms that would genuinely improve the article's topical depth and search relevance
- For LSI terms, think about what entities and concepts Google's NLP would expect in authoritative content on this topic`;
      const response = await callLLM({
        messages: [
          { role: "system", content: "You are an SEO keyword research expert. Return ONLY valid JSON, no markdown fences or explanation." },
          { role: "user", content: prompt }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "keyword_suggestions",
            strict: true,
            schema: {
              type: "object",
              properties: {
                secondary: { type: "array", items: { type: "string" }, description: "Closely related search terms" },
                lsi: { type: "array", items: { type: "string" }, description: "LSI/semantic terms" },
                longTail: { type: "array", items: { type: "string" }, description: "Long-tail keyword variations" }
              },
              required: ["secondary", "lsi", "longTail"],
              additionalProperties: false
            }
          }
        }
      }, input.projectId ?? null);
      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) throw new Error("No response from AI");
      const text2 = typeof rawContent === "string" ? rawContent : rawContent[0]?.text ?? "";
      const parsed = extractJSON(text2);
      if (!parsed) throw new Error("Failed to parse keyword suggestions");
      return {
        secondary: (parsed.secondary || []).slice(0, 8),
        lsi: (parsed.lsi || []).slice(0, 8),
        longTail: (parsed.longTail || []).slice(0, 5)
      };
    }),
    /** AI-powered outline generation */
    generate: publicProcedure.input(z2.object({
      keyword: z2.string().min(1),
      contentType: z2.string().optional(),
      tone: z2.string().optional(),
      targetWordCount: z2.number().optional(),
      numSections: z2.number().optional(),
      numFaqs: z2.number().optional(),
      additionalInstructions: z2.string().optional(),
      projectId: z2.number(),
      targetLocation: z2.string().optional(),
      targetAudience: z2.string().optional(),
      outputFormat: z2.enum(["html", "plaintext"]).optional(),
      manualLinks: z2.array(z2.object({ url: z2.string(), anchorText: z2.string() })).optional(),
      sitemapUrls: z2.array(z2.string()).optional(),
      autoLinkCount: z2.number().optional(),
      brandVoiceId: z2.number().optional(),
      icpProfileId: z2.number().optional(),
      secondaryKeywords: z2.array(z2.string()).optional(),
      research: z2.any().optional(),
      useReferenceDoc: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      const project = await getProjectById(input.projectId);
      const allVoices = await getBrandVoicesByProject(input.projectId);
      const brandVoice = input.brandVoiceId ? allVoices.find((v) => v.id === input.brandVoiceId) ?? allVoices[0] ?? null : allVoices.find((v) => v.isDefault === 1) ?? allVoices[0] ?? null;
      let icpSection = "";
      const formatList = (items, label) => {
        if (!items?.length) return "";
        return `${label}:
${items.map((item, i) => `  ${i + 1}. ${item}`).join("\n")}
`;
      };
      if (input.icpProfileId) {
        const icpProfile = await getICPById(input.icpProfileId);
        if (icpProfile) {
          const demographics = icpProfile.demographics;
          const demoLines = demographics ? [
            demographics.ageRange ? `Age Range: ${demographics.ageRange}` : "",
            demographics.location ? `Location: ${demographics.location}` : "",
            demographics.income ? `Income: ${demographics.income}` : "",
            demographics.education ? `Education: ${demographics.education}` : "",
            demographics.occupation ? `Occupation: ${demographics.occupation}` : "",
            demographics.other ? `Other: ${demographics.other}` : ""
          ].filter(Boolean).join("\n") : "";
          icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) - CRITICAL ===
The outline MUST be structured to serve this specific audience:

TARGET AUDIENCE: ${icpProfile.name}
${icpProfile.description ? `Who They Are: ${icpProfile.description}` : ""}
${demoLines ? `
DEMOGRAPHICS:
${demoLines}` : ""}

${formatList(icpProfile.painPoints, "PAIN POINTS (structure H2 headings around these)")}
${formatList(icpProfile.goals, "GOALS (address these in content sections)")}
${formatList(icpProfile.objections, "OBJECTIONS (create FAQ questions from these)")}
${icpProfile.searchBehavior ? `SEARCH BEHAVIOR: ${icpProfile.searchBehavior}
` : ""}
${formatList(icpProfile.contentPreferences, "CONTENT PREFERENCES")}

ICP OUTLINE REQUIREMENTS:
1. At least 30% of H2 headings MUST directly reflect the pain points listed above
2. FAQ section MUST include questions that address the objections listed above
3. Structure content to move the reader toward their goals
4. Use language and examples that resonate with "${icpProfile.name}"
`;
        }
      } else if (project?.icpPrimaryName) {
        icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) - CRITICAL ===
The outline MUST be structured to serve this specific audience:

TARGET AUDIENCE: ${project.icpPrimaryName}
${project.icpWhoTheyAre ? `Who They Are: ${project.icpWhoTheyAre}` : ""}

${formatList(project.icpPains, "PAIN POINTS (structure H2 headings around these)")}
${formatList(project.icpGoals, "GOALS (address these in content sections)")}
${formatList(project.icpObjections, "OBJECTIONS (create FAQ questions from these)")}
${formatList(project.icpDecisionTriggers, "DECISION TRIGGERS (weave into content flow)")}
${formatList(project.icpTrustSignals, "TRUST SIGNALS (incorporate in relevant sections)")}

ICP OUTLINE REQUIREMENTS:
1. At least 30% of H2 headings MUST directly reflect the pain points listed above
2. FAQ section MUST include questions that address the objections listed above
3. Include sections that speak to the decision triggers
4. Structure content to move the reader toward their goals
5. Use language and examples that resonate with "${project.icpPrimaryName}"
`;
      }
      let brandVoiceSection = "";
      if (brandVoice) {
        const perspectiveMap = {
          first: "First person (we/our/us)",
          second: "Second person (you/your)",
          third: "Third person (they/their)"
        };
        const styleMap = {
          short: "Concise, punchy sentences. Paragraphs of 1-3 sentences only.",
          mixed: "Varied sentence lengths with natural rhythm. Paragraphs of 2-5 sentences only.",
          detailed: "Detailed, explanatory sentences. Paragraphs of 3-6 sentences maximum."
        };
        const AVOID_LABELS = {
          jargon: "Overly technical jargon",
          salesy: "Sales-heavy language",
          fear: "Fear-based messaging",
          exaggerated: "Exaggerated claims",
          cliches: "Industry clich\xE9s",
          passive: "Passive voice",
          buzzwords: "Buzzwords",
          rhetorical: "Rhetorical questions",
          unverified: "Unverified statistics",
          competitor: "Competitor comparisons"
        };
        let avoidItems = [];
        const avoidList = brandVoice.avoidList || "";
        if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
          const parts = avoidList.split("|");
          for (const part of parts) {
            if (part.startsWith("PRESETS:")) {
              const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
              avoidItems.push(...presetIds.map((id) => AVOID_LABELS[id] || id));
            } else if (part.startsWith("CUSTOM:")) {
              const custom = part.replace("CUSTOM:", "").trim();
              if (custom) avoidItems.push(...custom.split(",").map((s) => s.trim()).filter(Boolean));
            }
          }
        } else if (avoidList) {
          avoidItems = avoidList.split(",").map((s) => s.trim()).filter(Boolean);
        }
        brandVoiceSection = `
=== BRAND VOICE GUIDELINES - APPLY TO ALL CONTENT ===
Voice Name: ${brandVoice.name}

TONE TRAITS: ${brandVoice.toneTraits || "Professional"}

WRITING PERSPECTIVE: ${perspectiveMap[brandVoice.perspective] || brandVoice.perspective}

SENTENCE STYLE: ${styleMap[brandVoice.sentenceStyle] || brandVoice.sentenceStyle}

${avoidItems.length > 0 ? `AVOID:
${avoidItems.map((item) => `- ${item}`).join("\n")}` : ""}

${brandVoice.writingStyleSample ? `STYLE EXAMPLE (for tone reference only \u2014 do NOT copy phrases):
"${brandVoice.writingStyleSample.slice(0, 500)}${brandVoice.writingStyleSample.length > 500 ? "..." : ""}"` : ""}

BRAND VOICE REQUIREMENTS FOR OUTLINE:
1. Craft all section headings using the specified tone traits
2. Key points should reflect the writing perspective (${perspectiveMap[brandVoice.perspective] || brandVoice.perspective})
3. Hook and quick answer sections must match the brand tone
4. FAQ questions should be phrased in a way that matches the voice
5. Avoid anything listed in the "AVOID" section above
6. Plan section key points to be granular enough that each paragraph in the final article stays within the sentence style limits (${styleMap[brandVoice.sentenceStyle] || "Varied sentence lengths"})
`;
      }
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      let outlineReferenceDocSection = "";
      if (input.useReferenceDoc && project) {
        let refDocContent = project.referenceDocContent || null;
        if (!refDocContent && project.referenceDocS3Key) {
          refDocContent = await fetchReferenceDocFromS3(project.referenceDocS3Key);
        }
        if (refDocContent && project.referenceDocName) {
          const maxChars = 4e4;
          const truncated = refDocContent.length > maxChars ? refDocContent.substring(0, maxChars) + "\n[... document truncated for length ...]" : refDocContent;
          outlineReferenceDocSection = `
REFERENCE DOCUMENT \u2014 USE TO GROUND THE OUTLINE ("${project.referenceDocName}")
================================================================
The following reference document contains verified facts, figures, rules, and details about the topic.
Use this document to inform the outline structure and key points.

RULES FOR USING THE REFERENCE DOCUMENT IN THE OUTLINE:
1. When the reference document covers specific subtopics, eligibility rules, costs, procedures, or categories \u2014 create dedicated sections or key points for them.
2. Key points in each section should reference specific facts from the document rather than generic talking points.
3. If the reference document has a natural structure (e.g., categories, steps, eligibility tiers), mirror that structure in the outline where appropriate.
4. FAQ questions should address real questions that the reference document answers.
5. Do NOT just summarize the reference document \u2014 create an SEO-optimized outline that USES the document as a factual foundation.

=== REFERENCE DOCUMENT CONTENT ===
${truncated}
=== END REFERENCE DOCUMENT ===
`;
          console.log(`[OutlineGen] Reference doc injected: "${project.referenceDocName}" (${refDocContent.length} chars${refDocContent.length > maxChars ? ", truncated to " + maxChars : ""})`);
        }
      }
      let resolvedSitemapSection = "";
      if (input.sitemapUrls?.length) {
        const projectSitemaps = await getSitemapsByProject(input.projectId);
        const pageUrls = [];
        for (const sitemapXmlUrl of input.sitemapUrls) {
          const match = projectSitemaps.find((s) => s.url === sitemapXmlUrl);
          if (match?.parsedUrls && Array.isArray(match.parsedUrls)) {
            for (const entry of match.parsedUrls) {
              if (typeof entry === "string") pageUrls.push(entry);
              else if (entry && typeof entry === "object" && "url" in entry) pageUrls.push(entry.url);
            }
          }
        }
        if (pageUrls.length > 0) {
          resolvedSitemapSection = `- The article will include ${input.autoLinkCount ?? 5} internal links. Plan sections where these REAL page URLs fit naturally:
${pageUrls.slice(0, 50).map((u) => `  \u2022 ${u}`).join("\n")}`;
        }
      }
      const systemPrompt = `You are an expert SEO content strategist. Generate a detailed article outline for the given keyword.

IMPORTANT \u2014 CURRENT DATE CONTEXT: The current year is ${currentYear}. All references to dates, years, regulations, trends, and time-sensitive topics MUST treat ${currentYear} as the present year. Do NOT reference 2024 or any prior year as "current."

Return a JSON object with:
- "title": A compelling, SEO-optimized article title
- "sections": An array of sections, each with:
  - "id": A unique string ID (use format "s1", "s2", etc.)
  - "heading": The section heading text
  - "type": "h2" for main sections
  - "points": Array of 2-4 key points to cover in this section
  - "targetWordCount": Estimated word count for this section (integer). Distribute the total target word count across sections proportionally. Introduction ~100-150 words, conclusion ~100-150 words, FAQ ~50-80 per question, main body sections split the remainder. The sum of all section targetWordCounts should approximately equal the total target.
  - "subSections": Optional array of sub-sections with same structure but type "h3" (sub-sections do NOT need targetWordCount)

Guidelines:
- Create ${input.numSections ?? 7} main sections
- Include an introduction section first
- Include a FAQ section with ${input.numFaqs ?? 4} questions as sub-sections
- Include a conclusion section last
- Content type: ${input.contentType ?? "blog post"}
- Tone: ${input.tone ?? "professional and informative"}
- Target word count: ${input.targetWordCount ?? 2e3} words
- UNIQUENESS: Plan section points that are specific and fresh \u2014 avoid generic talking points that appear in every article on this topic. Each outline should feel like a unique angle, not a template.
${input.additionalInstructions ? `- Additional instructions: ${input.additionalInstructions}` : ""}
${input.targetLocation ? `- Target location: ${input.targetLocation} \u2014 tailor the outline to be relevant for this geographic area` : ""}
${input.targetAudience ? `- Target audience: ${input.targetAudience} \u2014 structure the outline to address this audience's needs` : ""}
${input.manualLinks?.length ? `- The final article will include these internal links \u2014 plan sections where they fit naturally:
${input.manualLinks.map((l) => `  \u2022 ${l.url}${l.anchorText ? ` (anchor: "${l.anchorText}")` : ""}`).join("\n")}` : ""}
${resolvedSitemapSection}
${icpSection}
${brandVoiceSection}
${input.research ? buildResearchSection(input.research) : ""}
${outlineReferenceDocSection}

Return ONLY valid JSON, no markdown code blocks.`;
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a detailed article outline for the keyword: "${input.keyword}"` }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "article_outline",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string", description: "SEO-optimized article title" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      heading: { type: "string" },
                      type: { type: "string", enum: ["h2", "h3"] },
                      points: { type: "array", items: { type: "string" } },
                      subSections: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            heading: { type: "string" },
                            type: { type: "string", enum: ["h2", "h3"] },
                            points: { type: "array", items: { type: "string" } }
                          },
                          required: ["id", "heading", "type", "points"],
                          additionalProperties: false
                        }
                      },
                      targetWordCount: { type: "integer", description: "Target word count for this section" }
                    },
                    required: ["id", "heading", "type", "points", "subSections", "targetWordCount"],
                    additionalProperties: false
                  }
                }
              },
              required: ["title", "sections"],
              additionalProperties: false
            }
          }
        }
      });
      const rawOutlineContent = response.choices[0]?.message?.content;
      if (!rawOutlineContent) throw new Error("No response from AI");
      const content = typeof rawOutlineContent === "string" ? rawOutlineContent : rawOutlineContent[0]?.text ?? "";
      const parsed = extractJSON(content);
      if (!parsed) throw new Error("Failed to parse outline from AI response");
      const outline = await createOutline({
        title: parsed.title,
        keyword: input.keyword,
        sections: parsed.sections,
        settings: {
          contentType: input.contentType,
          tone: input.tone,
          targetWordCount: input.targetWordCount,
          numSections: input.numSections,
          numFaqs: input.numFaqs,
          additionalInstructions: input.additionalInstructions,
          targetLocation: input.targetLocation,
          targetAudience: input.targetAudience,
          outputFormat: input.outputFormat,
          manualLinks: input.manualLinks,
          sitemapUrls: input.sitemapUrls,
          autoLinkCount: input.autoLinkCount,
          secondaryKeywords: input.secondaryKeywords
        },
        projectId: input.projectId,
        userId: 1
      });
      return outline;
    }),
    /** Duplicate an existing outline */
    duplicate: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const original = await getOutlineById(input.id);
      if (!original) throw new TRPCError3({ code: "NOT_FOUND", message: "Outline not found" });
      return createOutline({
        title: `${original.title} (Copy)`,
        keyword: original.keyword,
        sections: original.sections,
        settings: original.settings,
        projectId: original.projectId,
        userId: original.userId
      });
    }),
    /** AI-powered outline improvement: parse pasted outline, analyze, suggest improvements */
    improveOutline: publicProcedure.input(z2.object({
      rawOutline: z2.string().min(10, "Outline must be at least 10 characters"),
      keyword: z2.string().optional(),
      projectId: z2.number(),
      focusAreas: z2.array(z2.string()).optional()
    })).mutation(async ({ input }) => {
      const project = await getProjectById(input.projectId);
      let contextSection = "";
      if (project) {
        const icps = await getICPsByProject(input.projectId);
        const brandVoices2 = await getBrandVoicesByProject(input.projectId);
        if (icps.length > 0) {
          contextSection += `
TARGET AUDIENCE (ICP): ${icps[0].name} - ${icps[0].description || ""}`;
          if (icps[0].painPoints) contextSection += `
Pain Points: ${JSON.parse(JSON.stringify(icps[0].painPoints)).join(", ")}`;
        }
        if (brandVoices2.length > 0) {
          contextSection += `
BRAND VOICE: ${brandVoices2[0].name} - Tone: ${brandVoices2[0].primaryTone || "professional"}`;
        }
      }
      const focusInstructions = input.focusAreas && input.focusAreas.length > 0 ? `
FOCUS YOUR IMPROVEMENTS ON: ${input.focusAreas.join(", ")}` : "";
      const systemPrompt = `You are an expert SEO content strategist and outline optimizer. You will be given a raw outline (could be bullet points, numbered headings, or any format) and your job is to:

1. PARSE the outline into a structured format (H2 sections with optional H3 sub-sections and key points)
2. ANALYZE it for weaknesses: missing topics, poor heading hierarchy, weak SEO structure, missing entities, poor user intent coverage, content gaps vs top-ranking competitors
3. SUGGEST specific, actionable improvements

For each suggestion, provide:
- category: one of "missing_section", "heading_improvement", "content_gap", "structure", "seo", "entity", "user_intent"
- priority: "high", "medium", or "low"
- description: clear explanation of what to improve and why
- action: the specific change (new heading text, new section to add, points to include, etc.)
- targetSectionIndex: which section this applies to (0-based), or -1 if it's a new section to add
${contextSection}${focusInstructions}

Keyword: ${input.keyword || "(not specified)"}

Respond in JSON with this exact schema:
{
  "parsedSections": [
    {
      "heading": "string",
      "type": "h2",
      "points": ["string"],
      "subSections": [{ "heading": "string", "type": "h3", "points": ["string"] }]
    }
  ],
  "overallScore": number (1-100, how good the outline is currently),
  "summary": "string (brief assessment of the outline's strengths and weaknesses)",
  "suggestions": [
    {
      "id": "string (unique)",
      "category": "string",
      "priority": "high|medium|low",
      "description": "string",
      "action": "string (the specific improvement to make)",
      "targetSectionIndex": number,
      "newSection": { "heading": "string", "type": "h2", "points": ["string"], "subSections": [] } | null
    }
  ]
}`;
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here is the outline to analyze and improve:

${input.rawOutline}` }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "outline_improvement",
            strict: false,
            schema: {
              type: "object",
              properties: {
                parsedSections: { type: "array", items: { type: "object" } },
                overallScore: { type: "number" },
                summary: { type: "string" },
                suggestions: { type: "array", items: { type: "object" } }
              },
              required: ["parsedSections", "overallScore", "summary", "suggestions"]
            }
          }
        }
      });
      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "";
      if (!content) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "LLM returned empty response" });
      try {
        return JSON.parse(content);
      } catch {
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse LLM response" });
      }
    }),
    /** Apply selected improvements to create an improved outline */
    applyImprovements: publicProcedure.input(z2.object({
      sections: z2.array(z2.any()),
      suggestions: z2.array(z2.any()),
      keyword: z2.string().optional(),
      projectId: z2.number()
    })).mutation(async ({ input }) => {
      let sections = [...input.sections];
      const sortedSuggestions = [...input.suggestions].sort((a, b) => {
        if (a.targetSectionIndex === -1 && b.targetSectionIndex !== -1) return 1;
        if (b.targetSectionIndex === -1 && a.targetSectionIndex !== -1) return -1;
        return (a.targetSectionIndex ?? 0) - (b.targetSectionIndex ?? 0);
      });
      let insertOffset = 0;
      for (const suggestion of sortedSuggestions) {
        if (suggestion.category === "missing_section" && suggestion.newSection) {
          const newSection = {
            id: `s${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            heading: suggestion.newSection.heading,
            type: suggestion.newSection.type || "h2",
            points: suggestion.newSection.points || [],
            subSections: (suggestion.newSection.subSections || []).map((sub, i) => ({
              id: `ss${Date.now()}_${i}`,
              heading: sub.heading,
              type: "h3",
              points: sub.points || []
            }))
          };
          const insertIdx = suggestion.targetSectionIndex === -1 ? sections.length : suggestion.targetSectionIndex + insertOffset + 1;
          sections.splice(insertIdx, 0, newSection);
          insertOffset++;
        } else if (suggestion.category === "heading_improvement" && suggestion.targetSectionIndex >= 0) {
          const idx = suggestion.targetSectionIndex;
          if (sections[idx]) {
            if (suggestion.action) {
              sections[idx] = { ...sections[idx], heading: suggestion.action };
            }
          }
        } else if (suggestion.category === "content_gap" || suggestion.category === "entity" || suggestion.category === "user_intent") {
          const idx = suggestion.targetSectionIndex;
          if (idx >= 0 && sections[idx]) {
            const newPoints = suggestion.action ? [suggestion.action] : [];
            sections[idx] = {
              ...sections[idx],
              points: [...sections[idx].points || [], ...newPoints]
            };
          } else if (suggestion.newSection) {
            sections.push({
              id: `s${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              heading: suggestion.newSection.heading,
              type: suggestion.newSection.type || "h2",
              points: suggestion.newSection.points || [],
              subSections: []
            });
          }
        } else if (suggestion.category === "structure" && suggestion.targetSectionIndex >= 0) {
          const idx = suggestion.targetSectionIndex;
          if (sections[idx] && suggestion.action) {
            sections[idx] = { ...sections[idx], points: [...sections[idx].points || [], suggestion.action] };
          }
        }
      }
      sections = sections.map((s, i) => ({
        ...s,
        id: s.id || `s${Date.now()}_${i}`
      }));
      return { sections };
    }),
    /** Generate outline from a saved idea — pre-fills with idea's keyword, title, content angles */
    fromIdea: publicProcedure.input(z2.object({
      ideaId: z2.number(),
      projectId: z2.number(),
      numSections: z2.number().optional(),
      targetWordCount: z2.number().optional(),
      brandVoiceId: z2.number().optional(),
      icpProfileId: z2.number().optional()
    })).mutation(async ({ input }) => {
      const idea = await getIdeaById(input.ideaId);
      if (!idea) throw new TRPCError3({ code: "NOT_FOUND", message: "Idea not found" });
      const project = await getProjectById(input.projectId);
      const allVoices = await getBrandVoicesByProject(input.projectId);
      const brandVoice = input.brandVoiceId ? allVoices.find((v) => v.id === input.brandVoiceId) ?? allVoices[0] ?? null : allVoices.find((v) => v.isDefault === 1) ?? allVoices[0] ?? null;
      const ideaContext = `
=== SOURCE IDEA ===
Title: ${idea.title}
Keyword: ${idea.keyword}
${idea.searchIntent ? `Search Intent: ${idea.searchIntent}` : ""}
${idea.wordCountRange ? `Suggested Word Count: ${idea.wordCountRange}` : ""}
${idea.description ? `Description: ${idea.description}` : ""}
${idea.targetAudience ? `Target Audience: ${idea.targetAudience}` : ""}
${idea.rankingPotential ? `Ranking Potential: ${idea.rankingPotential}` : ""}
${idea.contentAngles?.length ? `Content Angles to Cover:
${idea.contentAngles.map((a, i) => `  ${i + 1}. ${a}`).join("\n")}` : ""}
`;
      let icpSection = "";
      const formatList = (items, label) => {
        if (!items?.length) return "";
        return `${label}:
${items.map((item, i) => `  ${i + 1}. ${item}`).join("\n")}
`;
      };
      if (input.icpProfileId) {
        const icpProfile = await getICPById(input.icpProfileId);
        if (icpProfile) {
          icpSection = `
=== IDEAL CUSTOMER PROFILE ===
TARGET AUDIENCE: ${icpProfile.name}
${icpProfile.description ? `Who They Are: ${icpProfile.description}` : ""}
${formatList(icpProfile.painPoints, "PAIN POINTS")}
${formatList(icpProfile.goals, "GOALS")}
${formatList(icpProfile.objections, "OBJECTIONS (create FAQ questions from these)")}`;
        }
      } else if (project?.icpPrimaryName) {
        icpSection = `
=== IDEAL CUSTOMER PROFILE ===
TARGET AUDIENCE: ${project.icpPrimaryName}
${project.icpWhoTheyAre ? `Who They Are: ${project.icpWhoTheyAre}` : ""}
${formatList(project.icpPains, "PAIN POINTS")}
${formatList(project.icpGoals, "GOALS")}`;
      }
      let brandVoiceSection = "";
      if (brandVoice) {
        brandVoiceSection = `
=== BRAND VOICE ===
Voice: ${brandVoice.name}
Tone: ${brandVoice.toneTraits || "Professional"}
Perspective: ${brandVoice.perspective || "second"}
Style: ${brandVoice.sentenceStyle || "mixed"}`;
      }
      const numSections = input.numSections ?? 8;
      const targetWordCount = input.targetWordCount ?? (idea.wordCountRange ? parseInt(idea.wordCountRange.split("-")[1] || idea.wordCountRange) : 1600);
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const systemPrompt = `You are an expert SEO content strategist. You are generating an article outline from a pre-researched content idea. The idea has already been validated for SEO potential.

IMPORTANT: Current year is ${currentYear}. All references must be current.

${ideaContext}
${icpSection}
${brandVoiceSection}

OUTLINE REQUIREMENTS:
1. Create ${numSections} main H2 sections plus a FAQ section with 5 questions
2. The outline MUST cover ALL content angles from the idea
3. Structure for the specified search intent (${idea.searchIntent || "informational"})
4. Target word count: ${targetWordCount} words
5. Include an introduction and conclusion
6. Each section should have 2-4 specific, actionable key points
7. FAQ questions should address common user queries related to the keyword

Return a JSON object with:
- "title": SEO-optimized article title (can refine the idea's title)
- "sections": Array of sections, each with:
  - "id": Unique string ID ("s1", "s2", etc.)
  - "heading": Section heading text
  - "type": "h2" for main sections
  - "points": Array of 2-4 key points
  - "subSections": Array of sub-sections with same structure but type "h3"

Return ONLY valid JSON.`;
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate an outline for the keyword "${idea.keyword}" based on the idea: "${idea.title}"` }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "outline_from_idea",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      heading: { type: "string" },
                      type: { type: "string", enum: ["h2", "h3"] },
                      points: { type: "array", items: { type: "string" } },
                      subSections: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            heading: { type: "string" },
                            type: { type: "string", enum: ["h2", "h3"] },
                            points: { type: "array", items: { type: "string" } }
                          },
                          required: ["id", "heading", "type", "points"],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ["id", "heading", "type", "points", "subSections"],
                    additionalProperties: false
                  }
                }
              },
              required: ["title", "sections"],
              additionalProperties: false
            }
          }
        }
      });
      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) throw new Error("No response from AI");
      const content = typeof rawContent === "string" ? rawContent : rawContent[0]?.text ?? "";
      const parsed = extractJSON(content);
      if (!parsed) throw new Error("Failed to parse outline from AI response");
      return {
        title: parsed.title,
        keyword: idea.keyword,
        sections: parsed.sections,
        ideaId: idea.id,
        ideaTitle: idea.title,
        contentAngles: idea.contentAngles,
        searchIntent: idea.searchIntent
      };
    }),
    /** Generate outline from competitor URLs — scrape, analyze, and create superior outline */
    fromCompetitorUrls: publicProcedure.input(z2.object({
      urls: z2.array(z2.string().url()).min(1).max(5),
      keyword: z2.string().min(1),
      projectId: z2.number(),
      numSections: z2.number().optional(),
      targetWordCount: z2.number().optional(),
      brandVoiceId: z2.number().optional(),
      icpProfileId: z2.number().optional()
    })).mutation(async ({ input }) => {
      const { Readability } = await import("@mozilla/readability");
      const { parseHTML } = await import("linkedom");
      const fetchOne = async (url) => {
        try {
          const resp = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; RankPilot/1.0; +https://rankpilot.app)",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5"
            },
            signal: AbortSignal.timeout(15e3),
            redirect: "follow"
          });
          if (!resp.ok) return { url, title: "", headings: [], content: "", wordCount: 0, error: `HTTP ${resp.status}` };
          const html = await resp.text();
          const { document } = parseHTML(html);
          const headingEls = document.querySelectorAll("h1, h2, h3");
          const headings = [];
          headingEls.forEach((el) => {
            const tag = el.tagName.toLowerCase();
            const text2 = el.textContent?.trim();
            if (text2) headings.push(`${tag}: ${text2}`);
          });
          const pageTitle = document.querySelector("title")?.textContent?.trim() || "";
          const reader = new Readability(document, { charThreshold: 100 });
          const article = reader.parse();
          const cleanText = (article?.textContent || "").replace(/\s+/g, " ").trim();
          const wordCount = cleanText.split(/\s+/).filter((w) => w.length > 0).length;
          return {
            url,
            title: article?.title || pageTitle,
            headings,
            content: cleanText.slice(0, 8e3),
            wordCount
          };
        } catch (e) {
          return { url, title: "", headings: [], content: "", wordCount: 0, error: e.message };
        }
      };
      const results = await Promise.all(input.urls.map(fetchOne));
      const successful = results.filter((r) => !r.error && r.content.length > 100);
      if (successful.length === 0) {
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: "Could not extract content from any of the provided URLs. They may be behind paywalls or require JavaScript."
        });
      }
      const competitorContext = successful.map((r, i) => `
--- COMPETITOR ${i + 1}: ${r.title} ---
URL: ${r.url}
Word Count: ${r.wordCount}
Heading Structure:
${r.headings.map((h) => `  ${h}`).join("\n")}

Content Summary (first 3000 chars):
${r.content.slice(0, 3e3)}
`).join("\n");
      const project = await getProjectById(input.projectId);
      const allVoices = await getBrandVoicesByProject(input.projectId);
      const brandVoice = input.brandVoiceId ? allVoices.find((v) => v.id === input.brandVoiceId) ?? allVoices[0] ?? null : allVoices.find((v) => v.isDefault === 1) ?? allVoices[0] ?? null;
      let icpSection = "";
      const formatList = (items, label) => {
        if (!items?.length) return "";
        return `${label}:
${items.map((item, i) => `  ${i + 1}. ${item}`).join("\n")}
`;
      };
      if (input.icpProfileId) {
        const icpProfile = await getICPById(input.icpProfileId);
        if (icpProfile) {
          icpSection = `
=== IDEAL CUSTOMER PROFILE ===
TARGET AUDIENCE: ${icpProfile.name}
${formatList(icpProfile.painPoints, "PAIN POINTS")}
${formatList(icpProfile.goals, "GOALS")}`;
        }
      } else if (project?.icpPrimaryName) {
        icpSection = `
=== IDEAL CUSTOMER PROFILE ===
TARGET AUDIENCE: ${project.icpPrimaryName}
${formatList(project.icpPains, "PAIN POINTS")}
${formatList(project.icpGoals, "GOALS")}`;
      }
      let brandVoiceSection = "";
      if (brandVoice) {
        brandVoiceSection = `
=== BRAND VOICE ===
Voice: ${brandVoice.name}
Tone: ${brandVoice.toneTraits || "Professional"}
Perspective: ${brandVoice.perspective || "second"}`;
      }
      const numSections = input.numSections ?? 8;
      const targetWordCount = input.targetWordCount ?? 2e3;
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const systemPrompt = `You are an expert SEO content strategist. You have been given ${successful.length} competitor articles for the keyword "${input.keyword}". Your job is to create an outline that would OUTRANK all of them.

Current year: ${currentYear}

${competitorContext}
${icpSection}
${brandVoiceSection}

ANALYSIS INSTRUCTIONS:
1. Identify what ALL competitors cover (consensus topics) \u2014 you MUST include these
2. Identify unique angles from individual competitors worth including
3. Identify GAPS that NO competitor covers \u2014 these are your competitive advantage
4. Note the average word count and aim to be more comprehensive

OUTLINE REQUIREMENTS:
1. Create ${numSections} main H2 sections plus a FAQ section with 5 questions
2. Cover ALL consensus topics from competitors
3. Fill content gaps that competitors miss
4. Target word count: ${targetWordCount} words (aim to be more comprehensive than competitors)
5. Include introduction and conclusion
6. Each section should have 2-4 specific, actionable key points
7. Structure for maximum search visibility and user value

Return a JSON object with:
- "title": SEO-optimized article title that would outrank competitors
- "sections": Array of sections, each with:
  - "id": Unique string ID ("s1", "s2", etc.)
  - "heading": Section heading text
  - "type": "h2" for main sections
  - "points": Array of 2-4 key points
  - "subSections": Array of sub-sections with type "h3"
- "competitorInsights": Object with:
  - "consensusTopics": Array of topics all competitors cover
  - "gaps": Array of topics no competitor covers (your advantage)
  - "avgWordCount": Average word count across competitors

Return ONLY valid JSON.`;
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate an outline for "${input.keyword}" that would outrank these ${successful.length} competitors.` }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "outline_from_competitors",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      heading: { type: "string" },
                      type: { type: "string", enum: ["h2", "h3"] },
                      points: { type: "array", items: { type: "string" } },
                      subSections: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            heading: { type: "string" },
                            type: { type: "string", enum: ["h2", "h3"] },
                            points: { type: "array", items: { type: "string" } }
                          },
                          required: ["id", "heading", "type", "points"],
                          additionalProperties: false
                        }
                      }
                    },
                    required: ["id", "heading", "type", "points", "subSections"],
                    additionalProperties: false
                  }
                },
                competitorInsights: {
                  type: "object",
                  properties: {
                    consensusTopics: { type: "array", items: { type: "string" } },
                    gaps: { type: "array", items: { type: "string" } },
                    avgWordCount: { type: "integer" }
                  },
                  required: ["consensusTopics", "gaps", "avgWordCount"],
                  additionalProperties: false
                }
              },
              required: ["title", "sections", "competitorInsights"],
              additionalProperties: false
            }
          }
        }
      });
      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) throw new Error("No response from AI");
      const contentStr = typeof rawContent === "string" ? rawContent : rawContent[0]?.text ?? "";
      const parsed = extractJSON(contentStr);
      if (!parsed) throw new Error("Failed to parse outline from AI response");
      return {
        title: parsed.title,
        keyword: input.keyword,
        sections: parsed.sections,
        competitorInsights: parsed.competitorInsights,
        competitorsAnalyzed: successful.map((r) => ({ url: r.url, title: r.title, wordCount: r.wordCount }))
      };
    }),
    // ---- Outline Versioning ----
    saveVersion: publicProcedure.input(z2.object({
      outlineId: z2.number(),
      label: z2.string().min(1),
      sections: z2.any(),
      rawText: z2.string().optional(),
      score: z2.number().optional(),
      changeSummary: z2.string().optional(),
      projectId: z2.number()
    })).mutation(async ({ input, ctx }) => {
      const { getNextVersionNumber: getNextVersionNumber2, createOutlineVersion: createOutlineVersion2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const versionNumber = await getNextVersionNumber2(input.outlineId);
      const id = await createOutlineVersion2({
        outlineId: input.outlineId,
        versionNumber,
        label: input.label,
        sections: input.sections,
        rawText: input.rawText ?? null,
        score: input.score ?? null,
        changeSummary: input.changeSummary ?? null,
        projectId: input.projectId,
        userId: ctx.user?.id ?? 0
      });
      return { id, versionNumber };
    }),
    getVersions: publicProcedure.input(z2.object({ outlineId: z2.number() })).query(async ({ input }) => {
      const { getOutlineVersions: getOutlineVersions2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      return getOutlineVersions2(input.outlineId);
    }),
    getVersionsByProject: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      const { getOutlineVersionsByProject: getOutlineVersionsByProject2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      return getOutlineVersionsByProject2(input.projectId);
    }),
    // Save original + improved as version pair (for Improve Outline flow)
    saveImprovementVersions: publicProcedure.input(z2.object({
      outlineId: z2.number(),
      originalSections: z2.any(),
      improvedSections: z2.any(),
      rawText: z2.string().optional(),
      originalScore: z2.number().optional(),
      improvedScore: z2.number().optional(),
      changeSummary: z2.string().optional(),
      projectId: z2.number()
    })).mutation(async ({ input, ctx }) => {
      const { getNextVersionNumber: getNextVersionNumber2, createOutlineVersion: createOutlineVersion2 } = await Promise.resolve().then(() => (init_db(), db_exports));
      const userId = ctx.user?.id ?? 0;
      const v1Num = await getNextVersionNumber2(input.outlineId);
      await createOutlineVersion2({
        outlineId: input.outlineId,
        versionNumber: v1Num,
        label: "Original",
        sections: input.originalSections,
        rawText: input.rawText ?? null,
        score: input.originalScore ?? null,
        changeSummary: null,
        projectId: input.projectId,
        userId
      });
      const v2Num = await getNextVersionNumber2(input.outlineId);
      const improvedId = await createOutlineVersion2({
        outlineId: input.outlineId,
        versionNumber: v2Num,
        label: "AI Improved",
        sections: input.improvedSections,
        rawText: null,
        score: input.improvedScore ?? null,
        changeSummary: input.changeSummary ?? "AI-suggested improvements applied",
        projectId: input.projectId,
        userId
      });
      return { originalVersion: v1Num, improvedVersion: v2Num };
    })
  }),
  icpProfiles: router({
    list: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      return getICPsByProject(input.projectId);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getICPById(input.id);
    }),
    create: publicProcedure.input(z2.object({
      name: z2.string().min(1).max(255),
      description: z2.string().optional(),
      demographics: z2.object({
        ageRange: z2.string().optional(),
        location: z2.string().optional(),
        income: z2.string().optional(),
        education: z2.string().optional(),
        occupation: z2.string().optional(),
        other: z2.string().optional()
      }).optional(),
      painPoints: z2.array(z2.string()).optional(),
      goals: z2.array(z2.string()).optional(),
      objections: z2.array(z2.string()).optional(),
      contentPreferences: z2.array(z2.string()).optional(),
      searchBehavior: z2.string().optional(),
      isDefault: z2.number().optional(),
      projectId: z2.number()
    })).mutation(async ({ ctx, input }) => {
      return createICP({
        name: input.name,
        description: input.description ?? null,
        demographics: input.demographics ?? null,
        painPoints: input.painPoints ?? null,
        goals: input.goals ?? null,
        objections: input.objections ?? null,
        contentPreferences: input.contentPreferences ?? null,
        searchBehavior: input.searchBehavior ?? null,
        isDefault: input.isDefault ?? 0,
        projectId: input.projectId,
        userId: 1
      });
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(1).max(255).optional(),
      description: z2.string().optional(),
      demographics: z2.object({
        ageRange: z2.string().optional(),
        location: z2.string().optional(),
        income: z2.string().optional(),
        education: z2.string().optional(),
        occupation: z2.string().optional(),
        other: z2.string().optional()
      }).optional(),
      painPoints: z2.array(z2.string()).optional(),
      goals: z2.array(z2.string()).optional(),
      objections: z2.array(z2.string()).optional(),
      contentPreferences: z2.array(z2.string()).optional(),
      searchBehavior: z2.string().optional(),
      isDefault: z2.number().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateICP(id, data);
    }),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return deleteICP(input.id);
    }),
    export: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      const icp = await getICPById(input.id);
      if (!icp) throw new Error("ICP Profile not found");
      const demo = icp.demographics;
      let md = `# ICP Profile: ${icp.name}

`;
      if (icp.description) md += `## Description
${icp.description}

`;
      if (demo) {
        md += `## Demographics
`;
        if (demo.ageRange) md += `- **Age Range:** ${demo.ageRange}
`;
        if (demo.location) md += `- **Location:** ${demo.location}
`;
        if (demo.income) md += `- **Income:** ${demo.income}
`;
        if (demo.education) md += `- **Education:** ${demo.education}
`;
        if (demo.occupation) md += `- **Occupation:** ${demo.occupation}
`;
        if (demo.other) md += `- **Other:** ${demo.other}
`;
        md += `
`;
      }
      if (icp.painPoints?.length) {
        md += `## Pain Points
${icp.painPoints.map((p) => `- ${p}`).join("\n")}

`;
      }
      if (icp.goals?.length) {
        md += `## Goals
${icp.goals.map((g) => `- ${g}`).join("\n")}

`;
      }
      if (icp.objections?.length) {
        md += `## Objections
${icp.objections.map((o) => `- ${o}`).join("\n")}

`;
      }
      if (icp.contentPreferences?.length) {
        md += `## Content Preferences
${icp.contentPreferences.map((c) => `- ${c}`).join("\n")}

`;
      }
      if (icp.searchBehavior) {
        md += `## Search Behavior
${icp.searchBehavior}

`;
      }
      md += `---
*Exported on ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}*
`;
      return { markdown: md, filename: `icp-${icp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` };
    }),
    exportPdf: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      const icp = await getICPById(input.id);
      if (!icp) throw new Error("ICP Profile not found");
      const demo = icp.demographics;
      let html = `<html><head><style>body{font-family:'Segoe UI',system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1a1a2e;line-height:1.6}h1{color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:8px}h2{color:#312e81;margin-top:24px}ul{padding-left:20px}li{margin-bottom:6px}.meta{color:#6b7280;font-size:0.85em;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px}</style></head><body>`;
      html += `<h1>ICP Profile: ${icp.name}</h1>`;
      if (icp.description) html += `<h2>Description</h2><p>${icp.description}</p>`;
      if (demo) {
        html += `<h2>Demographics</h2><ul>`;
        if (demo.ageRange) html += `<li><strong>Age Range:</strong> ${demo.ageRange}</li>`;
        if (demo.location) html += `<li><strong>Location:</strong> ${demo.location}</li>`;
        if (demo.income) html += `<li><strong>Income:</strong> ${demo.income}</li>`;
        if (demo.education) html += `<li><strong>Education:</strong> ${demo.education}</li>`;
        if (demo.occupation) html += `<li><strong>Occupation:</strong> ${demo.occupation}</li>`;
        if (demo.other) html += `<li><strong>Other:</strong> ${demo.other}</li>`;
        html += `</ul>`;
      }
      if (icp.painPoints?.length) {
        html += `<h2>Pain Points</h2><ul>${icp.painPoints.map((p) => `<li>${p}</li>`).join("")}</ul>`;
      }
      if (icp.goals?.length) {
        html += `<h2>Goals</h2><ul>${icp.goals.map((g) => `<li>${g}</li>`).join("")}</ul>`;
      }
      if (icp.objections?.length) {
        html += `<h2>Objections</h2><ul>${icp.objections.map((o) => `<li>${o}</li>`).join("")}</ul>`;
      }
      if (icp.contentPreferences?.length) {
        html += `<h2>Content Preferences</h2><ul>${icp.contentPreferences.map((c) => `<li>${c}</li>`).join("")}</ul>`;
      }
      if (icp.searchBehavior) {
        html += `<h2>Search Behavior</h2><p>${icp.searchBehavior}</p>`;
      }
      html += `<p class="meta">Exported on ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>`;
      html += `</body></html>`;
      return { html, filename: `icp-${icp.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` };
    })
  }),
  brandVoices: router({
    list: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      return getBrandVoicesByProject(input.projectId);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getBrandVoiceById(input.id);
    }),
    create: publicProcedure.input(z2.object({
      name: z2.string().min(1).max(255),
      toneTraits: z2.string().optional(),
      perspective: z2.string().default("second"),
      sentenceStyle: z2.string().default("mixed"),
      writingStyleSample: z2.string().optional(),
      avoidList: z2.string().optional(),
      isDefault: z2.number().optional(),
      projectId: z2.number()
    })).mutation(async ({ ctx, input }) => {
      return createBrandVoice({
        name: input.name,
        toneTraits: input.toneTraits ?? null,
        perspective: input.perspective,
        sentenceStyle: input.sentenceStyle,
        writingStyleSample: input.writingStyleSample ?? null,
        avoidList: input.avoidList ?? null,
        isDefault: input.isDefault ?? 0,
        projectId: input.projectId,
        userId: 1
      });
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(1).max(255).optional(),
      toneTraits: z2.string().optional(),
      perspective: z2.string().optional(),
      sentenceStyle: z2.string().optional(),
      writingStyleSample: z2.string().optional(),
      avoidList: z2.string().optional(),
      isDefault: z2.number().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateBrandVoice(id, data);
    }),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return deleteBrandVoice(input.id);
    }),
    export: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      const bv = await getBrandVoiceById(input.id);
      if (!bv) throw new Error("Brand Voice not found");
      let primaryTones = [];
      let supportingTones = [];
      const toneTraits = bv.toneTraits || "";
      if (toneTraits.includes("PRIMARY:") || toneTraits.includes("SUPPORTING:")) {
        const parts = toneTraits.split("|");
        for (const part of parts) {
          if (part.startsWith("PRIMARY:")) primaryTones = part.replace("PRIMARY:", "").split(",").filter(Boolean);
          else if (part.startsWith("SUPPORTING:")) supportingTones = part.replace("SUPPORTING:", "").split(",").filter(Boolean);
        }
      } else {
        primaryTones = toneTraits.split(",").map((s) => s.trim()).filter(Boolean);
      }
      const AVOID_LABELS = {
        jargon: "Overly technical jargon",
        salesy: "Sales-heavy language",
        fear: "Fear-based messaging",
        exaggerated: "Exaggerated claims",
        cliches: "Industry clich\xE9s",
        passive: "Passive voice",
        buzzwords: "Buzzwords",
        rhetorical: "Rhetorical questions",
        unverified: "Unverified statistics",
        competitor: "Competitor comparisons"
      };
      let avoidItems = [];
      const avoidList = bv.avoidList || "";
      if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
        const parts = avoidList.split("|");
        for (const part of parts) {
          if (part.startsWith("PRESETS:")) {
            const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
            avoidItems.push(...presetIds.map((id) => AVOID_LABELS[id] || id));
          } else if (part.startsWith("CUSTOM:")) {
            const custom = part.replace("CUSTOM:", "").trim();
            if (custom) avoidItems.push(...custom.split(",").map((s) => s.trim()).filter(Boolean));
          }
        }
      } else if (avoidList) {
        avoidItems = avoidList.split(",").map((s) => s.trim()).filter(Boolean);
      }
      const perspectiveMap = { first: "First Person (we/our/us)", second: "Second Person (you/your)", third: "Third Person (they/the company)" };
      const styleMap = { short: "Short and Direct", mixed: "Mixed (Varied Rhythm)", detailed: "Detailed and Explanatory" };
      let md = `# Brand Voice: ${bv.name}

`;
      md += `## Tone
`;
      if (primaryTones.length) md += `- **Primary Tones:** ${primaryTones.join(", ")}
`;
      if (supportingTones.length) md += `- **Supporting Tones:** ${supportingTones.join(", ")}
`;
      md += `
`;
      md += `## Writing Style
`;
      md += `- **Perspective:** ${perspectiveMap[bv.perspective] || bv.perspective}
`;
      md += `- **Sentence Style:** ${styleMap[bv.sentenceStyle] || bv.sentenceStyle}

`;
      if (avoidItems.length) {
        md += `## Avoid List
${avoidItems.map((a) => `- ${a}`).join("\n")}

`;
      }
      if (bv.writingStyleSample) {
        md += `## Writing Style Sample
> ${bv.writingStyleSample.replace(/\n/g, "\n> ")}

`;
      }
      md += `---
*Exported on ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}*
`;
      return { markdown: md, filename: `brand-voice-${bv.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` };
    }),
    exportPdf: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      const bv = await getBrandVoiceById(input.id);
      if (!bv) throw new Error("Brand Voice not found");
      let primaryTones = [];
      let supportingTones = [];
      const toneTraits = bv.toneTraits || "";
      if (toneTraits.includes("PRIMARY:") || toneTraits.includes("SUPPORTING:")) {
        const parts = toneTraits.split("|");
        for (const part of parts) {
          if (part.startsWith("PRIMARY:")) primaryTones = part.replace("PRIMARY:", "").split(",").filter(Boolean);
          else if (part.startsWith("SUPPORTING:")) supportingTones = part.replace("SUPPORTING:", "").split(",").filter(Boolean);
        }
      } else {
        primaryTones = toneTraits.split(",").map((s) => s.trim()).filter(Boolean);
      }
      const AVOID_LABELS = {
        jargon: "Overly technical jargon",
        salesy: "Sales-heavy language",
        fear: "Fear-based messaging",
        exaggerated: "Exaggerated claims",
        cliches: "Industry clich\xE9s",
        passive: "Passive voice",
        buzzwords: "Buzzwords",
        rhetorical: "Rhetorical questions",
        unverified: "Unverified statistics",
        competitor: "Competitor comparisons"
      };
      let avoidItems = [];
      const avoidList = bv.avoidList || "";
      if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
        const parts = avoidList.split("|");
        for (const part of parts) {
          if (part.startsWith("PRESETS:")) {
            const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
            avoidItems.push(...presetIds.map((id) => AVOID_LABELS[id] || id));
          } else if (part.startsWith("CUSTOM:")) {
            const custom = part.replace("CUSTOM:", "").trim();
            if (custom) avoidItems.push(...custom.split(",").map((s) => s.trim()).filter(Boolean));
          }
        }
      } else if (avoidList) {
        avoidItems = avoidList.split(",").map((s) => s.trim()).filter(Boolean);
      }
      const perspectiveMap = { first: "First Person (we/our/us)", second: "Second Person (you/your)", third: "Third Person (they/the company)" };
      const styleMap = { short: "Short and Direct", mixed: "Mixed (Varied Rhythm)", detailed: "Detailed and Explanatory" };
      let html = `<html><head><style>body{font-family:'Segoe UI',system-ui,sans-serif;max-width:700px;margin:40px auto;padding:20px;color:#1a1a2e;line-height:1.6}h1{color:#4f46e5;border-bottom:2px solid #4f46e5;padding-bottom:8px}h2{color:#312e81;margin-top:24px}ul{padding-left:20px}li{margin-bottom:6px}blockquote{border-left:3px solid #4f46e5;padding-left:16px;color:#4b5563;font-style:italic;margin:12px 0}.meta{color:#6b7280;font-size:0.85em;margin-top:32px;border-top:1px solid #e5e7eb;padding-top:12px}.tag{display:inline-block;background:#eef2ff;color:#4338ca;padding:2px 10px;border-radius:12px;font-size:0.85em;margin-right:6px}</style></head><body>`;
      html += `<h1>Brand Voice: ${bv.name}</h1>`;
      html += `<h2>Tone</h2>`;
      if (primaryTones.length) html += `<p><strong>Primary:</strong> ${primaryTones.map((t2) => `<span class="tag">${t2}</span>`).join(" ")}</p>`;
      if (supportingTones.length) html += `<p><strong>Supporting:</strong> ${supportingTones.map((t2) => `<span class="tag">${t2}</span>`).join(" ")}</p>`;
      html += `<h2>Writing Style</h2><ul>`;
      html += `<li><strong>Perspective:</strong> ${perspectiveMap[bv.perspective] || bv.perspective}</li>`;
      html += `<li><strong>Sentence Style:</strong> ${styleMap[bv.sentenceStyle] || bv.sentenceStyle}</li>`;
      html += `</ul>`;
      if (avoidItems.length) {
        html += `<h2>Avoid List</h2><ul>${avoidItems.map((a) => `<li>${a}</li>`).join("")}</ul>`;
      }
      if (bv.writingStyleSample) {
        html += `<h2>Writing Style Sample</h2><blockquote>${bv.writingStyleSample.replace(/\n/g, "<br>")}</blockquote>`;
      }
      html += `<p class="meta">Exported on ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>`;
      html += `</body></html>`;
      return { html, filename: `brand-voice-${bv.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` };
    })
  }),
  ctaTemplates: router({
    list: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      return getCTAsByProject(input.projectId);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getCTAById(input.id);
    }),
    create: publicProcedure.input(z2.object({
      name: z2.string().min(1).max(255),
      content: z2.string().min(1),
      type: z2.string().optional(),
      placement: z2.string().optional(),
      url: z2.string().optional(),
      buttonText: z2.string().optional(),
      isDefault: z2.number().optional(),
      projectId: z2.number()
    })).mutation(async ({ ctx, input }) => {
      return createCTA({
        name: input.name,
        content: input.content,
        type: input.type ?? "inline",
        placement: input.placement ?? "end",
        url: input.url ?? null,
        buttonText: input.buttonText ?? null,
        isDefault: input.isDefault ?? 0,
        projectId: input.projectId,
        userId: 1
      });
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(1).max(255).optional(),
      content: z2.string().optional(),
      type: z2.string().optional(),
      placement: z2.string().optional(),
      url: z2.string().optional(),
      buttonText: z2.string().optional(),
      isDefault: z2.number().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateCTA(id, data);
    }),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return deleteCTA(input.id);
    })
  }),
  sitemaps: router({
    list: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      return getSitemapsByProject(input.projectId);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getSitemapById(input.id);
    }),
    create: publicProcedure.input(z2.object({
      url: z2.string().url().min(1),
      projectId: z2.number()
    })).mutation(async ({ input }) => {
      const parsedUrls = await parseSitemap(input.url);
      if (parsedUrls.length === 0) {
        throw new Error("Could not parse any URLs from the sitemap. Please verify the URL is correct and accessible.");
      }
      return createSitemap({
        url: input.url,
        parsedUrls,
        urlCount: parsedUrls.length,
        projectId: input.projectId
      });
    }),
    refresh: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const sitemap = await getSitemapById(input.id);
      if (!sitemap) throw new Error("Sitemap not found");
      const parsedUrls = await parseSitemap(sitemap.url);
      if (parsedUrls.length === 0) {
        throw new Error("Could not parse any URLs from the sitemap during refresh.");
      }
      return updateSitemap(input.id, {
        parsedUrls,
        urlCount: parsedUrls.length,
        lastParsed: /* @__PURE__ */ new Date()
      });
    }),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return deleteSitemap(input.id);
    }),
    /**
     * Check for Existing Coverage — scans all project sitemap URLs against a target keyword
     * using LLM analysis to find pages that may already cover the same topic.
     */
    checkCoverage: publicProcedure.input(z2.object({
      keyword: z2.string().min(1),
      projectId: z2.number()
    })).mutation(async ({ input }) => {
      const allSitemaps = await getSitemapsByProject(input.projectId);
      if (!allSitemaps || allSitemaps.length === 0) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "No sitemaps found for this project. Add a sitemap in Project Settings first." });
      }
      const allUrls = [];
      for (const sm of allSitemaps) {
        if (sm.parsedUrls && Array.isArray(sm.parsedUrls)) {
          for (const u of sm.parsedUrls) {
            allUrls.push({ url: u.url, title: u.title || void 0 });
          }
        }
      }
      if (allUrls.length === 0) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Sitemaps contain no parsed URLs. Try refreshing your sitemaps." });
      }
      const urlList = allUrls.map(
        (u, i) => `${i + 1}. ${u.url}${u.title ? ` | Title: "${u.title}"` : ""}`
      ).join("\n");
      const coverageResult = await callLLM({
        messages: [
          {
            role: "system",
            content: `You are a senior SEO strategist performing a strict keyword cannibalization audit. Your job is to identify ONLY pages that would directly compete with a new article on the target keyword.

Flagging criteria \u2014 apply these strictly:

**HIGH severity** (flag only if ALL of these are true):
- The existing page targets the SAME primary keyword or search intent as the new article
- A user searching the target keyword could land on this page and have their question fully answered
- Publishing a new article would split ranking signals and directly cannibalize this page

**MEDIUM severity** (flag only if BOTH of these are true):
- The existing page covers the SAME specific subtopic \u2014 not just the same broad subject area
- A substantial portion (>40%) of the new article's content would duplicate what this page already covers

**DO NOT flag** pages that:
- Are in the same general topic category but answer a different question
- Mention the keyword in passing but focus on a different primary topic
- Cover a broader or narrower subject (e.g., a category page vs. a specific explainer)
- Are navigation, contact, about, or utility pages

When in doubt, DO NOT flag. A typical site should have 0\u20133 overlaps for most keywords. If you are flagging more than 5 pages, you are being too liberal \u2014 re-evaluate and only keep the strongest matches.

Return JSON:
{
  "totalScanned": number,
  "overlaps": [
    {
      "url": string,
      "title": string or null,
      "severity": "high" | "medium",
      "recommendation": "Update existing page" | "Differentiate angle" | "Merge content" | "Consider canonical",
      "explanation": string (1 sentence: state specifically WHY this page targets the same search intent, not just that it's related)
    }
  ]
}`
          },
          {
            role: "user",
            content: `Target keyword: "${input.keyword}"

Existing pages (${allUrls.length} total):
${urlList}`
          }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "coverage_check",
            strict: true,
            schema: {
              type: "object",
              properties: {
                totalScanned: { type: "integer", description: "Total number of URLs scanned" },
                overlaps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      url: { type: "string" },
                      title: { type: ["string", "null"] },
                      severity: { type: "string", enum: ["high", "medium"] },
                      recommendation: { type: "string" },
                      explanation: { type: "string" }
                    },
                    required: ["url", "title", "severity", "recommendation", "explanation"],
                    additionalProperties: false
                  }
                }
              },
              required: ["totalScanned", "overlaps"],
              additionalProperties: false
            }
          }
        }
      }, input.projectId);
      const rawContent = coverageResult.choices?.[0]?.message?.content;
      const text2 = typeof rawContent === "string" ? rawContent : "";
      const parsed = extractJSON(text2);
      if (!parsed) {
        console.error("[CoverageCheck] Failed to parse LLM response:", text2);
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse coverage analysis. Please try again." });
      }
      return {
        totalScanned: parsed.totalScanned ?? allUrls.length,
        overlaps: parsed.overlaps ?? [],
        highCount: (parsed.overlaps ?? []).filter((o) => o.severity === "high").length,
        mediumCount: (parsed.overlaps ?? []).filter((o) => o.severity === "medium").length
      };
    })
  }),
  citations: router({
    list: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      return getCitationsByProject(input.projectId);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getCitationById(input.id);
    }),
    create: publicProcedure.input(z2.object({
      name: z2.string().min(1).max(512),
      url: z2.string().url().min(1),
      description: z2.string().optional(),
      category: z2.string().optional(),
      projectId: z2.number()
    })).mutation(async ({ ctx, input }) => {
      return createCitation({
        name: input.name,
        url: input.url,
        description: input.description ?? null,
        category: input.category ?? null,
        projectId: input.projectId,
        userId: 1
      });
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      name: z2.string().min(1).max(512).optional(),
      url: z2.string().url().optional(),
      description: z2.string().optional(),
      category: z2.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateCitation(id, data);
    }),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return deleteCitation(input.id);
    }),
    bulkDelete: publicProcedure.input(z2.object({ ids: z2.array(z2.number()).min(1) })).mutation(async ({ input }) => {
      return bulkDeleteCitations(input.ids);
    })
  }),
  crossCheck: router({
    /** Get the reference document metadata for a project */
    getReferenceDoc: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      const project = await getProjectById(input.projectId);
      if (!project) throw new Error("Project not found");
      let referenceDoc = null;
      let s3FetchFailed = false;
      if (project.referenceDocContent) {
        referenceDoc = project.referenceDocContent;
      } else if (project.referenceDocS3Key) {
        try {
          referenceDoc = await fetchReferenceDocFromS3(project.referenceDocS3Key);
          if (referenceDoc) {
            try {
              await updateProjectReferenceDocMeta(
                input.projectId,
                project.referenceDocS3Key,
                project.referenceDocName || "Reference Document",
                referenceDoc.length,
                referenceDoc
              );
              console.log(`[RefDoc SELF-HEAL] Backfilled DB from S3 for project ${input.projectId}`);
            } catch {
            }
          } else {
            s3FetchFailed = true;
          }
        } catch {
          s3FetchFailed = true;
        }
      }
      const hasMetadata = referenceDoc !== null || !!(project.referenceDocName && (project.referenceDocS3Key || project.referenceDocContent));
      return {
        referenceDoc,
        referenceDocName: project.referenceDocName,
        referenceDocLength: project.referenceDocLength,
        referenceDocUpdatedAt: hasMetadata ? project.updatedAt : null,
        s3FetchFailed,
        hasMetadata
      };
    }),
    /** Update the reference document for a project (DB-primary, S3 as immutable backup) */
    updateReferenceDoc: publicProcedure.input(z2.object({
      projectId: z2.number(),
      referenceDoc: z2.string().nullable(),
      referenceDocName: z2.string().nullable()
    })).mutation(async ({ input }) => {
      if (input.referenceDoc) {
        console.log(`[RefDoc SAVE] project=${input.projectId} name="${input.referenceDocName}" chars=${input.referenceDoc.length} at=${(/* @__PURE__ */ new Date()).toISOString()}`);
        let s3Key = null;
        try {
          s3Key = getReferenceDocS3Key(input.projectId);
          await storagePut(s3Key, input.referenceDoc, "text/plain");
          console.log(`[RefDoc S3] Backup uploaded: ${s3Key}`);
        } catch (e) {
          console.warn(`[RefDoc S3] Backup upload failed:`, e);
          s3Key = null;
        }
        const result = await updateProjectReferenceDocMeta(
          input.projectId,
          s3Key,
          input.referenceDocName,
          input.referenceDoc.length,
          input.referenceDoc
        );
        try {
          const verify = await getProjectById(input.projectId);
          if (verify?.referenceDocContent && verify.referenceDocContent.length > 0) {
            console.log(`[RefDoc VERIFIED] project=${input.projectId} dbChars=${verify.referenceDocContent.length}`);
          } else {
            console.warn(`[RefDoc VERIFY WARN] project=${input.projectId} \u2014 DB content empty after save`);
          }
        } catch {
        }
        return result;
      } else {
        console.log(`[RefDoc DELETE] project=${input.projectId} at=${(/* @__PURE__ */ new Date()).toISOString()}`);
        return updateProjectReferenceDocMeta(input.projectId, null, null, null, null);
      }
    }),
    /** Run cross-check on an article against the project's reference document */
    checkArticle: publicProcedure.input(z2.object({ articleId: z2.number() })).mutation(async ({ input }) => {
      const article = await getArticleById(input.articleId);
      if (!article) throw new Error("Article not found");
      const project = await getProjectById(article.projectId);
      if (!project) throw new Error("Project not found");
      let referenceDoc = project.referenceDocContent || null;
      if (!referenceDoc && project.referenceDocS3Key) {
        referenceDoc = await fetchReferenceDocFromS3(project.referenceDocS3Key);
      }
      if (!referenceDoc) {
        throw new Error("No reference document found for this project. Add one in Project Settings > Cross Check tab.");
      }
      const referenceDocName = project.referenceDocName || "Reference Document";
      const systemPrompt = `You are a meticulous fact-checker. Your ONLY job is to compare an article against a reference document and identify factual discrepancies.

IMPORTANT RULES:
1. You are ONLY checking for factual accuracy \u2014 not grammar, tone, style, SEO, or structure.
2. A "discrepancy" means the article states something that CONTRADICTS or MISREPRESENTS specific facts in the reference document.
3. If the article discusses topics NOT covered in the reference document, that is NOT a discrepancy \u2014 ignore those sections entirely.
4. If the article does not touch on any information from the reference document, return an empty discrepancies array.
5. Be very precise \u2014 quote the exact text from the article and the exact contradicting fact from the reference document.
6. Do NOT invent issues. Only flag genuine factual conflicts between the two documents.
7. For each discrepancy, provide a corrected version of the article text that aligns with the reference document.

CRITICAL TEXT QUOTING RULES:
- "articleText" MUST be the EXACT, VERBATIM text copied from the article. Do NOT paraphrase, truncate, summarize, or use ellipsis (...).
- Copy the COMPLETE sentence or phrase \u2014 never abbreviate with "..." or "[...]".
- If the inaccurate text spans multiple sentences, include ALL of them in full.
- "correction" MUST be the EXACT replacement text that should replace "articleText" word-for-word. It must be ready to directly substitute into the article.
- "correction" must NOT be a description of what to change (e.g., "Change X to Y"). It must be the actual corrected text itself.
- The "correction" should be the same length and structure as "articleText" \u2014 only the inaccurate parts should differ.
- NEVER add <strong>, <b>, <em>, or <i> tags to correction text. Do NOT bold or emphasize changed text \u2014 the correction must use plain text matching the original formatting.

Respond in this exact JSON format:
{
  "summary": "A 1-2 sentence overall assessment of factual alignment",
  "discrepancies": [
    {
      "articleText": "The exact verbatim text from the article (complete, no ellipsis, no truncation)",
      "referenceText": "The exact fact from the reference document that contradicts it",
      "correction": "The exact replacement text ready to substitute into the article (not a description)",
      "severity": "high" | "medium" | "low"
    }
  ],
  "alignedFacts": [
    "Brief description of facts in the article that correctly match the reference document"
  ]
}

Severity guide:
- "high": Critical factual errors (wrong numbers, dates, names, costs)
- "medium": Misleading or outdated information that could confuse readers
- "low": Minor inaccuracies or imprecise language that slightly misrepresents the reference

Respond with ONLY the JSON object. No markdown, no explanation.`;
      const plainContent = (article.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const userPrompt = `REFERENCE DOCUMENT ("${referenceDocName}"):
---
${referenceDoc}
---

ARTICLE TO CROSS-CHECK:
Title: ${article.title}
Keyword: ${article.keyword ?? ""}

Content:
${plainContent}`;
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }, article.projectId);
      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) throw new Error("No response from AI");
      const contentStr = typeof rawContent === "string" ? rawContent : rawContent[0]?.text ?? "";
      const results = extractJSON(contentStr);
      if (!results) throw new Error("Failed to parse cross-check response");
      return {
        results,
        referenceDocName
      };
    })
  }),
  // ---- Redundancy Checker ----
  redundancy: router({
    /** Analyze article content for redundancies: repeated phrases, redundant ideas, recycled stats, filler patterns */
    check: publicProcedure.input(z2.object({ articleId: z2.number() })).mutation(async ({ input }) => {
      const article = await getArticleById(input.articleId);
      if (!article) throw new Error("Article not found");
      if (!article.content || article.content.trim().length < 50) {
        throw new Error("Article content is too short to check for redundancies.");
      }
      const systemPrompt = `You are an expert content editor specializing in identifying redundancy and repetition in written content. Your job is to find ALL instances of redundancy in the article.

Scan for these 4 types of redundancy:

1. REPEATED PHRASES: The same phrase, sentence, or near-identical wording appearing more than once in different sections. Even slight variations count (e.g., "Medicare covers preventive services" and "preventive services are covered by Medicare").

2. REDUNDANT IDEAS: Two or more sections making the same point with different words. The information is duplicated even though the phrasing differs.

3. RECYCLED STATISTICS: The same data point, number, percentage, or statistic cited more than once in the article.

4. FILLER PATTERNS: Generic AI-generated padding that adds no value. Common examples:
   - "It's important to note that..."
   - "When it comes to..."
   - "In today's world..."
   - "As mentioned earlier..."
   - "It goes without saying..."
   - "At the end of the day..."
   - "It's worth mentioning that..."
   - "In order to..."
   - "The fact of the matter is..."
   - "Needless to say..."
   - Excessive use of "Furthermore," "Moreover," "Additionally," as paragraph starters
   - Any sentence that could be deleted without losing information

IMPORTANT RULES:
1. Be thorough \u2014 scan the ENTIRE article, not just the first few paragraphs.
2. For each redundancy, quote the EXACT text from the article (verbatim, character-for-character match).
3. Provide a specific, actionable fix: either remove the redundant text, merge the two instances, or rewrite to add new information.
4. The "suggestedFix" must be a drop-in replacement for the "originalText" \u2014 same format, ready to swap.
5. For FILLER PATTERNS, the suggestedFix should be the sentence rewritten without the filler phrase, or removed entirely if the sentence adds nothing.
6. Do NOT flag things that are intentionally repeated for emphasis or structure (like a keyword in headings).
7. Assign severity based on impact: "high" for full duplicate paragraphs or ideas, "medium" for repeated phrases or stats, "low" for filler patterns.

CRITICAL TEXT QUOTING RULES:
- "originalText" MUST be the EXACT, VERBATIM text copied from the article. Do NOT paraphrase, truncate, summarize, or use ellipsis (...).
- Copy the COMPLETE sentence or phrase \u2014 never abbreviate with "..." or "[...]".
- "suggestedFix" MUST be the EXACT replacement text ready to directly substitute into the article.
- "suggestedFix" must NOT be a description of what to change. It must be the actual corrected text itself.
- NEVER add <strong>, <b>, <em>, or <i> tags to suggestedFix text. Do NOT bold or emphasize changed text \u2014 the fix must use plain text matching the original formatting.

Respond in this exact JSON format:
{
  "summary": "A 1-2 sentence assessment of the article's redundancy level",
  "redundancyScore": <number 1-10, where 1 = very redundant and 10 = no redundancy>,
  "redundancies": [
    {
      "type": "repeated_phrase" | "redundant_idea" | "recycled_stat" | "filler_pattern",
      "severity": "high" | "medium" | "low",
      "description": "Brief explanation of the redundancy",
      "originalText": "The exact text from the article to find and replace (verbatim)",
      "secondInstance": "The other instance of the repeated content (for context, if applicable)",
      "suggestedFix": "The replacement text, or empty string if the text should be removed entirely"
    }
  ],
  "cleanSections": [
    "Brief description of sections that are well-written with no redundancy"
  ]
}

Respond with ONLY the JSON object. No markdown, no explanation.`;
      const plainContent = (article.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const userPrompt = `ARTICLE TO CHECK FOR REDUNDANCIES:
Title: ${article.title}
Keyword: ${article.keyword ?? ""}

Content:
${plainContent}`;
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }, article.projectId);
      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) throw new Error("No response from AI");
      const contentStr = typeof rawContent === "string" ? rawContent : rawContent[0]?.text ?? "";
      const results = extractJSON(contentStr);
      if (!results) throw new Error("Failed to parse redundancy check response");
      return { results };
    })
  }),
  articles: router({
    list: publicProcedure.input(z2.object({ projectId: z2.number(), status: z2.string().optional() })).query(async ({ input }) => {
      return getArticlesByProject(input.projectId, input.status);
    }),
    listAll: publicProcedure.query(async ({ ctx }) => {
      return getArticlesByUser(1);
    }),
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      return getArticleById(input.id);
    }),
    stats: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      return getArticleStats(input.projectId);
    }),
    create: publicProcedure.input(z2.object({
      title: z2.string().min(1),
      content: z2.string().optional(),
      keyword: z2.string().optional(),
      keywords: z2.array(z2.string()).optional(),
      metaTitle: z2.string().optional(),
      metaDescription: z2.string().optional(),
      slug: z2.string().optional(),
      wordCount: z2.number().optional(),
      status: z2.enum(["draft", "review", "complete", "published"]).optional(),
      contentType: z2.string().optional(),
      outlineId: z2.number().optional(),
      projectId: z2.number()
    })).mutation(async ({ ctx, input }) => {
      return createArticle({
        ...input,
        content: input.content ?? null,
        keyword: input.keyword ?? null,
        keywords: input.keywords ?? null,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        slug: input.slug ?? null,
        wordCount: input.wordCount ?? 0,
        contentType: input.contentType ?? null,
        outlineId: input.outlineId ?? null,
        excerpt: null,
        userId: 1
      });
    }),
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      title: z2.string().optional(),
      content: z2.string().optional(),
      keyword: z2.string().optional(),
      keywords: z2.array(z2.string()).optional(),
      metaTitle: z2.string().optional(),
      metaDescription: z2.string().optional(),
      slug: z2.string().optional(),
      wordCount: z2.number().optional(),
      status: z2.enum(["draft", "review", "complete", "published"]).optional(),
      contentType: z2.string().optional()
    })).mutation(async ({ input }) => {
      const { id, ...data } = input;
      return updateArticle(id, data);
    }),
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      return deleteArticle(input.id);
    }),
    /** Save an article as a draft in the MedicareFAQ CMS (GitHub Editor) */
    publishToCms: publicProcedure.input(z2.object({
      articleId: z2.number(),
      category: z2.string().optional()
    })).mutation(async ({ input }) => {
      const { saveDraftToCms: saveDraftToCms2, generateSlug: generateSlug2 } = await Promise.resolve().then(() => (init_cmsPublish(), cmsPublish_exports));
      const article = await getArticleById(input.articleId);
      if (!article) throw new TRPCError3({ code: "NOT_FOUND", message: "Article not found" });
      if (!article.content) throw new TRPCError3({ code: "BAD_REQUEST", message: "Article has no content" });
      if (!article.title) throw new TRPCError3({ code: "BAD_REQUEST", message: "Article has no title" });
      const slugSource = article.keyword || article.title;
      const slug = article.slug || generateSlug2(slugSource);
      const excerpt = article.excerpt || article.metaDescription || void 0;
      const seoTitle = article.metaTitle || void 0;
      const seoDescription = article.metaDescription || void 0;
      const result = await saveDraftToCms2({
        title: article.title,
        slug,
        rawContent: article.content,
        excerpt,
        category: input.category || "General",
        author: "David Haass",
        reviewer: "Ashlee Zareczny",
        seoTitle,
        seoDescription
      });
      await updateArticle(article.id, {
        status: "published",
        slug
      });
      let transformed = false;
      try {
        const cmsPassword = process.env.CMS_PASSWORD;
        const transformUrl = `https://medicarefaq-next-nine.vercel.app/api/cms/drafts/${result.id}/transform`;
        console.log(`[CMS] Calling Transform with AI: ${transformUrl}`);
        const transformRes = await fetch(transformUrl, {
          method: "POST",
          headers: {
            "x-cms-password": cmsPassword || ""
          }
        });
        const transformBody = await transformRes.text();
        if (transformRes.ok) {
          transformed = true;
          console.log(`[CMS] Transform with AI completed for draft ${result.id}`);
        } else {
          console.warn(`[CMS] Transform with AI failed: ${transformRes.status} ${transformRes.statusText} \u2014 ${transformBody.substring(0, 200)}`);
        }
      } catch (err) {
        console.warn(`[CMS] Transform with AI error:`, err);
      }
      return {
        success: true,
        draftId: result.id,
        slug: result.slug,
        transformed,
        message: transformed ? `Draft saved to CMS and transformed with AI.` : `Draft saved to CMS. Transform with AI failed \u2014 you can run it manually in the CMS.`
      };
    }),
    /** Regenerate a single section of an article using AI */
    regenerateSection: publicProcedure.input(z2.object({
      articleId: z2.number(),
      sectionHeading: z2.string().min(1),
      instructions: z2.string().optional(),
      toneOverride: z2.string().optional(),
      lengthPreference: z2.enum(["shorter", "same", "longer"]).optional()
    })).mutation(async ({ input }) => {
      console.log(`[RegenSection] Starting. articleId=${input.articleId}, heading="${input.sectionHeading}"`);
      const article = await getArticleById(input.articleId);
      if (!article) throw new Error("Article not found");
      if (!article.content) throw new Error("Article has no content");
      const content = article.content;
      const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
      const h2Matches = [];
      let match;
      while ((match = h2Regex.exec(content)) !== null) {
        const headingText = match[1].replace(/<[^>]*>/g, "").trim();
        h2Matches.push({ fullMatch: match[0], text: headingText, index: match.index });
      }
      const targetIdx = h2Matches.findIndex(
        (h) => h.text.toLowerCase().trim() === input.sectionHeading.toLowerCase().trim()
      );
      if (targetIdx === -1) {
        throw new Error(`Section "${input.sectionHeading}" not found in article. Available sections: ${h2Matches.map((h) => h.text).join(", ")}`);
      }
      const sectionStart = h2Matches[targetIdx].index;
      const sectionEnd = targetIdx + 1 < h2Matches.length ? h2Matches[targetIdx + 1].index : content.length;
      const oldSectionContent = content.slice(sectionStart, sectionEnd).trim();
      const prevSectionSnippet = sectionStart > 0 ? content.slice(Math.max(0, sectionStart - 500), sectionStart).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(-300) : "";
      const nextSectionSnippet = sectionEnd < content.length ? content.slice(sectionEnd, Math.min(content.length, sectionEnd + 500)).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) : "";
      const project = article.projectId ? await getProjectById(article.projectId) : null;
      const projectId = article.projectId;
      let brandVoiceContext = "";
      let maxSentences = 5;
      if (projectId) {
        const allVoices = await getBrandVoicesByProject(projectId);
        const bv = allVoices.find((v) => v.isDefault === 1) || allVoices[0];
        if (bv) {
          const perspectiveMap = {
            first: "first person (we/our/us)",
            second: "second person (you/your)",
            third: "third person (they/the company)"
          };
          const styleMap = {
            short: "Short and direct. Paragraphs of 1-3 sentences.",
            mixed: "Varied and natural rhythm. Paragraphs of 2-5 sentences.",
            detailed: "Detailed and explanatory. Paragraphs of 3-6 sentences."
          };
          maxSentences = bv.sentenceStyle === "short" ? 3 : bv.sentenceStyle === "detailed" ? 6 : 5;
          const AVOID_LABELS = {
            jargon: "Overly technical jargon",
            salesy: "Sales-heavy language",
            fear: "Fear-based messaging",
            exaggerated: "Exaggerated claims",
            cliches: "Industry clich\xE9s",
            passive: "Passive voice",
            buzzwords: "Buzzwords",
            rhetorical: "Rhetorical questions",
            unverified: "Unverified statistics",
            competitor: "Competitor comparisons"
          };
          let avoidItems = [];
          const avoidList = bv.avoidList || "";
          if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
            const parts = avoidList.split("|");
            for (const part of parts) {
              if (part.startsWith("PRESETS:")) {
                const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
                avoidItems.push(...presetIds.map((id) => AVOID_LABELS[id] || id));
              } else if (part.startsWith("CUSTOM:")) {
                const custom = part.replace("CUSTOM:", "").trim();
                if (custom) avoidItems.push(...custom.split(",").map((s) => s.trim()).filter(Boolean));
              }
            }
          } else if (avoidList) {
            avoidItems = avoidList.split(",").map((s) => s.trim()).filter(Boolean);
          }
          brandVoiceContext = `
BRAND VOICE:
- Tone: ${bv.toneTraits || "Professional"}
- Perspective: ${perspectiveMap[bv.perspective] || bv.perspective}
- Sentence style: ${styleMap[bv.sentenceStyle] || "Varied"}${avoidItems.length > 0 ? `
- Avoid: ${avoidItems.join(", ")}` : ""}`;
        }
      }
      let icpContext = "";
      if (project?.icpPrimaryName) {
        icpContext = `
TARGET AUDIENCE: ${project.icpPrimaryName}${project.icpWhoTheyAre ? ` \u2014 ${project.icpWhoTheyAre}` : ""}`;
      }
      let outlineContext = "";
      if (article.outlineId) {
        const outline = await getOutlineById(article.outlineId);
        if (outline?.sections) {
          const outlineSection = outline.sections.find(
            (s) => s.heading.toLowerCase().trim() === input.sectionHeading.toLowerCase().trim()
          );
          if (outlineSection) {
            outlineContext = `
ORIGINAL OUTLINE FOR THIS SECTION:
Heading: ${outlineSection.heading}`;
            if (outlineSection.points?.length) {
              outlineContext += `
Key points to cover:
${outlineSection.points.map((p) => `- ${p}`).join("\n")}`;
            }
            if (outlineSection.aiInstructions) {
              outlineContext += `
AI Instructions: ${outlineSection.aiInstructions}`;
            }
            if (outlineSection.subSections?.length) {
              outlineContext += `
Sub-sections:`;
              for (const sub of outlineSection.subSections) {
                outlineContext += `
  ### ${sub.heading}`;
                if (sub.points?.length) {
                  outlineContext += `
${sub.points.map((p) => `  - ${p}`).join("\n")}`;
                }
                if (sub.aiInstructions) {
                  outlineContext += `
  AI Instructions: ${sub.aiInstructions}`;
                }
              }
            }
          }
        }
      }
      let bannedPhrasesContext = "";
      if (project?.bannedPhrases?.length) {
        bannedPhrasesContext = `

BANNED PHRASES (NEVER use these):
${project.bannedPhrases.filter((p) => p.trim()).map((p) => `- "${p}"`).join("\n")}`;
      }
      const oldWordCount = oldSectionContent.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
      let lengthGuidance = `Target approximately ${oldWordCount} words (same as the current section).`;
      if (input.lengthPreference === "shorter") {
        lengthGuidance = `Target approximately ${Math.round(oldWordCount * 0.65)} words (shorter than the current ${oldWordCount} words).`;
      } else if (input.lengthPreference === "longer") {
        lengthGuidance = `Target approximately ${Math.round(oldWordCount * 1.5)} words (longer than the current ${oldWordCount} words).`;
      }
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const currentMonth = (/* @__PURE__ */ new Date()).toLocaleString("en-US", { month: "long" });
      const systemPrompt = `You are an expert SEO content writer. You are regenerating a SINGLE SECTION of an existing article. Your job is to write a better version of this section that fits seamlessly into the surrounding content.

CURRENT DATE: ${currentMonth} ${currentYear}. Treat ${currentYear} as the current year.

ARTICLE CONTEXT:
- Title: "${article.title}"
- Keyword: "${article.keyword || article.title}"
${brandVoiceContext}
${icpContext}
${outlineContext}
${bannedPhrasesContext}

SECTION TO REGENERATE: "${input.sectionHeading}"
${lengthGuidance}
${input.toneOverride ? `TONE OVERRIDE: Write this section in a ${input.toneOverride} tone.` : ""}
${input.instructions ? `SPECIFIC INSTRUCTIONS: ${input.instructions}` : ""}

${prevSectionSnippet ? `PREVIOUS SECTION ENDS WITH (for transition continuity):
"...${prevSectionSnippet}"` : "This is the first section of the article."}

${nextSectionSnippet ? `NEXT SECTION STARTS WITH (for transition continuity):
"${nextSectionSnippet}..."` : "This is the last section of the article."}

RULES:
- Use proper HTML formatting: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <th>, <td> tags
- Start with the <h2> heading for this section
- The content must flow naturally from the previous section and into the next
- Match the writing style, tone, and quality of the rest of the article
- Include relevant statistics, examples, and details
- Do NOT include content from other sections \u2014 only write this one section
- ANCHOR TEXT LENGTH: All links must use 2-7 word anchor text, never full sentences
- URL INTEGRITY RULE (CRITICAL): When writing any <a href="..."> tag, the ENTIRE href value MUST be on a single line with NO line breaks, spaces, or newlines inside the URL. Never split a URL across lines or insert spaces between URL characters.
- NEVER use em dashes (\u2014). Use commas, semicolons, or periods instead.
- Return ONLY the HTML for this section (from <h2> to the end of the section content, before the next <h2>)`;
      const userPrompt = `Here is the CURRENT version of this section that needs to be regenerated:

${oldSectionContent}

Write a better version of this section.`;
      console.log(`[RegenSection] Calling LLM for section "${input.sectionHeading}" (${oldWordCount} words)`);
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }, projectId);
      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) throw new Error("No response from AI");
      const rawSectionContent = stripMarkdownFences2(typeof rawContent === "string" ? rawContent : rawContent[0]?.text ?? "");
      let newSectionContent = wrapBareTextInPTags(fixBrokenAnchors(rawSectionContent));
      newSectionContent = splitLongParagraphs(newSectionContent, maxSentences, "html");
      if (article.outlineId) {
        const outline = await getOutlineById(article.outlineId);
        if (outline?.sections) {
          const outlineSection = outline.sections.find(
            (s) => s.heading.toLowerCase().trim() === input.sectionHeading.toLowerCase().trim()
          );
          if (outlineSection) {
            if (outlineSection.backgroundColor && !outlineSection.templateType) {
              newSectionContent = applyBackgroundColors(newSectionContent, [outlineSection]);
            }
            if (outlineSection.templateType) {
              newSectionContent = applyTemplateStyles(newSectionContent, [outlineSection]);
            }
          }
        }
      }
      if (project?.bannedPhrases?.length) {
        for (const phrase of project.bannedPhrases) {
          if (phrase.trim()) {
            const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escapedPhrase, "gi");
            newSectionContent = newSectionContent.replace(regex, "");
          }
        }
        newSectionContent = newSectionContent.replace(/<p>\s*<\/p>/g, "").replace(/\s{3,}/g, " ").trim();
      }
      newSectionContent = stripEmDashes(newSectionContent);
      newSectionContent = stripTargetBlank(newSectionContent);
      const updatedContent = content.slice(0, sectionStart) + newSectionContent + "\n" + content.slice(sectionEnd);
      const newWordCount = updatedContent.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
      await updateArticle(input.articleId, {
        content: updatedContent,
        wordCount: newWordCount
      });
      console.log(`[RegenSection] Done. Section "${input.sectionHeading}" regenerated. Old words: ${oldWordCount}, New article words: ${newWordCount}`);
      return {
        success: true,
        oldContent: oldSectionContent,
        newContent: newSectionContent,
        updatedArticleContent: updatedContent,
        wordCount: newWordCount,
        sectionHeading: input.sectionHeading
      };
    }),
    /** AI-powered article generation from outline */
    generate: publicProcedure.input(z2.object({
      outlineId: z2.number(),
      projectId: z2.number(),
      additionalInstructions: z2.string().optional(),
      targetLocation: z2.string().optional(),
      targetAudience: z2.string().optional(),
      outputFormat: z2.enum(["html", "plaintext"]).optional(),
      manualLinks: z2.array(z2.object({ url: z2.string(), anchorText: z2.string() })).optional(),
      sitemapUrls: z2.array(z2.string()).optional(),
      autoLinkCount: z2.number().optional(),
      brandVoiceId: z2.number().optional(),
      icpProfileId: z2.number().optional(),
      secondaryKeywords: z2.array(z2.string()).optional(),
      autoGradeEnabled: z2.boolean().optional(),
      targetGrade: z2.string().optional(),
      maxGradeIterations: z2.number().min(1).max(5).optional(),
      useReferenceDoc: z2.boolean().optional()
    })).mutation(async ({ ctx, input }) => {
      console.log(`[ArticleGen] Starting article generation. outlineId=${input.outlineId}, projectId=${input.projectId}, outputFormat=${input.outputFormat}, useReferenceDoc=${input.useReferenceDoc}`);
      const outline = await getOutlineById(input.outlineId);
      if (!outline) throw new Error("Outline not found");
      const project = await getProjectById(input.projectId);
      const allVoices = await getBrandVoicesByProject(input.projectId);
      const brandVoice = input.brandVoiceId ? allVoices.find((v) => v.id === input.brandVoiceId) ?? allVoices[0] ?? null : allVoices.find((v) => v.isDefault === 1) ?? allVoices[0] ?? null;
      let icpSection = "";
      const formatListArt = (items, prefix) => {
        if (!items?.length) return "";
        return `${prefix}:
${items.map((item, i) => `${i + 1}. ${item}`).join("\n")}`;
      };
      let icpName = "";
      let icpDescription = "";
      let icpPains = [];
      let icpGoals = [];
      let icpObjections = [];
      let icpTriggers = [];
      let icpTrust = [];
      let icpDemoLines = "";
      let icpSearchBehavior = "";
      let icpContentPrefs = [];
      if (input.icpProfileId) {
        const icpProfile = await getICPById(input.icpProfileId);
        if (icpProfile) {
          icpName = icpProfile.name;
          icpDescription = icpProfile.description || "";
          icpPains = icpProfile.painPoints || [];
          icpGoals = icpProfile.goals || [];
          icpObjections = icpProfile.objections || [];
          icpSearchBehavior = icpProfile.searchBehavior || "";
          icpContentPrefs = icpProfile.contentPreferences || [];
          const demographics = icpProfile.demographics;
          if (demographics) {
            icpDemoLines = [
              demographics.ageRange ? `Age Range: ${demographics.ageRange}` : "",
              demographics.location ? `Location: ${demographics.location}` : "",
              demographics.income ? `Income: ${demographics.income}` : "",
              demographics.education ? `Education: ${demographics.education}` : "",
              demographics.occupation ? `Occupation: ${demographics.occupation}` : "",
              demographics.other ? `Other: ${demographics.other}` : ""
            ].filter(Boolean).join("\n");
          }
        }
      } else if (project?.icpPrimaryName) {
        icpName = project.icpPrimaryName;
        icpDescription = project.icpWhoTheyAre || "";
        icpPains = project.icpPains || [];
        icpGoals = project.icpGoals || [];
        icpObjections = project.icpObjections || [];
        icpTriggers = project.icpDecisionTriggers || [];
        icpTrust = project.icpTrustSignals || [];
      }
      if (icpName) {
        const painsSection = formatListArt(icpPains, "PAIN POINTS (emphasize these problems)");
        const goalsSection = formatListArt(icpGoals, "GOALS (what they want to achieve)");
        const objectionsSection = formatListArt(icpObjections, "COMMON OBJECTIONS (address these concerns)");
        const triggersSection = formatListArt(icpTriggers, "DECISION TRIGGERS (what prompts action)");
        const trustSection = formatListArt(icpTrust, "TRUST SIGNALS (what builds confidence)");
        const contentPrefsSection = formatListArt(icpContentPrefs, "CONTENT PREFERENCES");
        icpSection = `
IDEAL CUSTOMER PROFILE (ICP) - CONTENT TARGETING LAYER
======================================================
ICP works alongside Brand Voice: Brand Voice controls HOW content sounds (tone, personality, style).
ICP controls WHO content is written for (pain points, framing, vocabulary, examples).
If any guidance overlaps, Brand Voice takes priority for tone/style.

TARGET AUDIENCE:
- ICP Name: ${icpName}
${icpDescription ? `- Who They Are: ${icpDescription}` : ""}
${icpDemoLines ? `
DEMOGRAPHICS:
${icpDemoLines}` : ""}
${icpSearchBehavior ? `
SEARCH BEHAVIOR: ${icpSearchBehavior}` : ""}

${painsSection}

${goalsSection}

${objectionsSection}

${triggersSection}

${trustSection}

${contentPrefsSection}

=== ICP ENFORCEMENT RULES (MUST FOLLOW) ===

**FIT CHECK (do this first):**
Before writing, verify the topic "${outline.keyword ?? outline.title}" aligns with the ICP "${icpName}".
If the topic doesn't directly serve this audience, adjust the angle to match their needs.

**RULE 1 - INTRO:** The article introduction must resonate with the ICP audience, but VARY the opening approach each time. Do NOT start with "If you are [ICP description]" or any formulaic audience-addressing pattern. Instead, rotate among these opening strategies:
  - Lead with a surprising statistic or fact
  - Open with a specific scenario or mini-story
  - Start with a bold claim or common misconception
  - Begin with a question that reflects a real pain point
  - Open with a recent change, news, or trend relevant to the topic
  The ICP context should emerge naturally within the first few paragraphs, not be stated as a direct address in sentence one.

**RULE 2 - HEADINGS:** At least 30% of H2/H3 headings must reflect ICP pain points or intent language.

**RULE 3 - FAQs:** At least 60% of FAQ questions must be derived from the ICP's objections and decision triggers listed above.

**RULE 4 - EXAMPLES:** Include at least 2 examples or scenarios that are consistent with "${icpDescription || icpName}".

**RULE 5 - TRUST:** Naturally incorporate at least 2 trust signals from the list above into the content.

**RULE 6 - COMPLIANCE:** Avoid guarantees, exaggerated claims, or fear-based messaging.

IMPORTANT: Do NOT add any ICP metadata, snapshots, or debugging information to the article. The ICP guidance should influence the content naturally without any visible markers.
`;
      }
      let brandVoiceSection = "";
      if (brandVoice) {
        let primaryTones = [];
        let supportingTones = [];
        const toneTraits = brandVoice.toneTraits || "";
        if (toneTraits.includes("PRIMARY:") || toneTraits.includes("SUPPORTING:")) {
          const parts = toneTraits.split("|");
          for (const part of parts) {
            if (part.startsWith("PRIMARY:")) {
              primaryTones = part.replace("PRIMARY:", "").split(",").filter(Boolean);
            } else if (part.startsWith("SUPPORTING:")) {
              supportingTones = part.replace("SUPPORTING:", "").split(",").filter(Boolean);
            }
          }
        } else {
          primaryTones = toneTraits.split(",").map((s) => s.trim()).filter(Boolean);
        }
        const AVOID_LABELS = {
          jargon: "Overly technical jargon",
          salesy: "Sales-heavy language",
          fear: "Fear-based messaging",
          exaggerated: "Exaggerated claims",
          cliches: "Industry clich\xE9s",
          passive: "Passive voice",
          buzzwords: "Buzzwords",
          rhetorical: "Rhetorical questions",
          unverified: "Unverified statistics",
          competitor: "Competitor comparisons"
        };
        let avoidItems = [];
        const avoidList = brandVoice.avoidList || "";
        if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
          const parts = avoidList.split("|");
          for (const part of parts) {
            if (part.startsWith("PRESETS:")) {
              const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
              avoidItems.push(...presetIds.map((id) => AVOID_LABELS[id] || id));
            } else if (part.startsWith("CUSTOM:")) {
              const custom = part.replace("CUSTOM:", "").trim();
              if (custom) avoidItems.push(...custom.split(",").map((s) => s.trim()).filter(Boolean));
            }
          }
        } else if (avoidList) {
          avoidItems = avoidList.split(",").map((s) => s.trim()).filter(Boolean);
        }
        const SENTENCE_STYLES = {
          short: {
            label: "Short and Direct",
            rules: `- Keep most sentences under 12 words. Aim for punchy, direct phrasing.
- Paragraphs MUST be 1-3 sentences maximum. Break up any paragraph longer than 3 sentences.
- Eliminate filler words, qualifiers, and unnecessary clauses.
- Prefer simple sentence structures. Avoid compound-complex sentences.
- Each paragraph should make ONE clear point, then move on.`
          },
          mixed: {
            label: "Mixed (Varied and Natural Rhythm)",
            rules: `- Vary sentence length: short for emphasis, medium for clarity, longer for explanation.
- Paragraphs MUST be 2-5 sentences maximum. NEVER write a paragraph longer than 5 sentences.
- If a paragraph exceeds 5 sentences, split it into two separate paragraphs.
- Create natural rhythm by alternating short and medium sentences.
- Each paragraph should cover one idea or sub-point before starting a new paragraph.`
          },
          detailed: {
            label: "Detailed and Explanatory",
            rules: `- Use longer sentences with expanded context and thorough explanations where needed.
- Paragraphs can be 3-6 sentences, but NEVER exceed 6 sentences per paragraph.
- Include transitional phrases to connect ideas smoothly.
- Balance detail with readability \u2014 break up dense sections with shorter transitional paragraphs.`
          }
        };
        const sentenceStyle = SENTENCE_STYLES[brandVoice.sentenceStyle || "mixed"] || SENTENCE_STYLES.mixed;
        brandVoiceSection = `BRAND VOICE GUIDELINES (FOLLOW THESE CAREFULLY):
Voice Name: ${brandVoice.name}

PRIMARY TONE (emphasize these most): ${primaryTones.length > 0 ? primaryTones.join(", ") : "Professional"}
${supportingTones.length > 0 ? `SUPPORTING TONE (subtle undertones): ${supportingTones.join(", ")}` : ""}

PERSPECTIVE: ${brandVoice.perspective === "first" ? "First person (use 'we', 'our', 'us')" : brandVoice.perspective === "second" ? "Second person (address reader as 'you', 'your')" : "Third person (neutral/objective perspective)"}

SENTENCE STYLE: ${sentenceStyle.label}

=== PARAGRAPH & SENTENCE STRUCTURE RULES (MANDATORY \u2014 DO NOT IGNORE) ===
${sentenceStyle.rules}

CRITICAL: These paragraph length rules are NON-NEGOTIABLE. After writing each section, review it and break up any paragraph that violates the sentence count limit above. Wall-of-text paragraphs are the #1 quality failure.
=== END STRUCTURE RULES ===

${avoidItems.length > 0 ? `THINGS TO STRICTLY AVOID (these are hard constraints):
${avoidItems.map((item) => `- DO NOT use ${item}`).join("\n")}
` : ""}
${brandVoice.writingStyleSample ? `
Writing Style Example (learn the STYLE, not the content):
"""
${brandVoice.writingStyleSample}
"""
CRITICAL - DO NOT COPY from the example above:
- Do NOT reuse any specific phrases, sentences, statistics, or openings from this sample
- Do NOT start your article with the same hook or premise as this sample
- Do NOT repeat any statistics, numbers, or data points from this sample \u2014 find different ones
- The sample demonstrates TONE and STYLE patterns only \u2014 extract the rhythm, word choice tendencies, and structural approach
- Create a FRESH opening and unique phrasing relevant to your assigned topic` : ""}

IMPORTANT: Apply these brand voice guidelines throughout the ENTIRE article. The tone, word choice, perspective, and sentence structure must be consistent from start to finish.`;
      }
      const ctaTemplates_list = await getCTAsByProject(input.projectId);
      let ctaContext = "";
      if (ctaTemplates_list.length > 0) {
        const defaultCTA = ctaTemplates_list.find((c) => c.isDefault === 1) ?? ctaTemplates_list[0];
        ctaContext = `

CALL TO ACTION:
Insert the following CTA naturally in the article (placement: ${defaultCTA.placement}):
"${defaultCTA.content}"
${defaultCTA.buttonText ? `Button text: "${defaultCTA.buttonText}"` : ""}
${defaultCTA.url ? `Link URL: ${defaultCTA.url}` : ""}`;
      }
      await updateOutline(input.outlineId, { status: "generating" });
      const outlineText = outline.sections.map((section) => {
        let text2 = `## ${section.heading}
`;
        if (section.targetWordCount) {
          text2 += `[TARGET: ~${section.targetWordCount} words for this section]
`;
        }
        if (section.points) {
          text2 += section.points.map((p) => `- ${p}`).join("\n") + "\n";
        }
        if (section.aiInstructions?.trim()) {
          text2 += `[AI INSTRUCTIONS FOR THIS SECTION: ${section.aiInstructions.trim()}]
`;
        }
        if (section.templateType) {
          if (section.templateType === "coverage-card") {
            text2 += `[TEMPLATE TYPE: coverage-card] \u2014 You MUST output the <h2> heading for this section as normal (e.g., <h2>${section.heading}</h2>). Then write a 1-2 sentence summary paragraph. Then write <h3>What It Covers</h3> followed by a <ul> list of 3-6 covered items. Then write <h3>What It Doesn't Cover</h3> followed by a <ul> list of 3-6 excluded items. End with a <p> starting with "Cost:" summarizing pricing. Do NOT add any special formatting, icons, borders, or wrapper divs \u2014 the styled card is added automatically in post-processing.
`;
          } else {
            text2 += `[TEMPLATE TYPE: ${section.templateType}] \u2014 You MUST output the <h2> heading for this section as normal (e.g., <h2>${section.heading}</h2>), then write ONLY clean body content (1-3 concise paragraphs). Do NOT add any special formatting, icons, borders, or wrapper divs. The styled container will be added automatically in post-processing.
`;
          }
        }
        if (section.backgroundColor && !section.templateType) {
          text2 += `[BACKGROUND COLOR: Wrap this entire section (heading + content) in a <div> with style="background-color: ${section.backgroundColor}; border-radius: 12px; padding: 24px 28px; margin: 16px 0;"]
`;
        }
        if (section.subSections) {
          for (const sub of section.subSections) {
            text2 += `### ${sub.heading}
`;
            if (sub.points) {
              text2 += sub.points.map((p) => `- ${p}`).join("\n") + "\n";
            }
            if (sub.aiInstructions?.trim()) {
              text2 += `[AI INSTRUCTIONS FOR THIS SUB-SECTION: ${sub.aiInstructions.trim()}]
`;
            }
            if (sub.templateType) {
              text2 += `[TEMPLATE TYPE: ${sub.templateType}] \u2014 You MUST output the <h3> heading for this sub-section as normal (e.g., <h3>${sub.heading}</h3>), then write ONLY clean body content (1-3 concise paragraphs). Do NOT add any special formatting, icons, borders, or wrapper divs. The styled container will be added automatically in post-processing.
`;
            }
            if (sub.backgroundColor && !sub.templateType) {
              text2 += `[BACKGROUND COLOR: Wrap this entire sub-section (heading + content) in a <div> with style="background-color: ${sub.backgroundColor}; border-radius: 12px; padding: 24px 28px; margin: 16px 0;"]
`;
            }
          }
        }
        return text2;
      }).join("\n");
      const settings = outline.settings;
      const effectiveLocation = input.targetLocation || settings?.targetLocation || "";
      const effectiveAudience = input.targetAudience || settings?.targetAudience || "";
      const effectiveFormat = input.outputFormat || settings?.outputFormat || "html";
      const effectiveManualLinks = input.manualLinks || settings?.manualLinks || [];
      const effectiveSitemapUrls = input.sitemapUrls || settings?.sitemapUrls || (settings?.sitemapUrl ? [settings.sitemapUrl] : []);
      const effectiveAutoLinkCount = input.autoLinkCount ?? settings?.autoLinkCount ?? 5;
      const effectiveSecondaryKeywords = input.secondaryKeywords || settings?.secondaryKeywords || [];
      let secondaryKeywordsInstructions = "";
      if (effectiveSecondaryKeywords.length > 0) {
        secondaryKeywordsInstructions = `

SECONDARY KEYWORDS & LSI TERMS (MUST naturally incorporate):
The following keywords and terms should be woven naturally throughout the article to improve topical coverage and semantic relevance. Do NOT force them \u2014 use them where they fit contextually. Aim to include each term at least once, but prioritize natural readability over keyword stuffing:
${effectiveSecondaryKeywords.map((k) => `- "${k}"`).join("\n")}
These terms help search engines understand the article's topical depth and authority. Distribute them across different sections rather than clustering them in one place.`;
      }
      let linkingInstructions = "";
      if (effectiveManualLinks.length > 0) {
        linkingInstructions += `

MANUAL INTERNAL LINKS (MUST include all of these):
${effectiveManualLinks.map((l, i) => `${i + 1}. Link to "${l.url}"${l.anchorText ? ` using anchor text "${l.anchorText}"` : " with contextually appropriate anchor text"}`).join("\n")}
Weave these links naturally into the article body. Use <a href="URL">anchor text</a> format. IMPORTANT: Anchor text must be 2-7 words \u2014 a short key phrase, NOT a full sentence.`;
      }
      if (effectiveSitemapUrls.length > 0) {
        const projectSitemaps = await getSitemapsByProject(input.projectId);
        const resolvedPageUrls = [];
        for (const sitemapXmlUrl of effectiveSitemapUrls) {
          const matchingSitemap = projectSitemaps.find((s) => s.url === sitemapXmlUrl);
          if (matchingSitemap && matchingSitemap.parsedUrls && Array.isArray(matchingSitemap.parsedUrls)) {
            for (const entry of matchingSitemap.parsedUrls) {
              if (typeof entry === "string") {
                resolvedPageUrls.push(entry);
              } else if (entry && typeof entry === "object" && "url" in entry) {
                const title = entry.title;
                resolvedPageUrls.push(title ? `${entry.url} (${title})` : entry.url);
              }
            }
          }
        }
        if (resolvedPageUrls.length > 0) {
          const minInternal = project?.minInternalLinks ?? 3;
          const effectiveInternalCount = Math.min(effectiveAutoLinkCount, resolvedPageUrls.length);
          const guaranteedInternal = Math.min(minInternal, resolvedPageUrls.length);
          linkingInstructions += `

AUTOMATIC INTERNAL LINKING (MANDATORY):
You MUST insert a MINIMUM of ${guaranteedInternal} internal link${guaranteedInternal !== 1 ? "s" : ""} from the SITE PAGES list below. Internal links are REQUIRED \u2014 they take priority over external citation links when both options exist for the same claim.

Target total internal links: ${effectiveInternalCount} (minimum guaranteed: ${guaranteedInternal}).
Choose URLs that are contextually relevant to the article topic. Use <a href="URL">anchor text</a> format.
IMPORTANT: Anchor text must be 2-7 words \u2014 a short key phrase, NOT a full sentence.
CRITICAL: Only use exact URLs from the list below. NEVER fabricate or invent URLs.

SITE PAGES (internal links MUST come from this list ONLY):
${resolvedPageUrls.map((u) => `  - ${u}`).join("\n")}`;
        } else {
          console.warn(`[Article Generate] No parsed URLs found for sitemaps: ${effectiveSitemapUrls.join(", ")}. Skipping auto-linking.`);
        }
      }
      let citationSourcesSection = "";
      if (project) {
        const projectCitations = await getCitationsByProject(project.id);
        if (projectCitations.length > 0) {
          const sourcesList = projectCitations.map((c, i) => {
            let entry = `  ${i + 1}. ${c.name} \u2014 ${c.url}`;
            if (c.description) entry += ` (${c.description})`;
            return entry;
          }).join("\n");
          citationSourcesSection = `
EXTERNAL CITATION SOURCES (MANDATORY \u2014 you MUST use these):
The following are verified, approved external sources. You MUST insert at least ${Math.min(3, projectCitations.length)} external citation links from this list into the article. These are in ADDITION to any internal links.

${sourcesList}

CITATION INSERTION RULES (MANDATORY):
1. URL USAGE: You MUST use ONLY the exact URLs listed above for external citations. Do NOT invent, fabricate, or construct URLs. Do NOT append path segments or guess at page paths. Use the URL exactly as listed.
2. ANCHOR TEXT: Must be 2-7 words maximum. NEVER wrap an entire sentence or clause as anchor text. The anchor text should be ONLY the specific factual claim or key phrase being cited.
   - BAD: "<a href="...">54% of all Medicare beneficiaries are now enrolled in a Medicare Advantage Plan</a>" (too long)
   - BAD: "Learn more at <a href="...">Medicare.gov</a>" (generic)
   - GOOD: "<a href="...">54% of beneficiaries</a> are now enrolled"
   - GOOD: "the deductible is <a href="...">$257 in 2026</a>"
3. Place the <a> tag inline within the sentence, wrapping ONLY the key factual phrase (2-7 words).
4. Distribute citations across different sections of the article \u2014 do NOT cluster them all in one section.
5. Each citation should support a specific factual claim that the source verifies.`;
          console.log(`[ArticleGen] Injecting ${projectCitations.length} citation sources into prompt`);
        }
      }
      let referenceDocSection = "";
      if (input.useReferenceDoc && project) {
        let refDocContent = project.referenceDocContent || null;
        if (!refDocContent && project.referenceDocS3Key) {
          refDocContent = await fetchReferenceDocFromS3(project.referenceDocS3Key);
        }
        if (refDocContent && project.referenceDocName) {
          const maxChars = 8e4;
          const truncated = refDocContent.length > maxChars ? refDocContent.substring(0, maxChars) + "\n[... document truncated for length ...]" : refDocContent;
          referenceDocSection = `
REFERENCE DOCUMENT \u2014 FACTUAL SOURCE ("${project.referenceDocName}")
================================================================
The following reference document contains verified facts, figures, rules, and details about the topic.
You MUST use this document as your PRIMARY factual source when writing the article.

RULES FOR USING THE REFERENCE DOCUMENT:
1. When the reference document provides specific numbers, dates, eligibility rules, costs, or procedures \u2014 use them EXACTLY as stated. Do NOT invent alternative figures.
2. When the reference document covers a topic that overlaps with a section in the outline, ground that section's content in the reference material.
3. Do NOT copy the reference document verbatim \u2014 synthesize and rewrite the information in your own words while preserving factual accuracy.
4. If the reference document contradicts your training data, ALWAYS defer to the reference document (it is more current and authoritative).
5. You may add supplementary information beyond what the reference document covers, but NEVER contradict it.
6. Do NOT mention or cite "the reference document" in the article text \u2014 the reader should not know it exists. Simply use the facts naturally.

=== REFERENCE DOCUMENT CONTENT ===
${truncated}
=== END REFERENCE DOCUMENT ===
`;
          console.log(`[ArticleGen] Reference doc injected: "${project.referenceDocName}" (${refDocContent.length} chars${refDocContent.length > maxChars ? ", truncated to " + maxChars : ""})`);
        }
      }
      const formatInstructions = effectiveFormat === "plaintext" ? `- Output as PLAIN TEXT with markdown-style headings (## for H2, ### for H3). Do NOT use HTML tags.
- Use plain text formatting: **bold**, bullet points with -, numbered lists with 1. 2. 3.` : `- Use proper HTML formatting: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <th>, <td> tags
- For links use <a href="URL">anchor text</a> format`;
      const currentDate = /* @__PURE__ */ new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.toLocaleString("en-US", { month: "long" });
      const systemPrompt = `You are an expert SEO content writer. Write a comprehensive, well-structured article based on the provided outline.

IMPORTANT \u2014 CURRENT DATE CONTEXT: Today's date is ${currentMonth} ${currentYear}. You MUST treat ${currentYear} as the current year. All references to dates, years, statistics, regulations, and time-sensitive information MUST reflect ${currentYear} as the present year. Do NOT reference 2024 or any prior year as "current" or "this year." If citing statistics or data, prefer the most recent available and clearly label the year of the data.

Guidelines:
- Write in ${settings?.tone ?? "a professional and informative"} tone
- Target approximately ${settings?.targetWordCount ?? 2e3} words total
- PER-SECTION WORD TARGETS: Each section in the outline may include a [TARGET: ~N words] directive. You MUST respect these per-section word counts. Do NOT significantly exceed any section's target \u2014 if a section says ~200 words, write 180-220 words for it, not 400. The per-section targets are designed to keep the total article within the overall word count.
${formatInstructions}
- Include a compelling introduction that hooks the reader
- CRITICAL - INTRO VARIETY: Every article must open differently. NEVER start with "If you are...", "Whether you are...", "As a...", or any direct audience-addressing formula. Rotate opening strategies: surprising facts, bold claims, mini-stories, provocative questions, or recent trends. The reader's context should emerge naturally, not be stated upfront.
- Each section should flow naturally into the next
- Include relevant statistics and examples where appropriate \u2014 but NEVER reuse generic or overused statistics. Each article must cite DIFFERENT data points. Specifically:
  * Do NOT use the phrase "More than 33 million Americans" or any variation of it
  * Do NOT recycle the same statistics across articles \u2014 if a stat feels like a "go-to" default, find a more specific or recent one instead
  * Prefer specific, niche statistics over broad national figures that appear in every article on this topic
  * When citing numbers, vary the framing (percentages vs. absolute numbers vs. comparisons vs. ratios)
- CONTENT UNIQUENESS: Every article must feel distinct. Avoid formulaic phrases, recycled openings, and boilerplate sentences that could appear in any article on this topic. Write as if the reader has already read 10 other articles on this subject \u2014 give them something they haven't seen before.
- End with a strong conclusion and call to action
- Optimize for the target keyword: "${outline.keyword ?? outline.title}"
- Make the content comprehensive, authoritative, and reader-friendly
- Include bullet points and numbered lists where appropriate
- CRITICAL: Follow the PARAGRAPH & SENTENCE STRUCTURE RULES from the Brand Voice section exactly. Do NOT write wall-of-text paragraphs.
- FAQ ANSWER RULES (CRITICAL): When writing FAQ sections, each answer MUST be 2-4 sentences maximum (40-80 words). Lead directly with the answer \u2014 no preamble, no "Short Answer:" prefix, no "Great question" openers. Give one supporting detail if needed, then stop. FAQ answers must be scannable and conversational, NOT essay-length explanations.
- PER-SECTION AI INSTRUCTIONS: Some sections in the outline may include [AI INSTRUCTIONS FOR THIS SECTION: ...] or [AI INSTRUCTIONS FOR THIS SUB-SECTION: ...] directives. You MUST follow these instructions precisely when writing that specific section. These may request specific content formats (tables, charts, bullet lists), specific focus areas, examples, statistics, or other structural requirements. Treat them as mandatory requirements for that section.
- TEMPLATE SECTIONS: Some sections may include a [TEMPLATE TYPE: ...] directive. For ALL template sections, you MUST output the <h2> heading as normal. Do NOT add any special formatting, icons, borders, or wrapper divs \u2014 styled containers are added automatically in post-processing.
  * [TEMPLATE TYPE: pro-tip] or [TEMPLATE TYPE: summary]: Write ONLY clean body content (1-3 concise paragraphs) after the heading.
  * [TEMPLATE TYPE: use-cases]: Write a brief intro paragraph (1-2 sentences), then 3-5 use cases. Each use case MUST be formatted as: <p><strong>Use Case Title</strong></p><p>Description in 1-2 sentences.</p>. Do NOT use bullet points, numbered lists, or <h3> sub-headings for use cases. Each use case must be a separate <strong>-paragraph pair.
  * [TEMPLATE TYPE: coverage-card]: Write a 1-2 sentence summary paragraph first. Then write <h3>What It Covers</h3> followed by a <ul> list of 3-6 covered items (concise phrases, not full sentences). Then write <h3>What It Doesn't Cover</h3> followed by a <ul> list of 3-6 excluded items. End with a <p> that starts with "Cost:" summarizing key pricing info (premiums, deductibles, copays). The styled card with blue header, two-column layout, and cost callout box is added automatically in post-processing.
- BACKGROUND COLOR SECTIONS: Some sections may include a [BACKGROUND COLOR: ...] directive. When present, you MUST wrap the entire section content (including the heading) inside a <div> with the exact inline style specified. The heading should be INSIDE the div. This creates a visually highlighted box for that section. Example: <div style="background-color: #EFF6FF; border-radius: 12px; padding: 24px 28px; margin: 16px 0;"><h2>Key Takeaways</h2><ul><li>Point 1</li><li>Point 2</li></ul></div>
- TABLE FORMAT RULES: When AI instructions request a table or comparison table, you MUST output a proper HTML table using <table>, <thead>, <tbody>, <tr>, <th>, and <td> tags. NEVER use markdown table syntax (pipes |). The table must have a <thead> with <th> header cells and a <tbody> with <td> data cells. Always include at least 3 data rows. Example format:
  <table><thead><tr><th>Feature</th><th>Option A</th><th>Option B</th></tr></thead><tbody><tr><td>Price</td><td>$10</td><td>$20</td></tr></tbody></table>
- ANCHOR TEXT LENGTH RULES (applies to ALL links \u2014 internal and external):
  * Anchor text MUST be 2-7 words. NEVER wrap an entire sentence or clause as a link.
  * BAD (too long): <a href="...">Medigap policies are sold by private insurers to help cover the out-of-pocket costs that Original Medicare leaves behind</a>
  * GOOD (concise): Medigap policies are sold by private insurers to help cover <a href="...">out-of-pocket costs</a> that Original Medicare leaves behind
  * BAD (too long): <a href="...">Breaking the comparison into steps makes it manageable</a>
  * GOOD (concise): Breaking the comparison into <a href="...">manageable steps</a> helps simplify the process
  * The linked phrase should be a natural keyword or key concept, NOT a full sentence
- TOTAL LINK LIMIT: The entire article must contain NO MORE THAN ${effectiveAutoLinkCount + (effectiveManualLinks.length > 0 ? effectiveManualLinks.length : 0) + (citationSourcesSection ? Math.min(3, 5) : 0)} links in total (internal + external combined). Count every <a href> tag. Do NOT exceed this limit.
- CITATION LINK RULES: When inserting any external links or citations:
  * NEVER use generic anchor text like "Learn more at", "Find out more", "Click here", "Visit", or just the source name
  * The anchor text MUST be the actual claim or fact being cited, kept to 2-7 words (e.g., <a href="...">covers outpatient services</a>)
  * NEVER link to a homepage URL \u2014 always use the most specific deep page URL relevant to the claim
- URL INTEGRITY RULE (CRITICAL): When writing any <a href="..."> tag, the ENTIRE href value MUST be on a single line with NO line breaks, spaces, or newlines inside the URL. A URL like "https://www.example.com/path/" must be written exactly as-is \u2014 never split across lines, never insert spaces between characters. Breaking a URL across lines corrupts the link and causes raw text to appear in the article.
${effectiveLocation ? `- Target location: ${effectiveLocation} \u2014 include location-specific information, examples, regulations, or references relevant to this area` : ""}
${effectiveAudience ? `- Target audience: ${effectiveAudience} \u2014 tailor language, examples, and depth to this specific audience` : ""}
${input.additionalInstructions ? `- Additional instructions: ${input.additionalInstructions}` : ""}
${project?.bannedPhrases?.length ? `
=== BANNED PHRASES (ABSOLUTE HARD CONSTRAINT) ===
The following phrases MUST NEVER appear in the generated content under any circumstances. Do not use them, rephrase them, or include close variations:
${project.bannedPhrases.map((p) => `- "${p}"`).join("\n")}
If you find yourself about to write any of these phrases, stop and rephrase using completely different wording.
=== END BANNED PHRASES ===` : ""}

${brandVoiceSection}

${icpSection}
${ctaContext}
${secondaryKeywordsInstructions}
${linkingInstructions}
${citationSourcesSection}
${referenceDocSection}

Return ONLY the ${effectiveFormat === "plaintext" ? "plain text" : "HTML"} content of the article body${effectiveFormat === "html" ? " (no <html>, <head>, or <body> tags)" : ""}. Start with the first ${effectiveFormat === "plaintext" ? "## heading" : "<h2> section"}.`;
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Write the full article based on this outline:

Title: ${outline.title}

${outlineText}` }
        ]
      }, input.projectId);
      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) throw new Error("No response from AI");
      const rawArticleContent = stripMarkdownFences2(typeof rawContent === "string" ? rawContent : rawContent[0]?.text ?? "");
      const maxSentences = brandVoice?.sentenceStyle === "short" ? 3 : brandVoice?.sentenceStyle === "detailed" ? 6 : 5;
      const fixedContent = effectiveFormat === "html" ? fixBrokenAnchors(rawArticleContent) : rawArticleContent;
      const wrappedContent = effectiveFormat === "html" ? wrapBareTextInPTags(fixedContent) : fixedContent;
      const splitContent = splitLongParagraphs(wrappedContent, maxSentences, effectiveFormat);
      const bgColoredContent = effectiveFormat === "html" ? applyBackgroundColors(splitContent, outline.sections) : splitContent;
      let articleContent = effectiveFormat === "html" ? applyTemplateStyles(bgColoredContent, outline.sections) : bgColoredContent;
      if (project?.bannedPhrases?.length) {
        for (const phrase of project.bannedPhrases) {
          if (phrase.trim()) {
            const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escapedPhrase, "gi");
            articleContent = articleContent.replace(regex, "");
          }
        }
        articleContent = articleContent.replace(/<p>\s*<\/p>/g, "").replace(/\s{3,}/g, " ").trim();
      }
      const citationLinkBudget = citationSourcesSection ? Math.min(3, (await getCitationsByProject(project.id)).length) : 0;
      const maxAllowedLinks = effectiveAutoLinkCount + (effectiveManualLinks.length > 0 ? effectiveManualLinks.length : 0) + citationLinkBudget;
      const linkMatches = articleContent.match(/<a\s[^>]*>/gi);
      const actualLinkCount = linkMatches ? linkMatches.length : 0;
      if (actualLinkCount > maxAllowedLinks) {
        console.warn(`[ArticleGen] LLM inserted ${actualLinkCount} links but limit is ${maxAllowedLinks}. Stripping excess links.`);
        let linksKept = 0;
        articleContent = articleContent.replace(/<a\s([^>]*)>([\/\s\S]*?)<\/a>/gi, (match, _attrs, innerText) => {
          if (linksKept < maxAllowedLinks) {
            linksKept++;
            return match;
          }
          return innerText;
        });
        console.log(`[ArticleGen] After enforcement: kept ${linksKept} links.`);
      }
      articleContent = stripEmDashes(articleContent);
      articleContent = stripShortAnswerPrefix(articleContent);
      articleContent = stripTargetBlank(articleContent);
      const wordCount = articleContent.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
      const metaResponse = await callLLM({
        messages: [
          { role: "system", content: "Generate an SEO meta title (max 60 chars) and meta description (max 155 chars) for the given article. Return JSON with 'metaTitle' and 'metaDescription' fields only." },
          { role: "user", content: `Article title: ${outline.title}
Keyword: ${outline.keyword ?? outline.title}
First 500 chars: ${articleContent.substring(0, 500)}` }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "seo_meta",
            strict: true,
            schema: {
              type: "object",
              properties: {
                metaTitle: { type: "string" },
                metaDescription: { type: "string" }
              },
              required: ["metaTitle", "metaDescription"],
              additionalProperties: false
            }
          }
        }
      });
      const rawMetaContent = metaResponse.choices[0]?.message?.content;
      const metaContent = typeof rawMetaContent === "string" ? rawMetaContent : rawMetaContent?.[0]?.text ?? null;
      let metaTitle = outline.title;
      let metaDescription = "";
      if (metaContent) {
        const meta = extractJSON(metaContent);
        if (meta) {
          metaTitle = meta.metaTitle || outline.title;
          metaDescription = meta.metaDescription || "";
        }
      }
      const { generateSlug: makeSlugFn } = await Promise.resolve().then(() => (init_cmsPublish(), cmsPublish_exports));
      const slug = makeSlugFn(outline.keyword || outline.title);
      const article = await createArticle({
        title: outline.title,
        content: articleContent,
        excerpt: articleContent.replace(/<[^>]*>/g, "").substring(0, 200),
        keyword: outline.keyword ?? null,
        keywords: null,
        metaTitle,
        metaDescription,
        slug,
        wordCount,
        status: "draft",
        contentType: settings?.contentType ?? null,
        outlineId: outline.id,
        projectId: input.projectId,
        userId: 1
      });
      await updateOutline(input.outlineId, { status: "complete" });
      if (input.autoGradeEnabled && input.targetGrade && article?.id) {
        const maxIter = input.maxGradeIterations ?? 2;
        console.log(`[ArticleGen] Auto-grade enabled. Target: ${input.targetGrade}, Max iterations: ${maxIter}`);
        try {
          const { finalGrade, iterationsRun } = await runAutoGradeLoop({
            articleId: article.id,
            projectId: input.projectId,
            targetGrade: input.targetGrade,
            maxIterations: maxIter
          });
          console.log(`[ArticleGen] Auto-grade complete. Final grade: ${finalGrade} after ${iterationsRun} iteration(s).`);
          const updatedArticle = await getArticleById(article.id);
          return updatedArticle ?? article;
        } catch (err) {
          console.error("[ArticleGen] Auto-grade loop failed (non-fatal):", err);
        }
      }
      return article;
    }),
    /** AI chat-based article editing — accepts a natural language instruction and applies it to the article content */
    aiEdit: publicProcedure.input(z2.object({
      articleId: z2.number(),
      instruction: z2.string().min(1),
      currentContent: z2.string().min(1),
      selectedText: z2.string().optional()
    })).mutation(async ({ input }) => {
      const article = await getArticleById(input.articleId);
      if (!article) throw new TRPCError3({ code: "NOT_FOUND", message: "Article not found" });
      const isSelectionMode = !!input.selectedText && input.selectedText.trim().length > 0;
      const systemPrompt = isSelectionMode ? `You are an expert content editor. The user has selected a specific portion of text from their article and wants you to edit ONLY that selection based on their instruction.

Rules:
- You will receive the SELECTED TEXT that needs editing
- Apply the instruction ONLY to the selected text
- Return ONLY the edited version of the selected text (not the full article)
- Preserve HTML formatting within the selection unless the instruction asks to change it
- Do NOT add explanations, markdown fences, or commentary
- If the instruction is unclear, make your best interpretation and apply it
- Keep any existing <a href> links intact unless told to remove them` : `You are an expert content editor. The user will give you an article in HTML format and an editing instruction. Apply the instruction precisely to the article content and return the FULL updated HTML content.

Rules:
- Return ONLY the updated HTML content (no explanations, no markdown fences, no commentary)
- Preserve all existing HTML structure, links, formatting, and styles unless the instruction specifically asks to change them
- Make ONLY the changes requested \u2014 do not rewrite or rephrase other parts of the article
- If the instruction is unclear, make your best interpretation and apply it
- Keep all existing <a href> links intact unless told to remove them
- Maintain the same overall length unless the instruction asks to shorten or expand`;
      const userMessage = isSelectionMode ? `Here is the selected text from the article:

${input.selectedText}

---

Instruction: ${input.instruction}` : `Here is the current article content:

${input.currentContent}

---

Instruction: ${input.instruction}`;
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ]
      }, article.projectId);
      const rawResult = response.choices[0]?.message?.content;
      if (!rawResult) throw new Error("No response from AI");
      const editedContent = stripMarkdownFences2(typeof rawResult === "string" ? rawResult : rawResult[0]?.text ?? "");
      if (isSelectionMode) {
        const fullContent = input.currentContent.replace(input.selectedText, editedContent);
        await updateArticle(input.articleId, {
          content: fullContent,
          wordCount: fullContent.split(/\s+/).filter(Boolean).length
        });
        return { content: fullContent, editedSelection: editedContent, mode: "selection" };
      } else {
        await updateArticle(input.articleId, {
          content: editedContent,
          wordCount: editedContent.split(/\s+/).filter(Boolean).length
        });
        return { content: editedContent, mode: "full" };
      }
    })
  }),
  // ---- Broken Link Checker ----
  brokenLinks: router({
    /** Check all links in an article's content for broken URLs */
    check: publicProcedure.input(z2.object({
      articleId: z2.number()
    })).mutation(async ({ input }) => {
      const article = await getArticleById(input.articleId);
      if (!article) throw new TRPCError3({ code: "NOT_FOUND", message: "Article not found" });
      const content = article.content || "";
      if (!content) return { links: [], brokenCount: 0, checkedCount: 0 };
      const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
      const links = [];
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        const url = match[1].trim();
        const anchorText = match[2].replace(/<[^>]*>/g, "").trim();
        if (url.startsWith("http://") || url.startsWith("https://")) {
          links.push({ url, anchorText });
        }
      }
      if (links.length === 0) return { links: [], brokenCount: 0, checkedCount: 0 };
      const uniqueUrls = Array.from(new Set(links.map((l) => l.url)));
      const results = [];
      const checkUrl = async (url) => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 1e4);
          const response = await fetch(url, {
            method: "HEAD",
            signal: controller.signal,
            redirect: "follow",
            headers: {
              "User-Agent": "RankPilot-LinkChecker/1.0"
            }
          });
          clearTimeout(timeout);
          if (response.status === 405) {
            const controller2 = new AbortController();
            const timeout2 = setTimeout(() => controller2.abort(), 1e4);
            const getResponse = await fetch(url, {
              method: "GET",
              signal: controller2.signal,
              redirect: "follow",
              headers: {
                "User-Agent": "RankPilot-LinkChecker/1.0"
              }
            });
            clearTimeout(timeout2);
            await getResponse.text().catch(() => {
            });
            return {
              status: getResponse.status,
              statusText: getResponse.statusText || String(getResponse.status),
              ok: getResponse.ok,
              error: null
            };
          }
          return {
            status: response.status,
            statusText: response.statusText || String(response.status),
            ok: response.ok,
            error: null
          };
        } catch (err) {
          if (err.name === "AbortError") {
            return { status: null, statusText: "Timeout", ok: false, error: "Request timed out after 10 seconds" };
          }
          return { status: null, statusText: "Error", ok: false, error: err.message || "Connection failed" };
        }
      };
      const CONCURRENCY = 5;
      const urlResults = /* @__PURE__ */ new Map();
      for (let i = 0; i < uniqueUrls.length; i += CONCURRENCY) {
        const batch = uniqueUrls.slice(i, i + CONCURRENCY);
        const batchResults = await Promise.all(batch.map((url) => checkUrl(url)));
        batch.forEach((url, idx) => urlResults.set(url, batchResults[idx]));
      }
      for (const link of links) {
        const urlResult = urlResults.get(link.url);
        if (urlResult) {
          results.push({
            url: link.url,
            anchorText: link.anchorText,
            ...urlResult
          });
        }
      }
      const brokenCount = results.filter((r) => !r.ok).length;
      return {
        links: results,
        brokenCount,
        checkedCount: results.length
      };
    }),
    /** Suggest replacement URLs for a broken link using LLM + live verification */
    suggestReplacement: publicProcedure.input(z2.object({
      brokenUrl: z2.string(),
      anchorText: z2.string(),
      articleKeyword: z2.string().optional(),
      surroundingContext: z2.string().optional(),
      projectId: z2.number().optional()
    })).mutation(async ({ input }) => {
      const { brokenUrl, anchorText, articleKeyword, surroundingContext, projectId } = input;
      const systemPrompt = `You are an SEO link research assistant. A broken link has been found in an article and needs to be replaced with a working, authoritative alternative.

Your task: suggest exactly 3 replacement URLs that:
1. Cover the same topic or information as the original broken link
2. Come from authoritative, well-known sources (government sites, major publications, established organizations, Wikipedia, etc.)
3. Are likely to be stable, long-lived URLs (avoid blog posts from small sites, social media links, or PDFs)
4. Are relevant to the anchor text and surrounding context

IMPORTANT: Suggest REAL, specific URLs that you are confident actually exist. Do not make up URLs. Prefer well-known domains like:
- Government: .gov sites (cms.gov, medicare.gov, ssa.gov, cdc.gov, etc.)
- Reference: wikipedia.org, britannica.com
- Major publications: nytimes.com, reuters.com, bbc.com, forbes.com
- Industry authorities: relevant .org sites, established industry publications

Respond with a JSON array of exactly 3 objects, each with:
- "url": the full URL
- "source": the domain/site name (e.g., "Medicare.gov", "Wikipedia")
- "reason": one sentence explaining why this is a good replacement (max 20 words)`;
      const userPrompt = `Broken URL: ${brokenUrl}
Anchor text: "${anchorText}"
${articleKeyword ? `Article keyword: ${articleKeyword}` : ""}
${surroundingContext ? `Surrounding context: ${surroundingContext}` : ""}

Suggest 3 replacement URLs. Respond with ONLY a JSON array, no other text.`;
      try {
        const llmResponse = await callLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        }, projectId);
        const rawContent = String(llmResponse.choices?.[0]?.message?.content || "[]");
        let suggestions = [];
        const parsed = extractJSON(rawContent);
        if (!parsed) {
          console.error("[SuggestReplacement] Failed to parse LLM response:", rawContent);
          return { suggestions: [], error: "Failed to parse LLM response. Please try again." };
        }
        suggestions = Array.isArray(parsed) ? parsed : parsed.suggestions || [];
        if (!Array.isArray(suggestions) || suggestions.length === 0) {
          return { suggestions: [], error: "No suggestions returned" };
        }
        const verified = await Promise.all(
          suggestions.map(async (s) => {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 8e3);
              const response = await fetch(s.url, {
                method: "HEAD",
                signal: controller.signal,
                redirect: "follow",
                headers: { "User-Agent": "RankPilot-LinkChecker/1.0" }
              });
              clearTimeout(timeout);
              if (response.status === 405) {
                const controller2 = new AbortController();
                const timeout2 = setTimeout(() => controller2.abort(), 8e3);
                const getResp = await fetch(s.url, {
                  method: "GET",
                  signal: controller2.signal,
                  redirect: "follow",
                  headers: { "User-Agent": "RankPilot-LinkChecker/1.0" }
                });
                clearTimeout(timeout2);
                await getResp.text().catch(() => {
                });
                return { ...s, verified: getResp.ok, status: getResp.status };
              }
              return { ...s, verified: response.ok, status: response.status };
            } catch {
              return { ...s, verified: false, status: null };
            }
          })
        );
        return {
          suggestions: verified,
          error: null
        };
      } catch (err) {
        return { suggestions: [], error: err.message || "LLM call failed" };
      }
    })
  }),
  // ---- Links Audit ----
  linksAudit: router({
    /** Analyze all links in an article — classify as internal vs external */
    analyze: publicProcedure.input(z2.object({
      articleId: z2.number()
    })).query(async ({ input }) => {
      const article = await getArticleById(input.articleId);
      if (!article) throw new TRPCError3({ code: "NOT_FOUND", message: "Article not found" });
      const content = article.content || "";
      if (!content) return { internalLinks: [], externalLinks: [], internalCount: 0, externalCount: 0, totalCount: 0 };
      const projectId = article.projectId;
      let sitemapDomains = [];
      let sitemapUrlSet = /* @__PURE__ */ new Set();
      if (projectId) {
        const projectSitemaps = await getSitemapsByProject(projectId);
        for (const sm of projectSitemaps) {
          const urls = sm.parsedUrls || [];
          for (const u of urls) {
            sitemapUrlSet.add(u.url.toLowerCase());
            try {
              const domain = new URL(u.url).hostname.replace(/^www\./, "");
              if (!sitemapDomains.includes(domain)) sitemapDomains.push(domain);
            } catch {
            }
          }
        }
      }
      const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
      const internalLinks = [];
      const externalLinks = [];
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        const url = match[1].trim();
        const anchorText = match[2].replace(/<[^>]*>/g, "").trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) continue;
        let linkDomain = "";
        try {
          linkDomain = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          continue;
        }
        const isInternal = sitemapDomains.some((d) => linkDomain === d || linkDomain.endsWith("." + d));
        if (isInternal) {
          internalLinks.push({
            url,
            anchorText,
            matchesSitemap: sitemapUrlSet.has(url.toLowerCase())
          });
        } else {
          externalLinks.push({ url, anchorText, domain: linkDomain });
        }
      }
      return {
        internalLinks,
        externalLinks,
        internalCount: internalLinks.length,
        externalCount: externalLinks.length,
        totalCount: internalLinks.length + externalLinks.length
      };
    }),
    /** Suggest internal links from sitemap that are not yet in the article */
    suggest: publicProcedure.input(z2.object({
      articleId: z2.number()
    })).mutation(async ({ input }) => {
      const article = await getArticleById(input.articleId);
      if (!article) throw new TRPCError3({ code: "NOT_FOUND", message: "Article not found" });
      const content = article.content || "";
      const projectId = article.projectId;
      if (!projectId) return { suggestions: [] };
      const projectSitemaps = await getSitemapsByProject(projectId);
      const allSitemapUrls = [];
      for (const sm of projectSitemaps) {
        const urls = sm.parsedUrls || [];
        allSitemapUrls.push(...urls);
      }
      if (allSitemapUrls.length === 0) return { suggestions: [] };
      const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
      const linkedUrls = /* @__PURE__ */ new Set();
      let m;
      while ((m = linkRegex.exec(content)) !== null) {
        linkedUrls.add(m[1].trim().toLowerCase());
      }
      const unlinkedUrls = allSitemapUrls.filter((u) => !linkedUrls.has(u.url.toLowerCase()));
      if (unlinkedUrls.length === 0) return { suggestions: [] };
      const articleText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6e3);
      const urlList = unlinkedUrls.slice(0, 50).map((u) => `- ${u.url}${u.title ? ` (${u.title})` : ""}`).join("\n");
      const llmResponse = await invokeLLM({
        messages: [
          {
            role: "system",
            content: `You are an internal linking specialist. Given an article and a list of unlinked internal pages, find phrases in the article that should link to those pages.

Rules:
- Only suggest links where the phrase is naturally relevant to the target page
- Choose anchor text that is 2-7 words, a descriptive key phrase
- Maximum 8 suggestions
- Each suggestion must use a different target URL
- The phrase must actually exist in the article text

Return JSON array:
[{"phrase": "exact phrase from article", "targetUrl": "URL from the list", "reason": "brief explanation"}]`
          },
          {
            role: "user",
            content: `ARTICLE TEXT:
${articleText}

AVAILABLE INTERNAL PAGES (not yet linked):
${urlList}`
          }
        ]
      });
      const llmContent = llmResponse?.choices?.[0]?.message?.content || "";
      const suggestions = extractJSON(llmContent) || [];
      const validSuggestions = (Array.isArray(suggestions) ? suggestions : []).filter((s) => {
        if (!s.phrase || !s.targetUrl) return false;
        const phraseExists = articleText.toLowerCase().includes(s.phrase.toLowerCase());
        const urlValid = unlinkedUrls.some((u) => u.url.toLowerCase() === s.targetUrl.toLowerCase());
        return phraseExists && urlValid;
      }).slice(0, 8);
      return { suggestions: validSuggestions };
    }),
    /** Insert an internal link into article HTML at the first occurrence of a phrase */
    insertLink: publicProcedure.input(z2.object({
      articleId: z2.number(),
      phrase: z2.string(),
      targetUrl: z2.string()
    })).mutation(async ({ input }) => {
      const article = await getArticleById(input.articleId);
      if (!article) throw new TRPCError3({ code: "NOT_FOUND", message: "Article not found" });
      let content = article.content || "";
      if (!content) throw new TRPCError3({ code: "BAD_REQUEST", message: "Article has no content" });
      const escapedPhrase = input.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const phraseRegex = new RegExp(
        `(?<!<a[^>]*>(?:[^<]*))\\b(${escapedPhrase})\\b`,
        "i"
      );
      const parts = content.split(/(<a\s[^>]*>.*?<\/a>)/gi);
      let replaced = false;
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].match(/^<a\s/i)) continue;
        const regex = new RegExp(`(${escapedPhrase})`, "i");
        if (regex.test(parts[i])) {
          parts[i] = parts[i].replace(regex, `<a href="${input.targetUrl}">$1</a>`);
          replaced = true;
          break;
        }
      }
      if (!replaced) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Could not find the phrase in the article text" });
      }
      const updatedContent = parts.join("");
      const wordCount = updatedContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
      await updateArticle(input.articleId, { content: updatedContent, wordCount });
      return { success: true, updatedContent };
    })
  }),
  // ---- Thin Content Analyzer ----
  thinContent: router({
    /** Analyze a sitemap URL for thin content issues */
    analyze: publicProcedure.input(z2.object({
      sitemapUrl: z2.string().url(),
      wordThreshold: z2.number().min(50).max(5e3).optional()
    })).mutation(async ({ input }) => {
      const { sitemapUrl, wordThreshold = 300 } = input;
      const MAX_PAGES = 200;
      const parseSitemapUrls = async (url, depth = 0) => {
        if (depth > 2) return [];
        try {
          const response = await fetch(url, {
            headers: { "User-Agent": "RankPilot-Bot/1.0" },
            signal: AbortSignal.timeout(15e3)
          });
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const xml = await response.text();
          const urls = [];
          const sitemapIndexRegex = /<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi;
          let indexMatch;
          const childSitemaps = [];
          while ((indexMatch = sitemapIndexRegex.exec(xml)) !== null) {
            childSitemaps.push(indexMatch[1]);
          }
          if (childSitemaps.length > 0) {
            for (const childUrl of childSitemaps.slice(0, 5)) {
              const childUrls = await parseSitemapUrls(childUrl, depth + 1);
              urls.push(...childUrls);
              if (urls.length >= MAX_PAGES) break;
            }
          } else {
            const urlRegex = /<url>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/gi;
            let urlMatch;
            while ((urlMatch = urlRegex.exec(xml)) !== null) {
              urls.push(urlMatch[1]);
              if (urls.length >= MAX_PAGES) break;
            }
          }
          return urls.slice(0, MAX_PAGES);
        } catch (err) {
          console.error(`Failed to parse sitemap ${url}:`, err);
          return [];
        }
      };
      const pageUrls = await parseSitemapUrls(sitemapUrl);
      if (pageUrls.length === 0) {
        throw new Error("No URLs found in the sitemap. Please check the URL and try again.");
      }
      const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1e3;
      const now = Date.now();
      const extractLastModified = (html, headers) => {
        const httpLastMod = headers.get("last-modified");
        if (httpLastMod) {
          const d = new Date(httpLastMod);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
        const metaPatterns = [
          /property=["']article:modified_time["']\s+content=["']([^"']+)["']/i,
          /content=["']([^"']+)["']\s+property=["']article:modified_time["']/i,
          /property=["']og:updated_time["']\s+content=["']([^"']+)["']/i,
          /content=["']([^"']+)["']\s+property=["']og:updated_time["']/i,
          /name=["']last-modified["']\s+content=["']([^"']+)["']/i,
          /content=["']([^"']+)["']\s+name=["']last-modified["']/i,
          /name=["']date["']\s+content=["']([^"']+)["']/i,
          /content=["']([^"']+)["']\s+name=["']date["']/i,
          /property=["']article:published_time["']\s+content=["']([^"']+)["']/i,
          /content=["']([^"']+)["']\s+property=["']article:published_time["']/i
        ];
        for (const pattern of metaPatterns) {
          const match = html.match(pattern);
          if (match?.[1]) {
            const d = new Date(match[1]);
            if (!isNaN(d.getTime())) return d.toISOString();
          }
        }
        const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
        let jsonLdMatch;
        while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
          try {
            const data = JSON.parse(jsonLdMatch[1]);
            const dateStr = data.dateModified || data.datePublished;
            if (dateStr) {
              const d = new Date(dateStr);
              if (!isNaN(d.getTime())) return d.toISOString();
            }
          } catch {
          }
        }
        const timeMatch = html.match(/<time[^>]*datetime=["']([^"']+)["'][^>]*>/i);
        if (timeMatch?.[1]) {
          const d = new Date(timeMatch[1]);
          if (!isNaN(d.getTime())) return d.toISOString();
        }
        return null;
      };
      const analyzePage = async (pageUrl) => {
        try {
          const resp = await fetch(pageUrl, {
            headers: { "User-Agent": "RankPilot-Bot/1.0" },
            signal: AbortSignal.timeout(1e4)
          });
          if (!resp.ok) return null;
          const html = await resp.text();
          const lastModified = extractLastModified(html, resp.headers);
          const isDated = lastModified ? now - new Date(lastModified).getTime() > TWO_YEARS_MS : false;
          const textContent = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "").replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "").replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
          const wc = textContent.split(/\s+/).filter((w) => w.length > 0).length;
          const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
          const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
          const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;
          const issues = [];
          const recommendations = [];
          if (wc < wordThreshold) {
            issues.push(`Low word count (${wc} words, threshold: ${wordThreshold})`);
            recommendations.push(`Increase content length to at least ${wordThreshold} words for better SEO`);
          }
          if (h1Count === 0) {
            issues.push("Missing H1 tag");
            recommendations.push("Add a clear H1 heading to define the page topic");
          } else if (h1Count > 1) {
            issues.push(`Multiple H1 tags found (${h1Count})`);
            recommendations.push("Use only one H1 tag per page for better SEO structure");
          }
          if (wc > 300 && h2Count === 0) {
            issues.push("No H2 tags found on longer content");
            recommendations.push("Break up longer content with H2 subheadings for better structure");
          }
          if (h3Count > 0 && h2Count === 0) {
            issues.push("H3 tags used without H2 tags");
            recommendations.push("Maintain proper heading hierarchy: H1 \u2192 H2 \u2192 H3");
          }
          if (isDated && lastModified) {
            const modDate = new Date(lastModified);
            const yearsAgo = Math.floor((now - modDate.getTime()) / (365 * 24 * 60 * 60 * 1e3));
            issues.push(`Dated content \u2014 last updated ${yearsAgo} year${yearsAgo !== 1 ? "s" : ""} ago (${modDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`);
            recommendations.push("Review and update this content to ensure accuracy and freshness. Search engines favor recently updated content.");
          }
          return { url: pageUrl, wordCount: wc, h1Count, h2Count, h3Count, lastModified, isDated, issues, recommendations };
        } catch {
          return null;
        }
      };
      const pages = [];
      const batchSize = 10;
      for (let i = 0; i < pageUrls.length; i += batchSize) {
        const batch = pageUrls.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(analyzePage));
        pages.push(...results.filter((r) => r !== null));
      }
      const totalPages = pages.length;
      const pagesWithIssues = pages.filter((p) => p.issues.length > 0).length;
      const datedPages = pages.filter((p) => p.isDated).length;
      const avgWordCount = totalPages > 0 ? Math.round(pages.reduce((sum, p) => sum + p.wordCount, 0) / totalPages) : 0;
      pages.sort((a, b) => {
        if (a.issues.length > 0 && b.issues.length === 0) return -1;
        if (a.issues.length === 0 && b.issues.length > 0) return 1;
        return a.wordCount - b.wordCount;
      });
      return { totalPages, pagesWithIssues, datedPages, avgWordCount, pages };
    }),
    /** Get sitemaps for a project (for the project selector) */
    getProjectSitemaps: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      return getSitemapsByProject(input.projectId);
    })
  }),
  // ---- Content Grading ----
  // ---- Entity / Salience Analyzer ----
  entity: router({
    /** Entity + Salience analysis — 6-step framework */
    analyzeContent: publicProcedure.input(z2.object({
      content: z2.string().min(50, "Content must be at least 50 characters"),
      primaryKeyword: z2.string().optional(),
      projectId: z2.number().optional()
    })).mutation(async ({ input }) => {
      const truncated = input.content.slice(0, 15e3);
      const prompt = getEntityAnalysisPrompt(truncated, input.primaryKeyword || void 0);
      const response = await callLLM({
        messages: [
          { role: "system", content: "You are an expert SEO entity analyst. Respond with raw JSON only." },
          { role: "user", content: prompt }
        ]
      }, input.projectId);
      const llmResponse = response.choices?.[0]?.message?.content || "";
      const entityResult = extractJSON(llmResponse);
      if (!entityResult) throw new Error("Failed to parse entity analysis response");
      return entityResult;
    }),
    /** Analyze an existing article by ID */
    analyzeArticle: publicProcedure.input(z2.object({
      articleId: z2.number()
    })).mutation(async ({ input }) => {
      const article = await getArticleById(input.articleId);
      if (!article) throw new Error("Article not found");
      const textContent = (article.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (textContent.length < 50) throw new Error("Article content is too short to analyze");
      const truncated = textContent.slice(0, 15e3);
      const keyword = article.keyword || void 0;
      const prompt = getEntityAnalysisPrompt(truncated, keyword);
      const response = await callLLM({
        messages: [
          { role: "system", content: "You are an expert SEO entity analyst. Respond with raw JSON only." },
          { role: "user", content: prompt }
        ]
      }, article.projectId);
      const llmResponse = response.choices?.[0]?.message?.content || "";
      const entityResult = extractJSON(llmResponse);
      if (!entityResult) throw new Error("Failed to parse entity analysis response");
      return entityResult;
    }),
    /** Semantic analysis — 4-layer framework */
    analyzeSemantic: publicProcedure.input(z2.object({
      content: z2.string().min(50, "Content must be at least 50 characters"),
      targetKeyword: z2.string().min(1, "Target keyword is required for semantic analysis"),
      projectId: z2.number().optional()
    })).mutation(async ({ input }) => {
      const truncated = input.content.slice(0, 15e3);
      const prompt = getSemanticAnalysisPrompt(truncated, input.targetKeyword);
      const response = await callLLM({
        messages: [
          { role: "system", content: "You are an expert SEO semantic analyst. Respond with raw JSON only." },
          { role: "user", content: prompt }
        ]
      }, input.projectId);
      const llmResponse = response.choices?.[0]?.message?.content || "";
      const semanticResult = extractJSON(llmResponse);
      if (!semanticResult) throw new Error("Failed to parse semantic analysis response");
      return semanticResult;
    }),
    /** Semantic analysis for an existing article by ID */
    analyzeArticleSemantic: publicProcedure.input(z2.object({
      articleId: z2.number()
    })).mutation(async ({ input }) => {
      const article = await getArticleById(input.articleId);
      if (!article) throw new Error("Article not found");
      if (!article.keyword) throw new Error("Article has no keyword set. A keyword is required for semantic analysis.");
      const textContent = (article.content || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (textContent.length < 50) throw new Error("Article content is too short to analyze");
      const truncated = textContent.slice(0, 15e3);
      const prompt = getSemanticAnalysisPrompt(truncated, article.keyword);
      const response = await callLLM({
        messages: [
          { role: "system", content: "You are an expert SEO semantic analyst. Respond with raw JSON only." },
          { role: "user", content: prompt }
        ]
      }, article.projectId);
      const llmResponse = response.choices?.[0]?.message?.content || "";
      const semanticResult = extractJSON(llmResponse);
      if (!semanticResult) throw new Error("Failed to parse semantic analysis response");
      return semanticResult;
    }),
    /** Apply selected entity/salience fixes to an article — surgical editing */
    applyEntityFixes: publicProcedure.input(z2.object({
      articleId: z2.number(),
      selectedFixes: z2.array(z2.string()).min(1, "Select at least one fix to apply"),
      primaryEntity: z2.string().optional()
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [article] = await db.select().from(articles).where(eq2(articles.id, input.articleId)).limit(1);
      if (!article) throw new Error("Article not found");
      let brandVoiceSection = "";
      const [project] = article.projectId ? await db.select().from(projects).where(eq2(projects.id, article.projectId)).limit(1) : [null];
      if (project) {
        const allVoices = await db.select().from(brandVoices).where(eq2(brandVoices.projectId, project.id));
        const bv = allVoices.find((v) => v.isDefault === 1) || allVoices[0];
        if (bv) {
          const perspectiveMap = {
            first: "first person (we/our/us)",
            second: "second person (you/your)",
            third: "third person (they/the company)"
          };
          brandVoiceSection = `
BRAND VOICE (maintain this tone in all changes):
- Tone: ${bv.toneTraits}
- Perspective: ${perspectiveMap[bv.perspective] || bv.perspective}${bv.avoidList ? `
- Avoid: ${bv.avoidList}` : ""}`;
        }
      }
      const fixesList = input.selectedFixes.map((fix, i) => `${i + 1}. ${fix}`).join("\n");
      const primaryEntityContext = input.primaryEntity ? `
PRIMARY ENTITY: "${input.primaryEntity}" \u2014 all changes should reinforce this entity's salience and prominence.` : "";
      const planPrompt = `You are an expert SEO entity optimization editor. Given the article and the entity/salience fixes to apply, identify the EXACT sections that need to change.
${brandVoiceSection}
${primaryEntityContext}

For each fix, identify:
1. The exact original text snippet that needs to be modified (copy it VERBATIM from the article \u2014 must be an exact match)
2. The replacement text with the entity/salience fix applied

Rules:
- CRITICAL: Select the SMALLEST possible text snippet \u2014 ideally a SINGLE SENTENCE or SHORT PARAGRAPH. Never select a whole section when only one sentence needs changing.
- Entity salience fixes typically involve:
  * Adding the primary entity name to introductions, headings, or topic sentences
  * Replacing vague pronouns ("it", "this", "they") with the actual entity name
  * Adding supporting entity mentions where coverage is thin
  * Restructuring sentences to place the primary entity in subject position
  * Adding entity-reinforcing modifiers or context
- The "original" field must be an EXACT substring of the article content (character-for-character match)
- If a fix requires adding NEW content (e.g., a new definition paragraph), set "original" to the sentence AFTER which the new content should appear, and set "replacement" to that same sentence PLUS the new content appended
- NEVER rewrite, rephrase, or restructure text that is not directly related to the fix. Only change what is necessary to address the specific entity/salience issue.
- NEVER add <strong>, <b>, <em>, or <i> tags to replacement text unless the original text already had them. Do NOT bold or emphasize changed text \u2014 the replacement must use the exact same formatting as the original.
- Maintain the original HTML formatting, tone, and style
- Keep all existing links, formatting tags, and structure intact

Respond with ONLY a JSON array:
[
  {
    "fix": "<which fix this addresses>",
    "original": "<exact verbatim text from the article to find>",
    "replacement": "<the replacement text with fix applied>"
  }
]

Do NOT wrap in markdown code blocks. Return ONLY the JSON array.`;
      const userPrompt = `Apply these entity/salience fixes to the article:

===FIXES TO APPLY===
${fixesList}
===END FIXES===

===FULL ARTICLE (for context only \u2014 do NOT rewrite the whole thing)===
${article.content}
===END ARTICLE===`;
      const llmResponse = await callLLM({
        messages: [
          { role: "system", content: planPrompt },
          { role: "user", content: userPrompt }
        ]
      });
      const rawResponse = llmResponse.choices?.[0]?.message?.content || "";
      let edits = [];
      try {
        const parsedEdits = extractJSON(rawResponse);
        if (parsedEdits && Array.isArray(parsedEdits)) {
          edits = parsedEdits;
        } else {
          throw new Error("No JSON array found");
        }
      } catch {
        throw new Error("Failed to parse entity fix plan. Please try again.");
      }
      let improvedContent = article.content || "";
      let appliedCount = 0;
      for (const edit of edits) {
        if (!edit.original || !edit.replacement) continue;
        if (improvedContent.includes(edit.original)) {
          improvedContent = improvedContent.replace(edit.original, edit.replacement);
          appliedCount++;
        } else {
          const trimmedOriginal = edit.original.trim();
          if (trimmedOriginal && improvedContent.includes(trimmedOriginal)) {
            improvedContent = improvedContent.replace(trimmedOriginal, edit.replacement.trim());
            appliedCount++;
          }
        }
      }
      if (appliedCount === 0) {
        throw new Error("Could not match any sections in the article. Please try again.");
      }
      improvedContent = stripWrappingStrongTags(improvedContent);
      const wordCount = improvedContent.split(/\s+/).filter((w) => w.length > 0).length;
      await db.update(articles).set({
        content: improvedContent,
        wordCount
      }).where(eq2(articles.id, input.articleId));
      return {
        success: true,
        content: improvedContent,
        wordCount,
        appliedCount,
        totalFixes: input.selectedFixes.length
      };
    }),
    /** Generate a fresh outline from entity/salience analysis results */
    generateOutlineFromAnalysis: publicProcedure.input(z2.object({
      /** The entity analysis result data */
      entityAnalysis: z2.object({
        primaryEntity: z2.object({
          name: z2.string(),
          type: z2.string(),
          justification: z2.string()
        }),
        entities: z2.array(z2.object({
          name: z2.string(),
          type: z2.string(),
          prominence: z2.enum(["High", "Medium", "Low"]),
          rationale: z2.string()
        })),
        salienceStructure: z2.object({
          dominanceGap: z2.object({ grade: z2.string(), description: z2.string() }),
          earlyReinforcement: z2.object({
            inFirstParagraph: z2.boolean(),
            inHeading: z2.boolean(),
            withinFirst120Words: z2.boolean(),
            summary: z2.string()
          }),
          entityDrift: z2.object({ level: z2.string(), description: z2.string() })
        }),
        supportingCoverage: z2.object({
          grade: z2.string(),
          relatedSubEntities: z2.array(z2.string()),
          missingComponents: z2.array(z2.string()),
          evaluation: z2.string()
        }),
        geoExtractability: z2.object({
          grade: z2.string(),
          hasConcisenDefinitions: z2.boolean(),
          hasClearQuestionAnswering: z2.boolean(),
          hasShortAnswerSummary: z2.boolean(),
          hasCleanHeadings: z2.boolean(),
          evaluation: z2.string()
        }),
        scores: z2.object({
          primaryEntityClarity: z2.number(),
          entityFocus: z2.number(),
          supportingCoverage: z2.number(),
          geoExtractability: z2.number(),
          overallScore: z2.number()
        }),
        actionableFixes: z2.array(z2.string()),
        advancedRecommendations: z2.object({
          refinedPrimaryEntity: z2.string(),
          refinedEntityRationale: z2.string(),
          suggestedTitleRewrite: z2.string(),
          missingSupportingEntities: z2.array(z2.string())
        })
      }),
      /** Optional semantic analysis result */
      semanticAnalysis: z2.object({
        targetKeyword: z2.string(),
        coverage: z2.object({
          coveredTopics: z2.array(z2.string()),
          missingTopics: z2.array(z2.string()),
          expectedTopics: z2.array(z2.string()),
          evaluation: z2.string()
        }),
        semanticFixes: z2.array(z2.string())
      }).optional(),
      /** The keyword to build the outline around */
      keyword: z2.string().min(1),
      /** Project to pull Brand Voice and ICP from */
      projectId: z2.number(),
      /** Optional brand voice override */
      brandVoiceId: z2.number().optional(),
      /** Optional ICP profile override */
      icpProfileId: z2.number().optional(),
      /** Target word count for the planned article */
      targetWordCount: z2.number().optional(),
      /** Number of main sections */
      numSections: z2.number().optional(),
      /** Number of FAQ items */
      numFaqs: z2.number().optional()
    })).mutation(async ({ input }) => {
      const ea = input.entityAnalysis;
      const sa = input.semanticAnalysis;
      const entityContext = `
=== ENTITY & SALIENCE ANALYSIS RESULTS ===
This outline must be built from scratch to address every weakness found below.

PRIMARY ENTITY: "${ea.advancedRecommendations.refinedPrimaryEntity || ea.primaryEntity.name}" (${ea.primaryEntity.type})
Justification: ${ea.primaryEntity.justification}
${ea.advancedRecommendations.refinedPrimaryEntity !== ea.primaryEntity.name ? `Refined Entity Rationale: ${ea.advancedRecommendations.refinedEntityRationale}` : ""}

SUGGESTED TITLE: ${ea.advancedRecommendations.suggestedTitleRewrite}

SCORES (out of 100):
- Primary Entity Clarity: ${ea.scores.primaryEntityClarity}
- Entity Focus: ${ea.scores.entityFocus}
- Supporting Coverage: ${ea.scores.supportingCoverage}
- GEO Extractability: ${ea.scores.geoExtractability}
- Overall: ${ea.scores.overallScore}

SALIENCE ISSUES TO FIX:
- Dominance Gap: ${ea.salienceStructure.dominanceGap.grade} \u2014 ${ea.salienceStructure.dominanceGap.description}
- Early Reinforcement: ${ea.salienceStructure.earlyReinforcement.summary}
  (In first paragraph: ${ea.salienceStructure.earlyReinforcement.inFirstParagraph}, In heading: ${ea.salienceStructure.earlyReinforcement.inHeading}, Within first 120 words: ${ea.salienceStructure.earlyReinforcement.withinFirst120Words})
- Entity Drift: ${ea.salienceStructure.entityDrift.level} \u2014 ${ea.salienceStructure.entityDrift.description}

SUPPORTING COVERAGE: ${ea.supportingCoverage.grade}
- Existing sub-entities: ${ea.supportingCoverage.relatedSubEntities.join(", ") || "None identified"}
- Missing components: ${ea.supportingCoverage.missingComponents.join(", ") || "None"}
- Missing supporting entities to ADD: ${ea.advancedRecommendations.missingSupportingEntities.join(", ")}

GEO/AI EXTRACTABILITY: ${ea.geoExtractability.grade}
- ${ea.geoExtractability.evaluation}
- Needs concise definitions: ${!ea.geoExtractability.hasConcisenDefinitions}
- Needs clear Q&A format: ${!ea.geoExtractability.hasClearQuestionAnswering}
- Needs short answer summary: ${!ea.geoExtractability.hasShortAnswerSummary}
- Needs clean headings: ${!ea.geoExtractability.hasCleanHeadings}

ALL ENTITIES DETECTED:
${ea.entities.map((e) => `- ${e.name} (${e.type}, ${e.prominence}): ${e.rationale}`).join("\n")}

ACTIONABLE FIXES THE OUTLINE MUST ADDRESS:
${ea.actionableFixes.map((f, i) => `${i + 1}. ${f}`).join("\n")}
`;
      let semanticContext = "";
      if (sa) {
        semanticContext = `
=== SEMANTIC ANALYSIS RESULTS ===
Target Keyword: ${sa.targetKeyword}

TOPIC COVERAGE GAPS \u2014 the new outline MUST cover these missing topics:
${sa.coverage.missingTopics.map((t2) => `- ${t2}`).join("\n") || "- No missing topics identified"}

EXPECTED TOPICS for comprehensive coverage:
${sa.coverage.expectedTopics.map((t2) => `- ${t2}`).join("\n")}

SEMANTIC FIXES TO ADDRESS:
${sa.semanticFixes.map((f, i) => `${i + 1}. ${f}`).join("\n")}
`;
      }
      const project = await getProjectById(input.projectId);
      const allVoices = await getBrandVoicesByProject(input.projectId);
      const brandVoice = input.brandVoiceId ? allVoices.find((v) => v.id === input.brandVoiceId) ?? allVoices[0] ?? null : allVoices.find((v) => v.isDefault === 1) ?? allVoices[0] ?? null;
      let icpSection = "";
      const formatList = (items, label) => {
        if (!items?.length) return "";
        return `${label}:
${items.map((item, i) => `  ${i + 1}. ${item}`).join("\n")}
`;
      };
      if (input.icpProfileId) {
        const icpProfile = await getICPById(input.icpProfileId);
        if (icpProfile) {
          const demographics = icpProfile.demographics;
          const demoLines = demographics ? [
            demographics.ageRange ? `Age Range: ${demographics.ageRange}` : "",
            demographics.location ? `Location: ${demographics.location}` : "",
            demographics.income ? `Income: ${demographics.income}` : "",
            demographics.education ? `Education: ${demographics.education}` : "",
            demographics.occupation ? `Occupation: ${demographics.occupation}` : "",
            demographics.other ? `Other: ${demographics.other}` : ""
          ].filter(Boolean).join("\n") : "";
          icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) ===
TARGET AUDIENCE: ${icpProfile.name}
${icpProfile.description ? `Who They Are: ${icpProfile.description}` : ""}
${demoLines ? `
DEMOGRAPHICS:
${demoLines}` : ""}

${formatList(icpProfile.painPoints, "PAIN POINTS (structure H2 headings around these)")}
${formatList(icpProfile.goals, "GOALS (address these in content sections)")}
${formatList(icpProfile.objections, "OBJECTIONS (create FAQ questions from these)")}
${icpProfile.searchBehavior ? `SEARCH BEHAVIOR: ${icpProfile.searchBehavior}
` : ""}
${formatList(icpProfile.contentPreferences, "CONTENT PREFERENCES")}
`;
        }
      } else if (project?.icpPrimaryName) {
        icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) ===
TARGET AUDIENCE: ${project.icpPrimaryName}
${project.icpWhoTheyAre ? `Who They Are: ${project.icpWhoTheyAre}` : ""}

${formatList(project.icpPains, "PAIN POINTS (structure H2 headings around these)")}
${formatList(project.icpGoals, "GOALS (address these in content sections)")}
${formatList(project.icpObjections, "OBJECTIONS (create FAQ questions from these)")}
${formatList(project.icpDecisionTriggers, "DECISION TRIGGERS")}
${formatList(project.icpTrustSignals, "TRUST SIGNALS")}
`;
      }
      let brandVoiceSection = "";
      if (brandVoice) {
        const perspectiveMap = {
          first: "First person (we/our/us)",
          second: "Second person (you/your)",
          third: "Third person (they/their)"
        };
        const styleMap = {
          short: "Concise, punchy sentences. Paragraphs of 1-3 sentences only.",
          mixed: "Varied sentence lengths with natural rhythm. Paragraphs of 2-5 sentences only.",
          detailed: "Detailed, explanatory sentences. Paragraphs of 3-6 sentences maximum."
        };
        const AVOID_LABELS = {
          jargon: "Overly technical jargon",
          salesy: "Sales-heavy language",
          fear: "Fear-based messaging",
          exaggerated: "Exaggerated claims",
          cliches: "Industry clich\xE9s",
          passive: "Passive voice",
          buzzwords: "Buzzwords",
          rhetorical: "Rhetorical questions",
          unverified: "Unverified statistics",
          competitor: "Competitor comparisons"
        };
        let avoidItems = [];
        const avoidList = brandVoice.avoidList || "";
        if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
          const parts = avoidList.split("|");
          for (const part of parts) {
            if (part.startsWith("PRESETS:")) {
              const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
              avoidItems.push(...presetIds.map((id) => AVOID_LABELS[id] || id));
            } else if (part.startsWith("CUSTOM:")) {
              const custom = part.replace("CUSTOM:", "").trim();
              if (custom) avoidItems.push(...custom.split(",").map((s) => s.trim()).filter(Boolean));
            }
          }
        } else if (avoidList) {
          avoidItems = avoidList.split(",").map((s) => s.trim()).filter(Boolean);
        }
        brandVoiceSection = `
=== BRAND VOICE GUIDELINES ===
Voice Name: ${brandVoice.name}
TONE TRAITS: ${brandVoice.toneTraits || "Professional"}
WRITING PERSPECTIVE: ${perspectiveMap[brandVoice.perspective] || brandVoice.perspective}
SENTENCE STYLE: ${styleMap[brandVoice.sentenceStyle] || brandVoice.sentenceStyle}
${avoidItems.length > 0 ? `AVOID:
${avoidItems.map((item) => `- ${item}`).join("\n")}` : ""}
`;
      }
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const numSections = input.numSections ?? 8;
      const numFaqs = input.numFaqs ?? 5;
      const targetWordCount = input.targetWordCount ?? 2e3;
      const systemPrompt = `You are an expert SEO content strategist. You are given the results of an entity/salience analysis (and optionally a semantic analysis) of an existing article. Your job is to create a BRAND NEW outline from scratch that would produce a significantly better article \u2014 one that fixes every weakness identified in the analysis.

IMPORTANT \u2014 CURRENT DATE CONTEXT: The current year is ${currentYear}. All references to dates, years, regulations, trends, and time-sensitive topics MUST treat ${currentYear} as the present year.

${entityContext}
${semanticContext}
${icpSection}
${brandVoiceSection}

OUTLINE REQUIREMENTS:
1. Build the outline PURELY from the analysis findings \u2014 do NOT replicate the original article's structure
2. The primary entity "${ea.advancedRecommendations.refinedPrimaryEntity || ea.primaryEntity.name}" MUST be dominant: appear in the title, first section, and reinforced throughout
3. Create ${numSections} main H2 sections plus a FAQ section with ${numFaqs} questions
4. Include an introduction that establishes the primary entity within the first 120 words
5. Every missing supporting entity and missing component from the analysis MUST have a dedicated section or subsection
6. Address ALL actionable fixes from the analysis through the outline structure
7. If GEO extractability was weak, include sections with concise definitions, clear Q&A format, and short answer summaries
8. If semantic coverage had gaps, ensure the missing topics are covered
9. Target word count: ${targetWordCount} words
10. Include a conclusion section last
11. Each section should have 2-4 specific, actionable key points \u2014 not generic filler

Return a JSON object with:
- "title": A compelling, SEO-optimized article title featuring the primary entity
- "sections": An array of sections, each with:
  - "id": A unique string ID (format "s1", "s2", etc.)
  - "heading": The section heading text
  - "type": "h2" for main sections
  - "points": Array of 2-4 key points to cover
  - "subSections": Array of sub-sections with same structure but type "h3"

Return ONLY valid JSON, no markdown code blocks.`;
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a new, improved outline for the keyword: "${input.keyword}" based on the entity/salience analysis findings provided.` }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "article_outline_from_analysis",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string", description: "SEO-optimized article title" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      heading: { type: "string" },
                      type: { type: "string", enum: ["h2", "h3"] },
                      points: { type: "array", items: { type: "string" } },
                      subSections: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            heading: { type: "string" },
                            type: { type: "string", enum: ["h2", "h3"] },
                            points: { type: "array", items: { type: "string" } }
                          },
                          required: ["id", "heading", "type", "points"],
                          additionalProperties: false
                        }
                      },
                      targetWordCount: { type: "integer", description: "Target word count for this section" }
                    },
                    required: ["id", "heading", "type", "points", "subSections", "targetWordCount"],
                    additionalProperties: false
                  }
                }
              },
              required: ["title", "sections"],
              additionalProperties: false
            }
          }
        }
      });
      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) throw new Error("No response from AI");
      const content = typeof rawContent === "string" ? rawContent : rawContent[0]?.text ?? "";
      const parsed = extractJSON(content);
      if (!parsed) throw new Error("Failed to parse outline from AI response");
      const outline = await createOutline({
        title: parsed.title,
        keyword: input.keyword,
        sections: parsed.sections,
        settings: {
          contentType: "blog",
          targetWordCount: input.targetWordCount,
          numSections: input.numSections,
          numFaqs: input.numFaqs,
          additionalInstructions: `Generated from entity/salience analysis. Primary entity: ${ea.advancedRecommendations.refinedPrimaryEntity || ea.primaryEntity.name}`
        },
        projectId: input.projectId,
        userId: 1
      });
      return outline;
    }),
    /**
     * Fetch a URL and extract the main article content.
     * Uses @mozilla/readability + linkedom for robust content extraction.
     * Strips nav, footer, sidebar, ads — returns clean article text.
     */
    fetchUrlContent: publicProcedure.input(z2.object({
      url: z2.string().url("Please enter a valid URL")
    })).mutation(async ({ input }) => {
      const { Readability } = await import("@mozilla/readability");
      const { parseHTML } = await import("linkedom");
      let html;
      try {
        const resp = await fetch(input.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; RankPilot/1.0; +https://rankpilot.app)",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
          },
          signal: AbortSignal.timeout(15e3),
          redirect: "follow"
        });
        if (!resp.ok) {
          throw new TRPCError3({
            code: "BAD_REQUEST",
            message: `Failed to fetch URL: HTTP ${resp.status} ${resp.statusText}`
          });
        }
        const contentType = resp.headers.get("content-type") || "";
        if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
          throw new TRPCError3({
            code: "BAD_REQUEST",
            message: "URL does not point to an HTML page"
          });
        }
        html = await resp.text();
      } catch (e) {
        if (e instanceof TRPCError3) throw e;
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: e.name === "TimeoutError" ? "Request timed out \u2014 the page took too long to respond" : `Failed to fetch URL: ${e.message}`
        });
      }
      const { document } = parseHTML(html);
      const pageTitle = document.querySelector("title")?.textContent?.trim() || "";
      const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
      const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute("content")?.trim() || "";
      const reader = new Readability(document, {
        charThreshold: 100
      });
      const article = reader.parse();
      if (!article || !article.textContent || article.textContent.trim().length < 50) {
        const fallbackText = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "").replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "").replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "").replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "").replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/gi, " ").replace(/\s+/g, " ").trim();
        if (fallbackText.length < 50) {
          throw new TRPCError3({
            code: "BAD_REQUEST",
            message: "Could not extract meaningful content from this URL. The page may be behind a paywall, require JavaScript, or have very little text content."
          });
        }
        const wordCount2 = fallbackText.split(/\s+/).filter((w) => w.length > 0).length;
        return {
          content: fallbackText.slice(0, 15e3),
          title: pageTitle,
          wordCount: wordCount2,
          url: input.url,
          extractionMethod: "fallback",
          metaDescription,
          metaKeywords
        };
      }
      const cleanText = article.textContent.replace(/\s+/g, " ").trim();
      const wordCount = cleanText.split(/\s+/).filter((w) => w.length > 0).length;
      return {
        content: cleanText.slice(0, 15e3),
        title: article.title || pageTitle,
        wordCount,
        url: input.url,
        extractionMethod: "readability",
        metaDescription,
        metaKeywords
      };
    }),
    /**
     * Multi-URL Competitor Analysis — fetch 2-3 competitor URLs in parallel,
     * run entity analysis on each, then merge results to identify consensus
     * topics, unique topics, and entity gaps.
     */
    analyzeCompetitorUrls: publicProcedure.input(z2.object({
      urls: z2.array(z2.string().url("Please enter a valid URL")).min(2, "At least 2 URLs required").max(3, "Maximum 3 URLs"),
      keyword: z2.string().optional(),
      projectId: z2.number().optional()
    })).mutation(async ({ input }) => {
      const { Readability } = await import("@mozilla/readability");
      const { parseHTML } = await import("linkedom");
      const fetchOne = async (url) => {
        try {
          const resp = await fetch(url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; RankPilot/1.0; +https://rankpilot.app)",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5"
            },
            signal: AbortSignal.timeout(15e3),
            redirect: "follow"
          });
          if (!resp.ok) return { url, error: `HTTP ${resp.status}`, content: "", title: "", wordCount: 0 };
          const contentType = resp.headers.get("content-type") || "";
          if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
            return { url, error: "Not an HTML page", content: "", title: "", wordCount: 0 };
          }
          const html = await resp.text();
          const { document } = parseHTML(html);
          const pageTitle = document.querySelector("title")?.textContent?.trim() || "";
          const reader = new Readability(document, { charThreshold: 100 });
          const article = reader.parse();
          if (article && article.textContent && article.textContent.trim().length >= 50) {
            const clean = article.textContent.replace(/\s+/g, " ").trim();
            return { url, error: null, content: clean.slice(0, 8e3), title: article.title || pageTitle, wordCount: clean.split(/\s+/).filter((w) => w.length > 0).length };
          }
          const fallback = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
          return { url, error: null, content: fallback.slice(0, 8e3), title: pageTitle, wordCount: fallback.split(/\s+/).filter((w) => w.length > 0).length };
        } catch (e) {
          return { url, error: e.name === "TimeoutError" ? "Timed out" : e.message, content: "", title: "", wordCount: 0 };
        }
      };
      const fetched = await Promise.all(input.urls.map(fetchOne));
      const successful = fetched.filter((f) => !f.error && f.content.length >= 50);
      if (successful.length < 2) {
        const errors = fetched.filter((f) => f.error).map((f) => `${f.url}: ${f.error}`).join("; ");
        throw new TRPCError3({
          code: "BAD_REQUEST",
          message: `Could not extract content from enough URLs (need at least 2). Errors: ${errors}`
        });
      }
      const analyzeOne = async (item) => {
        try {
          const trimmedContent = item.content.slice(0, 5e3);
          const prompt = getEntityAnalysisPrompt(trimmedContent, input.keyword || void 0);
          const response = await callLLM({
            messages: [
              { role: "system", content: "You are an expert SEO entity analyst. Respond with raw JSON only." },
              { role: "user", content: prompt }
            ]
          }, input.projectId);
          const llmResponse = response.choices?.[0]?.message?.content || "";
          const parsed = extractJSON(llmResponse);
          if (!parsed) {
            console.warn(`[CompetitorAnalysis] Failed to parse LLM JSON for ${item.url}`);
            return null;
          }
          return { url: item.url, title: item.title, wordCount: item.content.split(/\s+/).length, analysis: parsed };
        } catch (e) {
          console.error(`[CompetitorAnalysis] LLM analysis failed for ${item.url}:`, e.message);
          return null;
        }
      };
      const analyses = (await Promise.all(successful.map(analyzeOne))).filter((a) => a !== null);
      if (analyses.length < 2) {
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Entity analysis failed for too many URLs. The AI model may have timed out \u2014 try again or use shorter articles." });
      }
      const mergeInput = analyses.map((a, i) => `
=== COMPETITOR ${i + 1}: ${a.url} ===
Title: ${a.title}
Word Count: ${a.wordCount}
Primary Entity: ${a.analysis.primaryEntity.name} (${a.analysis.primaryEntity.type})
Overall Score: ${a.analysis.scores.overallScore}

Entities (${a.analysis.entities.length}):
${a.analysis.entities.map((e) => `- ${e.name} (${e.type}, ${e.prominence})`).join("\n")}

Actionable Fixes:
${a.analysis.actionableFixes.map((f, j) => `${j + 1}. ${f}`).join("\n")}

Supporting Coverage: ${a.analysis.supportingCoverage.grade}
- Sub-entities: ${a.analysis.supportingCoverage.relatedSubEntities.join(", ") || "None"}
- Missing: ${a.analysis.supportingCoverage.missingComponents.join(", ") || "None"}

GEO Extractability: ${a.analysis.geoExtractability.grade}
- ${a.analysis.geoExtractability.evaluation}

Advanced Recommendations:
- Refined Entity: ${a.analysis.advancedRecommendations.refinedPrimaryEntity}
- Suggested Title: ${a.analysis.advancedRecommendations.suggestedTitleRewrite}
- Missing Supporting: ${a.analysis.advancedRecommendations.missingSupportingEntities.join(", ")}
`).join("\n");
      const mergePrompt = `You are an expert SEO competitive analyst. You have been given entity/salience analysis results for ${analyses.length} top-ranking competitor articles${input.keyword ? ` for the keyword "${input.keyword}"` : ""}.

Your job is to synthesize these analyses into a competitive intelligence report that identifies:

1. **Consensus Topics** \u2014 sections/entities that appear in ALL competitors (these are REQUIRED for any new article)
2. **Common Topics** \u2014 sections/entities that appear in MOST competitors (2 out of 3, or both if 2 URLs)
3. **Unique Topics** \u2014 sections/entities that appear in only ONE competitor (potential differentiation opportunities)
4. **Entity Gaps** \u2014 entities or topics that are MISSING from all competitors (opportunity to outperform)
5. **Recommended Sections** \u2014 the ideal section structure for a new article that would outrank all competitors

${mergeInput}

Return a JSON object with this structure:
{
  "consensusTopics": [{ "topic": "string", "description": "why this is essential", "appearsIn": ["url1", "url2"] }],
  "commonTopics": [{ "topic": "string", "description": "string", "appearsIn": ["url1"] }],
  "uniqueTopics": [{ "topic": "string", "source": "url", "description": "why this could add value" }],
  "entityGaps": [{ "entity": "string", "type": "string", "rationale": "why competitors are missing this" }],
  "mergedEntities": [{ "name": "string", "type": "string", "frequency": 2, "avgProminence": "High|Medium|Low" }],
  "recommendedSections": [{ "heading": "string", "rationale": "string", "priority": "must-have|recommended|optional" }],
  "competitiveInsights": {
    "avgScore": 75,
    "strongestArea": "string",
    "weakestArea": "string",
    "differentiationOpportunity": "string"
  }
}

Respond with raw JSON only.`;
      let merged;
      try {
        const mergeResponse = await callLLM({
          messages: [
            { role: "system", content: "You are an expert SEO competitive analyst. Respond with raw JSON only." },
            { role: "user", content: mergePrompt }
          ]
        }, input.projectId);
        const mergeRaw = mergeResponse.choices?.[0]?.message?.content || "";
        merged = extractJSON(mergeRaw);
        if (!merged) {
          console.error("[CompetitorAnalysis] Failed to parse merge response:", mergeRaw.slice(0, 200));
          throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse the competitive analysis. Please try again." });
        }
      } catch (e) {
        if (e instanceof TRPCError3) throw e;
        console.error("[CompetitorAnalysis] Merge LLM call failed:", e.message);
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: `Competitive analysis merge failed: ${e.message}. Please try again.` });
      }
      return {
        urls: fetched.map((f) => ({ url: f.url, title: f.title, wordCount: f.wordCount, error: f.error })),
        analyses: analyses.map((a) => ({
          url: a.url,
          title: a.title,
          wordCount: a.wordCount,
          scores: a.analysis.scores,
          primaryEntity: a.analysis.primaryEntity,
          entityCount: a.analysis.entities.length
        })),
        merged
      };
    }),
    /**
     * Generate an outline from merged competitor analysis.
     * Takes the merged competitive intelligence and creates an outline
     * that covers all consensus topics and selectively adds unique depth.
     */
    generateOutlineFromCompetitors: publicProcedure.input(z2.object({
      /** The merged competitor analysis data */
      competitorData: z2.object({
        consensusTopics: z2.array(z2.object({ topic: z2.string(), description: z2.string() })),
        commonTopics: z2.array(z2.object({ topic: z2.string(), description: z2.string() })).optional(),
        uniqueTopics: z2.array(z2.object({ topic: z2.string(), source: z2.string(), description: z2.string() })),
        entityGaps: z2.array(z2.object({ entity: z2.string(), type: z2.string(), rationale: z2.string() })),
        recommendedSections: z2.array(z2.object({ heading: z2.string(), rationale: z2.string(), priority: z2.string() })),
        competitiveInsights: z2.object({
          avgScore: z2.number(),
          strongestArea: z2.string(),
          weakestArea: z2.string(),
          differentiationOpportunity: z2.string()
        }).optional()
      }),
      /** Per-URL analysis summaries */
      analyses: z2.array(z2.object({
        url: z2.string(),
        title: z2.string(),
        scores: z2.object({ overallScore: z2.number() }),
        primaryEntity: z2.object({ name: z2.string(), type: z2.string() })
      })),
      keyword: z2.string().min(1),
      projectId: z2.number(),
      brandVoiceId: z2.number().optional(),
      icpProfileId: z2.number().optional(),
      targetWordCount: z2.number().optional(),
      numSections: z2.number().optional(),
      numFaqs: z2.number().optional()
    })).mutation(async ({ input }) => {
      const cd = input.competitorData;
      const competitorContext = `
=== COMPETITIVE ANALYSIS RESULTS ===
These are the top-ranking competitors for "${input.keyword}". Your outline must BEAT all of them.

COMPETITOR SUMMARIES:
${input.analyses.map((a, i) => `${i + 1}. ${a.title} (${a.url}) \u2014 Score: ${a.scores.overallScore}, Primary Entity: ${a.primaryEntity.name}`).join("\n")}

CONSENSUS TOPICS (appear in ALL competitors \u2014 MUST include):
${cd.consensusTopics.map((t2) => `- ${t2.topic}: ${t2.description}`).join("\n") || "- None identified"}

${cd.commonTopics?.length ? `COMMON TOPICS (appear in most competitors \u2014 SHOULD include):
${cd.commonTopics.map((t2) => `- ${t2.topic}: ${t2.description}`).join("\n")}` : ""}

UNIQUE TOPICS (appear in only one competitor \u2014 selective inclusion for depth):
${cd.uniqueTopics.map((t2) => `- ${t2.topic} (from ${t2.source}): ${t2.description}`).join("\n") || "- None identified"}

ENTITY GAPS (missing from ALL competitors \u2014 OPPORTUNITY to outperform):
${cd.entityGaps.map((g) => `- ${g.entity} (${g.type}): ${g.rationale}`).join("\n") || "- None identified"}

RECOMMENDED SECTION STRUCTURE:
${cd.recommendedSections.map((s) => `- [${s.priority.toUpperCase()}] ${s.heading}: ${s.rationale}`).join("\n")}

${cd.competitiveInsights ? `COMPETITIVE INSIGHTS:
- Average competitor score: ${cd.competitiveInsights.avgScore}
- Strongest area across competitors: ${cd.competitiveInsights.strongestArea}
- Weakest area (your opportunity): ${cd.competitiveInsights.weakestArea}
- Key differentiation: ${cd.competitiveInsights.differentiationOpportunity}` : ""}
`;
      const project = await getProjectById(input.projectId);
      const allVoices = await getBrandVoicesByProject(input.projectId);
      const brandVoice = input.brandVoiceId ? allVoices.find((v) => v.id === input.brandVoiceId) ?? allVoices[0] ?? null : allVoices.find((v) => v.isDefault === 1) ?? allVoices[0] ?? null;
      let icpSection = "";
      const formatList = (items, label) => {
        if (!items?.length) return "";
        return `${label}:
${items.map((item, i) => `  ${i + 1}. ${item}`).join("\n")}
`;
      };
      if (input.icpProfileId) {
        const icpProfile = await getICPById(input.icpProfileId);
        if (icpProfile) {
          const demographics = icpProfile.demographics;
          const demoLines = demographics ? [
            demographics.ageRange ? `Age Range: ${demographics.ageRange}` : "",
            demographics.location ? `Location: ${demographics.location}` : "",
            demographics.income ? `Income: ${demographics.income}` : "",
            demographics.education ? `Education: ${demographics.education}` : "",
            demographics.occupation ? `Occupation: ${demographics.occupation}` : "",
            demographics.other ? `Other: ${demographics.other}` : ""
          ].filter(Boolean).join("\n") : "";
          icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) ===
TARGET AUDIENCE: ${icpProfile.name}
${icpProfile.description ? `Who They Are: ${icpProfile.description}` : ""}
${demoLines ? `
DEMOGRAPHICS:
${demoLines}` : ""}

${formatList(icpProfile.painPoints, "PAIN POINTS (structure H2 headings around these)")}
${formatList(icpProfile.goals, "GOALS (address these in content sections)")}
${formatList(icpProfile.objections, "OBJECTIONS (create FAQ questions from these)")}
${icpProfile.searchBehavior ? `SEARCH BEHAVIOR: ${icpProfile.searchBehavior}
` : ""}
${formatList(icpProfile.contentPreferences, "CONTENT PREFERENCES")}
`;
        }
      } else if (project?.icpPrimaryName) {
        icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) ===
TARGET AUDIENCE: ${project.icpPrimaryName}
${project.icpWhoTheyAre ? `Who They Are: ${project.icpWhoTheyAre}` : ""}

${formatList(project.icpPains, "PAIN POINTS (structure H2 headings around these)")}
${formatList(project.icpGoals, "GOALS (address these in content sections)")}
${formatList(project.icpObjections, "OBJECTIONS (create FAQ questions from these)")}
${formatList(project.icpDecisionTriggers, "DECISION TRIGGERS")}
${formatList(project.icpTrustSignals, "TRUST SIGNALS")}
`;
      }
      let brandVoiceSection = "";
      if (brandVoice) {
        const perspectiveMap = {
          first: "First person (we/our/us)",
          second: "Second person (you/your)",
          third: "Third person (they/their)"
        };
        const styleMap = {
          short: "Concise, punchy sentences. Paragraphs of 1-3 sentences only.",
          mixed: "Varied sentence lengths with natural rhythm. Paragraphs of 2-5 sentences only.",
          detailed: "Detailed, explanatory sentences. Paragraphs of 3-6 sentences maximum."
        };
        const AVOID_LABELS = {
          jargon: "Overly technical jargon",
          salesy: "Sales-heavy language",
          fear: "Fear-based messaging",
          exaggerated: "Exaggerated claims",
          cliches: "Industry clich\xE9s",
          passive: "Passive voice",
          buzzwords: "Buzzwords",
          rhetorical: "Rhetorical questions",
          unverified: "Unverified statistics",
          competitor: "Competitor comparisons"
        };
        let avoidItems = [];
        const avoidList = brandVoice.avoidList || "";
        if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
          const parts = avoidList.split("|");
          for (const part of parts) {
            if (part.startsWith("PRESETS:")) {
              const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
              avoidItems.push(...presetIds.map((id) => AVOID_LABELS[id] || id));
            } else if (part.startsWith("CUSTOM:")) {
              const custom = part.replace("CUSTOM:", "").trim();
              if (custom) avoidItems.push(...custom.split(",").map((s) => s.trim()).filter(Boolean));
            }
          }
        } else if (avoidList) {
          avoidItems = avoidList.split(",").map((s) => s.trim()).filter(Boolean);
        }
        brandVoiceSection = `
=== BRAND VOICE GUIDELINES ===
Voice Name: ${brandVoice.name}
TONE TRAITS: ${brandVoice.toneTraits || "Professional"}
WRITING PERSPECTIVE: ${perspectiveMap[brandVoice.perspective] || brandVoice.perspective}
SENTENCE STYLE: ${styleMap[brandVoice.sentenceStyle] || brandVoice.sentenceStyle}
${avoidItems.length > 0 ? `AVOID:
${avoidItems.map((item) => `- ${item}`).join("\n")}` : ""}
`;
      }
      const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
      const numSections = input.numSections ?? 8;
      const numFaqs = input.numFaqs ?? 5;
      const targetWordCount = input.targetWordCount ?? 2e3;
      const systemPrompt = `You are an expert SEO content strategist. You have been given competitive analysis results from ${input.analyses.length} top-ranking articles. Your job is to create an outline that would OUTRANK all of them by:

1. Covering ALL consensus topics (required by all competitors)
2. Including the best unique topics for added depth
3. Filling entity gaps that no competitor covers (your competitive advantage)
4. Addressing the weakest areas across competitors

IMPORTANT \u2014 CURRENT DATE CONTEXT: The current year is ${currentYear}. All references to dates, years, regulations, trends, and time-sensitive topics MUST treat ${currentYear} as the present year.

${competitorContext}
${icpSection}
${brandVoiceSection}

OUTLINE REQUIREMENTS:
1. Build the outline to BEAT all competitors \u2014 not just match them
2. Create ${numSections} main H2 sections plus a FAQ section with ${numFaqs} questions
3. Include an introduction that establishes the primary topic within the first 120 words
4. Every consensus topic MUST have a dedicated section or subsection
5. Entity gaps should be covered in dedicated sections (this is your competitive edge)
6. Unique topics from individual competitors should be selectively included where they add genuine value
7. Target word count: ${targetWordCount} words
8. Include a conclusion section last
9. Each section should have 2-4 specific, actionable key points \u2014 not generic filler
10. Structure for maximum GEO/AI extractability: concise definitions, clear Q&A format, clean headings

Return a JSON object with:
- "title": A compelling, SEO-optimized article title
- "sections": An array of sections, each with:
  - "id": A unique string ID (format "s1", "s2", etc.)
  - "heading": The section heading text
  - "type": "h2" for main sections
  - "points": Array of 2-4 key points to cover
  - "subSections": Array of sub-sections with same structure but type "h3"

Return ONLY valid JSON, no markdown code blocks.`;
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate an outline for the keyword: "${input.keyword}" that would outrank all ${input.analyses.length} competitors analyzed.` }
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "article_outline_from_competitors",
            strict: true,
            schema: {
              type: "object",
              properties: {
                title: { type: "string", description: "SEO-optimized article title" },
                sections: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "string" },
                      heading: { type: "string" },
                      type: { type: "string", enum: ["h2", "h3"] },
                      points: { type: "array", items: { type: "string" } },
                      subSections: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            id: { type: "string" },
                            heading: { type: "string" },
                            type: { type: "string", enum: ["h2", "h3"] },
                            points: { type: "array", items: { type: "string" } }
                          },
                          required: ["id", "heading", "type", "points"],
                          additionalProperties: false
                        }
                      },
                      targetWordCount: { type: "integer", description: "Target word count for this section" }
                    },
                    required: ["id", "heading", "type", "points", "subSections", "targetWordCount"],
                    additionalProperties: false
                  }
                }
              },
              required: ["title", "sections"],
              additionalProperties: false
            }
          }
        }
      });
      const rawContent = response.choices[0]?.message?.content;
      if (!rawContent) throw new Error("No response from AI");
      const content = typeof rawContent === "string" ? rawContent : rawContent[0]?.text ?? "";
      const parsed = extractJSON(content);
      if (!parsed) throw new Error("Failed to parse outline from AI response");
      const outline = await createOutline({
        title: parsed.title,
        keyword: input.keyword,
        sections: parsed.sections,
        settings: {
          contentType: "blog",
          targetWordCount: input.targetWordCount,
          numSections: input.numSections,
          numFaqs: input.numFaqs,
          additionalInstructions: `Generated from competitor analysis of ${input.analyses.length} URLs. Covers all consensus topics and fills entity gaps.`
        },
        projectId: input.projectId,
        userId: 1
      });
      return outline;
    }),
    // ---- Keyword Research (Keywords Everywhere API) ----
    /** Search for a keyword and get related keywords with full metrics */
    keywordResearch: publicProcedure.input(z2.object({
      keyword: z2.string().min(1).max(200),
      numRelated: z2.number().min(1).max(100).default(10),
      country: z2.string().default("us"),
      currency: z2.string().default("usd"),
      dataSource: z2.enum(["gkp", "cli"]).default("cli")
    })).mutation(async ({ input }) => {
      const { getRelatedKeywords: getRelatedKeywords2, getKeywordData: getKeywordData2 } = await Promise.resolve().then(() => (init_keywords_everywhere(), keywords_everywhere_exports));
      const apiKey = (await Promise.resolve().then(() => (init_env(), env_exports))).ENV.keywordsEverywhereApiKey;
      if (!apiKey) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Keywords Everywhere API key not configured" });
      const relatedRes = await getRelatedKeywords2(apiKey, input.keyword, input.numRelated);
      const relatedKeywords = relatedRes.data || [];
      let totalCreditsConsumed = relatedRes.credits_consumed || 0;
      const allKeywords = [input.keyword, ...relatedKeywords.filter((k) => k.toLowerCase() !== input.keyword.toLowerCase())];
      const metricsRes = await getKeywordData2(apiKey, allKeywords, {
        country: input.country,
        currency: input.currency,
        dataSource: input.dataSource
      });
      totalCreditsConsumed += metricsRes.credits_consumed || 0;
      const seedLower = input.keyword.toLowerCase();
      const results = (metricsRes.data || []).map((kw) => {
        const isSeed = kw.keyword.toLowerCase() === seedLower;
        const trend = kw.trend || [];
        let trendDirection = "stable";
        if (trend.length >= 4) {
          const recent = trend.slice(-3);
          const earlier = trend.slice(-6, -3);
          const recentAvg = recent.reduce((s, t2) => s + t2.value, 0) / recent.length;
          const earlierAvg = earlier.length > 0 ? earlier.reduce((s, t2) => s + t2.value, 0) / earlier.length : recentAvg;
          if (earlierAvg > 0) {
            const change = (recentAvg - earlierAvg) / earlierAvg;
            if (change > 0.15) trendDirection = "rising";
            else if (change < -0.15) trendDirection = "declining";
          }
        }
        let competitionLabel = "Low";
        if (kw.competition >= 0.66) competitionLabel = "High";
        else if (kw.competition >= 0.33) competitionLabel = "Medium";
        return {
          keyword: kw.keyword,
          type: isSeed ? "seed" : "related",
          volume: kw.vol,
          cpc: parseFloat(kw.cpc?.value || "0"),
          cpcCurrency: kw.cpc?.currency || "$",
          competition: kw.competition,
          competitionLabel,
          trendDirection,
          trendData: trend.map((t2) => ({ month: t2.month, year: t2.year, value: t2.value }))
        };
      });
      return {
        results,
        seedKeyword: input.keyword,
        totalResults: allKeywords.length,
        creditsConsumed: totalCreditsConsumed,
        creditsRemaining: metricsRes.credits ?? null
      };
    }),
    /** Get Keywords Everywhere credit balance */
    getKeCredits: publicProcedure.query(async () => {
      const { getCreditBalance: getCreditBalance2 } = await Promise.resolve().then(() => (init_keywords_everywhere(), keywords_everywhere_exports));
      const apiKey = (await Promise.resolve().then(() => (init_env(), env_exports))).ENV.keywordsEverywhereApiKey;
      if (!apiKey) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Keywords Everywhere API key not configured" });
      const credits = await getCreditBalance2(apiKey);
      return { credits };
    }),
    // ---- Project Keywords (Save / Manage) ----
    /** Save selected keywords from research to a project */
    saveKeywordsToProject: publicProcedure.input(z2.object({
      projectId: z2.number(),
      keywords: z2.array(z2.object({
        keyword: z2.string(),
        volume: z2.number().default(0),
        cpc: z2.number().default(0),
        competition: z2.number().default(0),
        competitionLabel: z2.enum(["Low", "Medium", "High"]).default("Low"),
        trendDirection: z2.enum(["rising", "declining", "stable"]).default("stable"),
        trendData: z2.array(z2.object({ month: z2.string(), year: z2.number(), value: z2.number() })).optional()
      })),
      source: z2.string().default("keyword-research")
    })).mutation(async ({ input }) => {
      const rows = input.keywords.map((kw) => {
        const { priority, priorityLabel } = calculateKeywordPriority(kw.volume, kw.competition, kw.cpc);
        return {
          projectId: input.projectId,
          keyword: kw.keyword,
          volume: kw.volume,
          cpc: kw.cpc,
          competition: kw.competition,
          competitionLabel: kw.competitionLabel,
          trendDirection: kw.trendDirection,
          trendData: kw.trendData ?? null,
          priority,
          priorityLabel,
          source: input.source,
          userId: 1
        };
      });
      const result = await addProjectKeywordsBulk(rows);
      await matchKeywordsToArticles(input.projectId);
      return result;
    }),
    /** Get all keywords for a project with search/sort */
    getProjectKeywords: publicProcedure.input(z2.object({
      projectId: z2.number(),
      search: z2.string().optional(),
      sortBy: z2.string().optional(),
      sortDir: z2.enum(["asc", "desc"]).optional()
    })).query(async ({ input }) => {
      const keywords = await getProjectKeywordsList(input.projectId, input.search, input.sortBy, input.sortDir);
      const stats = await getProjectKeywordsCount(input.projectId);
      return { keywords, ...stats };
    }),
    /** Bulk delete project keywords */
    deleteProjectKeywords: publicProcedure.input(z2.object({ ids: z2.array(z2.number()).min(1) })).mutation(async ({ input }) => {
      await deleteProjectKeywordsBulk(input.ids);
      return { deleted: input.ids.length };
    }),
    /** Update page URL for a keyword */
    updateKeywordPage: publicProcedure.input(z2.object({ id: z2.number(), pageUrl: z2.string().nullable() })).mutation(async ({ input }) => {
      await updateProjectKeywordPage(input.id, input.pageUrl);
      return { success: true };
    }),
    /** Add keywords manually (typed in by user) */
    addKeywordsManually: publicProcedure.input(z2.object({
      projectId: z2.number(),
      keywords: z2.array(z2.string().min(1)).min(1)
    })).mutation(async ({ input }) => {
      let enrichedRows = [];
      try {
        const { getKeywordData: getKeywordData2 } = await Promise.resolve().then(() => (init_keywords_everywhere(), keywords_everywhere_exports));
        const apiKey = (await Promise.resolve().then(() => (init_env(), env_exports))).ENV.keywordsEverywhereApiKey;
        if (apiKey) {
          const data = await getKeywordData2(apiKey, input.keywords, { country: "us", currency: "USD", dataSource: "cli" });
          enrichedRows = data.data.map((d) => {
            const comp = d.competition ?? 0;
            const compLabel = comp >= 0.67 ? "High" : comp >= 0.33 ? "Medium" : "Low";
            const trend = d.trend ?? [];
            let trendDir = "stable";
            if (trend.length >= 2) {
              const recent = trend.slice(-3).reduce((s, t2) => s + (t2.value ?? 0), 0) / 3;
              const older = trend.slice(0, 3).reduce((s, t2) => s + (t2.value ?? 0), 0) / 3;
              if (recent > older * 1.15) trendDir = "rising";
              else if (recent < older * 0.85) trendDir = "declining";
            }
            const { priority, priorityLabel } = calculateKeywordPriority(d.vol ?? 0, comp, d.cpc?.value ?? 0);
            return {
              projectId: input.projectId,
              keyword: d.keyword,
              volume: d.vol ?? 0,
              cpc: d.cpc?.value ?? 0,
              competition: comp,
              competitionLabel: compLabel,
              trendDirection: trendDir,
              trendData: trend,
              priority,
              priorityLabel,
              source: "manual",
              userId: 1
            };
          });
        }
      } catch (e) {
        console.warn("[ProjectKeywords] Failed to enrich manual keywords with KE data:", e);
      }
      if (enrichedRows.length === 0) {
        enrichedRows = input.keywords.map((kw) => ({
          projectId: input.projectId,
          keyword: kw,
          volume: 0,
          cpc: 0,
          competition: 0,
          competitionLabel: "Low",
          trendDirection: "stable",
          trendData: null,
          priority: 0,
          priorityLabel: "Low",
          source: "manual",
          userId: 1
        }));
      }
      const result = await addProjectKeywordsBulk(enrichedRows);
      await matchKeywordsToArticles(input.projectId);
      return result;
    }),
    /** Import keywords from CSV/TXT content (parsed on client, sent as array) */
    importKeywords: publicProcedure.input(z2.object({
      projectId: z2.number(),
      keywords: z2.array(z2.object({
        keyword: z2.string(),
        volume: z2.number().optional(),
        cpc: z2.number().optional(),
        competition: z2.number().optional(),
        kd: z2.number().optional(),
        position: z2.number().optional()
      }))
    })).mutation(async ({ input }) => {
      const needsEnrichment = input.keywords.filter((k) => !k.volume || k.volume === 0);
      const hasData = input.keywords.filter((k) => k.volume && k.volume > 0);
      let enrichedMap = {};
      if (needsEnrichment.length > 0) {
        try {
          const { getKeywordData: getKeywordData2 } = await Promise.resolve().then(() => (init_keywords_everywhere(), keywords_everywhere_exports));
          const apiKey = (await Promise.resolve().then(() => (init_env(), env_exports))).ENV.keywordsEverywhereApiKey;
          if (apiKey) {
            const data = await getKeywordData2(apiKey, needsEnrichment.map((k) => k.keyword), { country: "us", currency: "USD", dataSource: "cli" });
            for (const d of data.data) {
              enrichedMap[d.keyword.toLowerCase()] = d;
            }
          }
        } catch (e) {
          console.warn("[ProjectKeywords] Failed to enrich imported keywords:", e);
        }
      }
      const rows = input.keywords.map((kw) => {
        const enriched = enrichedMap[kw.keyword.toLowerCase()];
        const vol = kw.volume || enriched?.vol || 0;
        const cpc = kw.cpc || enriched?.cpc?.value || 0;
        const comp = kw.competition || enriched?.competition || 0;
        const compLabel = comp >= 0.67 ? "High" : comp >= 0.33 ? "Medium" : "Low";
        const trend = enriched?.trend ?? [];
        let trendDir = "stable";
        if (trend.length >= 2) {
          const recent = trend.slice(-3).reduce((s, t2) => s + (t2.value ?? 0), 0) / 3;
          const older = trend.slice(0, 3).reduce((s, t2) => s + (t2.value ?? 0), 0) / 3;
          if (recent > older * 1.15) trendDir = "rising";
          else if (recent < older * 0.85) trendDir = "declining";
        }
        const { priority, priorityLabel } = calculateKeywordPriority(vol, comp, cpc);
        return {
          projectId: input.projectId,
          keyword: kw.keyword,
          volume: vol,
          cpc,
          competition: comp,
          competitionLabel: compLabel,
          trendDirection: trendDir,
          trendData: trend.length > 0 ? trend : null,
          kd: kw.kd ?? null,
          position: kw.position ?? null,
          priority,
          priorityLabel,
          source: "import",
          userId: 1
        };
      });
      const result = await addProjectKeywordsBulk(rows);
      await matchKeywordsToArticles(input.projectId);
      return result;
    })
  }),
  grading: router({
    /** Standalone content grader — paste any content, 4-category 85-point system */
    gradeContent: publicProcedure.input(z2.object({ content: z2.string().min(50, "Content must be at least 50 characters") })).mutation(async ({ input }) => {
      const systemPrompt = `You are an expert content analyst specializing in GEO (Generative Engine Optimization) and AI search readiness. Analyze the provided content and grade it across these 4 weighted categories:

1. E-E-A-T Trust Package (30% weight):
   - Author credentials and expertise signals
   - Citations to studies/data and authoritative sources
   - First-hand experience indicators
   - Expert validation signals
   Score 0-30 points.

2. Accuracy (25% weight):
   - Factual correctness of claims
   - Proper sourcing for statistics and data
   - Avoidance of speculation presented as fact
   - Verifiable information
   Score 0-25 points.

3. AIO Answer Readiness (20% weight):
   - Direct, concise answers to likely questions
   - Structured content that AI can easily extract
   - Clear definitions and explanations
   - FAQ-style content where appropriate
   Score 0-20 points.

4. Readability & UX (10% weight):
   - Clear sentence structure
   - Appropriate paragraph length
   - Logical flow and transitions
   - Scannable formatting
   Score 0-10 points.

Note: Remaining 15% is reserved for technical factors not assessed here.

For EACH category, provide:
- A score (out of the max for that category)
- The weight percentage label
- A detailed 2-3 sentence analysis explaining what the content does well and what it lacks in this category. Be specific \u2014 reference actual content elements, not generic observations.
- 3-4 specific, actionable improvements. Each improvement should be concrete enough to act on immediately (e.g., "Add author bio with relevant healthcare/insurance credentials" not "Improve trust signals").

Also provide:
- keyStrengths: 3 specific things the content does well (with checkmarks)
- keyWeaknesses: 2-3 specific weaknesses (with X marks)
- penalties: any penalties applied (e.g., "Unverified statistics presented as fact")
- prioritizedActions: top 3 most impactful corrective actions, numbered by priority

CITATION SUGGESTION RULES:
- Across ALL categories combined, suggest MAXIMUM 2 citation-related improvements total.
- Consolidate citation suggestions into the single most impactful one.

Respond in this exact JSON format:
{
  "totalScore": <number 0-85>,
  "gradeBand": "<A|A-|B+|B|B-|C+|C|D|F>",
  "categories": {
    "eeatTrust": {
      "score": <number 0-30>,
      "maxScore": 30,
      "weight": "35%",
      "label": "E-E-A-T Trust Package",
      "analysis": "<detailed 2-3 sentence analysis>",
      "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>", "<specific improvement 4>"]
    },
    "accuracy": {
      "score": <number 0-25>,
      "maxScore": 25,
      "weight": "29%",
      "label": "Accuracy",
      "analysis": "<detailed 2-3 sentence analysis>",
      "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>", "<specific improvement 4>"]
    },
    "aioReadiness": {
      "score": <number 0-20>,
      "maxScore": 20,
      "weight": "24%",
      "label": "AIO Answer Readiness",
      "analysis": "<detailed 2-3 sentence analysis>",
      "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>", "<specific improvement 4>"]
    },
    "readability": {
      "score": <number 0-10>,
      "maxScore": 10,
      "weight": "12%",
      "label": "Readability & UX",
      "analysis": "<detailed 2-3 sentence analysis>",
      "improvements": ["<specific improvement 1>", "<specific improvement 2>", "<specific improvement 3>", "<specific improvement 4>"]
    }
  },
  "keyStrengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "keyWeaknesses": ["<weakness 1>", "<weakness 2>"],
  "penalties": ["<penalty if any, or empty array>"],
  "prioritizedActions": ["<action 1>", "<action 2>", "<action 3>"]
}`;
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Grade this content:

${input.content}` }
        ]
      });
      const llmResponse = response.choices?.[0]?.message?.content || "";
      const gradeResult = extractJSON(llmResponse);
      if (!gradeResult) throw new Error("Failed to parse grading response");
      return gradeResult;
    }),
    /** Per-article grader — 6+2 categories with Brand Voice + ICP conditional scoring */
    gradeArticle: publicProcedure.input(z2.object({ articleId: z2.number() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [article] = await db.select().from(articles).where(eq2(articles.id, input.articleId)).limit(1);
      if (!article) throw new Error("Article not found");
      const [project] = await db.select().from(projects).where(eq2(projects.id, article.projectId)).limit(1);
      const allVoices = project ? await db.select().from(brandVoices).where(eq2(brandVoices.projectId, project.id)) : [];
      const defaultBrandVoice = allVoices.find((bv) => bv.isDefault === 1) || allVoices[0] || null;
      const projectCitations = project ? await db.select().from(citationSources).where(eq2(citationSources.projectId, project.id)) : [];
      const hasICP = !!(project?.icpPrimaryName && project?.icpPains);
      const icpData = hasICP ? {
        name: project.icpPrimaryName,
        whoTheyAre: project.icpWhoTheyAre,
        pains: project.icpPains || [],
        goals: project.icpGoals || [],
        objections: project.icpObjections || []
      } : null;
      const parseToneTraits = (toneTraits) => {
        if (!toneTraits) return { primary: [], supporting: [] };
        if (toneTraits.includes("PRIMARY:") && toneTraits.includes("SUPPORTING:")) {
          const primaryMatch = toneTraits.match(/PRIMARY:([^|]+)/);
          const supportingMatch = toneTraits.match(/SUPPORTING:(.+)/);
          return {
            primary: primaryMatch ? primaryMatch[1].split(",").map((t2) => t2.trim()).filter(Boolean) : [],
            supporting: supportingMatch ? supportingMatch[1].split(",").map((t2) => t2.trim()).filter(Boolean) : []
          };
        }
        return { primary: toneTraits.split(",").map((t2) => t2.trim()).filter(Boolean), supporting: [] };
      };
      const AVOID_LABELS = {
        jargon: "Industry jargon and technical terms",
        salesy: "Salesy or promotional language",
        fear: "Fear tactics or scare language",
        superlatives: "Superlatives and exaggerations",
        passive: "Passive voice",
        cliches: "Clich\xE9s and overused phrases",
        firstPerson: "First person (I/me/my)",
        humor: "Humor or jokes",
        slang: "Slang or informal language",
        questions: "Rhetorical questions"
      };
      const parseAvoidList = (avoidList) => {
        if (!avoidList) return [];
        if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
          const items = [];
          const presetsMatch = avoidList.match(/PRESETS:([^|]*)/);
          const customMatch = avoidList.match(/CUSTOM:(.+)/);
          if (presetsMatch?.[1]) {
            presetsMatch[1].split(",").filter(Boolean).forEach((id) => {
              if (AVOID_LABELS[id]) items.push(AVOID_LABELS[id]);
            });
          }
          if (customMatch?.[1]) {
            items.push(...customMatch[1].split(",").map((t2) => t2.trim()).filter(Boolean));
          }
          return items;
        }
        return avoidList.split(",").map((t2) => t2.trim()).filter(Boolean);
      };
      let citationSourcesSection = "";
      if (projectCitations.length > 0) {
        const sourcesList = projectCitations.map((c, i) => {
          let entry = `  ${i + 1}. ${c.name} \u2014 ${c.url}`;
          if (c.description) entry += ` (${c.description})`;
          if (c.category) entry += ` [Category: ${c.category}]`;
          return entry;
        }).join("\n");
        citationSourcesSection = `
AVAILABLE CITATION SOURCES (use ONLY these exact URLs):
${sourcesList}

CITATION QUALITY RULES (MANDATORY):
1. URL USAGE: You MUST use ONLY the exact URLs listed above when suggesting citations. Do NOT invent, fabricate, or construct URLs. Do NOT append path segments or guess at page paths. Use the URL exactly as listed. If no listed URL is relevant to a claim, do NOT suggest a citation for that claim.

2. ANCHOR TEXT: Must be 2-7 words maximum. NEVER wrap an entire sentence or clause as anchor text. The anchor text should be ONLY the specific factual claim or key phrase being cited. Examples:
   - BAD: "<a href="...">54% of all Medicare beneficiaries are now enrolled in a Medicare Advantage Plan</a>" (too long)
   - BAD: "Learn more at <a href="...">Medicare.gov</a>" (generic)
   - GOOD: "<a href="...">54% of beneficiaries</a> are now enrolled"
   - GOOD: "the deductible is <a href="...">$257 in 2026</a>"

3. When suggesting citation improvements, specify EXACTLY which sentence/claim needs the citation, which source to use, and remind that the URL must be used exactly as listed above.`;
      }
      let brandVoiceSection = "";
      let brandVoiceGradingCriteria = "";
      if (defaultBrandVoice) {
        const tones = parseToneTraits(defaultBrandVoice.toneTraits);
        const avoidItems = parseAvoidList(defaultBrandVoice.avoidList);
        brandVoiceSection = `
BRAND VOICE REFERENCE (for Brand Voice Alignment scoring):
- Voice Name: ${defaultBrandVoice.name}
- Primary Tone Traits: ${tones.primary.join(", ") || "Not specified"}
- Supporting Tone Traits: ${tones.supporting.join(", ") || "Not specified"}
- Perspective: ${defaultBrandVoice.perspective === "first" ? "First person (we/our)" : defaultBrandVoice.perspective === "second" ? "Second person (you/your)" : "Third person"}
- Sentence Style: ${defaultBrandVoice.sentenceStyle === "short" ? "Short and concise" : defaultBrandVoice.sentenceStyle === "detailed" ? "Detailed and explanatory" : "Mixed/varied"}
- Things to Avoid: ${avoidItems.length > 0 ? avoidItems.join(", ") : "None specified"}${defaultBrandVoice.writingStyleSample ? `
- Writing Style Sample:
"""${defaultBrandVoice.writingStyleSample.substring(0, 500)}"""` : ""}`;
        brandVoiceGradingCriteria = `
7. BRAND VOICE ALIGNMENT (10 points) - ONLY SCORE THIS IF BRAND VOICE IS PROVIDED
- Tone Consistency: Does the content maintain the specified primary and supporting tone traits throughout?
- Perspective Adherence: Is the correct grammatical perspective (first/second/third person) used consistently?
- Sentence Style Match: Does the sentence structure match the specified style (short/mixed/detailed)?
- Avoidance Compliance: Does the content successfully avoid the listed items to avoid?
- Overall Voice Match: Does the content feel like it was written with the brand voice in mind?`;
      }
      let icpSection = "";
      let icpGradingCriteria = "";
      if (icpData) {
        icpSection = `
ICP (IDEAL CUSTOMER PROFILE) REFERENCE (for ICP Alignment scoring):
- Target Audience: ${icpData.name}
- Who They Are: ${icpData.whoTheyAre || "Not specified"}
- Pain Points: ${icpData.pains.slice(0, 5).join("; ") || "Not specified"}
- Goals: ${icpData.goals.slice(0, 5).join("; ") || "Not specified"}
- Common Objections: ${icpData.objections.slice(0, 5).join("; ") || "Not specified"}`;
        icpGradingCriteria = `
8. ICP ALIGNMENT (10 points) - ONLY SCORE THIS IF ICP IS PROVIDED
- Pain Point Addressing: Does the content directly address the target audience's pain points?
- Goal Alignment: Does the content help readers achieve their stated goals?
- Objection Handling: Does the content proactively address common objections or concerns?
- Audience Resonance: Would the target audience (${icpData.name}) feel this content was written specifically for them?
- Language Match: Does the vocabulary and complexity level match the target audience?`;
      }
      const basePoints = 100;
      const brandVoicePoints = defaultBrandVoice ? 10 : 0;
      const icpPoints = hasICP ? 10 : 0;
      const totalPoints = basePoints + brandVoicePoints + icpPoints;
      const systemPrompt = `You are the GEO Content Grader \u2014 a precise, analytical grading system that evaluates content for GEO (Generative Engine Optimization) and AIO (AI Overview) readiness. You prioritize factual accuracy, trust signals, and AI extractability over stylistic polish.
${citationSourcesSection}
${brandVoiceSection}
${icpSection}

WEIGHTING MODEL (Total: ${totalPoints} points):
- E-E-A-T Trust Package: 30% (30 points max)
- Accuracy: 25% (25 points max)
- AIO Answer Readiness: 20% (20 points max)
- Readability & UX: 10% (10 points max)
- SEO and Entity Coverage: 10% (10 points max)
- Risk Hygiene: 5% (5 points max)${defaultBrandVoice ? "\n- Brand Voice Alignment: 10% (10 points max)" : ""}${hasICP ? "\n- ICP Alignment: 10% (10 points max)" : ""}

GRADING CRITERIA:

1. E-E-A-T TRUST PACKAGE (30 points)
- Experience: First-hand experience signals, personal insights, practical examples
- Expertise: Author credentials, technical depth, industry knowledge demonstrated
- Authoritativeness: Citations to authoritative sources, references to studies/data
- Trustworthiness: Transparency, balanced perspectives, acknowledgment of limitations

2. ACCURACY (25 points)
- Factual correctness and verifiability
- Claims supported by evidence or citations
- No contradictions or misleading statements
- Data/statistics are current and properly sourced
- Defensibility of assertions made

3. AIO ANSWER READINESS (20 points)
- Clear, extractable answers to implied questions
- Concise definitions and explanations
- Well-structured for AI parsing (lists, tables, clear headers)
- Direct answers near the beginning of sections
- Citation-ready snippets that AI can quote

4. READABILITY & UX (10 points)
- Sentence clarity and scannability
- Appropriate reading level for target audience
- Effective use of formatting (bullets, bold, whitespace)
- Logical flow and transitions

5. SEO AND ENTITY COVERAGE (10 points)
- Primary keyword optimization
- Entity coverage (people, places, concepts properly named)
- Internal/external linking opportunities
- Schema markup potential
- Search intent alignment

6. RISK HYGIENE (5 points)
- No manipulative or misleading patterns
- No unsupported superlatives or exaggerations
- No clickbait tactics
- Proper disclosure of limitations/caveats
- No AI-detectable spam patterns
${brandVoiceGradingCriteria}
${icpGradingCriteria}

CITATION SUGGESTION RULES (CRITICAL):
- Across ALL categories combined, you may suggest MAXIMUM 2 citation-related improvements total
- "Citation-related" includes: adding sources, adding references, citing data, adding authoritative links
- If E-E-A-T already suggests a citation improvement, do NOT suggest more in Accuracy or SEO
- Consolidate citation suggestions into the SINGLE most impactful one
- For Accuracy: focus on factual verification suggestions, NOT on adding more source links
- For SEO: focus on keyword/entity coverage, NOT on external linking
- NEVER suggest "Add 2-3 citations" \u2014 always suggest ONE specific citation placement

SCORING INSTRUCTIONS:
- Score each category based on its maximum points (not 0-100)
- For items scoring below 30% of their max, provide a specific improvement example
- Be strict but fair \u2014 reward citation-ready, accurate, AI-extractable content
${defaultBrandVoice ? "- Include brandVoiceAlignment in response ONLY if brand voice reference was provided above" : "- Do NOT include brandVoiceAlignment in response (no brand voice defined)"}
${hasICP ? "- Include icpAlignment in response ONLY if ICP reference was provided above" : "- Do NOT include icpAlignment in response (no ICP defined)"}

For EACH category, provide:
- A score (out of the max for that category)
- The weight percentage label
- A detailed 2-3 sentence analysis explaining what the content does well and what it lacks. Be specific \u2014 reference actual content elements.
- 3-4 specific, actionable improvements. Each improvement should be concrete enough to act on immediately.

Also provide:
- keyStrengths: 3 specific things the content does well
- keyWeaknesses: 2-3 specific weaknesses
- penalties: any penalties applied (e.g., "Unverified statistics presented as fact"), or empty array
- prioritizedActions: top 3 most impactful corrective actions, numbered by priority

RESPONSE FORMAT - Respond ONLY with valid JSON:
{
  "eeatTrust": { "score": <0-30>, "maxScore": 30, "weight": "30%", "label": "E-E-A-T Trust Package", "analysis": "<detailed 2-3 sentence analysis>", "improvements": ["...", "...", "..."] },
  "accuracy": { "score": <0-25>, "maxScore": 25, "weight": "25%", "label": "Accuracy", "analysis": "<detailed 2-3 sentence analysis>", "improvements": ["...", "...", "..."] },
  "aioReadiness": { "score": <0-20>, "maxScore": 20, "weight": "20%", "label": "AIO Answer Readiness", "analysis": "<detailed 2-3 sentence analysis>", "improvements": ["...", "...", "..."] },
  "readabilityUx": { "score": <0-10>, "maxScore": 10, "weight": "10%", "label": "Readability & UX", "analysis": "<detailed 2-3 sentence analysis>", "improvements": ["...", "...", "..."] },
  "seoEntityCoverage": { "score": <0-10>, "maxScore": 10, "weight": "10%", "label": "SEO & Entity Coverage", "analysis": "<detailed 2-3 sentence analysis>", "improvements": ["...", "...", "..."] },
  "riskHygiene": { "score": <0-5>, "maxScore": 5, "weight": "5%", "label": "Risk Hygiene", "analysis": "<detailed 2-3 sentence analysis>", "improvements": ["...", "...", "..."] },${defaultBrandVoice ? `
  "brandVoiceAlignment": { "score": <0-10>, "maxScore": 10, "weight": "10%", "label": "Brand Voice Alignment", "analysis": "<detailed 2-3 sentence analysis>", "improvements": ["...", "...", "..."] },` : ""}${hasICP ? `
  "icpAlignment": { "score": <0-10>, "maxScore": 10, "weight": "10%", "label": "ICP Alignment", "analysis": "<detailed 2-3 sentence analysis>", "improvements": ["...", "...", "..."] },` : ""}
  "totalScore": <number>,
  "gradeBand": "<A|A-|B+|B|B-|C+|C|D|F>",
  "keyStrengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "keyWeaknesses": ["<weakness 1>", "<weakness 2>"],
  "penalties": ["<penalty if any, or empty array>"],
  "prioritizedActions": ["<action 1>", "<action 2>", "<action 3>"]
}`;
      const userPrompt = `Grade this article:

Title: ${article.title}
Keyword: ${article.keyword || "Not specified"}

Content:
${article.content}`;
      const response = await callLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      }, article.projectId);
      const llmResponse = response.choices?.[0]?.message?.content || "";
      const raw = extractJSON(llmResponse);
      if (!raw) throw new Error("Failed to parse grading response");
      const categoryKeys = ["eeatTrust", "accuracy", "aioReadiness", "readabilityUx", "seoEntityCoverage", "riskHygiene", "brandVoiceAlignment", "icpAlignment"];
      const categories = {};
      for (const k of categoryKeys) {
        if (raw[k] && typeof raw[k] === "object" && typeof raw[k].score === "number") {
          categories[k] = {
            score: raw[k].score,
            maxScore: raw[k].maxScore,
            weight: raw[k].weight || "",
            label: raw[k].label || k,
            analysis: raw[k].analysis || raw[k].reason || "",
            improvements: raw[k].improvements || []
          };
        }
      }
      const grades = {
        totalScore: raw.totalScore || 0,
        maxPossible: totalPoints,
        gradeBand: raw.gradeBand || "",
        categories,
        keyStrengths: raw.keyStrengths || [],
        keyWeaknesses: raw.keyWeaknesses || [],
        penalties: raw.penalties || [],
        prioritizedActions: raw.prioritizedActions || []
      };
      return {
        grades,
        hasBrandVoice: !!defaultBrandVoice,
        brandVoiceName: defaultBrandVoice?.name || null,
        hasICP,
        icpName: icpData?.name || null
      };
    }),
    /** Apply selected improvements from a grade to an article — surgical section-level editing */
    applyImprovements: publicProcedure.input(z2.object({
      articleId: z2.number(),
      categoryKey: z2.string(),
      categoryLabel: z2.string(),
      selectedImprovements: z2.array(z2.string()).min(1)
    })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [article] = await db.select().from(articles).where(eq2(articles.id, input.articleId)).limit(1);
      if (!article) throw new Error("Article not found");
      let brandVoiceSection = "";
      const [project] = article.projectId ? await db.select().from(projects).where(eq2(projects.id, article.projectId)).limit(1) : [null];
      if (project) {
        const allVoices = await db.select().from(brandVoices).where(eq2(brandVoices.projectId, project.id));
        const bv = allVoices.find((v) => v.isDefault === 1) || allVoices[0];
        if (bv) {
          const perspectiveMap = {
            first: "first person (we/our/us)",
            second: "second person (you/your)",
            third: "third person (they/the company)"
          };
          brandVoiceSection = `
BRAND VOICE (maintain this tone in all improvements):
- Tone: ${bv.toneTraits}
- Perspective: ${perspectiveMap[bv.perspective] || bv.perspective}${bv.avoidList ? `
- Avoid: ${bv.avoidList}` : ""}`;
        }
      }
      let citationSourcesSection = "";
      if (project) {
        const projectCitations = await db.select().from(citationSources).where(eq2(citationSources.projectId, project.id));
        if (projectCitations.length > 0) {
          const sourcesList = projectCitations.map((c, i) => {
            let entry = `  ${i + 1}. ${c.name} \u2014 ${c.url}`;
            if (c.description) entry += ` (${c.description})`;
            return entry;
          }).join("\n");
          citationSourcesSection = `
AVAILABLE CITATION SOURCES (use ONLY these exact URLs):
${sourcesList}

CITATION INSERTION RULES (MANDATORY):
1. URL USAGE: You MUST use ONLY the exact URLs listed above. Do NOT invent, fabricate, or construct URLs. If none of the listed URLs is relevant to a claim, do NOT add a citation link for that claim. NEVER guess at URL paths or append path segments.

2. ANCHOR TEXT: Must be 2-7 words maximum. NEVER wrap an entire sentence or clause as anchor text. The anchor text should be the specific factual claim or key phrase being cited. Examples:
   - BAD: "<a href="...">54% of all Medicare beneficiaries are now enrolled in a Medicare Advantage Plan</a>" (too long, entire clause)
   - BAD: "Learn more at <a href="...">Medicare.gov</a>" (generic)
   - GOOD: "<a href="...">54% of beneficiaries</a> are now enrolled"
   - GOOD: "the deductible is <a href="...">$257 in 2026</a>"

3. Place the <a> tag inline within the sentence, wrapping ONLY the key factual phrase (2-7 words).`;
        }
      }
      const improvementsList = input.selectedImprovements.map((imp, i) => `${i + 1}. ${imp}`).join("\n");
      const planPrompt = `You are an expert content editor. Given the article and the improvements to apply, identify the EXACT sections (paragraphs or sentences) that need to change.
${brandVoiceSection}
${citationSourcesSection}

For each improvement, identify:
1. The exact original text snippet that needs to be modified (copy it VERBATIM from the article \u2014 must be an exact match)
2. The replacement text with the improvement applied

Rules:
- CRITICAL: Select the SMALLEST possible text snippet \u2014 ideally a SINGLE SENTENCE. Never select a whole paragraph when only one sentence needs changing.
- For citation additions: the "original" should be ONLY the one sentence where the link will be inserted. The "replacement" should be that SAME sentence with the <a> tag added inline. Do NOT rewrite, rephrase, or restructure the sentence \u2014 only add the link tag around the relevant words.
- For wording improvements: the "original" should be ONLY the specific sentence(s) that need rewording. The "replacement" must keep all unchanged words identical.
- The "original" field must be an EXACT substring of the article content (character-for-character match)
- If an improvement requires adding NEW content (e.g., a new paragraph), set "original" to the single sentence AFTER which the new content should appear, and set "replacement" to that same sentence PLUS the new content appended
- If an improvement mentions adding sources/citations, use ONLY the exact URLs from the available citation sources listed above. NEVER invent or fabricate URLs. If no citation source URL is relevant, skip the link insertion entirely.
- ANCHOR TEXT LENGTH (CRITICAL): All link anchor text MUST be 2-7 words maximum. Count the words. If your anchor text is longer than 7 words, you MUST shorten it. NEVER wrap an entire sentence or clause as a link. Link ONLY the key factual phrase (e.g., "$257 in 2026" or "covers outpatient services").
- URL RULE: Use ONLY exact URLs from the citation sources list. Do NOT append path segments, do NOT guess at page paths, do NOT construct URLs. Use the URL exactly as listed.
- NEVER rewrite, rephrase, or restructure text that is not directly related to the improvement. If the improvement is "add a citation", the ONLY change should be adding an <a> tag \u2014 every other word must remain identical.
- NEVER add <strong>, <b>, <em>, or <i> tags to replacement text unless the original text already had them. Do NOT bold or emphasize changed text \u2014 the replacement must use the exact same formatting as the original.
- Output ONLY the same HTML structure as the original. NEVER introduce new HTML wrapper tags.
- Maintain the original tone, perspective, and formatting style

Respond with ONLY a JSON array:
[
  {
    "improvement": "<which improvement this addresses>",
    "original": "<exact verbatim text from the article to find>",
    "replacement": "<the replacement text with improvement applied>"
  }
]

Do NOT wrap in markdown code blocks. Return ONLY the JSON array.`;
      const userPrompt = `Apply these ${input.categoryLabel} improvements to the article:

===IMPROVEMENTS TO APPLY===
${improvementsList}
===END IMPROVEMENTS===

===FULL ARTICLE (for context only \u2014 do NOT rewrite the whole thing)===
${article.content}
===END ARTICLE===`;
      const llmResponse = await callLLM({
        messages: [
          { role: "system", content: planPrompt },
          { role: "user", content: userPrompt }
        ]
      });
      const rawResponse = llmResponse.choices?.[0]?.message?.content || "";
      let edits = [];
      try {
        const parsedEdits = extractJSON(rawResponse);
        if (parsedEdits && Array.isArray(parsedEdits)) {
          edits = parsedEdits;
        } else {
          throw new Error("No JSON array found");
        }
      } catch {
        throw new Error("Failed to parse improvement plan. Please try again.");
      }
      let improvedContent = article.content || "";
      let appliedCount = 0;
      for (const edit of edits) {
        if (!edit.original || !edit.replacement) continue;
        if (improvedContent.includes(edit.original)) {
          improvedContent = improvedContent.replace(edit.original, edit.replacement);
          appliedCount++;
        } else {
          const trimmedOriginal = edit.original.trim();
          if (trimmedOriginal && improvedContent.includes(trimmedOriginal)) {
            improvedContent = improvedContent.replace(trimmedOriginal, edit.replacement.trim());
            appliedCount++;
          }
        }
      }
      if (appliedCount === 0) {
        throw new Error("Could not match any sections in the article. Please try again.");
      }
      improvedContent = stripWrappingStrongTags(improvedContent);
      const allowedDomains = project ? (await db.select().from(citationSources).where(eq2(citationSources.projectId, project.id))).map((c) => {
        try {
          return new URL(c.url).hostname;
        } catch {
          return c.url;
        }
      }) : [];
      improvedContent = sanitizeInsertedLinks(improvedContent, allowedDomains);
      const wordCount = improvedContent.split(/\s+/).filter((w) => w.length > 0).length;
      await db.update(articles).set({
        content: improvedContent,
        wordCount
      }).where(eq2(articles.id, input.articleId));
      return {
        success: true,
        content: improvedContent,
        wordCount,
        appliedCount,
        category: input.categoryLabel
      };
    }),
    /** Apply selected improvements to raw content (standalone grader — surgical section-level editing) */
    applyContentImprovements: publicProcedure.input(z2.object({
      content: z2.string().min(10),
      categoryKey: z2.string(),
      categoryLabel: z2.string(),
      selectedImprovements: z2.array(z2.string()).min(1)
    })).mutation(async ({ input }) => {
      const improvementsList = input.selectedImprovements.map((imp, i) => `${i + 1}. ${imp}`).join("\n");
      const planPrompt = `You are an expert content editor. Given the content and the improvements to apply, identify the EXACT sections (paragraphs or sentences) that need to change.

For each improvement, identify:
1. The exact original text snippet that needs to be modified (copy it VERBATIM from the content \u2014 must be an exact match)
2. The replacement text with the improvement applied

Rules:
- CRITICAL: Select the SMALLEST possible text snippet \u2014 ideally a SINGLE SENTENCE. Never select a whole paragraph when only one sentence needs changing.
- For citation additions: the "original" should be ONLY the one sentence where the link will be inserted. The "replacement" should be that SAME sentence with the <a> tag added inline. Do NOT rewrite, rephrase, or restructure the sentence \u2014 only add the link tag around the relevant words.
- For wording improvements: the "original" should be ONLY the specific sentence(s) that need rewording. The "replacement" must keep all unchanged words identical.
- The "original" field must be an EXACT substring of the content (character-for-character match)
- If an improvement requires adding NEW content, set "original" to the single sentence AFTER which the new content should appear, and set "replacement" to that same sentence PLUS the new content appended
- When inserting citation links: ONLY link to URLs that are explicitly mentioned in the content or that you are 100% certain exist. NEVER invent or fabricate URLs. If you cannot provide a verified URL, do NOT insert a link \u2014 just make the text improvement without adding an <a> tag.
- ANCHOR TEXT LENGTH (CRITICAL): All link anchor text MUST be 2-7 words maximum. Count the words. If your anchor text is longer than 7 words, you MUST shorten it. NEVER wrap an entire sentence or clause as a link. Link ONLY the key factual phrase (e.g., "$257 in 2026" or "covers outpatient services").
- NEVER rewrite, rephrase, or restructure text that is not directly related to the improvement. If the improvement is "add a citation", the ONLY change should be adding an <a> tag \u2014 every other word must remain identical.
- NEVER add <strong>, <b>, <em>, or <i> tags to replacement text unless the original text already had them. Do NOT bold or emphasize changed text \u2014 the replacement must use the exact same formatting as the original.
- Output ONLY the same HTML structure as the original. NEVER introduce new HTML wrapper tags.
- Maintain the original tone, perspective, and formatting style

Respond with ONLY a JSON array:
[
  {
    "improvement": "<which improvement this addresses>",
    "original": "<exact verbatim text from the content to find>",
    "replacement": "<the replacement text with improvement applied>"
  }
]

Do NOT wrap in markdown code blocks. Return ONLY the JSON array.`;
      const userPrompt = `Apply these ${input.categoryLabel} improvements to the content:

===IMPROVEMENTS TO APPLY===
${improvementsList}
===END IMPROVEMENTS===

===FULL CONTENT (for context only \u2014 do NOT rewrite the whole thing)===
${input.content}
===END CONTENT===`;
      const llmResponse = await callLLM({
        messages: [
          { role: "system", content: planPrompt },
          { role: "user", content: userPrompt }
        ]
      });
      const rawResponse = (llmResponse.choices?.[0]?.message?.content || "").trim();
      let edits = [];
      try {
        const parsedEdits = extractJSON(rawResponse);
        if (parsedEdits && Array.isArray(parsedEdits)) {
          edits = parsedEdits;
        } else {
          throw new Error("No JSON array found");
        }
      } catch {
        throw new Error("Failed to parse improvement plan. Please try again.");
      }
      let improvedContent = input.content;
      let appliedCount = 0;
      for (const edit of edits) {
        if (!edit.original || !edit.replacement) continue;
        if (improvedContent.includes(edit.original)) {
          improvedContent = improvedContent.replace(edit.original, edit.replacement);
          appliedCount++;
        } else {
          const trimmedOriginal = edit.original.trim();
          if (trimmedOriginal && improvedContent.includes(trimmedOriginal)) {
            improvedContent = improvedContent.replace(trimmedOriginal, edit.replacement.trim());
            appliedCount++;
          }
        }
      }
      if (appliedCount === 0) {
        throw new Error("Could not match any sections in the content. Please try again.");
      }
      improvedContent = stripWrappingStrongTags(improvedContent);
      improvedContent = sanitizeInsertedLinks(improvedContent, []);
      return {
        success: true,
        content: improvedContent,
        appliedCount,
        category: input.categoryLabel
      };
    })
  }),
  // ─── GSC Analyzer ─────────────────────────────────────────────────────────
  gsc: router({
    /**
     * Upload and parse a GSC Excel file. Stores parsed data and computed categories in DB.
     * Accepts base64-encoded file content.
     */
    upload: publicProcedure.input(z2.object({
      projectId: z2.number(),
      fileName: z2.string(),
      fileBase64: z2.string()
      // base64-encoded xlsx file
    })).mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const buffer = Buffer.from(input.fileBase64, "base64");
      const parsed = parseGscExcel(buffer, input.fileName);
      const [result] = await db.insert(gscExports).values({
        fileName: parsed.fileName,
        dateRange: parsed.dateRange || null,
        totalQueries: parsed.totalQueries,
        totalPages: parsed.totalPages,
        queries: parsed.queries,
        pages: parsed.pages,
        chartData: parsed.chartData,
        nearJumpKeywords: parsed.nearJumpKeywords,
        highImpressionLowCtr: parsed.highImpressionLowCtr,
        quickWinKeywords: parsed.quickWinKeywords,
        zeroClickPages: parsed.zeroClickPages,
        cannibalizationGroups: parsed.cannibalizationGroups,
        projectId: input.projectId,
        userId: 1
      });
      const insertId = result.insertId;
      const [created] = await db.select().from(gscExports).where(eq2(gscExports.id, insertId));
      return created;
    }),
    /**
     * List all GSC exports for a project, newest first.
     */
    list: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      return db.select({
        id: gscExports.id,
        fileName: gscExports.fileName,
        dateRange: gscExports.dateRange,
        totalQueries: gscExports.totalQueries,
        totalPages: gscExports.totalPages,
        projectId: gscExports.projectId,
        createdAt: gscExports.createdAt
      }).from(gscExports).where(eq2(gscExports.projectId, input.projectId)).orderBy(desc2(gscExports.createdAt));
    }),
    /**
     * Get a single GSC export with full data.
     */
    getById: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [row] = await db.select().from(gscExports).where(eq2(gscExports.id, input.id));
      if (!row) throw new Error("GSC export not found");
      return row;
    }),
    /**
     * Delete a GSC export.
     */
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db.delete(gscExports).where(eq2(gscExports.id, input.id));
      return { success: true };
    }),
    /**
     * Get near-jump keywords with a custom position threshold.
     * Re-computes from the stored raw queries so the threshold can be changed client-side.
     */
    getNearJump: publicProcedure.input(z2.object({
      id: z2.number(),
      minPos: z2.number().default(5),
      maxPos: z2.number().default(30)
    })).query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [row] = await db.select({ queries: gscExports.queries }).from(gscExports).where(eq2(gscExports.id, input.id));
      if (!row) throw new Error("GSC export not found");
      return computeNearJump(row.queries ?? [], input.minPos, input.maxPos);
    }),
    /**
     * Analyze a single GSC keyword — fetches the page URL, gets KE metrics,
     * and runs AI analysis to produce specific ranking improvement recommendations.
     */
    analyzeKeyword: publicProcedure.input(z2.object({
      keyword: z2.string().min(1),
      pageUrl: z2.string().url("Please enter a valid URL"),
      // GSC metrics for context
      clicks: z2.number(),
      impressions: z2.number(),
      ctr: z2.number(),
      position: z2.number(),
      projectId: z2.number().optional(),
      tab: z2.string().optional()
      // which GSC tab the keyword came from
    })).mutation(async ({ input }) => {
      const { Readability } = await import("@mozilla/readability");
      const { parseHTML } = await import("linkedom");
      const { getKeywordData: getKeywordData2 } = await Promise.resolve().then(() => (init_keywords_everywhere(), keywords_everywhere_exports));
      const apiKey = (await Promise.resolve().then(() => (init_env(), env_exports))).ENV.keywordsEverywhereApiKey;
      const fetchPage = async () => {
        try {
          const resp = await fetch(input.pageUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; RankPilot/1.0; +https://rankpilot.app)",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5"
            },
            signal: AbortSignal.timeout(15e3),
            redirect: "follow"
          });
          if (!resp.ok) return { error: `HTTP ${resp.status}`, content: "", title: "", metaDescription: "", metaKeywords: "", wordCount: 0, headings: [] };
          const contentType = resp.headers.get("content-type") || "";
          if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
            return { error: "Not an HTML page", content: "", title: "", metaDescription: "", metaKeywords: "", wordCount: 0, headings: [] };
          }
          const html = await resp.text();
          const { document } = parseHTML(html);
          const pageTitle = document.querySelector("title")?.textContent?.trim() || "";
          const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
          const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute("content")?.trim() || "";
          const headings = [];
          document.querySelectorAll("h1, h2, h3").forEach((el) => {
            const text2 = el.textContent?.trim();
            const tag = el.tagName?.toLowerCase();
            if (text2) headings.push(`<${tag}>${text2}</${tag}>`);
          });
          const reader = new Readability(document, { charThreshold: 100 });
          const article = reader.parse();
          const cleanText = article?.textContent?.replace(/\s+/g, " ").trim() || "";
          const wordCount = cleanText.split(/\s+/).filter((w) => w.length > 0).length;
          return {
            error: null,
            content: cleanText.slice(0, 12e3),
            title: article?.title || pageTitle,
            metaDescription,
            metaKeywords,
            wordCount,
            headings: headings.slice(0, 30)
          };
        } catch (e) {
          return { error: e.message || "Failed to fetch", content: "", title: "", metaDescription: "", metaKeywords: "", wordCount: 0, headings: [] };
        }
      };
      const fetchKE = async () => {
        if (!apiKey) return null;
        try {
          const res = await getKeywordData2(apiKey, [input.keyword], { country: "us", currency: "USD", dataSource: "cli" });
          return res.data?.[0] ?? null;
        } catch {
          return null;
        }
      };
      const [pageData, keData] = await Promise.all([fetchPage(), fetchKE()]);
      const tabContext = input.tab ? `This keyword was found in the "${input.tab}" category of the GSC analysis.` : "";
      const keSection = keData ? `
KEYWORDS EVERYWHERE DATA:
- Monthly Search Volume: ${keData.vol.toLocaleString()}
- CPC: $${keData.cpc.value}
- Competition: ${keData.competition} (${keData.competition < 0.33 ? "Low" : keData.competition < 0.66 ? "Medium" : "High"})
- 12-Month Trend: ${keData.trend?.map((t2) => `${t2.month}/${t2.year}: ${t2.value}`).join(", ") || "N/A"}
` : "";
      const pageSection = pageData.error ? `
PAGE CONTENT: Could not fetch the page (${pageData.error}). Provide general recommendations based on the keyword and GSC data.
` : `
PAGE ANALYSIS:
- Current Title Tag: "${pageData.title}"
- Current Meta Description: "${pageData.metaDescription}"
- Meta Keywords: "${pageData.metaKeywords || "None"}"
- Word Count: ${pageData.wordCount}
- Heading Structure:
${pageData.headings.map((h) => `  ${h}`).join("\n")}

PAGE CONTENT (first ~12,000 chars):
---
${pageData.content}
---
`;
      const prompt = `You are an expert SEO consultant analyzing a keyword's ranking performance and providing specific, actionable recommendations to improve its position and visibility.

TARGET KEYWORD: "${input.keyword}"
PAGE URL: ${input.pageUrl}
${tabContext}

GOOGLE SEARCH CONSOLE DATA:
- Current Average Position: #${input.position.toFixed(1)}
- Impressions: ${input.impressions.toLocaleString()}
- Clicks: ${input.clicks}
- CTR: ${(input.ctr * 100).toFixed(1)}%
- Expected CTR for position #${Math.round(input.position)}: ~${getExpectedCtr(input.position)}%
- CTR Gap: ${(input.ctr * 100 - getExpectedCtr(input.position)).toFixed(1)}% (${input.ctr * 100 < getExpectedCtr(input.position) ? "BELOW expected \u2014 title/meta needs work" : "AT or ABOVE expected"})
${keSection}${pageSection}

Provide a comprehensive analysis in the following JSON format:
{
  "performanceAssessment": {
    "summary": "2-3 sentence assessment of current performance",
    "ctrVerdict": "below_expected | at_expected | above_expected",
    "positionBucket": "striking_distance | page_2 | page_3_plus",
    "opportunityLevel": "high | medium | low",
    "estimatedTrafficGain": "Estimated monthly traffic gain if moved to position X"
  },
  "titleTagRecommendation": {
    "current": "Current title tag",
    "suggested": "Improved title tag that better targets the keyword",
    "rationale": "Why this change will improve CTR and relevance"
  },
  "metaDescriptionRecommendation": {
    "current": "Current meta description",
    "suggested": "Improved meta description with compelling CTA",
    "rationale": "Why this change will improve CTR"
  },
  "contentGaps": [
    {
      "gap": "What's missing",
      "importance": "high | medium",
      "suggestion": "Specific content to add"
    }
  ],
  "contentRecommendations": [
    {
      "action": "Specific actionable change",
      "priority": "high | medium | low",
      "impact": "Expected impact description",
      "effort": "quick | moderate | significant"
    }
  ],
  "internalLinkingSuggestions": [
    {
      "suggestion": "Link suggestion description",
      "anchorText": "Suggested anchor text",
      "rationale": "Why this internal link helps"
    }
  ],
  "quickWins": [
    {
      "action": "Immediate action to take",
      "expectedImpact": "What improvement to expect",
      "timeToImplement": "minutes | hours | days"
    }
  ],
  "headingStructureRecommendation": {
    "issues": ["List of heading structure issues"],
    "suggestedH1": "Recommended H1 if current is suboptimal",
    "missingSections": ["Sections that should be added based on keyword intent"]
  },
  "entityRecommendations": {
    "primaryEntity": "The primary entity this page should focus on",
    "missingEntities": ["Entities that should be mentioned for topical authority"],
    "entityTip": "Brief tip on improving entity coverage"
  }
}

Respond with raw JSON only. No markdown, no code blocks.`;
      const llmResult = await callLLM({
        messages: [
          { role: "system", content: "You are an expert SEO analyst. Return only valid JSON." },
          { role: "user", content: prompt }
        ]
      }, input.projectId);
      const rawContent = llmResult?.choices?.[0]?.message?.content;
      const rawText = typeof rawContent === "string" ? rawContent : "";
      let analysis = null;
      try {
        analysis = extractJSON(rawText);
      } catch {
        analysis = { error: "Failed to parse AI response", rawText: rawText.slice(0, 500) };
      }
      return {
        keyword: input.keyword,
        pageUrl: input.pageUrl,
        gscMetrics: {
          clicks: input.clicks,
          impressions: input.impressions,
          ctr: input.ctr,
          position: input.position
        },
        keMetrics: keData ? {
          volume: keData.vol,
          cpc: parseFloat(keData.cpc.value),
          competition: keData.competition,
          competitionLabel: keData.competition < 0.33 ? "Low" : keData.competition < 0.66 ? "Medium" : "High",
          trend: keData.trend
        } : null,
        pageData: {
          title: pageData.title,
          metaDescription: pageData.metaDescription,
          wordCount: pageData.wordCount,
          headingCount: pageData.headings.length,
          fetchError: pageData.error
        },
        analysis
      };
    })
  }),
  // ---- Ideas Router ----
  ideas: router({
    /** Generate article ideas from a seed keyword using LLM */
    generate: publicProcedure.input(z2.object({
      seedKeyword: z2.string().min(1),
      contentTypes: z2.array(z2.string()).optional(),
      count: z2.number().min(3).max(20).optional(),
      customInstructions: z2.string().max(1e3).optional()
    })).mutation(async ({ input, ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED" });
      const { seedKeyword, contentTypes, count, customInstructions } = input;
      const ideaCount = count || 9;
      const contentTypeMap = {
        "how-to": "How-to Guides (Instructional, step-by-step tutorials)",
        "listicles": 'Listicles ("Top 10...", "5 Ways to...", numbered lists)',
        "faqs": "FAQs (Question-and-answer format)",
        "informative": "Informative (General educational content)",
        "local": "Local Guides (Geo-targeted, location-specific content)",
        "service": "Service Pages (Business/offering descriptions)",
        "problem-solution": "Problem-Solution (Pain point addressing articles)"
      };
      let contentTypeInstruction = "";
      if (contentTypes && contentTypes.length > 0) {
        const selectedTypes = contentTypes.map((id) => contentTypeMap[id] || id);
        contentTypeInstruction = `

IMPORTANT: Focus ONLY on these specific content types:
${selectedTypes.map((type, i) => `${i + 1}. ${type}`).join("\n")}

All generated ideas MUST match one of these content formats. Prioritize variety within these types.`;
      }
      let customInstructionsBlock = "";
      if (customInstructions && customInstructions.trim()) {
        customInstructionsBlock = `

USER INSTRUCTIONS (follow these carefully):
${customInstructions.trim()}`;
      }
      const systemPrompt = `You are an expert SEO content strategist. Generate high-value article ideas based on the provided seed keyword.

IMPORTANT: The current year is 2026. When creating titles or content that reference time periods, use 2026 (not 2024 or 2025).

For each idea, provide:
1. Article title (compelling and SEO-friendly)
2. Primary keyword/phrase
3. Search intent (informational, transactional, local, or navigational)
4. Estimated word count range
5. Key content angles to cover (3-5 angles)
6. Target audience
7. Ranking potential (high, medium, or low)
8. Brief description of what the article would cover

Focus on topics that:
- Have strong search demand
- Can be comprehensively covered
- Serve clear user intent
- Have ranking potential in AI Overviews
- Provide genuine value to readers${contentTypeInstruction}${customInstructionsBlock}

Generate exactly ${ideaCount} distinct article ideas with variety in intent, audience, and content format.

Response format: Return a JSON object with an "ideas" array containing objects with the following structure:
{
  "ideas": [
    {
      "title": "Article title",
      "keyword": "primary keyword",
      "searchIntent": "informational/transactional/local/navigational",
      "wordCountRange": "1500-2500",
      "contentAngles": ["angle 1", "angle 2", "angle 3"],
      "targetAudience": "description of target audience",
      "rankingPotential": "high/medium/low",
      "description": "Brief description of what the article would cover"
    }
  ]
}

Important: Respond with raw JSON only. Do not include code blocks, markdown, or any other formatting.`;
      const userPrompt = `Generate article ideas for the seed keyword: "${seedKeyword}"`;
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ]
      });
      const rawContent = response.choices?.[0]?.message?.content;
      const content = typeof rawContent === "string" ? rawContent : "";
      if (!content) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "No response from AI" });
      try {
        const parsed = JSON.parse(content);
        return { ideas: parsed.ideas || [] };
      } catch {
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Invalid JSON response from AI" });
      }
    }),
    /** List saved ideas for a project */
    list: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input, ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED" });
      return getIdeasByProject(input.projectId);
    }),
    /** Get a single idea by ID */
    get: publicProcedure.input(z2.object({ id: z2.number() })).query(async ({ input, ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED" });
      const idea = await getIdeaById(input.id);
      if (!idea) throw new TRPCError3({ code: "NOT_FOUND" });
      return idea;
    }),
    /** Save a single idea to a project */
    save: publicProcedure.input(z2.object({
      title: z2.string().min(1),
      keyword: z2.string().min(1),
      searchIntent: z2.string().optional(),
      wordCountRange: z2.string().optional(),
      contentAngles: z2.array(z2.string()).optional(),
      targetAudience: z2.string().optional(),
      rankingPotential: z2.string().optional(),
      description: z2.string().optional(),
      contentTypes: z2.string().optional(),
      projectId: z2.number()
    })).mutation(async ({ input, ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED" });
      const result = await createIdea({
        title: input.title,
        keyword: input.keyword,
        searchIntent: input.searchIntent || null,
        wordCountRange: input.wordCountRange || null,
        contentAngles: input.contentAngles || null,
        targetAudience: input.targetAudience || null,
        rankingPotential: input.rankingPotential || null,
        description: input.description || null,
        contentTypes: input.contentTypes || null,
        projectId: input.projectId,
        userId: session.userId
      });
      return result;
    }),
    /** Save multiple ideas to a project at once */
    saveBulk: publicProcedure.input(z2.object({
      ideas: z2.array(z2.object({
        title: z2.string().min(1),
        keyword: z2.string().min(1),
        searchIntent: z2.string().optional(),
        wordCountRange: z2.string().optional(),
        contentAngles: z2.array(z2.string()).optional(),
        targetAudience: z2.string().optional(),
        rankingPotential: z2.string().optional(),
        description: z2.string().optional()
      })),
      contentTypes: z2.string().optional(),
      projectId: z2.number()
    })).mutation(async ({ input, ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED" });
      const rows = input.ideas.map((idea) => ({
        title: idea.title,
        keyword: idea.keyword,
        searchIntent: idea.searchIntent || null,
        wordCountRange: idea.wordCountRange || null,
        contentAngles: idea.contentAngles || null,
        targetAudience: idea.targetAudience || null,
        rankingPotential: idea.rankingPotential || null,
        description: idea.description || null,
        contentTypes: input.contentTypes || null,
        projectId: input.projectId,
        userId: session.userId
      }));
      return createIdeasBulk(rows);
    }),
    /** Update an existing idea */
    update: publicProcedure.input(z2.object({
      id: z2.number(),
      title: z2.string().optional(),
      keyword: z2.string().optional(),
      searchIntent: z2.string().optional(),
      wordCountRange: z2.string().optional(),
      contentAngles: z2.array(z2.string()).optional(),
      targetAudience: z2.string().optional(),
      rankingPotential: z2.string().optional(),
      description: z2.string().optional(),
      status: z2.enum(["saved", "used", "archived"]).optional(),
      articleId: z2.number().optional()
    })).mutation(async ({ input, ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED" });
      const { id, ...data } = input;
      await updateIdea(id, data);
      return { success: true };
    }),
    /** Delete a single idea */
    delete: publicProcedure.input(z2.object({ id: z2.number() })).mutation(async ({ input, ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED" });
      await deleteIdea(input.id);
      return { success: true };
    }),
    /** Delete multiple ideas */
    deleteBulk: publicProcedure.input(z2.object({ ids: z2.array(z2.number()) })).mutation(async ({ input, ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED" });
      await deleteIdeasBulk(input.ids);
      return { success: true };
    }),
    /** Get idea counts by status for a project */
    counts: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input, ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED" });
      return getIdeasCount(input.projectId);
    })
  }),
  // ---- Dashboard Router ----
  dashboard: router({
    /** Get aggregated stats for a project */
    stats: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      return getDashboardStats(input.projectId);
    }),
    /** Get recent articles for a project */
    recentArticles: publicProcedure.input(z2.object({ projectId: z2.number(), limit: z2.number().optional() })).query(async ({ input }) => {
      return getRecentArticles(input.projectId, input.limit ?? 8);
    }),
    /** Get recent saved ideas for a project */
    recentIdeas: publicProcedure.input(z2.object({ projectId: z2.number(), limit: z2.number().optional() })).query(async ({ input }) => {
      return getRecentIdeas(input.projectId, input.limit ?? 5);
    }),
    /** Get articles created over time (last 30 days) */
    articlesOverTime: publicProcedure.input(z2.object({ projectId: z2.number() })).query(async ({ input }) => {
      return getArticlesOverTime(input.projectId);
    }),
    /** Get recent activity feed */
    recentActivity: publicProcedure.input(z2.object({ projectId: z2.number(), limit: z2.number().optional() })).query(async ({ input }) => {
      return getRecentActivity(input.projectId, input.limit ?? 10);
    })
  }),
  // ============================================================
  // FREE WRITER
  // ============================================================
  freeWriter: router({
    generate: publicProcedure.input(z2.object({
      projectId: z2.number(),
      title: z2.string().min(1).max(500),
      description: z2.string().max(5e3).optional(),
      keyword: z2.string().max(200).optional(),
      format: z2.enum(["linkedin", "short-article", "facebook", "email-newsletter", "youtube-script", "landing-page", "medium", "custom"]),
      length: z2.enum(["short", "medium", "long"]),
      customFormatInstructions: z2.string().max(2e3).optional(),
      aiDirections: z2.string().max(3e3).optional()
    })).mutation(async ({ ctx, input }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Please login" });
      const project = await getProjectById(input.projectId);
      if (!project) throw new Error("Project not found");
      const allVoices = await getBrandVoicesByProject(input.projectId);
      const brandVoice = allVoices.find((v) => v.isDefault === 1) ?? allVoices[0] ?? null;
      const icps = await getICPsByProject(input.projectId);
      const icp = icps[0] ?? null;
      const FORMAT_RULES = {
        "linkedin": {
          label: "LinkedIn Post",
          wordRange: { short: "150-250", medium: "300-500", long: "600-1000" },
          rules: `LINKEDIN POST RULES:
- Start with a strong hook line (1-2 sentences max) that stops the scroll
- Use short paragraphs (1-3 sentences each)
- Add line breaks between paragraphs for readability
- Include a clear takeaway or insight
- End with a call-to-action or thought-provoking question
- Use "you" and "your" to address the reader directly
- NO hashtags unless specifically requested
- NO emoji unless specifically requested
- Write conversationally but maintain authority
- Structure: Hook \u2192 Story/Insight \u2192 Lesson \u2192 CTA`
        },
        "short-article": {
          label: "Short Article",
          wordRange: { short: "300-500", medium: "600-900", long: "1000-1500" },
          rules: `SHORT ARTICLE RULES:
- Include a compelling headline (H1)
- Write a hook introduction (2-3 sentences)
- Use 2-4 subheadings (H2) to organize content
- Each section should be 2-4 paragraphs
- Include at least one concrete example or data point
- End with a clear conclusion or next step
- Output in clean HTML format`
        },
        "facebook": {
          label: "Facebook Post",
          wordRange: { short: "50-150", medium: "150-300", long: "300-500" },
          rules: `FACEBOOK POST RULES:
- Write in a warm, conversational tone
- Lead with something relatable or surprising
- Keep paragraphs very short (1-2 sentences)
- Ask a question to encourage engagement
- Be personal and authentic
- NO hashtags
- NO emoji unless specifically requested
- Structure: Hook \u2192 Value/Story \u2192 Question or CTA`
        },
        "email-newsletter": {
          label: "Email Newsletter",
          wordRange: { short: "200-400", medium: "400-700", long: "700-1200" },
          rules: `EMAIL NEWSLETTER RULES:
- Start with a compelling subject line suggestion (prefix with "Subject: ")
- Write a preview text suggestion (prefix with "Preview: ")
- Then write the email body
- Open with a personal, warm greeting
- Get to the value quickly (within first 2-3 sentences)
- Use short paragraphs and bullet points where appropriate
- Include one clear primary CTA
- Sign off naturally
- Output in clean HTML format`
        },
        "youtube-script": {
          label: "YouTube Script",
          wordRange: { short: "300-500", medium: "600-1000", long: "1200-2000" },
          rules: `YOUTUBE SCRIPT RULES:
- Start with a hook (first 5-10 seconds of the video)
- Include a brief intro/context section
- Break into clear segments with [SEGMENT] markers
- Write in spoken language (contractions, natural phrasing)
- Include [B-ROLL] suggestions where visual aids would help
- Add [CTA] markers for subscribe/like reminders (max 2)
- End with a strong closing and teaser for next content
- Format timestamps as approximate speaking time`
        },
        "landing-page": {
          label: "Landing Page Copy",
          wordRange: { short: "200-400", medium: "400-800", long: "800-1500" },
          rules: `LANDING PAGE COPY RULES:
- Write a powerful headline (H1) \u2014 benefit-driven, specific
- Write a supporting subheadline
- Include 3-5 benefit bullets or feature blocks
- Add social proof placeholder suggestions
- Write a clear, action-oriented CTA button text
- Include a brief FAQ section (3-4 questions) if length allows
- Structure: Hero \u2192 Benefits \u2192 Social Proof \u2192 CTA \u2192 FAQ
- Output in clean HTML format with semantic headings`
        },
        "medium": {
          label: "Medium Article",
          wordRange: { short: "800-1200", medium: "1200-2000", long: "2000-3000" },
          rules: `MEDIUM ARTICLE RULES:
- Start with a compelling hook (first 1-2 sentences must grab attention \u2014 a bold claim, surprising stat, or relatable scenario)
- Write a clear subtitle/kicker line that previews the value of the article
- Use subheadings (H2) to break the article into scannable sections
- Write in a conversational, first-person tone \u2014 like talking to a smart friend
- Include at least one "pull-quote worthy" line per section (a standalone insight that's memorable)
- Mix short punchy paragraphs (1-2 sentences) with longer explanatory ones for rhythm
- Use concrete examples, anecdotes, or mini case studies to illustrate points
- Include a clear takeaway or actionable conclusion
- End with a thought-provoking final line or call-to-action (follow, clap, comment)
- NO bullet-point-heavy listicles \u2014 prefer flowing narrative with occasional lists
- Aim for 5-8 minute read time (1,200-2,000 words for medium length)
- Output in clean Markdown format with ## headings`
        },
        "custom": {
          label: "Custom Format",
          wordRange: { short: "200-400", medium: "400-800", long: "800-1500" },
          rules: `CUSTOM FORMAT:
Follow the user's specific instructions for format and structure.`
        }
      };
      const formatConfig = FORMAT_RULES[input.format];
      const wordRange = formatConfig.wordRange[input.length];
      let brandVoiceSection = "";
      if (brandVoice) {
        const perspectiveMap = {
          first: "First person (we/our/us)",
          second: "Second person (you/your)",
          third: "Third person (neutral/objective)"
        };
        const styleMap = {
          short: "Short and punchy (1-2 sentences per paragraph)",
          mixed: "Mixed/varied sentence lengths",
          detailed: "Detailed and explanatory (3-5 sentences per paragraph)"
        };
        let avoidItems = [];
        const avoidList = brandVoice.avoidList || "";
        if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
          const parts = avoidList.split("|");
          for (const part of parts) {
            if (part.startsWith("PRESETS:")) {
              avoidItems.push(...part.replace("PRESETS:", "").split(",").filter(Boolean));
            } else if (part.startsWith("CUSTOM:")) {
              avoidItems.push(...part.replace("CUSTOM:", "").split(",").filter(Boolean));
            }
          }
        } else if (avoidList) {
          avoidItems = avoidList.split(",").map((s) => s.trim()).filter(Boolean);
        }
        brandVoiceSection = `
=== BRAND VOICE GUIDELINES ===
Voice: ${brandVoice.name}
Tone: ${brandVoice.toneTraits || "Professional"}
Perspective: ${perspectiveMap[brandVoice.perspective] || brandVoice.perspective}
Sentence Style: ${styleMap[brandVoice.sentenceStyle] || brandVoice.sentenceStyle}
${avoidItems.length > 0 ? `Avoid: ${avoidItems.join(", ")}` : ""}
${brandVoice.writingStyleSample ? `
Style Reference (match tone, NOT content):
"${brandVoice.writingStyleSample.slice(0, 500)}"` : ""}
`;
      }
      let icpSection = "";
      if (icp) {
        const pains = icp.painPoints ? Array.isArray(icp.painPoints) ? icp.painPoints : JSON.parse(icp.painPoints) : [];
        const goals = icp.goals ? Array.isArray(icp.goals) ? icp.goals : JSON.parse(icp.goals) : [];
        icpSection = `
=== TARGET AUDIENCE (ICP) ===
Name: ${icp.name}
Description: ${icp.description || ""}
${pains.length > 0 ? `Pain Points: ${pains.join(", ")}` : ""}
${goals.length > 0 ? `Goals: ${goals.join(", ")}` : ""}

Write content that resonates with this audience. Address their pain points and goals naturally.
`;
      } else if (project.icpPrimaryName) {
        const pains = project.icpPains ? Array.isArray(project.icpPains) ? project.icpPains : JSON.parse(project.icpPains) : [];
        const goals = project.icpGoals ? Array.isArray(project.icpGoals) ? project.icpGoals : JSON.parse(project.icpGoals) : [];
        icpSection = `
=== TARGET AUDIENCE (ICP) ===
Name: ${project.icpPrimaryName}
Description: ${project.icpPrimaryDescription || project.description || ""}
${pains.length > 0 ? `Pain Points: ${pains.join(", ")}` : ""}
${goals.length > 0 ? `Goals: ${goals.join(", ")}` : ""}

Write content that resonates with this audience.
`;
      }
      let bannedPhrasesSection = "";
      if (project.bannedPhrases?.length) {
        bannedPhrasesSection = `
=== BANNED PHRASES (NEVER USE) ===
${project.bannedPhrases.filter((p) => p.trim()).map((p) => `- "${p}"`).join("\n")}
`;
      }
      const systemPrompt = `You are an expert content writer. Your job is to write high-quality ${formatConfig.label} content.

Today's date: ${(/* @__PURE__ */ new Date()).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

${formatConfig.rules}
${input.customFormatInstructions ? `
ADDITIONAL FORMAT INSTRUCTIONS:
${input.customFormatInstructions}` : ""}

WORD COUNT TARGET: ${wordRange} words
${brandVoiceSection}
${icpSection}
${bannedPhrasesSection}

CRITICAL RULES:
- NEVER use em dashes (\u2014). Use commas, periods, or semicolons instead.
- Write original content. Do not copy from any source.
- Be specific and concrete. Avoid vague generalities.
- Every sentence must add value. No filler.
`;
      let userMessage = `Write a ${formatConfig.label} about:

Title/Topic: ${input.title}`;
      if (input.description) {
        userMessage += `

Description/Context: ${input.description}`;
      }
      if (input.keyword) {
        userMessage += `

Target Keyword (weave naturally): ${input.keyword}`;
      }
      if (input.aiDirections) {
        userMessage += `

=== AI DIRECTIONS (FOLLOW THESE CLOSELY) ===
${input.aiDirections}`;
      }
      const response = await invokeLLM({
        model: "claude-sonnet-4-6",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ],
        maxTokens: 4096
      });
      let content = response.choices[0]?.message?.content || "";
      if (project.bannedPhrases?.length) {
        for (const phrase of project.bannedPhrases) {
          if (phrase.trim()) {
            const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(escapedPhrase, "gi");
            content = content.replace(regex, "");
          }
        }
      }
      content = content.replace(/—/g, " - ");
      return {
        content,
        format: input.format,
        formatLabel: formatConfig.label,
        wordCount: content.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length,
        model: response.model
      };
    }),
    generateImagePrompt: publicProcedure.input(z2.object({
      title: z2.string().min(1).max(500),
      content: z2.string().min(1).max(1e4),
      imageStyle: z2.enum(["photorealistic", "illustration", "3d-render", "flat-design", "cinematic", "abstract", "watercolor", "minimalist"]).default("photorealistic")
    })).mutation(async ({ ctx, input }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Please login" });
      const styleDescriptions = {
        "photorealistic": "high-quality photorealistic photography \u2014 sharp, detailed, real-world lighting, DSLR quality",
        "illustration": "digital illustration \u2014 hand-crafted look, expressive linework, rich colors, editorial illustration style",
        "3d-render": "3D CGI render \u2014 polished, volumetric lighting, depth of field, studio-quality 3D art",
        "flat-design": "flat design vector illustration \u2014 clean geometric shapes, bold colors, no shadows, modern icon-style",
        "cinematic": "cinematic photography \u2014 dramatic lighting, wide-angle lens, film grain, movie-poster quality",
        "abstract": "abstract art \u2014 non-representational, flowing shapes, bold color gradients, expressive and conceptual",
        "watercolor": "watercolor painting \u2014 soft washes, organic textures, delicate brushstrokes, painterly and warm",
        "minimalist": "minimalist design \u2014 extreme simplicity, lots of negative space, single focal element, clean and elegant"
      };
      const styleGuide = styleDescriptions[input.imageStyle] ?? styleDescriptions["photorealistic"];
      const response = await invokeLLM({
        model: "claude-sonnet-4-6",
        messages: [
          {
            role: "system",
            content: `You are an expert at crafting image generation prompts for Medium article featured images.

Your job is to create a detailed, evocative image prompt that would produce a compelling featured image for the given article. The image should:
- Be visually striking and attention-grabbing in a Medium feed
- Relate conceptually to the article's theme (not literal/obvious)
- Work well as a horizontal banner (16:9 aspect ratio)
- Avoid text, logos, or watermarks
- Be specific about lighting, color palette, and composition

IMPORTANT: The image MUST be in this style: ${styleGuide}
Tailor every aspect of the prompt \u2014 subject matter, composition, color palette, and technical descriptors \u2014 to match this style perfectly.

Return ONLY the image prompt text. No explanations, no preamble.`
          },
          {
            role: "user",
            content: `Generate a featured image prompt for this Medium article:

Title: ${input.title}

Article excerpt (first 2000 chars):
${input.content.slice(0, 2e3)}`
          }
        ]
      });
      const rawContent = response.choices?.[0]?.message?.content;
      const imagePrompt = typeof rawContent === "string" ? rawContent.trim() : "";
      if (!imagePrompt) throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate image prompt" });
      return { imagePrompt };
    })
  }),
  // ============================================================
  // AI READINESS AUDIT
  // ============================================================
  aiReadiness: router({
    analyze: publicProcedure.input(z2.object({ url: z2.string().min(1) })).mutation(async ({ ctx, input }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Please login" });
      let parsedUrl;
      try {
        parsedUrl = new URL(input.url.startsWith("http") ? input.url : `https://${input.url}`);
      } catch {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Invalid URL format" });
      }
      let html;
      try {
        const fetchResponse = await fetch(parsedUrl.toString(), {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5"
          },
          signal: AbortSignal.timeout(2e4)
        });
        if (!fetchResponse.ok) {
          throw new TRPCError3({ code: "BAD_REQUEST", message: `Failed to fetch URL: HTTP ${fetchResponse.status}` });
        }
        html = await fetchResponse.text();
      } catch (e) {
        if (e.name === "TimeoutError" || e.name === "AbortError") {
          throw new TRPCError3({ code: "TIMEOUT", message: "Request timed out. The page took too long to respond." });
        }
        if (e instanceof TRPCError3) throw e;
        throw new TRPCError3({ code: "BAD_REQUEST", message: `Failed to fetch URL: ${e.message}` });
      }
      if (html.length < 200) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "Page returned very little content. It may be JavaScript-rendered or require authentication." });
      }
      const schemaResult = analyzeSchema(html);
      const contentStructureRaw = analyzeContentStructureRaw(html);
      const internalLinksResult = analyzeInternalLinks(html, parsedUrl.toString());
      const pageTitle = extractPageTitle(html);
      const contentForLLM = prepareHtmlForLLM(html, 15e3);
      const systemPrompt = `You are an AI Readiness Auditor. Your job is to evaluate whether a webpage's content is structured in a way that makes it easy for AI systems (ChatGPT, Perplexity, Google AI Overviews) to find, understand, extract, and cite specific pieces of information.

You will receive:
1. The page HTML (cleaned)
2. Pre-computed structural metrics

Analyze the page and return a JSON response with this exact structure:
{
  "contentStructureScore": <number 0-100>,
  "overallReadinessScore": <number 0-100>,
  "letterGrade": "<A+/A/B+/B/C+/C/D/F>",
  "contentStructure": {
    "summary": "<2-3 sentence assessment of how AI-parseable this content is>",
    "headingHierarchy": {
      "score": <0-100>,
      "assessment": "<specific assessment>",
      "issues": ["<issue 1>", "<issue 2>"]
    },
    "contentSegmentation": {
      "score": <0-100>,
      "assessment": "<is content in labeled blocks or a blob?>",
      "issues": ["<issue 1>"]
    },
    "aiExtractability": {
      "score": <0-100>,
      "assessment": "<can AI pull discrete facts, definitions, steps from this page?>",
      "issues": ["<issue 1>"]
    },
    "semanticClarity": {
      "score": <0-100>,
      "assessment": "<are semantic HTML elements used properly?>",
      "issues": ["<issue 1>"]
    }
  },
  "topFindings": [
    { "severity": "critical|high|medium|low", "category": "schema|structure|links", "finding": "<specific finding>", "recommendation": "<actionable fix>" }
  ],
  "aiCitability": {
    "score": <0-100>,
    "summary": "<how likely is an AI to cite this page, and why?>"
  },
  "quickWins": ["<specific action 1>", "<action 2>", "<action 3>"]
}

Be specific and actionable. Reference actual content from the page in your findings. Don't be generic. The scores should reflect real structural issues, not just surface-level formatting.

IMPORTANT: Return ONLY the raw JSON object. Do NOT wrap it in markdown code fences or any other formatting.`;
      const userPrompt = `Analyze this page: ${parsedUrl.toString()}

Pre-computed metrics:
- Heading hierarchy: ${JSON.stringify(contentStructureRaw.headingHierarchy.slice(0, 20))}
- H1 present: ${contentStructureRaw.hasProperH1}, H2 count: ${contentStructureRaw.h2Count}, H3 count: ${contentStructureRaw.h3Count}
- Semantic elements: ${JSON.stringify(contentStructureRaw.semanticElements)}
- Word count: ${contentStructureRaw.estimatedWordCount}, Paragraphs: ${contentStructureRaw.paragraphCount}, Avg paragraph length: ${contentStructureRaw.avgParagraphLength} words
- Schema types found: ${schemaResult.typesFound.length > 0 ? schemaResult.typesFound.join(", ") : "NONE"}
- Internal links in content: ${internalLinksResult.internalLinks}, Generic anchors: ${internalLinksResult.genericAnchors}
- Schema score: ${schemaResult.score}/100, Internal link score: ${internalLinksResult.score}/100

Page HTML (cleaned):
${contentForLLM}`;
      let llmResult;
      try {
        const response = await invokeLLM({
          model: "claude-sonnet-4-6",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          maxTokens: 8e3,
          response_format: { type: "json_object" }
        });
        const rawContent = response.choices?.[0]?.message?.content;
        const contentStr = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((c) => c.text || "").join("") : "";
        const cleaned = stripMarkdownFences(contentStr);
        llmResult = JSON.parse(cleaned);
      } catch (e) {
        console.error("[AI Readiness] LLM parse error:", e);
        llmResult = {
          contentStructureScore: 50,
          overallReadinessScore: 50,
          letterGrade: "C",
          contentStructure: {
            summary: "Analysis could not be completed. Using neutral scores.",
            headingHierarchy: { score: 50, assessment: "Could not analyze", issues: [] },
            contentSegmentation: { score: 50, assessment: "Could not analyze", issues: [] },
            aiExtractability: { score: 50, assessment: "Could not analyze", issues: [] },
            semanticClarity: { score: 50, assessment: "Could not analyze", issues: [] }
          },
          topFindings: [],
          aiCitability: { score: 50, summary: "Analysis could not be completed." },
          quickWins: []
        };
      }
      return {
        url: parsedUrl.toString(),
        pageTitle,
        analyzedAt: (/* @__PURE__ */ new Date()).toISOString(),
        overallScore: llmResult.overallReadinessScore ?? 50,
        letterGrade: llmResult.letterGrade ?? "C",
        pillars: {
          schema: schemaResult,
          contentStructure: {
            score: llmResult.contentStructureScore ?? 50,
            raw: contentStructureRaw,
            analysis: llmResult.contentStructure ?? null
          },
          internalLinks: internalLinksResult
        },
        topFindings: llmResult.topFindings ?? [],
        aiCitability: llmResult.aiCitability ?? { score: 50, summary: "" },
        quickWins: llmResult.quickWins ?? [],
        meta: {
          wordCount: contentStructureRaw.estimatedWordCount,
          extractionMethod: contentStructureRaw.contentExtractionMethod
        }
      };
    }),
    generateOutline: publicProcedure.input(z2.object({
      auditResult: z2.any(),
      projectId: z2.number().optional(),
      targetWordCount: z2.string().optional(),
      numSections: z2.string().optional(),
      faqCount: z2.string().optional(),
      saveToDb: z2.boolean().optional().default(true)
    })).mutation(async ({ ctx, input }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Please login" });
      const { auditResult, projectId, targetWordCount, numSections, faqCount, saveToDb } = input;
      if (!auditResult?.url) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "auditResult.url is required" });
      }
      let pageContent = "";
      try {
        const fetchResp = await fetch(auditResult.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; RankPilotBot/1.0)",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
          },
          signal: AbortSignal.timeout(15e3)
        });
        if (fetchResp.ok) {
          const html = await fetchResp.text();
          pageContent = prepareContentForLLM(html, 12e3);
        }
      } catch {
      }
      let auditSummary = `OVERALL: Score ${auditResult.overallScore}/100, Grade: ${auditResult.letterGrade}

`;
      auditSummary += `SCHEMA MARKUP (${auditResult.pillars?.schema?.score ?? 0}/100):
`;
      auditSummary += `- Types found: ${auditResult.pillars?.schema?.typesFound?.join(", ") || "None"}
`;
      auditSummary += `- Types missing: ${auditResult.pillars?.schema?.typesMissing?.join(", ") || "None"}
`;
      if (auditResult.pillars?.schema?.suggestions?.length) {
        auditSummary += `- Suggestions: ${auditResult.pillars.schema.suggestions.join("; ")}
`;
      }
      auditSummary += "\n";
      const cs = auditResult.pillars?.contentStructure;
      auditSummary += `CONTENT STRUCTURE (${cs?.score ?? 0}/100):
`;
      if (cs?.analysis) {
        const a = cs.analysis;
        auditSummary += `- Summary: ${a.summary || ""}
`;
        if (a.headingHierarchy) auditSummary += `  - Heading Hierarchy (${a.headingHierarchy.score}/100): ${a.headingHierarchy.assessment}
    Issues: ${a.headingHierarchy.issues?.join("; ") || "None"}
`;
        if (a.contentSegmentation) auditSummary += `  - Content Segmentation (${a.contentSegmentation.score}/100): ${a.contentSegmentation.assessment}
    Issues: ${a.contentSegmentation.issues?.join("; ") || "None"}
`;
        if (a.aiExtractability) auditSummary += `  - AI Extractability (${a.aiExtractability.score}/100): ${a.aiExtractability.assessment}
    Issues: ${a.aiExtractability.issues?.join("; ") || "None"}
`;
        if (a.semanticClarity) auditSummary += `  - Semantic Clarity (${a.semanticClarity.score}/100): ${a.semanticClarity.assessment}
    Issues: ${a.semanticClarity.issues?.join("; ") || "None"}
`;
      }
      if (cs?.raw?.headingHierarchy?.length) {
        auditSummary += "\nCURRENT HEADING OUTLINE:\n";
        cs.raw.headingHierarchy.slice(0, 30).forEach((h) => {
          auditSummary += `${"  ".repeat(h.level - 1)}H${h.level}: ${h.text}
`;
        });
      }
      auditSummary += "\n";
      const il = auditResult.pillars?.internalLinks;
      auditSummary += `INTERNAL LINKS (${il?.score ?? 0}/100):
`;
      auditSummary += `- Internal: ${il?.internalLinks ?? 0}, External: ${il?.externalLinks ?? 0}
`;
      auditSummary += `- Descriptive anchors: ${il?.descriptiveAnchors ?? 0}, Generic: ${il?.genericAnchors ?? 0}
`;
      if (il?.suggestions?.length) {
        auditSummary += `- Suggestions: ${il.suggestions.join("; ")}
`;
      }
      auditSummary += "\n";
      auditSummary += `AI CITABILITY (${auditResult.aiCitability?.score ?? 0}/100): ${auditResult.aiCitability?.summary || ""}

`;
      if (auditResult.topFindings?.length) {
        auditSummary += "TOP FINDINGS:\n";
        auditResult.topFindings.forEach((f) => {
          auditSummary += `- [${f.severity}] (${f.category}) ${f.finding} \u2192 Fix: ${f.recommendation}
`;
        });
        auditSummary += "\n";
      }
      if (auditResult.quickWins?.length) {
        auditSummary += "QUICK WINS:\n";
        auditResult.quickWins.forEach((w) => {
          auditSummary += `- ${w}
`;
        });
      }
      let optionalLines = "";
      if (targetWordCount) optionalLines += `
Target Word Count: ${targetWordCount} words`;
      if (numSections) optionalLines += `
Number of Main Sections: ${numSections}`;
      if (faqCount) optionalLines += `
Number of FAQs: ${faqCount}`;
      const systemPrompt = `You are an expert content strategist specializing in AEO (Answer Engine Optimization). Your task is to create an IMPROVED article outline based on an AI Readiness audit of an existing page.

The current year is 2026.

You have been given:
1. The AI Readiness audit results (scoring, issues, recommendations)
2. The original page content

Your job is to create a restructured outline that FIXES all issues identified in the audit while preserving the original topic and intent.

SPECIFIC INSTRUCTIONS BASED ON AUDIT:
- If schema markup is missing FAQ types \u2192 include a well-structured FAQ section
- If schema markup suggests How-To \u2192 include step-by-step How-To sections with clear numbered steps
- If heading hierarchy has issues \u2192 create a clean H1 > H2 > H3 structure with no skipped levels
- If content segmentation is poor \u2192 break content into focused, well-defined sections (200-400 words each)
- If AI extractability is low \u2192 add a "Quick Answer" section (40-60 words) and clear definitions
- If semantic clarity is weak \u2192 use specific, descriptive headings that clearly state what each section covers
- If internal linking is poor \u2192 suggest internal linking opportunities in each section
- If content is too thin \u2192 expand the outline to cover missing subtopics
- If there are generic headings \u2192 replace them with specific, keyword-rich headings
- If definitions are missing \u2192 add definition sections near the top
- If Q&A format is missing \u2192 restructure relevant sections as Q&A${optionalLines}

OUTPUT FORMAT \u2014 return ONLY this JSON structure:
{
  "title": "SEO-optimized title (improved from original)",
  "metaDescription": "155-character meta description",
  "estimatedWordCount": "estimated word count range",
  "sections": [
    { "type": "hook", "heading": null, "purpose": "...", "keyPoints": ["..."] },
    { "type": "quickAnswer", "heading": null, "purpose": "...", "targetWords": "40-60", "keyPoints": ["..."] },
    { "type": "h2", "heading": "...", "keyPoints": ["..."], "auditFix": "...",
      "subSections": [ { "type": "h3", "heading": "...", "keyPoints": ["..."] } ] },
    { "type": "faq", "heading": "Frequently Asked Questions",
      "questions": [ { "question": "...?", "answerPoints": ["..."] } ] }
  ],
  "targetKeywords": { "primary": "...", "secondary": ["..."], "lsi": ["..."] },
  "internalLinkOpportunities": ["..."],
  "auditIssuesAddressed": ["..."]
}

Respond ONLY with the JSON object, no additional text.`;
      let userMessage = `Here is the AI Readiness audit for the page:

${auditSummary}`;
      if (pageContent) {
        userMessage += `

Here is the original page content (truncated):

${pageContent}`;
      }
      let outlineData;
      try {
        const response = await invokeLLM({
          model: "claude-sonnet-4-6",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage }
          ],
          maxTokens: 5e3
        });
        const rawContent = response.choices?.[0]?.message?.content;
        const contentStr = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((c) => c.text || "").join("") : "";
        const cleaned = stripMarkdownFences(contentStr);
        outlineData = JSON.parse(cleaned);
      } catch (e) {
        console.error("[AI Readiness] Outline generation parse error:", e);
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate outline. Please try again." });
      }
      let savedOutline = null;
      if (saveToDb && projectId) {
        try {
          const sections = (outlineData.sections || []).map((s, idx) => {
            const section = {
              id: `section-${idx}`,
              heading: s.heading || s.type || "Section",
              type: s.type === "h3" ? "h3" : "h2",
              points: s.keyPoints || s.answerPoints || []
            };
            if (s.subSections) {
              section.subSections = s.subSections.map((sub, subIdx) => ({
                id: `section-${idx}-sub-${subIdx}`,
                heading: sub.heading || "Subsection",
                type: "h3",
                points: sub.keyPoints || []
              }));
            }
            if (s.questions) {
              section.points = s.questions.map((q) => `Q: ${q.question} | A: ${q.answerPoints?.join(", ") || ""}`);
            }
            return section;
          });
          savedOutline = await createOutline({
            title: outlineData.title || auditResult.pageTitle || "Improved Outline",
            keyword: outlineData.targetKeywords?.primary || null,
            sections,
            settings: {
              targetWordCount: targetWordCount ? parseInt(targetWordCount) : void 0,
              numSections: numSections ? parseInt(numSections) : void 0,
              numFaqs: faqCount ? parseInt(faqCount) : void 0
            },
            status: "draft",
            projectId,
            userId: session.userId
          });
        } catch (e) {
          console.error("[AI Readiness] Failed to save outline:", e);
        }
      }
      return {
        success: true,
        outline: outlineData,
        savedOutline
      };
    }),
    exportPdf: publicProcedure.input(z2.object({ auditResult: z2.any() })).mutation(async ({ ctx, input }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Please login" });
      const { auditResult } = input;
      const htmlContent = buildReportHtml(auditResult);
      return {
        html: htmlContent,
        filename: `ai-readiness-audit-${new URL(auditResult.url).hostname}.pdf`
      };
    }),
    generateIdeas: publicProcedure.input(z2.object({
      auditResult: z2.any(),
      projectId: z2.number().optional()
    })).mutation(async ({ ctx, input }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) throw new TRPCError3({ code: "UNAUTHORIZED", message: "Please login" });
      const { auditResult, projectId } = input;
      if (!auditResult?.url) {
        throw new TRPCError3({ code: "BAD_REQUEST", message: "auditResult.url is required" });
      }
      let weaknessSummary = `PAGE: ${auditResult.url}
TITLE: ${auditResult.pageTitle || "Unknown"}
OVERALL SCORE: ${auditResult.overallScore}/100 (Grade: ${auditResult.letterGrade})

`;
      const schema = auditResult.pillars?.schema;
      if (schema) {
        weaknessSummary += `SCHEMA MARKUP (${schema.score}/100):
`;
        weaknessSummary += `- Types found: ${schema.typesFound?.join(", ") || "None"}
`;
        weaknessSummary += `- Types missing: ${schema.typesMissing?.join(", ") || "None"}
`;
        if (schema.suggestions?.length) {
          weaknessSummary += `- Suggestions: ${schema.suggestions.join("; ")}
`;
        }
        weaknessSummary += "\n";
      }
      const cs = auditResult.pillars?.contentStructure;
      if (cs) {
        weaknessSummary += `CONTENT STRUCTURE (${cs.score}/100):
`;
        if (cs.analysis?.summary) weaknessSummary += `- Summary: ${cs.analysis.summary}
`;
        if (cs.analysis?.headingHierarchy) weaknessSummary += `  - Heading Hierarchy (${cs.analysis.headingHierarchy.score}/100): ${cs.analysis.headingHierarchy.assessment}
`;
        if (cs.analysis?.contentSegmentation) weaknessSummary += `  - Content Segmentation (${cs.analysis.contentSegmentation.score}/100): ${cs.analysis.contentSegmentation.assessment}
`;
        if (cs.analysis?.aiExtractability) weaknessSummary += `  - AI Extractability (${cs.analysis.aiExtractability.score}/100): ${cs.analysis.aiExtractability.assessment}
`;
        if (cs.analysis?.semanticClarity) weaknessSummary += `  - Semantic Clarity (${cs.analysis.semanticClarity.score}/100): ${cs.analysis.semanticClarity.assessment}
`;
        if (cs.raw) {
          weaknessSummary += `  - Word count: ${cs.raw.estimatedWordCount}, Paragraphs: ${cs.raw.paragraphCount}, Headings: ${cs.raw.totalHeadings}
`;
        }
        weaknessSummary += "\n";
      }
      const il = auditResult.pillars?.internalLinks;
      if (il) {
        weaknessSummary += `INTERNAL LINKS (${il.score}/100):
`;
        weaknessSummary += `- Internal: ${il.internalLinks}, External: ${il.externalLinks}
`;
        weaknessSummary += `- Descriptive anchors: ${il.descriptiveAnchors}, Generic: ${il.genericAnchors}
`;
        if (il.suggestions?.length) {
          weaknessSummary += `- Suggestions: ${il.suggestions.join("; ")}
`;
        }
        weaknessSummary += "\n";
      }
      if (auditResult.aiCitability) {
        weaknessSummary += `AI CITABILITY (${auditResult.aiCitability.score}/100): ${auditResult.aiCitability.summary}

`;
      }
      if (auditResult.topFindings?.length) {
        weaknessSummary += "KEY FINDINGS (WEAKNESSES):\n";
        auditResult.topFindings.forEach((f) => {
          weaknessSummary += `- [${f.severity}] (${f.category}) ${f.finding} \u2192 Fix: ${f.recommendation}
`;
        });
        weaknessSummary += "\n";
      }
      if (auditResult.quickWins?.length) {
        weaknessSummary += "QUICK WINS:\n";
        auditResult.quickWins.forEach((w) => {
          weaknessSummary += `- ${w}
`;
        });
      }
      const systemPrompt = `You are an expert SEO content strategist specializing in AEO (Answer Engine Optimization) and content gap analysis. Your job is to analyze the weaknesses found in an AI Readiness audit and suggest specific, actionable content ideas that would address those weaknesses.

For each weakness category, suggest content that would directly fix the issue:
- If schema markup is missing FAQ types \u2192 suggest a structured FAQ page or FAQ section expansion
- If internal linking is weak to Topic X \u2192 suggest a new hub/pillar article on Topic X that creates internal link opportunities
- If content is thin on subtopic Y \u2192 suggest a deep-dive article on Y
- If AI citability is low \u2192 suggest authoritative, data-driven content that AI systems would want to cite
- If heading hierarchy is poor \u2192 suggest restructured content with clear topical segmentation
- If content segmentation is weak \u2192 suggest breaking monolithic pages into focused topic pages
- If there are no definitions/quick answers \u2192 suggest a glossary or "What is X?" explainer page

For EACH idea, provide:
1. A specific, SEO-optimized title
2. The type of content (new-article, page-expansion, restructure, faq-page, hub-page, glossary, how-to-guide)
3. A primary target keyword
4. A brief description of what the content should cover
5. The specific audit weakness(es) it addresses (rationale)
6. Estimated word count range
7. Priority level (high/medium/low) based on impact
8. Suggested internal links to/from the audited page

Generate 5-8 content ideas, prioritized by impact on the audit score.

OUTPUT FORMAT \u2014 return ONLY this JSON:
{
  "ideas": [
    {
      "title": "SEO-optimized article title",
      "type": "new-article|page-expansion|restructure|faq-page|hub-page|glossary|how-to-guide",
      "keyword": "primary target keyword",
      "description": "2-3 sentence description of what this content should cover and why",
      "rationale": "Which specific audit weakness(es) this addresses",
      "wordCountRange": "1200-1800",
      "priority": "high|medium|low",
      "suggestedLinks": ["description of internal link opportunity"]
    }
  ],
  "summary": "Brief 2-sentence summary of the overall content strategy these ideas represent"
}

Respond ONLY with the JSON object, no additional text.`;
      const userPrompt = `Here are the AI Readiness audit findings for the page. Generate content ideas that would address the weaknesses:

${weaknessSummary}`;
      let ideasResult;
      try {
        const response = await invokeLLM({
          model: "claude-sonnet-4-6",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          maxTokens: 6e3,
          response_format: { type: "json_object" }
        });
        const rawContent = response.choices?.[0]?.message?.content;
        const contentStr = typeof rawContent === "string" ? rawContent : Array.isArray(rawContent) ? rawContent.map((c) => c.text || "").join("") : "";
        const cleaned = stripMarkdownFences(contentStr);
        ideasResult = JSON.parse(cleaned);
      } catch (e) {
        console.error("[AI Readiness] Idea generation parse error:", e);
        throw new TRPCError3({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate content ideas. Please try again." });
      }
      return {
        success: true,
        ideas: ideasResult.ideas || [],
        summary: ideasResult.summary || "",
        auditUrl: auditResult.url,
        auditScore: auditResult.overallScore
      };
    })
  })
});
function buildReportHtml(data) {
  const scoreColor = (score) => score >= 70 ? "#10b981" : score >= 40 ? "#f59e0b" : "#ef4444";
  const gradeColor = (grade) => {
    if (grade.startsWith("A")) return "#10b981";
    if (grade.startsWith("B")) return "#3b82f6";
    if (grade.startsWith("C")) return "#f59e0b";
    if (grade.startsWith("D")) return "#f97316";
    return "#ef4444";
  };
  const escHtml = (s) => String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const pillars = data.pillars || {};
  const schema = pillars.schema || {};
  const cs = pillars.contentStructure || {};
  const il = pillars.internalLinks || {};
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>AI Readiness Audit - ${escHtml(data.pageTitle)}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 40px; color: #1f2937; line-height: 1.6; }
  .header { background: linear-gradient(135deg, #1e3a5f, #2563eb); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px; }
  .header h1 { margin: 0 0 8px 0; font-size: 24px; }
  .header .url { opacity: 0.8; font-size: 14px; }
  .grade-box { display: inline-block; background: ${gradeColor(data.letterGrade || "C")}; color: white; padding: 12px 20px; border-radius: 8px; font-size: 28px; font-weight: bold; margin-top: 15px; }
  .grade-score { font-size: 14px; opacity: 0.9; }
  .pillars-row { display: flex; gap: 16px; margin-bottom: 30px; }
  .pillar-card { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; }
  .pillar-score { font-size: 28px; font-weight: bold; }
  .pillar-label { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .section { margin-bottom: 24px; }
  .section h2 { font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
  .finding { background: #f9fafb; border-left: 4px solid #e5e7eb; padding: 12px 16px; margin-bottom: 12px; border-radius: 0 8px 8px 0; }
  .finding.critical { border-left-color: #ef4444; }
  .finding.high { border-left-color: #f97316; }
  .finding.medium { border-left-color: #f59e0b; }
  .finding.low { border-left-color: #3b82f6; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
  .badge-critical { background: #fef2f2; color: #dc2626; }
  .badge-high { background: #fff7ed; color: #ea580c; }
  .badge-medium { background: #fffbeb; color: #d97706; }
  .badge-low { background: #eff6ff; color: #2563eb; }
  .fix { color: #059669; font-size: 13px; margin-top: 6px; }
  .quick-win { padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
  .stat-grid { display: flex; gap: 12px; margin: 16px 0; }
  .stat-box { flex: 1; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; text-align: center; }
  .stat-value { font-size: 22px; font-weight: bold; }
  .stat-label { font-size: 12px; color: #6b7280; }
  .heading-tree { font-family: monospace; font-size: 13px; background: #f9fafb; padding: 16px; border-radius: 8px; }
  .schema-item { padding: 4px 0; display: flex; align-items: center; gap: 8px; }
  .schema-check { color: #10b981; }
  .schema-miss { color: #ef4444; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center; }
</style></head><body>

<div class="header">
  <h1>AI Readiness Audit Report</h1>
  <div class="url">${escHtml(data.url)}</div>
  <div class="grade-box">${escHtml(data.letterGrade)}<br><span class="grade-score">${data.overallScore}/100</span></div>
</div>

<div class="pillars-row">
  <div class="pillar-card"><div class="pillar-score" style="color:${scoreColor(schema.score || 0)}">${schema.score || 0}</div><div class="pillar-label">Schema Markup</div></div>
  <div class="pillar-card"><div class="pillar-score" style="color:${scoreColor(cs.score || 0)}">${cs.score || 0}</div><div class="pillar-label">Content Structure</div></div>
  <div class="pillar-card"><div class="pillar-score" style="color:${scoreColor(il.score || 0)}">${il.score || 0}</div><div class="pillar-label">Internal Links</div></div>
</div>

${data.aiCitability ? `<div class="section"><h2>AI Citability Score: ${data.aiCitability.score}/100</h2><p>${escHtml(data.aiCitability.summary)}</p></div>` : ""}

${data.quickWins?.length ? `<div class="section"><h2>Quick Wins</h2>${data.quickWins.map((w) => `<div class="quick-win">\u2192 ${escHtml(w)}</div>`).join("")}</div>` : ""}

${data.topFindings?.length ? `<div class="section"><h2>Key Findings</h2>${data.topFindings.map((f) => `<div class="finding ${f.severity}"><span class="badge badge-${f.severity}">${f.severity}</span> <span class="badge" style="background:#f3f4f6;color:#374151">${f.category}</span><p style="margin:8px 0 4px">${escHtml(f.finding)}</p><div class="fix">Fix: ${escHtml(f.recommendation)}</div></div>`).join("")}</div>` : ""}

<div class="section">
  <h2>Schema Markup (${schema.score || 0}/100)</h2>
  ${(schema.details || []).map((d) => `<div class="schema-item"><span class="${d.present ? "schema-check" : "schema-miss"}">${d.present ? "\u2713" : "\u2717"}</span> <strong>${escHtml(d.type)}</strong> \u2014 ${escHtml(d.note)}</div>`).join("")}
  ${schema.suggestions?.length ? `<h3>Recommendations</h3>${schema.suggestions.map((s) => `<p>\u2022 ${escHtml(s)}</p>`).join("")}` : ""}
</div>

<div class="section">
  <h2>Content Structure (${cs.score || 0}/100)</h2>
  ${cs.analysis?.summary ? `<p>${escHtml(cs.analysis.summary)}</p>` : ""}
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-value">${cs.raw?.estimatedWordCount || 0}</div><div class="stat-label">Words</div></div>
    <div class="stat-box"><div class="stat-value">${cs.raw?.totalHeadings || 0}</div><div class="stat-label">Headings</div></div>
    <div class="stat-box"><div class="stat-value">${cs.raw?.paragraphCount || 0}</div><div class="stat-label">Paragraphs</div></div>
    <div class="stat-box"><div class="stat-value">${cs.raw?.avgParagraphLength || 0}w</div><div class="stat-label">Avg \xB6 Length</div></div>
  </div>
  ${cs.raw?.headingHierarchy?.length ? `<h3>Heading Outline</h3><div class="heading-tree">${cs.raw.headingHierarchy.slice(0, 30).map((h) => `${"&nbsp;&nbsp;".repeat(h.level - 1)}<strong>H${h.level}</strong> ${escHtml(h.text)}`).join("<br>")}</div>` : ""}
</div>

<div class="section">
  <h2>Internal Links (${il.score || 0}/100)</h2>
  <div class="stat-grid">
    <div class="stat-box"><div class="stat-value">${il.internalLinks || 0}</div><div class="stat-label">Internal</div></div>
    <div class="stat-box"><div class="stat-value">${il.externalLinks || 0}</div><div class="stat-label">External</div></div>
    <div class="stat-box"><div class="stat-value">${il.descriptiveAnchors || 0}</div><div class="stat-label">Descriptive</div></div>
    <div class="stat-box"><div class="stat-value">${il.genericAnchors || 0}</div><div class="stat-label">Generic</div></div>
  </div>
  ${il.suggestions?.length ? `<h3>Recommendations</h3>${il.suggestions.map((s) => `<p>\u2022 ${escHtml(s)}</p>`).join("")}` : ""}
</div>

<div class="footer">
  <p>Generated by RankPilot AI Readiness Audit \u2022 ${(/* @__PURE__ */ new Date()).toLocaleDateString()}</p>
</div>

</body></html>`;
}
var GRADE_ORDER = ["F", "D", "C", "C+", "B-", "B", "B+", "A-", "A"];
function gradeIndex(grade) {
  return GRADE_ORDER.indexOf(grade);
}
function gradeMetOrExceeds(actual, target) {
  const ai = gradeIndex(actual);
  const ti = gradeIndex(target);
  if (ai === -1 || ti === -1) return false;
  return ai >= ti;
}
async function runAutoGradeLoop({
  articleId,
  projectId,
  targetGrade,
  maxIterations,
  logFn
}) {
  const db = await getDb();
  if (!db) return { finalGrade: "?", iterationsRun: 0 };
  const [project] = await db.select().from(projects).where(eq2(projects.id, projectId)).limit(1);
  const allVoices = project ? await db.select().from(brandVoices).where(eq2(brandVoices.projectId, project.id)) : [];
  const defaultBrandVoice = allVoices.find((bv) => bv.isDefault === 1) || allVoices[0] || null;
  const projectCitations = project ? await db.select().from(citationSources).where(eq2(citationSources.projectId, project.id)) : [];
  let citationSourcesSection = "";
  if (projectCitations.length > 0) {
    const sourcesList = projectCitations.map((c, i) => {
      let entry = `  ${i + 1}. ${c.name} \u2014 ${c.url}`;
      if (c.description) entry += ` (${c.description})`;
      return entry;
    }).join("\n");
    citationSourcesSection = `
AVAILABLE CITATION SOURCES:
${sourcesList}`;
  }
  let brandVoiceSection = "";
  if (defaultBrandVoice) {
    brandVoiceSection = `
BRAND VOICE REFERENCE:
- Voice Name: ${defaultBrandVoice.name}
- Tone Traits: ${defaultBrandVoice.toneTraits}
- Perspective: ${defaultBrandVoice.perspective}`;
  }
  const hasICP = !!(project?.icpPrimaryName && project?.icpPains);
  const totalPoints = 100 + (defaultBrandVoice ? 10 : 0) + (hasICP ? 10 : 0);
  let iterationsRun = 0;
  let finalGrade = "?";
  for (let i = 0; i < maxIterations; i++) {
    const [article] = await db.select().from(articles).where(eq2(articles.id, articleId)).limit(1);
    if (!article) break;
    const gradeSystemPrompt = `You are the GEO Content Grader. Grade the article and return ONLY valid JSON.
${citationSourcesSection}
${brandVoiceSection}

WEIGHTING: E-E-A-T Trust: 30pts, Accuracy: 25pts, AIO Readiness: 20pts, Readability: 10pts, SEO/Entity: 10pts, Risk Hygiene: 5pts${defaultBrandVoice ? ", Brand Voice: 10pts" : ""}${hasICP ? ", ICP Alignment: 10pts" : ""}.

For each category provide: score, maxScore, weight, label, analysis (2 sentences), improvements (3 specific actionable items).
Also provide: totalScore, gradeBand (A|A-|B+|B|B-|C+|C|D|F), keyStrengths (3 items), keyWeaknesses (2-3 items), penalties (array), prioritizedActions (top 3).

Respond ONLY with valid JSON \u2014 no markdown fences.`;
    const gradeResponse = await callLLM({
      messages: [
        { role: "system", content: gradeSystemPrompt },
        { role: "user", content: `Grade this article:

Title: ${article.title}
Keyword: ${article.keyword || "Not specified"}

Content:
${article.content}` }
      ]
    }, projectId);
    const gradeRaw = gradeResponse.choices?.[0]?.message?.content || "";
    const gradeJsonMatch = gradeRaw.match(/\{[\s\S]*\}/);
    if (!gradeJsonMatch) break;
    let gradeData = extractJSON(gradeJsonMatch[0]);
    if (!gradeData) break;
    finalGrade = gradeData.gradeBand || "?";
    iterationsRun++;
    console.log(`[AutoGrade] Iteration ${i + 1}: grade=${finalGrade}, target=${targetGrade}`);
    logFn?.("auto_grade", `Iteration ${i + 1}: graded ${finalGrade} (target: ${targetGrade})`, "info", { iteration: i + 1, grade: finalGrade, targetGrade });
    if (gradeMetOrExceeds(finalGrade, targetGrade)) {
      console.log(`[AutoGrade] Target grade ${targetGrade} reached after ${iterationsRun} iteration(s).`);
      logFn?.("auto_grade", `Target grade ${targetGrade} reached after ${iterationsRun} iteration(s)`, "success", { finalGrade, iterationsRun });
      break;
    }
    const categoryKeys = ["eeatTrust", "accuracy", "aioReadiness", "readabilityUx", "seoEntityCoverage", "riskHygiene", "brandVoiceAlignment", "icpAlignment"];
    const allImprovements = [];
    for (const key of categoryKeys) {
      const cat = gradeData[key];
      if (cat?.improvements?.length) {
        allImprovements.push(...cat.improvements);
      }
    }
    if (allImprovements.length === 0) break;
    const improvementsList = allImprovements.slice(0, 12).map((imp, idx) => `${idx + 1}. ${imp}`).join("\n");
    const applySystemPrompt = `You are an expert content editor. Apply the listed improvements to the article. For each improvement, identify the EXACT original text snippet (verbatim from the article) and the replacement text.
${brandVoiceSection ? brandVoiceSection : ""}

Rules:
- Select the SMALLEST possible text snippet \u2014 ideally a SINGLE SENTENCE.
- The "original" field must be an EXACT substring of the article content.
- If an improvement requires adding NEW content, set "original" to the sentence AFTER which new content should appear, and "replacement" to that sentence PLUS the new content.
- NEVER rewrite text unrelated to the improvement.
- Maintain original tone, perspective, and formatting.

Respond ONLY with a JSON array (no markdown fences):
[{"improvement": "...", "original": "...", "replacement": "..."}]`;
    const applyResponse = await callLLM({
      messages: [
        { role: "system", content: applySystemPrompt },
        { role: "user", content: `Apply these improvements:

${improvementsList}

===FULL ARTICLE===
${article.content}
===END ARTICLE===` }
      ]
    }, projectId);
    const applyRaw = applyResponse.choices?.[0]?.message?.content || "";
    const applyJsonMatch = applyRaw.match(/\[[\s\S]*\]/);
    if (!applyJsonMatch) continue;
    let edits = [];
    const parsedAutoEdits = extractJSON(applyJsonMatch[0]);
    if (!parsedAutoEdits || !Array.isArray(parsedAutoEdits)) continue;
    edits = parsedAutoEdits;
    let improvedContent = article.content || "";
    let appliedCount = 0;
    for (const edit of edits) {
      if (!edit.original || !edit.replacement) continue;
      if (improvedContent.includes(edit.original)) {
        improvedContent = improvedContent.replace(edit.original, edit.replacement);
        appliedCount++;
      } else {
        const trimmed = edit.original.trim();
        if (trimmed && improvedContent.includes(trimmed)) {
          improvedContent = improvedContent.replace(trimmed, edit.replacement.trim());
          appliedCount++;
        }
      }
    }
    if (appliedCount > 0) {
      improvedContent = stripWrappingStrongTags(improvedContent);
      improvedContent = stripTargetBlank(improvedContent);
      const newWordCount = improvedContent.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      await db.update(articles).set({ content: improvedContent, wordCount: newWordCount }).where(eq2(articles.id, articleId));
      console.log(`[AutoGrade] Applied ${appliedCount} edits in iteration ${i + 1}.`);
      logFn?.("auto_grade", `Applied ${appliedCount} improvements in iteration ${i + 1}`, "success", { appliedCount, iteration: i + 1, newWordCount });
    }
  }
  return { finalGrade, iterationsRun };
}

// server/_core/context.ts
async function createContext(opts) {
  let user = null;
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user
  };
}

// server/_core/app.ts
function createApiApp() {
  const app = express();
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use(cookieParser());
  registerOAuthRoutes(app);
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext
    })
  );
  return app;
}

// server/_core/vercel-entry.ts
var vercel_entry_default = createApiApp();
export {
  vercel_entry_default as default
};
