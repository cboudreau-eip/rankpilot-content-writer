import { describe, it, expect } from "vitest";
import type { OutlineSection } from "../drizzle/schema";

/**
 * Tests for per-section AI instructions feature.
 * Validates that:
 * 1. The OutlineSection type supports aiInstructions field
 * 2. The outlineText builder correctly includes AI instructions in the prompt
 * 3. AI instructions are omitted when empty/undefined
 */

// Replicated from routers.ts — the outline text builder logic
function buildOutlineText(sections: OutlineSection[]): string {
  return sections.map((section: OutlineSection) => {
    let text = `## ${section.heading}\n`;
    if (section.points) {
      text += section.points.map((p: string) => `- ${p}`).join("\n") + "\n";
    }
    if (section.aiInstructions?.trim()) {
      text += `[AI INSTRUCTIONS FOR THIS SECTION: ${section.aiInstructions.trim()}]\n`;
    }
    if (section.subSections) {
      for (const sub of section.subSections) {
        text += `### ${sub.heading}\n`;
        if (sub.points) {
          text += sub.points.map((p: string) => `- ${p}`).join("\n") + "\n";
        }
        if (sub.aiInstructions?.trim()) {
          text += `[AI INSTRUCTIONS FOR THIS SUB-SECTION: ${sub.aiInstructions.trim()}]\n`;
        }
      }
    }
    return text;
  }).join("\n");
}

describe("Per-section AI Instructions", () => {
  describe("OutlineSection type", () => {
    it("allows aiInstructions as an optional field", () => {
      const section: OutlineSection = {
        id: "s1",
        heading: "Introduction",
        type: "h2",
        points: ["Key point 1"],
        aiInstructions: "Include a comparison table here",
      };
      expect(section.aiInstructions).toBe("Include a comparison table here");
    });

    it("allows aiInstructions to be undefined", () => {
      const section: OutlineSection = {
        id: "s2",
        heading: "Overview",
        type: "h2",
        points: ["Key point 1"],
      };
      expect(section.aiInstructions).toBeUndefined();
    });

    it("supports aiInstructions on sub-sections", () => {
      const section: OutlineSection = {
        id: "s3",
        heading: "Main Topic",
        type: "h2",
        subSections: [
          {
            id: "s3-1",
            heading: "Sub Topic",
            type: "h3",
            points: ["Detail 1"],
            aiInstructions: "Use bullet points and statistics",
          },
        ],
      };
      expect(section.subSections![0].aiInstructions).toBe("Use bullet points and statistics");
    });
  });

  describe("buildOutlineText", () => {
    it("includes AI instructions in the outline text for H2 sections", () => {
      const sections: OutlineSection[] = [
        {
          id: "s1",
          heading: "Benefits Overview",
          type: "h2",
          points: ["Cost savings", "Better coverage"],
          aiInstructions: "Include a comparison table between Plan A and Plan B",
        },
      ];
      const result = buildOutlineText(sections);
      expect(result).toContain("## Benefits Overview");
      expect(result).toContain("- Cost savings");
      expect(result).toContain("[AI INSTRUCTIONS FOR THIS SECTION: Include a comparison table between Plan A and Plan B]");
    });

    it("includes AI instructions in the outline text for H3 sub-sections", () => {
      const sections: OutlineSection[] = [
        {
          id: "s1",
          heading: "Main Section",
          type: "h2",
          points: ["Overview point"],
          subSections: [
            {
              id: "s1-1",
              heading: "Sub Section",
              type: "h3",
              points: ["Detail point"],
              aiInstructions: "Focus on real-world examples and case studies",
            },
          ],
        },
      ];
      const result = buildOutlineText(sections);
      expect(result).toContain("### Sub Section");
      expect(result).toContain("[AI INSTRUCTIONS FOR THIS SUB-SECTION: Focus on real-world examples and case studies]");
    });

    it("omits AI instructions when field is undefined", () => {
      const sections: OutlineSection[] = [
        {
          id: "s1",
          heading: "Simple Section",
          type: "h2",
          points: ["Point 1"],
        },
      ];
      const result = buildOutlineText(sections);
      expect(result).toContain("## Simple Section");
      expect(result).not.toContain("[AI INSTRUCTIONS");
    });

    it("omits AI instructions when field is empty string", () => {
      const sections: OutlineSection[] = [
        {
          id: "s1",
          heading: "Empty Instructions",
          type: "h2",
          points: ["Point 1"],
          aiInstructions: "",
        },
      ];
      const result = buildOutlineText(sections);
      expect(result).not.toContain("[AI INSTRUCTIONS");
    });

    it("omits AI instructions when field is whitespace only", () => {
      const sections: OutlineSection[] = [
        {
          id: "s1",
          heading: "Whitespace Instructions",
          type: "h2",
          points: ["Point 1"],
          aiInstructions: "   ",
        },
      ];
      const result = buildOutlineText(sections);
      expect(result).not.toContain("[AI INSTRUCTIONS");
    });

    it("handles mixed sections with and without AI instructions", () => {
      const sections: OutlineSection[] = [
        {
          id: "s1",
          heading: "Section With Instructions",
          type: "h2",
          points: ["Point A"],
          aiInstructions: "Add a chart showing trends",
        },
        {
          id: "s2",
          heading: "Section Without Instructions",
          type: "h2",
          points: ["Point B"],
        },
        {
          id: "s3",
          heading: "Another With Instructions",
          type: "h2",
          points: ["Point C"],
          aiInstructions: "Use a step-by-step numbered list",
        },
      ];
      const result = buildOutlineText(sections);

      // First section has instructions
      expect(result).toContain("[AI INSTRUCTIONS FOR THIS SECTION: Add a chart showing trends]");
      // Second section does not
      expect(result).toContain("## Section Without Instructions");
      // Third section has instructions
      expect(result).toContain("[AI INSTRUCTIONS FOR THIS SECTION: Use a step-by-step numbered list]");

      // Count occurrences of AI INSTRUCTIONS
      const matches = result.match(/\[AI INSTRUCTIONS/g);
      expect(matches).toHaveLength(2);
    });

    it("handles both H2 and H3 AI instructions in the same section", () => {
      const sections: OutlineSection[] = [
        {
          id: "s1",
          heading: "Parent Section",
          type: "h2",
          points: ["Overview"],
          aiInstructions: "Start with a brief summary paragraph",
          subSections: [
            {
              id: "s1-1",
              heading: "Child Section",
              type: "h3",
              points: ["Detail"],
              aiInstructions: "Include a data table with 3 columns",
            },
          ],
        },
      ];
      const result = buildOutlineText(sections);
      expect(result).toContain("[AI INSTRUCTIONS FOR THIS SECTION: Start with a brief summary paragraph]");
      expect(result).toContain("[AI INSTRUCTIONS FOR THIS SUB-SECTION: Include a data table with 3 columns]");
    });

    it("trims whitespace from AI instructions", () => {
      const sections: OutlineSection[] = [
        {
          id: "s1",
          heading: "Trimmed",
          type: "h2",
          points: [],
          aiInstructions: "  Include a chart here  ",
        },
      ];
      const result = buildOutlineText(sections);
      expect(result).toContain("[AI INSTRUCTIONS FOR THIS SECTION: Include a chart here]");
      expect(result).not.toContain("  Include a chart here  ");
    });
  });

  describe("appendAiPreset logic", () => {
    // Replicated append logic from the frontend
    function appendPreset(existing: string | undefined, presetValue: string): string {
      const trimmed = (existing || "").trim();
      return trimmed ? `${trimmed}. ${presetValue}` : presetValue;
    }

    it("sets preset as the value when AI instructions are empty", () => {
      const result = appendPreset("", "Include a comparison table");
      expect(result).toBe("Include a comparison table");
    });

    it("sets preset as the value when AI instructions are undefined", () => {
      const result = appendPreset(undefined, "Use bullet points for key information");
      expect(result).toBe("Use bullet points for key information");
    });

    it("appends preset to existing instructions with period separator", () => {
      const result = appendPreset("Focus on statistics", "Include a comparison table");
      expect(result).toBe("Focus on statistics. Include a comparison table");
    });

    it("trims existing instructions before appending", () => {
      const result = appendPreset("  Focus on statistics  ", "Include a comparison table");
      expect(result).toBe("Focus on statistics. Include a comparison table");
    });

    it("can chain multiple presets", () => {
      let instructions = appendPreset("", "Use bullet points for key information");
      instructions = appendPreset(instructions, "Include a comparison table");
      instructions = appendPreset(instructions, "Focus on actionable, practical tips the reader can apply immediately");
      expect(instructions).toBe("Use bullet points for key information. Include a comparison table. Focus on actionable, practical tips the reader can apply immediately");
    });
  });
});
