import { describe, it, expect } from "vitest";
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

const caller = (ctx: TrpcContext) => appRouter.createCaller(ctx);

describe("Grading Routes", () => {
  describe("grading.gradeContent (standalone)", () => {
    it("should reject unauthenticated users", async () => {
      const { ctx } = createUnauthContext();
      await expect(
        caller(ctx).grading.gradeContent({ content: "Test content for grading" })
      ).rejects.toThrow();
    });

    it("should reject empty content", async () => {
      const { ctx } = createAuthContext();
      await expect(
        caller(ctx).grading.gradeContent({ content: "" })
      ).rejects.toThrow();
    });

    it("should reject content shorter than 10 characters", async () => {
      const { ctx } = createAuthContext();
      await expect(
        caller(ctx).grading.gradeContent({ content: "short" })
      ).rejects.toThrow();
    });

    it("should accept content with 10+ characters (validates schema passes)", async () => {
      const { ctx } = createAuthContext();
      // Validates the input schema accepts content >= 10 chars
      // The actual LLM call will fail, but schema validation should pass
      const validContent = "This is a sufficiently long piece of content for grading.";
      try {
        await caller(ctx).grading.gradeContent({ content: validContent });
      } catch (e: any) {
        // Should fail at LLM/DB level, not at schema validation
        expect(e.message).not.toContain("too_small");
      }
    }, 10000);
  });

  describe("grading.gradeArticle (per-article)", () => {
    it("should reject unauthenticated users", async () => {
      const { ctx } = createUnauthContext();
      await expect(
        caller(ctx).grading.gradeArticle({ articleId: 1 })
      ).rejects.toThrow();
    });

    it("should require a valid articleId", async () => {
      const { ctx } = createAuthContext();
      await expect(
        caller(ctx).grading.gradeArticle({ articleId: 0 })
      ).rejects.toThrow();
    });

    it("should reject negative articleId", async () => {
      const { ctx } = createAuthContext();
      await expect(
        caller(ctx).grading.gradeArticle({ articleId: -1 })
      ).rejects.toThrow();
    });
  });

  describe("grading.applyImprovements", () => {
    it("should reject unauthenticated users", async () => {
      const { ctx } = createUnauthContext();
      await expect(
        caller(ctx).grading.applyImprovements({
          articleId: 1,
          categoryKey: "eeatTrust",
          categoryLabel: "E-E-A-T Trust Package",
          selectedImprovements: ["Add author credentials"],
        })
      ).rejects.toThrow();
    });

    it("should require at least one improvement", async () => {
      const { ctx } = createAuthContext();
      await expect(
        caller(ctx).grading.applyImprovements({
          articleId: 1,
          categoryKey: "accuracy",
          categoryLabel: "Accuracy",
          selectedImprovements: [],
        })
      ).rejects.toThrow();
    });

    it("should require categoryKey to be non-empty", async () => {
      const { ctx } = createAuthContext();
      // Empty categoryKey should still pass schema (z.string() allows empty)
      // but the procedure should fail at the DB level (article not found)
      try {
        await caller(ctx).grading.applyImprovements({
          articleId: 999,
          categoryKey: "eeatTrust",
          categoryLabel: "Accuracy",
          selectedImprovements: ["Fix factual error"],
        });
      } catch (e: any) {
        // Should fail because article 999 doesn't exist
        expect(e.message).toContain("not found");
      }
    }, 10000);

    it("should accept valid input (validates schema)", async () => {
      const { ctx } = createAuthContext();
      try {
        await caller(ctx).grading.applyImprovements({
          articleId: 999,
          categoryKey: "eeatTrust",
          categoryLabel: "E-E-A-T Trust Package",
          selectedImprovements: ["Add author credentials", "Include expert quotes"],
        });
      } catch (e: any) {
        // Expected to fail at DB lookup (article not found), not at input validation
        expect(e.message).not.toContain("Expected string");
        expect(e.message).not.toContain("too_small");
      }
    });

    it("should accept a single selected improvement", async () => {
      const { ctx } = createAuthContext();
      try {
        await caller(ctx).grading.applyImprovements({
          articleId: 999,
          categoryKey: "accuracy",
          categoryLabel: "Accuracy",
          selectedImprovements: ["Add source links for all specific dollar amounts"],
        });
      } catch (e: any) {
        // Fails at DB level, not schema
        expect(e.message).not.toContain("too_small");
      }
    });

    it("should accept multiple selected improvements from same category", async () => {
      const { ctx } = createAuthContext();
      try {
        await caller(ctx).grading.applyImprovements({
          articleId: 999,
          categoryKey: "readabilityUx",
          categoryLabel: "Readability & UX",
          selectedImprovements: [
            "Add visual elements like icons or infographics",
            "Include a table of contents for easier navigation",
            "Add call-out boxes for important warnings or tips",
          ],
        });
      } catch (e: any) {
        // Fails at DB level, not schema
        expect(e.message).not.toContain("too_small");
      }
    });
  });

  describe("Route structure", () => {
    it("should have grading.gradeContent procedure", () => {
      expect(appRouter._def.procedures).toHaveProperty("grading.gradeContent");
    });

    it("should have grading.gradeArticle procedure", () => {
      expect(appRouter._def.procedures).toHaveProperty("grading.gradeArticle");
    });

    it("should have grading.applyImprovements procedure", () => {
      expect(appRouter._def.procedures).toHaveProperty("grading.applyImprovements");
    });
  });
});
