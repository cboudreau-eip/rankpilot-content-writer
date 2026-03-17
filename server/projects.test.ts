import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => {
  const mockProjects = [
    {
      id: 1,
      name: "Medicare FAQ",
      color: "#6366f1",
      domain: "medicarefaq.com",
      description: "Medicare content project",
      userId: 1,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    {
      id: 2,
      name: "SEO Blog",
      color: "#22c55e",
      domain: null,
      description: null,
      userId: 1,
      createdAt: new Date("2026-02-01"),
      updatedAt: new Date("2026-02-01"),
    },
  ];

  return {
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getProjectsByUserId: vi.fn().mockResolvedValue(mockProjects),
    getProjectById: vi.fn().mockImplementation(async (id: number) => {
      return mockProjects.find((p) => p.id === id) ?? null;
    }),
    createProject: vi.fn().mockImplementation(async (data: any) => ({
      id: 3,
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    updateProject: vi.fn().mockResolvedValue(undefined),
    deleteProject: vi.fn().mockResolvedValue(undefined),
  };
});

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
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("projects router", () => {
  let authedCaller: ReturnType<typeof appRouter.createCaller>;
  let unauthedCaller: ReturnType<typeof appRouter.createCaller>;

  beforeEach(() => {
    authedCaller = appRouter.createCaller(createAuthContext());
    unauthedCaller = appRouter.createCaller(createUnauthContext());
  });

  describe("projects.list", () => {
    it("returns projects for authenticated user", async () => {
      const result = await authedCaller.projects.list();
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Medicare FAQ");
      expect(result[1].name).toBe("SEO Blog");
    });

    it("throws for unauthenticated user", async () => {
      await expect(unauthedCaller.projects.list()).rejects.toThrow();
    });
  });

  describe("projects.getById", () => {
    it("returns a project by id", async () => {
      const result = await authedCaller.projects.getById({ id: 1 });
      expect(result).toBeDefined();
      expect(result?.name).toBe("Medicare FAQ");
    });

    it("returns null for non-existent project", async () => {
      const result = await authedCaller.projects.getById({ id: 999 });
      expect(result).toBeNull();
    });
  });

  describe("projects.create", () => {
    it("creates a new project with required fields", async () => {
      const result = await authedCaller.projects.create({
        name: "New Project",
      });
      expect(result).toBeDefined();
      expect(result.id).toBe(3);
      expect(result.name).toBe("New Project");
      expect(result.color).toBe("#6366f1"); // default color
    });

    it("creates a project with all fields", async () => {
      const result = await authedCaller.projects.create({
        name: "Full Project",
        color: "#ef4444",
        domain: "example.com",
        description: "A test project",
      });
      expect(result.name).toBe("Full Project");
      expect(result.color).toBe("#ef4444");
      expect(result.domain).toBe("example.com");
      expect(result.description).toBe("A test project");
    });

    it("rejects empty name", async () => {
      await expect(
        authedCaller.projects.create({ name: "" })
      ).rejects.toThrow();
    });

    it("throws for unauthenticated user", async () => {
      await expect(
        unauthedCaller.projects.create({ name: "Test" })
      ).rejects.toThrow();
    });
  });

  describe("projects.update", () => {
    it("updates a project name", async () => {
      await expect(
        authedCaller.projects.update({ id: 1, name: "Updated Name" })
      ).resolves.not.toThrow();
    });

    it("throws for unauthenticated user", async () => {
      await expect(
        unauthedCaller.projects.update({ id: 1, name: "Hack" })
      ).rejects.toThrow();
    });
  });

  describe("projects.delete", () => {
    it("deletes a project", async () => {
      await expect(
        authedCaller.projects.delete({ id: 1 })
      ).resolves.not.toThrow();
    });

    it("throws for unauthenticated user", async () => {
      await expect(
        unauthedCaller.projects.delete({ id: 1 })
      ).rejects.toThrow();
    });
  });
});
