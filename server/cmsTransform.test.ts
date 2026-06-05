import { describe, it, expect } from "vitest";

const CMS_BASE_URL = "https://medicarefaq-next-nine.vercel.app";

describe("CMS Transform with AI", () => {
  it("should use the correct domain (medicarefaq-next-nine.vercel.app) not rebuild.medicarecompared.com", async () => {
    // The transform endpoint must be on the API domain, not the frontend domain
    // rebuild.medicarecompared.com returns HTML (frontend), not JSON (API)
    const frontendRes = await fetch(
      "https://rebuild.medicarecompared.com/api/cms/drafts",
      { headers: { "x-cms-password": process.env.CMS_PASSWORD || "" } }
    );
    const frontendText = await frontendRes.text();
    // Frontend domain returns HTML, not JSON
    expect(frontendText.startsWith("<!doctype") || frontendText.startsWith("<")).toBe(true);

    // API domain returns JSON
    const apiRes = await fetch(`${CMS_BASE_URL}/api/cms/drafts`, {
      headers: { "x-cms-password": process.env.CMS_PASSWORD || "" },
    });
    const apiText = await apiRes.text();
    expect(apiText.startsWith("{") || apiText.startsWith("[")).toBe(true);
  });

  it("should create a draft and successfully call transform on it", async () => {
    const password = process.env.CMS_PASSWORD;
    if (!password) throw new Error("CMS_PASSWORD not set");

    // Create a test draft
    const draftRes = await fetch(`${CMS_BASE_URL}/api/cms/drafts`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-cms-password": password,
      },
      body: JSON.stringify({
        title: "VITEST - Transform Test (Auto-Delete)",
        slug: "vitest-transform-test-auto-delete",
        rawContent: "<p>Test content for transform verification.</p>",
        category: "General",
        author: "Vitest",
      }),
    });

    expect(draftRes.ok).toBe(true);
    const draftData = await draftRes.json();
    expect(draftData.id).toBeDefined();
    expect(typeof draftData.id).toBe("string");
    expect(draftData.id.length).toBeGreaterThan(0);

    // Call transform on the draft
    const transformUrl = `${CMS_BASE_URL}/api/cms/drafts/${draftData.id}/transform`;
    const transformRes = await fetch(transformUrl, {
      method: "POST",
      headers: { "x-cms-password": password },
    });

    expect(transformRes.ok).toBe(true);
    const transformData = await transformRes.json();
    expect(transformData.success).toBe(true);

    // Clean up: delete the test draft
    await fetch(`${CMS_BASE_URL}/api/cms/drafts/${draftData.id}`, {
      method: "DELETE",
      headers: { "x-cms-password": password },
    });
  });

  it("should have the correct transform URL in routers.ts (not rebuild.medicarecompared.com)", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const routersPath = path.resolve(__dirname, "routers.ts");
    const routersContent = fs.readFileSync(routersPath, "utf-8");

    // The transform call should use the correct API domain
    expect(routersContent).toContain(
      "medicarefaq-next-nine.vercel.app/api/cms/drafts/"
    );
    // Should NOT use the frontend domain for the transform call
    expect(routersContent).not.toContain(
      "rebuild.medicarecompared.com/api/cms/drafts/"
    );
  });
});
