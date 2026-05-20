import { describe, expect, it } from "vitest";
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

describe("outlines router", () => {
  it("outlines.list works without authentication (public access)", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.outlines.list({ projectId: 1 });

    expect(Array.isArray(result)).toBe(true);
  });

  it("outlines.listAll works without authentication", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.outlines.listAll();

    expect(Array.isArray(result)).toBe(true);
  });

  it("outlines.create validates required fields", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.outlines.create({
      title: "Test Outline",
      keyword: "test keyword",
      sections: [
        { id: "s1", heading: "Introduction", type: "h2", points: ["Point 1"], subSections: [] },
        { id: "s2", heading: "Main Content", type: "h2", points: ["Point 2"], subSections: [] },
      ],
      projectId: 1,
    });

    expect(result).toBeDefined();
    expect(result?.title).toBe("Test Outline");
    expect(result?.keyword).toBe("test keyword");
    expect(result?.sections).toHaveLength(2);
  });

  it("outlines.getById returns the created outline", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    // First create one
    const created = await caller.outlines.create({
      title: "GetById Test",
      keyword: "getbyid keyword",
      sections: [{ id: "s1", heading: "Section 1", type: "h2", points: [], subSections: [] }],
      projectId: 1,
    });

    expect(created).toBeDefined();
    expect(created?.id).toBeDefined();

    const fetched = await caller.outlines.getById({ id: created!.id });
    expect(fetched?.title).toBe("GetById Test");
    expect(fetched?.keyword).toBe("getbyid keyword");
  });

  it("outlines.update changes status", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.outlines.create({
      title: "Status Test",
      sections: [{ id: "s1", heading: "Section", type: "h2", points: [], subSections: [] }],
      projectId: 1,
    });

    expect(created).toBeDefined();

    const updated = await caller.outlines.update({
      id: created!.id,
      status: "approved",
    });

    expect(updated?.status).toBe("approved");
  });

  it("outlines.duplicate creates a copy", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.outlines.create({
      title: "Original Outline",
      keyword: "original keyword",
      sections: [
        { id: "s1", heading: "Section 1", type: "h2", points: ["point"], subSections: [] },
      ],
      projectId: 1,
    });

    expect(created).toBeDefined();

    const duplicated = await caller.outlines.duplicate({ id: created!.id });

    expect(duplicated).toBeDefined();
    expect(duplicated?.title).toBe("Original Outline (Copy)");
    expect(duplicated?.keyword).toBe("original keyword");
    expect(duplicated?.sections).toHaveLength(1);
    expect(duplicated?.id).not.toBe(created!.id);
  });

  it("outlines.delete removes the outline", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const created = await caller.outlines.create({
      title: "Delete Me",
      sections: [{ id: "s1", heading: "Section", type: "h2", points: [], subSections: [] }],
      projectId: 1,
    });

    expect(created).toBeDefined();

    const result = await caller.outlines.delete({ id: created!.id });
    expect(result).toEqual({ success: true });

    const fetched = await caller.outlines.getById({ id: created!.id });
    expect(fetched).toBeUndefined();
  });

  it("outlines.applyImprovements processes suggestions correctly", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const sections = [
      { id: "s1", heading: "Introduction", type: "h2", points: ["existing point"], subSections: [] },
      { id: "s2", heading: "Main Content", type: "h2", points: [], subSections: [] },
    ];

    const suggestions = [
      {
        id: "sug1",
        category: "missing_section",
        priority: "high",
        description: "Add a conclusion",
        action: "Add conclusion section",
        targetSectionIndex: -1,
        newSection: { heading: "Conclusion", type: "h2", points: ["Summarize key points"], subSections: [] },
      },
      {
        id: "sug2",
        category: "content_gap",
        priority: "medium",
        description: "Add more detail",
        action: "Include statistics about the topic",
        targetSectionIndex: 1,
      },
    ];

    const result = await caller.outlines.applyImprovements({
      sections,
      suggestions,
      keyword: "test keyword",
      projectId: 1,
    });

    expect(result.sections).toBeDefined();
    expect(result.sections.length).toBeGreaterThan(2); // Should have added a new section
    // The new section should be present
    const conclusionSection = result.sections.find((s: any) => s.heading === "Conclusion");
    expect(conclusionSection).toBeDefined();
    // The content gap should have added a point to section at index 1
    const mainSection = result.sections.find((s: any) => s.heading === "Main Content");
    expect(mainSection?.points).toContain("Include statistics about the topic");
  });
});
