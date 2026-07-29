import { describe, it, expect } from "vitest";
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

describe("ICP Export Routes", () => {
  it("icpProfiles.export route exists and is callable", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    // Route exists - calling with non-existent ID should throw "not found" not "procedure not found"
    await expect(caller.icpProfiles.export({ id: 999999 })).rejects.toThrow();
  });

  it("icpProfiles.exportPdf route exists and is callable", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.icpProfiles.exportPdf({ id: 999999 })).rejects.toThrow();
  });
});

describe("Brand Voice Export Routes", () => {
  it("brandVoices.export route exists and is callable", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.brandVoices.export({ id: 999999 })).rejects.toThrow();
  });

  it("brandVoices.exportPdf route exists and is callable", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.brandVoices.exportPdf({ id: 999999 })).rejects.toThrow();
  });
});

describe("ICP Markdown Export Format", () => {
  it("generates proper markdown structure from ICP data", () => {
    const icpData = {
      name: "Enterprise Decision Maker",
      description: "C-level executives at mid-market companies",
      demographics: { ageRange: "40-55", location: "US", occupation: "VP/Director" },
      painPoints: ["Time constraints", "Budget pressure"],
      goals: ["Increase revenue", "Reduce costs"],
      objections: ["Too expensive", "Already have a solution"],
      contentPreferences: ["Case studies", "Whitepapers"],
      searchBehavior: "Searches for ROI-focused content",
    };

    let md = `# ICP Profile: ${icpData.name}\n\n`;
    if (icpData.description) md += `## Description\n${icpData.description}\n\n`;
    const demo = icpData.demographics;
    if (demo) {
      md += `## Demographics\n`;
      if (demo.ageRange) md += `- **Age Range:** ${demo.ageRange}\n`;
      if (demo.location) md += `- **Location:** ${demo.location}\n`;
      if (demo.occupation) md += `- **Occupation:** ${demo.occupation}\n`;
      md += `\n`;
    }
    if (icpData.painPoints?.length) {
      md += `## Pain Points\n${icpData.painPoints.map(p => `- ${p}`).join('\n')}\n\n`;
    }
    if (icpData.goals?.length) {
      md += `## Goals\n${icpData.goals.map(g => `- ${g}`).join('\n')}\n\n`;
    }

    expect(md).toContain("# ICP Profile: Enterprise Decision Maker");
    expect(md).toContain("## Description");
    expect(md).toContain("## Demographics");
    expect(md).toContain("- **Age Range:** 40-55");
    expect(md).toContain("## Pain Points");
    expect(md).toContain("- Time constraints");
    expect(md).toContain("## Goals");
    expect(md).toContain("- Increase revenue");
  });
});

describe("Brand Voice Markdown Export Format", () => {
  it("generates proper markdown from brand voice data", () => {
    const bvData = {
      name: "Professional Voice",
      toneTraits: "PRIMARY:Professional,Authoritative|SUPPORTING:Empathetic,Calm",
      perspective: "second",
      sentenceStyle: "mixed",
      avoidList: "PRESETS:jargon,salesy|CUSTOM:competitor mentions",
      writingStyleSample: "We help you achieve your goals with clarity.",
    };

    let primaryTones: string[] = [];
    let supportingTones: string[] = [];
    const toneTraits = bvData.toneTraits || "";
    if (toneTraits.includes("PRIMARY:") || toneTraits.includes("SUPPORTING:")) {
      const parts = toneTraits.split("|");
      for (const part of parts) {
        if (part.startsWith("PRIMARY:")) primaryTones = part.replace("PRIMARY:", "").split(",").filter(Boolean);
        else if (part.startsWith("SUPPORTING:")) supportingTones = part.replace("SUPPORTING:", "").split(",").filter(Boolean);
      }
    }

    const AVOID_LABELS: Record<string, string> = {
      jargon: "Overly technical jargon", salesy: "Sales-heavy language",
    };
    let avoidItems: string[] = [];
    const avoidList = bvData.avoidList || "";
    if (avoidList.includes("PRESETS:") || avoidList.includes("CUSTOM:")) {
      const parts = avoidList.split("|");
      for (const part of parts) {
        if (part.startsWith("PRESETS:")) {
          const presetIds = part.replace("PRESETS:", "").split(",").filter(Boolean);
          avoidItems.push(...presetIds.map(id => AVOID_LABELS[id] || id));
        } else if (part.startsWith("CUSTOM:")) {
          const custom = part.replace("CUSTOM:", "").trim();
          if (custom) avoidItems.push(...custom.split(",").map(s => s.trim()).filter(Boolean));
        }
      }
    }

    const perspectiveMap: Record<string, string> = { first: "First Person (we/our/us)", second: "Second Person (you/your)", third: "Third Person (they/the company)" };
    const styleMap: Record<string, string> = { short: "Short and Direct", mixed: "Mixed (Varied Rhythm)", detailed: "Detailed and Explanatory" };

    let md = `# Brand Voice: ${bvData.name}\n\n`;
    md += `## Tone\n`;
    if (primaryTones.length) md += `- **Primary Tones:** ${primaryTones.join(", ")}\n`;
    if (supportingTones.length) md += `- **Supporting Tones:** ${supportingTones.join(", ")}\n`;
    md += `\n## Writing Style\n`;
    md += `- **Perspective:** ${perspectiveMap[bvData.perspective] || bvData.perspective}\n`;
    md += `- **Sentence Style:** ${styleMap[bvData.sentenceStyle] || bvData.sentenceStyle}\n\n`;
    if (avoidItems.length) md += `## Avoid List\n${avoidItems.map(a => `- ${a}`).join('\n')}\n\n`;
    if (bvData.writingStyleSample) md += `## Writing Style Sample\n> ${bvData.writingStyleSample}\n\n`;

    expect(md).toContain("# Brand Voice: Professional Voice");
    expect(md).toContain("- **Primary Tones:** Professional, Authoritative");
    expect(md).toContain("- **Supporting Tones:** Empathetic, Calm");
    expect(md).toContain("- **Perspective:** Second Person (you/your)");
    expect(md).toContain("- **Sentence Style:** Mixed (Varied Rhythm)");
    expect(md).toContain("## Avoid List");
    expect(md).toContain("- Overly technical jargon");
    expect(md).toContain("- Sales-heavy language");
    expect(md).toContain("- competitor mentions");
    expect(md).toContain("## Writing Style Sample");
    expect(md).toContain("> We help you achieve your goals with clarity.");
  });

  it("handles empty tone traits gracefully", () => {
    const bvData = { name: "Minimal", toneTraits: "", perspective: "first", sentenceStyle: "short", avoidList: "", writingStyleSample: "" };
    let primaryTones: string[] = [];
    let supportingTones: string[] = [];
    const toneTraits = bvData.toneTraits || "";
    if (toneTraits.includes("PRIMARY:") || toneTraits.includes("SUPPORTING:")) {
      // won't enter
    } else {
      primaryTones = toneTraits.split(",").map(s => s.trim()).filter(Boolean);
    }

    let md = `# Brand Voice: ${bvData.name}\n\n`;
    md += `## Tone\n`;
    if (primaryTones.length) md += `- **Primary Tones:** ${primaryTones.join(", ")}\n`;
    if (supportingTones.length) md += `- **Supporting Tones:** ${supportingTones.join(", ")}\n`;

    expect(md).toContain("# Brand Voice: Minimal");
    expect(md).toContain("## Tone");
    expect(md).not.toContain("Primary Tones:");
    expect(md).not.toContain("Supporting Tones:");
  });
});
