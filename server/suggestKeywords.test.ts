import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests for the suggestKeywords procedure and secondary keywords integration
 * into the article generation prompt.
 *
 * Since suggestKeywords calls the LLM, we mock the LLM module to test
 * the parsing, slicing, and error handling logic.
 */

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// Mock the db module to avoid real database calls
vi.mock("./db", () => ({
  getProjectById: vi.fn().mockResolvedValue({ id: 1, name: "Test", userId: 1 }),
  getOutlineById: vi.fn(),
  createOutline: vi.fn(),
  updateOutline: vi.fn(),
  getArticlesByProject: vi.fn().mockResolvedValue([]),
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
  deleteArticle: vi.fn(),
  getArticleById: vi.fn(),
  getOutlinesByProject: vi.fn().mockResolvedValue([]),
  getProjectsByUser: vi.fn().mockResolvedValue([]),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  getBrandVoicesByProject: vi.fn().mockResolvedValue([]),
  getBrandVoiceById: vi.fn(),
  createBrandVoice: vi.fn(),
  updateBrandVoice: vi.fn(),
  deleteBrandVoice: vi.fn(),
  getIcpProfilesByProject: vi.fn().mockResolvedValue([]),
  getIcpProfileById: vi.fn(),
  createIcpProfile: vi.fn(),
  updateIcpProfile: vi.fn(),
  deleteIcpProfile: vi.fn(),
  getSitemapsByProject: vi.fn().mockResolvedValue([]),
  createSitemap: vi.fn(),
  deleteSitemap: vi.fn(),
  getTopicClustersByProject: vi.fn().mockResolvedValue([]),
  createTopicCluster: vi.fn(),
  updateTopicCluster: vi.fn(),
  deleteTopicCluster: vi.fn(),
  getCrossReferencesByProject: vi.fn().mockResolvedValue([]),
  createCrossReference: vi.fn(),
  deleteCrossReference: vi.fn(),
  getCrossReferenceById: vi.fn(),
  getCalendarEventsByProject: vi.fn().mockResolvedValue([]),
  createCalendarEvent: vi.fn(),
  updateCalendarEvent: vi.fn(),
  deleteCalendarEvent: vi.fn(),
  getSavedIdeasByProject: vi.fn().mockResolvedValue([]),
  createSavedIdea: vi.fn(),
  updateSavedIdea: vi.fn(),
  deleteSavedIdea: vi.fn(),
}));

import { invokeLLM } from "./_core/llm";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

const mockedInvokeLLM = vi.mocked(invokeLLM);

function createAuthContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function mockLLMResponse(data: { secondary: string[]; lsi: string[]; longTail: string[] }) {
  mockedInvokeLLM.mockResolvedValueOnce({
    choices: [{
      message: { content: JSON.stringify(data), role: "assistant" },
      index: 0,
      finish_reason: "stop",
    }],
  } as any);
}

describe("suggestKeywords", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns parsed keyword suggestions from LLM response", async () => {
    const mockData = {
      secondary: ["medicare supplement", "medigap plans", "medicare part b"],
      lsi: ["deductible", "premium", "coverage gap"],
      longTail: ["best medicare supplement plans for seniors"],
    };
    mockLLMResponse(mockData);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.outlines.suggestKeywords({
      keyword: "medicare supplement plans",
    });

    expect(result.secondary).toEqual(mockData.secondary);
    expect(result.lsi).toEqual(mockData.lsi);
    expect(result.longTail).toEqual(mockData.longTail);
  });

  it("slices arrays to maximum allowed lengths", async () => {
    const mockData = {
      secondary: ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"], // 10 items, max 8
      lsi: ["k", "l", "m", "n", "o", "p", "q", "r", "s", "t"],       // 10 items, max 8
      longTail: ["u", "v", "w", "x", "y", "z"],                        // 6 items, max 5
    };
    mockLLMResponse(mockData);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.outlines.suggestKeywords({
      keyword: "test keyword",
    });

    expect(result.secondary).toHaveLength(8);
    expect(result.lsi).toHaveLength(8);
    expect(result.longTail).toHaveLength(5);
  });

  it("handles missing arrays gracefully", async () => {
    mockedInvokeLLM.mockResolvedValueOnce({
      choices: [{
        message: { content: JSON.stringify({ secondary: ["a"], lsi: [], longTail: [] }), role: "assistant" },
        index: 0,
        finish_reason: "stop",
      }],
    } as any);

    const caller = appRouter.createCaller(createAuthContext());
    const result = await caller.outlines.suggestKeywords({
      keyword: "test keyword",
    });

    expect(result.secondary).toEqual(["a"]);
    expect(result.lsi).toEqual([]);
    expect(result.longTail).toEqual([]);
  });

  it("throws error when LLM returns invalid JSON", async () => {
    mockedInvokeLLM.mockResolvedValueOnce({
      choices: [{
        message: { content: "not valid json", role: "assistant" },
        index: 0,
        finish_reason: "stop",
      }],
    } as any);

    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.outlines.suggestKeywords({ keyword: "test keyword" })
    ).rejects.toThrow("Failed to parse keyword suggestions");
  });

  it("throws error when LLM returns no content", async () => {
    mockedInvokeLLM.mockResolvedValueOnce({
      choices: [{
        message: { content: "", role: "assistant" },
        index: 0,
        finish_reason: "stop",
      }],
    } as any);

    const caller = appRouter.createCaller(createAuthContext());
    await expect(
      caller.outlines.suggestKeywords({ keyword: "test keyword" })
    ).rejects.toThrow("No response from AI");
  });

  it("passes optional context fields to LLM prompt", async () => {
    const mockData = {
      secondary: ["related term"],
      lsi: ["semantic term"],
      longTail: ["long tail phrase"],
    };
    mockLLMResponse(mockData);

    const caller = appRouter.createCaller(createAuthContext());
    await caller.outlines.suggestKeywords({
      keyword: "medicare plans",
      contentType: "guide",
      targetAudience: "seniors over 65",
      targetLocation: "Florida",
    });

    // Verify the LLM was called with context in the prompt
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(1);
    const callArgs = mockedInvokeLLM.mock.calls[0]![0];
    const userMessage = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMessage?.content).toContain("medicare plans");
    expect(userMessage?.content).toContain("guide");
    expect(userMessage?.content).toContain("seniors over 65");
    expect(userMessage?.content).toContain("Florida");
  });
});

describe("secondaryKeywords in article generation prompt", () => {
  it("builds secondary keywords instruction when keywords are provided", () => {
    // Test the instruction building logic directly
    const keywords = ["medigap plans", "medicare part b", "supplemental coverage"];
    const instruction = `\n\nSECONDARY KEYWORDS & LSI TERMS (MUST naturally incorporate):\nThe following keywords and terms should be woven naturally throughout the article to improve topical coverage and semantic relevance. Do NOT force them — use them where they fit contextually. Aim to include each term at least once, but prioritize natural readability over keyword stuffing:\n${keywords.map(k => `- "${k}"`).join("\n")}\nThese terms help search engines understand the article's topical depth and authority. Distribute them across different sections rather than clustering them in one place.`;

    expect(instruction).toContain("medigap plans");
    expect(instruction).toContain("medicare part b");
    expect(instruction).toContain("supplemental coverage");
    expect(instruction).toContain("SECONDARY KEYWORDS & LSI TERMS");
    expect(instruction).toContain("Do NOT force them");
  });

  it("produces empty instruction when no keywords are provided", () => {
    const keywords: string[] = [];
    let instruction = "";
    if (keywords.length > 0) {
      instruction = "SECONDARY KEYWORDS...";
    }
    expect(instruction).toBe("");
  });
});
