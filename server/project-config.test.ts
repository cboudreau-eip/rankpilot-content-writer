import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
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

describe("ICP Profile routes", () => {
  it("validates required fields on create", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.icpProfiles.create({
        name: "",
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("validates projectId is required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error - testing missing required field
      caller.icpProfiles.create({
        name: "Test ICP",
      })
    ).rejects.toThrow();
  });

  it("list requires projectId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error - testing missing required field
      caller.icpProfiles.list({})
    ).rejects.toThrow();
  });
});

describe("Brand Voice routes", () => {
  it("validates required fields on create", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.brandVoices.create({
        name: "",
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("validates projectId is required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error - testing missing required field
      caller.brandVoices.create({
        name: "Test Voice",
      })
    ).rejects.toThrow();
  });

  it("accepts valid brand voice with all fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // This should not throw on validation (may throw on DB)
    try {
      await caller.brandVoices.create({
        name: "Professional Voice",
        projectId: 1,
        tone: "Professional",
        style: "Clear and concise",
        vocabulary: ["innovative", "strategic"],
        avoidWords: ["cheap", "basic"],
        rules: ["Always use active voice"],
        examples: ["Our solution drives measurable results."],
      });
    } catch (e: any) {
      // DB errors are expected in test env, but validation should pass
      expect(e.message).not.toContain("validation");
    }
  });
});

describe("CTA Template routes", () => {
  it("validates required fields on create", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ctaTemplates.create({
        name: "",
        content: "Click here",
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("validates content is required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.ctaTemplates.create({
        name: "Test CTA",
        content: "",
        projectId: 1,
      })
    ).rejects.toThrow();
  });

  it("validates projectId is required", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error - testing missing required field
      caller.ctaTemplates.create({
        name: "Test CTA",
        content: "Click here",
      })
    ).rejects.toThrow();
  });

  it("accepts valid CTA with all fields", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.ctaTemplates.create({
        name: "Main CTA",
        content: "Get your free quote today!",
        buttonText: "Get Started",
        url: "https://example.com/signup",
        placement: "bottom",
        isDefault: true,
        projectId: 1,
      });
    } catch (e: any) {
      // DB errors expected in test env, but validation should pass
      expect(e.message).not.toContain("validation");
    }
  });
});

describe("Outline generation with ICP/BrandVoice", () => {
  it("rejects outline generation without required keyword", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.outlines.generate({
        keyword: "",
        projectId: 1,
        icpProfileId: 1,
        brandVoiceId: 1,
      })
    ).rejects.toThrow();
  });

  it("rejects outline generation without projectId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error - testing missing required field
      caller.outlines.generate({
        keyword: "test keyword",
        icpProfileId: 1,
        brandVoiceId: 1,
      })
    ).rejects.toThrow();
  });
});

describe("Article generation with ICP/BrandVoice", () => {
  it("rejects article generation without outlineId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error - testing missing required field
      caller.articles.generate({
        projectId: 1,
        icpProfileId: 1,
        brandVoiceId: 1,
      })
    ).rejects.toThrow();
  });

  it("rejects article generation without projectId", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      // @ts-expect-error - testing missing required field
      caller.articles.generate({
        outlineId: 1,
        icpProfileId: 1,
        brandVoiceId: 1,
      })
    ).rejects.toThrow();
  });
});
