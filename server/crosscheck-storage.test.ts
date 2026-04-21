import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Mock data ----
const mockRefDocContent = "# Medicare Reference Data\n## Part A Premiums\n2026 Full Part A Premium: $565";
const deterministicKey = "reference-docs/project-1.txt";

let mockProject: any = {
  id: 1,
  name: "Medicare FAQ",
  color: "#6366f1",
  domain: "medicarefaq.com",
  userId: 1,
  referenceDocS3Key: null,
  referenceDocName: null,
  referenceDocLength: null,
  referenceDocContent: null,
  bannedPhrases: null,
  llmProvider: "builtin",
  llmModel: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

// ---- Mock db module ----
vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getProjectsByUserId: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockImplementation(async (id: number) => {
    if (id === 1) return { ...mockProject };
    return null;
  }),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  deleteProject: vi.fn(),
  updateProjectReferenceDocMeta: vi.fn().mockImplementation(
    async (projectId: number, s3Key: string | null, docName: string | null, docLength: number | null, docContent: string | null = null) => {
      mockProject = {
        ...mockProject,
        referenceDocS3Key: s3Key,
        referenceDocName: docName,
        referenceDocLength: docLength,
        referenceDocContent: docContent,
      };
      return { ...mockProject };
    }
  ),
  getArticleById: vi.fn(),
  getArticlesByProject: vi.fn().mockResolvedValue([]),
  getOutlineById: vi.fn(),
  createOutline: vi.fn(),
  updateOutline: vi.fn(),
  createArticle: vi.fn(),
  updateArticle: vi.fn(),
  deleteArticle: vi.fn(),
  getSitemapsByProject: vi.fn().mockResolvedValue([]),
  createSitemap: vi.fn(),
  updateSitemap: vi.fn(),
  deleteSitemap: vi.fn(),
  getCitationsByProject: vi.fn().mockResolvedValue([]),
  createCitation: vi.fn(),
  updateCitation: vi.fn(),
  deleteCitation: vi.fn(),
  getBrandVoicesByProject: vi.fn().mockResolvedValue([]),
  createBrandVoice: vi.fn(),
  updateBrandVoice: vi.fn(),
  deleteBrandVoice: vi.fn(),
  getCtasByProject: vi.fn().mockResolvedValue([]),
  createCta: vi.fn(),
  updateCta: vi.fn(),
  deleteCta: vi.fn(),
  getIcpsByProject: vi.fn().mockResolvedValue([]),
  createIcp: vi.fn(),
  updateIcp: vi.fn(),
  deleteIcp: vi.fn(),
}));

// ---- Mock storage module ----
let storagePutMock = vi.fn().mockResolvedValue({ key: deterministicKey, url: "https://cdn.example.com/ref.txt" });
let storageGetMock = vi.fn().mockResolvedValue({ key: deterministicKey, url: "https://cdn.example.com/ref.txt" });

vi.mock("./storage", () => ({
  storagePut: (...args: any[]) => storagePutMock(...args),
  storageGet: (...args: any[]) => storageGetMock(...args),
}));

// ---- Mock global fetch for S3 content retrieval ----
const originalFetch = globalThis.fetch;
let fetchMock = vi.fn();

beforeEach(() => {
  // Reset mock project to clean state
  mockProject = {
    id: 1,
    name: "Medicare FAQ",
    color: "#6366f1",
    domain: "medicarefaq.com",
    userId: 1,
    referenceDocS3Key: null,
    referenceDocName: null,
    referenceDocLength: null,
    referenceDocContent: null,
    bannedPhrases: null,
    llmProvider: "builtin",
    llmModel: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  // Reset mocks
  storagePutMock.mockClear();
  storageGetMock.mockClear();
  storagePutMock.mockResolvedValue({ key: deterministicKey, url: "https://cdn.example.com/ref.txt" });
  storageGetMock.mockResolvedValue({ key: deterministicKey, url: "https://cdn.example.com/ref.txt" });

  fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    text: async () => mockRefDocContent,
    status: 200,
  });
  globalThis.fetch = fetchMock;
});

// ---- Auth context helpers ----
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

// ---- Tests ----

describe("crossCheck S3-primary: updateReferenceDoc", () => {
  it("uploads to deterministic S3 key on save", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.crossCheck.updateReferenceDoc({
      projectId: 1,
      referenceDoc: mockRefDocContent,
      referenceDocName: "Medicare Ref 2026",
    });

    // S3 upload should use deterministic key (no timestamp)
    expect(storagePutMock).toHaveBeenCalledTimes(1);
    expect(storagePutMock).toHaveBeenCalledWith(
      deterministicKey,
      mockRefDocContent,
      "text/plain"
    );

    // DB should also have content cached
    expect(mockProject.referenceDocContent).toBe(mockRefDocContent);
    expect(mockProject.referenceDocName).toBe("Medicare Ref 2026");
    expect(mockProject.referenceDocLength).toBe(mockRefDocContent.length);
    expect(mockProject.referenceDocS3Key).toBe(deterministicKey);
  });

  it("saves content to DB even when S3 upload fails", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Make S3 upload fail
    storagePutMock.mockRejectedValue(new Error("S3 unavailable"));

    await caller.crossCheck.updateReferenceDoc({
      projectId: 1,
      referenceDoc: mockRefDocContent,
      referenceDocName: "Medicare Ref 2026",
    });

    // DB should still have content (fallback)
    expect(mockProject.referenceDocContent).toBe(mockRefDocContent);
    expect(mockProject.referenceDocName).toBe("Medicare Ref 2026");
    expect(mockProject.referenceDocLength).toBe(mockRefDocContent.length);
    // S3 key should still be set (deterministic, even though upload failed)
    expect(mockProject.referenceDocS3Key).toBe(deterministicKey);
  });

  it("clears both DB content and S3 key on removal", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First save a doc
    mockProject.referenceDocContent = mockRefDocContent;
    mockProject.referenceDocS3Key = deterministicKey;
    mockProject.referenceDocName = "Test";
    mockProject.referenceDocLength = 100;

    // Now remove it
    await caller.crossCheck.updateReferenceDoc({
      projectId: 1,
      referenceDoc: null,
      referenceDocName: null,
    });

    expect(mockProject.referenceDocContent).toBeNull();
    expect(mockProject.referenceDocS3Key).toBeNull();
    expect(mockProject.referenceDocName).toBeNull();
    expect(mockProject.referenceDocLength).toBeNull();
  });
});

describe("crossCheck S3-primary: getReferenceDoc", () => {
  it("fetches from S3 deterministic key as primary source (even when DB has content)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Set up project with DB content AND S3 key
    mockProject.referenceDocContent = mockRefDocContent;
    mockProject.referenceDocName = "Medicare Ref 2026";
    mockProject.referenceDocLength = mockRefDocContent.length;
    mockProject.referenceDocS3Key = deterministicKey;

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    expect(result.referenceDoc).toBe(mockRefDocContent);
    expect(result.referenceDocName).toBe("Medicare Ref 2026");
    expect(result.hasMetadata).toBe(true);
    expect(result.s3FetchFailed).toBe(false);

    // S3 deterministic key should ALWAYS be tried first (it's the primary source)
    expect(storageGetMock).toHaveBeenCalledWith(deterministicKey);
  });

  it("falls back to DB content when S3 is unavailable", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Set up project with DB content
    mockProject.referenceDocContent = mockRefDocContent;
    mockProject.referenceDocName = "Medicare Ref 2026";
    mockProject.referenceDocLength = mockRefDocContent.length;

    // Make S3 fail
    storageGetMock.mockRejectedValue(new Error("S3 unavailable"));

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    // Should fall back to DB content
    expect(result.referenceDoc).toBe(mockRefDocContent);
    expect(result.hasMetadata).toBe(true);
  });

  it("self-heals DB when S3 has content but DB is wiped (deployment scenario)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Simulate post-deployment: DB columns wiped, but S3 still has the doc
    mockProject.referenceDocContent = null;
    mockProject.referenceDocName = null;
    mockProject.referenceDocLength = null;
    mockProject.referenceDocS3Key = null;

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    // Content should be returned from S3 deterministic key
    expect(result.referenceDoc).toBe(mockRefDocContent);
    expect(result.hasMetadata).toBe(true);

    // Self-heal: DB should now have the content backfilled
    expect(mockProject.referenceDocContent).toBe(mockRefDocContent);
    expect(mockProject.referenceDocS3Key).toBe(deterministicKey);
  });

  it("returns empty state when S3 has no content and DB is also empty", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // No content anywhere
    mockProject.referenceDocContent = null;
    mockProject.referenceDocS3Key = null;
    mockProject.referenceDocName = null;

    // S3 returns 404
    fetchMock.mockResolvedValue({ ok: false, status: 404, text: async () => "" });

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    expect(result.referenceDoc).toBeNull();
    expect(result.hasMetadata).toBe(false);
  });

  it("handles S3 fetch failure gracefully and falls back to DB", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // DB has content, S3 will fail
    mockProject.referenceDocContent = mockRefDocContent;
    mockProject.referenceDocName = "Medicare Ref 2026";

    storageGetMock.mockRejectedValue(new Error("S3 unavailable"));

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    // Should fall back to DB content
    expect(result.referenceDoc).toBe(mockRefDocContent);
    expect(result.hasMetadata).toBe(true);
  });

  it("migrates legacy timestamped S3 key to deterministic key", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const legacyKey = "reference-docs/project-1-1234567890.txt";

    // S3 deterministic key returns 404, but legacy key works
    fetchMock
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => "" }) // deterministic key fails
      .mockResolvedValueOnce({ ok: true, text: async () => mockRefDocContent, status: 200 }); // legacy key succeeds

    // DB has no content but has legacy S3 key
    mockProject.referenceDocContent = null;
    mockProject.referenceDocName = "Medicare Ref 2026";
    mockProject.referenceDocLength = mockRefDocContent.length;
    mockProject.referenceDocS3Key = legacyKey;

    // storageGet should be called twice: once for deterministic, once for legacy
    storageGetMock
      .mockResolvedValueOnce({ key: deterministicKey, url: "https://cdn.example.com/deterministic.txt" })
      .mockResolvedValueOnce({ key: legacyKey, url: "https://cdn.example.com/legacy.txt" });

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    // Content should be returned from legacy key
    expect(result.referenceDoc).toBe(mockRefDocContent);

    // Should have migrated to deterministic key via storagePut
    expect(storagePutMock).toHaveBeenCalledWith(deterministicKey, mockRefDocContent, "text/plain");
  });
});

describe("crossCheck S3-primary: checkArticle", () => {
  it("fetches reference doc from S3 deterministic key for cross-check", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Set up project with DB content
    mockProject.referenceDocContent = mockRefDocContent;
    mockProject.referenceDocName = "Medicare Ref 2026";
    mockProject.referenceDocS3Key = deterministicKey;

    const { getArticleById } = await import("./db");
    vi.mocked(getArticleById).mockResolvedValueOnce({
      id: 1,
      title: "Test Article",
      content: "<p>Part A premium is $500</p>",
      projectId: 1,
      userId: 1,
      status: "draft",
      keyword: null,
      keywords: null,
      metaTitle: null,
      metaDescription: null,
      slug: null,
      wordCount: 10,
      contentType: null,
      outlineId: null,
      excerpt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // The checkArticle will try to invoke LLM, which will fail in test env
    // But we can verify it fetches from S3 deterministic key
    try {
      await caller.crossCheck.checkArticle({ articleId: 1 });
    } catch (e: any) {
      // Expected to fail at LLM call, but should NOT fail at reference doc fetch
      expect(e.message).not.toContain("Failed to retrieve reference document");
      expect(e.message).not.toContain("No reference document found");
    }

    // S3 deterministic key should have been called (primary source)
    expect(storageGetMock).toHaveBeenCalledWith(deterministicKey);
  });

  it("throws clear error when no reference doc exists anywhere", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // No reference doc anywhere
    mockProject.referenceDocContent = null;
    mockProject.referenceDocS3Key = null;

    // S3 deterministic key returns 404
    fetchMock.mockResolvedValue({ ok: false, status: 404, text: async () => "" });

    const { getArticleById } = await import("./db");
    vi.mocked(getArticleById).mockResolvedValueOnce({
      id: 1,
      title: "Test Article",
      content: "<p>Test</p>",
      projectId: 1,
      userId: 1,
      status: "draft",
      keyword: null,
      keywords: null,
      metaTitle: null,
      metaDescription: null,
      slug: null,
      wordCount: 5,
      contentType: null,
      outlineId: null,
      excerpt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      caller.crossCheck.checkArticle({ articleId: 1 })
    ).rejects.toThrow("No reference document found");
  });
});

describe("getReferenceDocS3Key helper", () => {
  it("generates deterministic key from project ID", async () => {
    const { getReferenceDocS3Key } = await import("./routers");
    expect(getReferenceDocS3Key(1)).toBe("reference-docs/project-1.txt");
    expect(getReferenceDocS3Key(42)).toBe("reference-docs/project-42.txt");
    expect(getReferenceDocS3Key(999)).toBe("reference-docs/project-999.txt");
  });
});
