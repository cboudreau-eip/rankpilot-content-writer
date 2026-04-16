import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
  return { ctx };
}

// Mock the db module to return controlled sitemap data
vi.mock("./db", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getSitemapsByProject: vi.fn(),
    getProjectById: vi.fn().mockResolvedValue(null),
  };
});

// Mock the LLM module to return controlled coverage results
vi.mock("./_core/llm", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    invokeLLM: vi.fn(),
  };
});

// Mock Claude LLM
vi.mock("./claude", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    invokeClaudeLLM: vi.fn(),
  };
});

import { getSitemapsByProject, getProjectById } from "./db";
import { invokeLLM } from "./_core/llm";

const mockedGetSitemaps = vi.mocked(getSitemapsByProject);
const mockedGetProjectById = vi.mocked(getProjectById);
const mockedInvokeLLM = vi.mocked(invokeLLM);

describe("sitemaps.checkCoverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws BAD_REQUEST when no sitemaps exist for the project", async () => {
    mockedGetSitemaps.mockResolvedValue([]);
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sitemaps.checkCoverage({ keyword: "Medicare Advantage", projectId: 1 })
    ).rejects.toThrow(/No sitemaps found/);
  });

  it("throws BAD_REQUEST when sitemaps have no parsed URLs", async () => {
    mockedGetSitemaps.mockResolvedValue([
      {
        id: 1,
        url: "https://example.com/sitemap.xml",
        parsedUrls: [],
        urlCount: 0,
        projectId: 1,
        lastParsed: new Date(),
        createdAt: new Date(),
      },
    ] as any);
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sitemaps.checkCoverage({ keyword: "Medicare Advantage", projectId: 1 })
    ).rejects.toThrow(/no parsed URLs/);
  });

  it("returns overlap results when LLM finds matching pages", async () => {
    mockedGetSitemaps.mockResolvedValue([
      {
        id: 1,
        url: "https://example.com/sitemap.xml",
        parsedUrls: [
          { url: "https://example.com/medicare-advantage-plans/", title: "Medicare Advantage Plans" },
          { url: "https://example.com/medicare-part-c/", title: "Medicare Part C" },
          { url: "https://example.com/about/", title: "About Us" },
        ],
        urlCount: 3,
        projectId: 1,
        lastParsed: new Date(),
        createdAt: new Date(),
      },
    ] as any);

    mockedInvokeLLM.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              totalScanned: 3,
              overlaps: [
                {
                  url: "https://example.com/medicare-advantage-plans/",
                  title: "Medicare Advantage Plans",
                  severity: "high",
                  recommendation: "Update existing page",
                  explanation: "This page directly covers Medicare Advantage plans, which would compete with the target keyword.",
                },
                {
                  url: "https://example.com/medicare-part-c/",
                  title: "Medicare Part C",
                  severity: "medium",
                  recommendation: "Differentiate angle",
                  explanation: "Medicare Part C is Medicare Advantage, so this page covers the same fundamental topic.",
                },
              ],
            }),
          },
        },
      ],
    } as any);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sitemaps.checkCoverage({
      keyword: "Medicare Advantage Explained",
      projectId: 1,
    });

    expect(result.totalScanned).toBe(3);
    expect(result.overlaps).toHaveLength(2);
    expect(result.highCount).toBe(1);
    expect(result.mediumCount).toBe(1);
    expect(result.overlaps[0].severity).toBe("high");
    expect(result.overlaps[0].recommendation).toBe("Update existing page");
    expect(result.overlaps[1].severity).toBe("medium");
  });

  it("returns zero overlaps when no pages match", async () => {
    mockedGetSitemaps.mockResolvedValue([
      {
        id: 1,
        url: "https://example.com/sitemap.xml",
        parsedUrls: [
          { url: "https://example.com/about/", title: "About Us" },
          { url: "https://example.com/contact/", title: "Contact" },
        ],
        urlCount: 2,
        projectId: 1,
        lastParsed: new Date(),
        createdAt: new Date(),
      },
    ] as any);

    mockedInvokeLLM.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              totalScanned: 2,
              overlaps: [],
            }),
          },
        },
      ],
    } as any);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sitemaps.checkCoverage({
      keyword: "Medicare Advantage Explained",
      projectId: 1,
    });

    expect(result.totalScanned).toBe(2);
    expect(result.overlaps).toHaveLength(0);
    expect(result.highCount).toBe(0);
    expect(result.mediumCount).toBe(0);
  });

  it("aggregates URLs from multiple sitemaps", async () => {
    mockedGetSitemaps.mockResolvedValue([
      {
        id: 1,
        url: "https://example.com/sitemap1.xml",
        parsedUrls: [
          { url: "https://example.com/page-1/" },
        ],
        urlCount: 1,
        projectId: 1,
        lastParsed: new Date(),
        createdAt: new Date(),
      },
      {
        id: 2,
        url: "https://example.com/sitemap2.xml",
        parsedUrls: [
          { url: "https://example.com/page-2/" },
          { url: "https://example.com/page-3/" },
        ],
        urlCount: 2,
        projectId: 1,
        lastParsed: new Date(),
        createdAt: new Date(),
      },
    ] as any);

    mockedInvokeLLM.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              totalScanned: 3,
              overlaps: [],
            }),
          },
        },
      ],
    } as any);

    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.sitemaps.checkCoverage({
      keyword: "Test Keyword",
      projectId: 1,
    });

    // Verify the LLM was called with all 3 URLs from both sitemaps
    expect(mockedInvokeLLM).toHaveBeenCalledTimes(1);
    const callArgs = mockedInvokeLLM.mock.calls[0][0];
    const userMessage = callArgs.messages.find((m: any) => m.role === "user");
    expect(userMessage?.content).toContain("3 total");
    expect(userMessage?.content).toContain("page-1");
    expect(userMessage?.content).toContain("page-2");
    expect(userMessage?.content).toContain("page-3");
    expect(result.totalScanned).toBe(3);
  });
});
