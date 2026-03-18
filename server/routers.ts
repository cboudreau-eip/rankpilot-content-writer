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
  updateProjectReferenceDoc,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { parseSitemap } from "./sitemap-parser";
import type { OutlineSection, OutlineSettings, ICPDemographics, SitemapUrl } from "../drizzle/schema";

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
      }))
      .mutation(async ({ ctx, input }) => {
        // Auto-fetch ICP from project and default brand voice
        const project = await getProjectById(input.projectId);
        const allVoices = await getBrandVoicesByProject(input.projectId);
        const brandVoice = allVoices.find((v: any) => v.isDefault === 1) ?? allVoices[0] ?? null;

        // Build ICP section for outline (project-level ICP)
        let icpSection = "";
        if (project?.icpPrimaryName) {
          const formatList = (items: string[] | null | undefined, label: string): string => {
            if (!items?.length) return '';
            return `${label}:\n${items.map((item, i) => `  ${i + 1}. ${item}`).join('\n')}\n`;
          };
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
            short: "Concise, punchy sentences",
            mixed: "Varied sentence lengths",
            detailed: "Detailed, explanatory sentences",
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
`;
        }

        const systemPrompt = `You are an expert SEO content strategist. Generate a detailed article outline for the given keyword.
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
${input.additionalInstructions ? `- Additional instructions: ${input.additionalInstructions}` : ""}
${icpSection}
${brandVoiceSection}

Return ONLY valid JSON, no markdown code blocks.`;

        const response = await invokeLLM({
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
    /** Get the reference document for a project */
    getReferenceDoc: protectedProcedure
      .input(z.object({ projectId: z.number() }))
      .query(async ({ input }) => {
        const project = await getProjectById(input.projectId);
        if (!project) throw new Error("Project not found");
        return {
          referenceDoc: project.referenceDoc,
          referenceDocName: project.referenceDocName,
        };
      }),

    /** Update the reference document for a project */
    updateReferenceDoc: protectedProcedure
      .input(z.object({
        projectId: z.number(),
        referenceDoc: z.string().nullable(),
        referenceDocName: z.string().nullable(),
      }))
      .mutation(async ({ input }) => {
        return updateProjectReferenceDoc(input.projectId, input.referenceDoc, input.referenceDocName);
      }),

    /** Run cross-check on an article against the project's reference document */
    checkArticle: protectedProcedure
      .input(z.object({ articleId: z.number() }))
      .mutation(async ({ input }) => {
        const article = await getArticleById(input.articleId);
        if (!article) throw new Error("Article not found");

        const project = await getProjectById(article.projectId);
        if (!project) throw new Error("Project not found");

        if (!project.referenceDoc) {
          throw new Error("No reference document found for this project. Add one in Project Settings > Cross Check tab.");
        }

        const referenceDoc = project.referenceDoc;
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

Respond in this exact JSON format:
{
  "summary": "A 1-2 sentence overall assessment of factual alignment",
  "discrepancies": [
    {
      "articleText": "The exact text from the article that contains the inaccuracy",
      "referenceText": "The exact fact from the reference document that contradicts it",
      "correction": "The corrected version of the article text that aligns with the reference document",
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

        const userPrompt = `REFERENCE DOCUMENT ("${referenceDocName}"):\n---\n${referenceDoc}\n---\n\nARTICLE TO CROSS-CHECK:\nTitle: ${article.title}\nKeyword: ${article.keyword ?? ""}\n\nContent:\n${article.content}`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

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
      }))
      .mutation(async ({ ctx, input }) => {
        const outline = await getOutlineById(input.outlineId);
        if (!outline) throw new Error("Outline not found");

        // Auto-fetch ICP from project and default brand voice
        const project = await getProjectById(input.projectId);
        const allVoices = await getBrandVoicesByProject(input.projectId);
        const brandVoice = allVoices.find((v: any) => v.isDefault === 1) ?? allVoices[0] ?? null;

        // Build ICP section with enforcement rules (project-level ICP)
        let icpSection = "";
        if (project?.icpPrimaryName) {
          const formatList = (items: string[] | null | undefined, prefix: string): string => {
            if (!items?.length) return '';
            return `${prefix}:\n${items.map((item, i) => `${i + 1}. ${item}`).join('\n')}`;
          };

          const painsSection = formatList(project.icpPains as string[] | null, 'PAIN POINTS (emphasize these problems)');
          const goalsSection = formatList(project.icpGoals as string[] | null, 'GOALS (what they want to achieve)');
          const objectionsSection = formatList(project.icpObjections as string[] | null, 'COMMON OBJECTIONS (address these concerns)');
          const triggersSection = formatList(project.icpDecisionTriggers as string[] | null, 'DECISION TRIGGERS (what prompts action)');
          const trustSection = formatList(project.icpTrustSignals as string[] | null, 'TRUST SIGNALS (what builds confidence)');

          icpSection = `
IDEAL CUSTOMER PROFILE (ICP) - CONTENT TARGETING LAYER
======================================================
ICP works alongside Brand Voice: Brand Voice controls HOW content sounds (tone, personality, style).
ICP controls WHO content is written for (pain points, framing, vocabulary, examples).
If any guidance overlaps, Brand Voice takes priority for tone/style.

TARGET AUDIENCE:
- ICP Name: ${project.icpPrimaryName}
${project.icpWhoTheyAre ? `- Who They Are: ${project.icpWhoTheyAre}` : ''}

${painsSection}

${goalsSection}

${objectionsSection}

${triggersSection}

${trustSection}

=== ICP ENFORCEMENT RULES (MUST FOLLOW) ===

**FIT CHECK (do this first):**
Before writing, verify the topic "${outline.keyword ?? outline.title}" aligns with the ICP "${project.icpPrimaryName}".
If the topic doesn't directly serve this audience, adjust the angle to match their needs.

**RULE 1 - INTRO:** Mention the ICP's situation or a relatable scenario in the first 2 sentences of the article.

**RULE 2 - HEADINGS:** At least 30% of H2/H3 headings must reflect ICP pain points or intent language.

**RULE 3 - FAQs:** At least 60% of FAQ questions must be derived from the ICP's objections and decision triggers listed above.

**RULE 4 - EXAMPLES:** Include at least 2 examples or scenarios that are consistent with "${project.icpWhoTheyAre || project.icpPrimaryName}".

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

          // Sentence style descriptions
          const SENTENCE_STYLES: Record<string, string> = {
            short: "Short and Direct - Concise sentences under 12 words, minimal filler, tight paragraphs (1-3 sentences)",
            mixed: "Mixed - Varied sentence length for natural rhythm, paragraphs of 2-5 sentences",
            detailed: "Detailed and Explanatory - Longer sentences with expanded context, thorough explanations",
          };
          const sentenceStyleDesc = SENTENCE_STYLES[brandVoice.sentenceStyle || "mixed"] || SENTENCE_STYLES.mixed;

          brandVoiceSection = `BRAND VOICE GUIDELINES (FOLLOW THESE CAREFULLY):
Voice Name: ${brandVoice.name}

PRIMARY TONE (emphasize these most): ${primaryTones.length > 0 ? primaryTones.join(", ") : "Professional"}
${supportingTones.length > 0 ? `SUPPORTING TONE (subtle undertones): ${supportingTones.join(", ")}` : ''}

PERSPECTIVE: ${brandVoice.perspective === "first" ? "First person (use 'we', 'our', 'us')" : brandVoice.perspective === "second" ? "Second person (address reader as 'you', 'your')" : "Third person (neutral/objective perspective)"}

SENTENCE STYLE: ${sentenceStyleDesc}

${avoidItems.length > 0 ? `THINGS TO STRICTLY AVOID (these are hard constraints):\n${avoidItems.map(item => `- DO NOT use ${item}`).join("\n")}\n` : ''}
${brandVoice.writingStyleSample ? `
Writing Style Example (learn the STYLE, not the content):
"""
${brandVoice.writingStyleSample}
"""
CRITICAL - DO NOT COPY from the example above:
- Do NOT reuse any specific phrases, sentences, or openings from this sample
- Do NOT start your article with the same hook or premise as this sample
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
          if (section.subSections) {
            for (const sub of section.subSections) {
              text += `### ${sub.heading}\n`;
              if (sub.points) {
                text += sub.points.map((p: string) => `- ${p}`).join("\n") + "\n";
              }
            }
          }
          return text;
        }).join("\n");

        const settings = outline.settings as OutlineSettings | null;

        const systemPrompt = `You are an expert SEO content writer. Write a comprehensive, well-structured article based on the provided outline.

Guidelines:
- Write in ${settings?.tone ?? "a professional and informative"} tone
- Target approximately ${settings?.targetWordCount ?? 2000} words
- Use proper HTML formatting: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags
- Include a compelling introduction that hooks the reader
- Each section should flow naturally into the next
- Include relevant statistics and examples where appropriate
- End with a strong conclusion and call to action
- Optimize for the target keyword: "${outline.keyword ?? outline.title}"
- Make the content comprehensive, authoritative, and reader-friendly
- Use short paragraphs (2-3 sentences) for readability
- Include bullet points and numbered lists where appropriate
${input.additionalInstructions ? `- Additional instructions: ${input.additionalInstructions}` : ""}

${brandVoiceSection}

${icpSection}
${ctaContext}

Return ONLY the HTML content of the article body (no <html>, <head>, or <body> tags). Start with the first <h2> section.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Write the full article based on this outline:\n\nTitle: ${outline.title}\n\n${outlineText}` },
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        if (!rawContent) throw new Error("No response from AI");
        const articleContent = typeof rawContent === "string" ? rawContent : (rawContent as any)[0]?.text ?? "";

        // Count words
        const wordCount = articleContent.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;

        // Generate meta title and description
        const metaResponse = await invokeLLM({
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
});

export type AppRouter = typeof appRouter;
