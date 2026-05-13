import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  clearSessionCookie,
  getSessionToken,
  hashPassword,
  setSessionCookie,
  signAppSession,
  verifyAppSession,
  verifyPassword,
} from "./customAuth";
import { z } from "zod";
import {
  getProjectsByUserId, getProjectById, createProject, updateProject, deleteProject,
  getOutlinesByProject, getOutlineById, createOutline, updateOutline, deleteOutline,
  getArticlesByProject, getArticleById, createArticle, updateArticle, deleteArticle,
  getArticleStats, getArticlesByUser, getOutlinesByUser,
  getICPsByProject, getICPById, createICP, updateICP, deleteICP,
  getBrandVoicesByProject, getBrandVoiceById, createBrandVoice, updateBrandVoice, deleteBrandVoice,
  getCTAsByProject, getCTAById, createCTA, updateCTA, deleteCTA,
  getSitemapsByProject, getSitemapById, createSitemap, updateSitemap, deleteSitemap,
  getCitationsByProject, getCitationById, createCitation, updateCitation, deleteCitation,
  updateProjectReferenceDocMeta,
  getScheduledJobsByProject, getScheduledJobsByUser, getScheduledJobById, createScheduledJob, updateScheduledJob, deleteScheduledJob, getDueScheduledJobs,
  getKeywordQueueByJob, getKeywordQueueItemById, addKeywordToQueue, addKeywordsToQueue, updateKeywordQueueItem, deleteKeywordQueueItem, getNextPendingKeyword, countPendingKeywords,
  getJobRunHistory, createJobRunHistoryEntry, updateJobRunHistoryEntry,
  addSchedulerRunLog, getSchedulerRunLogs, getSchedulerRunLogsByRunId,
  calculateKeywordPriority, getProjectKeywordsList, addProjectKeywordsBulk, deleteProjectKeywordsBulk, updateProjectKeywordPage, getProjectKeywordsCount, matchKeywordsToArticles,
  getIdeasByProject, getIdeaById, createIdea, createIdeasBulk, updateIdea, deleteIdea, deleteIdeasBulk, getIdeasCount,
} from "./db";
import { storagePut, storageGet } from "./storage";
import { applyBackgroundColors } from "./applyBackgroundColors";
import { applyTemplateStyles } from "./applyTemplateStyles";
import { invokeLLM } from "./_core/llm";
import type { InvokeParams, InvokeResult } from "./_core/llm";
import { invokeClaudeLLM } from "./claude";
import { parseSitemap } from "./sitemap-parser";
import type { OutlineSection, OutlineSettings, ICPDemographics, SitemapUrl } from "../drizzle/schema";
import { articles, projects, brandVoices, citationSources, gscExports, appUsers, scheduledJobs, keywordQueue, projectKeywords, ideas } from "../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { getDb } from "./db";
import { getEntityAnalysisPrompt, getSemanticAnalysisPrompt } from "./entity-prompts";
import type { EntityAnalysisResult, SemanticAnalysisResult } from "../shared/entity-types";
import type { ResearchFindings } from "../shared/research-types";
import { parseGscExcel, computeNearJump } from "./gsc-parser";

/**
 * Generate a timestamped S3 key for a reference doc backup.
 * Each save creates a new immutable file (CDN caching prevents overwrites).
 */
export function getReferenceDocS3Key(projectId: number): string {
  return `reference-docs/project-${projectId}-${Date.now()}.txt`;
}

/**
 * Fetch a project's reference document from S3 using a stored key.
 * Returns the content string, or null if not found / fetch failed.
 * This is a FALLBACK — DB content is the primary source of truth.
 */
export async function fetchReferenceDocFromS3(s3Key: string): Promise<string | null> {
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

/** Build a research section string to inject into the outline prompt */
function buildResearchSection(research: any): string {
  const currentYear = new Date().getFullYear();
  let section = `\n=== RESEARCH FINDINGS - USE THESE TO INFORM THE OUTLINE ===\nCurrent Year: ${currentYear}. Always use the most recent data available. Prefer ${currentYear} data over older data.\n\n`;

  if (research.statistics?.length) {
    section += `STATISTICS & DATA POINTS TO REFERENCE:\n`;
    research.statistics.slice(0, 6).forEach((stat: any, i: number) => {
      section += `  ${i + 1}. ${stat.value} - ${stat.fact} (${stat.source}${stat.year ? `, ${stat.year}` : ''})\n`;
    });
    section += '\n';
  }

  if (research.authoritativeSources?.length) {
    section += `AUTHORITATIVE SOURCES TO CITE:\n`;
    research.authoritativeSources.slice(0, 5).forEach((source: any, i: number) => {
      section += `  ${i + 1}. ${source.name} (${source.type}) - ${source.description}\n`;
    });
    section += '\n';
  }

  if (research.experts?.length) {
    section += `EXPERTS TO REFERENCE FOR E-E-A-T:\n`;
    research.experts.slice(0, 4).forEach((expert: any, i: number) => {
      section += `  ${i + 1}. ${expert.name}, ${expert.credentials}`;
      if (expert.notableQuote) section += ` - "${expert.notableQuote}"`;
      section += '\n';
    });
    section += '\n';
  }

  if (research.commonQuestions?.length) {
    section += `COMMON QUESTIONS (USE FOR FAQ SECTION):\n`;
    research.commonQuestions.slice(0, 6).forEach((q: any, i: number) => {
      section += `  ${i + 1}. ${q.question} [${q.intent}]\n`;
    });
    section += '\n';
  }

  if (research.competitorAngles?.length) {
    section += `COMPETITOR ANGLES (DIFFERENTIATE FROM THESE):\n`;
    research.competitorAngles.slice(0, 4).forEach((angle: any, i: number) => {
      section += `  ${i + 1}. ${angle.angle}`;
      if (angle.differentiator) section += ` → Differentiate by: ${angle.differentiator}`;
      section += '\n';
    });
    section += '\n';
  }

  if (research.keyTakeaways?.length) {
    section += `KEY POINTS TO COVER:\n`;
    research.keyTakeaways.forEach((takeaway: string, i: number) => {
      section += `  ${i + 1}. ${takeaway}\n`;
    });
    section += '\n';
  }

  section += `RESEARCH INTEGRATION REQUIREMENTS:
1. Structure the outline to address the common questions in the FAQ section
2. Reference statistics in relevant sections (include source names)
3. Create content that differentiates from competitor angles
4. Design headings that cover the key takeaways
5. Include expert references where credibility matters\n`;

  return section;
}

/**
 * Unified LLM caller — routes to built-in (Forge/Gemini) or Claude based on project settings.
 * Falls back to built-in if no project context or provider is "builtin".
 */
async function callLLM(
  params: InvokeParams,
  projectId?: number | null
): Promise<InvokeResult> {
  if (projectId) {
    const project = await getProjectById(projectId);
    if (project && project.llmProvider === "claude") {
      return invokeClaudeLLM(params, project.llmModel || undefined);
    }
  }
  return invokeLLM(params);
}

/**
 * Post-processing: split paragraphs that exceed the sentence limit.
 * Works with both HTML (<p> tags) and plain text (double newlines).
 * Uses a regex-based sentence splitter that handles common abbreviations.
 */
function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by a space or end of string.
  // Handles common abbreviations like Dr., Mr., Mrs., U.S., etc.
  const abbrevPattern = /(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|Inc|Ltd|Corp|vs|etc|e\.g|i\.e|U\.S|U\.K)$/i;
  const raw = text.match(/[^.!?]*[.!?]+[\s]*/g) || [text];
  
  // Rejoin fragments that were split on abbreviations
  const sentences: string[] = [];
  let buffer = "";
  for (const frag of raw) {
    buffer += frag;
    const trimmed = buffer.trim();
    // Check if this ends with an abbreviation — if so, keep accumulating
    const beforePeriod = trimmed.replace(/[.!?]+$/, "");
    if (abbrevPattern.test(beforePeriod) && frag !== raw[raw.length - 1]) {
      continue;
    }
    sentences.push(buffer.trim());
    buffer = "";
  }
  if (buffer.trim()) sentences.push(buffer.trim());
  return sentences.filter(s => s.length > 0);
}

/**
 * Strips markdown code fences from LLM output.
 * Handles: ```html\n...\n```, ```\n...\n```, and bare trailing ```
 */
function stripMarkdownFences(content: string): string {
  // Remove opening fence: ```json, ```html, ```markdown, ``` etc. (with optional whitespace/newline)
  let stripped = content.replace(/^```(?:json|html|markdown|md)?\s*\n?/i, '');
  // Remove closing fence: trailing ``` (with optional whitespace)
  stripped = stripped.replace(/\n?```\s*$/i, '');
  return stripped.trim();
}

/**
 * Robustly extract JSON from LLM responses that may contain extra text,
 * markdown fences, or other wrapping around the actual JSON content.
 */
function extractJSON(raw: string): any {
  // Step 1: Try direct parse after stripping markdown fences
  const stripped = stripMarkdownFences(raw);
  try {
    return JSON.parse(stripped);
  } catch {}

  // Step 2: Try to find a JSON array [...] in the text
  const arrayMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  // Step 3: Try to find a JSON object {...} in the text
  const objectMatch = raw.match(/\{\s*"[\s\S]*\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {}
  }

  // Step 4: Try removing everything before the first [ or { and after the last ] or }
  const firstBracket = raw.indexOf('[');
  const firstBrace = raw.indexOf('{');
  const start = firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace) ? firstBracket : firstBrace;
  if (start >= 0) {
    const isArray = raw[start] === '[';
    const lastClose = isArray ? raw.lastIndexOf(']') : raw.lastIndexOf('}');
    if (lastClose > start) {
      try {
        return JSON.parse(raw.slice(start, lastClose + 1));
      } catch {}
    }
  }

  // All attempts failed
  return null;
}

/**
 * Returns the expected average CTR for a given SERP position.
 * Based on industry benchmarks (Advanced Web Ranking / Backlinko studies).
 */
function getExpectedCtr(position: number): number {
  const pos = Math.round(position);
  const ctrMap: Record<number, number> = {
    1: 31.7, 2: 24.7, 3: 18.7, 4: 13.6, 5: 9.5,
    6: 6.2, 7: 4.2, 8: 3.1, 9: 2.4, 10: 2.1,
  };
  if (pos <= 0) return 31.7;
  if (pos <= 10) return ctrMap[pos] ?? 2.1;
  if (pos <= 20) return 1.0;
  if (pos <= 30) return 0.5;
  return 0.2;
}

/**
 * Strips em dashes (— U+2014) from LLM-generated content.
 * Rules:
 *  - Em dash at the end of a sentence/line (optionally followed by whitespace) → removed
 *  - Em dash used as a clause separator (word — word) → replaced with a comma and space
 *  - Any remaining em dashes → removed
 * Applied as a post-processing step on all LLM-generated article content before saving/returning.
 */
function stripEmDashes(content: string): string {
  // 1. Em dash at end of a line or sentence (e.g. "some text —" or "some text—") → remove
  let result = content.replace(/\s*\u2014\s*(<\/|\n|$)/g, '$1');
  // 2. Em dash used as clause separator between words (word — word or word—word) → replace with ", "
  result = result.replace(/(\w)\s*\u2014\s*(\w)/g, '$1, $2');
  // 3. Any remaining em dashes → remove
  result = result.replace(/\u2014/g, '');
  return result;
}

/**
 * Strips "Short Answer:" (and common variants) prefix from FAQ answers in LLM-generated content.
 * The LLM sometimes adds this label even when not instructed to. Removes it from:
 *  - HTML content: inside <p> tags (e.g. <p><strong>Short Answer:</strong> ...)</p> or <p>Short Answer: ...)</p>
 *  - Plaintext content: at the start of a line
 */
function stripShortAnswerPrefix(content: string): string {
  // HTML variant: <p><strong>Short Answer:</strong> or <p>Short Answer:
  let result = content.replace(/<p>\s*(?:<strong>)?Short Answer:?(?:<\/strong>)?\s*/gi, '<p>');
  // HTML variant inside other tags: <strong>Short Answer:</strong> at start of paragraph content
  result = result.replace(/<strong>Short Answer:?<\/strong>\s*/gi, '');
  // Plaintext variant: "Short Answer:" at start of a line
  result = result.replace(/^Short Answer:?\s*/gim, '');
  return result;
}

/**
 * Strips unwanted <strong>/<b> wrapping that LLMs sometimes add to "highlight" their edits.
 * Only strips <strong>/<b> tags that wrap an ENTIRE block-level element's content
 * (e.g., <p><strong>entire paragraph</strong></p> or <h3><strong>heading</strong></h3>).
 * Preserves legitimate inline bold usage (e.g., "The cost is <strong>$202.90</strong> per month").
 */
function stripWrappingStrongTags(content: string): string {
  // Pattern: <strong> or <b> that wraps the entire content of a block element
  // Match: <p><strong>...entire content...</strong></p>
  // Match: <h2><strong>...entire content...</strong></h2>
  // Match: <li><strong>...entire content...</strong></li>
  // Don't match: <p>Some text <strong>bold word</strong> more text</p>
  let result = content;
  
  // Strip <strong>/<b> that wraps entire content inside block tags
  // This regex matches when <strong> is immediately after an opening block tag
  // and </strong> is immediately before the closing block tag
  result = result.replace(
    /(<(?:p|h[1-6]|li|td|th|div|blockquote)(?:\s[^>]*)?>)\s*<(?:strong|b)>((?:(?!<\/(?:strong|b)>).)*)<\/(?:strong|b)>\s*(<\/(?:p|h[1-6]|li|td|th|div|blockquote)>)/gi,
    '$1$2$3'
  );
  
  // Also handle standalone lines that are entirely wrapped: <strong>Full sentence here.</strong>
  // (when not inside any block tag — the LLM sometimes returns bare wrapped text)
  result = result.replace(
    /^<(?:strong|b)>((?:(?!<(?:strong|b)[\s>]).)*)<\/(?:strong|b)>$/gm,
    '$1'
  );
  
  return result;
}

/**
 * Removes target="_blank" and rel="noopener noreferrer" from all <a> tags
 * so that links open in the same tab.
 */
function stripTargetBlank(content: string): string {
  // Remove target="_blank" (with or without surrounding whitespace)
  let result = content.replace(/\s*target="_blank"/gi, '');
  // Remove target='_blank' (single quotes)
  result = result.replace(/\s*target='_blank'/gi, '');
  // Remove rel="noopener noreferrer" that was added alongside target="_blank"
  result = result.replace(/\s*rel="noopener noreferrer"/gi, '');
  result = result.replace(/\s*rel='noopener noreferrer'/gi, '');
  return result;
}

/**
 * Pre-processes LLM HTML output to fix common malformations before further processing:
 * 1. Removes spaces inside URLs in href attributes (e.g. "https://www. example.com" → "https://www.example.com")
 * 2. Rejoins <a href> tags that were split across newlines by the LLM
 * 3. Repairs orphaned URL fragments (e.g. bare `com/path/">anchor text</a>` with missing opening tag)
 */
function fixBrokenAnchors(content: string): string {
  // Step 1: Remove spaces inside href URLs (LLM sometimes adds spaces in long URLs)
  // Matches href="..." and removes any spaces within the URL value
  let fixed = content.replace(/href="([^"]*)"/gi, (_match, url: string) => {
    return `href="${url.replace(/\s+/g, '')}"`;
  });

  // Step 2: Rejoin <a href> tags split across </p>\n<p> or \n boundaries
  // Pattern: href="https://www.example.</p>\n<p>com/path/" → href="https://www.example.com/path/"
  fixed = fixed.replace(/href="([^"]*)<\/p>\s*<p>([^"]*)"/gi, (_match, before: string, after: string) => {
    return `href="${before}${after}"`;
  });
  // Also handle split across bare newlines (without </p><p>)
  fixed = fixed.replace(/href="([^"]*)\n([^"]*)"/gi, (_match, before: string, after: string) => {
    return `href="${before}${after}"`;
  });

  // Step 3: Repair orphaned URL fragments that lost their <a href= opening
  // Pattern: \n<p>com/path/">anchor text</a> more text</p>
  // These occur when the <a href="https://www.domain. was on the previous line and got swallowed
  // We can't recover the URL, so strip the broken fragment and keep the rest of the paragraph
  fixed = fixed.replace(/\n<p>([a-z][^<>\s]*\/">)([\s\S]*?)<\/p>/g, (_match, _fragment, rest) => {
    return `\n<p>${rest}</p>`;
  });

  return fixed;
}

/**
 * Sanitize hyperlinks inserted by the LLM during improvement application.
 * Fixes two common problems:
 * 1. Fabricated URLs — LLM invents URLs that don't exist. If a link's domain doesn't
 *    match any of the allowed citation source domains, the <a> tag is stripped and
 *    only the anchor text is kept.
 * 2. Overly long anchor text — LLM wraps entire sentences as links. If anchor text
 *    exceeds 10 words, it's trimmed to the first meaningful phrase.
 *
 * @param content  The HTML content with newly inserted links
 * @param allowedDomains  Array of domain strings from the project's citation sources
 *                        (e.g. ["medicare.gov", "cms.gov", "kff.org"])
 */
function sanitizeInsertedLinks(
  content: string,
  allowedDomains: string[]
): string {
  // Normalize allowed domains: strip www. prefix and lowercase
  const normalizedAllowed = allowedDomains.map(d =>
    d.toLowerCase().replace(/^www\./, '')
  );

  // Match all <a ...>...</a> tags (non-greedy, handles multiline)
  return content.replace(
    /<a\s+([^>]*href="([^"]*)"[^>]*)>((?:(?!<\/a>)[\s\S])*)<\/a>/gi,
    (fullMatch, attrs: string, href: string, anchorText: string) => {
      // --- Check 1: Validate URL domain against allowed citation sources ---
      if (normalizedAllowed.length > 0) {
        try {
          const url = new URL(href);
          const linkDomain = url.hostname.toLowerCase().replace(/^www\./, '');
          const isAllowed = normalizedAllowed.some(allowed =>
            linkDomain === allowed || linkDomain.endsWith('.' + allowed)
          );
          if (!isAllowed) {
            // Domain not in citation sources — strip the <a> tag, keep text
            return anchorText;
          }
        } catch {
          // Invalid URL — strip the link
          return anchorText;
        }
      }

      // --- Check 2: Trim overly long anchor text ---
      // Strip inner HTML tags for word counting
      const plainAnchor = anchorText.replace(/<[^>]+>/g, '').trim();
      const words = plainAnchor.split(/\s+/);
      if (words.length > 10) {
        // Find a natural break point: look for the core factual phrase
        // Strategy: take up to 7 words, ending at a natural boundary
        let trimmedWordCount = 7;
        // Try to end at a comma, period, or conjunction
        for (let i = 5; i <= Math.min(8, words.length); i++) {
          const word = words[i];
          if (/^(and|or|but|which|that|including|with|for|from|to|in|at|by|as|is|are|was|were|the|a|an)$/i.test(word)) {
            trimmedWordCount = i;
            break;
          }
        }
        const trimmedText = words.slice(0, trimmedWordCount).join(' ');
        // Close the <a> tag around just the trimmed portion, put the rest outside
        const remainingText = words.slice(trimmedWordCount).join(' ');
        return `<a ${attrs}>${trimmedText}</a> ${remainingText}`;
      }

      // Link is valid and anchor text is reasonable — keep as-is
      return fullMatch;
    }
  );
}

/**
 * Wraps bare text lines (not inside HTML tags) in <p> tags.
 * The LLM often outputs HTML headings but plain text paragraphs separated by newlines.
 * TipTap needs <p> tags to render separate paragraphs.
 */
function wrapBareTextInPTags(content: string): string {
  const lines = content.split(/\n/);
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue; // skip empty lines
    // If the line already starts with an HTML block-level tag, leave it as-is
    if (/^<(h[1-6]|p|ul|ol|li|table|thead|tbody|tr|td|th|div|blockquote|hr|br|figure|figcaption|section|article|nav|header|footer|pre|code|img|a\s)/i.test(trimmed)) {
      result.push(trimmed);
    } else if (/^<\/(h[1-6]|p|ul|ol|li|table|thead|tbody|tr|td|th|div|blockquote|pre|code|section|article|nav|header|footer|figure|figcaption)>/i.test(trimmed)) {
      // Closing tag on its own line
      result.push(trimmed);
    } else {
      // Bare text — wrap in <p> tags
      result.push(`<p>${trimmed}</p>`);
    }
  }
  return result.join("\n");
}

function splitLongParagraphs(content: string, maxSentences: number, format: string): string {
  if (format === "plaintext") {
    // Plain text: paragraphs are separated by double newlines
    const blocks = content.split(/\n\n+/);
    const result: string[] = [];
    for (const block of blocks) {
      const trimmed = block.trim();
      // Skip headings, lists, and short blocks
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-") || trimmed.startsWith("*") || /^\d+\./.test(trimmed)) {
        result.push(block);
        continue;
      }
      const sentences = splitSentences(trimmed);
      if (sentences.length <= maxSentences) {
        result.push(block);
        continue;
      }
      // Split into chunks of maxSentences
      for (let i = 0; i < sentences.length; i += maxSentences) {
        result.push(sentences.slice(i, i + maxSentences).join(" "));
      }
    }
    return result.join("\n\n");
  }

  // HTML: split <p> tags that have too many sentences
  return content.replace(/<p>([\s\S]*?)<\/p>/gi, (match, inner: string) => {
    const text = inner.trim();
    // Skip paragraphs that contain block-level elements or are very short
    if (!text || text.includes("<ul") || text.includes("<ol") || text.includes("<table") || text.includes("<h")) {
      return match;
    }
    const sentences = splitSentences(text);
    if (sentences.length <= maxSentences) {
      return match;
    }
    // Split into chunks of maxSentences sentences each
    const chunks: string[] = [];
    for (let i = 0; i < sentences.length; i += maxSentences) {
      chunks.push(`<p>${sentences.slice(i, i + maxSentences).join(" ")}</p>`);
    }
    return chunks.join("\n");
  });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    /** Return the currently logged-in app user (from JWT cookie), or null */
    me: publicProcedure.query(async ({ ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) return null;
      const db = await getDb();
      if (!db) return null;
      const [user] = await db
        .select({ id: appUsers.id, name: appUsers.name, email: appUsers.email, role: appUsers.role, mustChangePassword: appUsers.mustChangePassword, theme: appUsers.theme })
        .from(appUsers)
        .where(eq(appUsers.id, session.userId));
      return user ?? null;
    }),

    /** Login with email + password */
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [user] = await db
          .select()
          .from(appUsers)
          .where(eq(appUsers.email, input.email.toLowerCase().trim()));
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
        // Update lastLoginAt
        await db.update(appUsers).set({ lastLoginAt: new Date() }).where(eq(appUsers.id, user.id));
        const token = await signAppSession({ userId: user.id, email: user.email, role: user.role });
        setSessionCookie(ctx.res, ctx.req, token);
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          mustChangePassword: user.mustChangePassword,
        };
      }),

    /** Logout — clear the session cookie */
    logout: publicProcedure.mutation(async ({ ctx }) => {
      clearSessionCookie(ctx.res, ctx.req);
      return { success: true } as const;
    }),

    /** Get the current user's theme preference */
    getTheme: publicProcedure.query(async ({ ctx }) => {
      const token = getSessionToken(ctx.req);
      const session = await verifyAppSession(token);
      if (!session) return { theme: "light" as const };
      const db = await getDb();
      if (!db) return { theme: "light" as const };
      const [user] = await db
        .select({ theme: appUsers.theme })
        .from(appUsers)
        .where(eq(appUsers.id, session.userId));
      return { theme: (user?.theme ?? "light") as "light" | "dark" | "system" };
    }),

    /** Set the current user's theme preference */
    setTheme: publicProcedure
      .input(z.object({ theme: z.enum(["light", "dark", "system"]) }))
      .mutation(async ({ ctx, input }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session) throw new Error("Not authenticated");
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        await db.update(appUsers)
          .set({ theme: input.theme })
          .where(eq(appUsers.id, session.userId));
        return { success: true, theme: input.theme };
      }),

    /** Change password for the currently logged-in user */
    changePassword: publicProcedure
      .input(z.object({
        currentPassword: z.string().min(1),
        newPassword: z.string().min(8, "Password must be at least 8 characters"),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session) throw new Error("Not authenticated");
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const [user] = await db.select().from(appUsers).where(eq(appUsers.id, session.userId));
        if (!user) throw new Error("User not found");
        const valid = await verifyPassword(input.currentPassword, user.passwordHash);
        if (!valid) throw new Error("Current password is incorrect");
        const newHash = await hashPassword(input.newPassword);
        await db.update(appUsers)
          .set({ passwordHash: newHash, mustChangePassword: 0 })
          .where(eq(appUsers.id, user.id));
        return { success: true } as const;
      }),
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
      return db
        .select({ id: appUsers.id, name: appUsers.name, email: appUsers.email, role: appUsers.role, isActive: appUsers.isActive, mustChangePassword: appUsers.mustChangePassword, createdAt: appUsers.createdAt, lastLoginAt: appUsers.lastLoginAt })
        .from(appUsers)
        .orderBy(desc(appUsers.createdAt));
    }),

    /** Create a new user (admin only) */
    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        email: z.string().email(),
        password: z.string().min(8, "Password must be at least 8 characters"),
        role: z.enum(["user", "admin"]).default("user"),
        mustChangePassword: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session || session.role !== "admin") throw new Error("Admin access required");
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        // Check for duplicate email
        const [existing] = await db.select({ id: appUsers.id }).from(appUsers).where(eq(appUsers.email, input.email.toLowerCase().trim()));
        if (existing) throw new Error("An account with this email already exists");
        const passwordHash = await hashPassword(input.password);
        const [result] = await db.insert(appUsers).values({
          name: input.name,
          email: input.email.toLowerCase().trim(),
          passwordHash,
          role: input.role,
          mustChangePassword: input.mustChangePassword ? 1 : 0,
        });
        return { id: (result as { insertId: number }).insertId, success: true };
      }),

    /** Update a user's name, role, or active status (admin only) */
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        role: z.enum(["user", "admin"]).optional(),
        isActive: z.boolean().optional(),
        resetPassword: z.string().min(8).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session || session.role !== "admin") throw new Error("Admin access required");
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        const updates: Record<string, unknown> = {};
        if (input.name !== undefined) updates.name = input.name;
        if (input.role !== undefined) updates.role = input.role;
        if (input.isActive !== undefined) updates.isActive = input.isActive ? 1 : 0;
        if (input.resetPassword !== undefined) {
          updates.passwordHash = await hashPassword(input.resetPassword);
          updates.mustChangePassword = 1;
        }
        if (Object.keys(updates).length === 0) return { success: true };
        await db.update(appUsers).set(updates).where(eq(appUsers.id, input.id));
        return { success: true };
      }),

    /** Delete a user (admin only) — cannot delete yourself */
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session || session.role !== "admin") throw new Error("Admin access required");
        if (session.userId === input.id) throw new Error("You cannot delete your own account");
        const db = await getDb();
        if (!db) throw new Error("Database unavailable");
        await db.delete(appUsers).where(eq(appUsers.id, input.id));
        return { success: true };
      }),
  }),

  projects: router({
    list: publicProcedure.query(async ({ ctx }) => {
      return getProjectsByUserId(1);
    }),
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getProjectById(input.id);
      }),
    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        color: z.string().optional(),
        domain: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createProject({
          name: input.name,
          color: input.color ?? "#6366f1",
          domain: input.domain ?? null,
          description: input.description ?? null,
          userId: 1,
        });
      }),
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        color: z.string().optional(),
        domain: z.string().optional(),
        description: z.string().optional(),
        icpPrimaryName: z.string().max(512).optional(),
        icpWhoTheyAre: z.string().optional(),
        icpPains: z.array(z.string()).max(5).optional(),
        icpGoals: z.array(z.string()).max(5).optional(),
        icpObjections: z.array(z.string()).max(5).optional(),
        icpDecisionTriggers: z.array(z.string()).max(5).optional(),
        icpTrustSignals: z.array(z.string()).max(5).optional(),
        llmProvider: z.enum(["builtin", "claude"]).optional(),
        llmModel: z.string().max(128).optional(),
        bannedPhrases: z.array(z.string()).optional(),
        minInternalLinks: z.number().int().min(0).max(20).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateProject(id, data);
      }),
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteProject(input.id);
      }),
  }),

  outlines: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getOutlinesByProject(input.projectId);
      }),

    listAll: publicProcedure.query(async ({ ctx }) => {
      return getOutlinesByUser(1);
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getOutlineById(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string().min(1),
        keyword: z.string().optional(),
        sections: z.array(z.any()),
        settings: z.any().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createOutline({
          title: input.title,
          keyword: input.keyword ?? null,
          sections: input.sections as OutlineSection[],
          settings: (input.settings as OutlineSettings) ?? null,
          projectId: input.projectId,
          userId: 1,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        keyword: z.string().optional(),
        sections: z.array(z.any()).optional(),
        settings: z.any().optional(),
        status: z.enum(["draft", "approved", "generating", "complete"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateOutline(id, data as any);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteOutline(input.id);
      }),

    /** LLM-powered topic research before outline generation */
    researchTopic: publicProcedure
      .input(z.object({
        topic: z.string().min(1),
        keyword: z.string().optional(),
        niche: z.string().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const currentYear = new Date().getFullYear();

        // Fetch reference doc if project has one
        let referenceDocSection = '';
        try {
          const project = await getProjectById(input.projectId);
          if (project) {
            let refDocContent: string | null = project.referenceDocContent || null;
            if (!refDocContent && project.referenceDocS3Key) {
              refDocContent = await fetchReferenceDocFromS3(project.referenceDocS3Key);
            }
            if (refDocContent && project.referenceDocName) {
              const maxChars = 40000;
              const truncated = refDocContent.length > maxChars
                ? refDocContent.substring(0, maxChars) + '\n[... document truncated for length ...]'
                : refDocContent;
              referenceDocSection = `
REFERENCE DOCUMENT — USE AS SUPPLEMENTARY FACTUAL SOURCE ("${project.referenceDocName}")
================================================================
The following reference document contains verified facts, figures, rules, and details about the topic.
Use this document to SUPPLEMENT and GROUND your research findings.

RULES FOR USING THE REFERENCE DOCUMENT IN RESEARCH:
1. Extract specific statistics, data points, and figures from this document and include them in your statistics section — these are VERIFIED facts.
2. If the document cites specific sources or URLs, include those in your authoritative sources section.
3. Use the document's content to inform your key takeaways — ground them in real facts rather than generic observations.
4. If the document mentions specific experts, organizations, or programs, reference them in your findings.
5. The document should SUPPLEMENT your research, not replace it — still find additional external sources and data points beyond what the document covers.
6. When a statistic from the document conflicts with your training data, PREFER the document's version.

=== REFERENCE DOCUMENT CONTENT ===
${truncated}
=== END REFERENCE DOCUMENT ===
`;
              console.log(`[Research] Reference doc injected: "${project.referenceDocName}" (${refDocContent.length} chars)`);
            }
          }
        } catch (e) {
          console.warn('[Research] Failed to fetch reference doc:', e);
        }

        const researchPrompt = `You are an expert research assistant conducting comprehensive topic research for content creation.

CURRENT DATE: ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
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
- The "year" field in statistics MUST accurately reflect the data year — do NOT fabricate ${currentYear} dates for older data.
- Only cite real, verifiable sources that actually exist
- Be specific with URLs - use actual page paths, not just homepages
- If you're uncertain about exact URLs, use the base domain
- Make statistics specific and actionable for content creation
- Questions should reflect real user search intent`;

        const response = await callLLM({
          messages: [
            { role: "system", content: `You are an expert research assistant. The current year is ${currentYear}. Always prioritize ${currentYear} data and sources. Return ONLY valid JSON, no markdown fences or explanation.` },
            { role: "user", content: researchPrompt },
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
                  keyTakeaways: { type: "array", items: { type: "string" } },
                },
                required: ["statistics", "authoritativeSources", "experts", "commonQuestions", "competitorAngles", "keyTakeaways"],
                additionalProperties: false,
              },
            },
          },
        }, input.projectId);

        const rawContent = response.choices?.[0]?.message?.content;
        const content = typeof rawContent === 'string' ? rawContent.trim() : '';
        if (!content) throw new Error("No research results generated");

        const findings = extractJSON(content);
        if (!findings) throw new Error("Failed to parse research findings");

        const result: ResearchFindings = {
          topic: input.topic,
          researchedAt: new Date().toISOString(),
          statistics: findings.statistics || [],
          authoritativeSources: findings.authoritativeSources || [],
          experts: findings.experts || [],
          commonQuestions: findings.commonQuestions || [],
          competitorAngles: findings.competitorAngles || [],
          keyTakeaways: findings.keyTakeaways || [],
        };

        return result;
      }),

    /** LLM-powered keyword suggestions for article generation */
    suggestKeywords: publicProcedure
      .input(z.object({
        keyword: z.string().min(1),
        contentType: z.string().optional(),
        targetAudience: z.string().optional(),
        targetLocation: z.string().optional(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const prompt = `You are an expert SEO keyword researcher. Given a primary keyword, suggest related keywords that should be naturally woven into an article to improve topical coverage and semantic relevance.

Primary keyword: "${input.keyword}"
${input.contentType ? `Content type: ${input.contentType}` : ""}
${input.targetAudience ? `Target audience: ${input.targetAudience}` : ""}
${input.targetLocation ? `Target location: ${input.targetLocation}` : ""}

Return a JSON object with exactly these three arrays:
1. "secondary" — 5-8 closely related search terms (synonyms, variations, related queries people also search for)
2. "lsi" — 5-8 LSI/semantic terms (contextually related entities, concepts, and terminology that Google expects to see in comprehensive content on this topic)
3. "longTail" — 3-5 long-tail keyword variations (lower-competition, more specific phrases)

Rules:
- Each keyword should be lowercase
- No duplicates across the three arrays
- Do NOT include the primary keyword itself
- Focus on terms that would genuinely improve the article's topical depth and search relevance
- For LSI terms, think about what entities and concepts Google's NLP would expect in authoritative content on this topic`;

        const response = await callLLM({
          messages: [
            { role: "system", content: "You are an SEO keyword research expert. Return ONLY valid JSON, no markdown fences or explanation." },
            { role: "user", content: prompt },
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
                  longTail: { type: "array", items: { type: "string" }, description: "Long-tail keyword variations" },
                },
                required: ["secondary", "lsi", "longTail"],
                additionalProperties: false,
              },
            },
          },
        }, input.projectId ?? null);

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error("No response from AI");
        const text = typeof rawContent === "string" ? rawContent : (rawContent as any)[0]?.text ?? "";
        const parsed = extractJSON(text);
        if (!parsed) throw new Error("Failed to parse keyword suggestions");
        return {
          secondary: (parsed.secondary || []).slice(0, 8) as string[],
          lsi: (parsed.lsi || []).slice(0, 8) as string[],
          longTail: (parsed.longTail || []).slice(0, 5) as string[],
        };
      }),

    /** AI-powered outline generation */
    generate: publicProcedure
      .input(z.object({
        keyword: z.string().min(1),
        contentType: z.string().optional(),
        tone: z.string().optional(),
        targetWordCount: z.number().optional(),
        numSections: z.number().optional(),
        numFaqs: z.number().optional(),
        additionalInstructions: z.string().optional(),
        projectId: z.number(),
        targetLocation: z.string().optional(),
        targetAudience: z.string().optional(),
        outputFormat: z.enum(["html", "plaintext"]).optional(),
        manualLinks: z.array(z.object({ url: z.string(), anchorText: z.string() })).optional(),
        sitemapUrls: z.array(z.string()).optional(),
        autoLinkCount: z.number().optional(),
        brandVoiceId: z.number().optional(),
        icpProfileId: z.number().optional(),
        secondaryKeywords: z.array(z.string()).optional(),
        research: z.any().optional(),
        useReferenceDoc: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Auto-fetch ICP from project and brand voice (use selected or default)
        const project = await getProjectById(input.projectId);
        const allVoices = await getBrandVoicesByProject(input.projectId);
        const brandVoice = input.brandVoiceId
          ? allVoices.find((v: any) => v.id === input.brandVoiceId) ?? allVoices[0] ?? null
          : allVoices.find((v: any) => v.isDefault === 1) ?? allVoices[0] ?? null;

        // Build ICP section for outline — use selected ICP profile if provided, otherwise fall back to project-level ICP
        let icpSection = "";
        const formatList = (items: string[] | null | undefined, label: string): string => {
          if (!items?.length) return '';
          return `${label}:\n${items.map((item, i) => `  ${i + 1}. ${item}`).join('\n')}\n`;
        };

        if (input.icpProfileId) {
          // Use the specifically selected ICP profile
          const icpProfile = await getICPById(input.icpProfileId);
          if (icpProfile) {
            const demographics = icpProfile.demographics;
            const demoLines = demographics ? [
              demographics.ageRange ? `Age Range: ${demographics.ageRange}` : '',
              demographics.location ? `Location: ${demographics.location}` : '',
              demographics.income ? `Income: ${demographics.income}` : '',
              demographics.education ? `Education: ${demographics.education}` : '',
              demographics.occupation ? `Occupation: ${demographics.occupation}` : '',
              demographics.other ? `Other: ${demographics.other}` : '',
            ].filter(Boolean).join('\n') : '';

            icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) - CRITICAL ===
The outline MUST be structured to serve this specific audience:

TARGET AUDIENCE: ${icpProfile.name}
${icpProfile.description ? `Who They Are: ${icpProfile.description}` : ''}
${demoLines ? `\nDEMOGRAPHICS:\n${demoLines}` : ''}

${formatList(icpProfile.painPoints, 'PAIN POINTS (structure H2 headings around these)')}
${formatList(icpProfile.goals, 'GOALS (address these in content sections)')}
${formatList(icpProfile.objections, 'OBJECTIONS (create FAQ questions from these)')}
${icpProfile.searchBehavior ? `SEARCH BEHAVIOR: ${icpProfile.searchBehavior}\n` : ''}
${formatList(icpProfile.contentPreferences, 'CONTENT PREFERENCES')}

ICP OUTLINE REQUIREMENTS:
1. At least 30% of H2 headings MUST directly reflect the pain points listed above
2. FAQ section MUST include questions that address the objections listed above
3. Structure content to move the reader toward their goals
4. Use language and examples that resonate with "${icpProfile.name}"
`;
          }
        } else if (project?.icpPrimaryName) {
          // Fall back to project-level ICP fields
          icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) - CRITICAL ===
The outline MUST be structured to serve this specific audience:

TARGET AUDIENCE: ${project.icpPrimaryName}
${project.icpWhoTheyAre ? `Who They Are: ${project.icpWhoTheyAre}` : ''}

${formatList(project.icpPains as string[] | null, 'PAIN POINTS (structure H2 headings around these)')}
${formatList(project.icpGoals as string[] | null, 'GOALS (address these in content sections)')}
${formatList(project.icpObjections as string[] | null, 'OBJECTIONS (create FAQ questions from these)')}
${formatList(project.icpDecisionTriggers as string[] | null, 'DECISION TRIGGERS (weave into content flow)')}
${formatList(project.icpTrustSignals as string[] | null, 'TRUST SIGNALS (incorporate in relevant sections)')}

ICP OUTLINE REQUIREMENTS:
1. At least 30% of H2 headings MUST directly reflect the pain points listed above
2. FAQ section MUST include questions that address the objections listed above
3. Include sections that speak to the decision triggers
4. Structure content to move the reader toward their goals
5. Use language and examples that resonate with "${project.icpPrimaryName}"
`;
        }

        // Build Brand Voice section for outline
        let brandVoiceSection = "";
        if (brandVoice) {
          const perspectiveMap: Record<string, string> = {
            first: "First person (we/our/us)",
            second: "Second person (you/your)",
            third: "Third person (they/their)",
          };
          const styleMap: Record<string, string> = {
            short: "Concise, punchy sentences. Paragraphs of 1-3 sentences only.",
            mixed: "Varied sentence lengths with natural rhythm. Paragraphs of 2-5 sentences only.",
            detailed: "Detailed, explanatory sentences. Paragraphs of 3-6 sentences maximum.",
          };

          // Parse avoid list (format: "PRESETS:id1,id2|CUSTOM:text" or legacy text)
          const AVOID_LABELS: Record<string, string> = {
            jargon: "Overly technical jargon", salesy: "Sales-heavy language",
            fear: "Fear-based messaging", exaggerated: "Exaggerated claims",
            cliches: "Industry clichés", passive: "Passive voice",
            buzzwords: "Buzzwords", rhetorical: "Rhetorical questions",
            unverified: "Unverified statistics", competitor: "Competitor comparisons",
          };
          let avoidItems: string[] = [];
          const avoidList = brandVoice.avoidList || "";
          if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
            const parts = avoidList.split("|");
            for (const part of parts) {
              if (part.startsWith("PRESETS:")) {
                const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
                avoidItems.push(...presetIds.map(id => AVOID_LABELS[id] || id));
              } else if (part.startsWith("CUSTOM:")) {
                const custom = part.replace("CUSTOM:", "").trim();
                if (custom) avoidItems.push(...custom.split(",").map(s => s.trim()).filter(Boolean));
              }
            }
          } else if (avoidList) {
            avoidItems = avoidList.split(",").map(s => s.trim()).filter(Boolean);
          }

          brandVoiceSection = `
=== BRAND VOICE GUIDELINES - APPLY TO ALL CONTENT ===
Voice Name: ${brandVoice.name}

TONE TRAITS: ${brandVoice.toneTraits || 'Professional'}

WRITING PERSPECTIVE: ${perspectiveMap[brandVoice.perspective] || brandVoice.perspective}

SENTENCE STYLE: ${styleMap[brandVoice.sentenceStyle] || brandVoice.sentenceStyle}

${avoidItems.length > 0 ? `AVOID:\n${avoidItems.map(item => `- ${item}`).join('\n')}` : ''}

${brandVoice.writingStyleSample ? `STYLE EXAMPLE (for tone reference only — do NOT copy phrases):\n"${brandVoice.writingStyleSample.slice(0, 500)}${brandVoice.writingStyleSample.length > 500 ? '...' : ''}"` : ''}

BRAND VOICE REQUIREMENTS FOR OUTLINE:
1. Craft all section headings using the specified tone traits
2. Key points should reflect the writing perspective (${perspectiveMap[brandVoice.perspective] || brandVoice.perspective})
3. Hook and quick answer sections must match the brand tone
4. FAQ questions should be phrased in a way that matches the voice
5. Avoid anything listed in the "AVOID" section above
6. Plan section key points to be granular enough that each paragraph in the final article stays within the sentence style limits (${styleMap[brandVoice.sentenceStyle] || 'Varied sentence lengths'})
`;
        }

        const currentYear = new Date().getFullYear();

        // Build reference document section for outline if enabled
        let outlineReferenceDocSection = '';
        if (input.useReferenceDoc && project) {
          let refDocContent: string | null = project.referenceDocContent || null;
          if (!refDocContent && project.referenceDocS3Key) {
            refDocContent = await fetchReferenceDocFromS3(project.referenceDocS3Key);
          }
          if (refDocContent && project.referenceDocName) {
            // For outline, use a condensed version (first 40k chars) to keep prompt focused
            const maxChars = 40000;
            const truncated = refDocContent.length > maxChars
              ? refDocContent.substring(0, maxChars) + '\n[... document truncated for length ...]'
              : refDocContent;
            outlineReferenceDocSection = `
REFERENCE DOCUMENT — USE TO GROUND THE OUTLINE ("${project.referenceDocName}")
================================================================
The following reference document contains verified facts, figures, rules, and details about the topic.
Use this document to inform the outline structure and key points.

RULES FOR USING THE REFERENCE DOCUMENT IN THE OUTLINE:
1. When the reference document covers specific subtopics, eligibility rules, costs, procedures, or categories — create dedicated sections or key points for them.
2. Key points in each section should reference specific facts from the document rather than generic talking points.
3. If the reference document has a natural structure (e.g., categories, steps, eligibility tiers), mirror that structure in the outline where appropriate.
4. FAQ questions should address real questions that the reference document answers.
5. Do NOT just summarize the reference document — create an SEO-optimized outline that USES the document as a factual foundation.

=== REFERENCE DOCUMENT CONTENT ===
${truncated}
=== END REFERENCE DOCUMENT ===
`;
            console.log(`[OutlineGen] Reference doc injected: "${project.referenceDocName}" (${refDocContent.length} chars${refDocContent.length > maxChars ? ', truncated to ' + maxChars : ''})`);
          }
        }

        // Resolve sitemap XML URLs to actual parsed page URLs for internal linking
        let resolvedSitemapSection = '';
        if (input.sitemapUrls?.length) {
          const projectSitemaps = await getSitemapsByProject(input.projectId);
          const pageUrls: string[] = [];
          for (const sitemapXmlUrl of input.sitemapUrls) {
            const match = projectSitemaps.find((s: any) => s.url === sitemapXmlUrl);
            if (match?.parsedUrls && Array.isArray(match.parsedUrls)) {
              for (const entry of match.parsedUrls) {
                if (typeof entry === 'string') pageUrls.push(entry);
                else if (entry && typeof entry === 'object' && 'url' in entry) pageUrls.push((entry as SitemapUrl).url);
              }
            }
          }
          if (pageUrls.length > 0) {
            resolvedSitemapSection = `- The article will include ${input.autoLinkCount ?? 5} internal links. Plan sections where these REAL page URLs fit naturally:\n${pageUrls.slice(0, 50).map(u => `  \u2022 ${u}`).join('\n')}`;
          }
        }

        const systemPrompt = `You are an expert SEO content strategist. Generate a detailed article outline for the given keyword.

IMPORTANT — CURRENT DATE CONTEXT: The current year is ${currentYear}. All references to dates, years, regulations, trends, and time-sensitive topics MUST treat ${currentYear} as the present year. Do NOT reference 2024 or any prior year as "current."

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
- Target word count: ${input.targetWordCount ?? 2000} words
- UNIQUENESS: Plan section points that are specific and fresh — avoid generic talking points that appear in every article on this topic. Each outline should feel like a unique angle, not a template.
${input.additionalInstructions ? `- Additional instructions: ${input.additionalInstructions}` : ""}
${input.targetLocation ? `- Target location: ${input.targetLocation} — tailor the outline to be relevant for this geographic area` : ""}
${input.targetAudience ? `- Target audience: ${input.targetAudience} — structure the outline to address this audience's needs` : ""}
${input.manualLinks?.length ? `- The final article will include these internal links — plan sections where they fit naturally:\n${input.manualLinks.map(l => `  • ${l.url}${l.anchorText ? ` (anchor: "${l.anchorText}")` : ""}`).join("\n")}` : ""}
${resolvedSitemapSection}
${icpSection}
${brandVoiceSection}
${input.research ? buildResearchSection(input.research) : ''}
${outlineReferenceDocSection}

Return ONLY valid JSON, no markdown code blocks.`;

        const response = await callLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Generate a detailed article outline for the keyword: "${input.keyword}"` },
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
                              points: { type: "array", items: { type: "string" } },
                            },
                            required: ["id", "heading", "type", "points"],
                            additionalProperties: false,
                          },
                        },
                        targetWordCount: { type: "integer", description: "Target word count for this section" },
                      },
                      required: ["id", "heading", "type", "points", "subSections", "targetWordCount"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "sections"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawOutlineContent = response.choices[0]?.message?.content;
        if (!rawOutlineContent) throw new Error("No response from AI");
        const content = typeof rawOutlineContent === "string" ? rawOutlineContent : (rawOutlineContent as any)[0]?.text ?? "";

        const parsed = extractJSON(content);
        if (!parsed) throw new Error("Failed to parse outline from AI response");

        // Save the outline to the database
        const outline = await createOutline({
          title: parsed.title,
          keyword: input.keyword,
          sections: parsed.sections as OutlineSection[],
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
            secondaryKeywords: input.secondaryKeywords,
          },
          projectId: input.projectId,
          userId: 1,
        });

        return outline;
      }),
  }),

  icpProfiles: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getICPsByProject(input.projectId);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getICPById(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        demographics: z.object({
          ageRange: z.string().optional(),
          location: z.string().optional(),
          income: z.string().optional(),
          education: z.string().optional(),
          occupation: z.string().optional(),
          other: z.string().optional(),
        }).optional(),
        painPoints: z.array(z.string()).optional(),
        goals: z.array(z.string()).optional(),
        objections: z.array(z.string()).optional(),
        contentPreferences: z.array(z.string()).optional(),
        searchBehavior: z.string().optional(),
        isDefault: z.number().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createICP({
          name: input.name,
          description: input.description ?? null,
          demographics: (input.demographics as ICPDemographics) ?? null,
          painPoints: input.painPoints ?? null,
          goals: input.goals ?? null,
          objections: input.objections ?? null,
          contentPreferences: input.contentPreferences ?? null,
          searchBehavior: input.searchBehavior ?? null,
          isDefault: input.isDefault ?? 0,
          projectId: input.projectId,
          userId: 1,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        demographics: z.object({
          ageRange: z.string().optional(),
          location: z.string().optional(),
          income: z.string().optional(),
          education: z.string().optional(),
          occupation: z.string().optional(),
          other: z.string().optional(),
        }).optional(),
        painPoints: z.array(z.string()).optional(),
        goals: z.array(z.string()).optional(),
        objections: z.array(z.string()).optional(),
        contentPreferences: z.array(z.string()).optional(),
        searchBehavior: z.string().optional(),
        isDefault: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateICP(id, data as any);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteICP(input.id);
      }),
  }),

  brandVoices: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getBrandVoicesByProject(input.projectId);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getBrandVoiceById(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        toneTraits: z.string().optional(),
        perspective: z.string().default("second"),
        sentenceStyle: z.string().default("mixed"),
        writingStyleSample: z.string().optional(),
        avoidList: z.string().optional(),
        isDefault: z.number().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createBrandVoice({
          name: input.name,
          toneTraits: input.toneTraits ?? null,
          perspective: input.perspective,
          sentenceStyle: input.sentenceStyle,
          writingStyleSample: input.writingStyleSample ?? null,
          avoidList: input.avoidList ?? null,
          isDefault: input.isDefault ?? 0,
          projectId: input.projectId,
          userId: 1,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        toneTraits: z.string().optional(),
        perspective: z.string().optional(),
        sentenceStyle: z.string().optional(),
        writingStyleSample: z.string().optional(),
        avoidList: z.string().optional(),
        isDefault: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateBrandVoice(id, data as any);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteBrandVoice(input.id);
      }),
  }),

  ctaTemplates: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getCTAsByProject(input.projectId);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getCTAById(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        content: z.string().min(1),
        type: z.string().optional(),
        placement: z.string().optional(),
        url: z.string().optional(),
        buttonText: z.string().optional(),
        isDefault: z.number().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createCTA({
          name: input.name,
          content: input.content,
          type: input.type ?? "inline",
          placement: input.placement ?? "end",
          url: input.url ?? null,
          buttonText: input.buttonText ?? null,
          isDefault: input.isDefault ?? 0,
          projectId: input.projectId,
          userId: 1,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        content: z.string().optional(),
        type: z.string().optional(),
        placement: z.string().optional(),
        url: z.string().optional(),
        buttonText: z.string().optional(),
        isDefault: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateCTA(id, data as any);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteCTA(input.id);
      }),
  }),

  sitemaps: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getSitemapsByProject(input.projectId);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getSitemapById(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        url: z.string().url().min(1),
        projectId: z.number(),
      }))
      .mutation(async ({ input }) => {
        // Parse the sitemap to extract URLs
        const parsedUrls = await parseSitemap(input.url);

        if (parsedUrls.length === 0) {
          throw new Error("Could not parse any URLs from the sitemap. Please verify the URL is correct and accessible.");
        }

        return createSitemap({
          url: input.url,
          parsedUrls,
          urlCount: parsedUrls.length,
          projectId: input.projectId,
        });
      }),

    refresh: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const sitemap = await getSitemapById(input.id);
        if (!sitemap) throw new Error("Sitemap not found");

        const parsedUrls = await parseSitemap(sitemap.url);
        if (parsedUrls.length === 0) {
          throw new Error("Could not parse any URLs from the sitemap during refresh.");
        }

        return updateSitemap(input.id, {
          parsedUrls,
          urlCount: parsedUrls.length,
          lastParsed: new Date(),
        });
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteSitemap(input.id);
      }),

    /**
     * Check for Existing Coverage — scans all project sitemap URLs against a target keyword
     * using LLM analysis to find pages that may already cover the same topic.
     */
    checkCoverage: publicProcedure
      .input(z.object({
        keyword: z.string().min(1),
        projectId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const allSitemaps = await getSitemapsByProject(input.projectId);
        if (!allSitemaps || allSitemaps.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "No sitemaps found for this project. Add a sitemap in Project Settings first." });
        }

        // Collect all parsed URLs from all sitemaps
        const allUrls: { url: string; title?: string }[] = [];
        for (const sm of allSitemaps) {
          if (sm.parsedUrls && Array.isArray(sm.parsedUrls)) {
            for (const u of sm.parsedUrls) {
              allUrls.push({ url: u.url, title: u.title || undefined });
            }
          }
        }

        if (allUrls.length === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Sitemaps contain no parsed URLs. Try refreshing your sitemaps." });
        }

        // Build a compact list for the LLM (number, URL, title if available)
        const urlList = allUrls.map((u, i) =>
          `${i + 1}. ${u.url}${u.title ? ` | Title: "${u.title}"` : ""}`
        ).join("\n");

        const coverageResult = await callLLM({
          messages: [
            {
              role: "system",
              content: `You are a senior SEO strategist performing a strict keyword cannibalization audit. Your job is to identify ONLY pages that would directly compete with a new article on the target keyword.

Flagging criteria — apply these strictly:

**HIGH severity** (flag only if ALL of these are true):
- The existing page targets the SAME primary keyword or search intent as the new article
- A user searching the target keyword could land on this page and have their question fully answered
- Publishing a new article would split ranking signals and directly cannibalize this page

**MEDIUM severity** (flag only if BOTH of these are true):
- The existing page covers the SAME specific subtopic — not just the same broad subject area
- A substantial portion (>40%) of the new article's content would duplicate what this page already covers

**DO NOT flag** pages that:
- Are in the same general topic category but answer a different question
- Mention the keyword in passing but focus on a different primary topic
- Cover a broader or narrower subject (e.g., a category page vs. a specific explainer)
- Are navigation, contact, about, or utility pages

When in doubt, DO NOT flag. A typical site should have 0–3 overlaps for most keywords. If you are flagging more than 5 pages, you are being too liberal — re-evaluate and only keep the strongest matches.

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

Existing pages (${allUrls.length} total):\n${urlList}`
            }
          ],
          response_format: {
            type: "json_schema" as const,
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
                        explanation: { type: "string" },
                      },
                      required: ["url", "title", "severity", "recommendation", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["totalScanned", "overlaps"],
                additionalProperties: false,
              },
            },
          },
        }, input.projectId);

        const rawContent = coverageResult.choices?.[0]?.message?.content;
        const text = typeof rawContent === "string" ? rawContent : "";

        const parsed = extractJSON(text);
        if (!parsed) {
          console.error("[CoverageCheck] Failed to parse LLM response:", text);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse coverage analysis. Please try again." });
        }
        return {
          totalScanned: parsed.totalScanned ?? allUrls.length,
          overlaps: parsed.overlaps ?? [],
          highCount: (parsed.overlaps ?? []).filter((o: any) => o.severity === "high").length,
          mediumCount: (parsed.overlaps ?? []).filter((o: any) => o.severity === "medium").length,
        };
      }),
  }),

  citations: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getCitationsByProject(input.projectId);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getCitationById(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        name: z.string().min(1).max(512),
        url: z.string().url().min(1),
        description: z.string().optional(),
        category: z.string().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createCitation({
          name: input.name,
          url: input.url,
          description: input.description ?? null,
          category: input.category ?? null,
          projectId: input.projectId,
          userId: 1,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(512).optional(),
        url: z.string().url().optional(),
        description: z.string().optional(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateCitation(id, data as any);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteCitation(input.id);
      }),
  }),

  crossCheck: router({
    /** Get the reference document metadata for a project */
    getReferenceDoc: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new Error("Project not found");

        let referenceDoc: string | null = null;
        let s3FetchFailed = false;

        // PRIMARY source: DB content (source of truth)
        if (project.referenceDocContent) {
          referenceDoc = project.referenceDocContent;
        }
        // FALLBACK: S3 backup (if DB content is null but S3 key exists)
        else if (project.referenceDocS3Key) {
          try {
            referenceDoc = await fetchReferenceDocFromS3(project.referenceDocS3Key);
            if (referenceDoc) {
              // Self-heal: backfill DB from S3
              try {
                await updateProjectReferenceDocMeta(
                  input.projectId,
                  project.referenceDocS3Key,
                  project.referenceDocName || "Reference Document",
                  referenceDoc.length,
                  referenceDoc
                );
                console.log(`[RefDoc SELF-HEAL] Backfilled DB from S3 for project ${input.projectId}`);
              } catch { /* non-critical */ }
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
          hasMetadata,
        };
      }),

    /** Update the reference document for a project (DB-primary, S3 as immutable backup) */
    updateReferenceDoc: publicProcedure
      .input(z.object({
        projectId: z.number(),
        referenceDoc: z.string().nullable(),
        referenceDocName: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        if (input.referenceDoc) {
          console.log(`[RefDoc SAVE] project=${input.projectId} name="${input.referenceDocName}" chars=${input.referenceDoc.length} at=${new Date().toISOString()}`);
          // Upload to S3 as immutable backup (timestamped key — CDN caching prevents overwrites)
          let s3Key: string | null = null;
          try {
            s3Key = getReferenceDocS3Key(input.projectId);
            await storagePut(s3Key, input.referenceDoc, "text/plain");
            console.log(`[RefDoc S3] Backup uploaded: ${s3Key}`);
          } catch (e) {
            console.warn(`[RefDoc S3] Backup upload failed:`, e);
            s3Key = null; // Don't store a key that failed to upload
          }
          // Save to DB as PRIMARY source of truth
          const result = await updateProjectReferenceDocMeta(
            input.projectId,
            s3Key,
            input.referenceDocName,
            input.referenceDoc.length,
            input.referenceDoc
          );
          // Verify DB has the content
          try {
            const verify = await getProjectById(input.projectId);
            if (verify?.referenceDocContent && verify.referenceDocContent.length > 0) {
              console.log(`[RefDoc VERIFIED] project=${input.projectId} dbChars=${verify.referenceDocContent.length}`);
            } else {
              console.warn(`[RefDoc VERIFY WARN] project=${input.projectId} — DB content empty after save`);
            }
          } catch { /* non-critical */ }
          return result;
        } else {
          console.log(`[RefDoc DELETE] project=${input.projectId} at=${new Date().toISOString()}`);
          // Just clear DB — old S3 files are harmless orphans (CDN prevents deletion anyway)
          return updateProjectReferenceDocMeta(input.projectId, null, null, null, null);
        }
      }),

    /** Run cross-check on an article against the project's reference document */
    checkArticle: publicProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new Error("Article not found");

        const project = await getProjectById(article.projectId);
        if (!project) throw new Error("Project not found");

        // Read reference doc: DB (primary), S3 (fallback)
        let referenceDoc: string | null = project.referenceDocContent || null;
        if (!referenceDoc && project.referenceDocS3Key) {
          referenceDoc = await fetchReferenceDocFromS3(project.referenceDocS3Key);
        }
        if (!referenceDoc) {
          throw new Error("No reference document found for this project. Add one in Project Settings > Cross Check tab.");
        }
        const referenceDocName = project.referenceDocName || "Reference Document";

        const systemPrompt = `You are a meticulous fact-checker. Your ONLY job is to compare an article against a reference document and identify factual discrepancies.

IMPORTANT RULES:
1. You are ONLY checking for factual accuracy — not grammar, tone, style, SEO, or structure.
2. A "discrepancy" means the article states something that CONTRADICTS or MISREPRESENTS specific facts in the reference document.
3. If the article discusses topics NOT covered in the reference document, that is NOT a discrepancy — ignore those sections entirely.
4. If the article does not touch on any information from the reference document, return an empty discrepancies array.
5. Be very precise — quote the exact text from the article and the exact contradicting fact from the reference document.
6. Do NOT invent issues. Only flag genuine factual conflicts between the two documents.
7. For each discrepancy, provide a corrected version of the article text that aligns with the reference document.

CRITICAL TEXT QUOTING RULES:
- "articleText" MUST be the EXACT, VERBATIM text copied from the article. Do NOT paraphrase, truncate, summarize, or use ellipsis (...).
- Copy the COMPLETE sentence or phrase — never abbreviate with "..." or "[...]".
- If the inaccurate text spans multiple sentences, include ALL of them in full.
- "correction" MUST be the EXACT replacement text that should replace "articleText" word-for-word. It must be ready to directly substitute into the article.
- "correction" must NOT be a description of what to change (e.g., "Change X to Y"). It must be the actual corrected text itself.
- The "correction" should be the same length and structure as "articleText" — only the inaccurate parts should differ.
- NEVER add <strong>, <b>, <em>, or <i> tags to correction text. Do NOT bold or emphasize changed text — the correction must use plain text matching the original formatting.

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

        // Strip HTML tags so the LLM sees plain text and can quote it verbatim
        const plainContent = (article.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        const userPrompt = `REFERENCE DOCUMENT ("${referenceDocName}"):\n---\n${referenceDoc}\n---\n\nARTICLE TO CROSS-CHECK:\nTitle: ${article.title}\nKeyword: ${article.keyword ?? ""}\n\nContent:\n${plainContent}`;

        const response = await callLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }, article.projectId);

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error("No response from AI");
        const contentStr = typeof rawContent === "string" ? rawContent : (rawContent as any)[0]?.text ?? "";

        // Parse JSON from response
        const results = extractJSON(contentStr);
        if (!results) throw new Error("Failed to parse cross-check response");

        return {
          results,
          referenceDocName,
        };
      }),
  }),

  // ---- Redundancy Checker ----
  redundancy: router({
    /** Analyze article content for redundancies: repeated phrases, redundant ideas, recycled stats, filler patterns */
    check: publicProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input }) => {
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
1. Be thorough — scan the ENTIRE article, not just the first few paragraphs.
2. For each redundancy, quote the EXACT text from the article (verbatim, character-for-character match).
3. Provide a specific, actionable fix: either remove the redundant text, merge the two instances, or rewrite to add new information.
4. The "suggestedFix" must be a drop-in replacement for the "originalText" — same format, ready to swap.
5. For FILLER PATTERNS, the suggestedFix should be the sentence rewritten without the filler phrase, or removed entirely if the sentence adds nothing.
6. Do NOT flag things that are intentionally repeated for emphasis or structure (like a keyword in headings).
7. Assign severity based on impact: "high" for full duplicate paragraphs or ideas, "medium" for repeated phrases or stats, "low" for filler patterns.

CRITICAL TEXT QUOTING RULES:
- "originalText" MUST be the EXACT, VERBATIM text copied from the article. Do NOT paraphrase, truncate, summarize, or use ellipsis (...).
- Copy the COMPLETE sentence or phrase — never abbreviate with "..." or "[...]".
- "suggestedFix" MUST be the EXACT replacement text ready to directly substitute into the article.
- "suggestedFix" must NOT be a description of what to change. It must be the actual corrected text itself.
- NEVER add <strong>, <b>, <em>, or <i> tags to suggestedFix text. Do NOT bold or emphasize changed text — the fix must use plain text matching the original formatting.

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

        // Strip HTML tags so the LLM sees plain text and can quote it verbatim
        const plainContent = (article.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

        const userPrompt = `ARTICLE TO CHECK FOR REDUNDANCIES:\nTitle: ${article.title}\nKeyword: ${article.keyword ?? ""}\n\nContent:\n${plainContent}`;

        const response = await callLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }, article.projectId);

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error("No response from AI");
        const contentStr = typeof rawContent === "string" ? rawContent : (rawContent as any)[0]?.text ?? "";

        const results = extractJSON(contentStr);
        if (!results) throw new Error("Failed to parse redundancy check response");

        return { results };
      }),
  }),

  articles: router({
    list: publicProcedure
      .input(z.object({ projectId: z.number(), status: z.string().optional() }))
      .query(async ({ input }) => {
        return getArticlesByProject(input.projectId, input.status);
      }),

    listAll: publicProcedure.query(async ({ ctx }) => {
      return getArticlesByUser(1);
    }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getArticleById(input.id);
      }),

    stats: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getArticleStats(input.projectId);
      }),

    create: publicProcedure
      .input(z.object({
        title: z.string().min(1),
        content: z.string().optional(),
        keyword: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        slug: z.string().optional(),
        wordCount: z.number().optional(),
        status: z.enum(["draft", "review", "complete", "published"]).optional(),
        contentType: z.string().optional(),
        outlineId: z.number().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
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
          userId: 1,
        });
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        content: z.string().optional(),
        keyword: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        metaTitle: z.string().optional(),
        metaDescription: z.string().optional(),
        slug: z.string().optional(),
        wordCount: z.number().optional(),
        status: z.enum(["draft", "review", "complete", "published"]).optional(),
        contentType: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateArticle(id, data as any);
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteArticle(input.id);
      }),

    /** Regenerate a single section of an article using AI */
    regenerateSection: publicProcedure
      .input(z.object({
        articleId: z.number(),
        sectionHeading: z.string().min(1),
        instructions: z.string().optional(),
        toneOverride: z.string().optional(),
        lengthPreference: z.enum(["shorter", "same", "longer"]).optional(),
      }))
      .mutation(async ({ input }) => {
        console.log(`[RegenSection] Starting. articleId=${input.articleId}, heading="${input.sectionHeading}"`);

        const article = await getArticleById(input.articleId);
        if (!article) throw new Error("Article not found");
        if (!article.content) throw new Error("Article has no content");

        // --- Extract the target section from the article HTML ---
        const content = article.content;
        // Find all H2 boundaries
        const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
        const h2Matches: Array<{ fullMatch: string; text: string; index: number }> = [];
        let match: RegExpExecArray | null;
        while ((match = h2Regex.exec(content)) !== null) {
          const headingText = match[1].replace(/<[^>]*>/g, "").trim();
          h2Matches.push({ fullMatch: match[0], text: headingText, index: match.index });
        }

        // Find the target section by heading text (case-insensitive, trimmed)
        const targetIdx = h2Matches.findIndex(h =>
          h.text.toLowerCase().trim() === input.sectionHeading.toLowerCase().trim()
        );
        if (targetIdx === -1) {
          throw new Error(`Section "${input.sectionHeading}" not found in article. Available sections: ${h2Matches.map(h => h.text).join(", ")}`);
        }

        const sectionStart = h2Matches[targetIdx].index;
        const sectionEnd = targetIdx + 1 < h2Matches.length
          ? h2Matches[targetIdx + 1].index
          : content.length;
        const oldSectionContent = content.slice(sectionStart, sectionEnd).trim();

        // --- Build surrounding context ---
        const prevSectionSnippet = sectionStart > 0
          ? content.slice(Math.max(0, sectionStart - 500), sectionStart)
              .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(-300)
          : "";
        const nextSectionSnippet = sectionEnd < content.length
          ? content.slice(sectionEnd, Math.min(content.length, sectionEnd + 500))
              .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)
          : "";

        // --- Fetch project context: brand voice, ICP, outline ---
        const project = article.projectId ? await getProjectById(article.projectId) : null;
        const projectId = article.projectId;

        // Brand voice
        let brandVoiceContext = "";
        let maxSentences = 5;
        if (projectId) {
          const allVoices = await getBrandVoicesByProject(projectId);
          const bv = allVoices.find((v: any) => v.isDefault === 1) || allVoices[0];
          if (bv) {
            const perspectiveMap: Record<string, string> = {
              first: "first person (we/our/us)",
              second: "second person (you/your)",
              third: "third person (they/the company)",
            };
            const styleMap: Record<string, string> = {
              short: "Short and direct. Paragraphs of 1-3 sentences.",
              mixed: "Varied and natural rhythm. Paragraphs of 2-5 sentences.",
              detailed: "Detailed and explanatory. Paragraphs of 3-6 sentences.",
            };
            maxSentences = bv.sentenceStyle === "short" ? 3 : bv.sentenceStyle === "detailed" ? 6 : 5;

            // Parse avoid list
            const AVOID_LABELS: Record<string, string> = {
              jargon: "Overly technical jargon", salesy: "Sales-heavy language",
              fear: "Fear-based messaging", exaggerated: "Exaggerated claims",
              cliches: "Industry clichés", passive: "Passive voice",
              buzzwords: "Buzzwords", rhetorical: "Rhetorical questions",
              unverified: "Unverified statistics", competitor: "Competitor comparisons",
            };
            let avoidItems: string[] = [];
            const avoidList = bv.avoidList || "";
            if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
              const parts = avoidList.split("|");
              for (const part of parts) {
                if (part.startsWith("PRESETS:")) {
                  const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
                  avoidItems.push(...presetIds.map(id => AVOID_LABELS[id] || id));
                } else if (part.startsWith("CUSTOM:")) {
                  const custom = part.replace("CUSTOM:", "").trim();
                  if (custom) avoidItems.push(...custom.split(",").map(s => s.trim()).filter(Boolean));
                }
              }
            } else if (avoidList) {
              avoidItems = avoidList.split(",").map(s => s.trim()).filter(Boolean);
            }

            brandVoiceContext = `\nBRAND VOICE:\n- Tone: ${bv.toneTraits || "Professional"}\n- Perspective: ${perspectiveMap[bv.perspective] || bv.perspective}\n- Sentence style: ${styleMap[bv.sentenceStyle] || "Varied"}${avoidItems.length > 0 ? `\n- Avoid: ${avoidItems.join(", ")}` : ""}`;
          }
        }

        // ICP context (simplified)
        let icpContext = "";
        if (project?.icpPrimaryName) {
          icpContext = `\nTARGET AUDIENCE: ${project.icpPrimaryName}${project.icpWhoTheyAre ? ` — ${project.icpWhoTheyAre}` : ""}`;
        }

        // Outline context for this section
        let outlineContext = "";
        if (article.outlineId) {
          const outline = await getOutlineById(article.outlineId);
          if (outline?.sections) {
            const outlineSection = (outline.sections as OutlineSection[]).find(s =>
              s.heading.toLowerCase().trim() === input.sectionHeading.toLowerCase().trim()
            );
            if (outlineSection) {
              outlineContext = `\nORIGINAL OUTLINE FOR THIS SECTION:\nHeading: ${outlineSection.heading}`;
              if (outlineSection.points?.length) {
                outlineContext += `\nKey points to cover:\n${outlineSection.points.map(p => `- ${p}`).join("\n")}`;
              }
              if (outlineSection.aiInstructions) {
                outlineContext += `\nAI Instructions: ${outlineSection.aiInstructions}`;
              }
              if (outlineSection.subSections?.length) {
                outlineContext += `\nSub-sections:`;
                for (const sub of outlineSection.subSections) {
                  outlineContext += `\n  ### ${sub.heading}`;
                  if (sub.points?.length) {
                    outlineContext += `\n${sub.points.map(p => `  - ${p}`).join("\n")}`;
                  }
                  if (sub.aiInstructions) {
                    outlineContext += `\n  AI Instructions: ${sub.aiInstructions}`;
                  }
                }
              }
            }
          }
        }

        // Banned phrases
        let bannedPhrasesContext = "";
        if (project?.bannedPhrases?.length) {
          bannedPhrasesContext = `\n\nBANNED PHRASES (NEVER use these):\n${(project.bannedPhrases as string[]).filter(p => p.trim()).map(p => `- "${p}"`).join("\n")}`;
        }

        // Length guidance
        const oldWordCount = oldSectionContent.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
        let lengthGuidance = `Target approximately ${oldWordCount} words (same as the current section).`;
        if (input.lengthPreference === "shorter") {
          lengthGuidance = `Target approximately ${Math.round(oldWordCount * 0.65)} words (shorter than the current ${oldWordCount} words).`;
        } else if (input.lengthPreference === "longer") {
          lengthGuidance = `Target approximately ${Math.round(oldWordCount * 1.5)} words (longer than the current ${oldWordCount} words).`;
        }

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().toLocaleString('en-US', { month: 'long' });

        // --- Build the prompt ---
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

${prevSectionSnippet ? `PREVIOUS SECTION ENDS WITH (for transition continuity):\n"...${prevSectionSnippet}"` : "This is the first section of the article."}

${nextSectionSnippet ? `NEXT SECTION STARTS WITH (for transition continuity):\n"${nextSectionSnippet}..."` : "This is the last section of the article."}

RULES:
- Use proper HTML formatting: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <th>, <td> tags
- Start with the <h2> heading for this section
- The content must flow naturally from the previous section and into the next
- Match the writing style, tone, and quality of the rest of the article
- Include relevant statistics, examples, and details
- Do NOT include content from other sections — only write this one section
- ANCHOR TEXT LENGTH: All links must use 2-7 word anchor text, never full sentences
- URL INTEGRITY RULE (CRITICAL): When writing any <a href="..."> tag, the ENTIRE href value MUST be on a single line with NO line breaks, spaces, or newlines inside the URL. Never split a URL across lines or insert spaces between URL characters.
- NEVER use em dashes (—). Use commas, semicolons, or periods instead.
- Return ONLY the HTML for this section (from <h2> to the end of the section content, before the next <h2>)`;

        const userPrompt = `Here is the CURRENT version of this section that needs to be regenerated:\n\n${oldSectionContent}\n\nWrite a better version of this section.`;

        console.log(`[RegenSection] Calling LLM for section "${input.sectionHeading}" (${oldWordCount} words)`);

        const response = await callLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }, projectId);

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error("No response from AI");
        const rawSectionContent = stripMarkdownFences(typeof rawContent === "string" ? rawContent : (rawContent as any)[0]?.text ?? "");

        // --- Post-process the regenerated section ---
        let newSectionContent = wrapBareTextInPTags(fixBrokenAnchors(rawSectionContent));
        newSectionContent = splitLongParagraphs(newSectionContent, maxSentences, "html");

        // Apply template styles if the outline section had a template type
        if (article.outlineId) {
          const outline = await getOutlineById(article.outlineId);
          if (outline?.sections) {
            const outlineSection = (outline.sections as OutlineSection[]).find(s =>
              s.heading.toLowerCase().trim() === input.sectionHeading.toLowerCase().trim()
            );
            if (outlineSection) {
              // Apply background color if present
              if (outlineSection.backgroundColor && !outlineSection.templateType) {
                newSectionContent = applyBackgroundColors(newSectionContent, [outlineSection]);
              }
              // Apply template styles if present
              if (outlineSection.templateType) {
                newSectionContent = applyTemplateStyles(newSectionContent, [outlineSection]);
              }
            }
          }
        }

        // Remove banned phrases from the regenerated section
        if (project?.bannedPhrases?.length) {
          for (const phrase of project.bannedPhrases as string[]) {
            if (phrase.trim()) {
              const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(escapedPhrase, 'gi');
              newSectionContent = newSectionContent.replace(regex, '');
            }
          }
          newSectionContent = newSectionContent.replace(/<p>\s*<\/p>/g, '').replace(/\s{3,}/g, ' ').trim();
        }

        // Post-processing: strip em dashes from regenerated section content
        newSectionContent = stripEmDashes(newSectionContent);
        newSectionContent = stripTargetBlank(newSectionContent);

        // --- Splice the new section into the full article ---
        const updatedContent = content.slice(0, sectionStart) + newSectionContent + "\n" + content.slice(sectionEnd);
        const newWordCount = updatedContent.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;

        // Save to database
        await updateArticle(input.articleId, {
          content: updatedContent,
          wordCount: newWordCount,
        });

        console.log(`[RegenSection] Done. Section "${input.sectionHeading}" regenerated. Old words: ${oldWordCount}, New article words: ${newWordCount}`);

        return {
          success: true,
          oldContent: oldSectionContent,
          newContent: newSectionContent,
          updatedArticleContent: updatedContent,
          wordCount: newWordCount,
          sectionHeading: input.sectionHeading,
        };
      }),

    /** AI-powered article generation from outline */
    generate: publicProcedure
      .input(z.object({
        outlineId: z.number(),
        projectId: z.number(),
        additionalInstructions: z.string().optional(),
        targetLocation: z.string().optional(),
        targetAudience: z.string().optional(),
        outputFormat: z.enum(["html", "plaintext"]).optional(),
        manualLinks: z.array(z.object({ url: z.string(), anchorText: z.string() })).optional(),
        sitemapUrls: z.array(z.string()).optional(),
        autoLinkCount: z.number().optional(),
        brandVoiceId: z.number().optional(),
        icpProfileId: z.number().optional(),
        secondaryKeywords: z.array(z.string()).optional(),
        autoGradeEnabled: z.boolean().optional(),
        targetGrade: z.string().optional(),
        maxGradeIterations: z.number().min(1).max(5).optional(),
        useReferenceDoc: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        console.log(`[ArticleGen] Starting article generation. outlineId=${input.outlineId}, projectId=${input.projectId}, outputFormat=${input.outputFormat}, useReferenceDoc=${input.useReferenceDoc}`);
        const outline = await getOutlineById(input.outlineId);
        if (!outline) throw new Error("Outline not found");

        // Auto-fetch ICP from project and brand voice (use selected or default)
        const project = await getProjectById(input.projectId);
        const allVoices = await getBrandVoicesByProject(input.projectId);
        const brandVoice = input.brandVoiceId
          ? allVoices.find((v: any) => v.id === input.brandVoiceId) ?? allVoices[0] ?? null
          : allVoices.find((v: any) => v.isDefault === 1) ?? allVoices[0] ?? null;

        // Build ICP section — use selected ICP profile if provided, otherwise fall back to project-level ICP
        let icpSection = "";
        const formatListArt = (items: string[] | null | undefined, prefix: string): string => {
          if (!items?.length) return '';
          return `${prefix}:\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
        };

        // Determine ICP source: selected profile or project-level fields
        let icpName = "";
        let icpDescription = "";
        let icpPains: string[] = [];
        let icpGoals: string[] = [];
        let icpObjections: string[] = [];
        let icpTriggers: string[] = [];
        let icpTrust: string[] = [];
        let icpDemoLines = "";
        let icpSearchBehavior = "";
        let icpContentPrefs: string[] = [];

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
                demographics.ageRange ? `Age Range: ${demographics.ageRange}` : '',
                demographics.location ? `Location: ${demographics.location}` : '',
                demographics.income ? `Income: ${demographics.income}` : '',
                demographics.education ? `Education: ${demographics.education}` : '',
                demographics.occupation ? `Occupation: ${demographics.occupation}` : '',
                demographics.other ? `Other: ${demographics.other}` : '',
              ].filter(Boolean).join('\n');
            }
          }
        } else if (project?.icpPrimaryName) {
          icpName = project.icpPrimaryName;
          icpDescription = project.icpWhoTheyAre || "";
          icpPains = (project.icpPains as string[] | null) || [];
          icpGoals = (project.icpGoals as string[] | null) || [];
          icpObjections = (project.icpObjections as string[] | null) || [];
          icpTriggers = (project.icpDecisionTriggers as string[] | null) || [];
          icpTrust = (project.icpTrustSignals as string[] | null) || [];
        }

        if (icpName) {
          const painsSection = formatListArt(icpPains, 'PAIN POINTS (emphasize these problems)');
          const goalsSection = formatListArt(icpGoals, 'GOALS (what they want to achieve)');
          const objectionsSection = formatListArt(icpObjections, 'COMMON OBJECTIONS (address these concerns)');
          const triggersSection = formatListArt(icpTriggers, 'DECISION TRIGGERS (what prompts action)');
          const trustSection = formatListArt(icpTrust, 'TRUST SIGNALS (what builds confidence)');
          const contentPrefsSection = formatListArt(icpContentPrefs, 'CONTENT PREFERENCES');

          icpSection = `
IDEAL CUSTOMER PROFILE (ICP) - CONTENT TARGETING LAYER
======================================================
ICP works alongside Brand Voice: Brand Voice controls HOW content sounds (tone, personality, style).
ICP controls WHO content is written for (pain points, framing, vocabulary, examples).
If any guidance overlaps, Brand Voice takes priority for tone/style.

TARGET AUDIENCE:
- ICP Name: ${icpName}
${icpDescription ? `- Who They Are: ${icpDescription}` : ''}
${icpDemoLines ? `\nDEMOGRAPHICS:\n${icpDemoLines}` : ''}
${icpSearchBehavior ? `\nSEARCH BEHAVIOR: ${icpSearchBehavior}` : ''}

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

        // Build Brand Voice section with full guidelines
        let brandVoiceSection = "";
        if (brandVoice) {
          // Parse tone traits (format: "PRIMARY:x,y|SUPPORTING:a,b,c" or legacy comma-separated)
          let primaryTones: string[] = [];
          let supportingTones: string[] = [];
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
            primaryTones = toneTraits.split(",").map((s: string) => s.trim()).filter(Boolean);
          }

          // Parse avoid list (format: "PRESETS:id1,id2|CUSTOM:text" or legacy text)
          const AVOID_LABELS: Record<string, string> = {
            jargon: "Overly technical jargon", salesy: "Sales-heavy language",
            fear: "Fear-based messaging", exaggerated: "Exaggerated claims",
            cliches: "Industry clichés", passive: "Passive voice",
            buzzwords: "Buzzwords", rhetorical: "Rhetorical questions",
            unverified: "Unverified statistics", competitor: "Competitor comparisons",
          };
          let avoidItems: string[] = [];
          const avoidList = brandVoice.avoidList || "";
          if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
            const parts = avoidList.split("|");
            for (const part of parts) {
              if (part.startsWith("PRESETS:")) {
                const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
                avoidItems.push(...presetIds.map(id => AVOID_LABELS[id] || id));
              } else if (part.startsWith("CUSTOM:")) {
                const custom = part.replace("CUSTOM:", "").trim();
                if (custom) avoidItems.push(...custom.split(",").map(s => s.trim()).filter(Boolean));
              }
            }
          } else if (avoidList) {
            avoidItems = avoidList.split(",").map(s => s.trim()).filter(Boolean);
          }

          // Sentence style descriptions — detailed enforcement rules for the LLM
          const SENTENCE_STYLES: Record<string, { label: string; rules: string }> = {
            short: {
              label: "Short and Direct",
              rules: `- Keep most sentences under 12 words. Aim for punchy, direct phrasing.
- Paragraphs MUST be 1-3 sentences maximum. Break up any paragraph longer than 3 sentences.
- Eliminate filler words, qualifiers, and unnecessary clauses.
- Prefer simple sentence structures. Avoid compound-complex sentences.
- Each paragraph should make ONE clear point, then move on.`,
            },
            mixed: {
              label: "Mixed (Varied and Natural Rhythm)",
              rules: `- Vary sentence length: short for emphasis, medium for clarity, longer for explanation.
- Paragraphs MUST be 2-5 sentences maximum. NEVER write a paragraph longer than 5 sentences.
- If a paragraph exceeds 5 sentences, split it into two separate paragraphs.
- Create natural rhythm by alternating short and medium sentences.
- Each paragraph should cover one idea or sub-point before starting a new paragraph.`,
            },
            detailed: {
              label: "Detailed and Explanatory",
              rules: `- Use longer sentences with expanded context and thorough explanations where needed.
- Paragraphs can be 3-6 sentences, but NEVER exceed 6 sentences per paragraph.
- Include transitional phrases to connect ideas smoothly.
- Balance detail with readability — break up dense sections with shorter transitional paragraphs.`,
            },
          };
          const sentenceStyle = SENTENCE_STYLES[brandVoice.sentenceStyle || "mixed"] || SENTENCE_STYLES.mixed;

          brandVoiceSection = `BRAND VOICE GUIDELINES (FOLLOW THESE CAREFULLY):
Voice Name: ${brandVoice.name}

PRIMARY TONE (emphasize these most): ${primaryTones.length > 0 ? primaryTones.join(", ") : "Professional"}
${supportingTones.length > 0 ? `SUPPORTING TONE (subtle undertones): ${supportingTones.join(", ")}` : ''}

PERSPECTIVE: ${brandVoice.perspective === "first" ? "First person (use 'we', 'our', 'us')" : brandVoice.perspective === "second" ? "Second person (address reader as 'you', 'your')" : "Third person (neutral/objective perspective)"}

SENTENCE STYLE: ${sentenceStyle.label}

=== PARAGRAPH & SENTENCE STRUCTURE RULES (MANDATORY — DO NOT IGNORE) ===
${sentenceStyle.rules}

CRITICAL: These paragraph length rules are NON-NEGOTIABLE. After writing each section, review it and break up any paragraph that violates the sentence count limit above. Wall-of-text paragraphs are the #1 quality failure.
=== END STRUCTURE RULES ===

${avoidItems.length > 0 ? `THINGS TO STRICTLY AVOID (these are hard constraints):\n${avoidItems.map(item => `- DO NOT use ${item}`).join("\n")}\n` : ''}
${brandVoice.writingStyleSample ? `
Writing Style Example (learn the STYLE, not the content):
"""
${brandVoice.writingStyleSample}
"""
CRITICAL - DO NOT COPY from the example above:
- Do NOT reuse any specific phrases, sentences, statistics, or openings from this sample
- Do NOT start your article with the same hook or premise as this sample
- Do NOT repeat any statistics, numbers, or data points from this sample — find different ones
- The sample demonstrates TONE and STYLE patterns only — extract the rhythm, word choice tendencies, and structural approach
- Create a FRESH opening and unique phrasing relevant to your assigned topic` : ''}

IMPORTANT: Apply these brand voice guidelines throughout the ENTIRE article. The tone, word choice, perspective, and sentence structure must be consistent from start to finish.`;
        }

        // Fetch CTA templates for this project
        const ctaTemplates_list = await getCTAsByProject(input.projectId);
        let ctaContext = "";
        if (ctaTemplates_list.length > 0) {
          const defaultCTA = ctaTemplates_list.find((c: any) => c.isDefault === 1) ?? ctaTemplates_list[0];
          ctaContext = `\n\nCALL TO ACTION:\nInsert the following CTA naturally in the article (placement: ${defaultCTA.placement}):\n"${defaultCTA.content}"\n${defaultCTA.buttonText ? `Button text: "${defaultCTA.buttonText}"` : ""}\n${defaultCTA.url ? `Link URL: ${defaultCTA.url}` : ""}`;
        }

        // Mark outline as generating
        await updateOutline(input.outlineId, { status: "generating" });

        // Build the outline text for the prompt
        const outlineText = outline.sections.map((section: OutlineSection) => {
          let text = `## ${section.heading}\n`;
          if (section.targetWordCount) {
            text += `[TARGET: ~${section.targetWordCount} words for this section]\n`;
          }
          if (section.points) {
            text += section.points.map((p: string) => `- ${p}`).join("\n") + "\n";
          }
          if (section.aiInstructions?.trim()) {
            text += `[AI INSTRUCTIONS FOR THIS SECTION: ${section.aiInstructions.trim()}]\n`;
          }
          if (section.templateType) {
            if (section.templateType === "coverage-card") {
              text += `[TEMPLATE TYPE: coverage-card] — You MUST output the <h2> heading for this section as normal (e.g., <h2>${section.heading}</h2>). Then write a 1-2 sentence summary paragraph. Then write <h3>What It Covers</h3> followed by a <ul> list of 3-6 covered items. Then write <h3>What It Doesn't Cover</h3> followed by a <ul> list of 3-6 excluded items. End with a <p> starting with "Cost:" summarizing pricing. Do NOT add any special formatting, icons, borders, or wrapper divs — the styled card is added automatically in post-processing.
`;
            } else {
              text += `[TEMPLATE TYPE: ${section.templateType}] — You MUST output the <h2> heading for this section as normal (e.g., <h2>${section.heading}</h2>), then write ONLY clean body content (1-3 concise paragraphs). Do NOT add any special formatting, icons, borders, or wrapper divs. The styled container will be added automatically in post-processing.
`;
            }
          }
          if (section.backgroundColor && !section.templateType) {
            text += `[BACKGROUND COLOR: Wrap this entire section (heading + content) in a <div> with style="background-color: ${section.backgroundColor}; border-radius: 12px; padding: 24px 28px; margin: 16px 0;"]
`;
          }
          if (section.subSections) {
            for (const sub of section.subSections) {
              text += `### ${sub.heading}\n`;
              if (sub.points) {
                text += sub.points.map((p: string) => `- ${p}`).join("\n") + "\n";
              }
              if (sub.aiInstructions?.trim()) {
                text += `[AI INSTRUCTIONS FOR THIS SUB-SECTION: ${sub.aiInstructions.trim()}]\n`;
              }
              if (sub.templateType) {
                text += `[TEMPLATE TYPE: ${sub.templateType}] — You MUST output the <h3> heading for this sub-section as normal (e.g., <h3>${sub.heading}</h3>), then write ONLY clean body content (1-3 concise paragraphs). Do NOT add any special formatting, icons, borders, or wrapper divs. The styled container will be added automatically in post-processing.
`;
              }
              if (sub.backgroundColor && !sub.templateType) {
                text += `[BACKGROUND COLOR: Wrap this entire sub-section (heading + content) in a <div> with style="background-color: ${sub.backgroundColor}; border-radius: 12px; padding: 24px 28px; margin: 16px 0;"]
`;
              }
            }
          }
          return text;
        }).join("\n");

        const settings = outline.settings as OutlineSettings | null;

        // Merge settings from outline with any overrides from the generate call
        const effectiveLocation = input.targetLocation || settings?.targetLocation || "";
        const effectiveAudience = input.targetAudience || settings?.targetAudience || "";
        const effectiveFormat = input.outputFormat || settings?.outputFormat || "html";
        const effectiveManualLinks = input.manualLinks || settings?.manualLinks || [];
        const effectiveSitemapUrls: string[] = input.sitemapUrls || (settings?.sitemapUrls as string[] | undefined) || (settings?.sitemapUrl ? [settings.sitemapUrl] : []);
        const effectiveAutoLinkCount = input.autoLinkCount ?? settings?.autoLinkCount ?? 5;
        const effectiveSecondaryKeywords: string[] = input.secondaryKeywords || settings?.secondaryKeywords || [];

        // Build secondary keywords instructions
        let secondaryKeywordsInstructions = "";
        if (effectiveSecondaryKeywords.length > 0) {
          secondaryKeywordsInstructions = `\n\nSECONDARY KEYWORDS & LSI TERMS (MUST naturally incorporate):\nThe following keywords and terms should be woven naturally throughout the article to improve topical coverage and semantic relevance. Do NOT force them — use them where they fit contextually. Aim to include each term at least once, but prioritize natural readability over keyword stuffing:\n${effectiveSecondaryKeywords.map(k => `- "${k}"`).join("\n")}\nThese terms help search engines understand the article's topical depth and authority. Distribute them across different sections rather than clustering them in one place.`;
        }

        // Build internal linking instructions
        let linkingInstructions = "";
        if (effectiveManualLinks.length > 0) {
          linkingInstructions += `\n\nMANUAL INTERNAL LINKS (MUST include all of these):\n${effectiveManualLinks.map((l, i) => `${i + 1}. Link to "${l.url}"${l.anchorText ? ` using anchor text "${l.anchorText}"` : " with contextually appropriate anchor text"}`).join("\n")}\nWeave these links naturally into the article body. Use <a href="URL">anchor text</a> format. IMPORTANT: Anchor text must be 2-7 words — a short key phrase, NOT a full sentence.`;
        }
        if (effectiveSitemapUrls.length > 0) {
          // Resolve sitemap XML URLs to actual parsed page URLs from the database
          const projectSitemaps = await getSitemapsByProject(input.projectId);
          const resolvedPageUrls: string[] = [];
          for (const sitemapXmlUrl of effectiveSitemapUrls) {
            const matchingSitemap = projectSitemaps.find(s => s.url === sitemapXmlUrl);
            if (matchingSitemap && matchingSitemap.parsedUrls && Array.isArray(matchingSitemap.parsedUrls)) {
              for (const entry of matchingSitemap.parsedUrls) {
                if (typeof entry === 'string') {
                  resolvedPageUrls.push(entry);
                } else if (entry && typeof entry === 'object' && 'url' in entry) {
                  const title = (entry as SitemapUrl).title;
                  resolvedPageUrls.push(title ? `${(entry as SitemapUrl).url} (${title})` : (entry as SitemapUrl).url);
                }
              }
            }
          }

          if (resolvedPageUrls.length > 0) {
            const minInternal = project?.minInternalLinks ?? 3;
            const effectiveInternalCount = Math.min(effectiveAutoLinkCount, resolvedPageUrls.length);
            const guaranteedInternal = Math.min(minInternal, resolvedPageUrls.length);
            linkingInstructions += `\n\nAUTOMATIC INTERNAL LINKING (MANDATORY):\nYou MUST insert a MINIMUM of ${guaranteedInternal} internal link${guaranteedInternal !== 1 ? 's' : ''} from the SITE PAGES list below. Internal links are REQUIRED — they take priority over external citation links when both options exist for the same claim.\n\nTarget total internal links: ${effectiveInternalCount} (minimum guaranteed: ${guaranteedInternal}).\nChoose URLs that are contextually relevant to the article topic. Use <a href="URL">anchor text</a> format.\nIMPORTANT: Anchor text must be 2-7 words — a short key phrase, NOT a full sentence.\nCRITICAL: Only use exact URLs from the list below. NEVER fabricate or invent URLs.\n\nSITE PAGES (internal links MUST come from this list ONLY):\n${resolvedPageUrls.map(u => `  - ${u}`).join("\n")}`;
          } else {
            // Fallback: if no parsed URLs found, skip auto-linking rather than hallucinate
            console.warn(`[Article Generate] No parsed URLs found for sitemaps: ${effectiveSitemapUrls.join(', ')}. Skipping auto-linking.`);
          }
        }

        // Build reference document section if enabled
        let referenceDocSection = "";
        if (input.useReferenceDoc && project) {
          // Primary source: DB content
          let refDocContent: string | null = project.referenceDocContent || null;
          // Fallback: S3 backup
          if (!refDocContent && project.referenceDocS3Key) {
            refDocContent = await fetchReferenceDocFromS3(project.referenceDocS3Key);
          }

          if (refDocContent && project.referenceDocName) {
            // Truncate very large docs to avoid exceeding context window (keep first 80k chars)
            const maxChars = 80000;
            const truncated = refDocContent.length > maxChars
              ? refDocContent.substring(0, maxChars) + "\n[... document truncated for length ...]"
              : refDocContent;

            referenceDocSection = `
REFERENCE DOCUMENT — FACTUAL SOURCE ("${project.referenceDocName}")
================================================================
The following reference document contains verified facts, figures, rules, and details about the topic.
You MUST use this document as your PRIMARY factual source when writing the article.

RULES FOR USING THE REFERENCE DOCUMENT:
1. When the reference document provides specific numbers, dates, eligibility rules, costs, or procedures — use them EXACTLY as stated. Do NOT invent alternative figures.
2. When the reference document covers a topic that overlaps with a section in the outline, ground that section's content in the reference material.
3. Do NOT copy the reference document verbatim — synthesize and rewrite the information in your own words while preserving factual accuracy.
4. If the reference document contradicts your training data, ALWAYS defer to the reference document (it is more current and authoritative).
5. You may add supplementary information beyond what the reference document covers, but NEVER contradict it.
6. Do NOT mention or cite "the reference document" in the article text — the reader should not know it exists. Simply use the facts naturally.

=== REFERENCE DOCUMENT CONTENT ===
${truncated}
=== END REFERENCE DOCUMENT ===
`;
            console.log(`[ArticleGen] Reference doc injected: "${project.referenceDocName}" (${refDocContent.length} chars${refDocContent.length > maxChars ? ", truncated to " + maxChars : ""})`);
          }
        }

        // Output format instructions
        const formatInstructions = effectiveFormat === "plaintext"
          ? `- Output as PLAIN TEXT with markdown-style headings (## for H2, ### for H3). Do NOT use HTML tags.\n- Use plain text formatting: **bold**, bullet points with -, numbered lists with 1. 2. 3.`
          : `- Use proper HTML formatting: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <th>, <td> tags\n- For links use <a href="URL">anchor text</a> format`;

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.toLocaleString('en-US', { month: 'long' });

        const systemPrompt = `You are an expert SEO content writer. Write a comprehensive, well-structured article based on the provided outline.

IMPORTANT — CURRENT DATE CONTEXT: Today's date is ${currentMonth} ${currentYear}. You MUST treat ${currentYear} as the current year. All references to dates, years, statistics, regulations, and time-sensitive information MUST reflect ${currentYear} as the present year. Do NOT reference 2024 or any prior year as "current" or "this year." If citing statistics or data, prefer the most recent available and clearly label the year of the data.

Guidelines:
- Write in ${settings?.tone ?? "a professional and informative"} tone
- Target approximately ${settings?.targetWordCount ?? 2000} words total
- PER-SECTION WORD TARGETS: Each section in the outline may include a [TARGET: ~N words] directive. You MUST respect these per-section word counts. Do NOT significantly exceed any section's target — if a section says ~200 words, write 180-220 words for it, not 400. The per-section targets are designed to keep the total article within the overall word count.
${formatInstructions}
- Include a compelling introduction that hooks the reader
- CRITICAL - INTRO VARIETY: Every article must open differently. NEVER start with "If you are...", "Whether you are...", "As a...", or any direct audience-addressing formula. Rotate opening strategies: surprising facts, bold claims, mini-stories, provocative questions, or recent trends. The reader's context should emerge naturally, not be stated upfront.
- Each section should flow naturally into the next
- Include relevant statistics and examples where appropriate — but NEVER reuse generic or overused statistics. Each article must cite DIFFERENT data points. Specifically:
  * Do NOT use the phrase "More than 33 million Americans" or any variation of it
  * Do NOT recycle the same statistics across articles — if a stat feels like a "go-to" default, find a more specific or recent one instead
  * Prefer specific, niche statistics over broad national figures that appear in every article on this topic
  * When citing numbers, vary the framing (percentages vs. absolute numbers vs. comparisons vs. ratios)
- CONTENT UNIQUENESS: Every article must feel distinct. Avoid formulaic phrases, recycled openings, and boilerplate sentences that could appear in any article on this topic. Write as if the reader has already read 10 other articles on this subject — give them something they haven't seen before.
- End with a strong conclusion and call to action
- Optimize for the target keyword: "${outline.keyword ?? outline.title}"
- Make the content comprehensive, authoritative, and reader-friendly
- Include bullet points and numbered lists where appropriate
- CRITICAL: Follow the PARAGRAPH & SENTENCE STRUCTURE RULES from the Brand Voice section exactly. Do NOT write wall-of-text paragraphs.
- FAQ ANSWER RULES (CRITICAL): When writing FAQ sections, each answer MUST be 2-4 sentences maximum (40-80 words). Lead directly with the answer — no preamble, no "Short Answer:" prefix, no "Great question" openers. Give one supporting detail if needed, then stop. FAQ answers must be scannable and conversational, NOT essay-length explanations.
- PER-SECTION AI INSTRUCTIONS: Some sections in the outline may include [AI INSTRUCTIONS FOR THIS SECTION: ...] or [AI INSTRUCTIONS FOR THIS SUB-SECTION: ...] directives. You MUST follow these instructions precisely when writing that specific section. These may request specific content formats (tables, charts, bullet lists), specific focus areas, examples, statistics, or other structural requirements. Treat them as mandatory requirements for that section.
- TEMPLATE SECTIONS: Some sections may include a [TEMPLATE TYPE: ...] directive. For ALL template sections, you MUST output the <h2> heading as normal. Do NOT add any special formatting, icons, borders, or wrapper divs — styled containers are added automatically in post-processing.
  * [TEMPLATE TYPE: pro-tip] or [TEMPLATE TYPE: summary]: Write ONLY clean body content (1-3 concise paragraphs) after the heading.
  * [TEMPLATE TYPE: use-cases]: Write a brief intro paragraph (1-2 sentences), then 3-5 use cases. Each use case MUST be formatted as: <p><strong>Use Case Title</strong></p><p>Description in 1-2 sentences.</p>. Do NOT use bullet points, numbered lists, or <h3> sub-headings for use cases. Each use case must be a separate <strong>-paragraph pair.
  * [TEMPLATE TYPE: coverage-card]: Write a 1-2 sentence summary paragraph first. Then write <h3>What It Covers</h3> followed by a <ul> list of 3-6 covered items (concise phrases, not full sentences). Then write <h3>What It Doesn't Cover</h3> followed by a <ul> list of 3-6 excluded items. End with a <p> that starts with "Cost:" summarizing key pricing info (premiums, deductibles, copays). The styled card with blue header, two-column layout, and cost callout box is added automatically in post-processing.
- BACKGROUND COLOR SECTIONS: Some sections may include a [BACKGROUND COLOR: ...] directive. When present, you MUST wrap the entire section content (including the heading) inside a <div> with the exact inline style specified. The heading should be INSIDE the div. This creates a visually highlighted box for that section. Example: <div style="background-color: #EFF6FF; border-radius: 12px; padding: 24px 28px; margin: 16px 0;"><h2>Key Takeaways</h2><ul><li>Point 1</li><li>Point 2</li></ul></div>
- TABLE FORMAT RULES: When AI instructions request a table or comparison table, you MUST output a proper HTML table using <table>, <thead>, <tbody>, <tr>, <th>, and <td> tags. NEVER use markdown table syntax (pipes |). The table must have a <thead> with <th> header cells and a <tbody> with <td> data cells. Always include at least 3 data rows. Example format:
  <table><thead><tr><th>Feature</th><th>Option A</th><th>Option B</th></tr></thead><tbody><tr><td>Price</td><td>$10</td><td>$20</td></tr></tbody></table>
- ANCHOR TEXT LENGTH RULES (applies to ALL links — internal and external):
  * Anchor text MUST be 2-7 words. NEVER wrap an entire sentence or clause as a link.
  * BAD (too long): <a href="...">Medigap policies are sold by private insurers to help cover the out-of-pocket costs that Original Medicare leaves behind</a>
  * GOOD (concise): Medigap policies are sold by private insurers to help cover <a href="...">out-of-pocket costs</a> that Original Medicare leaves behind
  * BAD (too long): <a href="...">Breaking the comparison into steps makes it manageable</a>
  * GOOD (concise): Breaking the comparison into <a href="...">manageable steps</a> helps simplify the process
  * The linked phrase should be a natural keyword or key concept, NOT a full sentence
- TOTAL LINK LIMIT: The entire article must contain NO MORE THAN ${effectiveAutoLinkCount + (effectiveManualLinks.length > 0 ? effectiveManualLinks.length : 0)} links in total (internal + external combined). Count every <a href> tag. Do NOT exceed this limit.
- CITATION LINK RULES: When inserting any external links or citations:
  * NEVER use generic anchor text like "Learn more at", "Find out more", "Click here", "Visit", or just the source name
  * The anchor text MUST be the actual claim or fact being cited, kept to 2-7 words (e.g., <a href="...">covers outpatient services</a>)
  * NEVER link to a homepage URL — always use the most specific deep page URL relevant to the claim
- URL INTEGRITY RULE (CRITICAL): When writing any <a href="..."> tag, the ENTIRE href value MUST be on a single line with NO line breaks, spaces, or newlines inside the URL. A URL like "https://www.example.com/path/" must be written exactly as-is — never split across lines, never insert spaces between characters. Breaking a URL across lines corrupts the link and causes raw text to appear in the article.
${effectiveLocation ? `- Target location: ${effectiveLocation} — include location-specific information, examples, regulations, or references relevant to this area` : ""}
${effectiveAudience ? `- Target audience: ${effectiveAudience} — tailor language, examples, and depth to this specific audience` : ""}
${input.additionalInstructions ? `- Additional instructions: ${input.additionalInstructions}` : ""}
${project?.bannedPhrases?.length ? `
=== BANNED PHRASES (ABSOLUTE HARD CONSTRAINT) ===
The following phrases MUST NEVER appear in the generated content under any circumstances. Do not use them, rephrase them, or include close variations:
${(project.bannedPhrases as string[]).map(p => `- "${p}"`).join("\n")}
If you find yourself about to write any of these phrases, stop and rephrase using completely different wording.
=== END BANNED PHRASES ===` : ''}

${brandVoiceSection}

${icpSection}
${ctaContext}
${secondaryKeywordsInstructions}
${linkingInstructions}
${referenceDocSection}

Return ONLY the ${effectiveFormat === "plaintext" ? "plain text" : "HTML"} content of the article body${effectiveFormat === "html" ? " (no <html>, <head>, or <body> tags)" : ""}. Start with the first ${effectiveFormat === "plaintext" ? "## heading" : "<h2> section"}.`;

        const response = await callLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Write the full article based on this outline:\n\nTitle: ${outline.title}\n\n${outlineText}` },
          ],
        }, input.projectId);

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error("No response from AI");
        const rawArticleContent = stripMarkdownFences(typeof rawContent === "string" ? rawContent : (rawContent as any)[0]?.text ?? "");

        // Post-process: first fix broken anchors, then wrap bare text in <p> tags, then split long paragraphs, then apply background colors
        const maxSentences = brandVoice?.sentenceStyle === "short" ? 3 : brandVoice?.sentenceStyle === "detailed" ? 6 : 5;
        const fixedContent = effectiveFormat === "html" ? fixBrokenAnchors(rawArticleContent) : rawArticleContent;
        const wrappedContent = effectiveFormat === "html" ? wrapBareTextInPTags(fixedContent) : fixedContent;
        const splitContent = splitLongParagraphs(wrappedContent, maxSentences, effectiveFormat);
        // Apply background colors from outline sections as a reliable post-processing step
        const bgColoredContent = effectiveFormat === "html"
          ? applyBackgroundColors(splitContent, outline.sections as OutlineSection[])
          : splitContent;
        // Apply template-specific styles (Pro Tip, Summary) with icons and borders
        let articleContent = effectiveFormat === "html"
          ? applyTemplateStyles(bgColoredContent, outline.sections as OutlineSection[])
          : bgColoredContent;

        // Post-generation scan: remove any banned phrases that slipped through
        if (project?.bannedPhrases?.length) {
          for (const phrase of project.bannedPhrases as string[]) {
            if (phrase.trim()) {
              const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(escapedPhrase, 'gi');
              articleContent = articleContent.replace(regex, '');
            }
          }
          // Clean up any empty tags left behind after removal
          articleContent = articleContent.replace(/<p>\s*<\/p>/g, '').replace(/\s{3,}/g, ' ').trim();
        }


        // Post-processing: enforce link count cap — strip excess <a> tags if LLM over-inserted
        const maxAllowedLinks = effectiveAutoLinkCount + (effectiveManualLinks.length > 0 ? effectiveManualLinks.length : 0);
        const linkMatches = articleContent.match(/<a\s[^>]*>/gi);
        const actualLinkCount = linkMatches ? linkMatches.length : 0;
        if (actualLinkCount > maxAllowedLinks) {
          console.warn(`[ArticleGen] LLM inserted ${actualLinkCount} links but limit is ${maxAllowedLinks}. Stripping excess links.`);
          // Keep the first maxAllowedLinks links, unwrap the rest
          let linksKept = 0;
          articleContent = articleContent.replace(/<a\s([^>]*)>([\/\s\S]*?)<\/a>/gi, (match, _attrs, innerText) => {
            if (linksKept < maxAllowedLinks) {
              linksKept++;
              return match; // keep it
            }
            return innerText; // unwrap — keep anchor text, remove the <a> tag
          });
          console.log(`[ArticleGen] After enforcement: kept ${linksKept} links.`);
        }

        // Post-processing: strip em dashes and "Short Answer:" prefix from generated content
        articleContent = stripEmDashes(articleContent);
        articleContent = stripShortAnswerPrefix(articleContent);
        articleContent = stripTargetBlank(articleContent);

        // Count words (exclude image tags from word count)
        const wordCount = articleContent.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;

        // Generate meta title and description
        const metaResponse = await callLLM({
          messages: [
            { role: "system", content: "Generate an SEO meta title (max 60 chars) and meta description (max 155 chars) for the given article. Return JSON with 'metaTitle' and 'metaDescription' fields only." },
            { role: "user", content: `Article title: ${outline.title}\nKeyword: ${outline.keyword ?? outline.title}\nFirst 500 chars: ${articleContent.substring(0, 500)}` },
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
                  metaDescription: { type: "string" },
                },
                required: ["metaTitle", "metaDescription"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawMetaContent = metaResponse.choices[0]?.message?.content;
        const metaContent = typeof rawMetaContent === "string" ? rawMetaContent : (rawMetaContent as any)?.[0]?.text ?? null;
        let metaTitle = outline.title;
        let metaDescription = "";
        if (metaContent) {
          const meta = extractJSON(metaContent);
          if (meta) {
            metaTitle = meta.metaTitle || outline.title;
            metaDescription = meta.metaDescription || "";
          }
        }

        // Generate slug
        const slug = outline.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

        // Create the article
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
          userId: 1,
        });

        // Mark outline as complete
        await updateOutline(input.outlineId, { status: "complete" });

        // Auto-grade loop: if enabled, iteratively grade and improve the article
        if (input.autoGradeEnabled && input.targetGrade && article?.id) {
          const maxIter = input.maxGradeIterations ?? 2;
          console.log(`[ArticleGen] Auto-grade enabled. Target: ${input.targetGrade}, Max iterations: ${maxIter}`);
          try {
            const { finalGrade, iterationsRun } = await runAutoGradeLoop({
              articleId: article.id,
              projectId: input.projectId,
              targetGrade: input.targetGrade,
              maxIterations: maxIter,
            });
            console.log(`[ArticleGen] Auto-grade complete. Final grade: ${finalGrade} after ${iterationsRun} iteration(s).`);
            // Re-fetch the (possibly improved) article to return the latest content
            const updatedArticle = await getArticleById(article.id);
            return updatedArticle ?? article;
          } catch (err) {
            console.error("[ArticleGen] Auto-grade loop failed (non-fatal):", err);
          }
        }

        return article;
      }),
  }),

  // ---- Broken Link Checker ----
  brokenLinks: router({
    /** Check all links in an article's content for broken URLs */
    check: publicProcedure
      .input(z.object({
        articleId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });

        const content = (article.content as string) || "";
        if (!content) return { links: [], brokenCount: 0, checkedCount: 0 };

        // Extract all href URLs from the HTML content
        const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
        const links: { url: string; anchorText: string }[] = [];
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
          const url = match[1].trim();
          const anchorText = match[2].replace(/<[^>]*>/g, "").trim();
          // Only check http/https URLs
          if (url.startsWith("http://") || url.startsWith("https://")) {
            links.push({ url, anchorText });
          }
        }

        if (links.length === 0) return { links: [], brokenCount: 0, checkedCount: 0 };

        // Deduplicate URLs but keep all anchor texts
        const uniqueUrls = Array.from(new Set(links.map(l => l.url)));

        // Check each URL with a timeout
        const results: {
          url: string;
          anchorText: string;
          status: number | null;
          statusText: string;
          ok: boolean;
          error: string | null;
        }[] = [];

        const checkUrl = async (url: string): Promise<{ status: number | null; statusText: string; ok: boolean; error: string | null }> => {
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
            const response = await fetch(url, {
              method: "HEAD",
              signal: controller.signal,
              redirect: "follow",
              headers: {
                "User-Agent": "RankPilot-LinkChecker/1.0",
              },
            });
            clearTimeout(timeout);

            // Some servers don't support HEAD, retry with GET
            if (response.status === 405) {
              const controller2 = new AbortController();
              const timeout2 = setTimeout(() => controller2.abort(), 10000);
              const getResponse = await fetch(url, {
                method: "GET",
                signal: controller2.signal,
                redirect: "follow",
                headers: {
                  "User-Agent": "RankPilot-LinkChecker/1.0",
                },
              });
              clearTimeout(timeout2);
              // Consume and discard the body to free resources
              await getResponse.text().catch(() => {});
              return {
                status: getResponse.status,
                statusText: getResponse.statusText || String(getResponse.status),
                ok: getResponse.ok,
                error: null,
              };
            }

            return {
              status: response.status,
              statusText: response.statusText || String(response.status),
              ok: response.ok,
              error: null,
            };
          } catch (err: any) {
            if (err.name === "AbortError") {
              return { status: null, statusText: "Timeout", ok: false, error: "Request timed out after 10 seconds" };
            }
            return { status: null, statusText: "Error", ok: false, error: err.message || "Connection failed" };
          }
        };

        // Check URLs in parallel with concurrency limit of 5
        const CONCURRENCY = 5;
        const urlResults = new Map<string, { status: number | null; statusText: string; ok: boolean; error: string | null }>();

        for (let i = 0; i < uniqueUrls.length; i += CONCURRENCY) {
          const batch = uniqueUrls.slice(i, i + CONCURRENCY);
          const batchResults = await Promise.all(batch.map(url => checkUrl(url)));
          batch.forEach((url, idx) => urlResults.set(url, batchResults[idx]));
        }

        // Build results with anchor text info
        for (const link of links) {
          const urlResult = urlResults.get(link.url);
          if (urlResult) {
            results.push({
              url: link.url,
              anchorText: link.anchorText,
              ...urlResult,
            });
          }
        }

        const brokenCount = results.filter(r => !r.ok).length;

        return {
          links: results,
          brokenCount,
          checkedCount: results.length,
        };
      }),

    /** Suggest replacement URLs for a broken link using LLM + live verification */
    suggestReplacement: publicProcedure
      .input(z.object({
        brokenUrl: z.string(),
        anchorText: z.string(),
        articleKeyword: z.string().optional(),
        surroundingContext: z.string().optional(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { brokenUrl, anchorText, articleKeyword, surroundingContext, projectId } = input;

        // Ask LLM to suggest replacement URLs
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
              { role: "user", content: userPrompt },
            ],
          }, projectId);

          const rawContent = String(llmResponse.choices?.[0]?.message?.content || "[]");
          let suggestions: { url: string; source: string; reason: string }[] = [];

          const parsed = extractJSON(rawContent);
          if (!parsed) {
            console.error("[SuggestReplacement] Failed to parse LLM response:", rawContent);
            return { suggestions: [], error: "Failed to parse LLM response. Please try again." };
          }
          suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || []);

          if (!Array.isArray(suggestions) || suggestions.length === 0) {
            return { suggestions: [], error: "No suggestions returned" };
          }

          // Verify each suggested URL is actually live
          const verified = await Promise.all(
            suggestions.map(async (s) => {
              try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 8000);
                const response = await fetch(s.url, {
                  method: "HEAD",
                  signal: controller.signal,
                  redirect: "follow",
                  headers: { "User-Agent": "RankPilot-LinkChecker/1.0" },
                });
                clearTimeout(timeout);

                // Retry with GET if HEAD not supported
                if (response.status === 405) {
                  const controller2 = new AbortController();
                  const timeout2 = setTimeout(() => controller2.abort(), 8000);
                  const getResp = await fetch(s.url, {
                    method: "GET",
                    signal: controller2.signal,
                    redirect: "follow",
                    headers: { "User-Agent": "RankPilot-LinkChecker/1.0" },
                  });
                  clearTimeout(timeout2);
                  await getResp.text().catch(() => {});
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
            error: null,
          };
        } catch (err: any) {
          return { suggestions: [], error: err.message || "LLM call failed" };
        }
      }),
  }),

  // ---- Links Audit ----
  linksAudit: router({
    /** Analyze all links in an article — classify as internal vs external */
    analyze: publicProcedure
      .input(z.object({
        articleId: z.number(),
      }))
      .query(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });

        const content = (article.content as string) || "";
        if (!content) return { internalLinks: [], externalLinks: [], internalCount: 0, externalCount: 0, totalCount: 0 };

        // Get project sitemap URLs to classify internal vs external
        const projectId = article.projectId;
        let sitemapDomains: string[] = [];
        let sitemapUrlSet = new Set<string>();
        if (projectId) {
          const projectSitemaps = await getSitemapsByProject(projectId);
          for (const sm of projectSitemaps) {
            const urls = (sm.parsedUrls || []) as { url: string; title?: string }[];
            for (const u of urls) {
              sitemapUrlSet.add(u.url.toLowerCase());
              try {
                const domain = new URL(u.url).hostname.replace(/^www\./, "");
                if (!sitemapDomains.includes(domain)) sitemapDomains.push(domain);
              } catch {}
            }
          }
        }

        // Extract all links from HTML
        const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
        const internalLinks: { url: string; anchorText: string; matchesSitemap: boolean }[] = [];
        const externalLinks: { url: string; anchorText: string; domain: string }[] = [];
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
          const url = match[1].trim();
          const anchorText = match[2].replace(/<[^>]*>/g, "").trim();
          if (!url.startsWith("http://") && !url.startsWith("https://")) continue;

          let linkDomain = "";
          try { linkDomain = new URL(url).hostname.replace(/^www\./, ""); } catch { continue; }

          const isInternal = sitemapDomains.some(d => linkDomain === d || linkDomain.endsWith("." + d));
          if (isInternal) {
            internalLinks.push({
              url,
              anchorText,
              matchesSitemap: sitemapUrlSet.has(url.toLowerCase()),
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
          totalCount: internalLinks.length + externalLinks.length,
        };
      }),

    /** Suggest internal links from sitemap that are not yet in the article */
    suggest: publicProcedure
      .input(z.object({
        articleId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });

        const content = (article.content as string) || "";
        const projectId = article.projectId;
        if (!projectId) return { suggestions: [] };

        // Get all sitemap URLs
        const projectSitemaps = await getSitemapsByProject(projectId);
        const allSitemapUrls: { url: string; title?: string }[] = [];
        for (const sm of projectSitemaps) {
          const urls = (sm.parsedUrls || []) as { url: string; title?: string }[];
          allSitemapUrls.push(...urls);
        }
        if (allSitemapUrls.length === 0) return { suggestions: [] };

        // Find URLs already linked in the article
        const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>/gi;
        const linkedUrls = new Set<string>();
        let m;
        while ((m = linkRegex.exec(content)) !== null) {
          linkedUrls.add(m[1].trim().toLowerCase());
        }

        // Filter to unlinked sitemap URLs
        const unlinkedUrls = allSitemapUrls.filter(u => !linkedUrls.has(u.url.toLowerCase()));
        if (unlinkedUrls.length === 0) return { suggestions: [] };

        // Use LLM to find the best matches between article content and unlinked pages
        const articleText = content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 6000);
        const urlList = unlinkedUrls.slice(0, 50).map(u => `- ${u.url}${u.title ? ` (${u.title})` : ""}`).join("\n");

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
[{"phrase": "exact phrase from article", "targetUrl": "URL from the list", "reason": "brief explanation"}]`,
            },
            {
              role: "user",
              content: `ARTICLE TEXT:\n${articleText}\n\nAVAILABLE INTERNAL PAGES (not yet linked):\n${urlList}`,
            },
          ],
        });

        const llmContent = (llmResponse?.choices?.[0]?.message?.content || "") as string;
        const suggestions = extractJSON(llmContent) || [];

        // Validate suggestions — ensure phrases exist in article and URLs are from sitemap
        const validSuggestions = (Array.isArray(suggestions) ? suggestions : []).filter((s: any) => {
          if (!s.phrase || !s.targetUrl) return false;
          const phraseExists = articleText.toLowerCase().includes(s.phrase.toLowerCase());
          const urlValid = unlinkedUrls.some(u => u.url.toLowerCase() === s.targetUrl.toLowerCase());
          return phraseExists && urlValid;
        }).slice(0, 8);

        return { suggestions: validSuggestions };
      }),

    /** Insert an internal link into article HTML at the first occurrence of a phrase */
    insertLink: publicProcedure
      .input(z.object({
        articleId: z.number(),
        phrase: z.string(),
        targetUrl: z.string(),
      }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new TRPCError({ code: "NOT_FOUND", message: "Article not found" });

        let content = (article.content as string) || "";
        if (!content) throw new TRPCError({ code: "BAD_REQUEST", message: "Article has no content" });

        // Find the phrase in text nodes (not inside existing links or tags)
        // Use a regex that matches the phrase NOT inside an <a> tag
        const escapedPhrase = input.phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        // Match phrase that is NOT already wrapped in an <a> tag
        const phraseRegex = new RegExp(
          `(?<!<a[^>]*>(?:[^<]*))\\b(${escapedPhrase})\\b`,
          "i"
        );

        // Simpler approach: find first occurrence not inside an <a> tag
        // Split by <a...>...</a> tags, only replace in non-link segments
        const parts = content.split(/(<a\s[^>]*>.*?<\/a>)/gi);
        let replaced = false;
        for (let i = 0; i < parts.length; i++) {
          // Skip parts that are <a> tags
          if (parts[i].match(/^<a\s/i)) continue;
          // Try to replace the first occurrence of the phrase in this text segment
          const regex = new RegExp(`(${escapedPhrase})`, "i");
          if (regex.test(parts[i])) {
            parts[i] = parts[i].replace(regex, `<a href="${input.targetUrl}">$1</a>`);
            replaced = true;
            break;
          }
        }

        if (!replaced) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Could not find the phrase in the article text" });
        }

        const updatedContent = parts.join("");
        const wordCount = updatedContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
        await updateArticle(input.articleId, { content: updatedContent, wordCount });

        return { success: true, updatedContent };
      }),
  }),

  // ---- Thin Content Analyzer ----
  thinContent: router({
    /** Analyze a sitemap URL for thin content issues */
    analyze: publicProcedure
      .input(z.object({
        sitemapUrl: z.string().url(),
        wordThreshold: z.number().min(50).max(5000).optional(),
      }))
      .mutation(async ({ input }) => {
        const { sitemapUrl, wordThreshold = 300 } = input;
        const MAX_PAGES = 200;

        // Step 1: Parse sitemap to get URLs
        const parseSitemapUrls = async (url: string, depth = 0): Promise<string[]> => {
          if (depth > 2) return []; // prevent infinite recursion
          try {
            const response = await fetch(url, {
              headers: { "User-Agent": "RankPilot-Bot/1.0" },
              signal: AbortSignal.timeout(15000),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const xml = await response.text();
            const urls: string[] = [];

            // Check if sitemap index
            const sitemapIndexRegex = /<sitemap>[\s\S]*?<loc>([^<]+)<\/loc>[\s\S]*?<\/sitemap>/gi;
            let indexMatch: RegExpExecArray | null;
            const childSitemaps: string[] = [];
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
              let urlMatch: RegExpExecArray | null;
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

        // Step 2: Analyze each page
        const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        interface PageAnalysis {
          url: string;
          wordCount: number;
          h1Count: number;
          h2Count: number;
          h3Count: number;
          lastModified: string | null;
          isDated: boolean;
          issues: string[];
          recommendations: string[];
        }

        /** Try to extract a last-modified date from multiple sources */
        const extractLastModified = (html: string, headers: Headers): string | null => {
          // 1. HTTP Last-Modified header
          const httpLastMod = headers.get("last-modified");
          if (httpLastMod) {
            const d = new Date(httpLastMod);
            if (!isNaN(d.getTime())) return d.toISOString();
          }

          // 2. <meta> tags: article:modified_time, og:updated_time, article:published_time
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
            /content=["']([^"']+)["']\s+property=["']article:published_time["']/i,
          ];
          for (const pattern of metaPatterns) {
            const match = html.match(pattern);
            if (match?.[1]) {
              const d = new Date(match[1]);
              if (!isNaN(d.getTime())) return d.toISOString();
            }
          }

          // 3. JSON-LD dateModified or datePublished
          const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
          let jsonLdMatch: RegExpExecArray | null;
          while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
            try {
              const data = JSON.parse(jsonLdMatch[1]);
              const dateStr = data.dateModified || data.datePublished;
              if (dateStr) {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) return d.toISOString();
              }
            } catch { /* ignore invalid JSON-LD */ }
          }

          // 4. <time> element with datetime attribute
          const timeMatch = html.match(/<time[^>]*datetime=["']([^"']+)["'][^>]*>/i);
          if (timeMatch?.[1]) {
            const d = new Date(timeMatch[1]);
            if (!isNaN(d.getTime())) return d.toISOString();
          }

          return null;
        };

        const analyzePage = async (pageUrl: string): Promise<PageAnalysis | null> => {
          try {
            const resp = await fetch(pageUrl, {
              headers: { "User-Agent": "RankPilot-Bot/1.0" },
              signal: AbortSignal.timeout(10000),
            });
            if (!resp.ok) return null;
            const html = await resp.text();

            // Extract last modified date
            const lastModified = extractLastModified(html, resp.headers);
            const isDated = lastModified
              ? (now - new Date(lastModified).getTime()) > TWO_YEARS_MS
              : false;

            // Strip non-content elements
            const textContent = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
              .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
              .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
              .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
              .replace(/<[^>]+>/g, " ")
              .replace(/&[a-z]+;/gi, " ")
              .replace(/\s+/g, " ")
              .trim();

            const wc = textContent.split(/\s+/).filter(w => w.length > 0).length;
            const h1Count = (html.match(/<h1[^>]*>/gi) || []).length;
            const h2Count = (html.match(/<h2[^>]*>/gi) || []).length;
            const h3Count = (html.match(/<h3[^>]*>/gi) || []).length;

            const issues: string[] = [];
            const recommendations: string[] = [];

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
              recommendations.push("Maintain proper heading hierarchy: H1 → H2 → H3");
            }
            if (isDated && lastModified) {
              const modDate = new Date(lastModified);
              const yearsAgo = Math.floor((now - modDate.getTime()) / (365 * 24 * 60 * 60 * 1000));
              issues.push(`Dated content — last updated ${yearsAgo} year${yearsAgo !== 1 ? "s" : ""} ago (${modDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`);
              recommendations.push("Review and update this content to ensure accuracy and freshness. Search engines favor recently updated content.");
            }

            return { url: pageUrl, wordCount: wc, h1Count, h2Count, h3Count, lastModified, isDated, issues, recommendations };
          } catch {
            return null;
          }
        };

        // Batch analyze (10 at a time)
        const pages: PageAnalysis[] = [];
        const batchSize = 10;
        for (let i = 0; i < pageUrls.length; i += batchSize) {
          const batch = pageUrls.slice(i, i + batchSize);
          const results = await Promise.all(batch.map(analyzePage));
          pages.push(...results.filter((r): r is PageAnalysis => r !== null));
        }

        const totalPages = pages.length;
        const pagesWithIssues = pages.filter(p => p.issues.length > 0).length;
        const datedPages = pages.filter(p => p.isDated).length;
        const avgWordCount = totalPages > 0
          ? Math.round(pages.reduce((sum, p) => sum + p.wordCount, 0) / totalPages)
          : 0;

        // Sort: pages with issues first, then by word count ascending
        pages.sort((a, b) => {
          if (a.issues.length > 0 && b.issues.length === 0) return -1;
          if (a.issues.length === 0 && b.issues.length > 0) return 1;
          return a.wordCount - b.wordCount;
        });

        return { totalPages, pagesWithIssues, datedPages, avgWordCount, pages };
      }),

    /** Get sitemaps for a project (for the project selector) */
    getProjectSitemaps: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getSitemapsByProject(input.projectId);
      }),
  }),

  // ---- Content Grading ----
  // ---- Entity / Salience Analyzer ----
  entity: router({
    /** Entity + Salience analysis — 6-step framework */
    analyzeContent: publicProcedure
      .input(z.object({
        content: z.string().min(50, "Content must be at least 50 characters"),
        primaryKeyword: z.string().optional(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        // Truncate to ~15k chars to stay within token limits
        const truncated = input.content.slice(0, 15000);
        const prompt = getEntityAnalysisPrompt(truncated, input.primaryKeyword || undefined);

        const response = await callLLM({
          messages: [
            { role: "system", content: "You are an expert SEO entity analyst. Respond with raw JSON only." },
            { role: "user", content: prompt },
          ],
        }, input.projectId);

        const llmResponse = (response.choices?.[0]?.message?.content || "") as string;
        const entityResult = extractJSON(llmResponse);
        if (!entityResult) throw new Error("Failed to parse entity analysis response");
        return entityResult as EntityAnalysisResult;
      }),

    /** Analyze an existing article by ID */
    analyzeArticle: publicProcedure
      .input(z.object({
        articleId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new Error("Article not found");

        // Strip HTML tags for analysis
        const textContent = (article.content || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (textContent.length < 50) throw new Error("Article content is too short to analyze");

        const truncated = textContent.slice(0, 15000);
        const keyword = article.keyword || undefined;
        const prompt = getEntityAnalysisPrompt(truncated, keyword);

        const response = await callLLM({
          messages: [
            { role: "system", content: "You are an expert SEO entity analyst. Respond with raw JSON only." },
            { role: "user", content: prompt },
          ],
        }, article.projectId);

        const llmResponse = (response.choices?.[0]?.message?.content || "") as string;
        const entityResult = extractJSON(llmResponse);
        if (!entityResult) throw new Error("Failed to parse entity analysis response");
        return entityResult as EntityAnalysisResult;
      }),

    /** Semantic analysis — 4-layer framework */
    analyzeSemantic: publicProcedure
      .input(z.object({
        content: z.string().min(50, "Content must be at least 50 characters"),
        targetKeyword: z.string().min(1, "Target keyword is required for semantic analysis"),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const truncated = input.content.slice(0, 15000);
        const prompt = getSemanticAnalysisPrompt(truncated, input.targetKeyword);

        const response = await callLLM({
          messages: [
            { role: "system", content: "You are an expert SEO semantic analyst. Respond with raw JSON only." },
            { role: "user", content: prompt },
          ],
        }, input.projectId);

        const llmResponse = (response.choices?.[0]?.message?.content || "") as string;
        const semanticResult = extractJSON(llmResponse);
        if (!semanticResult) throw new Error("Failed to parse semantic analysis response");
        return semanticResult as SemanticAnalysisResult;
      }),

    /** Semantic analysis for an existing article by ID */
    analyzeArticleSemantic: publicProcedure
      .input(z.object({
        articleId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new Error("Article not found");
        if (!article.keyword) throw new Error("Article has no keyword set. A keyword is required for semantic analysis.");

        const textContent = (article.content || "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (textContent.length < 50) throw new Error("Article content is too short to analyze");

        const truncated = textContent.slice(0, 15000);
        const prompt = getSemanticAnalysisPrompt(truncated, article.keyword);

        const response = await callLLM({
          messages: [
            { role: "system", content: "You are an expert SEO semantic analyst. Respond with raw JSON only." },
            { role: "user", content: prompt },
          ],
        }, article.projectId);

        const llmResponse = (response.choices?.[0]?.message?.content || "") as string;
        const semanticResult = extractJSON(llmResponse);
        if (!semanticResult) throw new Error("Failed to parse semantic analysis response");
        return semanticResult as SemanticAnalysisResult;
      }),

    /** Apply selected entity/salience fixes to an article — surgical editing */
    applyEntityFixes: publicProcedure
      .input(z.object({
        articleId: z.number(),
        selectedFixes: z.array(z.string()).min(1, "Select at least one fix to apply"),
        primaryEntity: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [article] = await db.select().from(articles).where(eq(articles.id, input.articleId)).limit(1);
        if (!article) throw new Error("Article not found");

        // Fetch brand voice for consistent tone
        let brandVoiceSection = "";
        const [project] = article.projectId
          ? await db.select().from(projects).where(eq(projects.id, article.projectId)).limit(1)
          : [null];
        if (project) {
          const allVoices = await db.select().from(brandVoices).where(eq(brandVoices.projectId, project.id));
          const bv = allVoices.find(v => v.isDefault === 1) || allVoices[0];
          if (bv) {
            const perspectiveMap: Record<string, string> = {
              first: "first person (we/our/us)",
              second: "second person (you/your)",
              third: "third person (they/the company)",
            };
            brandVoiceSection = `\nBRAND VOICE (maintain this tone in all changes):\n- Tone: ${bv.toneTraits}\n- Perspective: ${perspectiveMap[bv.perspective] || bv.perspective}${bv.avoidList ? `\n- Avoid: ${bv.avoidList}` : ""}`;
          }
        }

        const fixesList = input.selectedFixes.map((fix, i) => `${i + 1}. ${fix}`).join("\n");
        const primaryEntityContext = input.primaryEntity ? `\nPRIMARY ENTITY: "${input.primaryEntity}" — all changes should reinforce this entity's salience and prominence.` : '';

        // STEP 1: Ask LLM to plan surgical edits
        const planPrompt = `You are an expert SEO entity optimization editor. Given the article and the entity/salience fixes to apply, identify the EXACT sections that need to change.
${brandVoiceSection}
${primaryEntityContext}

For each fix, identify:
1. The exact original text snippet that needs to be modified (copy it VERBATIM from the article — must be an exact match)
2. The replacement text with the entity/salience fix applied

Rules:
- CRITICAL: Select the SMALLEST possible text snippet — ideally a SINGLE SENTENCE or SHORT PARAGRAPH. Never select a whole section when only one sentence needs changing.
- Entity salience fixes typically involve:
  * Adding the primary entity name to introductions, headings, or topic sentences
  * Replacing vague pronouns ("it", "this", "they") with the actual entity name
  * Adding supporting entity mentions where coverage is thin
  * Restructuring sentences to place the primary entity in subject position
  * Adding entity-reinforcing modifiers or context
- The "original" field must be an EXACT substring of the article content (character-for-character match)
- If a fix requires adding NEW content (e.g., a new definition paragraph), set "original" to the sentence AFTER which the new content should appear, and set "replacement" to that same sentence PLUS the new content appended
- NEVER rewrite, rephrase, or restructure text that is not directly related to the fix. Only change what is necessary to address the specific entity/salience issue.
- NEVER add <strong>, <b>, <em>, or <i> tags to replacement text unless the original text already had them. Do NOT bold or emphasize changed text — the replacement must use the exact same formatting as the original.
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

        const userPrompt = `Apply these entity/salience fixes to the article:\n\n===FIXES TO APPLY===\n${fixesList}\n===END FIXES===\n\n===FULL ARTICLE (for context only — do NOT rewrite the whole thing)===\n${article.content}\n===END ARTICLE===`;

        const llmResponse = await callLLM({
          messages: [
            { role: "system", content: planPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const rawResponse = (llmResponse.choices?.[0]?.message?.content || "") as string;
        let edits: Array<{ fix: string; original: string; replacement: string }> = [];
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

        // STEP 2: Apply edits surgically
        let improvedContent = article.content || "";
        let appliedCount = 0;

        for (const edit of edits) {
          if (!edit.original || !edit.replacement) continue;

          // Try exact match first
          if (improvedContent.includes(edit.original)) {
            improvedContent = improvedContent.replace(edit.original, edit.replacement);
            appliedCount++;
          } else {
            // Try trimmed match (whitespace differences)
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

        // Safety net: strip unwanted <strong>/<b> wrapping that LLMs sometimes add
        improvedContent = stripWrappingStrongTags(improvedContent);

        const wordCount = improvedContent.split(/\s+/).filter((w: string) => w.length > 0).length;

        await db.update(articles).set({
          content: improvedContent,
          wordCount,
        }).where(eq(articles.id, input.articleId));

        return {
          success: true,
          content: improvedContent,
          wordCount,
          appliedCount,
          totalFixes: input.selectedFixes.length,
        };
      }),

    /** Generate a fresh outline from entity/salience analysis results */
    generateOutlineFromAnalysis: publicProcedure
      .input(z.object({
        /** The entity analysis result data */
        entityAnalysis: z.object({
          primaryEntity: z.object({
            name: z.string(),
            type: z.string(),
            justification: z.string(),
          }),
          entities: z.array(z.object({
            name: z.string(),
            type: z.string(),
            prominence: z.enum(["High", "Medium", "Low"]),
            rationale: z.string(),
          })),
          salienceStructure: z.object({
            dominanceGap: z.object({ grade: z.string(), description: z.string() }),
            earlyReinforcement: z.object({
              inFirstParagraph: z.boolean(),
              inHeading: z.boolean(),
              withinFirst120Words: z.boolean(),
              summary: z.string(),
            }),
            entityDrift: z.object({ level: z.string(), description: z.string() }),
          }),
          supportingCoverage: z.object({
            grade: z.string(),
            relatedSubEntities: z.array(z.string()),
            missingComponents: z.array(z.string()),
            evaluation: z.string(),
          }),
          geoExtractability: z.object({
            grade: z.string(),
            hasConcisenDefinitions: z.boolean(),
            hasClearQuestionAnswering: z.boolean(),
            hasShortAnswerSummary: z.boolean(),
            hasCleanHeadings: z.boolean(),
            evaluation: z.string(),
          }),
          scores: z.object({
            primaryEntityClarity: z.number(),
            entityFocus: z.number(),
            supportingCoverage: z.number(),
            geoExtractability: z.number(),
            overallScore: z.number(),
          }),
          actionableFixes: z.array(z.string()),
          advancedRecommendations: z.object({
            refinedPrimaryEntity: z.string(),
            refinedEntityRationale: z.string(),
            suggestedTitleRewrite: z.string(),
            missingSupportingEntities: z.array(z.string()),
          }),
        }),
        /** Optional semantic analysis result */
        semanticAnalysis: z.object({
          targetKeyword: z.string(),
          coverage: z.object({
            coveredTopics: z.array(z.string()),
            missingTopics: z.array(z.string()),
            expectedTopics: z.array(z.string()),
            evaluation: z.string(),
          }),
          semanticFixes: z.array(z.string()),
        }).optional(),
        /** The keyword to build the outline around */
        keyword: z.string().min(1),
        /** Project to pull Brand Voice and ICP from */
        projectId: z.number(),
        /** Optional brand voice override */
        brandVoiceId: z.number().optional(),
        /** Optional ICP profile override */
        icpProfileId: z.number().optional(),
        /** Target word count for the planned article */
        targetWordCount: z.number().optional(),
        /** Number of main sections */
        numSections: z.number().optional(),
        /** Number of FAQ items */
        numFaqs: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const ea = input.entityAnalysis;
        const sa = input.semanticAnalysis;

        // ---- Build Entity Analysis Context ----
        const entityContext = `
=== ENTITY & SALIENCE ANALYSIS RESULTS ===
This outline must be built from scratch to address every weakness found below.

PRIMARY ENTITY: "${ea.advancedRecommendations.refinedPrimaryEntity || ea.primaryEntity.name}" (${ea.primaryEntity.type})
Justification: ${ea.primaryEntity.justification}
${ea.advancedRecommendations.refinedPrimaryEntity !== ea.primaryEntity.name ? `Refined Entity Rationale: ${ea.advancedRecommendations.refinedEntityRationale}` : ''}

SUGGESTED TITLE: ${ea.advancedRecommendations.suggestedTitleRewrite}

SCORES (out of 100):
- Primary Entity Clarity: ${ea.scores.primaryEntityClarity}
- Entity Focus: ${ea.scores.entityFocus}
- Supporting Coverage: ${ea.scores.supportingCoverage}
- GEO Extractability: ${ea.scores.geoExtractability}
- Overall: ${ea.scores.overallScore}

SALIENCE ISSUES TO FIX:
- Dominance Gap: ${ea.salienceStructure.dominanceGap.grade} — ${ea.salienceStructure.dominanceGap.description}
- Early Reinforcement: ${ea.salienceStructure.earlyReinforcement.summary}
  (In first paragraph: ${ea.salienceStructure.earlyReinforcement.inFirstParagraph}, In heading: ${ea.salienceStructure.earlyReinforcement.inHeading}, Within first 120 words: ${ea.salienceStructure.earlyReinforcement.withinFirst120Words})
- Entity Drift: ${ea.salienceStructure.entityDrift.level} — ${ea.salienceStructure.entityDrift.description}

SUPPORTING COVERAGE: ${ea.supportingCoverage.grade}
- Existing sub-entities: ${ea.supportingCoverage.relatedSubEntities.join(', ') || 'None identified'}
- Missing components: ${ea.supportingCoverage.missingComponents.join(', ') || 'None'}
- Missing supporting entities to ADD: ${ea.advancedRecommendations.missingSupportingEntities.join(', ')}

GEO/AI EXTRACTABILITY: ${ea.geoExtractability.grade}
- ${ea.geoExtractability.evaluation}
- Needs concise definitions: ${!ea.geoExtractability.hasConcisenDefinitions}
- Needs clear Q&A format: ${!ea.geoExtractability.hasClearQuestionAnswering}
- Needs short answer summary: ${!ea.geoExtractability.hasShortAnswerSummary}
- Needs clean headings: ${!ea.geoExtractability.hasCleanHeadings}

ALL ENTITIES DETECTED:
${ea.entities.map(e => `- ${e.name} (${e.type}, ${e.prominence}): ${e.rationale}`).join('\n')}

ACTIONABLE FIXES THE OUTLINE MUST ADDRESS:
${ea.actionableFixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}
`;

        // ---- Build Semantic Analysis Context (if available) ----
        let semanticContext = '';
        if (sa) {
          semanticContext = `
=== SEMANTIC ANALYSIS RESULTS ===
Target Keyword: ${sa.targetKeyword}

TOPIC COVERAGE GAPS — the new outline MUST cover these missing topics:
${sa.coverage.missingTopics.map(t => `- ${t}`).join('\n') || '- No missing topics identified'}

EXPECTED TOPICS for comprehensive coverage:
${sa.coverage.expectedTopics.map(t => `- ${t}`).join('\n')}

SEMANTIC FIXES TO ADDRESS:
${sa.semanticFixes.map((f, i) => `${i + 1}. ${f}`).join('\n')}
`;
        }

        // ---- Fetch Brand Voice & ICP (reuse existing logic) ----
        const project = await getProjectById(input.projectId);
        const allVoices = await getBrandVoicesByProject(input.projectId);
        const brandVoice = input.brandVoiceId
          ? allVoices.find((v: any) => v.id === input.brandVoiceId) ?? allVoices[0] ?? null
          : allVoices.find((v: any) => v.isDefault === 1) ?? allVoices[0] ?? null;

        let icpSection = "";
        const formatList = (items: string[] | null | undefined, label: string): string => {
          if (!items?.length) return '';
          return `${label}:\n${items.map((item, i) => `  ${i + 1}. ${item}`).join('\n')}\n`;
        };

        if (input.icpProfileId) {
          const icpProfile = await getICPById(input.icpProfileId);
          if (icpProfile) {
            const demographics = icpProfile.demographics;
            const demoLines = demographics ? [
              demographics.ageRange ? `Age Range: ${demographics.ageRange}` : '',
              demographics.location ? `Location: ${demographics.location}` : '',
              demographics.income ? `Income: ${demographics.income}` : '',
              demographics.education ? `Education: ${demographics.education}` : '',
              demographics.occupation ? `Occupation: ${demographics.occupation}` : '',
              demographics.other ? `Other: ${demographics.other}` : '',
            ].filter(Boolean).join('\n') : '';

            icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) ===
TARGET AUDIENCE: ${icpProfile.name}
${icpProfile.description ? `Who They Are: ${icpProfile.description}` : ''}
${demoLines ? `\nDEMOGRAPHICS:\n${demoLines}` : ''}

${formatList(icpProfile.painPoints, 'PAIN POINTS (structure H2 headings around these)')}
${formatList(icpProfile.goals, 'GOALS (address these in content sections)')}
${formatList(icpProfile.objections, 'OBJECTIONS (create FAQ questions from these)')}
${icpProfile.searchBehavior ? `SEARCH BEHAVIOR: ${icpProfile.searchBehavior}\n` : ''}
${formatList(icpProfile.contentPreferences, 'CONTENT PREFERENCES')}
`;
          }
        } else if (project?.icpPrimaryName) {
          icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) ===
TARGET AUDIENCE: ${project.icpPrimaryName}
${project.icpWhoTheyAre ? `Who They Are: ${project.icpWhoTheyAre}` : ''}

${formatList(project.icpPains as string[] | null, 'PAIN POINTS (structure H2 headings around these)')}
${formatList(project.icpGoals as string[] | null, 'GOALS (address these in content sections)')}
${formatList(project.icpObjections as string[] | null, 'OBJECTIONS (create FAQ questions from these)')}
${formatList(project.icpDecisionTriggers as string[] | null, 'DECISION TRIGGERS')}
${formatList(project.icpTrustSignals as string[] | null, 'TRUST SIGNALS')}
`;
        }

        let brandVoiceSection = "";
        if (brandVoice) {
          const perspectiveMap: Record<string, string> = {
            first: "First person (we/our/us)",
            second: "Second person (you/your)",
            third: "Third person (they/their)",
          };
          const styleMap: Record<string, string> = {
            short: "Concise, punchy sentences. Paragraphs of 1-3 sentences only.",
            mixed: "Varied sentence lengths with natural rhythm. Paragraphs of 2-5 sentences only.",
            detailed: "Detailed, explanatory sentences. Paragraphs of 3-6 sentences maximum.",
          };

          const AVOID_LABELS: Record<string, string> = {
            jargon: "Overly technical jargon", salesy: "Sales-heavy language",
            fear: "Fear-based messaging", exaggerated: "Exaggerated claims",
            cliches: "Industry clichés", passive: "Passive voice",
            buzzwords: "Buzzwords", rhetorical: "Rhetorical questions",
            unverified: "Unverified statistics", competitor: "Competitor comparisons",
          };
          let avoidItems: string[] = [];
          const avoidList = brandVoice.avoidList || "";
          if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
            const parts = avoidList.split("|");
            for (const part of parts) {
              if (part.startsWith("PRESETS:")) {
                const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
                avoidItems.push(...presetIds.map(id => AVOID_LABELS[id] || id));
              } else if (part.startsWith("CUSTOM:")) {
                const custom = part.replace("CUSTOM:", "").trim();
                if (custom) avoidItems.push(...custom.split(",").map(s => s.trim()).filter(Boolean));
              }
            }
          } else if (avoidList) {
            avoidItems = avoidList.split(",").map(s => s.trim()).filter(Boolean);
          }

          brandVoiceSection = `
=== BRAND VOICE GUIDELINES ===
Voice Name: ${brandVoice.name}
TONE TRAITS: ${brandVoice.toneTraits || 'Professional'}
WRITING PERSPECTIVE: ${perspectiveMap[brandVoice.perspective] || brandVoice.perspective}
SENTENCE STYLE: ${styleMap[brandVoice.sentenceStyle] || brandVoice.sentenceStyle}
${avoidItems.length > 0 ? `AVOID:\n${avoidItems.map(item => `- ${item}`).join('\n')}` : ''}
`;
        }

        const currentYear = new Date().getFullYear();
        const numSections = input.numSections ?? 8;
        const numFaqs = input.numFaqs ?? 5;
        const targetWordCount = input.targetWordCount ?? 2000;

        const systemPrompt = `You are an expert SEO content strategist. You are given the results of an entity/salience analysis (and optionally a semantic analysis) of an existing article. Your job is to create a BRAND NEW outline from scratch that would produce a significantly better article — one that fixes every weakness identified in the analysis.

IMPORTANT — CURRENT DATE CONTEXT: The current year is ${currentYear}. All references to dates, years, regulations, trends, and time-sensitive topics MUST treat ${currentYear} as the present year.

${entityContext}
${semanticContext}
${icpSection}
${brandVoiceSection}

OUTLINE REQUIREMENTS:
1. Build the outline PURELY from the analysis findings — do NOT replicate the original article's structure
2. The primary entity "${ea.advancedRecommendations.refinedPrimaryEntity || ea.primaryEntity.name}" MUST be dominant: appear in the title, first section, and reinforced throughout
3. Create ${numSections} main H2 sections plus a FAQ section with ${numFaqs} questions
4. Include an introduction that establishes the primary entity within the first 120 words
5. Every missing supporting entity and missing component from the analysis MUST have a dedicated section or subsection
6. Address ALL actionable fixes from the analysis through the outline structure
7. If GEO extractability was weak, include sections with concise definitions, clear Q&A format, and short answer summaries
8. If semantic coverage had gaps, ensure the missing topics are covered
9. Target word count: ${targetWordCount} words
10. Include a conclusion section last
11. Each section should have 2-4 specific, actionable key points — not generic filler

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
            { role: "user", content: `Generate a new, improved outline for the keyword: "${input.keyword}" based on the entity/salience analysis findings provided.` },
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
                              points: { type: "array", items: { type: "string" } },
                            },
                            required: ["id", "heading", "type", "points"],
                            additionalProperties: false,
                          },
                        },
                        targetWordCount: { type: "integer", description: "Target word count for this section" },
                      },
                      required: ["id", "heading", "type", "points", "subSections", "targetWordCount"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "sections"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error("No response from AI");
        const content = typeof rawContent === "string" ? rawContent : (rawContent as any)[0]?.text ?? "";
        const parsed = extractJSON(content);
        if (!parsed) throw new Error("Failed to parse outline from AI response");

        // Save the outline to the database
        const outline = await createOutline({
          title: parsed.title,
          keyword: input.keyword,
          sections: parsed.sections as OutlineSection[],
          settings: {
            contentType: "blog",
            targetWordCount: input.targetWordCount,
            numSections: input.numSections,
            numFaqs: input.numFaqs,
            additionalInstructions: `Generated from entity/salience analysis. Primary entity: ${ea.advancedRecommendations.refinedPrimaryEntity || ea.primaryEntity.name}`,
          },
          projectId: input.projectId,
          userId: 1,
        });

        return outline;
      }),

    /**
     * Fetch a URL and extract the main article content.
     * Uses @mozilla/readability + linkedom for robust content extraction.
     * Strips nav, footer, sidebar, ads — returns clean article text.
     */
    fetchUrlContent: publicProcedure
      .input(z.object({
        url: z.string().url("Please enter a valid URL"),
      }))
      .mutation(async ({ input }) => {
        const { Readability } = await import("@mozilla/readability");
        const { parseHTML } = await import("linkedom");

        // Fetch the page
        let html: string;
        try {
          const resp = await fetch(input.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; RankPilot/1.0; +https://rankpilot.app)",
              "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.5",
            },
            signal: AbortSignal.timeout(15000),
            redirect: "follow",
          });
          if (!resp.ok) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Failed to fetch URL: HTTP ${resp.status} ${resp.statusText}`,
            });
          }
          const contentType = resp.headers.get("content-type") || "";
          if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "URL does not point to an HTML page",
            });
          }
          html = await resp.text();
        } catch (e: any) {
          if (e instanceof TRPCError) throw e;
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: e.name === "TimeoutError"
              ? "Request timed out — the page took too long to respond"
              : `Failed to fetch URL: ${e.message}`,
          });
        }

        // Parse with linkedom + Readability
        const { document } = parseHTML(html);

        // Extract title and meta before Readability modifies the DOM
        const pageTitle = document.querySelector("title")?.textContent?.trim() || "";
        const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
        const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute("content")?.trim() || "";

        // Use Readability to extract main article content
        const reader = new Readability(document as any, {
          charThreshold: 100,
        });
        const article = reader.parse();

        if (!article || !article.textContent || article.textContent.trim().length < 50) {
          // Fallback: strip HTML manually if Readability fails
          const fallbackText = html
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, "")
            .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&[a-z]+;/gi, " ")
            .replace(/\s+/g, " ")
            .trim();

          if (fallbackText.length < 50) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Could not extract meaningful content from this URL. The page may be behind a paywall, require JavaScript, or have very little text content.",
            });
          }

          const wordCount = fallbackText.split(/\s+/).filter(w => w.length > 0).length;
          return {
            content: fallbackText.slice(0, 15000),
            title: pageTitle,
            wordCount,
            url: input.url,
            extractionMethod: "fallback" as const,
            metaDescription,
            metaKeywords,
          };
        }

        const cleanText = article.textContent
          .replace(/\s+/g, " ")
          .trim();
        const wordCount = cleanText.split(/\s+/).filter(w => w.length > 0).length;

        return {
          content: cleanText.slice(0, 15000),
          title: article.title || pageTitle,
          wordCount,
          url: input.url,
          extractionMethod: "readability" as const,
          metaDescription,
          metaKeywords,
        };
      }),


    /**
     * Multi-URL Competitor Analysis — fetch 2-3 competitor URLs in parallel,
     * run entity analysis on each, then merge results to identify consensus
     * topics, unique topics, and entity gaps.
     */
    analyzeCompetitorUrls: publicProcedure
      .input(z.object({
        urls: z.array(z.string().url("Please enter a valid URL")).min(2, "At least 2 URLs required").max(3, "Maximum 3 URLs"),
        keyword: z.string().optional(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { Readability } = await import("@mozilla/readability");
        const { parseHTML } = await import("linkedom");

        // ---- Step 1: Fetch all URLs in parallel ----
        const fetchOne = async (url: string) => {
          try {
            const resp = await fetch(url, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; RankPilot/1.0; +https://rankpilot.app)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
              },
              signal: AbortSignal.timeout(15000),
              redirect: "follow",
            });
            if (!resp.ok) return { url, error: `HTTP ${resp.status}`, content: "", title: "", wordCount: 0 };
            const contentType = resp.headers.get("content-type") || "";
            if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
              return { url, error: "Not an HTML page", content: "", title: "", wordCount: 0 };
            }
            const html = await resp.text();
            const { document } = parseHTML(html);
            const pageTitle = document.querySelector("title")?.textContent?.trim() || "";
            const reader = new Readability(document as any, { charThreshold: 100 });
            const article = reader.parse();
            if (article && article.textContent && article.textContent.trim().length >= 50) {
              const clean = article.textContent.replace(/\s+/g, " ").trim();
              return { url, error: null, content: clean.slice(0, 8000), title: article.title || pageTitle, wordCount: clean.split(/\s+/).filter((w: string) => w.length > 0).length };
            }
            // Fallback
            const fallback = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
            return { url, error: null, content: fallback.slice(0, 8000), title: pageTitle, wordCount: fallback.split(/\s+/).filter((w: string) => w.length > 0).length };
          } catch (e: any) {
            return { url, error: e.name === "TimeoutError" ? "Timed out" : e.message, content: "", title: "", wordCount: 0 };
          }
        };

        const fetched = await Promise.all(input.urls.map(fetchOne));
        const successful = fetched.filter(f => !f.error && f.content.length >= 50);
        if (successful.length < 2) {
          const errors = fetched.filter(f => f.error).map(f => `${f.url}: ${f.error}`).join("; ");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Could not extract content from enough URLs (need at least 2). Errors: ${errors}`,
          });
        }

        // ---- Step 2: Run entity analysis on each URL in parallel ----
        const analyzeOne = async (item: { url: string; content: string; title: string }) => {
          try {
            // Trim content to 5000 chars to reduce LLM processing time and avoid timeouts
            const trimmedContent = item.content.slice(0, 5000);
            const prompt = getEntityAnalysisPrompt(trimmedContent, input.keyword || undefined);
            const response = await callLLM({
              messages: [
                { role: "system", content: "You are an expert SEO entity analyst. Respond with raw JSON only." },
                { role: "user", content: prompt },
              ],
            }, input.projectId);
            const llmResponse = (response.choices?.[0]?.message?.content || "") as string;
            const parsed = extractJSON(llmResponse);
            if (!parsed) {
              console.warn(`[CompetitorAnalysis] Failed to parse LLM JSON for ${item.url}`);
              return null;
            }
            return { url: item.url, title: item.title, wordCount: item.content.split(/\s+/).length, analysis: parsed as EntityAnalysisResult };
          } catch (e: any) {
            console.error(`[CompetitorAnalysis] LLM analysis failed for ${item.url}:`, e.message);
            return null;
          }
        };

        const analyses = (await Promise.all(successful.map(analyzeOne))).filter((a): a is NonNullable<typeof a> => a !== null);
        if (analyses.length < 2) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Entity analysis failed for too many URLs. The AI model may have timed out — try again or use shorter articles." });
        }

        // ---- Step 3: Merge with LLM — find consensus, unique, and gaps ----
        const mergeInput = analyses.map((a, i) => `
=== COMPETITOR ${i + 1}: ${a.url} ===
Title: ${a.title}
Word Count: ${a.wordCount}
Primary Entity: ${a.analysis.primaryEntity.name} (${a.analysis.primaryEntity.type})
Overall Score: ${a.analysis.scores.overallScore}

Entities (${a.analysis.entities.length}):
${a.analysis.entities.map(e => `- ${e.name} (${e.type}, ${e.prominence})`).join('\n')}

Actionable Fixes:
${a.analysis.actionableFixes.map((f, j) => `${j + 1}. ${f}`).join('\n')}

Supporting Coverage: ${a.analysis.supportingCoverage.grade}
- Sub-entities: ${a.analysis.supportingCoverage.relatedSubEntities.join(', ') || 'None'}
- Missing: ${a.analysis.supportingCoverage.missingComponents.join(', ') || 'None'}

GEO Extractability: ${a.analysis.geoExtractability.grade}
- ${a.analysis.geoExtractability.evaluation}

Advanced Recommendations:
- Refined Entity: ${a.analysis.advancedRecommendations.refinedPrimaryEntity}
- Suggested Title: ${a.analysis.advancedRecommendations.suggestedTitleRewrite}
- Missing Supporting: ${a.analysis.advancedRecommendations.missingSupportingEntities.join(', ')}
`).join('\n');

        const mergePrompt = `You are an expert SEO competitive analyst. You have been given entity/salience analysis results for ${analyses.length} top-ranking competitor articles${input.keyword ? ` for the keyword "${input.keyword}"` : ''}.

Your job is to synthesize these analyses into a competitive intelligence report that identifies:

1. **Consensus Topics** — sections/entities that appear in ALL competitors (these are REQUIRED for any new article)
2. **Common Topics** — sections/entities that appear in MOST competitors (2 out of 3, or both if 2 URLs)
3. **Unique Topics** — sections/entities that appear in only ONE competitor (potential differentiation opportunities)
4. **Entity Gaps** — entities or topics that are MISSING from all competitors (opportunity to outperform)
5. **Recommended Sections** — the ideal section structure for a new article that would outrank all competitors

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

        let merged: any;
        try {
          const mergeResponse = await callLLM({
            messages: [
              { role: "system", content: "You are an expert SEO competitive analyst. Respond with raw JSON only." },
              { role: "user", content: mergePrompt },
            ],
          }, input.projectId);

          const mergeRaw = (mergeResponse.choices?.[0]?.message?.content || "") as string;
          merged = extractJSON(mergeRaw);
          if (!merged) {
            console.error("[CompetitorAnalysis] Failed to parse merge response:", mergeRaw.slice(0, 200));
            throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to parse the competitive analysis. Please try again." });
          }
        } catch (e: any) {
          if (e instanceof TRPCError) throw e;
          console.error("[CompetitorAnalysis] Merge LLM call failed:", e.message);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: `Competitive analysis merge failed: ${e.message}. Please try again.` });
        }

        return {
          urls: fetched.map(f => ({ url: f.url, title: f.title, wordCount: f.wordCount, error: f.error })),
          analyses: analyses.map(a => ({
            url: a.url,
            title: a.title,
            wordCount: a.wordCount,
            scores: a.analysis.scores,
            primaryEntity: a.analysis.primaryEntity,
            entityCount: a.analysis.entities.length,
          })),
          merged,
        };
      }),

    /**
     * Generate an outline from merged competitor analysis.
     * Takes the merged competitive intelligence and creates an outline
     * that covers all consensus topics and selectively adds unique depth.
     */
    generateOutlineFromCompetitors: publicProcedure
      .input(z.object({
        /** The merged competitor analysis data */
        competitorData: z.object({
          consensusTopics: z.array(z.object({ topic: z.string(), description: z.string() })),
          commonTopics: z.array(z.object({ topic: z.string(), description: z.string() })).optional(),
          uniqueTopics: z.array(z.object({ topic: z.string(), source: z.string(), description: z.string() })),
          entityGaps: z.array(z.object({ entity: z.string(), type: z.string(), rationale: z.string() })),
          recommendedSections: z.array(z.object({ heading: z.string(), rationale: z.string(), priority: z.string() })),
          competitiveInsights: z.object({
            avgScore: z.number(),
            strongestArea: z.string(),
            weakestArea: z.string(),
            differentiationOpportunity: z.string(),
          }).optional(),
        }),
        /** Per-URL analysis summaries */
        analyses: z.array(z.object({
          url: z.string(),
          title: z.string(),
          scores: z.object({ overallScore: z.number() }),
          primaryEntity: z.object({ name: z.string(), type: z.string() }),
        })),
        keyword: z.string().min(1),
        projectId: z.number(),
        brandVoiceId: z.number().optional(),
        icpProfileId: z.number().optional(),
        targetWordCount: z.number().optional(),
        numSections: z.number().optional(),
        numFaqs: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const cd = input.competitorData;

        // ---- Build Competitor Context ----
        const competitorContext = `
=== COMPETITIVE ANALYSIS RESULTS ===
These are the top-ranking competitors for "${input.keyword}". Your outline must BEAT all of them.

COMPETITOR SUMMARIES:
${input.analyses.map((a, i) => `${i + 1}. ${a.title} (${a.url}) — Score: ${a.scores.overallScore}, Primary Entity: ${a.primaryEntity.name}`).join('\n')}

CONSENSUS TOPICS (appear in ALL competitors — MUST include):
${cd.consensusTopics.map(t => `- ${t.topic}: ${t.description}`).join('\n') || '- None identified'}

${cd.commonTopics?.length ? `COMMON TOPICS (appear in most competitors — SHOULD include):
${cd.commonTopics.map(t => `- ${t.topic}: ${t.description}`).join('\n')}` : ''}

UNIQUE TOPICS (appear in only one competitor — selective inclusion for depth):
${cd.uniqueTopics.map(t => `- ${t.topic} (from ${t.source}): ${t.description}`).join('\n') || '- None identified'}

ENTITY GAPS (missing from ALL competitors — OPPORTUNITY to outperform):
${cd.entityGaps.map(g => `- ${g.entity} (${g.type}): ${g.rationale}`).join('\n') || '- None identified'}

RECOMMENDED SECTION STRUCTURE:
${cd.recommendedSections.map(s => `- [${s.priority.toUpperCase()}] ${s.heading}: ${s.rationale}`).join('\n')}

${cd.competitiveInsights ? `COMPETITIVE INSIGHTS:
- Average competitor score: ${cd.competitiveInsights.avgScore}
- Strongest area across competitors: ${cd.competitiveInsights.strongestArea}
- Weakest area (your opportunity): ${cd.competitiveInsights.weakestArea}
- Key differentiation: ${cd.competitiveInsights.differentiationOpportunity}` : ''}
`;

        // ---- Fetch Brand Voice & ICP (reuse existing logic) ----
        const project = await getProjectById(input.projectId);
        const allVoices = await getBrandVoicesByProject(input.projectId);
        const brandVoice = input.brandVoiceId
          ? allVoices.find((v: any) => v.id === input.brandVoiceId) ?? allVoices[0] ?? null
          : allVoices.find((v: any) => v.isDefault === 1) ?? allVoices[0] ?? null;

        let icpSection = "";
        const formatList = (items: string[] | null | undefined, label: string): string => {
          if (!items?.length) return '';
          return `${label}:\n${items.map((item, i) => `  ${i + 1}. ${item}`).join('\n')}\n`;
        };

        if (input.icpProfileId) {
          const icpProfile = await getICPById(input.icpProfileId);
          if (icpProfile) {
            const demographics = icpProfile.demographics;
            const demoLines = demographics ? [
              demographics.ageRange ? `Age Range: ${demographics.ageRange}` : '',
              demographics.location ? `Location: ${demographics.location}` : '',
              demographics.income ? `Income: ${demographics.income}` : '',
              demographics.education ? `Education: ${demographics.education}` : '',
              demographics.occupation ? `Occupation: ${demographics.occupation}` : '',
              demographics.other ? `Other: ${demographics.other}` : '',
            ].filter(Boolean).join('\n') : '';

            icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) ===
TARGET AUDIENCE: ${icpProfile.name}
${icpProfile.description ? `Who They Are: ${icpProfile.description}` : ''}
${demoLines ? `\nDEMOGRAPHICS:\n${demoLines}` : ''}

${formatList(icpProfile.painPoints, 'PAIN POINTS (structure H2 headings around these)')}
${formatList(icpProfile.goals, 'GOALS (address these in content sections)')}
${formatList(icpProfile.objections, 'OBJECTIONS (create FAQ questions from these)')}
${icpProfile.searchBehavior ? `SEARCH BEHAVIOR: ${icpProfile.searchBehavior}\n` : ''}
${formatList(icpProfile.contentPreferences, 'CONTENT PREFERENCES')}
`;
          }
        } else if (project?.icpPrimaryName) {
          icpSection = `
=== IDEAL CUSTOMER PROFILE (ICP) ===
TARGET AUDIENCE: ${project.icpPrimaryName}
${project.icpWhoTheyAre ? `Who They Are: ${project.icpWhoTheyAre}` : ''}

${formatList(project.icpPains as string[] | null, 'PAIN POINTS (structure H2 headings around these)')}
${formatList(project.icpGoals as string[] | null, 'GOALS (address these in content sections)')}
${formatList(project.icpObjections as string[] | null, 'OBJECTIONS (create FAQ questions from these)')}
${formatList(project.icpDecisionTriggers as string[] | null, 'DECISION TRIGGERS')}
${formatList(project.icpTrustSignals as string[] | null, 'TRUST SIGNALS')}
`;
        }

        let brandVoiceSection = "";
        if (brandVoice) {
          const perspectiveMap: Record<string, string> = {
            first: "First person (we/our/us)",
            second: "Second person (you/your)",
            third: "Third person (they/their)",
          };
          const styleMap: Record<string, string> = {
            short: "Concise, punchy sentences. Paragraphs of 1-3 sentences only.",
            mixed: "Varied sentence lengths with natural rhythm. Paragraphs of 2-5 sentences only.",
            detailed: "Detailed, explanatory sentences. Paragraphs of 3-6 sentences maximum.",
          };

          const AVOID_LABELS: Record<string, string> = {
            jargon: "Overly technical jargon", salesy: "Sales-heavy language",
            fear: "Fear-based messaging", exaggerated: "Exaggerated claims",
            cliches: "Industry clichés", passive: "Passive voice",
            buzzwords: "Buzzwords", rhetorical: "Rhetorical questions",
            unverified: "Unverified statistics", competitor: "Competitor comparisons",
          };
          let avoidItems: string[] = [];
          const avoidList = brandVoice.avoidList || "";
          if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
            const parts = avoidList.split("|");
            for (const part of parts) {
              if (part.startsWith("PRESETS:")) {
                const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
                avoidItems.push(...presetIds.map(id => AVOID_LABELS[id] || id));
              } else if (part.startsWith("CUSTOM:")) {
                const custom = part.replace("CUSTOM:", "").trim();
                if (custom) avoidItems.push(...custom.split(",").map(s => s.trim()).filter(Boolean));
              }
            }
          } else if (avoidList) {
            avoidItems = avoidList.split(",").map(s => s.trim()).filter(Boolean);
          }

          brandVoiceSection = `
=== BRAND VOICE GUIDELINES ===
Voice Name: ${brandVoice.name}
TONE TRAITS: ${brandVoice.toneTraits || 'Professional'}
WRITING PERSPECTIVE: ${perspectiveMap[brandVoice.perspective] || brandVoice.perspective}
SENTENCE STYLE: ${styleMap[brandVoice.sentenceStyle] || brandVoice.sentenceStyle}
${avoidItems.length > 0 ? `AVOID:\n${avoidItems.map(item => `- ${item}`).join('\n')}` : ''}
`;
        }

        const currentYear = new Date().getFullYear();
        const numSections = input.numSections ?? 8;
        const numFaqs = input.numFaqs ?? 5;
        const targetWordCount = input.targetWordCount ?? 2000;

        const systemPrompt = `You are an expert SEO content strategist. You have been given competitive analysis results from ${input.analyses.length} top-ranking articles. Your job is to create an outline that would OUTRANK all of them by:

1. Covering ALL consensus topics (required by all competitors)
2. Including the best unique topics for added depth
3. Filling entity gaps that no competitor covers (your competitive advantage)
4. Addressing the weakest areas across competitors

IMPORTANT — CURRENT DATE CONTEXT: The current year is ${currentYear}. All references to dates, years, regulations, trends, and time-sensitive topics MUST treat ${currentYear} as the present year.

${competitorContext}
${icpSection}
${brandVoiceSection}

OUTLINE REQUIREMENTS:
1. Build the outline to BEAT all competitors — not just match them
2. Create ${numSections} main H2 sections plus a FAQ section with ${numFaqs} questions
3. Include an introduction that establishes the primary topic within the first 120 words
4. Every consensus topic MUST have a dedicated section or subsection
5. Entity gaps should be covered in dedicated sections (this is your competitive edge)
6. Unique topics from individual competitors should be selectively included where they add genuine value
7. Target word count: ${targetWordCount} words
8. Include a conclusion section last
9. Each section should have 2-4 specific, actionable key points — not generic filler
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
            { role: "user", content: `Generate an outline for the keyword: "${input.keyword}" that would outrank all ${input.analyses.length} competitors analyzed.` },
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
                              points: { type: "array", items: { type: "string" } },
                            },
                            required: ["id", "heading", "type", "points"],
                            additionalProperties: false,
                          },
                        },
                        targetWordCount: { type: "integer", description: "Target word count for this section" },
                      },
                      required: ["id", "heading", "type", "points", "subSections", "targetWordCount"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["title", "sections"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error("No response from AI");
        const content = typeof rawContent === "string" ? rawContent : (rawContent as any)[0]?.text ?? "";
        const parsed = extractJSON(content);
        if (!parsed) throw new Error("Failed to parse outline from AI response");

        // Save the outline to the database
        const outline = await createOutline({
          title: parsed.title,
          keyword: input.keyword,
          sections: parsed.sections as OutlineSection[],
          settings: {
            contentType: "blog",
            targetWordCount: input.targetWordCount,
            numSections: input.numSections,
            numFaqs: input.numFaqs,
            additionalInstructions: `Generated from competitor analysis of ${input.analyses.length} URLs. Covers all consensus topics and fills entity gaps.`,
          },
          projectId: input.projectId,
          userId: 1,
        });

        return outline;
      }),

    // ---- Keyword Research (Keywords Everywhere API) ----

    /** Search for a keyword and get related keywords with full metrics */
    keywordResearch: publicProcedure
      .input(z.object({
        keyword: z.string().min(1).max(200),
        numRelated: z.number().min(1).max(100).default(10),
        country: z.string().default("us"),
        currency: z.string().default("usd"),
        dataSource: z.enum(["gkp", "cli"]).default("cli"),
      }))
      .mutation(async ({ input }) => {
        const { getRelatedKeywords, getKeywordData } = await import("./keywords-everywhere");
        const apiKey = (await import("./_core/env")).ENV.keywordsEverywhereApiKey;
        if (!apiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Keywords Everywhere API key not configured" });

        // Step 1: Get related keywords (just strings)
        const relatedRes = await getRelatedKeywords(apiKey, input.keyword, input.numRelated);
        const relatedKeywords = relatedRes.data || [];
        let totalCreditsConsumed = relatedRes.credits_consumed || 0;

        // Step 2: Combine seed + related into one list for metrics lookup
        const allKeywords = [input.keyword, ...relatedKeywords.filter(k => k.toLowerCase() !== input.keyword.toLowerCase())];

        // Step 3: Get full metrics for all keywords (batch up to 100)
        const metricsRes = await getKeywordData(apiKey, allKeywords, {
          country: input.country,
          currency: input.currency,
          dataSource: input.dataSource,
        });
        totalCreditsConsumed += metricsRes.credits_consumed || 0;

        // Step 4: Build enriched results with type labels
        const seedLower = input.keyword.toLowerCase();
        const results = (metricsRes.data || []).map(kw => {
          const isSeed = kw.keyword.toLowerCase() === seedLower;
          // Determine trend direction from last 6 months
          const trend = kw.trend || [];
          let trendDirection: "rising" | "declining" | "stable" = "stable";
          if (trend.length >= 4) {
            const recent = trend.slice(-3);
            const earlier = trend.slice(-6, -3);
            const recentAvg = recent.reduce((s, t) => s + t.value, 0) / recent.length;
            const earlierAvg = earlier.length > 0 ? earlier.reduce((s, t) => s + t.value, 0) / earlier.length : recentAvg;
            if (earlierAvg > 0) {
              const change = (recentAvg - earlierAvg) / earlierAvg;
              if (change > 0.15) trendDirection = "rising";
              else if (change < -0.15) trendDirection = "declining";
            }
          }
          // Map competition float to label
          let competitionLabel: "Low" | "Medium" | "High" = "Low";
          if (kw.competition >= 0.66) competitionLabel = "High";
          else if (kw.competition >= 0.33) competitionLabel = "Medium";

          return {
            keyword: kw.keyword,
            type: isSeed ? "seed" as const : "related" as const,
            volume: kw.vol,
            cpc: parseFloat(kw.cpc?.value || "0"),
            cpcCurrency: kw.cpc?.currency || "$",
            competition: kw.competition,
            competitionLabel,
            trendDirection,
            trendData: trend.map(t => ({ month: t.month, year: t.year, value: t.value })),
          };
        });

        return {
          results,
          seedKeyword: input.keyword,
          totalResults: allKeywords.length,
          creditsConsumed: totalCreditsConsumed,
          creditsRemaining: metricsRes.credits ?? null,
        };
      }),

    /** Get Keywords Everywhere credit balance */
    getKeCredits: publicProcedure
      .query(async () => {
        const { getCreditBalance } = await import("./keywords-everywhere");
        const apiKey = (await import("./_core/env")).ENV.keywordsEverywhereApiKey;
        if (!apiKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Keywords Everywhere API key not configured" });
        const credits = await getCreditBalance(apiKey);
        return { credits };
      }),

    // ---- Project Keywords (Save / Manage) ----

    /** Save selected keywords from research to a project */
    saveKeywordsToProject: publicProcedure
      .input(z.object({
        projectId: z.number(),
        keywords: z.array(z.object({
          keyword: z.string(),
          volume: z.number().default(0),
          cpc: z.number().default(0),
          competition: z.number().default(0),
          competitionLabel: z.enum(["Low", "Medium", "High"]).default("Low"),
          trendDirection: z.enum(["rising", "declining", "stable"]).default("stable"),
          trendData: z.array(z.object({ month: z.string(), year: z.number(), value: z.number() })).optional(),
        })),
        source: z.string().default("keyword-research"),
      }))
      .mutation(async ({ input }) => {
        const rows = input.keywords.map(kw => {
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
            userId: 1,
          };
        });
        const result = await addProjectKeywordsBulk(rows);
        // Auto-match keywords to existing articles
        await matchKeywordsToArticles(input.projectId);
        return result;
      }),

    /** Get all keywords for a project with search/sort */
    getProjectKeywords: publicProcedure
      .input(z.object({
        projectId: z.number(),
        search: z.string().optional(),
        sortBy: z.string().optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
      }))
      .query(async ({ input }) => {
        const keywords = await getProjectKeywordsList(input.projectId, input.search, input.sortBy, input.sortDir);
        const stats = await getProjectKeywordsCount(input.projectId);
        return { keywords, ...stats };
      }),

    /** Bulk delete project keywords */
    deleteProjectKeywords: publicProcedure
      .input(z.object({ ids: z.array(z.number()).min(1) }))
      .mutation(async ({ input }) => {
        await deleteProjectKeywordsBulk(input.ids);
        return { deleted: input.ids.length };
      }),

    /** Update page URL for a keyword */
    updateKeywordPage: publicProcedure
      .input(z.object({ id: z.number(), pageUrl: z.string().nullable() }))
      .mutation(async ({ input }) => {
        await updateProjectKeywordPage(input.id, input.pageUrl);
        return { success: true };
      }),

    /** Add keywords manually (typed in by user) */
    addKeywordsManually: publicProcedure
      .input(z.object({
        projectId: z.number(),
        keywords: z.array(z.string().min(1)).min(1),
      }))
      .mutation(async ({ input }) => {
        // For manually added keywords, we fetch metrics from KE API if available
        let enrichedRows: any[] = [];
        try {
          const { getKeywordData } = await import("./keywords-everywhere");
          const apiKey = (await import("./_core/env")).ENV.keywordsEverywhereApiKey;
          if (apiKey) {
            const data = await getKeywordData(apiKey, input.keywords, { country: "us", currency: "USD", dataSource: "cli" });
            enrichedRows = data.data.map((d: any) => {
              const comp = d.competition ?? 0;
              const compLabel = comp >= 0.67 ? "High" : comp >= 0.33 ? "Medium" : "Low";
              const trend = d.trend ?? [];
              let trendDir: "rising" | "declining" | "stable" = "stable";
              if (trend.length >= 2) {
                const recent = trend.slice(-3).reduce((s: number, t: any) => s + (t.value ?? 0), 0) / 3;
                const older = trend.slice(0, 3).reduce((s: number, t: any) => s + (t.value ?? 0), 0) / 3;
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
                competitionLabel: compLabel as "Low" | "Medium" | "High",
                trendDirection: trendDir,
                trendData: trend,
                priority,
                priorityLabel,
                source: "manual" as const,
                userId: 1,
              };
            });
          }
        } catch (e) {
          console.warn("[ProjectKeywords] Failed to enrich manual keywords with KE data:", e);
        }
        // Fallback: if enrichment failed, add with zero metrics
        if (enrichedRows.length === 0) {
          enrichedRows = input.keywords.map(kw => ({
            projectId: input.projectId,
            keyword: kw,
            volume: 0,
            cpc: 0,
            competition: 0,
            competitionLabel: "Low" as const,
            trendDirection: "stable" as const,
            trendData: null,
            priority: 0,
            priorityLabel: "Low" as const,
            source: "manual" as const,
            userId: 1,
          }));
        }
        const result = await addProjectKeywordsBulk(enrichedRows);
        await matchKeywordsToArticles(input.projectId);
        return result;
      }),

    /** Import keywords from CSV/TXT content (parsed on client, sent as array) */
    importKeywords: publicProcedure
      .input(z.object({
        projectId: z.number(),
        keywords: z.array(z.object({
          keyword: z.string(),
          volume: z.number().optional(),
          cpc: z.number().optional(),
          competition: z.number().optional(),
          kd: z.number().optional(),
          position: z.number().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        // Try to enrich keywords that don't have volume data
        const needsEnrichment = input.keywords.filter(k => !k.volume || k.volume === 0);
        const hasData = input.keywords.filter(k => k.volume && k.volume > 0);
        let enrichedMap: Record<string, any> = {};
        if (needsEnrichment.length > 0) {
          try {
            const { getKeywordData } = await import("./keywords-everywhere");
            const apiKey = (await import("./_core/env")).ENV.keywordsEverywhereApiKey;
            if (apiKey) {
              const data = await getKeywordData(apiKey, needsEnrichment.map(k => k.keyword), { country: "us", currency: "USD", dataSource: "cli" });
              for (const d of data.data) {
                enrichedMap[d.keyword.toLowerCase()] = d;
              }
            }
          } catch (e) {
            console.warn("[ProjectKeywords] Failed to enrich imported keywords:", e);
          }
        }
        const rows = input.keywords.map(kw => {
          const enriched = enrichedMap[kw.keyword.toLowerCase()];
          const vol = kw.volume || enriched?.vol || 0;
          const cpc = kw.cpc || enriched?.cpc?.value || 0;
          const comp = kw.competition || enriched?.competition || 0;
          const compLabel = comp >= 0.67 ? "High" : comp >= 0.33 ? "Medium" : "Low";
          const trend = enriched?.trend ?? [];
          let trendDir: "rising" | "declining" | "stable" = "stable";
          if (trend.length >= 2) {
            const recent = trend.slice(-3).reduce((s: number, t: any) => s + (t.value ?? 0), 0) / 3;
            const older = trend.slice(0, 3).reduce((s: number, t: any) => s + (t.value ?? 0), 0) / 3;
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
            competitionLabel: compLabel as "Low" | "Medium" | "High",
            trendDirection: trendDir,
            trendData: trend.length > 0 ? trend : null,
            kd: kw.kd ?? null,
            position: kw.position ?? null,
            priority,
            priorityLabel,
            source: "import" as const,
            userId: 1,
          };
        });
        const result = await addProjectKeywordsBulk(rows);
        await matchKeywordsToArticles(input.projectId);
        return result;
      }),
  }),

  grading: router({
    /** Standalone content grader — paste any content, 4-category 85-point system */
    gradeContent: publicProcedure
      .input(z.object({ content: z.string().min(50, "Content must be at least 50 characters") }))
      .mutation(async ({ input }) => {
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
- A detailed 2-3 sentence analysis explaining what the content does well and what it lacks in this category. Be specific — reference actual content elements, not generic observations.
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
            { role: "user", content: `Grade this content:\n\n${input.content}` },
          ],
        });

        const llmResponse = (response.choices?.[0]?.message?.content || "") as string;
        const gradeResult = extractJSON(llmResponse);
        if (!gradeResult) throw new Error("Failed to parse grading response");
        return gradeResult;
      }),

    /** Per-article grader — 6+2 categories with Brand Voice + ICP conditional scoring */
    gradeArticle: publicProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Fetch article
        const [article] = await db.select().from(articles).where(eq(articles.id, input.articleId)).limit(1);
        if (!article) throw new Error("Article not found");

        // Fetch project with ICP
        const [project] = await db.select().from(projects).where(eq(projects.id, article.projectId)).limit(1);

        // Fetch default brand voice
        const allVoices = project ? await db.select().from(brandVoices).where(eq(brandVoices.projectId, project.id)) : [];
        const defaultBrandVoice = allVoices.find(bv => bv.isDefault === 1) || allVoices[0] || null;

        // Fetch project citation sources
        const projectCitations = project ? await db.select().from(citationSources).where(eq(citationSources.projectId, project.id)) : [];

        // Check ICP
        const hasICP = !!(project?.icpPrimaryName && project?.icpPains);
        const icpData = hasICP ? {
          name: project.icpPrimaryName,
          whoTheyAre: project.icpWhoTheyAre,
          pains: (project.icpPains as string[] || []),
          goals: (project.icpGoals as string[] || []),
          objections: (project.icpObjections as string[] || []),
        } : null;

        // Parse tone traits helper
        const parseToneTraits = (toneTraits: string | null) => {
          if (!toneTraits) return { primary: [], supporting: [] };
          if (toneTraits.includes("PRIMARY:") && toneTraits.includes("SUPPORTING:")) {
            const primaryMatch = toneTraits.match(/PRIMARY:([^|]+)/);
            const supportingMatch = toneTraits.match(/SUPPORTING:(.+)/);
            return {
              primary: primaryMatch ? primaryMatch[1].split(",").map(t => t.trim()).filter(Boolean) : [],
              supporting: supportingMatch ? supportingMatch[1].split(",").map(t => t.trim()).filter(Boolean) : [],
            };
          }
          return { primary: toneTraits.split(",").map(t => t.trim()).filter(Boolean), supporting: [] };
        };

        // Parse avoid list helper
        const AVOID_LABELS: Record<string, string> = {
          jargon: "Industry jargon and technical terms",
          salesy: "Salesy or promotional language",
          fear: "Fear tactics or scare language",
          superlatives: "Superlatives and exaggerations",
          passive: "Passive voice",
          cliches: "Clichés and overused phrases",
          firstPerson: "First person (I/me/my)",
          humor: "Humor or jokes",
          slang: "Slang or informal language",
          questions: "Rhetorical questions",
        };
        const parseAvoidList = (avoidList: string | null) => {
          if (!avoidList) return [];
          if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
            const items: string[] = [];
            const presetsMatch = avoidList.match(/PRESETS:([^|]*)/);
            const customMatch = avoidList.match(/CUSTOM:(.+)/);
            if (presetsMatch?.[1]) {
              presetsMatch[1].split(",").filter(Boolean).forEach(id => {
                if (AVOID_LABELS[id]) items.push(AVOID_LABELS[id]);
              });
            }
            if (customMatch?.[1]) {
              items.push(...customMatch[1].split(",").map(t => t.trim()).filter(Boolean));
            }
            return items;
          }
          return avoidList.split(",").map(t => t.trim()).filter(Boolean);
        };

        // Build Citation Sources section
        let citationSourcesSection = "";
        if (projectCitations.length > 0) {
          const sourcesList = projectCitations.map((c, i) => {
            let entry = `  ${i + 1}. ${c.name} — ${c.url}`;
            if (c.description) entry += ` (${c.description})`;
            if (c.category) entry += ` [Category: ${c.category}]`;
            return entry;
          }).join("\n");
          citationSourcesSection = `\nAVAILABLE CITATION SOURCES (use ONLY these exact URLs):\n${sourcesList}\n\nCITATION QUALITY RULES (MANDATORY):\n1. URL USAGE: You MUST use ONLY the exact URLs listed above when suggesting citations. Do NOT invent, fabricate, or construct URLs. Do NOT append path segments or guess at page paths. Use the URL exactly as listed. If no listed URL is relevant to a claim, do NOT suggest a citation for that claim.\n\n2. ANCHOR TEXT: Must be 2-7 words maximum. NEVER wrap an entire sentence or clause as anchor text. The anchor text should be ONLY the specific factual claim or key phrase being cited. Examples:\n   - BAD: "<a href=\"...\">54% of all Medicare beneficiaries are now enrolled in a Medicare Advantage Plan</a>" (too long)\n   - BAD: "Learn more at <a href=\"...\">Medicare.gov</a>" (generic)\n   - GOOD: "<a href=\"...\">54% of beneficiaries</a> are now enrolled"\n   - GOOD: "the deductible is <a href=\"...\">$257 in 2026</a>"\n\n3. When suggesting citation improvements, specify EXACTLY which sentence/claim needs the citation, which source to use, and remind that the URL must be used exactly as listed above.`;
        }

        // Build Brand Voice section
        let brandVoiceSection = "";
        let brandVoiceGradingCriteria = "";
        if (defaultBrandVoice) {
          const tones = parseToneTraits(defaultBrandVoice.toneTraits);
          const avoidItems = parseAvoidList(defaultBrandVoice.avoidList);
          brandVoiceSection = `\nBRAND VOICE REFERENCE (for Brand Voice Alignment scoring):\n- Voice Name: ${defaultBrandVoice.name}\n- Primary Tone Traits: ${tones.primary.join(", ") || "Not specified"}\n- Supporting Tone Traits: ${tones.supporting.join(", ") || "Not specified"}\n- Perspective: ${defaultBrandVoice.perspective === "first" ? "First person (we/our)" : defaultBrandVoice.perspective === "second" ? "Second person (you/your)" : "Third person"}\n- Sentence Style: ${defaultBrandVoice.sentenceStyle === "short" ? "Short and concise" : defaultBrandVoice.sentenceStyle === "detailed" ? "Detailed and explanatory" : "Mixed/varied"}\n- Things to Avoid: ${avoidItems.length > 0 ? avoidItems.join(", ") : "None specified"}${defaultBrandVoice.writingStyleSample ? `\n- Writing Style Sample:\n"""${defaultBrandVoice.writingStyleSample.substring(0, 500)}"""` : ""}`;
          brandVoiceGradingCriteria = `\n7. BRAND VOICE ALIGNMENT (10 points) - ONLY SCORE THIS IF BRAND VOICE IS PROVIDED\n- Tone Consistency: Does the content maintain the specified primary and supporting tone traits throughout?\n- Perspective Adherence: Is the correct grammatical perspective (first/second/third person) used consistently?\n- Sentence Style Match: Does the sentence structure match the specified style (short/mixed/detailed)?\n- Avoidance Compliance: Does the content successfully avoid the listed items to avoid?\n- Overall Voice Match: Does the content feel like it was written with the brand voice in mind?`;
        }

        // Build ICP section
        let icpSection = "";
        let icpGradingCriteria = "";
        if (icpData) {
          icpSection = `\nICP (IDEAL CUSTOMER PROFILE) REFERENCE (for ICP Alignment scoring):\n- Target Audience: ${icpData.name}\n- Who They Are: ${icpData.whoTheyAre || "Not specified"}\n- Pain Points: ${icpData.pains.slice(0, 5).join("; ") || "Not specified"}\n- Goals: ${icpData.goals.slice(0, 5).join("; ") || "Not specified"}\n- Common Objections: ${icpData.objections.slice(0, 5).join("; ") || "Not specified"}`;
          icpGradingCriteria = `\n8. ICP ALIGNMENT (10 points) - ONLY SCORE THIS IF ICP IS PROVIDED\n- Pain Point Addressing: Does the content directly address the target audience's pain points?\n- Goal Alignment: Does the content help readers achieve their stated goals?\n- Objection Handling: Does the content proactively address common objections or concerns?\n- Audience Resonance: Would the target audience (${icpData.name}) feel this content was written specifically for them?\n- Language Match: Does the vocabulary and complexity level match the target audience?`;
        }

        // Calculate total points
        const basePoints = 100;
        const brandVoicePoints = defaultBrandVoice ? 10 : 0;
        const icpPoints = hasICP ? 10 : 0;
        const totalPoints = basePoints + brandVoicePoints + icpPoints;

        const systemPrompt = `You are the GEO Content Grader — a precise, analytical grading system that evaluates content for GEO (Generative Engine Optimization) and AIO (AI Overview) readiness. You prioritize factual accuracy, trust signals, and AI extractability over stylistic polish.
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
- NEVER suggest "Add 2-3 citations" — always suggest ONE specific citation placement

SCORING INSTRUCTIONS:
- Score each category based on its maximum points (not 0-100)
- For items scoring below 30% of their max, provide a specific improvement example
- Be strict but fair — reward citation-ready, accurate, AI-extractable content
${defaultBrandVoice ? "- Include brandVoiceAlignment in response ONLY if brand voice reference was provided above" : "- Do NOT include brandVoiceAlignment in response (no brand voice defined)"}
${hasICP ? "- Include icpAlignment in response ONLY if ICP reference was provided above" : "- Do NOT include icpAlignment in response (no ICP defined)"}

For EACH category, provide:
- A score (out of the max for that category)
- The weight percentage label
- A detailed 2-3 sentence analysis explaining what the content does well and what it lacks. Be specific — reference actual content elements.
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

        const userPrompt = `Grade this article:\n\nTitle: ${article.title}\nKeyword: ${article.keyword || "Not specified"}\n\nContent:\n${article.content}`;

        const response = await callLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }, article.projectId);

        const llmResponse = (response.choices?.[0]?.message?.content || "") as string;
        const raw = extractJSON(llmResponse);
        if (!raw) throw new Error("Failed to parse grading response");

        // Normalize: the LLM returns categories as top-level keys. Restructure into { categories, totalScore, ... }
        const categoryKeys = ["eeatTrust", "accuracy", "aioReadiness", "readabilityUx", "seoEntityCoverage", "riskHygiene", "brandVoiceAlignment", "icpAlignment"];
        const categories: Record<string, any> = {};
        for (const k of categoryKeys) {
          if (raw[k] && typeof raw[k] === "object" && typeof raw[k].score === "number") {
            categories[k] = {
              score: raw[k].score,
              maxScore: raw[k].maxScore,
              weight: raw[k].weight || "",
              label: raw[k].label || k,
              analysis: raw[k].analysis || raw[k].reason || "",
              improvements: raw[k].improvements || [],
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
          prioritizedActions: raw.prioritizedActions || [],
        };

        return {
          grades,
          hasBrandVoice: !!defaultBrandVoice,
          brandVoiceName: defaultBrandVoice?.name || null,
          hasICP,
          icpName: icpData?.name || null,
        };
      }),

    /** Apply selected improvements from a grade to an article — surgical section-level editing */
    applyImprovements: publicProcedure
      .input(z.object({
        articleId: z.number(),
        categoryKey: z.string(),
        categoryLabel: z.string(),
        selectedImprovements: z.array(z.string()).min(1),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const [article] = await db.select().from(articles).where(eq(articles.id, input.articleId)).limit(1);
        if (!article) throw new Error("Article not found");

        // Fetch brand voice for consistent tone
        let brandVoiceSection = "";
        const [project] = article.projectId
          ? await db.select().from(projects).where(eq(projects.id, article.projectId)).limit(1)
          : [null];
        if (project) {
          const allVoices = await db.select().from(brandVoices).where(eq(brandVoices.projectId, project.id));
          const bv = allVoices.find(v => v.isDefault === 1) || allVoices[0];
          if (bv) {
            const perspectiveMap: Record<string, string> = {
              first: "first person (we/our/us)",
              second: "second person (you/your)",
              third: "third person (they/the company)",
            };
            brandVoiceSection = `\nBRAND VOICE (maintain this tone in all improvements):\n- Tone: ${bv.toneTraits}\n- Perspective: ${perspectiveMap[bv.perspective] || bv.perspective}${bv.avoidList ? `\n- Avoid: ${bv.avoidList}` : ""}`;
          }
        }

        // Fetch citation sources for the project
        let citationSourcesSection = "";
        if (project) {
          const projectCitations = await db.select().from(citationSources).where(eq(citationSources.projectId, project.id));
          if (projectCitations.length > 0) {
            const sourcesList = projectCitations.map((c, i) => {
              let entry = `  ${i + 1}. ${c.name} — ${c.url}`;
              if (c.description) entry += ` (${c.description})`;
              return entry;
            }).join("\n");
            citationSourcesSection = `\nAVAILABLE CITATION SOURCES (use ONLY these exact URLs):\n${sourcesList}\n\nCITATION INSERTION RULES (MANDATORY):\n1. URL USAGE: You MUST use ONLY the exact URLs listed above. Do NOT invent, fabricate, or construct URLs. If none of the listed URLs is relevant to a claim, do NOT add a citation link for that claim. NEVER guess at URL paths or append path segments.\n\n2. ANCHOR TEXT: Must be 2-7 words maximum. NEVER wrap an entire sentence or clause as anchor text. The anchor text should be the specific factual claim or key phrase being cited. Examples:\n   - BAD: "<a href=\"...\">54% of all Medicare beneficiaries are now enrolled in a Medicare Advantage Plan</a>" (too long, entire clause)\n   - BAD: "Learn more at <a href=\"...\">Medicare.gov</a>" (generic)\n   - GOOD: "<a href=\"...\">54% of beneficiaries</a> are now enrolled"\n   - GOOD: "the deductible is <a href=\"...\">$257 in 2026</a>"\n\n3. Place the <a> tag inline within the sentence, wrapping ONLY the key factual phrase (2-7 words).`;
          }
        }

        const improvementsList = input.selectedImprovements.map((imp, i) => `${i + 1}. ${imp}`).join("\n");

        // STEP 1: Ask LLM to identify which specific sections need changes and what the changes are
        const planPrompt = `You are an expert content editor. Given the article and the improvements to apply, identify the EXACT sections (paragraphs or sentences) that need to change.
${brandVoiceSection}
${citationSourcesSection}

For each improvement, identify:
1. The exact original text snippet that needs to be modified (copy it VERBATIM from the article — must be an exact match)
2. The replacement text with the improvement applied

Rules:
- CRITICAL: Select the SMALLEST possible text snippet — ideally a SINGLE SENTENCE. Never select a whole paragraph when only one sentence needs changing.
- For citation additions: the "original" should be ONLY the one sentence where the link will be inserted. The "replacement" should be that SAME sentence with the <a> tag added inline. Do NOT rewrite, rephrase, or restructure the sentence — only add the link tag around the relevant words.
- For wording improvements: the "original" should be ONLY the specific sentence(s) that need rewording. The "replacement" must keep all unchanged words identical.
- The "original" field must be an EXACT substring of the article content (character-for-character match)
- If an improvement requires adding NEW content (e.g., a new paragraph), set "original" to the single sentence AFTER which the new content should appear, and set "replacement" to that same sentence PLUS the new content appended
- If an improvement mentions adding sources/citations, use ONLY the exact URLs from the available citation sources listed above. NEVER invent or fabricate URLs. If no citation source URL is relevant, skip the link insertion entirely.
- ANCHOR TEXT LENGTH (CRITICAL): All link anchor text MUST be 2-7 words maximum. Count the words. If your anchor text is longer than 7 words, you MUST shorten it. NEVER wrap an entire sentence or clause as a link. Link ONLY the key factual phrase (e.g., "$257 in 2026" or "covers outpatient services").
- URL RULE: Use ONLY exact URLs from the citation sources list. Do NOT append path segments, do NOT guess at page paths, do NOT construct URLs. Use the URL exactly as listed.
- NEVER rewrite, rephrase, or restructure text that is not directly related to the improvement. If the improvement is "add a citation", the ONLY change should be adding an <a> tag — every other word must remain identical.
- NEVER add <strong>, <b>, <em>, or <i> tags to replacement text unless the original text already had them. Do NOT bold or emphasize changed text — the replacement must use the exact same formatting as the original.
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

        const userPrompt = `Apply these ${input.categoryLabel} improvements to the article:\n\n===IMPROVEMENTS TO APPLY===\n${improvementsList}\n===END IMPROVEMENTS===\n\n===FULL ARTICLE (for context only — do NOT rewrite the whole thing)===\n${article.content}\n===END ARTICLE===`;

        const llmResponse = await callLLM({
          messages: [
            { role: "system", content: planPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const rawResponse = (llmResponse.choices?.[0]?.message?.content || "") as string;
        let edits: Array<{ improvement: string; original: string; replacement: string }> = [];
        try {
          const parsedEdits = extractJSON(rawResponse);
          if (parsedEdits && Array.isArray(parsedEdits)) {
            edits = parsedEdits;
          } else {
            throw new Error("No JSON array found");
          }
        } catch {
          // Fallback: if parsing fails, return error rather than rewriting the whole article
          throw new Error("Failed to parse improvement plan. Please try again.");
        }

        // STEP 2: Apply edits surgically to the original content
        let improvedContent = article.content || "";
        let appliedCount = 0;

        for (const edit of edits) {
          if (!edit.original || !edit.replacement) continue;

          // Try exact match first
          if (improvedContent.includes(edit.original)) {
            improvedContent = improvedContent.replace(edit.original, edit.replacement);
            appliedCount++;
          } else {
            // Try trimmed match (whitespace differences)
            const trimmedOriginal = edit.original.trim();
            if (trimmedOriginal && improvedContent.includes(trimmedOriginal)) {
              improvedContent = improvedContent.replace(trimmedOriginal, edit.replacement.trim());
              appliedCount++;
            }
            // If still no match, skip this edit silently — better to skip than corrupt the article
          }
        }

        // If no edits were applied, throw an error
        if (appliedCount === 0) {
          throw new Error("Could not match any sections in the article. Please try again.");
        }

        // Safety net: strip unwanted <strong>/<b> wrapping that LLMs sometimes add
        improvedContent = stripWrappingStrongTags(improvedContent);

        // Safety net: sanitize inserted hyperlinks — strip fabricated URLs and trim long anchors
        const allowedDomains = project
          ? (await db.select().from(citationSources).where(eq(citationSources.projectId, project.id)))
              .map(c => {
                try { return new URL(c.url).hostname; } catch { return c.url; }
              })
          : [];
        improvedContent = sanitizeInsertedLinks(improvedContent, allowedDomains);

        const wordCount = improvedContent.split(/\s+/).filter((w: string) => w.length > 0).length;

        await db.update(articles).set({
          content: improvedContent,
          wordCount,
        }).where(eq(articles.id, input.articleId));

        return {
          success: true,
          content: improvedContent,
          wordCount,
          appliedCount,
          category: input.categoryLabel,
        };
      }),

    /** Apply selected improvements to raw content (standalone grader — surgical section-level editing) */
    applyContentImprovements: publicProcedure
      .input(z.object({
        content: z.string().min(10),
        categoryKey: z.string(),
        categoryLabel: z.string(),
        selectedImprovements: z.array(z.string()).min(1),
      }))
      .mutation(async ({ input }) => {
        const improvementsList = input.selectedImprovements.map((imp, i) => `${i + 1}. ${imp}`).join("\n");

        const planPrompt = `You are an expert content editor. Given the content and the improvements to apply, identify the EXACT sections (paragraphs or sentences) that need to change.

For each improvement, identify:
1. The exact original text snippet that needs to be modified (copy it VERBATIM from the content — must be an exact match)
2. The replacement text with the improvement applied

Rules:
- CRITICAL: Select the SMALLEST possible text snippet — ideally a SINGLE SENTENCE. Never select a whole paragraph when only one sentence needs changing.
- For citation additions: the "original" should be ONLY the one sentence where the link will be inserted. The "replacement" should be that SAME sentence with the <a> tag added inline. Do NOT rewrite, rephrase, or restructure the sentence — only add the link tag around the relevant words.
- For wording improvements: the "original" should be ONLY the specific sentence(s) that need rewording. The "replacement" must keep all unchanged words identical.
- The "original" field must be an EXACT substring of the content (character-for-character match)
- If an improvement requires adding NEW content, set "original" to the single sentence AFTER which the new content should appear, and set "replacement" to that same sentence PLUS the new content appended
- When inserting citation links: ONLY link to URLs that are explicitly mentioned in the content or that you are 100% certain exist. NEVER invent or fabricate URLs. If you cannot provide a verified URL, do NOT insert a link — just make the text improvement without adding an <a> tag.
- ANCHOR TEXT LENGTH (CRITICAL): All link anchor text MUST be 2-7 words maximum. Count the words. If your anchor text is longer than 7 words, you MUST shorten it. NEVER wrap an entire sentence or clause as a link. Link ONLY the key factual phrase (e.g., "$257 in 2026" or "covers outpatient services").
- NEVER rewrite, rephrase, or restructure text that is not directly related to the improvement. If the improvement is "add a citation", the ONLY change should be adding an <a> tag — every other word must remain identical.
- NEVER add <strong>, <b>, <em>, or <i> tags to replacement text unless the original text already had them. Do NOT bold or emphasize changed text — the replacement must use the exact same formatting as the original.
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

        const userPrompt = `Apply these ${input.categoryLabel} improvements to the content:\n\n===IMPROVEMENTS TO APPLY===\n${improvementsList}\n===END IMPROVEMENTS===\n\n===FULL CONTENT (for context only — do NOT rewrite the whole thing)===\n${input.content}\n===END CONTENT===`;

        const llmResponse = await callLLM({
          messages: [
            { role: "system", content: planPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const rawResponse = ((llmResponse.choices?.[0]?.message?.content || "") as string).trim();

        let edits: Array<{ improvement: string; original: string; replacement: string }> = [];
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

        // Safety net: strip unwanted <strong>/<b> wrapping that LLMs sometimes add
        improvedContent = stripWrappingStrongTags(improvedContent);

        // Safety net: sanitize inserted hyperlinks — strip fabricated URLs and trim long anchors
        // For standalone grader (no project context), pass empty domains to only trim long anchors
        improvedContent = sanitizeInsertedLinks(improvedContent, []);

        return {
          success: true,
          content: improvedContent,
          appliedCount,
          category: input.categoryLabel,
        };
      }),
  }),

  // ─── GSC Analyzer ─────────────────────────────────────────────────────────
  gsc: router({
    /**
     * Upload and parse a GSC Excel file. Stores parsed data and computed categories in DB.
     * Accepts base64-encoded file content.
     */
    upload: publicProcedure
      .input(z.object({
        projectId: z.number(),
        fileName: z.string(),
        fileBase64: z.string(), // base64-encoded xlsx file
      }))
      .mutation(async ({ ctx, input }) => {
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
          userId: 1,
        });

        const insertId = (result as any).insertId as number;
        const [created] = await db.select().from(gscExports).where(eq(gscExports.id, insertId));
        return created;
      }),

    /**
     * List all GSC exports for a project, newest first.
     */
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        return db
          .select({
            id: gscExports.id,
            fileName: gscExports.fileName,
            dateRange: gscExports.dateRange,
            totalQueries: gscExports.totalQueries,
            totalPages: gscExports.totalPages,
            projectId: gscExports.projectId,
            createdAt: gscExports.createdAt,
          })
          .from(gscExports)
          .where(eq(gscExports.projectId, input.projectId))
          .orderBy(desc(gscExports.createdAt));
      }),

    /**
     * Get a single GSC export with full data.
     */
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [row] = await db.select().from(gscExports).where(eq(gscExports.id, input.id));
        if (!row) throw new Error("GSC export not found");
        return row;
      }),

    /**
     * Delete a GSC export.
     */
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(gscExports).where(eq(gscExports.id, input.id));
        return { success: true };
      }),

    /**
     * Get near-jump keywords with a custom position threshold.
     * Re-computes from the stored raw queries so the threshold can be changed client-side.
     */
    getNearJump: publicProcedure
      .input(z.object({
        id: z.number(),
        minPos: z.number().default(5),
        maxPos: z.number().default(30),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const [row] = await db.select({ queries: gscExports.queries }).from(gscExports).where(eq(gscExports.id, input.id));
        if (!row) throw new Error("GSC export not found");
        return computeNearJump(row.queries ?? [], input.minPos, input.maxPos);
      }),

    /**
     * Analyze a single GSC keyword — fetches the page URL, gets KE metrics,
     * and runs AI analysis to produce specific ranking improvement recommendations.
     */
    analyzeKeyword: publicProcedure
      .input(z.object({
        keyword: z.string().min(1),
        pageUrl: z.string().url("Please enter a valid URL"),
        // GSC metrics for context
        clicks: z.number(),
        impressions: z.number(),
        ctr: z.number(),
        position: z.number(),
        projectId: z.number().optional(),
        tab: z.string().optional(), // which GSC tab the keyword came from
      }))
      .mutation(async ({ input }) => {
        const { Readability } = await import("@mozilla/readability");
        const { parseHTML } = await import("linkedom");
        const { getKeywordData } = await import("./keywords-everywhere");

        // ---- Run 2 tasks in parallel: fetch page content + get KE metrics ----
        const apiKey = (await import("./_core/env")).ENV.keywordsEverywhereApiKey;

        const fetchPage = async () => {
          try {
            const resp = await fetch(input.pageUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (compatible; RankPilot/1.0; +https://rankpilot.app)",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
              },
              signal: AbortSignal.timeout(15000),
              redirect: "follow",
            });
            if (!resp.ok) return { error: `HTTP ${resp.status}`, content: "", title: "", metaDescription: "", metaKeywords: "", wordCount: 0, headings: [] as string[] };
            const contentType = resp.headers.get("content-type") || "";
            if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
              return { error: "Not an HTML page", content: "", title: "", metaDescription: "", metaKeywords: "", wordCount: 0, headings: [] as string[] };
            }
            const html = await resp.text();
            const { document } = parseHTML(html);

            // Extract meta info
            const pageTitle = document.querySelector("title")?.textContent?.trim() || "";
            const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute("content")?.trim() || "";
            const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute("content")?.trim() || "";

            // Extract headings for structure analysis
            const headings: string[] = [];
            document.querySelectorAll("h1, h2, h3").forEach((el: any) => {
              const text = el.textContent?.trim();
              const tag = el.tagName?.toLowerCase();
              if (text) headings.push(`<${tag}>${text}</${tag}>`);
            });

            // Use Readability
            const reader = new Readability(document as any, { charThreshold: 100 });
            const article = reader.parse();
            const cleanText = article?.textContent?.replace(/\s+/g, " ").trim() || "";
            const wordCount = cleanText.split(/\s+/).filter((w: string) => w.length > 0).length;

            return {
              error: null,
              content: cleanText.slice(0, 12000),
              title: article?.title || pageTitle,
              metaDescription,
              metaKeywords,
              wordCount,
              headings: headings.slice(0, 30),
            };
          } catch (e: any) {
            return { error: e.message || "Failed to fetch", content: "", title: "", metaDescription: "", metaKeywords: "", wordCount: 0, headings: [] as string[] };
          }
        };

        const fetchKE = async () => {
          if (!apiKey) return null;
          try {
            const res = await getKeywordData(apiKey, [input.keyword], { country: "us", currency: "USD", dataSource: "cli" });
            return res.data?.[0] ?? null;
          } catch {
            return null;
          }
        };

        const [pageData, keData] = await Promise.all([fetchPage(), fetchKE()]);

        // ---- Build the AI analysis prompt ----
        const tabContext = input.tab ? `This keyword was found in the "${input.tab}" category of the GSC analysis.` : "";

        const keSection = keData ? `
KEYWORDS EVERYWHERE DATA:
- Monthly Search Volume: ${keData.vol.toLocaleString()}
- CPC: $${keData.cpc.value}
- Competition: ${keData.competition} (${keData.competition < 0.33 ? "Low" : keData.competition < 0.66 ? "Medium" : "High"})
- 12-Month Trend: ${keData.trend?.map((t: any) => `${t.month}/${t.year}: ${t.value}`).join(", ") || "N/A"}
` : "";

        const pageSection = pageData.error
          ? `\nPAGE CONTENT: Could not fetch the page (${pageData.error}). Provide general recommendations based on the keyword and GSC data.\n`
          : `
PAGE ANALYSIS:
- Current Title Tag: "${pageData.title}"
- Current Meta Description: "${pageData.metaDescription}"
- Meta Keywords: "${pageData.metaKeywords || "None"}"
- Word Count: ${pageData.wordCount}
- Heading Structure:
${pageData.headings.map((h: string) => `  ${h}`).join("\n")}

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
- CTR Gap: ${((input.ctr * 100) - getExpectedCtr(input.position)).toFixed(1)}% (${input.ctr * 100 < getExpectedCtr(input.position) ? "BELOW expected — title/meta needs work" : "AT or ABOVE expected"})
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

        // ---- Call LLM ----
        const llmResult = await callLLM({
          messages: [
            { role: "system", content: "You are an expert SEO analyst. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
        }, input.projectId);

        const rawContent = llmResult?.choices?.[0]?.message?.content;
        const rawText = typeof rawContent === "string" ? rawContent : "";
        let analysis: any = null;
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
            position: input.position,
          },
          keMetrics: keData ? {
            volume: keData.vol,
            cpc: parseFloat(keData.cpc.value),
            competition: keData.competition,
            competitionLabel: keData.competition < 0.33 ? "Low" : keData.competition < 0.66 ? "Medium" : "High",
            trend: keData.trend,
          } : null,
          pageData: {
            title: pageData.title,
            metaDescription: pageData.metaDescription,
            wordCount: pageData.wordCount,
            headingCount: pageData.headings.length,
            fetchError: pageData.error,
          },
          analysis,
        };
      }),
  }),

  // ============================================================
  // CONTENT SCHEDULER
  // ============================================================
  scheduler: router({
    // ---- Scheduled Jobs CRUD ----
    listJobs: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getScheduledJobsByProject(input.projectId);
      }),

    getJob: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const job = await getScheduledJobById(input.id);
        if (!job) throw new Error("Scheduled job not found");
        return job;
      }),

    createJob: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        keywordSource: z.enum(["queue", "ai"]),
        frequency: z.enum(["daily", "weekly", "monthly"]),
        dayOfWeek: z.number().min(0).max(6).optional(),
        dayOfMonth: z.number().min(1).max(31).optional(),
        hourUtc: z.number().min(0).max(23).default(8),
        articleSettings: z.object({
          targetWordCount: z.number().optional(),
          numSections: z.number().optional(),
          numFaqs: z.number().optional(),
          contentType: z.string().optional(),
          outputFormat: z.enum(["html", "plaintext"]).optional(),
          brandVoiceId: z.number().optional(),
          icpProfileId: z.number().optional(),
          additionalInstructions: z.string().optional(),
          targetLocation: z.string().optional(),
          targetAudience: z.string().optional(),
          secondaryKeywords: z.array(z.string()).optional(),
          autoLinkCount: z.number().optional(),
          sitemapUrls: z.array(z.string()).optional(),
          tone: z.string().optional(),
          researchEnabled: z.boolean().optional(),
          autoGradeEnabled: z.boolean().optional(),
          targetGrade: z.string().optional(),
          maxGradeIterations: z.number().optional(),
          suggestKeywordsEnabled: z.boolean().optional(),
          manualLinks: z.array(z.object({ url: z.string(), anchorText: z.string() })).optional(),
        }),
        projectId: z.number(),
        keywords: z.array(z.string()).optional(), // Initial keywords for queue mode
      }))
      .mutation(async ({ ctx, input }) => {
        const userId = ctx.user?.id ?? 1;
        const nextRunAt = calculateNextRunTime(input.frequency, input.hourUtc, input.dayOfWeek, input.dayOfMonth);

        const job = await createScheduledJob({
          name: input.name,
          keywordSource: input.keywordSource,
          frequency: input.frequency,
          dayOfWeek: input.dayOfWeek ?? null,
          dayOfMonth: input.dayOfMonth ?? null,
          hourUtc: input.hourUtc,
          articleSettings: input.articleSettings,
          status: "active",
          nextRunAt,
          projectId: input.projectId,
          userId,
        });

        // If keywords provided, add them to the queue
        if (input.keywords?.length && job) {
          const items = input.keywords.map((keyword, index) => ({
            keyword,
            sortOrder: index,
            jobId: job.id,
            status: "pending" as const,
          }));
          await addKeywordsToQueue(items);
        }

        return job;
      }),

    updateJob: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        keywordSource: z.enum(["queue", "ai"]).optional(),
        frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
        dayOfWeek: z.number().min(0).max(6).nullable().optional(),
        dayOfMonth: z.number().min(1).max(31).nullable().optional(),
        hourUtc: z.number().min(0).max(23).optional(),
        articleSettings: z.object({
          targetWordCount: z.number().optional(),
          numSections: z.number().optional(),
          numFaqs: z.number().optional(),
          contentType: z.string().optional(),
          outputFormat: z.enum(["html", "plaintext"]).optional(),
          brandVoiceId: z.number().optional(),
          icpProfileId: z.number().optional(),
          additionalInstructions: z.string().optional(),
          targetLocation: z.string().optional(),
          targetAudience: z.string().optional(),
          secondaryKeywords: z.array(z.string()).optional(),
          autoLinkCount: z.number().optional(),
          sitemapUrls: z.array(z.string()).optional(),
          tone: z.string().optional(),
          researchEnabled: z.boolean().optional(),
          autoGradeEnabled: z.boolean().optional(),
          targetGrade: z.string().optional(),
          maxGradeIterations: z.number().optional(),
          suggestKeywordsEnabled: z.boolean().optional(),
          manualLinks: z.array(z.object({ url: z.string(), anchorText: z.string() })).optional(),
        }).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        const updateData: any = { ...data };

        // Recalculate next run time if frequency/timing changed
        if (data.frequency || data.hourUtc !== undefined || data.dayOfWeek !== undefined || data.dayOfMonth !== undefined) {
          const job = await getScheduledJobById(id);
          if (job) {
            updateData.nextRunAt = calculateNextRunTime(
              data.frequency ?? job.frequency,
              data.hourUtc ?? job.hourUtc,
              data.dayOfWeek !== undefined ? data.dayOfWeek : job.dayOfWeek,
              data.dayOfMonth !== undefined ? data.dayOfMonth : job.dayOfMonth,
            );
          }
        }

        return updateScheduledJob(id, updateData);
      }),

    pauseJob: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return updateScheduledJob(input.id, { status: "paused" });
      }),

    resumeJob: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const job = await getScheduledJobById(input.id);
        if (!job) throw new Error("Job not found");
        const nextRunAt = calculateNextRunTime(job.frequency, job.hourUtc, job.dayOfWeek, job.dayOfMonth);
        return updateScheduledJob(input.id, { status: "active", nextRunAt });
      }),

    deleteJob: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteScheduledJob(input.id);
        return { success: true };
      }),

    // ---- Keyword Queue ----
    listKeywords: publicProcedure
      .input(z.object({ jobId: z.number() }))
      .query(async ({ input }) => {
        return getKeywordQueueByJob(input.jobId);
      }),

    addKeywords: publicProcedure
      .input(z.object({
        jobId: z.number(),
        keywords: z.array(z.object({
          keyword: z.string().min(1),
          secondaryKeywords: z.array(z.string()).optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        // Get current max sortOrder
        const existing = await getKeywordQueueByJob(input.jobId);
        const maxOrder = existing.length > 0 ? Math.max(...existing.map(k => k.sortOrder)) : -1;

        const items = input.keywords.map((kw, index) => ({
          keyword: kw.keyword,
          secondaryKeywords: kw.secondaryKeywords ?? null,
          sortOrder: maxOrder + 1 + index,
          jobId: input.jobId,
          status: "pending" as const,
        }));

        return addKeywordsToQueue(items);
      }),

    removeKeyword: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteKeywordQueueItem(input.id);
        return { success: true };
      }),

    reorderKeywords: publicProcedure
      .input(z.object({
        jobId: z.number(),
        orderedIds: z.array(z.number()),
      }))
      .mutation(async ({ input }) => {
        for (let i = 0; i < input.orderedIds.length; i++) {
          await updateKeywordQueueItem(input.orderedIds[i], { sortOrder: i });
        }
        return getKeywordQueueByJob(input.jobId);
      }),

    // ---- Run History ----
    listRunHistory: publicProcedure
      .input(z.object({ jobId: z.number(), limit: z.number().default(50) }))
      .query(async ({ input }) => {
        return getJobRunHistory(input.jobId, input.limit);
      }),

    // ---- Run Logs (step-level) ----
    getRunLogs: publicProcedure
      .input(z.object({ runId: z.number().optional(), jobId: z.number().optional(), limit: z.number().default(200) }))
      .query(async ({ input }) => {
        if (input.runId) {
          return getSchedulerRunLogsByRunId(input.runId, input.limit);
        } else if (input.jobId) {
          return getSchedulerRunLogs(input.jobId, input.limit);
        }
        return [];
      }),

    // ---- Manual Trigger ----
    runNow: publicProcedure
      .input(z.object({ jobId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const job = await getScheduledJobById(input.jobId);
        if (!job) throw new Error("Job not found");
        if (job.isRunning) throw new Error("Job is already running");

        // Mark as running
        await updateScheduledJob(job.id, { isRunning: 1 });

        // Run asynchronously — don't block the response
        executeScheduledJob(job.id).catch(err => {
          console.error(`[Scheduler] Manual run failed for job ${job.id}:`, err);
        });

        return { success: true, message: "Job execution started" };
      }),
  }),

  // ---- Ideas Router ----
  ideas: router({
    /** Generate article ideas from a seed keyword using LLM */
    generate: publicProcedure
      .input(z.object({
        seedKeyword: z.string().min(1),
        contentTypes: z.array(z.string()).optional(),
        count: z.number().min(3).max(20).optional(),
        customInstructions: z.string().max(1000).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });

        const { seedKeyword, contentTypes, count, customInstructions } = input;
        const ideaCount = count || 9;

        // Note: negative keywords could be fetched from user settings in the future

        // Build content type instruction
        const contentTypeMap: Record<string, string> = {
          "how-to": "How-to Guides (Instructional, step-by-step tutorials)",
          "listicles": "Listicles (\"Top 10...\", \"5 Ways to...\", numbered lists)",
          "faqs": "FAQs (Question-and-answer format)",
          "informative": "Informative (General educational content)",
          "local": "Local Guides (Geo-targeted, location-specific content)",
          "service": "Service Pages (Business/offering descriptions)",
          "problem-solution": "Problem-Solution (Pain point addressing articles)",
        };

        let contentTypeInstruction = "";
        if (contentTypes && contentTypes.length > 0) {
          const selectedTypes = contentTypes.map(id => contentTypeMap[id] || id);
          contentTypeInstruction = `\n\nIMPORTANT: Focus ONLY on these specific content types:\n${selectedTypes.map((type, i) => `${i + 1}. ${type}`).join('\n')}\n\nAll generated ideas MUST match one of these content formats. Prioritize variety within these types.`;
        }

        let customInstructionsBlock = "";
        if (customInstructions && customInstructions.trim()) {
          customInstructionsBlock = `\n\nUSER INSTRUCTIONS (follow these carefully):\n${customInstructions.trim()}`;
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
            { role: "user", content: userPrompt },
          ],
        });

        const rawContent = response.choices?.[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "";
        if (!content) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "No response from AI" });

        try {
          const parsed = JSON.parse(content);
          return { ideas: parsed.ideas || [] };
        } catch {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid JSON response from AI" });
        }
      }),

    /** List saved ideas for a project */
    list: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
        return getIdeasByProject(input.projectId);
      }),

    /** Get a single idea by ID */
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
        const idea = await getIdeaById(input.id);
        if (!idea) throw new TRPCError({ code: "NOT_FOUND" });
        return idea;
      }),

    /** Save a single idea to a project */
    save: publicProcedure
      .input(z.object({
        title: z.string().min(1),
        keyword: z.string().min(1),
        searchIntent: z.string().optional(),
        wordCountRange: z.string().optional(),
        contentAngles: z.array(z.string()).optional(),
        targetAudience: z.string().optional(),
        rankingPotential: z.string().optional(),
        description: z.string().optional(),
        contentTypes: z.string().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });

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
          userId: session.userId,
        });
        return result;
      }),

    /** Save multiple ideas to a project at once */
    saveBulk: publicProcedure
      .input(z.object({
        ideas: z.array(z.object({
          title: z.string().min(1),
          keyword: z.string().min(1),
          searchIntent: z.string().optional(),
          wordCountRange: z.string().optional(),
          contentAngles: z.array(z.string()).optional(),
          targetAudience: z.string().optional(),
          rankingPotential: z.string().optional(),
          description: z.string().optional(),
        })),
        contentTypes: z.string().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });

        const rows = input.ideas.map(idea => ({
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
          userId: session.userId,
        }));
        return createIdeasBulk(rows);
      }),

    /** Update an existing idea */
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        keyword: z.string().optional(),
        searchIntent: z.string().optional(),
        wordCountRange: z.string().optional(),
        contentAngles: z.array(z.string()).optional(),
        targetAudience: z.string().optional(),
        rankingPotential: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["saved", "used", "archived"]).optional(),
        articleId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
        const { id, ...data } = input;
        await updateIdea(id, data);
        return { success: true };
      }),

    /** Delete a single idea */
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
        await deleteIdea(input.id);
        return { success: true };
      }),

    /** Delete multiple ideas */
    deleteBulk: publicProcedure
      .input(z.object({ ids: z.array(z.number()) }))
      .mutation(async ({ input, ctx }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
        await deleteIdeasBulk(input.ids);
        return { success: true };
      }),

    /** Get idea counts by status for a project */
    counts: publicProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input, ctx }) => {
        const token = getSessionToken(ctx.req);
        const session = await verifyAppSession(token);
        if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
        return getIdeasCount(input.projectId);
      }),
  }),
});

// ============================================================
// SCHEDULER HELPERS
// ============================================================

/** Calculate the next run time based on frequency and timing settings.
 * hourUtc is already converted from ET by the frontend (etHourToUtc).
 * We add a 60-second buffer so a job created right at the target minute
 * is not immediately pushed to tomorrow.
 */
function calculateNextRunTime(
  frequency: string,
  hourUtc: number,
  dayOfWeek?: number | null,
  dayOfMonth?: number | null,
): Date {
  const now = new Date();
  // Add 60s buffer: if the target time is within the next 60 seconds, treat it as still upcoming
  const nowWithBuffer = new Date(now.getTime() - 60_000);
  const next = new Date();
  next.setUTCHours(hourUtc, 0, 0, 0);

  if (frequency === "daily") {
    if (next <= nowWithBuffer) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
  } else if (frequency === "weekly") {
    const targetDay = dayOfWeek ?? 1; // Default Monday
    const currentDay = next.getUTCDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil < 0 || (daysUntil === 0 && next <= nowWithBuffer)) {
      daysUntil += 7;
    }
    next.setUTCDate(next.getUTCDate() + daysUntil);
  } else if (frequency === "monthly") {
    const targetDate = dayOfMonth ?? 1;
    next.setUTCDate(targetDate);
    if (next <= nowWithBuffer) {
      next.setUTCMonth(next.getUTCMonth() + 1);
    }
  }

  return next;
}

/**
 * Step 0: Auto-suggest secondary keywords for a given primary keyword.
 * Calls the same LLM prompt as the manual suggestKeywords procedure,
 * then randomly picks 4 related + 2 LSI + 2 long-tail.
 */
async function suggestKeywordsForScheduler(
  keyword: string,
  job: any,
): Promise<{ related: string[]; lsi: string[]; longTail: string[] }> {
  const settings = job.articleSettings ?? {};
  const prompt = `You are an expert SEO keyword researcher. Given a primary keyword, suggest related keywords that should be naturally woven into an article to improve topical coverage and semantic relevance.

Primary keyword: "${keyword}"
${settings.contentType ? `Content type: ${settings.contentType}` : ""}
${settings.targetAudience ? `Target audience: ${settings.targetAudience}` : ""}
${settings.targetLocation ? `Target location: ${settings.targetLocation}` : ""}

Return a JSON object with exactly these three arrays:
1. "secondary" — 5-8 closely related search terms
2. "lsi" — 5-8 LSI/semantic terms
3. "longTail" — 3-5 long-tail keyword variations

Rules:
- Each keyword should be lowercase
- No duplicates across the three arrays
- Do NOT include the primary keyword itself`;

  const response = await callLLM({
    messages: [
      { role: "system", content: "You are an SEO keyword research expert. Return ONLY valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "keyword_suggestions",
        strict: true,
        schema: {
          type: "object",
          properties: {
            secondary: { type: "array", items: { type: "string" } },
            lsi: { type: "array", items: { type: "string" } },
            longTail: { type: "array", items: { type: "string" } },
          },
          required: ["secondary", "lsi", "longTail"],
          additionalProperties: false,
        },
      },
    },
  }, job.projectId);

  const rawContent = response.choices[0]?.message?.content;
  if (!rawContent) return { related: [], lsi: [], longTail: [] };
  const text = typeof rawContent === "string" ? rawContent : (rawContent as any)[0]?.text ?? "";
  try {
    const parsed = extractJSON(text);
    if (!parsed) return { related: [], lsi: [], longTail: [] };
    const secondary: string[] = (parsed.secondary || []).slice(0, 8);
    const lsi: string[] = (parsed.lsi || []).slice(0, 8);
    const longTail: string[] = (parsed.longTail || []).slice(0, 5);
    const pick = (arr: string[], count: number): string[] => {
      const shuffled = [...arr].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count);
    };
    const picked = {
      related: pick(secondary, 4),
      lsi: pick(lsi, 2),
      longTail: pick(longTail, 2),
    };
    return picked;
  } catch {
    return { related: [], lsi: [], longTail: [] };
  }
}

/**
 * Step 1: Run topic research (same as manual researchTopic procedure).
 */
async function researchTopicForScheduler(
  keyword: string,
  job: any,
): Promise<any> {
  const settings = job.articleSettings ?? {};
  const project = await getProjectById(job.projectId);
  const currentYear = new Date().getFullYear();

  // Fetch reference doc if project has one
  let referenceDocSection = '';
  if (project) {
    try {
      let refDocContent: string | null = project.referenceDocContent || null;
      if (!refDocContent && project.referenceDocS3Key) {
        refDocContent = await fetchReferenceDocFromS3(project.referenceDocS3Key);
      }
      if (refDocContent && project.referenceDocName) {
        const maxChars = 40000;
        const truncated = refDocContent.length > maxChars
          ? refDocContent.substring(0, maxChars) + '\n[... document truncated for length ...]'
          : refDocContent;
        referenceDocSection = `\nREFERENCE DOCUMENT \u2014 USE AS SUPPLEMENTARY FACTUAL SOURCE ("${project.referenceDocName}")\n================================================================\nUse this document to SUPPLEMENT and GROUND your research findings.\n\nRULES:\n1. Extract specific statistics, data points, and figures from this document \u2014 these are VERIFIED facts.\n2. If the document cites sources or URLs, include them in authoritative sources.\n3. Ground key takeaways in real facts from this document.\n4. The document should SUPPLEMENT research, not replace it \u2014 still find additional external data.\n5. When a statistic from the document conflicts with training data, PREFER the document.\n\n=== REFERENCE DOCUMENT CONTENT ===\n${truncated}\n=== END REFERENCE DOCUMENT ===\n`;
        console.log(`[Scheduler Research] Reference doc injected: "${project.referenceDocName}" (${refDocContent.length} chars)`);
      }
    } catch (e) {
      console.warn('[Scheduler Research] Failed to fetch reference doc:', e);
    }
  }

  const researchPrompt = `Research the topic: "${keyword}"
${settings.contentType ? `Content type: ${settings.contentType}` : ""}
${settings.targetAudience ? `Target audience: ${settings.targetAudience}` : ""}
${settings.targetLocation ? `Target location: ${settings.targetLocation}` : ""}
${project?.domain ? `Website domain: ${project.domain}` : ""}
${referenceDocSection}
Conduct thorough research and provide findings in these categories:

1. STATISTICS & DATA - Find 5-8 relevant statistics with sources and URLs
2. AUTHORITATIVE SOURCES - 4-6 authoritative sources
3. EXPERT VOICES - 3-4 recognized experts
4. COMMON QUESTIONS - 5-8 questions people search
5. COMPETITOR CONTENT ANGLES - 3-5 common angles
6. KEY TAKEAWAYS - 3-5 essential points

IMPORTANT: The current year is ${currentYear}. Prefer ${currentYear} data.`;

  const response = await callLLM({
    messages: [
      { role: "system", content: `You are an expert research assistant. The current year is ${currentYear}. Return ONLY valid JSON.` },
      { role: "user", content: researchPrompt },
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
            keyTakeaways: { type: "array", items: { type: "string" } },
          },
          required: ["statistics", "authoritativeSources", "experts", "commonQuestions", "competitorAngles", "keyTakeaways"],
          additionalProperties: false,
        },
      },
    },
  }, job.projectId);

  const rawContent = response.choices?.[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent.trim() : "";
  if (!content) return null;
  try {
    return extractJSON(content);
  } catch {
    return null;
  }
}

/** Execute a scheduled job — runs the full research → outline → article pipeline with full parity */
export async function executeScheduledJob(jobId: number): Promise<void> {
  const job = await getScheduledJobById(jobId);
  if (!job) {
    console.error(`[Scheduler] Job ${jobId} not found`);
    return;
  }

  const startTime = Date.now();
  let keywordQueueItemId: number | undefined;
  let runEntry: any;

  try {
    // Mark job as running
    await updateScheduledJob(job.id, { isRunning: 1 });

    // Determine the keyword for this run
    let keyword: string;
    if (job.keywordSource === "queue") {
      const nextItem = await getNextPendingKeyword(job.id);
      if (!nextItem) {
        console.log(`[Scheduler] No pending keywords for job ${job.id}. Pausing.`);
        await updateScheduledJob(job.id, { status: "paused", isRunning: 0 });
        return;
      }
      keyword = nextItem.keyword;
      keywordQueueItemId = nextItem.id;
      await updateKeywordQueueItem(nextItem.id, { status: "processing" });
    } else {
      keyword = await suggestNextKeyword(job);
    }

    console.log(`[Scheduler] Starting pipeline for job ${job.id}, keyword: "${keyword}"`);

    // Create run history entry
    runEntry = await createJobRunHistoryEntry({
      jobId: job.id,
      keyword,
      status: "running",
      startedAt: new Date(),
    });

    // Helper to log steps to the run log table
    const logFn = (step: string, message: string, level: string = "info", metadata?: Record<string, any>) => {
      if (runEntry?.id) {
        addSchedulerRunLog({
          runId: runEntry.id,
          jobId: job.id,
          step,
          level,
          message,
          metadata: metadata ?? undefined,
        });
      }
    };

    logFn("keyword_selection", `Selected keyword: "${keyword}"`, "info", { keyword, source: job.keywordSource });

    const settings = job.articleSettings ?? {};

    // ── Step 0: Auto-suggest secondary keywords (if enabled) ──
    let effectiveSecondaryKeywords: string[] = [...(settings.secondaryKeywords || [])];
    if (settings.suggestKeywordsEnabled) {
      logFn("keyword_suggestion", "Running AI keyword suggestion (4 related + 2 LSI + 2 long-tail)...", "info");
      try {
        const suggested = await suggestKeywordsForScheduler(keyword, job);
        const allSuggested = [...suggested.related, ...suggested.lsi, ...suggested.longTail];
        if (allSuggested.length > 0) {
          const existing = new Set(effectiveSecondaryKeywords.map(k => k.toLowerCase()));
          for (const kw of allSuggested) {
            if (!existing.has(kw.toLowerCase())) {
              effectiveSecondaryKeywords.push(kw);
              existing.add(kw.toLowerCase());
            }
          }
          logFn(
            "keyword_suggestion",
            `AI picked ${allSuggested.length} keywords (${suggested.related.length} related, ${suggested.lsi.length} LSI, ${suggested.longTail.length} long-tail)`,
            "success",
            {
              related: suggested.related,
              lsi: suggested.lsi,
              longTail: suggested.longTail,
              all: allSuggested,
              total: effectiveSecondaryKeywords.length,
            }
          );
        }
      } catch (err: any) {
        logFn("keyword_suggestion", `Keyword suggestion failed (non-fatal): ${err.message}`, "warning");
      }
    }

    // ── Step 1: Research (if enabled) ──
    let researchFindings: any = null;
    if (settings.researchEnabled !== false) {
      logFn("research", `Researching topic: "${keyword}"...`, "info");
      try {
        researchFindings = await researchTopicForScheduler(keyword, job);
        if (researchFindings) {
          const statCount = researchFindings.statistics?.length ?? 0;
          const sourceCount = researchFindings.authoritativeSources?.length ?? 0;
          logFn("research", `Research complete: ${statCount} statistics, ${sourceCount} authoritative sources`, "success", { statCount, sourceCount });
        } else {
          logFn("research", "Research returned no results (non-fatal)", "warning");
        }
      } catch (err: any) {
        logFn("research", `Research failed (non-fatal): ${err.message}`, "warning");
      }
    }

    // ── Step 2: Generate outline ──
    logFn("outline", `Generating outline for "${keyword}"...`, "info");
    const outline = await generateOutlineForScheduler(job, keyword, effectiveSecondaryKeywords, researchFindings);
    logFn("outline", `Outline created: "${outline.title}" with ${outline.sections?.length ?? 0} sections`, "success", { outlineId: outline.id, title: outline.title });

    // ── Step 3: Generate article ──
    logFn("article", `Generating article from outline...`, "info");
    const article = await generateArticleForScheduler(job, outline, effectiveSecondaryKeywords, researchFindings, logFn);
    logFn("article", `Article generated: ${article.wordCount ?? 0} words`, "success", { articleId: article.id, wordCount: article.wordCount });

    // ── Step 4: Em-dash removal ──
    if (article?.content && article.content.includes("\u2014")) {
      const emDashCount = (article.content.match(/\u2014/g) || []).length;
      logFn("em_dash_removal", `Found ${emDashCount} em-dashes, removing...`, "info");
      const cleanedContent = article.content.replace(/\u2014/g, " - ");
      await updateArticle(article.id, { content: cleanedContent });
      logFn("em_dash_removal", `Removed ${emDashCount} em-dashes`, "success");
    }

    // ── Step 5: Complete ──
    const durationMs = Date.now() - startTime;
    await updateScheduledJob(job.id, {
      lastRunAt: new Date(),
      totalGenerated: (job.totalGenerated ?? 0) + 1,
      isRunning: 0,
      nextRunAt: calculateNextRunTime(job.frequency, job.hourUtc, job.dayOfWeek, job.dayOfMonth),
    });

    if (keywordQueueItemId) {
      await updateKeywordQueueItem(keywordQueueItemId, {
        status: "completed",
        generatedArticleId: article.id,
      });
    }

    await updateJobRunHistoryEntry(runEntry.id, {
      status: "completed",
      articleId: article.id,
      durationMs,
      completedAt: new Date(),
    });

    logFn("complete", `Pipeline complete in ${Math.round(durationMs / 1000)}s \u2014 article #${article.id}`, "success", { articleId: article.id, durationMs });
    console.log(`[Scheduler] Job ${job.id} completed. Article #${article.id} in ${Math.round(durationMs / 1000)}s`);

  } catch (error: any) {
    console.error(`[Scheduler] Job ${job.id} failed:`, error);

    if (runEntry?.id) {
      addSchedulerRunLog({
        runId: runEntry.id,
        jobId: job.id,
        step: "error",
        level: "error",
        message: error.message || "Unknown error",
        metadata: { stack: error.stack?.slice(0, 500) },
      });
    }

    if (runEntry) {
      await updateJobRunHistoryEntry(runEntry.id, {
        status: "failed",
        errorMessage: error.message || "Unknown error",
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      });
    }

    if (keywordQueueItemId) {
      await updateKeywordQueueItem(keywordQueueItemId, {
        status: "failed",
        errorMessage: error.message || "Unknown error",
      });
    }

    await updateScheduledJob(job.id, { isRunning: 0 });
  }
}

/** AI-suggested keyword: analyze project context and suggest the next best topic */
async function suggestNextKeyword(job: any): Promise<string> {
  const project = await getProjectById(job.projectId);
  const existingArticles = await getArticlesByProject(job.projectId);
  const existingKeywords = existingArticles
    .map((a: any) => a.keyword)
    .filter(Boolean)
    .join(", ");

  const prompt = `You are an SEO content strategist. Based on the following project context, suggest the single best keyword/topic for the next blog article.

Project: ${project?.name ?? "Unknown"}
Domain: ${project?.domain ?? "Not specified"}
ICP: ${project?.icpPrimaryName ?? "Not specified"} \u2014 ${project?.icpWhoTheyAre ?? ""}
Existing article keywords: ${existingKeywords || "None yet"}

Rules:
- Suggest a keyword that fills a content gap
- It should be relevant to the project's domain and ICP
- Do NOT repeat existing keywords
- Return ONLY the keyword phrase, nothing else (no quotes, no explanation)`;

  const result = await callLLM({ messages: [{ role: "user", content: prompt }] }, job.projectId);
  const rawContent = result.choices[0]?.message?.content;
  const text = typeof rawContent === "string" ? rawContent : (rawContent as any)?.[0]?.text ?? "";
  return text.trim();
}

/** Generate an outline using the scheduler job's settings \u2014 FULL PARITY with manual tool */
async function generateOutlineForScheduler(
  job: any,
  keyword: string,
  effectiveSecondaryKeywords: string[],
  researchFindings: any,
): Promise<any> {
  const settings = job.articleSettings ?? {};
  const project = await getProjectById(job.projectId);
  const allVoices = await getBrandVoicesByProject(job.projectId);
  const brandVoice = settings.brandVoiceId
    ? allVoices.find((v: any) => v.id === settings.brandVoiceId) ?? allVoices[0] ?? null
    : allVoices.find((v: any) => v.isDefault === 1) ?? allVoices[0] ?? null;

  // Build ICP section (full version matching manual tool)
  let icpSection = "";
  const formatList = (items: string[] | null | undefined, label: string): string => {
    if (!items?.length) return '';
    return `${label}:\n${items.map((item: string, i: number) => `  ${i + 1}. ${item}`).join('\n')}\n`;
  };

  if (settings.icpProfileId) {
    const icpProfile = await getICPById(settings.icpProfileId);
    if (icpProfile) {
      icpSection = `\n=== IDEAL CUSTOMER PROFILE (ICP) ===\nTARGET AUDIENCE: ${icpProfile.name}\n${icpProfile.description ? `Who They Are: ${icpProfile.description}` : ''}\n${formatList(icpProfile.painPoints, 'PAIN POINTS')}${formatList(icpProfile.goals, 'GOALS')}${formatList(icpProfile.objections, 'OBJECTIONS')}`;
    }
  } else if (project?.icpPrimaryName) {
    icpSection = `\n=== IDEAL CUSTOMER PROFILE (ICP) ===\nTARGET AUDIENCE: ${project.icpPrimaryName}\n${project.icpWhoTheyAre ? `Who They Are: ${project.icpWhoTheyAre}` : ''}\n${formatList(project.icpPains as string[] | null, 'PAIN POINTS')}${formatList(project.icpGoals as string[] | null, 'GOALS')}${formatList(project.icpObjections as string[] | null, 'OBJECTIONS')}${formatList(project.icpDecisionTriggers as string[] | null, 'DECISION TRIGGERS')}${formatList(project.icpTrustSignals as string[] | null, 'TRUST SIGNALS')}`;
  }

  // Build brand voice section
  let voiceSection = "";
  if (brandVoice) {
    voiceSection = `\n=== BRAND VOICE ===\nVoice: ${brandVoice.name}\nTone: ${brandVoice.toneTraits || 'Professional'}\nPerspective: ${brandVoice.perspective}\nSentence Style: ${brandVoice.sentenceStyle}\n${brandVoice.avoidList ? `Avoid: ${brandVoice.avoidList}` : ''}\n${brandVoice.writingStyleSample ? `Style Sample: ${brandVoice.writingStyleSample}` : ''}`;
  }

  // Build research section
  let researchSection = "";
  if (researchFindings) {
    researchSection = buildResearchSection(researchFindings);
  }

  // Build reference document section for outline (always enabled for scheduler if project has one)
  let outlineReferenceDocSection = '';
  if (project) {
    let refDocContent: string | null = project.referenceDocContent || null;
    if (!refDocContent && project.referenceDocS3Key) {
      refDocContent = await fetchReferenceDocFromS3(project.referenceDocS3Key);
    }
    if (refDocContent && project.referenceDocName) {
      const maxChars = 40000;
      const truncated = refDocContent.length > maxChars
        ? refDocContent.substring(0, maxChars) + '\n[... document truncated for length ...]'
        : refDocContent;
      outlineReferenceDocSection = `\nREFERENCE DOCUMENT \u2014 USE TO GROUND THE OUTLINE ("${project.referenceDocName}")\n================================================================\nUse this document to inform the outline structure and key points.\n\nRULES:\n1. Create dedicated sections or key points for specific subtopics, rules, costs, or procedures from this document.\n2. Key points should reference specific facts rather than generic talking points.\n3. Mirror the document's natural structure where appropriate.\n4. FAQ questions should address real questions the document answers.\n5. Create an SEO-optimized outline that USES the document as a factual foundation.\n\n=== REFERENCE DOCUMENT CONTENT ===\n${truncated}\n=== END REFERENCE DOCUMENT ===\n`;
      console.log(`[Scheduler OutlineGen] Reference doc injected: "${project.referenceDocName}" (${refDocContent.length} chars)`);
    }
  }

  const numSections = settings.numSections ?? 8;
  const numFaqs = settings.numFaqs ?? 5;
  const targetWordCount = settings.targetWordCount ?? 2000;

  const toneInstruction = settings.tone ? `- Tone: ${settings.tone}` : '';
  const locationInstruction = settings.targetLocation ? `- Target location: ${settings.targetLocation} \u2014 tailor the outline to be relevant for this geographic area` : '';
  const audienceInstruction = settings.targetAudience ? `- Target audience: ${settings.targetAudience} \u2014 structure the outline to address this audience's specific needs` : '';
  const secondaryKwInstruction = effectiveSecondaryKeywords.length ? `- Secondary keywords to weave in: ${effectiveSecondaryKeywords.join(', ')}` : '';

  const systemPrompt = `You are an expert SEO content strategist. Generate a detailed article outline for the keyword "${keyword}".

Requirements:
- Create ${numSections} main H2 sections
- Include a FAQ section with ${numFaqs} questions
- Target ${targetWordCount} words
- Each section should have 2-4 bullet points describing what to cover
${settings.contentType ? `- Content type: ${settings.contentType}` : ''}
${toneInstruction}
${locationInstruction}
${audienceInstruction}
${secondaryKwInstruction}
${settings.additionalInstructions ? `- Additional instructions: ${settings.additionalInstructions}` : ''}
${icpSection}
${voiceSection}
${researchSection}
${outlineReferenceDocSection}

Return a JSON object with this structure:
{
  "title": "Article title",
  "sections": [
    {
      "id": "s1",
      "heading": "Section heading",
      "type": "h2",
      "points": ["Point 1", "Point 2"],
      "subSections": [
        { "id": "s1-1", "heading": "Sub heading", "type": "h3", "points": ["Sub point"] }
      ]
    }
  ]
}`;

  const outlineResult = await callLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Generate a comprehensive outline for: ${keyword}` },
    ],
    response_format: { type: "json_object" },
  }, job.projectId);

  const rawOutlineContent = outlineResult.choices[0]?.message?.content;
  const outlineText = typeof rawOutlineContent === "string" ? rawOutlineContent : (rawOutlineContent as any)?.[0]?.text ?? "";

  const parsed = extractJSON(outlineText);
  if (!parsed) {
    throw new Error("Failed to parse outline from LLM response");
  }

  // Save outline to DB
  const outline = await createOutline({
    title: parsed.title || `${keyword} - Generated Outline`,
    keyword,
    sections: parsed.sections || [],
    settings: {
      contentType: settings.contentType,
      targetWordCount,
      numSections,
      numFaqs,
      additionalInstructions: settings.additionalInstructions,
      targetLocation: settings.targetLocation,
      targetAudience: settings.targetAudience,
      outputFormat: settings.outputFormat,
      secondaryKeywords: effectiveSecondaryKeywords,
      autoLinkCount: settings.autoLinkCount,
      sitemapUrls: settings.sitemapUrls,
      manualLinks: settings.manualLinks,
    },
    status: "approved",
    projectId: job.projectId,
    userId: job.userId,
  });

  return outline;
}

/** Generate an article from an outline \u2014 FULL PARITY with manual tool */
async function generateArticleForScheduler(
  job: any,
  outline: any,
  effectiveSecondaryKeywords: string[],
  researchFindings: any,
  logFn?: (step: string, message: string, level?: string, metadata?: Record<string, any>) => void,
): Promise<any> {
  const settings = job.articleSettings ?? {};
  const project = await getProjectById(job.projectId);
  const allVoices = await getBrandVoicesByProject(job.projectId);
  const brandVoice = settings.brandVoiceId
    ? allVoices.find((v: any) => v.id === settings.brandVoiceId) ?? allVoices[0] ?? null
    : allVoices.find((v: any) => v.isDefault === 1) ?? allVoices[0] ?? null;

  // ── Build the outline text for the prompt (with AI instructions & template types) ──
  const outlineText = (outline.sections || []).map((s: any) => {
    let text = `## ${s.heading}\n`;
    if (s.targetWordCount) {
      text += `[TARGET: ~${s.targetWordCount} words for this section]\n`;
    }
    if (s.points?.length) text += s.points.map((p: string) => `- ${p}`).join('\n') + '\n';
    if (s.aiInstructions?.trim()) {
      text += `[AI INSTRUCTIONS FOR THIS SECTION: ${s.aiInstructions.trim()}]\n`;
    }
    if (s.templateType) {
      if (s.templateType === "coverage-card") {
        text += `[TEMPLATE TYPE: coverage-card] \u2014 Output the <h2> heading as normal. Then write a 1-2 sentence summary, <h3>What It Covers</h3> with a <ul>, <h3>What It Doesn't Cover</h3> with a <ul>, and a <p> starting with "Cost:". No special formatting.\n`;
      } else {
        text += `[TEMPLATE TYPE: ${s.templateType}] \u2014 Output the heading as normal, then write ONLY clean body content (1-3 concise paragraphs). No special formatting.\n`;
      }
    }
    if (s.backgroundColor && !s.templateType) {
      text += `[BACKGROUND COLOR: Wrap this section in a <div> with style="background-color: ${s.backgroundColor}; border-radius: 12px; padding: 24px 28px; margin: 16px 0;"]\n`;
    }
    if (s.subSections?.length) {
      for (const sub of s.subSections) {
        text += `### ${sub.heading}\n`;
        if (sub.points?.length) text += sub.points.map((p: string) => `- ${p}`).join('\n') + '\n';
        if (sub.aiInstructions?.trim()) {
          text += `[AI INSTRUCTIONS FOR THIS SUB-SECTION: ${sub.aiInstructions.trim()}]\n`;
        }
        if (sub.templateType) {
          text += `[TEMPLATE TYPE: ${sub.templateType}] \u2014 Output the heading as normal, then write ONLY clean body content.\n`;
        }
        if (sub.backgroundColor && !sub.templateType) {
          text += `[BACKGROUND COLOR: Wrap this sub-section in a <div> with style="background-color: ${sub.backgroundColor}; border-radius: 12px; padding: 24px 28px; margin: 16px 0;"]\n`;
        }
      }
    }
    return text;
  }).join('\n');

  // ── Build full ICP section (matching manual tool) ──
  let icpSection = "";
  const formatListArt = (items: string[] | null | undefined, prefix: string): string => {
    if (!items?.length) return '';
    return `${prefix}:\n${items.map((item: string, i: number) => `${i + 1}. ${item}`).join('\n')}`;
  };

  let icpName = "";
  let icpDescription = "";
  let icpPains: string[] = [];
  let icpGoals: string[] = [];
  let icpObjections: string[] = [];
  let icpTriggers: string[] = [];
  let icpTrust: string[] = [];

  if (settings.icpProfileId) {
    const icpProfile = await getICPById(settings.icpProfileId);
    if (icpProfile) {
      icpName = icpProfile.name;
      icpDescription = icpProfile.description || "";
      icpPains = icpProfile.painPoints || [];
      icpGoals = icpProfile.goals || [];
      icpObjections = icpProfile.objections || [];
    }
  } else if (project?.icpPrimaryName) {
    icpName = project.icpPrimaryName;
    icpDescription = project.icpWhoTheyAre || "";
    icpPains = (project.icpPains as string[] | null) || [];
    icpGoals = (project.icpGoals as string[] | null) || [];
    icpObjections = (project.icpObjections as string[] | null) || [];
    icpTriggers = (project.icpDecisionTriggers as string[] | null) || [];
    icpTrust = (project.icpTrustSignals as string[] | null) || [];
  }

  if (icpName) {
    const painsSection = formatListArt(icpPains, 'PAIN POINTS');
    const goalsSection = formatListArt(icpGoals, 'GOALS');
    const objectionsSection = formatListArt(icpObjections, 'COMMON OBJECTIONS');
    const triggersSection = formatListArt(icpTriggers, 'DECISION TRIGGERS');
    const trustSection = formatListArt(icpTrust, 'TRUST SIGNALS');

    icpSection = `
IDEAL CUSTOMER PROFILE (ICP) - CONTENT TARGETING LAYER
======================================================
TARGET AUDIENCE:
- ICP Name: ${icpName}
${icpDescription ? `- Who They Are: ${icpDescription}` : ''}

${painsSection}

${goalsSection}

${objectionsSection}

${triggersSection}

${trustSection}

=== ICP ENFORCEMENT RULES ===
**RULE 1 - INTRO:** Vary the opening approach each time. Do NOT start with "If you are..." or any formulaic audience-addressing pattern.
**RULE 2 - HEADINGS:** At least 30% of H2/H3 headings must reflect ICP pain points or intent language.
**RULE 3 - FAQs:** At least 60% of FAQ questions must be derived from the ICP's objections and decision triggers.
**RULE 4 - EXAMPLES:** Include at least 2 examples consistent with "${icpDescription || icpName}".
**RULE 5 - TRUST:** Naturally incorporate at least 2 trust signals.
**RULE 6 - COMPLIANCE:** Avoid guarantees, exaggerated claims, or fear-based messaging.
`;
  }

  // ── Build full Brand Voice section (matching manual tool) ──
  let brandVoiceSection = "";
  if (brandVoice) {
    let primaryTones: string[] = [];
    let supportingTones: string[] = [];
    const toneTraits = brandVoice.toneTraits || "";
    if (toneTraits.includes("PRIMARY:") || toneTraits.includes("SUPPORTING:")) {
      const parts = toneTraits.split("|");
      for (const part of parts) {
        if (part.startsWith("PRIMARY:")) primaryTones = part.replace("PRIMARY:", "").split(",").filter(Boolean);
        else if (part.startsWith("SUPPORTING:")) supportingTones = part.replace("SUPPORTING:", "").split(",").filter(Boolean);
      }
    } else {
      primaryTones = toneTraits.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    const AVOID_LABELS: Record<string, string> = {
      jargon: "Overly technical jargon", salesy: "Sales-heavy language",
      fear: "Fear-based messaging", exaggerated: "Exaggerated claims",
      cliches: "Industry clich\u00e9s", passive: "Passive voice",
      buzzwords: "Buzzwords", rhetorical: "Rhetorical questions",
      unverified: "Unverified statistics", competitor: "Competitor comparisons",
    };
    let avoidItems: string[] = [];
    const avoidList = brandVoice.avoidList || "";
    if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
      const parts = avoidList.split("|");
      for (const part of parts) {
        if (part.startsWith("PRESETS:")) {
          const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
          avoidItems.push(...presetIds.map((id: string) => AVOID_LABELS[id] || id));
        } else if (part.startsWith("CUSTOM:")) {
          const custom = part.replace("CUSTOM:", "").trim();
          if (custom) avoidItems.push(...custom.split(",").map((s: string) => s.trim()).filter(Boolean));
        }
      }
    } else if (avoidList) {
      avoidItems = avoidList.split(",").map((s: string) => s.trim()).filter(Boolean);
    }

    const SENTENCE_STYLES: Record<string, { label: string; rules: string }> = {
      short: {
        label: "Short and Direct",
        rules: `- Keep most sentences under 12 words.\n- Paragraphs MUST be 1-3 sentences maximum.\n- Eliminate filler words and unnecessary clauses.`,
      },
      mixed: {
        label: "Mixed (Varied and Natural Rhythm)",
        rules: `- Vary sentence length: short for emphasis, medium for clarity, longer for explanation.\n- Paragraphs MUST be 2-5 sentences maximum.\n- Create natural rhythm by alternating short and medium sentences.`,
      },
      detailed: {
        label: "Detailed and Explanatory",
        rules: `- Use longer sentences with expanded context where needed.\n- Paragraphs can be 3-6 sentences, but NEVER exceed 6.\n- Include transitional phrases to connect ideas smoothly.`,
      },
    };
    const sentenceStyle = SENTENCE_STYLES[brandVoice.sentenceStyle || "mixed"] || SENTENCE_STYLES.mixed;

    brandVoiceSection = `BRAND VOICE GUIDELINES (FOLLOW THESE CAREFULLY):
Voice Name: ${brandVoice.name}

PRIMARY TONE: ${primaryTones.length > 0 ? primaryTones.join(", ") : "Professional"}
${supportingTones.length > 0 ? `SUPPORTING TONE: ${supportingTones.join(", ")}` : ''}

PERSPECTIVE: ${brandVoice.perspective === "first" ? "First person (use 'we', 'our', 'us')" : brandVoice.perspective === "second" ? "Second person (address reader as 'you', 'your')" : "Third person (neutral/objective perspective)"}

SENTENCE STYLE: ${sentenceStyle.label}

=== PARAGRAPH & SENTENCE STRUCTURE RULES (MANDATORY) ===
${sentenceStyle.rules}
=== END STRUCTURE RULES ===

${avoidItems.length > 0 ? `THINGS TO STRICTLY AVOID:\n${avoidItems.map((item: string) => `- DO NOT use ${item}`).join("\n")}\n` : ''}
${brandVoice.writingStyleSample ? `
Writing Style Example (learn the STYLE, not the content):
"""
${brandVoice.writingStyleSample}
"""
CRITICAL: Do NOT reuse any specific phrases, sentences, statistics, or openings from this sample.` : ''}`;
  }

  // ── Build CTA context ──
  const ctaTemplates_list = await getCTAsByProject(job.projectId);
  let ctaContext = "";
  if (ctaTemplates_list.length > 0) {
    const defaultCTA = ctaTemplates_list.find((c: any) => c.isDefault === 1) ?? ctaTemplates_list[0];
    ctaContext = `\n\nCALL TO ACTION:\nInsert the following CTA naturally in the article (placement: ${defaultCTA.placement}):\n"${defaultCTA.content}"\n${defaultCTA.buttonText ? `Button text: "${defaultCTA.buttonText}"` : ""}\n${defaultCTA.url ? `Link URL: ${defaultCTA.url}` : ""}`;
  }

  // ── Build secondary keywords instructions ──
  let secondaryKeywordsInstructions = "";
  if (effectiveSecondaryKeywords.length > 0) {
    secondaryKeywordsInstructions = `\n\nSECONDARY KEYWORDS & LSI TERMS (MUST naturally incorporate):\n${effectiveSecondaryKeywords.map(k => `- "${k}"`).join("\n")}`;
  }

  // ── Build internal linking instructions ──
  let linkingInstructions = "";
  const effectiveManualLinks = settings.manualLinks || [];
  const effectiveAutoLinkCount = settings.autoLinkCount ?? 5;

  if (effectiveManualLinks.length > 0) {
    linkingInstructions += `\n\nMANUAL INTERNAL LINKS (MUST include all):\n${effectiveManualLinks.map((l: any, i: number) => `${i + 1}. Link to "${l.url}"${l.anchorText ? ` using anchor text "${l.anchorText}"` : ""}`).join("\n")}\nUse <a href="URL">anchor text</a> format. Anchor text must be 2-7 words.`;
  }

  // Resolve sitemap URLs to actual page URLs
  if (settings.sitemapUrls?.length) {
    const projectSitemaps = await getSitemapsByProject(job.projectId);
    const resolvedPageUrls: string[] = [];
    for (const sitemapXmlUrl of settings.sitemapUrls) {
      const matchingSitemap = projectSitemaps.find((s: any) => s.url === sitemapXmlUrl);
      if (matchingSitemap?.parsedUrls && Array.isArray(matchingSitemap.parsedUrls)) {
        for (const entry of matchingSitemap.parsedUrls) {
          if (typeof entry === 'string') {
            resolvedPageUrls.push(entry);
          } else if (entry && typeof entry === 'object' && 'url' in entry) {
            const title = (entry as any).title;
            resolvedPageUrls.push(title ? `${(entry as any).url} (${title})` : (entry as any).url);
          }
        }
      }
    }
    if (resolvedPageUrls.length > 0) {
      const minInternal = project?.minInternalLinks ?? 3;
      const effectiveInternalCount = Math.min(effectiveAutoLinkCount, resolvedPageUrls.length);
      const guaranteedInternal = Math.min(minInternal, resolvedPageUrls.length);
      linkingInstructions += `\n\nAUTOMATIC INTERNAL LINKING (MANDATORY):\nYou MUST insert a MINIMUM of ${guaranteedInternal} internal link${guaranteedInternal !== 1 ? 's' : ''} from the SITE PAGES list below. Internal links are REQUIRED — they take priority over external citation links when both options exist for the same claim.\n\nTarget total internal links: ${effectiveInternalCount} (minimum guaranteed: ${guaranteedInternal}).\nChoose URLs that are contextually relevant to the article topic. Use <a href="URL">anchor text</a> format.\nIMPORTANT: Anchor text must be 2-7 words — a short key phrase, NOT a full sentence.\nCRITICAL: Only use exact URLs from the list below. NEVER fabricate or invent URLs.\n\nSITE PAGES (internal links MUST come from this list ONLY):\n${resolvedPageUrls.map(u => `  - ${u}`).join("\n")}`;
    }
  }

  // ── Build research context for article prompt ──
  let researchContext = "";
  if (researchFindings) {
    researchContext = buildResearchSection(researchFindings);
  }

  const outputFormat = settings.outputFormat ?? "html";
  const targetWordCount = settings.targetWordCount ?? 2000;

  // Build reference document section (always enabled for scheduler if project has one)
  let referenceDocSection = "";
  if (project) {
    // Primary source: DB content
    let refDocContent: string | null = project.referenceDocContent || null;
    // Fallback: S3 backup
    if (!refDocContent && project.referenceDocS3Key) {
      refDocContent = await fetchReferenceDocFromS3(project.referenceDocS3Key);
    }
    if (refDocContent && project.referenceDocName) {
      const maxChars = 80000;
      const truncated = refDocContent.length > maxChars
        ? refDocContent.substring(0, maxChars) + "\n[... document truncated for length ...]"
        : refDocContent;
      referenceDocSection = `\nREFERENCE DOCUMENT \u2014 FACTUAL SOURCE ("${project.referenceDocName}")\n================================================================\nThe following reference document contains verified facts, figures, rules, and details about the topic.\nYou MUST use this document as your PRIMARY factual source when writing the article.\n\nRULES FOR USING THE REFERENCE DOCUMENT:\n1. When the reference document provides specific numbers, dates, eligibility rules, costs, or procedures \u2014 use them EXACTLY as stated. Do NOT invent alternative figures.\n2. When the reference document covers a topic that overlaps with a section in the outline, ground that section's content in the reference material.\n3. Do NOT copy the reference document verbatim \u2014 synthesize and rewrite the information in your own words while preserving factual accuracy.\n4. If the reference document contradicts your training data, ALWAYS defer to the reference document.\n5. You may add supplementary information beyond what the reference document covers, but NEVER contradict it.\n6. Do NOT mention or cite "the reference document" in the article text.\n\n=== REFERENCE DOCUMENT CONTENT ===\n${truncated}\n=== END REFERENCE DOCUMENT ===\n`;
      logFn?.("reference-doc", `Reference doc injected: "${project.referenceDocName}" (${refDocContent.length} chars)`, "info");
    }
  }

  const formatInstructions = outputFormat === "plaintext"
    ? `- Output as PLAIN TEXT with markdown-style headings. Do NOT use HTML tags.`
    : `- Use proper HTML formatting: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, <table>, <thead>, <tbody>, <tr>, <th>, <td> tags\n- For links use <a href="URL">anchor text</a> format`;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.toLocaleString('en-US', { month: 'long' });

  const maxAllowedLinks = effectiveAutoLinkCount + effectiveManualLinks.length;

  const systemPrompt = `You are an expert SEO content writer. Write a comprehensive, well-structured article based on the provided outline.

IMPORTANT \u2014 CURRENT DATE CONTEXT: Today's date is ${currentMonth} ${currentYear}. You MUST treat ${currentYear} as the current year.

Guidelines:
- Write in ${settings.tone ?? "a professional and informative"} tone
- Target approximately ${targetWordCount} words total
- PER-SECTION WORD TARGETS: Each section in the outline may include a [TARGET: ~N words] directive. You MUST respect these per-section word counts. Do NOT significantly exceed any section's target — if a section says ~200 words, write 180-220 words for it, not 400. The per-section targets are designed to keep the total article within the overall word count.
${formatInstructions}
- Include a compelling introduction that hooks the reader
- CRITICAL - INTRO VARIETY: Every article must open differently. NEVER start with "If you are...", "Whether you are...", "As a...". Rotate opening strategies: surprising facts, bold claims, mini-stories, provocative questions, or recent trends.
- Each section should flow naturally into the next
- Include relevant statistics and examples \u2014 but NEVER reuse generic or overused statistics. Each article must cite DIFFERENT data points.
- CONTENT UNIQUENESS: Every article must feel distinct. Avoid formulaic phrases and boilerplate sentences.
- End with a strong conclusion and call to action
- Optimize for the target keyword: "${outline.keyword ?? outline.title}"
- Make the content comprehensive, authoritative, and reader-friendly
- Include bullet points and numbered lists where appropriate
- CRITICAL: Follow the PARAGRAPH & SENTENCE STRUCTURE RULES from the Brand Voice section exactly.
- FAQ ANSWER RULES (CRITICAL): When writing FAQ sections, each answer MUST be 2-4 sentences maximum (40-80 words). Lead directly with the answer — no preamble, no "Short Answer:" prefix, no "Great question" openers. Give one supporting detail if needed, then stop. FAQ answers must be scannable and conversational, NOT essay-length explanations.
- PER-SECTION AI INSTRUCTIONS: Follow [AI INSTRUCTIONS FOR THIS SECTION: ...] directives precisely.
- TEMPLATE SECTIONS: Follow [TEMPLATE TYPE: ...] directives. Output the heading as normal, then write clean body content only.
- BACKGROUND COLOR SECTIONS: Follow [BACKGROUND COLOR: ...] directives. Wrap section content in a styled <div>.
- TABLE FORMAT RULES: Use proper HTML <table> tags. NEVER use markdown table syntax.
- ANCHOR TEXT LENGTH RULES: Anchor text MUST be 2-7 words. NEVER wrap an entire sentence as a link.
- TOTAL LINK LIMIT: NO MORE THAN ${maxAllowedLinks} links total.
- CITATION LINK RULES: NEVER use generic anchor text like "Learn more at" or "Click here".
- URL INTEGRITY RULE: ENTIRE href value MUST be on a single line with NO line breaks.
${settings.targetLocation ? `- Target location: ${settings.targetLocation} \u2014 include location-specific information` : ""}
${settings.targetAudience ? `- Target audience: ${settings.targetAudience} \u2014 tailor language and depth to this audience` : ""}
${settings.additionalInstructions ? `- Additional instructions: ${settings.additionalInstructions}` : ""}
${project?.bannedPhrases?.length ? `
=== BANNED PHRASES (ABSOLUTE HARD CONSTRAINT) ===
The following phrases MUST NEVER appear in the generated content:
${(project.bannedPhrases as string[]).map((p: string) => `- "${p}"`).join("\n")}
=== END BANNED PHRASES ===` : ''}

${brandVoiceSection}

${icpSection}
${ctaContext}
${secondaryKeywordsInstructions}
${linkingInstructions}
${referenceDocSection}
${researchContext}

OUTLINE:
${outlineText}

Return ONLY the ${outputFormat === "plaintext" ? "plain text" : "HTML"} content of the article body${outputFormat === "html" ? " (no <html>, <head>, or <body> tags)" : ""}. Start with the first ${outputFormat === "plaintext" ? "## heading" : "<h2> section"}.`;

  const articleResult = await callLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Write the full article for: ${outline.keyword}` },
    ],
  }, job.projectId);

  const rawArticleContent = articleResult.choices[0]?.message?.content;
  let content = stripMarkdownFences(typeof rawArticleContent === "string" ? rawArticleContent : (rawArticleContent as any)?.[0]?.text ?? "");

  // Strip any leading H1 tag or plain-text title line
  content = content.replace(/^\s*<h1[^>]*>[\s\S]*?<\/h1>\s*/i, '');
  const titlePattern = new RegExp(`^\\s*#{0,2}\\s*${outline.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n?`, 'i');
  content = content.replace(titlePattern, '');
  const titleLinePattern = new RegExp(`^\\s*${outline.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\n?`, 'i');
  content = content.replace(titleLinePattern, '').trimStart();

  // ── Post-processing pipeline (matching manual tool) ──
  if (outputFormat === "html") {
    const maxSentences = brandVoice?.sentenceStyle === "short" ? 3 : brandVoice?.sentenceStyle === "detailed" ? 6 : 5;
    content = fixBrokenAnchors(content);
    content = wrapBareTextInPTags(content);
    content = splitLongParagraphs(content, maxSentences, outputFormat);
    content = applyBackgroundColors(content, outline.sections as any[]);
    content = applyTemplateStyles(content, outline.sections as any[]);
  }

  // Post-generation scan: remove any banned phrases that slipped through
  if (project?.bannedPhrases?.length) {
    for (const phrase of project.bannedPhrases as string[]) {
      if (phrase.trim()) {
        const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedPhrase, 'gi');
        content = content.replace(regex, '');
      }
    }
    content = content.replace(/<p>\s*<\/p>/g, '').replace(/\s{3,}/g, ' ').trim();
  }

  // Post-processing: enforce link count cap
  const linkMatches = content.match(/<a\s[^>]*>/gi);
  const actualLinkCount = linkMatches ? linkMatches.length : 0;
  if (actualLinkCount > maxAllowedLinks) {
    let linksKept = 0;
    content = content.replace(/<a\s([^>]*)>([\s\S]*?)<\/a>/gi, (match: string, _attrs: string, innerText: string) => {
      if (linksKept < maxAllowedLinks) {
        linksKept++;
        return match;
      }
      return innerText;
    });
  }

  // Post-processing: strip em dashes and "Short Answer:" prefix from generated content
  content = stripEmDashes(content);
  content = stripShortAnswerPrefix(content);
  content = stripTargetBlank(content);

  // Count words
  const plainText = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = plainText.split(/\s+/).length;

  // Generate meta title and description
  const metaResponse = await callLLM({
    messages: [
      { role: "system", content: "Generate an SEO meta title (max 60 chars) and meta description (max 155 chars) for the given article. Return JSON with 'metaTitle' and 'metaDescription' fields only." },
      { role: "user", content: `Article title: ${outline.title}\nKeyword: ${outline.keyword ?? outline.title}\nFirst 500 chars: ${content.substring(0, 500)}` },
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
            metaDescription: { type: "string" },
          },
          required: ["metaTitle", "metaDescription"],
          additionalProperties: false,
        },
      },
    },
  }, job.projectId);

  const rawMetaContent = metaResponse.choices[0]?.message?.content;
  const metaContent = typeof rawMetaContent === "string" ? rawMetaContent : (rawMetaContent as any)?.[0]?.text ?? null;
  let metaTitle = outline.title;
  let metaDescription = "";
  if (metaContent) {
    const meta = extractJSON(metaContent);
    if (meta) {
      metaTitle = meta.metaTitle || outline.title;
      metaDescription = meta.metaDescription || "";
    }
  }

  // Generate slug
  const slug = outline.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  // Save article to DB
  const article = await createArticle({
    title: outline.title,
    content,
    excerpt: content.replace(/<[^>]*>/g, "").substring(0, 200),
    keyword: outline.keyword,
    metaTitle,
    metaDescription,
    slug,
    wordCount,
    status: "draft",
    contentType: settings.contentType,
    outlineId: outline.id,
    projectId: job.projectId,
    userId: job.userId,
  });

  // Mark outline as complete
  await updateOutline(outline.id, { status: "complete" });

  // Auto-grade loop for scheduler
  if (settings.autoGradeEnabled && settings.targetGrade && article?.id) {
    const maxIter = settings.maxGradeIterations ?? 2;
    console.log(`[Scheduler] Auto-grade enabled. Target: ${settings.targetGrade}, Max iterations: ${maxIter}`);
    try {
      const { finalGrade, iterationsRun } = await runAutoGradeLoop({
        articleId: article.id,
        projectId: job.projectId,
        targetGrade: settings.targetGrade,
        maxIterations: maxIter,
        logFn,
      });
      console.log(`[Scheduler] Auto-grade complete. Final grade: ${finalGrade} after ${iterationsRun} iteration(s).`);
      const updatedArticle = await getArticleById(article.id);
      return updatedArticle ?? article;
    } catch (err) {
      console.error("[Scheduler] Auto-grade loop failed (non-fatal):", err);
    }
  }

  return article;
}

// ============================================================
// AUTO-GRADE LOOP HELPER
// ============================================================

/** Grade band ordering — higher index = better grade */
const GRADE_ORDER = ["F", "D", "C", "C+", "B-", "B", "B+", "A-", "A"];

function gradeIndex(grade: string): number {
  return GRADE_ORDER.indexOf(grade);
}

function gradeMetOrExceeds(actual: string, target: string): boolean {
  const ai = gradeIndex(actual);
  const ti = gradeIndex(target);
  if (ai === -1 || ti === -1) return false;
  return ai >= ti;
}

/**
 * After an article is saved, optionally run grade-and-improve iterations.
 * Grades the article, checks if it meets the targetGrade, and if not applies
 * all improvements from all categories, then repeats up to maxIterations times.
 * Returns the final grade band achieved.
 */
async function runAutoGradeLoop({
  articleId,
  projectId,
  targetGrade,
  maxIterations,
  logFn,
}: {
  articleId: number;
  projectId: number;
  targetGrade: string;
  maxIterations: number;
  logFn?: (step: string, message: string, level?: string, metadata?: Record<string, any>) => void;
}): Promise<{ finalGrade: string; iterationsRun: number }> {
  const db = await getDb();
  if (!db) return { finalGrade: "?", iterationsRun: 0 };

  // Fetch project context for grading
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  const allVoices = project ? await db.select().from(brandVoices).where(eq(brandVoices.projectId, project.id)) : [];
  const defaultBrandVoice = allVoices.find((bv: any) => bv.isDefault === 1) || allVoices[0] || null;
  const projectCitations = project ? await db.select().from(citationSources).where(eq(citationSources.projectId, project.id)) : [];

  // Build citation sources section for grading prompt
  let citationSourcesSection = "";
  if (projectCitations.length > 0) {
    const sourcesList = projectCitations.map((c: any, i: number) => {
      let entry = `  ${i + 1}. ${c.name} — ${c.url}`;
      if (c.description) entry += ` (${c.description})`;
      return entry;
    }).join("\n");
    citationSourcesSection = `\nAVAILABLE CITATION SOURCES:\n${sourcesList}`;
  }

  // Build brand voice section for grading
  let brandVoiceSection = "";
  if (defaultBrandVoice) {
    brandVoiceSection = `\nBRAND VOICE REFERENCE:\n- Voice Name: ${defaultBrandVoice.name}\n- Tone Traits: ${defaultBrandVoice.toneTraits}\n- Perspective: ${defaultBrandVoice.perspective}`;
  }

  const hasICP = !!(project?.icpPrimaryName && project?.icpPains);
  const totalPoints = 100 + (defaultBrandVoice ? 10 : 0) + (hasICP ? 10 : 0);

  let iterationsRun = 0;
  let finalGrade = "?";

  for (let i = 0; i < maxIterations; i++) {
    const [article] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1);
    if (!article) break;

    // --- Grade the article ---
    const gradeSystemPrompt = `You are the GEO Content Grader. Grade the article and return ONLY valid JSON.\n${citationSourcesSection}\n${brandVoiceSection}\n\nWEIGHTING: E-E-A-T Trust: 30pts, Accuracy: 25pts, AIO Readiness: 20pts, Readability: 10pts, SEO/Entity: 10pts, Risk Hygiene: 5pts${defaultBrandVoice ? ", Brand Voice: 10pts" : ""}${hasICP ? ", ICP Alignment: 10pts" : ""}.\n\nFor each category provide: score, maxScore, weight, label, analysis (2 sentences), improvements (3 specific actionable items).\nAlso provide: totalScore, gradeBand (A|A-|B+|B|B-|C+|C|D|F), keyStrengths (3 items), keyWeaknesses (2-3 items), penalties (array), prioritizedActions (top 3).\n\nRespond ONLY with valid JSON — no markdown fences.`;

    const gradeResponse = await callLLM({
      messages: [
        { role: "system", content: gradeSystemPrompt },
        { role: "user", content: `Grade this article:\n\nTitle: ${article.title}\nKeyword: ${article.keyword || "Not specified"}\n\nContent:\n${article.content}` },
      ],
    }, projectId);

    const gradeRaw = (gradeResponse.choices?.[0]?.message?.content || "") as string;
    const gradeJsonMatch = gradeRaw.match(/\{[\s\S]*\}/);
    if (!gradeJsonMatch) break;

    let gradeData: any = extractJSON(gradeJsonMatch[0]);
    if (!gradeData) break;

    finalGrade = gradeData.gradeBand || "?";
    iterationsRun++;

    console.log(`[AutoGrade] Iteration ${i + 1}: grade=${finalGrade}, target=${targetGrade}`);
    logFn?.("auto_grade", `Iteration ${i + 1}: graded ${finalGrade} (target: ${targetGrade})`, "info", { iteration: i + 1, grade: finalGrade, targetGrade });

    // Stop if target reached
    if (gradeMetOrExceeds(finalGrade, targetGrade)) {
      console.log(`[AutoGrade] Target grade ${targetGrade} reached after ${iterationsRun} iteration(s).`);
      logFn?.("auto_grade", `Target grade ${targetGrade} reached after ${iterationsRun} iteration(s)`, "success", { finalGrade, iterationsRun });
      break;
    }

    // --- Apply all improvements from all categories ---
    const categoryKeys = ["eeatTrust", "accuracy", "aioReadiness", "readabilityUx", "seoEntityCoverage", "riskHygiene", "brandVoiceAlignment", "icpAlignment"];
    const allImprovements: string[] = [];
    for (const key of categoryKeys) {
      const cat = gradeData[key];
      if (cat?.improvements?.length) {
        allImprovements.push(...cat.improvements);
      }
    }

    if (allImprovements.length === 0) break;

    // Apply improvements via the same surgical edit approach
    const improvementsList = allImprovements.slice(0, 12).map((imp: string, idx: number) => `${idx + 1}. ${imp}`).join("\n");
    const applySystemPrompt = `You are an expert content editor. Apply the listed improvements to the article. For each improvement, identify the EXACT original text snippet (verbatim from the article) and the replacement text.\n${brandVoiceSection ? brandVoiceSection : ""}\n\nRules:\n- Select the SMALLEST possible text snippet — ideally a SINGLE SENTENCE.\n- The "original" field must be an EXACT substring of the article content.\n- If an improvement requires adding NEW content, set "original" to the sentence AFTER which new content should appear, and "replacement" to that sentence PLUS the new content.\n- NEVER rewrite text unrelated to the improvement.\n- Maintain original tone, perspective, and formatting.\n\nRespond ONLY with a JSON array (no markdown fences):\n[{"improvement": "...", "original": "...", "replacement": "..."}]`;

    const applyResponse = await callLLM({
      messages: [
        { role: "system", content: applySystemPrompt },
        { role: "user", content: `Apply these improvements:\n\n${improvementsList}\n\n===FULL ARTICLE===\n${article.content}\n===END ARTICLE===` },
      ],
    }, projectId);

    const applyRaw = (applyResponse.choices?.[0]?.message?.content || "") as string;
    const applyJsonMatch = applyRaw.match(/\[[\s\S]*\]/);
    if (!applyJsonMatch) continue;

    let edits: Array<{ improvement: string; original: string; replacement: string }> = [];
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
      // Safety net: strip unwanted <strong>/<b> wrapping that LLMs sometimes add
      improvedContent = stripWrappingStrongTags(improvedContent);
      improvedContent = stripTargetBlank(improvedContent);

      const newWordCount = improvedContent.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
      await db.update(articles).set({ content: improvedContent, wordCount: newWordCount }).where(eq(articles.id, articleId));
      console.log(`[AutoGrade] Applied ${appliedCount} edits in iteration ${i + 1}.`);
      logFn?.("auto_grade", `Applied ${appliedCount} improvements in iteration ${i + 1}`, "success", { appliedCount, iteration: i + 1, newWordCount });
    }
  }

  return { finalGrade, iterationsRun };
}

export type AppRouter = typeof appRouter;
