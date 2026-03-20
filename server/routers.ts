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
import { articles, projects, brandVoices } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { getDb } from "./db";

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
        targetLocation: z.string().optional(),
        targetAudience: z.string().optional(),
        outputFormat: z.enum(["html", "plaintext"]).optional(),
        manualLinks: z.array(z.object({ url: z.string(), anchorText: z.string() })).optional(),
        sitemapUrl: z.string().optional(),
        autoLinkCount: z.number().optional(),
        brandVoiceId: z.number().optional(),
        icpProfileId: z.number().optional(),
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
${input.targetLocation ? `- Target location: ${input.targetLocation} — tailor the outline to be relevant for this geographic area` : ""}
${input.targetAudience ? `- Target audience: ${input.targetAudience} — structure the outline to address this audience's needs` : ""}
${input.manualLinks?.length ? `- The final article will include these internal links — plan sections where they fit naturally:\n${input.manualLinks.map(l => `  • ${l.url}${l.anchorText ? ` (anchor: "${l.anchorText}")` : ""}`).join("\n")}` : ""}
${input.sitemapUrl ? `- The article will also include ${input.autoLinkCount ?? 5} automatic internal links from the sitemap at ${input.sitemapUrl}` : ""}
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
            targetLocation: input.targetLocation,
            targetAudience: input.targetAudience,
            outputFormat: input.outputFormat,
            manualLinks: input.manualLinks,
            sitemapUrl: input.sitemapUrl,
            autoLinkCount: input.autoLinkCount,
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
        targetLocation: z.string().optional(),
        targetAudience: z.string().optional(),
        outputFormat: z.enum(["html", "plaintext"]).optional(),
        manualLinks: z.array(z.object({ url: z.string(), anchorText: z.string() })).optional(),
        sitemapUrl: z.string().optional(),
        autoLinkCount: z.number().optional(),
        brandVoiceId: z.number().optional(),
        icpProfileId: z.number().optional(),
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

**RULE 1 - INTRO:** Mention the ICP's situation or a relatable scenario in the first 2 sentences of the article.

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

        // Merge settings from outline with any overrides from the generate call
        const effectiveLocation = input.targetLocation || settings?.targetLocation || "";
        const effectiveAudience = input.targetAudience || settings?.targetAudience || "";
        const effectiveFormat = input.outputFormat || settings?.outputFormat || "html";
        const effectiveManualLinks = input.manualLinks || settings?.manualLinks || [];
        const effectiveSitemapUrl = input.sitemapUrl || settings?.sitemapUrl || "";
        const effectiveAutoLinkCount = input.autoLinkCount || settings?.autoLinkCount || 5;

        // Build internal linking instructions
        let linkingInstructions = "";
        if (effectiveManualLinks.length > 0) {
          linkingInstructions += `\n\nMANUAL INTERNAL LINKS (MUST include all of these):\n${effectiveManualLinks.map((l, i) => `${i + 1}. Link to "${l.url}"${l.anchorText ? ` using anchor text "${l.anchorText}"` : " with contextually appropriate anchor text"}`).join("\n")}\nWeave these links naturally into the article body. Use <a href="URL">anchor text</a> format.`;
        }
        if (effectiveSitemapUrl) {
          linkingInstructions += `\n\nAUTOMATIC INTERNAL LINKING:\nThe article should include approximately ${effectiveAutoLinkCount} internal links to relevant pages from the site's sitemap (${effectiveSitemapUrl}). Choose URLs that are contextually relevant to the article topic and link them naturally within the content using descriptive anchor text. Use <a href="URL">anchor text</a> format.`;
        }

        // Output format instructions
        const formatInstructions = effectiveFormat === "plaintext"
          ? `- Output as PLAIN TEXT with markdown-style headings (## for H2, ### for H3). Do NOT use HTML tags.\n- Use plain text formatting: **bold**, bullet points with -, numbered lists with 1. 2. 3.`
          : `- Use proper HTML formatting: <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em> tags\n- For links use <a href="URL">anchor text</a> format`;

        const systemPrompt = `You are an expert SEO content writer. Write a comprehensive, well-structured article based on the provided outline.

Guidelines:
- Write in ${settings?.tone ?? "a professional and informative"} tone
- Target approximately ${settings?.targetWordCount ?? 2000} words
${formatInstructions}
- Include a compelling introduction that hooks the reader
- Each section should flow naturally into the next
- Include relevant statistics and examples where appropriate
- End with a strong conclusion and call to action
- Optimize for the target keyword: "${outline.keyword ?? outline.title}"
- Make the content comprehensive, authoritative, and reader-friendly
- Use short paragraphs (2-3 sentences) for readability
- Include bullet points and numbered lists where appropriate
${effectiveLocation ? `- Target location: ${effectiveLocation} — include location-specific information, examples, regulations, or references relevant to this area` : ""}
${effectiveAudience ? `- Target audience: ${effectiveAudience} — tailor language, examples, and depth to this specific audience` : ""}
${input.additionalInstructions ? `- Additional instructions: ${input.additionalInstructions}` : ""}

${brandVoiceSection}

${icpSection}
${ctaContext}
${linkingInstructions}

Return ONLY the ${effectiveFormat === "plaintext" ? "plain text" : "HTML"} content of the article body${effectiveFormat === "html" ? " (no <html>, <head>, or <body> tags)" : ""}. Start with the first ${effectiveFormat === "plaintext" ? "## heading" : "<h2> section"}.`;

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

  // ---- Content Grading ----
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

        const response = await invokeLLM({
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

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        const rawContent = (response.choices?.[0]?.message?.content || "") as string;
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
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

    /** Apply selected improvements from a grade to an article */
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

        const improvementsList = input.selectedImprovements.map((imp, i) => `${i + 1}. ${imp}`).join("\n");

        const systemPrompt = `You are an expert content editor specializing in ${input.categoryLabel} improvements for SEO and AEO content. You match the original author's voice exactly.
${brandVoiceSection}

Your task is to apply ONLY the specified improvements to the article.

Guidelines:
- Apply ONLY the listed improvements - do not add extra changes
- Maintain the article's original structure, tone, and formatting
- Output ONLY pure markdown. NEVER output HTML tags.
- Make changes seamlessly without disrupting readability
- If an improvement mentions adding sources/citations, weave them naturally into sentences
- Match the original article's sentence length patterns and formality level

IMPORTANT:
- Return ONLY the improved article content
- Do NOT include explanations or commentary
- Do NOT wrap the output in markdown code blocks`;

        const userPrompt = `Apply these ${input.categoryLabel} improvements to the article:\n\n===IMPROVEMENTS TO APPLY===\n${improvementsList}\n===END IMPROVEMENTS===\n\n===ORIGINAL ARTICLE===\n${article.content}\n===END ARTICLE===\n\nReturn the improved article content with these specific improvements applied.`;

        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        let improvedContent = ((llmResponse.choices?.[0]?.message?.content || article.content || "") as string).trim();
        if (improvedContent.startsWith("```")) {
          improvedContent = improvedContent.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
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
          appliedCount: input.selectedImprovements.length,
          category: input.categoryLabel,
        };
      }),

    /** Apply selected improvements to raw content (standalone grader — no article ID needed) */
    applyContentImprovements: protectedProcedure
      .input(z.object({
        content: z.string().min(10),
        categoryKey: z.string(),
        categoryLabel: z.string(),
        selectedImprovements: z.array(z.string()).min(1),
      }))
      .mutation(async ({ input }) => {
        const improvementsList = input.selectedImprovements.map((imp, i) => `${i + 1}. ${imp}`).join("\n");

        const systemPrompt = `You are an expert content editor specializing in ${input.categoryLabel} improvements for SEO and AEO content. You match the original author's voice exactly.

Your task is to apply ONLY the specified improvements to the content.

Guidelines:
- Apply ONLY the listed improvements - do not add extra changes
- Maintain the content's original structure, tone, and formatting
- Output ONLY pure markdown. NEVER output HTML tags.
- Make changes seamlessly without disrupting readability
- If an improvement mentions adding sources/citations, weave them naturally into sentences
- Match the original content's sentence length patterns and formality level

IMPORTANT:
- Return ONLY the improved content
- Do NOT include explanations or commentary
- Do NOT wrap the output in markdown code blocks`;

        const userPrompt = `Apply these ${input.categoryLabel} improvements to the content:\n\n===IMPROVEMENTS TO APPLY===\n${improvementsList}\n===END IMPROVEMENTS===\n\n===ORIGINAL CONTENT===\n${input.content}\n===END CONTENT===\n\nReturn the improved content with these specific improvements applied.`;

        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        });

        let improvedContent = ((llmResponse.choices?.[0]?.message?.content || input.content) as string).trim();
        if (improvedContent.startsWith("```")) {
          improvedContent = improvedContent.replace(/^```[\w]*\n?/, "").replace(/\n?```$/, "");
        }

        return {
          success: true,
          content: improvedContent,
          appliedCount: input.selectedImprovements.length,
          category: input.categoryLabel,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
