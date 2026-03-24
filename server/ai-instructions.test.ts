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

  describe("Section Templates", () => {
    // Template structure validation
    interface TemplateItem {
      icon: unknown;
      label: string;
      description: string;
      section: {
        heading: string;
        type: "h2" | "h3";
        points: string[];
        subSections?: { heading: string; type: "h3"; points: string[]; aiInstructions?: string }[];
        aiInstructions?: string;
      };
    }

    const SECTION_TEMPLATES: { category: string; items: TemplateItem[] }[] = [
      { category: "Engagement", items: [
        { icon: null, label: "Key Takeaways", description: "Summary box of main points", section: { heading: "Key Takeaways", type: "h2", points: ["Main takeaway point 1", "Main takeaway point 2", "Main takeaway point 3"], aiInstructions: "Format as a highlighted summary box with bullet points." } },
        { icon: null, label: "Who This Is For / Not For", description: "Clarify the target audience", section: { heading: "Who This Guide Is For", type: "h2", points: ["Ideal reader profile", "What problems they have", "Who this is NOT for"], subSections: [{ heading: "This Guide Is Perfect For You If...", type: "h3", points: ["Describe ideal reader"], aiInstructions: "Use bullet points." }, { heading: "This Might Not Be For You If...", type: "h3", points: ["Describe who should look elsewhere"], aiInstructions: "Use bullet points." }], aiInstructions: "Be direct and specific." } },
        { icon: null, label: "FAQ Section", description: "Common questions and answers", section: { heading: "Frequently Asked Questions", type: "h2", points: ["Answer common questions"], aiInstructions: "Format as Q&A pairs." } },
      ]},
      { category: "Content Blocks", items: [
        { icon: null, label: "Pros & Cons", description: "Balanced advantages and disadvantages", section: { heading: "Pros and Cons", type: "h2", points: ["List advantages", "List disadvantages"], subSections: [{ heading: "Pros", type: "h3", points: ["Key advantages"], aiInstructions: "Use bullet points." }, { heading: "Cons", type: "h3", points: ["Key disadvantages"], aiInstructions: "Use bullet points." }], aiInstructions: "Present balanced assessment." } },
        { icon: null, label: "Quick Answer Box", description: "Direct answer for featured snippets", section: { heading: "Quick Answer", type: "h2", points: ["Provide direct answer"], aiInstructions: "Write under 50 words." } },
      ]},
    ];

    it("every template has a non-empty label and description", () => {
      for (const category of SECTION_TEMPLATES) {
        for (const item of category.items) {
          expect(item.label.length).toBeGreaterThan(0);
          expect(item.description.length).toBeGreaterThan(0);
        }
      }
    });

    it("every template section has a heading and type h2", () => {
      for (const category of SECTION_TEMPLATES) {
        for (const item of category.items) {
          expect(item.section.heading.length).toBeGreaterThan(0);
          expect(item.section.type).toBe("h2");
        }
      }
    });

    it("every template section has at least one point", () => {
      for (const category of SECTION_TEMPLATES) {
        for (const item of category.items) {
          expect(item.section.points.length).toBeGreaterThanOrEqual(1);
        }
      }
    });

    it("every template section has aiInstructions", () => {
      for (const category of SECTION_TEMPLATES) {
        for (const item of category.items) {
          expect(item.section.aiInstructions).toBeDefined();
          expect(item.section.aiInstructions!.length).toBeGreaterThan(0);
        }
      }
    });

    it("templates with subSections have valid sub-section structure", () => {
      for (const category of SECTION_TEMPLATES) {
        for (const item of category.items) {
          if (item.section.subSections) {
            for (const sub of item.section.subSections) {
              expect(sub.heading.length).toBeGreaterThan(0);
              expect(sub.type).toBe("h3");
              expect(sub.points.length).toBeGreaterThanOrEqual(1);
            }
          }
        }
      }
    });

    it("template sections produce valid outline text with buildOutlineText", () => {
      for (const category of SECTION_TEMPLATES) {
        for (const item of category.items) {
          const section: OutlineSection = {
            id: "template-test",
            ...item.section,
            subSections: item.section.subSections?.map((sub, i) => ({
              id: `template-test-sub${i}`,
              ...sub,
            })),
          };
          const result = buildOutlineText([section]);
          expect(result).toContain(`## ${item.section.heading}`);
          if (item.section.aiInstructions) {
            expect(result).toContain("[AI INSTRUCTIONS");
          }
        }
      }
    });

    it("Who This Is For template has both positive and negative sub-sections", () => {
      const whoTemplate = SECTION_TEMPLATES[0].items[1];
      expect(whoTemplate.label).toBe("Who This Is For / Not For");
      expect(whoTemplate.section.subSections).toHaveLength(2);
      expect(whoTemplate.section.subSections![0].heading).toContain("Perfect For You");
      expect(whoTemplate.section.subSections![1].heading).toContain("Not Be For You");
    });

    it("Pros & Cons template has both pros and cons sub-sections", () => {
      const prosConsTemplate = SECTION_TEMPLATES[1].items[0];
      expect(prosConsTemplate.label).toBe("Pros & Cons");
      expect(prosConsTemplate.section.subSections).toHaveLength(2);
      expect(prosConsTemplate.section.subSections![0].heading).toBe("Pros");
      expect(prosConsTemplate.section.subSections![1].heading).toBe("Cons");
    });
  });
});
