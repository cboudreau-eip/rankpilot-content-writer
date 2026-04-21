import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Mock data ----
const mockRefDocContent = "# Medicare Reference Data\n## Part A Premiums\n2026 Full Part A Premium: $565";
const mockS3Key = "reference-docs/project-1-1234567890.txt";

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
let storagePutMock = vi.fn().mockResolvedValue({ key: mockS3Key, url: "https://cdn.example.com/ref.txt" });
let storageGetMock = vi.fn().mockResolvedValue({ key: mockS3Key, url: "https://cdn.example.com/ref.txt" });

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
  storagePutMock.mockResolvedValue({ key: mockS3Key, url: "https://cdn.example.com/ref.txt" });
  storageGetMock.mockResolvedValue({ key: mockS3Key, url: "https://cdn.example.com/ref.txt" });

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

describe("crossCheck DB-primary: updateReferenceDoc", () => {
  it("saves content to DB (primary) and S3 (backup) on update", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await caller.crossCheck.updateReferenceDoc({
      projectId: 1,
      referenceDoc: mockRefDocContent,
      referenceDocName: "Medicare Ref 2026",
    });

    // S3 backup upload should have been called with timestamped key
    expect(storagePutMock).toHaveBeenCalledTimes(1);
    expect(storagePutMock).toHaveBeenCalledWith(
      expect.stringContaining("reference-docs/project-1-"),
      mockRefDocContent,
      "text/plain"
    );

    // DB should have content saved (primary source of truth)
    expect(mockProject.referenceDocContent).toBe(mockRefDocContent);
    expect(mockProject.referenceDocName).toBe("Medicare Ref 2026");
    expect(mockProject.referenceDocLength).toBe(mockRefDocContent.length);
    expect(mockProject.referenceDocS3Key).toEqual(expect.stringContaining("reference-docs/project-1-"));
  });

  it("saves content to DB even when S3 backup upload fails", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Make S3 upload fail
    storagePutMock.mockRejectedValue(new Error("S3 unavailable"));

    await caller.crossCheck.updateReferenceDoc({
      projectId: 1,
      referenceDoc: mockRefDocContent,
      referenceDocName: "Medicare Ref 2026",
    });

    // DB should still have content (it's the primary source)
    expect(mockProject.referenceDocContent).toBe(mockRefDocContent);
    expect(mockProject.referenceDocName).toBe("Medicare Ref 2026");
    expect(mockProject.referenceDocLength).toBe(mockRefDocContent.length);
    // S3 key should be null since upload failed
    expect(mockProject.referenceDocS3Key).toBeNull();
  });

  it("clears DB content on removal (S3 orphans are harmless)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First save a doc
    mockProject.referenceDocContent = mockRefDocContent;
    mockProject.referenceDocS3Key = mockS3Key;
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

    // S3 should NOT have been called for deletion (orphans are harmless)
    expect(storagePutMock).not.toHaveBeenCalled();
  });
});

describe("crossCheck DB-primary: getReferenceDoc", () => {
  it("returns content from DB when available (primary source)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Set up project with DB content
    mockProject.referenceDocContent = mockRefDocContent;
    mockProject.referenceDocName = "Medicare Ref 2026";
    mockProject.referenceDocLength = mockRefDocContent.length;
    mockProject.referenceDocS3Key = mockS3Key;

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    expect(result.referenceDoc).toBe(mockRefDocContent);
    expect(result.referenceDocName).toBe("Medicare Ref 2026");
    expect(result.hasMetadata).toBe(true);
    expect(result.s3FetchFailed).toBe(false);

    // Should NOT have called S3 since DB had content
    expect(storageGetMock).not.toHaveBeenCalled();
  });

  it("falls back to S3 when DB content is null but S3 key exists", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Set up project with only S3 key (no DB content)
    mockProject.referenceDocContent = null;
    mockProject.referenceDocName = "Medicare Ref 2026";
    mockProject.referenceDocLength = mockRefDocContent.length;
    mockProject.referenceDocS3Key = mockS3Key;

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    expect(result.referenceDoc).toBe(mockRefDocContent);
    expect(result.hasMetadata).toBe(true);

    // Should have called S3 as fallback
    expect(storageGetMock).toHaveBeenCalledWith(mockS3Key);
  });

  it("returns empty state when neither DB nor S3 has content", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Project has no reference doc at all
    mockProject.referenceDocContent = null;
    mockProject.referenceDocS3Key = null;
    mockProject.referenceDocName = null;

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    expect(result.referenceDoc).toBeNull();
    expect(result.hasMetadata).toBe(false);
    expect(result.s3FetchFailed).toBe(false);
  });

  it("handles S3 fallback failure gracefully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Set up project with only S3 key, but S3 will fail
    mockProject.referenceDocContent = null;
    mockProject.referenceDocName = "Medicare Ref 2026";
    mockProject.referenceDocS3Key = mockS3Key;

    storageGetMock.mockRejectedValue(new Error("S3 unavailable"));

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    expect(result.referenceDoc).toBeNull();
    expect(result.s3FetchFailed).toBe(true);
    expect(result.hasMetadata).toBe(true);
  });

  it("self-heals DB content when S3 fallback succeeds", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Set up project with only S3 key (no DB content)
    mockProject.referenceDocContent = null;
    mockProject.referenceDocName = "Medicare Ref 2026";
    mockProject.referenceDocLength = mockRefDocContent.length;
    mockProject.referenceDocS3Key = mockS3Key;

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    // Content should be returned from S3
    expect(result.referenceDoc).toBe(mockRefDocContent);

    // Self-heal: DB should now have the content backfilled
    expect(mockProject.referenceDocContent).toBe(mockRefDocContent);
  });

  it("hasMetadata is true when DB content exists even without S3 key", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // DB content but no S3 key (e.g., S3 upload failed)
    mockProject.referenceDocContent = mockRefDocContent;
    mockProject.referenceDocName = "Medicare Ref 2026";
    mockProject.referenceDocLength = mockRefDocContent.length;
    mockProject.referenceDocS3Key = null;

    const result = await caller.crossCheck.getReferenceDoc({ projectId: 1 });

    expect(result.referenceDoc).toBe(mockRefDocContent);
    expect(result.hasMetadata).toBe(true);
    expect(result.s3FetchFailed).toBe(false);
  });
});

describe("crossCheck DB-primary: checkArticle", () => {
  it("uses DB content for cross-check when available", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Set up project with DB content
    mockProject.referenceDocContent = mockRefDocContent;
    mockProject.referenceDocName = "Medicare Ref 2026";
    mockProject.referenceDocS3Key = mockS3Key;

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
    // But we can verify it doesn't try to call S3
    try {
      await caller.crossCheck.checkArticle({ articleId: 1 });
    } catch (e: any) {
      // Expected to fail at LLM call, but should NOT fail at S3 fetch
      expect(e.message).not.toContain("Failed to retrieve reference document");
      expect(e.message).not.toContain("No reference document found");
    }

    // S3 should NOT have been called since DB had content
    expect(storageGetMock).not.toHaveBeenCalled();
  });

  it("throws clear error when no reference doc exists at all", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // No reference doc
    mockProject.referenceDocContent = null;
    mockProject.referenceDocS3Key = null;

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
  it("generates timestamped key from project ID", async () => {
    const { getReferenceDocS3Key } = await import("./routers");
    const key = getReferenceDocS3Key(1);
    expect(key).toMatch(/^reference-docs\/project-1-\d+\.txt$/);
  });

  it("generates unique keys on each call", async () => {
    const { getReferenceDocS3Key } = await import("./routers");
    const key1 = getReferenceDocS3Key(1);
    // Small delay to ensure different timestamp
    await new Promise(r => setTimeout(r, 5));
    const key2 = getReferenceDocS3Key(1);
    expect(key1).not.toBe(key2);
  });
});
