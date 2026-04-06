import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Mock outline response from LLM ----
const mockOutlineResponse = JSON.stringify({
  title: "Medicare Advantage Plans: Complete 2026 Guide to Coverage, Costs & Enrollment",
  sections: [
    {
      id: "s1",
      heading: "What Are Medicare Advantage Plans?",
      type: "h2",
      points: [
        "Define Medicare Advantage (Part C) clearly within the first 120 words",
        "Explain how Medicare Advantage differs from Original Medicare",
        "Mention CMS oversight and private insurer role",
      ],
      subSections: [
        {
          id: "s1-1",
          heading: "Types of Medicare Advantage Plans",
          type: "h3",
          points: [
            "Cover HMO, PPO, PFFS, and SNP plan types",
            "Include D-SNP and MAPD as supporting entities",
          ],
        },
      ],
    },
    {
      id: "s2",
      heading: "Medicare Advantage Costs and Premiums in 2026",
      type: "h2",
      points: [
        "Break down monthly premiums, copays, and out-of-pocket maximums",
        "Compare costs to Original Medicare + Medigap",
      ],
      subSections: [],
    },
    {
      id: "s3",
      heading: "Frequently Asked Questions About Medicare Advantage",
      type: "h2",
      points: [
        "What is the appeals process for Medicare Advantage?",
        "How do star ratings affect plan quality?",
        "Can I switch from Medicare Advantage to Original Medicare?",
        "What is the Medicare Advantage enrollment period?",
        "Are prescription drugs covered by Medicare Advantage?",
      ],
      subSections: [],
    },
  ],
});

// ---- Mock entity analysis input ----
const mockEntityAnalysis = {
  primaryEntity: {
    name: "Medicare Advantage",
    type: "Government Program",
    justification: "Central topic of the article",
  },
  entities: [
    { name: "Medicare Advantage", type: "Program", prominence: "High" as const, rationale: "Main subject" },
    { name: "CMS", type: "Organization", prominence: "Medium" as const, rationale: "Regulatory body" },
    { name: "Part C", type: "Concept", prominence: "Medium" as const, rationale: "Alternate name" },
  ],
  salienceStructure: {
    dominanceGap: { grade: "Strong dominance", description: "Medicare Advantage clearly dominates" },
    earlyReinforcement: { inFirstParagraph: true, inHeading: true, withinFirst120Words: true, summary: "Well reinforced" },
    entityDrift: { level: "No drift", description: "Stays on topic" },
  },
  supportingCoverage: {
    grade: "Comprehensive",
    relatedSubEntities: ["Part C", "HMO", "PPO"],
    missingComponents: ["appeals process"],
    evaluation: "Good coverage",
  },
  geoExtractability: {
    grade: "Moderate",
    hasConcisenDefinitions: false,
    hasClearQuestionAnswering: false,
    hasShortAnswerSummary: true,
    hasCleanHeadings: true,
    evaluation: "Needs better definitions and Q&A format",
  },
  scores: {
    primaryEntityClarity: 85,
    entityFocus: 80,
    supportingCoverage: 65,
    geoExtractability: 60,
    overallScore: 72.5,
  },
  actionableFixes: [
    "Add concise definitions for Medicare Advantage",
    "Include FAQ section with clear Q&A format",
    "Add missing supporting entities: MAPD, SNP, D-SNP",
    "Strengthen intro paragraph with entity in first 120 words",
  ],
  advancedRecommendations: {
    refinedPrimaryEntity: "Medicare Advantage Plans",
    refinedEntityRationale: "More specific framing",
    suggestedTitleRewrite: "Medicare Advantage Plans: Complete 2026 Guide",
    missingSupportingEntities: ["MAPD", "SNP", "D-SNP"],
  },
};

// ---- Mock db module ----
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getProjectsByUserId: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockResolvedValue({
    id: 1, name: "Test Project", llmProvider: "builtin", llmModel: null,
    icpPrimaryName: "Medicare Beneficiaries",
    icpWhoTheyAre: "Adults 65+ enrolling in Medicare",
    icpPains: ["Confusing plan options", "High out-of-pocket costs"],
    icpGoals: ["Find affordable coverage", "Understand benefits"],
    icpObjections: ["Too many plan choices", "Network restrictions"],
    icpDecisionTriggers: ["Turning 65", "Annual enrollment period"],
    icpTrustSignals: ["CMS star ratings", "Expert reviews"],
  }),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  getArticleById: vi.fn(),
  getArticlesByProject: vi.fn().mockResolvedValue([]),
  getArticlesByUser: vi.fn().mockResolvedValue([]),
  getArticleStats: vi.fn().mockResolvedValue({}),
  getOutlinesByProject: vi.fn().mockResolvedValue([]),
  getOutlinesByUser: vi.fn().mockResolvedValue([]),
  getOutlineById: vi.fn(),
  createOutline: vi.fn().mockResolvedValue({
    id: 42,
    title: "Medicare Advantage Plans: Complete 2026 Guide to Coverage, Costs & Enrollment",
    keyword: "Medicare Advantage",
    sections: [
      { id: "s1", heading: "What Are Medicare Advantage Plans?", type: "h2", points: ["Define Medicare Advantage"], subSections: [] },
      { id: "s2", heading: "Costs and Premiums", type: "h2", points: ["Break down costs"], subSections: [] },
      { id: "s3", heading: "FAQ", type: "h2", points: ["Common questions"], subSections: [] },
    ],
    settings: {},
    projectId: 1,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateOutline: vi.fn(),
  deleteOutline: vi.fn(),
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
  deleteArticle: vi.fn(),
  getICPsByProject: vi.fn().mockResolvedValue([]),
  getICPById: vi.fn(),
  createICP: vi.fn(),
  updateICP: vi.fn(),
  deleteICP: vi.fn(),
  getBrandVoicesByProject: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Professional",
      isDefault: 1,
      toneTraits: "Authoritative, clear, empathetic",
      perspective: "second",
      sentenceStyle: "mixed",
      avoidList: "PRESETS:jargon,salesy|CUSTOM:",
      writingStyleSample: null,
      projectId: 1,
    },
  ]),
  getBrandVoiceById: vi.fn(),
  createBrandVoice: vi.fn(),
  updateBrandVoice: vi.fn(),
  deleteBrandVoice: vi.fn(),
  getCTAsByProject: vi.fn().mockResolvedValue([]),
  getCTAById: vi.fn(),
  createCTA: vi.fn(),
  updateCTA: vi.fn(),
  deleteCTA: vi.fn(),
  getSitemapsByProject: vi.fn().mockResolvedValue([]),
  getSitemapById: vi.fn(),
  createSitemap: vi.fn(),
  updateSitemap: vi.fn(),
  deleteSitemap: vi.fn(),
  getCitationsByProject: vi.fn().mockResolvedValue([]),
  getCitationById: vi.fn(),
  createCitation: vi.fn(),
  updateCitation: vi.fn(),
  deleteCitation: vi.fn(),
  updateProjectReferenceDocMeta: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test", url: "https://cdn.example.com/test" }),
  storageGet: vi.fn().mockResolvedValue({ key: "test", url: "https://cdn.example.com/test" }),
}));

// ---- Mock LLM ----
let llmMockResponse = mockOutlineResponse;

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockImplementation(async () => ({
    choices: [{ message: { content: llmMockResponse } }],
  })),
}));

vi.mock("./claude", () => ({
  invokeClaudeLLM: vi.fn().mockImplementation(async () => ({
    choices: [{ message: { content: llmMockResponse } }],
  })),
}));

vi.mock("./sitemap-parser", () => ({
  parseSitemap: vi.fn().mockResolvedValue([]),
}));

vi.mock("./applyBackgroundColors", () => ({
  applyBackgroundColors: vi.fn((html: string) => html),
}));

vi.mock("./applyTemplateStyles", () => ({
  applyTemplateStyles: vi.fn((html: string) => html),
}));

// ---- Auth context ----
type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

beforeEach(() => {
  llmMockResponse = mockOutlineResponse;
});

// ---- Tests ----

describe("entity.generateOutlineFromAnalysis", () => {
  it("generates an outline from entity analysis data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entity.generateOutlineFromAnalysis({
      entityAnalysis: mockEntityAnalysis,
      keyword: "Medicare Advantage",
      projectId: 1,
    });

    expect(result).toBeDefined();
    expect(result.id).toBe(42);
    expect(result.title).toContain("Medicare Advantage");
    expect(result.sections).toHaveLength(3);
    expect(result.keyword).toBe("Medicare Advantage");
  });

  it("passes brand voice and ICP to the outline generation", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as any).mockClear();
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.entity.generateOutlineFromAnalysis({
      entityAnalysis: mockEntityAnalysis,
      keyword: "Medicare Advantage",
      projectId: 1,
    });

    // Verify LLM was called with entity context in the system prompt
    expect(invokeLLM).toHaveBeenCalled();
    const calls = (invokeLLM as any).mock.calls;
    const callArgs = calls[calls.length - 1][0];
    const systemPrompt = callArgs.messages[0].content;

    // Should include entity analysis data
    expect(systemPrompt).toContain("Medicare Advantage Plans"); // refined primary entity
    expect(systemPrompt).toContain("ENTITY & SALIENCE ANALYSIS RESULTS");
    expect(systemPrompt).toContain("ACTIONABLE FIXES");

    // Should include ICP data from project
    expect(systemPrompt).toContain("Medicare Beneficiaries");
    expect(systemPrompt).toContain("IDEAL CUSTOMER PROFILE");

    // Should include brand voice
    expect(systemPrompt).toContain("BRAND VOICE GUIDELINES");
    expect(systemPrompt).toContain("Authoritative, clear, empathetic");
  });

  it("includes semantic analysis when provided", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as any).mockClear();
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.entity.generateOutlineFromAnalysis({
      entityAnalysis: mockEntityAnalysis,
      semanticAnalysis: {
        targetKeyword: "Medicare Advantage",
        coverage: {
          coveredTopics: ["enrollment", "costs"],
          missingTopics: ["appeals process", "star ratings"],
          expectedTopics: ["enrollment", "costs", "appeals process", "star ratings"],
          evaluation: "Missing key topics",
        },
        semanticFixes: ["Add appeals process section", "Include star ratings"],
      },
      keyword: "Medicare Advantage",
      projectId: 1,
    });

    const calls = (invokeLLM as any).mock.calls;
    const callArgs = calls[calls.length - 1][0];
    const systemPrompt = callArgs.messages[0].content;

    expect(systemPrompt).toContain("SEMANTIC ANALYSIS RESULTS");
    expect(systemPrompt).toContain("appeals process");
    expect(systemPrompt).toContain("star ratings");
  });

  it("saves the outline to the database via createOutline", async () => {
    const { createOutline } = await import("./db");
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.entity.generateOutlineFromAnalysis({
      entityAnalysis: mockEntityAnalysis,
      keyword: "Medicare Advantage",
      projectId: 1,
      targetWordCount: 3000,
      numSections: 10,
      numFaqs: 7,
    });

    expect(createOutline).toHaveBeenCalledWith(
      expect.objectContaining({
        keyword: "Medicare Advantage",
        projectId: 1,
        userId: 1,
        title: expect.any(String),
        sections: expect.any(Array),
        settings: expect.objectContaining({
          targetWordCount: 3000,
          numSections: 10,
          numFaqs: 7,
        }),
      })
    );
  });

  it("rejects when keyword is empty", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.entity.generateOutlineFromAnalysis({
        entityAnalysis: mockEntityAnalysis,
        keyword: "",
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("uses default values for optional parameters", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as any).mockClear();
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.entity.generateOutlineFromAnalysis({
      entityAnalysis: mockEntityAnalysis,
      keyword: "Medicare Advantage",
      projectId: 1,
    });

    const calls = (invokeLLM as any).mock.calls;
    const callArgs = calls[calls.length - 1][0];
    const systemPrompt = callArgs.messages[0].content;

    // Should use defaults: 8 sections, 5 FAQs, 2000 words
    expect(systemPrompt).toContain("8 main H2 sections");
    expect(systemPrompt).toContain("5 questions");
    expect(systemPrompt).toContain("2000 words");
  });

  it("uses the refined primary entity name in the prompt", async () => {
    const { invokeLLM } = await import("./_core/llm");
    (invokeLLM as any).mockClear();
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.entity.generateOutlineFromAnalysis({
      entityAnalysis: mockEntityAnalysis,
      keyword: "Medicare Advantage",
      projectId: 1,
    });

    const calls = (invokeLLM as any).mock.calls;
    const callArgs = calls[calls.length - 1][0];
    const systemPrompt = callArgs.messages[0].content;

    // Should use the refined entity name "Medicare Advantage Plans" not just "Medicare Advantage"
    expect(systemPrompt).toContain("Medicare Advantage Plans");
  });
});
