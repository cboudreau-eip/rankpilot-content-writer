import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("articles router", () => {
  it("articles.list rejects missing projectId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.list({} as any)
    ).rejects.toThrow();
  });

  it("articles.list rejects non-number projectId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.list({ projectId: "abc" } as any)
    ).rejects.toThrow();
  });

  it("articles.getById rejects missing id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.getById({} as any)
    ).rejects.toThrow();
  });

  it("articles.getById rejects non-number id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.getById({ id: "abc" } as any)
    ).rejects.toThrow();
  });

  it("articles.stats rejects missing projectId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.stats({} as any)
    ).rejects.toThrow();
  });

  it("articles.create rejects empty title", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.create({ title: "", projectId: 1 })
    ).rejects.toThrow();
  });

  it("articles.create rejects missing projectId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.create({ title: "Test Article" } as any)
    ).rejects.toThrow();
  });

  it("articles.update rejects invalid status value", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.update({ id: 1, status: "invalid_status" } as any)
    ).rejects.toThrow();
  });

  it("articles.update rejects missing id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.update({} as any)
    ).rejects.toThrow();
  });

  it("articles.delete rejects missing id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.delete({} as any)
    ).rejects.toThrow();
  });

  it("articles.aiEdit rejects empty instruction", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.aiEdit({ articleId: 1, instruction: "", currentContent: "<p>Hello</p>" })
    ).rejects.toThrow();
  });

  it("articles.aiEdit rejects empty currentContent", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.aiEdit({ articleId: 1, instruction: "Fix it", currentContent: "" })
    ).rejects.toThrow();
  });

  it("articles.aiEdit rejects missing articleId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.articles.aiEdit({} as any)
    ).rejects.toThrow();
  });
});

describe("outlines router", () => {
  it("outlines.generate rejects empty keyword", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.outlines.generate({
        keyword: "",
        contentType: "blog",
        tone: "professional",
        targetWordCount: 2000,
        numSections: 7,
        numFaqs: 4,
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("outlines.generate rejects missing projectId", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.outlines.generate({
        keyword: "test keyword",
        contentType: "blog",
        tone: "professional",
      } as any)
    ).rejects.toThrow();
  });

  it("outlines.create rejects empty title", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.outlines.create({
        title: "",
        sections: [],
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("outlines.update rejects invalid status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.outlines.update({
        id: 1,
        status: "invalid_status" as any,
      })
    ).rejects.toThrow();
  });

  it("outlines.delete rejects missing id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.outlines.delete({} as any)
    ).rejects.toThrow();
  });
});
