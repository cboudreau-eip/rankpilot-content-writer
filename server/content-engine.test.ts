import { describe, it, expect } from "vitest";

/**
 * Content Engine page integration tests
 * Tests that the unified page consolidates Pipeline + Scheduler features
 * and that the route/nav are properly wired.
 */

describe("Content Engine - Route and Navigation", () => {
  it("ContentEngine page file exists and is a valid TypeScript/React file", async () => {
    const fs = await import("fs");
    const exists = fs.existsSync("client/src/pages/ContentEngine.tsx");
    expect(exists).toBe(true);
    const content = fs.readFileSync("client/src/pages/ContentEngine.tsx", "utf-8");
    // Should export a default function component
    expect(content).toContain("export default function ContentEngine");
  });

  it("App.tsx includes the /engine route", async () => {
    const fs = await import("fs");
    const appContent = fs.readFileSync("client/src/App.tsx", "utf-8");
    expect(appContent).toContain('path="/engine"');
    expect(appContent).toContain("ContentEngine");
  });

  it("AppLayout nav includes Content Engine link", async () => {
    const fs = await import("fs");
    const layoutContent = fs.readFileSync("client/src/components/AppLayout.tsx", "utf-8");
    expect(layoutContent).toContain('"Content Engine"');
    expect(layoutContent).toContain('"/engine"');
  });

  it("Content Engine page uses all 5 expected tabs", async () => {
    const fs = await import("fs");
    const pageContent = fs.readFileSync("client/src/pages/ContentEngine.tsx", "utf-8");
    
    // Verify all 5 tabs exist
    expect(pageContent).toContain('value="intake"');
    expect(pageContent).toContain('value="review"');
    expect(pageContent).toContain('value="queue"');
    expect(pageContent).toContain('value="schedule"');
    expect(pageContent).toContain('value="output"');
  });

  it("Content Engine page uses drag-and-drop for keyword queue", async () => {
    const fs = await import("fs");
    const pageContent = fs.readFileSync("client/src/pages/ContentEngine.tsx", "utf-8");
    
    expect(pageContent).toContain("DndContext");
    expect(pageContent).toContain("SortableContext");
    expect(pageContent).toContain("useSortable");
    expect(pageContent).toContain("GripVertical");
  });

  it("Content Engine page separates pending and completed keywords", async () => {
    const fs = await import("fs");
    const pageContent = fs.readFileSync("client/src/pages/ContentEngine.tsx", "utf-8");
    
    // Verify section separation
    expect(pageContent).toContain("Up Next");
    expect(pageContent).toContain("Written");
    expect(pageContent).toContain("pendingKeywords");
    expect(pageContent).toContain("completedKeywords");
  });

  it("Content Engine page includes brief review functionality", async () => {
    const fs = await import("fs");
    const pageContent = fs.readFileSync("client/src/pages/ContentEngine.tsx", "utf-8");
    
    // Brief review actions
    expect(pageContent).toContain("approveMutation");
    expect(pageContent).toContain("rejectMutation");
    expect(pageContent).toContain("regenerateMutation");
    expect(pageContent).toContain("BriefCard");
  });

  it("Content Engine page includes job creation and management", async () => {
    const fs = await import("fs");
    const pageContent = fs.readFileSync("client/src/pages/ContentEngine.tsx", "utf-8");
    
    // Job management
    expect(pageContent).toContain("CreateJobDialog");
    expect(pageContent).toContain("EditJobDialog");
    expect(pageContent).toContain("JobDetailView");
    expect(pageContent).toContain("runNowMutation");
    expect(pageContent).toContain("pauseMutation");
    expect(pageContent).toContain("resumeMutation");
  });

  it("Content Engine page includes output/run history", async () => {
    const fs = await import("fs");
    const pageContent = fs.readFileSync("client/src/pages/ContentEngine.tsx", "utf-8");
    
    expect(pageContent).toContain("RunHistoryView");
    expect(pageContent).toContain("RunLogTimeline");
    expect(pageContent).toContain("OutputTab");
    expect(pageContent).toContain("Articles Generated");
    expect(pageContent).toContain("Pushed to CMS");
  });
});
