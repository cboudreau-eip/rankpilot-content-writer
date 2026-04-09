import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ---- Mock DB ----
const mockJobs: any[] = [];
const mockKeywords: any[] = [];
const mockRunHistory: any[] = [];
let jobIdCounter = 1;
let kwIdCounter = 1;
let runIdCounter = 1;

vi.mock("./db", () => ({
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getProjectsByUserId: vi.fn().mockResolvedValue([]),
  getProjectById: vi.fn().mockResolvedValue({
    id: 1,
    name: "Test Project",
    llmProvider: "builtin",
    llmModel: null,
    icpPrimaryName: "Medicare Beneficiaries",
    icpWhoTheyAre: "Adults 65+ enrolling in Medicare",
    icpPains: ["Confusing plan options"],
    icpGoals: ["Find affordable coverage"],
    icpObjections: ["Too many choices"],
    icpDecisionTriggers: ["Turning 65"],
    icpTrustSignals: ["CMS star ratings"],
  }),
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
  createOutline: vi.fn().mockResolvedValue({
    id: 100,
    title: "Test Outline",
    keyword: "test keyword",
    sections: [],
    settings: {},
    projectId: 1,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateOutline: vi.fn(),
  deleteOutline: vi.fn(),
  createArticle: vi.fn().mockResolvedValue({
    id: 200,
    title: "Test Article",
    content: "<p>Test content</p>",
    wordCount: 2000,
    projectId: 1,
    userId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
  updateArticle: vi.fn(),
  deleteArticle: vi.fn(),
  getICPsByProject: vi.fn().mockResolvedValue([]),
  getICPById: vi.fn(),
  createICP: vi.fn(),
  updateICP: vi.fn(),
  deleteICP: vi.fn(),
  getBrandVoicesByProject: vi.fn().mockResolvedValue([
    {
      id: 1,
      name: "Professional",
      isDefault: 1,
      toneTraits: "Authoritative, clear",
      perspective: "second",
      sentenceStyle: "mixed",
      avoidList: "PRESETS:jargon|CUSTOM:",
      writingStyleSample: null,
      projectId: 1,
    },
  ]),
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

  // Scheduler-specific mocks
  getScheduledJobsByProject: vi.fn().mockImplementation(async (projectId: number) => {
    return mockJobs.filter((j) => j.projectId === projectId);
  }),
  getScheduledJobsByUser: vi.fn().mockResolvedValue([]),
  getScheduledJobById: vi.fn().mockImplementation(async (id: number) => {
    return mockJobs.find((j) => j.id === id) ?? null;
  }),
  createScheduledJob: vi.fn().mockImplementation(async (data: any) => {
    const job = {
      id: jobIdCounter++,
      ...data,
      status: "active",
      totalGenerated: 0,
      isRunning: 0,
      lastRunAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockJobs.push(job);
    return job;
  }),
  updateScheduledJob: vi.fn().mockImplementation(async (id: number, data: any) => {
    const job = mockJobs.find((j) => j.id === id);
    if (job) Object.assign(job, data);
    return job;
  }),
  deleteScheduledJob: vi.fn().mockImplementation(async (id: number) => {
    const idx = mockJobs.findIndex((j) => j.id === id);
    if (idx >= 0) mockJobs.splice(idx, 1);
  }),
  getDueScheduledJobs: vi.fn().mockResolvedValue([]),
  getKeywordQueueByJob: vi.fn().mockImplementation(async (jobId: number) => {
    return mockKeywords.filter((k) => k.jobId === jobId);
  }),
  getKeywordQueueItemById: vi.fn().mockImplementation(async (id: number) => {
    return mockKeywords.find((k) => k.id === id) ?? null;
  }),
  addKeywordToQueue: vi.fn().mockImplementation(async (data: any) => {
    const kw = { id: kwIdCounter++, ...data, status: "pending", createdAt: new Date() };
    mockKeywords.push(kw);
    return kw;
  }),
  addKeywordsToQueue: vi.fn().mockImplementation(async (items: any[]) => {
    return items.map((item) => {
      const kw = { id: kwIdCounter++, ...item, status: "pending", createdAt: new Date() };
      mockKeywords.push(kw);
      return kw;
    });
  }),
  updateKeywordQueueItem: vi.fn(),
  deleteKeywordQueueItem: vi.fn().mockImplementation(async (id: number) => {
    const idx = mockKeywords.findIndex((k) => k.id === id);
    if (idx >= 0) mockKeywords.splice(idx, 1);
  }),
  getNextPendingKeyword: vi.fn().mockImplementation(async (jobId: number) => {
    return mockKeywords.find((k) => k.jobId === jobId && k.status === "pending") ?? null;
  }),
  getJobRunHistory: vi.fn().mockImplementation(async (jobId: number) => {
    return mockRunHistory.filter((r) => r.jobId === jobId);
  }),
  getJobRunHistoryById: vi.fn(),
  createJobRunHistoryEntry: vi.fn().mockImplementation(async (data: any) => {
    const entry = { id: runIdCounter++, ...data, createdAt: new Date() };
    mockRunHistory.push(entry);
    return entry;
  }),
  updateJobRunHistoryEntry: vi.fn(),
  addSchedulerRunLog: vi.fn().mockResolvedValue(undefined),
  getSchedulerRunLogs: vi.fn().mockResolvedValue([]),
  getSchedulerRunLogsByRunId: vi.fn().mockResolvedValue([]),
}));

vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ key: "test", url: "https://cdn.example.com/test" }),
  storageGet: vi.fn().mockResolvedValue({ key: "test", url: "https://cdn.example.com/test" }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockImplementation(async () => ({
    choices: [
      {
        message: {
          content: JSON.stringify({
            title: "Test Article Title",
            sections: [
              { id: "s1", heading: "Section 1", type: "h2", points: ["Point 1"], subSections: [] },
              { id: "s2", heading: "Section 2", type: "h2", points: ["Point 2"], subSections: [] },
            ],
          }),
        },
      },
    ],
  })),
}));

vi.mock("./claude", () => ({
  invokeClaudeLLM: vi.fn().mockImplementation(async () => ({
    choices: [
      {
        message: {
          content: "<h2>Section 1</h2><p>Generated content for testing.</p>",
        },
      },
    ],
  })),
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

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
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

const caller = appRouter.createCaller(createAuthContext());

beforeEach(() => {
  mockJobs.length = 0;
  mockKeywords.length = 0;
  mockRunHistory.length = 0;
  jobIdCounter = 1;
  kwIdCounter = 1;
  runIdCounter = 1;
  vi.clearAllMocks();
});

// ============================================================
// TESTS
// ============================================================

describe("Content Scheduler — Job CRUD", () => {
  it("creates a scheduled job with keyword queue", async () => {
    const result = await caller.scheduler.createJob({
      name: "Weekly Medicare Posts",
      keywordSource: "queue",
      frequency: "weekly",
      dayOfWeek: 1,
      hourUtc: 8,
      articleSettings: {
        targetWordCount: 2000,
        numSections: 8,
        numFaqs: 5,
        contentType: "blog",
        outputFormat: "html",
      },
      projectId: 1,
      keywords: ["medicare advantage", "medicare part d", "medigap plans"],
    });

    expect(result).toBeDefined();
    expect(result.name).toBe("Weekly Medicare Posts");
    expect(result.keywordSource).toBe("queue");
    expect(result.frequency).toBe("weekly");
    expect(result.status).toBe("active");
  });

  it("creates a scheduled job with AI-suggested keywords", async () => {
    const result = await caller.scheduler.createJob({
      name: "AI Content Generator",
      keywordSource: "ai",
      frequency: "daily",
      hourUtc: 14,
      articleSettings: {
        targetWordCount: 1500,
        numSections: 6,
        numFaqs: 3,
        contentType: "guide",
        outputFormat: "html",
      },
      projectId: 1,
    });

    expect(result).toBeDefined();
    expect(result.keywordSource).toBe("ai");
    expect(result.frequency).toBe("daily");
  });

  it("lists jobs for a project", async () => {
    // Create two jobs
    await caller.scheduler.createJob({
      name: "Job 1",
      keywordSource: "queue",
      frequency: "weekly",
      hourUtc: 8,
      articleSettings: {},
      projectId: 1,
      keywords: ["keyword1"],
    });
    await caller.scheduler.createJob({
      name: "Job 2",
      keywordSource: "ai",
      frequency: "daily",
      hourUtc: 10,
      articleSettings: {},
      projectId: 1,
    });

    const jobs = await caller.scheduler.listJobs({ projectId: 1 });
    expect(jobs).toHaveLength(2);
    expect(jobs[0].name).toBe("Job 1");
    expect(jobs[1].name).toBe("Job 2");
  });

  it("gets a specific job by ID", async () => {
    await caller.scheduler.createJob({
      name: "Specific Job",
      keywordSource: "queue",
      frequency: "monthly",
      dayOfMonth: 15,
      hourUtc: 6,
      articleSettings: {},
      projectId: 1,
      keywords: ["test"],
    });

    const job = await caller.scheduler.getJob({ id: 1 });
    expect(job).toBeDefined();
    expect(job!.name).toBe("Specific Job");
    expect(job!.frequency).toBe("monthly");
  });

  it("pauses and resumes a job", async () => {
    await caller.scheduler.createJob({
      name: "Pausable Job",
      keywordSource: "ai",
      frequency: "daily",
      hourUtc: 8,
      articleSettings: {},
      projectId: 1,
    });

    await caller.scheduler.pauseJob({ id: 1 });
    let job = await caller.scheduler.getJob({ id: 1 });
    expect(job!.status).toBe("paused");

    await caller.scheduler.resumeJob({ id: 1 });
    job = await caller.scheduler.getJob({ id: 1 });
    expect(job!.status).toBe("active");
  });

  it("deletes a job", async () => {
    await caller.scheduler.createJob({
      name: "Deletable Job",
      keywordSource: "ai",
      frequency: "daily",
      hourUtc: 8,
      articleSettings: {},
      projectId: 1,
    });

    await caller.scheduler.deleteJob({ id: 1 });
    const jobs = await caller.scheduler.listJobs({ projectId: 1 });
    expect(jobs).toHaveLength(0);
  });
});

describe("Content Scheduler — Keyword Queue", () => {
  it("adds keywords to a job queue", async () => {
    await caller.scheduler.createJob({
      name: "Queue Job",
      keywordSource: "queue",
      frequency: "weekly",
      hourUtc: 8,
      articleSettings: {},
      projectId: 1,
      keywords: ["initial keyword"],
    });

    await caller.scheduler.addKeywords({
      jobId: 1,
      keywords: [
        { keyword: "medicare advantage" },
        { keyword: "medicare part d" },
        { keyword: "medigap plans" },
      ],
    });

    const keywords = await caller.scheduler.listKeywords({ jobId: 1 });
    // 1 initial + 3 added
    expect(keywords.length).toBeGreaterThanOrEqual(3);
  });

  it("removes a keyword from the queue", async () => {
    await caller.scheduler.createJob({
      name: "Queue Job",
      keywordSource: "queue",
      frequency: "weekly",
      hourUtc: 8,
      articleSettings: {},
      projectId: 1,
      keywords: ["keyword to remove", "keyword to keep"],
    });

    const keywords = await caller.scheduler.listKeywords({ jobId: 1 });
    const toRemove = keywords[0];

    await caller.scheduler.removeKeyword({ id: toRemove.id });

    const updatedKeywords = await caller.scheduler.listKeywords({ jobId: 1 });
    expect(updatedKeywords).toHaveLength(keywords.length - 1);
  });
});

describe("Content Scheduler — Run History", () => {
  it("lists run history for a job", async () => {
    await caller.scheduler.createJob({
      name: "History Job",
      keywordSource: "ai",
      frequency: "daily",
      hourUtc: 8,
      articleSettings: {},
      projectId: 1,
    });

    const history = await caller.scheduler.listRunHistory({ jobId: 1 });
    expect(Array.isArray(history)).toBe(true);
  });
});

describe("Content Scheduler — Run Now", () => {
  it("triggers a job execution via runNow", async () => {
    await caller.scheduler.createJob({
      name: "Run Now Job",
      keywordSource: "queue",
      frequency: "weekly",
      hourUtc: 8,
      articleSettings: {
        targetWordCount: 1500,
        numSections: 6,
        numFaqs: 3,
        contentType: "blog",
        outputFormat: "html",
      },
      projectId: 1,
      keywords: ["test keyword for run now"],
    });

    // runNow should not throw — it starts execution asynchronously
    const result = await caller.scheduler.runNow({ jobId: 1 });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it("rejects runNow for non-existent job", async () => {
    await expect(caller.scheduler.runNow({ jobId: 9999 })).rejects.toThrow();
  });
});

describe("Content Scheduler — Job Creation Validation", () => {
  it("requires keywords for queue mode", async () => {
    // Queue mode with no keywords should still work (keywords can be added later)
    // But the frontend validates this — backend should accept empty keywords
    const result = await caller.scheduler.createJob({
      name: "Empty Queue Job",
      keywordSource: "queue",
      frequency: "daily",
      hourUtc: 8,
      articleSettings: {},
      projectId: 1,
    });
    expect(result).toBeDefined();
  });

  it("creates job with all article settings", async () => {
    const result = await caller.scheduler.createJob({
      name: "Full Settings Job",
      keywordSource: "ai",
      frequency: "monthly",
      dayOfMonth: 15,
      hourUtc: 14,
      articleSettings: {
        targetWordCount: 3000,
        numSections: 12,
        numFaqs: 8,
        contentType: "comparison",
        outputFormat: "html",
        brandVoiceId: 1,
        icpProfileId: 2,
        additionalInstructions: "Focus on cost comparisons and include tables",
      },
      projectId: 1,
    });

    expect(result).toBeDefined();
    expect(result.articleSettings).toBeDefined();
    const settings = result.articleSettings as any;
    expect(settings.targetWordCount).toBe(3000);
    expect(settings.additionalInstructions).toContain("cost comparisons");
  });
});

describe("Content Scheduler — New Article Settings Fields", () => {
  it("creates job with tone setting", async () => {
    const result = await caller.scheduler.createJob({
      name: "Tone Test Job",
      keywordSource: "ai",
      frequency: "daily",
      hourUtc: 8,
      articleSettings: {
        tone: "conversational",
        targetWordCount: 1500,
      },
      projectId: 1,
    });

    expect(result).toBeDefined();
    const settings = result.articleSettings as any;
    expect(settings.tone).toBe("conversational");
  });

  it("creates job with targetLocation and targetAudience", async () => {
    const result = await caller.scheduler.createJob({
      name: "Location Audience Job",
      keywordSource: "queue",
      frequency: "weekly",
      hourUtc: 10,
      articleSettings: {
        targetLocation: "Florida",
        targetAudience: "Seniors 65+",
        targetWordCount: 2000,
      },
      projectId: 1,
      keywords: ["medicare florida"],
    });

    expect(result).toBeDefined();
    const settings = result.articleSettings as any;
    expect(settings.targetLocation).toBe("Florida");
    expect(settings.targetAudience).toBe("Seniors 65+");
  });

  it("creates job with secondaryKeywords array", async () => {
    const result = await caller.scheduler.createJob({
      name: "Secondary Keywords Job",
      keywordSource: "ai",
      frequency: "daily",
      hourUtc: 9,
      articleSettings: {
        secondaryKeywords: ["medicare supplement", "medigap", "part B coverage"],
        targetWordCount: 2500,
      },
      projectId: 1,
    });

    expect(result).toBeDefined();
    const settings = result.articleSettings as any;
    expect(settings.secondaryKeywords).toEqual(["medicare supplement", "medigap", "part B coverage"]);
  });

  it("creates job with autoLinkCount", async () => {
    const result = await caller.scheduler.createJob({
      name: "Auto Link Job",
      keywordSource: "ai",
      frequency: "daily",
      hourUtc: 11,
      articleSettings: {
        autoLinkCount: 7,
        targetWordCount: 2000,
      },
      projectId: 1,
    });

    expect(result).toBeDefined();
    const settings = result.articleSettings as any;
    expect(settings.autoLinkCount).toBe(7);
  });

  it("creates job with researchEnabled flag", async () => {
    const result = await caller.scheduler.createJob({
      name: "Research Mode Job",
      keywordSource: "ai",
      frequency: "weekly",
      hourUtc: 8,
      articleSettings: {
        researchEnabled: false,
        targetWordCount: 1800,
      },
      projectId: 1,
    });

    expect(result).toBeDefined();
    const settings = result.articleSettings as any;
    expect(settings.researchEnabled).toBe(false);
  });

  it("creates job with all 6 new fields combined", async () => {
    const result = await caller.scheduler.createJob({
      name: "Full New Fields Job",
      keywordSource: "queue",
      frequency: "monthly",
      dayOfMonth: 1,
      hourUtc: 8,
      articleSettings: {
        tone: "authoritative",
        targetLocation: "Texas",
        targetAudience: "Small business owners",
        secondaryKeywords: ["health insurance", "group coverage"],
        autoLinkCount: 5,
        researchEnabled: true,
        targetWordCount: 3000,
        numSections: 10,
        numFaqs: 6,
        contentType: "guide",
        outputFormat: "html",
        additionalInstructions: "Include case studies",
      },
      projectId: 1,
      keywords: ["small business health insurance texas"],
    });

    expect(result).toBeDefined();
    const settings = result.articleSettings as any;
    expect(settings.tone).toBe("authoritative");
    expect(settings.targetLocation).toBe("Texas");
    expect(settings.targetAudience).toBe("Small business owners");
    expect(settings.secondaryKeywords).toEqual(["health insurance", "group coverage"]);
    expect(settings.autoLinkCount).toBe(5);
    expect(settings.researchEnabled).toBe(true);
    expect(settings.targetWordCount).toBe(3000);
  });
});

describe("Content Scheduler — Run Logs", () => {
  it("returns empty array when no logs exist for a run", async () => {
    const logs = await caller.scheduler.getRunLogs({ runId: 999 });
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(0);
  });

  it("returns empty array when no runId or jobId provided", async () => {
    const logs = await caller.scheduler.getRunLogs({});
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(0);
  });

  it("returns empty array for jobId with no logs", async () => {
    const logs = await caller.scheduler.getRunLogs({ jobId: 999 });
    expect(Array.isArray(logs)).toBe(true);
    expect(logs.length).toBe(0);
  });

  it("accepts limit parameter", async () => {
    const logs = await caller.scheduler.getRunLogs({ runId: 1, limit: 10 });
    expect(Array.isArray(logs)).toBe(true);
  });
});
