import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
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
} from "./db";
import { storagePut, storageGet } from "./storage";
import { generateImage } from "./_core/imageGeneration";
import { applyBackgroundColors } from "./applyBackgroundColors";
import { applyTemplateStyles } from "./applyTemplateStyles";
import { invokeLLM } from "./_core/llm";
import type { InvokeParams, InvokeResult } from "./_core/llm";
import { invokeClaudeLLM } from "./claude";
import { parseSitemap } from "./sitemap-parser";
import type { OutlineSection, OutlineSettings, ICPDemographics, SitemapUrl } from "../drizzle/schema";
import { articles, projects, brandVoices, citationSources } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { getEntityAnalysisPrompt, getSemanticAnalysisPrompt } from "./entity-prompts";
import type { EntityAnalysisResult, SemanticAnalysisResult } from "../shared/entity-types";
import type { ResearchFindings } from "../shared/research-types";

/** Build a research section string to inject into the outline prompt */
function buildResearchSection(research: any): string {
  let section = `\n=== RESEARCH FINDINGS - USE THESE TO INFORM THE OUTLINE ===\n\n`;

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
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  projects: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return getProjectsByUserId(ctx.user.id);
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getProjectById(input.id);
      }),
    create: protectedProcedure
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
          userId: ctx.user.id,
        });
      }),
    update: protectedProcedure
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
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateProject(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteProject(input.id);
      }),
  }),

  outlines: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getOutlinesByProject(input.projectId);
      }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
      return getOutlinesByUser(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getOutlineById(input.id);
      }),

    create: protectedProcedure
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
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteOutline(input.id);
      }),

    /** LLM-powered topic research before outline generation */
    researchTopic: protectedProcedure
      .input(z.object({
        topic: z.string().min(1),
        keyword: z.string().optional(),
        niche: z.string().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const researchPrompt = `You are an expert research assistant conducting comprehensive topic research for content creation.

RESEARCH TOPIC: "${input.topic}"
${input.keyword ? `PRIMARY KEYWORD: "${input.keyword}"` : ""}
${input.niche ? `INDUSTRY/NICHE: "${input.niche}"` : ""}

Conduct thorough research and provide findings in these categories:

1. STATISTICS & DATA POINTS
- Find 5-8 relevant statistics, facts, or data points
- Include specific numbers, percentages, or metrics
- Prioritize recent data (2024-2026)
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
- Only cite real, verifiable sources that actually exist
- Be specific with URLs - use actual page paths, not just homepages
- Use recent data where possible (note the year)
- If you're uncertain about exact URLs, use the base domain
- Make statistics specific and actionable for content creation
- Questions should reflect real user search intent`;

        const response = await callLLM({
          messages: [
            { role: "system", content: "You are an expert research assistant. Return ONLY valid JSON, no markdown fences or explanation." },
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

        let findings: any;
        try {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          findings = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
        } catch {
          throw new Error("Failed to parse research findings");
        }

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
    suggestKeywords: protectedProcedure
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
        try {
          const parsed = JSON.parse(text);
          return {
            secondary: (parsed.secondary || []).slice(0, 8) as string[],
            lsi: (parsed.lsi || []).slice(0, 8) as string[],
            longTail: (parsed.longTail || []).slice(0, 5) as string[],
          };
        } catch {
          throw new Error("Failed to parse keyword suggestions");
        }
      }),

    /** AI-powered outline generation */
    generate: protectedProcedure
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
  - "subSections": Optional array of sub-sections with same structure but type "h3"

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
                      },
                      required: ["id", "heading", "type", "points", "subSections"],
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

        const parsed = JSON.parse(content);

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
          userId: ctx.user.id,
        });

        return outline;
      }),
  }),

  icpProfiles: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getICPsByProject(input.projectId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getICPById(input.id);
      }),

    create: protectedProcedure
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
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteICP(input.id);
      }),
  }),

  brandVoices: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getBrandVoicesByProject(input.projectId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getBrandVoiceById(input.id);
      }),

    create: protectedProcedure
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
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteBrandVoice(input.id);
      }),
  }),

  ctaTemplates: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getCTAsByProject(input.projectId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getCTAById(input.id);
      }),

    create: protectedProcedure
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
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteCTA(input.id);
      }),
  }),

  sitemaps: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getSitemapsByProject(input.projectId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getSitemapById(input.id);
      }),

    create: protectedProcedure
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

    refresh: protectedProcedure
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteSitemap(input.id);
      }),
  }),

  citations: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getCitationsByProject(input.projectId);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getCitationById(input.id);
      }),

    create: protectedProcedure
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
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteCitation(input.id);
      }),
  }),

  crossCheck: router({
    /** Get the reference document metadata for a project */
    getReferenceDoc: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new Error("Project not found");

        let referenceDoc: string | null = null;
        let s3FetchFailed = false;
        const hasMetadata = !!(project.referenceDocName && (project.referenceDocS3Key || project.referenceDocContent));

        // Primary source: database column (always available, survives deployments)
        if (project.referenceDocContent) {
          referenceDoc = project.referenceDocContent;
        }
        // Fallback: S3 (for backward compatibility / if DB column was somehow empty)
        else if (project.referenceDocS3Key) {
          try {
            const { url } = await storageGet(project.referenceDocS3Key);
            const resp = await fetch(url);
            if (resp.ok) {
              referenceDoc = await resp.text();
              // Self-heal: backfill DB column from S3 so future reads are instant
              try {
                await updateProjectReferenceDocMeta(
                  input.projectId,
                  project.referenceDocS3Key,
                  project.referenceDocName,
                  referenceDoc.length,
                  referenceDoc
                );
              } catch { /* non-critical */ }
            } else {
              console.warn(`S3 fetch returned ${resp.status} for key: ${project.referenceDocS3Key}`);
              s3FetchFailed = true;
            }
          } catch (e) {
            console.warn("Failed to fetch reference doc from S3:", e);
            s3FetchFailed = true;
          }
        }

        return {
          referenceDoc,
          referenceDocName: project.referenceDocName,
          referenceDocLength: project.referenceDocLength,
          s3FetchFailed,
          hasMetadata,
        };
      }),

    /** Update the reference document for a project (dual-storage: DB + S3) */
    updateReferenceDoc: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        referenceDoc: z.string().nullable(),
        referenceDocName: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        if (input.referenceDoc) {
          // Upload to S3 as backup (non-blocking — DB is source of truth)
          let s3Key: string | null = null;
          try {
            s3Key = `reference-docs/project-${input.projectId}-${Date.now()}.txt`;
            await storagePut(s3Key, input.referenceDoc, "text/plain");
          } catch (e) {
            console.warn("S3 upload failed (non-critical, DB has content):", e);
            s3Key = null; // Don't save a broken S3 key
          }
          // Save content to DB (primary) + S3 key (backup reference)
          return updateProjectReferenceDocMeta(
            input.projectId,
            s3Key,
            input.referenceDocName,
            input.referenceDoc.length,
            input.referenceDoc
          );
        } else {
          // Clear reference doc from both DB and S3 metadata
          return updateProjectReferenceDocMeta(input.projectId, null, null, null, null);
        }
      }),

    /** Run cross-check on an article against the project's reference document */
    checkArticle: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new Error("Article not found");

        const project = await getProjectById(article.projectId);
        if (!project) throw new Error("Project not found");

        if (!project.referenceDocContent && !project.referenceDocS3Key) {
          throw new Error("No reference document found for this project. Add one in Project Settings > Cross Check tab.");
        }

        // Read reference doc: DB first (primary), S3 fallback
        let referenceDoc: string;
        if (project.referenceDocContent) {
          referenceDoc = project.referenceDocContent;
        } else {
          try {
            const { url } = await storageGet(project.referenceDocS3Key!);
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`S3 fetch failed: ${resp.status}`);
            referenceDoc = await resp.text();
          } catch (e) {
            throw new Error("Failed to retrieve reference document. Please re-upload it in Project Settings > Cross Check tab.");
          }
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
        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to parse cross-check response");

        const results = JSON.parse(jsonMatch[0]);

        return {
          results,
          referenceDocName,
        };
      }),
  }),

  // ---- Redundancy Checker ----
  redundancy: router({
    /** Analyze article content for redundancies: repeated phrases, redundant ideas, recycled stats, filler patterns */
    check: protectedProcedure
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

        const jsonMatch = contentStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to parse redundancy check response");

        const results = JSON.parse(jsonMatch[0]);

        return { results };
      }),
  }),

  articles: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.number(), status: z.string().optional() }))
      .query(async ({ input }) => {
        return getArticlesByProject(input.projectId, input.status);
      }),

    listAll: protectedProcedure.query(async ({ ctx }) => {
      return getArticlesByUser(ctx.user.id);
    }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getArticleById(input.id);
      }),

    stats: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getArticleStats(input.projectId);
      }),

    create: protectedProcedure
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
          userId: ctx.user.id,
        });
      }),

    update: protectedProcedure
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

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return deleteArticle(input.id);
      }),

    /** AI-powered article generation from outline */
    generate: protectedProcedure
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
        generateImages: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
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
          if (section.points) {
            text += section.points.map((p: string) => `- ${p}`).join("\n") + "\n";
          }
          if (section.aiInstructions?.trim()) {
            text += `[AI INSTRUCTIONS FOR THIS SECTION: ${section.aiInstructions.trim()}]\n`;
          }
          if (section.templateType) {
            text += `[TEMPLATE TYPE: ${section.templateType}] — You MUST output the <h2> heading for this section as normal (e.g., <h2>${section.heading}</h2>), then write ONLY clean body content (1-3 concise paragraphs). Do NOT add any special formatting, icons, borders, or wrapper divs. The styled container will be added automatically in post-processing.
`;
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
        const effectiveAutoLinkCount = input.autoLinkCount || settings?.autoLinkCount || 5;
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
            linkingInstructions += `\n\nAUTOMATIC INTERNAL LINKING:\nThe article should include approximately ${effectiveAutoLinkCount} internal links chosen from the following REAL page URLs. You MUST ONLY use URLs from this list — do NOT invent or guess URLs:\n${resolvedPageUrls.map(u => `  - ${u}`).join("\n")}\nChoose URLs that are contextually relevant to the article topic and link them naturally within the content. Use <a href="URL">anchor text</a> format. IMPORTANT: Anchor text must be 2-7 words — a short key phrase, NOT a full sentence. CRITICAL: Only use exact URLs from the list above. Never fabricate URLs.`;
          } else {
            // Fallback: if no parsed URLs found, skip auto-linking rather than hallucinate
            console.warn(`[Article Generate] No parsed URLs found for sitemaps: ${effectiveSitemapUrls.join(', ')}. Skipping auto-linking.`);
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
- Target approximately ${settings?.targetWordCount ?? 2000} words
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
- PER-SECTION AI INSTRUCTIONS: Some sections in the outline may include [AI INSTRUCTIONS FOR THIS SECTION: ...] or [AI INSTRUCTIONS FOR THIS SUB-SECTION: ...] directives. You MUST follow these instructions precisely when writing that specific section. These may request specific content formats (tables, charts, bullet lists), specific focus areas, examples, statistics, or other structural requirements. Treat them as mandatory requirements for that section.
- TEMPLATE SECTIONS: Some sections may include a [TEMPLATE TYPE: ...] directive. For ALL template sections, you MUST output the <h2> heading as normal. Do NOT add any special formatting, icons, borders, or wrapper divs — styled containers are added automatically in post-processing.
  * [TEMPLATE TYPE: pro-tip] or [TEMPLATE TYPE: summary]: Write ONLY clean body content (1-3 concise paragraphs) after the heading.
  * [TEMPLATE TYPE: use-cases]: Write a brief intro paragraph (1-2 sentences), then 3-5 use cases. Each use case MUST be formatted as: <p><strong>Use Case Title</strong></p><p>Description in 1-2 sentences.</p>. Do NOT use bullet points, numbered lists, or <h3> sub-headings for use cases. Each use case must be a separate <strong>-paragraph pair.
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
- CITATION LINK RULES: When inserting any external links or citations:
  * NEVER use generic anchor text like "Learn more at", "Find out more", "Click here", "Visit", or just the source name
  * The anchor text MUST be the actual claim or fact being cited, kept to 2-7 words (e.g., <a href="...">covers outpatient services</a>)
  * NEVER link to a homepage URL — always use the most specific deep page URL relevant to the claim
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

Return ONLY the ${effectiveFormat === "plaintext" ? "plain text" : "HTML"} content of the article body${effectiveFormat === "html" ? " (no <html>, <head>, or <body> tags)" : ""}. Start with the first ${effectiveFormat === "plaintext" ? "## heading" : "<h2> section"}.`;

        const response = await callLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Write the full article based on this outline:\n\nTitle: ${outline.title}\n\n${outlineText}` },
          ],
        }, input.projectId);

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error("No response from AI");
        const rawArticleContent = typeof rawContent === "string" ? rawContent : (rawContent as any)[0]?.text ?? "";

        // Post-process: first wrap bare text in <p> tags, then split long paragraphs, then apply background colors
        const maxSentences = brandVoice?.sentenceStyle === "short" ? 3 : brandVoice?.sentenceStyle === "detailed" ? 6 : 5;
        const wrappedContent = effectiveFormat === "html" ? wrapBareTextInPTags(rawArticleContent) : rawArticleContent;
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

        // --- AI Image Generation (if enabled) ---
        if (input.generateImages && effectiveFormat === "html") {
          try {
            // Step 1: Ask LLM to identify the best sections for images and generate prompts
            const imagePromptResponse = await callLLM({
              messages: [
                {
                  role: "system",
                  content: `You are an expert at creating image prompts for article illustrations. Given an article's HTML content, identify 2-4 key sections that would benefit from an illustration. For each, generate a detailed image prompt suitable for AI image generation.

Rules:
- Choose sections where a visual would add value (data explanations, process descriptions, concept introductions)
- Do NOT place images in FAQ sections, table sections, or very short sections
- Image prompts should describe professional, clean illustrations or infographics — NOT stock photos with people
- Prompts should be specific, descriptive, and 1-2 sentences
- Return the heading text (h2 or h3) that the image should appear AFTER

Return JSON only.`,
                },
                {
                  role: "user",
                  content: `Article title: ${outline.title}\nKeyword: ${outline.keyword ?? outline.title}\n\nArticle HTML:\n${articleContent.substring(0, 8000)}`,
                },
              ],
              response_format: {
                type: "json_schema",
                json_schema: {
                  name: "image_prompts",
                  strict: true,
                  schema: {
                    type: "object",
                    properties: {
                      images: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            afterHeading: { type: "string", description: "The exact heading text the image should appear after" },
                            prompt: { type: "string", description: "Detailed image generation prompt" },
                            altText: { type: "string", description: "Accessible alt text for the image" },
                          },
                          required: ["afterHeading", "prompt", "altText"],
                          additionalProperties: false,
                        },
                      },
                    },
                    required: ["images"],
                    additionalProperties: false,
                  },
                },
              },
            }, input.projectId);

            const rawImagePrompts = imagePromptResponse.choices[0]?.message?.content;
            const imagePromptsText = typeof rawImagePrompts === "string" ? rawImagePrompts : (rawImagePrompts as any)?.[0]?.text ?? "";
            let imagePrompts: Array<{ afterHeading: string; prompt: string; altText: string }> = [];
            try {
              const parsed = JSON.parse(imagePromptsText);
              imagePrompts = parsed.images || [];
            } catch {
              console.warn("[ImageGen] Failed to parse image prompts from LLM");
            }

            // Step 2: Generate images in parallel (max 4)
            const imagesToGenerate = imagePrompts.slice(0, 4);
            const imageResults = await Promise.allSettled(
              imagesToGenerate.map(async (img) => {
                const result = await generateImage({ prompt: img.prompt });
                return { ...img, url: result.url };
              })
            );

            // Step 3: Insert images into article HTML after the matching headings
            for (const result of imageResults) {
              if (result.status !== "fulfilled" || !result.value.url) continue;
              const { afterHeading, url, altText, prompt } = result.value;

              // Find the heading in the HTML and insert a figure after it
              const headingEscaped = afterHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
              const headingRegex = new RegExp(
                `(<h[23][^>]*>[^<]*${headingEscaped}[^<]*<\/h[23]>)`,
                "i"
              );
              const figureHtml = `\n<figure class="ai-generated-image" data-prompt="${prompt.replace(/"/g, "&quot;")}" style="margin: 24px 0; text-align: center;"><img src="${url}" alt="${altText.replace(/"/g, "&quot;")}" style="max-width: 100%; height: auto; border-radius: 8px;" /><figcaption style="font-size: 0.85em; color: #666; margin-top: 8px;">${altText}</figcaption></figure>`;

              if (headingRegex.test(articleContent)) {
                articleContent = articleContent.replace(headingRegex, `$1${figureHtml}`);
              }
            }
          } catch (imgError: any) {
            console.warn("[ImageGen] Image generation failed, continuing without images:", imgError?.message);
            // Don't fail the entire article generation if images fail
          }
        }

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
          try {
            const meta = JSON.parse(metaContent);
            metaTitle = meta.metaTitle || outline.title;
            metaDescription = meta.metaDescription || "";
          } catch {}
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
          userId: ctx.user.id,
        });

        // Mark outline as complete
        await updateOutline(input.outlineId, { status: "complete" });

        return article;
      }),
  }),
  // ---- Article Image Generation ----
  articleImages: router({
    /** Generate a single image from a prompt and return the S3 URL */
    generate: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1),
        altText: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const result = await generateImage({ prompt: input.prompt });
        if (!result.url) throw new Error("Image generation failed — no URL returned");
        return {
          url: result.url,
          prompt: input.prompt,
          altText: input.altText || "",
        };
      }),

    /** Regenerate an image with a new or modified prompt */
    regenerate: protectedProcedure
      .input(z.object({
        articleId: z.number(),
        oldImageUrl: z.string(),
        newPrompt: z.string().min(1),
        altText: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new Error("Article not found");

        // Generate the new image
        const result = await generateImage({ prompt: input.newPrompt });
        if (!result.url) throw new Error("Image generation failed — no URL returned");

        // Replace the old image URL in the article content
        let content = article.content || "";
        if (input.oldImageUrl && content.includes(input.oldImageUrl)) {
          content = content.replace(
            new RegExp(input.oldImageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"),
            result.url
          );
          // Also update the data-prompt attribute
          content = content.replace(
            /data-prompt="[^"]*"/,
            `data-prompt="${input.newPrompt.replace(/"/g, "&quot;")}"`
          );
        }

        // Update alt text if provided
        if (input.altText) {
          // Find the figure containing the new URL and update alt + caption
          const altEscaped = input.altText.replace(/"/g, "&quot;");
          content = content.replace(
            new RegExp(`(<img[^>]*src="${result.url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*alt=")[^"]*(")`, "i"),
            `$1${altEscaped}$2`
          );
        }

        // Save updated content
        const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
        await updateArticle(input.articleId, { content, wordCount });

        return {
          url: result.url,
          prompt: input.newPrompt,
          altText: input.altText || "",
          articleId: input.articleId,
        };
      }),

    /** Generate image prompts for an existing article (for post-creation insertion) */
    suggestPlacements: protectedProcedure
      .input(z.object({
        articleId: z.number(),
        projectId: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new Error("Article not found");

        const response = await callLLM({
          messages: [
            {
              role: "system",
              content: `You are an expert at creating image prompts for article illustrations. Given an article's HTML content, identify 2-4 key sections that would benefit from an illustration. For each, generate a detailed image prompt suitable for AI image generation.

Rules:
- Choose sections where a visual would add value (data explanations, process descriptions, concept introductions)
- Do NOT place images in FAQ sections, table sections, or very short sections
- Do NOT suggest images for sections that already contain an <img> tag
- Image prompts should describe professional, clean illustrations or infographics — NOT stock photos with people
- Prompts should be specific, descriptive, and 1-2 sentences
- Return the heading text (h2 or h3) that the image should appear AFTER

Return JSON only.`,
            },
            {
              role: "user",
              content: `Article title: ${article.title}\nKeyword: ${article.keyword || article.title}\n\nArticle HTML:\n${(article.content || "").substring(0, 8000)}`,
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "image_prompts",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  images: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        afterHeading: { type: "string", description: "The exact heading text the image should appear after" },
                        prompt: { type: "string", description: "Detailed image generation prompt" },
                        altText: { type: "string", description: "Accessible alt text for the image" },
                      },
                      required: ["afterHeading", "prompt", "altText"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["images"],
                additionalProperties: false,
              },
            },
          },
        }, input.projectId);

        const raw = response.choices[0]?.message?.content;
        const text = typeof raw === "string" ? raw : (raw as any)?.[0]?.text ?? "";
        try {
          const parsed = JSON.parse(text);
          return { suggestions: parsed.images || [] };
        } catch {
          return { suggestions: [] };
        }
      }),

    /** Remove an image from an article by its URL */
    remove: protectedProcedure
      .input(z.object({
        articleId: z.number(),
        imageUrl: z.string(),
      }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new Error("Article not found");

        let content = article.content || "";
        // Remove the entire <figure> containing this image URL
        const urlEscaped = input.imageUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const figureRegex = new RegExp(
          `<figure[^>]*>[\\s\\S]*?${urlEscaped}[\\s\\S]*?<\/figure>`,
          "i"
        );
        content = content.replace(figureRegex, "");

        // Fallback: if no figure wrapper, remove standalone img tag
        if (content.includes(input.imageUrl)) {
          const imgRegex = new RegExp(`<img[^>]*src="${urlEscaped}"[^>]*\/?>`, "gi");
          content = content.replace(imgRegex, "");
        }

        // Clean up empty lines
        content = content.replace(/\n{3,}/g, "\n\n").trim();

        const wordCount = content.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
        await updateArticle(input.articleId, { content, wordCount });

        return { success: true, articleId: input.articleId };
      }),
  }),
  // ---- Thin Content Analyzer ----
  thinContent: router({
    /** Analyze a sitemap URL for thin content issues */
    analyze: protectedProcedure
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
    getProjectSitemaps: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        return getSitemapsByProject(input.projectId);
      }),
  }),

  // ---- Content Grading ----
  // ---- Entity / Salience Analyzer ----
  entity: router({
    /** Entity + Salience analysis — 6-step framework */
    analyzeContent: protectedProcedure
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
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to parse entity analysis response");
        return JSON.parse(jsonMatch[0]) as EntityAnalysisResult;
      }),

    /** Analyze an existing article by ID */
    analyzeArticle: protectedProcedure
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
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to parse entity analysis response");
        return JSON.parse(jsonMatch[0]) as EntityAnalysisResult;
      }),

    /** Semantic analysis — 4-layer framework */
    analyzeSemantic: protectedProcedure
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
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to parse semantic analysis response");
        return JSON.parse(jsonMatch[0]) as SemanticAnalysisResult;
      }),

    /** Semantic analysis for an existing article by ID */
    analyzeArticleSemantic: protectedProcedure
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
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to parse semantic analysis response");
        return JSON.parse(jsonMatch[0]) as SemanticAnalysisResult;
      }),

    /** Apply selected entity/salience fixes to an article — surgical editing */
    applyEntityFixes: protectedProcedure
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
          const jsonMatch = rawResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            edits = JSON.parse(jsonMatch[0]);
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
  }),

  grading: router({
    /** Standalone content grader — paste any content, 4-category 85-point system */
    gradeContent: protectedProcedure
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
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to parse grading response");
        return JSON.parse(jsonMatch[0]);
      }),

    /** Per-article grader — 6+2 categories with Brand Voice + ICP conditional scoring */
    gradeArticle: protectedProcedure
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
          citationSourcesSection = `\nAVAILABLE CITATION SOURCES (curated by the project owner):\n${sourcesList}\n\nCITATION QUALITY RULES (MANDATORY):\n1. ANCHOR TEXT: NEVER use generic anchor text like "Learn more at", "Find out more", "Click here", "Visit", or "[Source Name]". Instead, the anchor text MUST be the actual claim, fact, or phrase being cited. Example:\n   - BAD: "Learn more at <a href=\"...\">Medicare.gov</a>"\n   - BAD: "<a href=\"...\">Find out more about Part B coverage</a>"\n   - GOOD: "Medicare Part B <a href=\"...\">covers outpatient services including doctor visits and lab tests</a>"\n   - GOOD: "The annual deductible for Part B is <a href=\"...\">$257 in 2026</a>"\n\n2. DEEP LINKING: NEVER link to a homepage (e.g., medicare.gov or cms.gov). Always construct the most specific URL path that would contain the cited information. Use the source's base URL + a logical path. Example:\n   - BAD: https://www.medicare.gov\n   - GOOD: https://www.medicare.gov/what-medicare-covers/what-part-b-covers\n   - If you cannot determine the exact deep page, append a relevant path based on the topic (e.g., /enrollment, /costs, /coverage, /part-a, /part-b)\n\n3. When suggesting citation improvements, specify EXACTLY which sentence/claim needs the citation and which source + deep page URL to use.`;
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
        const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Failed to parse grading response");
        const raw = JSON.parse(jsonMatch[0]);

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
    applyImprovements: protectedProcedure
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
            citationSourcesSection = `\nAVAILABLE CITATION SOURCES:\n${sourcesList}\n\nCITATION INSERTION RULES (MANDATORY):\n1. ANCHOR TEXT: NEVER use generic phrases like "Learn more at", "Find out more", "Click here", "Visit [Source]", or just the source name as anchor text. The anchor text MUST be the actual claim, fact, or phrase being supported by the citation. Examples:\n   - BAD: "Learn more at <a href=\"...\">Medicare.gov</a>"\n   - BAD: "<a href=\"...\">Click here</a> for details"\n   - GOOD: "Medicare Part B <a href=\"...\">covers outpatient services including doctor visits and lab tests</a>"\n   - GOOD: "The annual deductible is <a href=\"...\">$257 in 2026</a>"\n\n2. DEEP LINKING: NEVER link to a homepage URL. Always use the most specific page URL relevant to the cited claim. Construct a logical deep path from the source's base URL:\n   - BAD: https://www.medicare.gov\n   - GOOD: https://www.medicare.gov/what-medicare-covers/what-part-b-covers\n   - Append relevant path segments like /enrollment, /costs, /coverage, /eligibility based on the topic\n\n3. Place the <a> tag inline within the sentence, wrapping the specific factual claim it supports.`;
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
- If an improvement mentions adding sources/citations, use the available citation sources listed above
- When inserting citation links: the anchor text MUST be the factual claim being cited (NEVER "Learn more", "Click here", or the source name). Link to a specific deep page URL, NOT the homepage.
- ANCHOR TEXT LENGTH: All link anchor text must be 2-7 words. NEVER wrap an entire sentence as a link. Link only the key phrase or concept.
- NEVER rewrite, rephrase, or restructure text that is not directly related to the improvement. If the improvement is "add a citation", the ONLY change should be adding an <a> tag — every other word must remain identical.
- Output ONLY pure markdown in replacement text. NEVER output HTML tags except for citation links (<a> tags).
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
          const jsonMatch = rawResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            edits = JSON.parse(jsonMatch[0]);
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
    applyContentImprovements: protectedProcedure
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
- When inserting citation links: the anchor text MUST be the factual claim being cited (NEVER "Learn more", "Click here", "Find out more", or just the source name). Link to a specific deep page URL, NOT a homepage.
- ANCHOR TEXT LENGTH: All link anchor text must be 2-7 words. NEVER wrap an entire sentence as a link. Link only the key phrase or concept.
- NEVER rewrite, rephrase, or restructure text that is not directly related to the improvement. If the improvement is "add a citation", the ONLY change should be adding an <a> tag — every other word must remain identical.
- Output ONLY pure markdown in replacement text. NEVER output HTML tags except for citation links (<a> tags).
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
          const jsonMatch = rawResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
          if (jsonMatch) {
            edits = JSON.parse(jsonMatch[0]);
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

        return {
          success: true,
          content: improvedContent,
          appliedCount,
          category: input.categoryLabel,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
