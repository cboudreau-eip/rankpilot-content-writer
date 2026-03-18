import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-open-id",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
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

function createUnauthContext(): { ctx: TrpcContext } {
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

// ---- Sitemaps Router Tests ----
describe("sitemaps router", () => {
  it("sitemaps.list requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.sitemaps.list({ projectId: 1 })).rejects.toThrow();
  });

  it("sitemaps.create requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.sitemaps.create({ url: "https://example.com/sitemap.xml", projectId: 1 })
    ).rejects.toThrow();
  });

  it("sitemaps.create validates URL format", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Invalid URL should fail validation
    await expect(
      caller.sitemaps.create({ url: "not-a-url", projectId: 1 })
    ).rejects.toThrow();
  });

  it("sitemaps.delete requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.sitemaps.delete({ id: 1 })).rejects.toThrow();
  });

  it("sitemaps.refresh requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.sitemaps.refresh({ id: 1 })).rejects.toThrow();
  });
});

// ---- Citations Router Tests ----
describe("citations router", () => {
  it("citations.list requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.citations.list({ projectId: 1 })).rejects.toThrow();
  });

  it("citations.create requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.citations.create({
        name: "Test Source",
        url: "https://example.com",
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("citations.create validates required fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Missing name should fail
    await expect(
      caller.citations.create({
        name: "",
        url: "https://example.com",
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("citations.create validates URL format", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.citations.create({
        name: "Test Source",
        url: "not-a-url",
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("citations.update requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.citations.update({ id: 1, name: "Updated" })
    ).rejects.toThrow();
  });

  it("citations.delete requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.citations.delete({ id: 1 })).rejects.toThrow();
  });
});

// ---- Cross Check Router Tests ----
describe("crossCheck router", () => {
  it("crossCheck.getReferenceDoc requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.crossCheck.getReferenceDoc({ projectId: 1 })
    ).rejects.toThrow();
  });

  it("crossCheck.updateReferenceDoc requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.crossCheck.updateReferenceDoc({
        projectId: 1,
        referenceDoc: "Some content",
        referenceDocName: "Test Doc",
      })
    ).rejects.toThrow();
  });

  it("crossCheck.checkArticle requires authentication", async () => {
    const { ctx } = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.crossCheck.checkArticle({ articleId: 1 })
    ).rejects.toThrow();
  });

  it("crossCheck.updateReferenceDoc accepts null values for removal", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This should not throw a validation error (null is valid)
    // It may throw a DB error since we don't have a real DB, but the validation should pass
    try {
      await caller.crossCheck.updateReferenceDoc({
        projectId: 1,
        referenceDoc: null,
        referenceDocName: null,
      });
    } catch (e: any) {
      // DB errors are expected in test env, but validation errors are not
      expect(e.message).not.toContain("Expected string");
    }
  });
});

// ---- Sitemap Parser Tests ----
describe("sitemap-parser", () => {
  it("parseSitemap returns empty array for invalid URL", async () => {
    const { parseSitemap } = await import("./sitemap-parser");
    const result = await parseSitemap("https://this-definitely-does-not-exist-12345.com/sitemap.xml");
    expect(result).toEqual([]);
  });

  it("formatSitemapForAI returns empty string for empty array", async () => {
    const { formatSitemapForAI } = await import("./sitemap-parser");
    const result = formatSitemapForAI([]);
    expect(result).toBe("");
  });

  it("formatSitemapForAI formats URLs correctly", async () => {
    const { formatSitemapForAI } = await import("./sitemap-parser");
    const urls = [
      { url: "https://example.com/page1", title: "Page 1" },
      { url: "https://example.com/page2", title: "Page 2" },
    ];
    const result = formatSitemapForAI(urls);
    expect(result).toContain("1. Page 1 - https://example.com/page1");
    expect(result).toContain("2. Page 2 - https://example.com/page2");
  });

  it("findRelevantUrls returns top results by keyword relevance", async () => {
    const { findRelevantUrls } = await import("./sitemap-parser");
    const urls = [
      { url: "https://example.com/medicare-costs", title: "Medicare Costs Guide" },
      { url: "https://example.com/about", title: "About Us" },
      { url: "https://example.com/medicare-enrollment", title: "Medicare Enrollment" },
      { url: "https://example.com/contact", title: "Contact" },
    ];
    const result = findRelevantUrls(urls, ["medicare"], 2);
    expect(result).toHaveLength(2);
    expect(result[0].url).toContain("medicare");
    expect(result[1].url).toContain("medicare");
  });

  it("findRelevantUrls returns limited results when no keywords match", async () => {
    const { findRelevantUrls } = await import("./sitemap-parser");
    const urls = [
      { url: "https://example.com/page1", title: "Page 1" },
      { url: "https://example.com/page2", title: "Page 2" },
      { url: "https://example.com/page3", title: "Page 3" },
    ];
    const result = findRelevantUrls(urls, [], 2);
    expect(result).toHaveLength(2);
  });
});
