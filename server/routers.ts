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
} from "./db";
import { invokeLLM } from "./_core/llm";
import type { OutlineSection, OutlineSettings, ICPDemographics } from "../drizzle/schema";

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
        icpProfileId: z.number().optional(),
        brandVoiceId: z.number().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Fetch ICP and Brand Voice if selected
        const icpProfile = input.icpProfileId ? await getICPById(input.icpProfileId) : null;
        const brandVoice = input.brandVoiceId ? await getBrandVoiceById(input.brandVoiceId) : null;

        // Build ICP context for the prompt
        let icpContext = "";
        if (icpProfile) {
          icpContext = `\n\nTARGET AUDIENCE (ICP Profile: ${icpProfile.name}):\n`;
          if (icpProfile.description) icpContext += `- Description: ${icpProfile.description}\n`;
          if (icpProfile.demographics) {
            const d = icpProfile.demographics as any;
            if (d.ageRange) icpContext += `- Age Range: ${d.ageRange}\n`;
            if (d.location) icpContext += `- Location: ${d.location}\n`;
            if (d.income) icpContext += `- Income: ${d.income}\n`;
            if (d.education) icpContext += `- Education: ${d.education}\n`;
            if (d.occupation) icpContext += `- Occupation: ${d.occupation}\n`;
          }
          if (icpProfile.painPoints?.length) icpContext += `- Pain Points: ${(icpProfile.painPoints as string[]).join(", ")}\n`;
          if (icpProfile.goals?.length) icpContext += `- Goals: ${(icpProfile.goals as string[]).join(", ")}\n`;
          if (icpProfile.objections?.length) icpContext += `- Objections: ${(icpProfile.objections as string[]).join(", ")}\n`;
          if (icpProfile.searchBehavior) icpContext += `- Search Behavior: ${icpProfile.searchBehavior}\n`;
          icpContext += `\nIMPORTANT: Tailor the outline structure to address this audience's pain points, goals, and objections. Use language and framing that resonates with their search behavior.`;
        }

        // Build Brand Voice context for the prompt
        let voiceContext = "";
        if (brandVoice) {
          voiceContext = `\n\nBRAND VOICE (${brandVoice.name}):\n`;
          if (brandVoice.tone) voiceContext += `- Tone: ${brandVoice.tone}\n`;
          if (brandVoice.style) voiceContext += `- Style: ${brandVoice.style}\n`;
          if (brandVoice.vocabulary?.length) voiceContext += `- Preferred Vocabulary: ${(brandVoice.vocabulary as string[]).join(", ")}\n`;
          if (brandVoice.avoidWords?.length) voiceContext += `- Words to Avoid: ${(brandVoice.avoidWords as string[]).join(", ")}\n`;
          if (brandVoice.rules?.length) voiceContext += `- Rules: ${(brandVoice.rules as string[]).join("; ")}\n`;
          if (brandVoice.examples?.length) voiceContext += `- Example Sentences: ${(brandVoice.examples as string[]).join(" | ")}\n`;
          voiceContext += `\nIMPORTANT: Ensure the outline headings and structure reflect this brand voice.`;
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
${icpContext}
${voiceContext}

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
        description: z.string().optional(),
        tone: z.string().optional(),
        style: z.string().optional(),
        vocabulary: z.array(z.string()).optional(),
        avoidWords: z.array(z.string()).optional(),
        examples: z.array(z.string()).optional(),
        rules: z.array(z.string()).optional(),
        isDefault: z.number().optional(),
        projectId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return createBrandVoice({
          name: input.name,
          description: input.description ?? null,
          tone: input.tone ?? null,
          style: input.style ?? null,
          vocabulary: input.vocabulary ?? null,
          avoidWords: input.avoidWords ?? null,
          examples: input.examples ?? null,
          rules: input.rules ?? null,
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
        tone: z.string().optional(),
        style: z.string().optional(),
        vocabulary: z.array(z.string()).optional(),
        avoidWords: z.array(z.string()).optional(),
        examples: z.array(z.string()).optional(),
        rules: z.array(z.string()).optional(),
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
        icpProfileId: z.number().optional(),
        brandVoiceId: z.number().optional(),
        additionalInstructions: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const outline = await getOutlineById(input.outlineId);
        if (!outline) throw new Error("Outline not found");

        // Fetch ICP and Brand Voice if selected
        const icpProfile = input.icpProfileId ? await getICPById(input.icpProfileId) : null;
        const brandVoice = input.brandVoiceId ? await getBrandVoiceById(input.brandVoiceId) : null;

        // Build ICP context
        let icpContext = "";
        if (icpProfile) {
          icpContext = `\n\nTARGET AUDIENCE (ICP Profile: ${icpProfile.name}):\n`;
          if (icpProfile.description) icpContext += `- Description: ${icpProfile.description}\n`;
          if (icpProfile.demographics) {
            const d = icpProfile.demographics as any;
            if (d.ageRange) icpContext += `- Age Range: ${d.ageRange}\n`;
            if (d.location) icpContext += `- Location: ${d.location}\n`;
            if (d.occupation) icpContext += `- Occupation: ${d.occupation}\n`;
          }
          if (icpProfile.painPoints?.length) icpContext += `- Pain Points: ${(icpProfile.painPoints as string[]).join(", ")}\n`;
          if (icpProfile.goals?.length) icpContext += `- Goals: ${(icpProfile.goals as string[]).join(", ")}\n`;
          if (icpProfile.objections?.length) icpContext += `- Common Objections to Address: ${(icpProfile.objections as string[]).join(", ")}\n`;
          if (icpProfile.searchBehavior) icpContext += `- Search Behavior: ${icpProfile.searchBehavior}\n`;
          icpContext += `\nIMPORTANT ICP RULES:\n1. Address the audience's specific pain points throughout the article\n2. Frame solutions around their goals and motivations\n3. Proactively address their objections and concerns\n4. Use language and examples that resonate with their demographics\n5. Match the reading level and content depth to their education and occupation`;
        }

        // Build Brand Voice context
        let voiceContext = "";
        if (brandVoice) {
          voiceContext = `\n\nBRAND VOICE (${brandVoice.name}):\n`;
          if (brandVoice.tone) voiceContext += `- Tone: ${brandVoice.tone}\n`;
          if (brandVoice.style) voiceContext += `- Style Guidelines: ${brandVoice.style}\n`;
          if (brandVoice.vocabulary?.length) voiceContext += `- Preferred Vocabulary (USE these words): ${(brandVoice.vocabulary as string[]).join(", ")}\n`;
          if (brandVoice.avoidWords?.length) voiceContext += `- Words to AVOID (NEVER use these): ${(brandVoice.avoidWords as string[]).join(", ")}\n`;
          if (brandVoice.rules?.length) voiceContext += `- Brand Rules (MUST follow): ${(brandVoice.rules as string[]).join("; ")}\n`;
          if (brandVoice.examples?.length) voiceContext += `- Example Sentences (match this style): ${(brandVoice.examples as string[]).join(" | ")}\n`;
          voiceContext += `\nIMPORTANT VOICE RULES:\n1. Maintain the specified tone consistently throughout the entire article\n2. Use preferred vocabulary naturally in the content\n3. NEVER use any words from the avoid list\n4. Follow all brand rules strictly\n5. Match the writing style demonstrated in the example sentences`;
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
${icpContext}
${voiceContext}
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
});

export type AppRouter = typeof appRouter;
