import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Mock LLM responses ----

const mockEntityResponse = JSON.stringify({
  primaryEntity: {
    name: "Medicare Advantage",
    type: "Government Program",
    justification: "Central topic of the article",
  },
  entities: [
    { name: "Medicare Advantage", type: "Program", prominence: "High", rationale: "Main subject" },
    { name: "CMS", type: "Organization", prominence: "Medium", rationale: "Regulatory body" },
    { name: "Part C", type: "Concept", prominence: "Medium", rationale: "Alternate name" },
  ],
  salienceStructure: {
    dominanceGap: { grade: "Strong dominance", description: "Medicare Advantage clearly dominates" },
    earlyReinforcement: { inFirstParagraph: true, inHeading: true, withinFirst120Words: true, summary: "Well reinforced" },
    entityDrift: { level: "No drift", description: "Stays on topic" },
  },
  supportingCoverage: {
    grade: "Comprehensive",
    relatedSubEntities: ["Part C", "HMO", "PPO"],
    missingComponents: [],
    evaluation: "Good coverage",
  },
  geoExtractability: {
    grade: "High",
    hasConcisenDefinitions: true,
    hasClearQuestionAnswering: true,
    hasShortAnswerSummary: true,
    hasCleanHeadings: true,
    evaluation: "Well structured for AI extraction",
  },
  scores: {
    primaryEntityClarity: 85,
    entityFocus: 80,
    supportingCoverage: 75,
    geoExtractability: 90,
    overallScore: 82.5,
  },
  actionableFixes: [
    "Fix 1: Add more entity mentions in middle sections",
    "Fix 2: Include comparison table",
    "Fix 3: Add FAQ section",
    "Fix 4: Strengthen intro paragraph",
    "Fix 5: Add structured data markup",
  ],
  advancedRecommendations: {
    refinedPrimaryEntity: "Medicare Advantage Plans",
    refinedEntityRationale: "More specific framing",
    suggestedTitleRewrite: "Medicare Advantage Plans: Complete 2026 Guide",
    missingSupportingEntities: ["MAPD", "SNP", "D-SNP"],
  },
});

const mockSemanticResponse = JSON.stringify({
  targetKeyword: "Medicare Advantage",
  relevance: {
    score: 78,
    introRelevance: 85,
    headingsRelevance: 70,
    bodyRelevance: 80,
    evaluation: "Good overall relevance",
  },
  redundancy: {
    score: 15,
    redundantPairs: [
      {
        sectionA: "What is Medicare Advantage",
        sectionB: "Understanding Part C",
        similarity: "Moderate",
        explanation: "Both cover the same definition",
      },
    ],
    overallAssessment: "Low redundancy overall",
    uniquenessScore: 85,
  },
  coverage: {
    score: 72,
    coveredTopics: ["enrollment", "costs", "benefits"],
    missingTopics: ["appeals process", "star ratings"],
    expectedTopics: ["enrollment", "costs", "benefits", "appeals process", "star ratings"],
    evaluation: "Good but missing some topics",
  },
  sections: [
    {
      heading: "What is Medicare Advantage",
      headingLevel: "H2",
      relevanceScore: 90,
      relevanceExplanation: "Directly addresses the keyword",
      overlapsWith: ["Understanding Part C"],
      overlapSeverity: "Moderate",
      uniqueValue: "Provides the core definition",
    },
  ],
  scores: {
    relevance: 78,
    coverage: 72,
    uniqueness: 85,
    overallSemantic: 77.45,
  },
  semanticFixes: [
    "Fix 1: Add appeals process section",
    "Fix 2: Include star ratings coverage",
    "Fix 3: Merge redundant definition sections",
    "Fix 4: Strengthen heading alignment",
    "Fix 5: Add enrollment timeline details",
  ],
});

// ---- Mock db module ----
const mockArticle = {
  id: 1,
  title: "Medicare Advantage Guide",
  keyword: "Medicare Advantage",
  content: "<h1>Medicare Advantage</h1><p>" + "Medicare Advantage is a type of health plan offered by private companies. ".repeat(10) + "</p>",
  projectId: 1,
  userId: 1,
  status: "published",
  createdAt: new Date(),
  updatedAt: new Date(),
};

vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getProjectsByUserId: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockResolvedValue({
    id: 1, name: "Test", llmProvider: "builtin", llmModel: null,
  }),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  getArticleById: vi.fn().mockImplementation(async (id: number) => {
    if (id === 1) return { ...mockArticle };
    if (id === 99) return null;
    if (id === 2) return { ...mockArticle, id: 2, keyword: null, content: "<p>Short</p>" };
    if (id === 3) return { ...mockArticle, id: 3, keyword: null, content: "<p>" + "Some content here. ".repeat(20) + "</p>" };
    return null;
  }),
  getArticlesByProject: vi.fn().mockResolvedValue([]),
  getArticlesByUser: vi.fn().mockResolvedValue([]),
  getArticleStats: vi.fn().mockResolvedValue({}),
  getOutlinesByProject: vi.fn().mockResolvedValue([]),
  getOutlinesByUser: vi.fn().mockResolvedValue([]),
  getOutlineById: vi.fn(),
  createOutline: vi.fn(),
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
  getBrandVoicesByProject: vi.fn().mockResolvedValue([]),
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
let llmMockResponse = mockEntityResponse;

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
  llmMockResponse = mockEntityResponse;
});

// ---- Tests ----

describe("entity.analyzeContent", () => {
  it("returns entity analysis result for pasted text", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entity.analyzeContent({
      content: "Medicare Advantage is a type of health plan. ".repeat(5),
      primaryKeyword: "Medicare Advantage",
    });

    expect(result.primaryEntity.name).toBe("Medicare Advantage");
    expect(result.entities).toHaveLength(3);
    expect(result.scores.overallScore).toBe(82.5);
    expect(result.actionableFixes).toHaveLength(5);
    expect(result.salienceStructure.dominanceGap.grade).toBe("Strong dominance");
  });

  it("rejects content shorter than 50 characters", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.entity.analyzeContent({ content: "Too short" })
    ).rejects.toThrow();
  });

  it("works without a primary keyword", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entity.analyzeContent({
      content: "Medicare Advantage is a type of health plan. ".repeat(5),
    });

    expect(result.primaryEntity.name).toBeDefined();
  });
});

describe("entity.analyzeArticle", () => {
  it("analyzes an existing article by ID", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entity.analyzeArticle({ articleId: 1 });

    expect(result.primaryEntity.name).toBe("Medicare Advantage");
    expect(result.scores).toBeDefined();
  });

  it("throws for non-existent article", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.entity.analyzeArticle({ articleId: 99 })
    ).rejects.toThrow("Article not found");
  });

  it("throws for article with too-short content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.entity.analyzeArticle({ articleId: 2 })
    ).rejects.toThrow("Article content is too short");
  });
});

describe("entity.analyzeSemantic", () => {
  it("returns semantic analysis for pasted text", async () => {
    llmMockResponse = mockSemanticResponse;
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entity.analyzeSemantic({
      content: "Medicare Advantage is a type of health plan. ".repeat(5),
      targetKeyword: "Medicare Advantage",
    });

    expect(result.targetKeyword).toBe("Medicare Advantage");
    expect(result.scores.overallSemantic).toBeCloseTo(77.45, 1);
    expect(result.semanticFixes).toHaveLength(5);
    expect(result.sections).toHaveLength(1);
    expect(result.redundancy.redundantPairs).toHaveLength(1);
  });

  it("requires a target keyword", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.entity.analyzeSemantic({
        content: "Medicare Advantage is a type of health plan. ".repeat(5),
        targetKeyword: "",
      })
    ).rejects.toThrow();
  });
});

describe("entity.analyzeArticleSemantic", () => {
  it("analyzes an existing article semantically", async () => {
    llmMockResponse = mockSemanticResponse;
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entity.analyzeArticleSemantic({ articleId: 1 });

    expect(result.targetKeyword).toBe("Medicare Advantage");
    expect(result.scores).toBeDefined();
  });

  it("throws for article without keyword", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.entity.analyzeArticleSemantic({ articleId: 3 })
    ).rejects.toThrow("Article has no keyword set");
  });

  it("throws for non-existent article", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.entity.analyzeArticleSemantic({ articleId: 99 })
    ).rejects.toThrow("Article not found");
  });
});
