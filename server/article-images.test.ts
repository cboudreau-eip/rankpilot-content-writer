import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Mock LLM responses ----

const mockSuggestionsResponse = JSON.stringify({
  images: [
    {
      afterHeading: "What is SEO",
      prompt: "A clean infographic showing search engine optimization workflow with arrows connecting keyword research, on-page optimization, and link building",
      altText: "SEO workflow infographic showing the three main pillars of search engine optimization",
    },
    {
      afterHeading: "Benefits of Content Marketing",
      prompt: "A modern illustration of content marketing funnel with blog posts, social media, and email at different stages",
      altText: "Content marketing funnel illustration showing different content types at each stage",
    },
  ],
});

const mockEmptySuggestionsResponse = JSON.stringify({ images: [] });

// ---- Mock article ----
const mockArticle = {
  id: 1,
  title: "SEO Guide",
  keyword: "SEO",
  content: '<h1>SEO Guide</h1><h2>What is SEO</h2><p>SEO stands for search engine optimization. ' +
    'It is the practice of optimizing websites. '.repeat(10) +
    '</p><h2>Benefits of Content Marketing</h2><p>Content marketing helps. '.repeat(10) + '</p>',
  projectId: 1,
  userId: 1,
  status: "published",
  wordCount: 200,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockArticleWithImage = {
  ...mockArticle,
  id: 2,
  content: '<h1>SEO Guide</h1><h2>What is SEO</h2>' +
    '<figure class="ai-generated-image" data-prompt="old prompt" style="margin: 24px 0; text-align: center;">' +
    '<img src="https://cdn.example.com/old-image.png" alt="Old alt text" style="max-width: 100%;" />' +
    '<figcaption style="font-size: 0.85em;">Old alt text</figcaption></figure>' +
    '<p>SEO content here. '.repeat(10) + '</p>',
};

// ---- Mock db module ----
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
    if (id === 2) return { ...mockArticleWithImage };
    if (id === 99) return null;
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
let llmMockResponse = mockSuggestionsResponse;

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

// ---- Mock image generation ----
vi.mock("./_core/imageGeneration", () => ({
  generateImage: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/generated-image.png" }),
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
  llmMockResponse = mockSuggestionsResponse;
  vi.clearAllMocks();
});

// ---- Tests ----

describe("articleImages.generate", () => {
  it("generates an image from a prompt and returns the URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.articleImages.generate({
      prompt: "A clean infographic about SEO",
      altText: "SEO infographic",
    });

    expect(result.url).toBe("https://cdn.example.com/generated-image.png");
    expect(result.prompt).toBe("A clean infographic about SEO");
    expect(result.altText).toBe("SEO infographic");
  });

  it("works without altText", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.articleImages.generate({
      prompt: "A diagram of content marketing",
    });

    expect(result.url).toBe("https://cdn.example.com/generated-image.png");
    expect(result.altText).toBe("");
  });

  it("rejects empty prompt", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articleImages.generate({ prompt: "" })
    ).rejects.toThrow();
  });
});

describe("articleImages.suggestPlacements", () => {
  it("returns image placement suggestions for an article", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.articleImages.suggestPlacements({
      articleId: 1,
    });

    expect(result.suggestions).toHaveLength(2);
    expect(result.suggestions[0].afterHeading).toBe("What is SEO");
    expect(result.suggestions[0].prompt).toContain("infographic");
    expect(result.suggestions[0].altText).toBeTruthy();
    expect(result.suggestions[1].afterHeading).toBe("Benefits of Content Marketing");
  });

  it("throws when article not found", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articleImages.suggestPlacements({ articleId: 99 })
    ).rejects.toThrow("Article not found");
  });

  it("returns empty suggestions when LLM returns empty list", async () => {
    llmMockResponse = mockEmptySuggestionsResponse;
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.articleImages.suggestPlacements({
      articleId: 1,
    });

    expect(result.suggestions).toHaveLength(0);
  });

  it("returns empty suggestions when LLM returns unparseable JSON", async () => {
    llmMockResponse = "not valid json at all";
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.articleImages.suggestPlacements({
      articleId: 1,
    });

    expect(result.suggestions).toHaveLength(0);
  });
});

describe("articleImages.regenerate", () => {
  it("regenerates an image and updates article content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const { updateArticle } = await import("./db");

    const result = await caller.articleImages.regenerate({
      articleId: 2,
      oldImageUrl: "https://cdn.example.com/old-image.png",
      newPrompt: "A new modern SEO infographic",
    });

    expect(result.url).toBe("https://cdn.example.com/generated-image.png");
    expect(result.prompt).toBe("A new modern SEO infographic");
    expect(result.articleId).toBe(2);
    expect(updateArticle).toHaveBeenCalledWith(2, expect.objectContaining({
      content: expect.any(String),
    }));
  });

  it("throws when article not found", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articleImages.regenerate({
        articleId: 99,
        oldImageUrl: "https://cdn.example.com/old-image.png",
        newPrompt: "New prompt",
      })
    ).rejects.toThrow("Article not found");
  });
});

describe("articleImages.remove", () => {
  it("removes an image figure from article content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const { updateArticle } = await import("./db");

    const result = await caller.articleImages.remove({
      articleId: 2,
      imageUrl: "https://cdn.example.com/old-image.png",
    });

    expect(result.success).toBe(true);
    expect(result.articleId).toBe(2);
    // Verify updateArticle was called with content that no longer contains the image
    expect(updateArticle).toHaveBeenCalledWith(2, expect.objectContaining({
      content: expect.not.stringContaining("https://cdn.example.com/old-image.png"),
    }));
  });

  it("throws when article not found", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articleImages.remove({
        articleId: 99,
        imageUrl: "https://cdn.example.com/old-image.png",
      })
    ).rejects.toThrow("Article not found");
  });

  it("still succeeds even when image URL is not in content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.articleImages.remove({
      articleId: 1,
      imageUrl: "https://cdn.example.com/nonexistent.png",
    });

    expect(result.success).toBe(true);
  });
});
