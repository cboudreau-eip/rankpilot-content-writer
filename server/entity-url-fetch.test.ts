import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Mock HTML responses ----
const mockArticleHtml = `
<!DOCTYPE html>
<html>
<head><title>Medicare Advantage Plans Guide 2026</title></head>
<body>
  <nav><a href="/">Home</a><a href="/about">About</a></nav>
  <main>
    <article>
      <h1>Medicare Advantage Plans: Complete Guide for 2026</h1>
      <p>Medicare Advantage (Part C) plans are an alternative to Original Medicare offered by private insurance companies approved by Medicare. These plans provide all Part A and Part B benefits, and most include prescription drug coverage (Part D).</p>
      <h2>Types of Medicare Advantage Plans</h2>
      <p>There are several types of Medicare Advantage plans available, including HMO plans, PPO plans, Private Fee-for-Service (PFFS) plans, and Special Needs Plans (SNPs). Each type has different rules about how you get services.</p>
      <h2>Costs and Premiums</h2>
      <p>Medicare Advantage plan costs vary widely. Most plans charge a monthly premium in addition to your Part B premium. Out-of-pocket maximums protect you from catastrophic costs, with the 2026 limit set at $8,850 for in-network services.</p>
      <h2>Enrollment Periods</h2>
      <p>You can enroll in a Medicare Advantage plan during the Annual Enrollment Period (AEP) from October 15 to December 7, or during the Medicare Advantage Open Enrollment Period from January 1 to March 31.</p>
    </article>
  </main>
  <footer><p>Copyright 2026</p></footer>
</body>
</html>`;

const mockMinimalHtml = `
<html><body><p>Short page</p></body></html>`;

// ---- Mock fetch ----
let mockFetchResponse = { ok: true, status: 200, text: async () => mockArticleHtml, headers: new Map([["content-type", "text/html"]]) };

vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => mockFetchResponse));

// ---- Mock db module ----
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getProjectsByUserId: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn(),
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

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "{}" } }],
  }),
}));

vi.mock("./claude", () => ({
  invokeClaudeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "{}" } }],
  }),
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
  vi.clearAllMocks();
  mockFetchResponse = { ok: true, status: 200, text: async () => mockArticleHtml, headers: new Map([["content-type", "text/html"]]) };
});

// ---- Tests ----

describe("entity.fetchUrlContent", () => {
  it("fetches and extracts main article content from a URL", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entity.fetchUrlContent({
      url: "https://example.com/medicare-advantage-guide",
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(result.content.length).toBeGreaterThan(50);
    expect(result.title).toBeDefined();
    expect(result.url).toBe("https://example.com/medicare-advantage-guide");
    expect(result.wordCount).toBeGreaterThan(0);
    expect(result.extractionMethod).toBeDefined();
  });

  it("extracts the article title correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entity.fetchUrlContent({
      url: "https://example.com/test-article",
    });

    // Should extract title from the HTML
    expect(result.title).toBeTruthy();
    expect(typeof result.title).toBe("string");
  });

  it("strips navigation, footer, and sidebar content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entity.fetchUrlContent({
      url: "https://example.com/test-article",
    });

    // The extracted content should focus on article body, not nav/footer
    expect(result.content).toContain("Medicare Advantage");
    // Nav links and footer should be stripped by Readability
    expect(result.content).not.toContain("Copyright 2026");
  });

  it("rejects invalid URLs", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.entity.fetchUrlContent({ url: "not-a-valid-url" })
    ).rejects.toThrow();
  });

  it("rejects empty URLs", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.entity.fetchUrlContent({ url: "" })
    ).rejects.toThrow();
  });

  it("handles fetch failures gracefully", async () => {
    mockFetchResponse = { ok: false, status: 404, text: async () => "Not Found", headers: new Map([["content-type", "text/html"]]) };
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.entity.fetchUrlContent({ url: "https://example.com/missing-page" })
    ).rejects.toThrow();
  });

  it("returns word count for the extracted content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.entity.fetchUrlContent({
      url: "https://example.com/test-article",
    });

    expect(result.wordCount).toBeGreaterThan(10);
    expect(typeof result.wordCount).toBe("number");
  });
});
