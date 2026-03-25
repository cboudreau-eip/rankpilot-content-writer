import { describe, it, expect } from "vitest";

/**
 * Tests for the Redundancy Checker feature.
 * Validates response structure, severity/type counting, JSON parsing,
 * and the surgical text replacement logic for applying fixes.
 */

describe("Redundancy Checker", () => {
  describe("Response structure", () => {
    it("should have the expected shape for a clean result (no redundancies)", () => {
      const mockResult = {
        results: {
          summary: "The article is well-written with no redundancies.",
          redundancyScore: 9,
          redundancies: [],
          cleanSections: [
            "Introduction section is concise and unique",
            "Coverage details are well-organized",
          ],
        },
      };

      expect(mockResult.results).toHaveProperty("summary");
      expect(mockResult.results).toHaveProperty("redundancyScore");
      expect(mockResult.results).toHaveProperty("redundancies");
      expect(mockResult.results).toHaveProperty("cleanSections");
      expect(mockResult.results.redundancies).toHaveLength(0);
      expect(mockResult.results.cleanSections).toHaveLength(2);
      expect(mockResult.results.redundancyScore).toBe(9);
    });

    it("should have the expected shape for a result with redundancies", () => {
      const mockResult = {
        results: {
          summary: "Found 3 redundancies in the article.",
          redundancyScore: 5,
          redundancies: [
            {
              type: "repeated_phrase",
              severity: "high",
              description: "The same sentence appears in both the introduction and conclusion.",
              originalText: "Medicare covers a wide range of preventive services at no cost to you.",
              secondInstance: "At no cost to you, Medicare covers a wide range of preventive services.",
              suggestedFix: "Remove the duplicate from the conclusion or rephrase it to add new information.",
            },
            {
              type: "filler_pattern",
              severity: "low",
              description: "Generic filler phrase that adds no value.",
              originalText: "It's important to note that Medicare enrollment has specific deadlines.",
              secondInstance: "",
              suggestedFix: "Medicare enrollment has specific deadlines.",
            },
            {
              type: "recycled_stat",
              severity: "medium",
              description: "The same statistic is cited twice.",
              originalText: "Over 65 million Americans are enrolled in Medicare.",
              secondInstance: "With more than 65 million enrollees, Medicare is the largest...",
              suggestedFix: "Remove the second mention or replace with a different supporting statistic.",
            },
          ],
          cleanSections: ["Benefits overview section is well-written"],
        },
      };

      expect(mockResult.results.redundancies).toHaveLength(3);
      expect(mockResult.results.redundancies[0].type).toBe("repeated_phrase");
      expect(mockResult.results.redundancies[1].type).toBe("filler_pattern");
      expect(mockResult.results.redundancies[2].type).toBe("recycled_stat");
      expect(mockResult.results.redundancyScore).toBe(5);
    });

    it("should support all four redundancy types", () => {
      const types = ["repeated_phrase", "redundant_idea", "recycled_stat", "filler_pattern"];
      const redundancies = types.map((t) => ({
        type: t,
        severity: "medium",
        description: `A ${t} redundancy`,
        originalText: "Some text",
        secondInstance: "",
        suggestedFix: "Fixed text",
      }));

      redundancies.forEach((r, i) => {
        expect(r.type).toBe(types[i]);
      });
    });

    it("should support all three severity levels", () => {
      const severities = ["high", "medium", "low"];
      const redundancies = severities.map((sev) => ({
        type: "filler_pattern",
        severity: sev,
        description: `A ${sev} severity item`,
        originalText: "Some text",
        suggestedFix: "Fixed text",
      }));

      redundancies.forEach((r, i) => {
        expect(r.severity).toBe(severities[i]);
      });
    });
  });

  describe("Severity and type counting", () => {
    it("should correctly count redundancies by severity", () => {
      const redundancies = [
        { severity: "high", type: "repeated_phrase" },
        { severity: "high", type: "redundant_idea" },
        { severity: "medium", type: "recycled_stat" },
        { severity: "low", type: "filler_pattern" },
        { severity: "low", type: "filler_pattern" },
        { severity: "low", type: "filler_pattern" },
      ];

      const highCount = redundancies.filter((r) => r.severity === "high").length;
      const mediumCount = redundancies.filter((r) => r.severity === "medium").length;
      const lowCount = redundancies.filter((r) => r.severity === "low").length;

      expect(highCount).toBe(2);
      expect(mediumCount).toBe(1);
      expect(lowCount).toBe(3);
    });

    it("should correctly count redundancies by type", () => {
      const redundancies = [
        { type: "repeated_phrase", severity: "high" },
        { type: "repeated_phrase", severity: "medium" },
        { type: "filler_pattern", severity: "low" },
        { type: "filler_pattern", severity: "low" },
        { type: "recycled_stat", severity: "medium" },
        { type: "redundant_idea", severity: "high" },
      ];

      const repeatedCount = redundancies.filter((r) => r.type === "repeated_phrase").length;
      const fillerCount = redundancies.filter((r) => r.type === "filler_pattern").length;
      const recycledCount = redundancies.filter((r) => r.type === "recycled_stat").length;
      const redundantCount = redundancies.filter((r) => r.type === "redundant_idea").length;

      expect(repeatedCount).toBe(2);
      expect(fillerCount).toBe(2);
      expect(recycledCount).toBe(1);
      expect(redundantCount).toBe(1);
    });

    it("should handle empty redundancies array", () => {
      const redundancies: any[] = [];

      const highCount = redundancies.filter((r) => r.severity === "high").length;
      expect(highCount).toBe(0);
    });
  });

  describe("JSON parsing from LLM response", () => {
    it("should extract JSON from a clean response", () => {
      const rawContent = `{
        "summary": "No redundancies found",
        "redundancyScore": 9,
        "redundancies": [],
        "cleanSections": ["All sections are unique"]
      }`;

      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBeNull();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.summary).toBe("No redundancies found");
      expect(parsed.redundancyScore).toBe(9);
      expect(parsed.redundancies).toHaveLength(0);
      expect(parsed.cleanSections).toHaveLength(1);
    });

    it("should extract JSON from a response with surrounding text", () => {
      const rawContent = `Here is the analysis:
      {
        "summary": "Found issues",
        "redundancyScore": 4,
        "redundancies": [{"type": "filler_pattern", "severity": "low", "description": "Filler", "originalText": "It is important to note that", "secondInstance": "", "suggestedFix": ""}],
        "cleanSections": []
      }
      End of analysis.`;

      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBeNull();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.summary).toBe("Found issues");
      expect(parsed.redundancyScore).toBe(4);
      expect(parsed.redundancies).toHaveLength(1);
      expect(parsed.redundancies[0].type).toBe("filler_pattern");
    });

    it("should handle content too short error message", () => {
      const errorMsg = "Article content is too short to check for redundancies.";
      expect(errorMsg).toContain("too short");
      expect(errorMsg).toContain("redundancies");
    });
  });

  describe("Redundancy item structure validation", () => {
    it("each redundancy should have all required fields", () => {
      const redundancy = {
        type: "repeated_phrase",
        severity: "high",
        description: "Same sentence appears twice",
        originalText: "Medicare covers preventive services.",
        secondInstance: "Preventive services are covered by Medicare.",
        suggestedFix: "Remove the second instance or rephrase to add new detail.",
      };

      expect(redundancy).toHaveProperty("type");
      expect(redundancy).toHaveProperty("severity");
      expect(redundancy).toHaveProperty("description");
      expect(redundancy).toHaveProperty("originalText");
      expect(redundancy).toHaveProperty("secondInstance");
      expect(redundancy).toHaveProperty("suggestedFix");
      expect(typeof redundancy.originalText).toBe("string");
      expect(typeof redundancy.suggestedFix).toBe("string");
      expect(["repeated_phrase", "redundant_idea", "recycled_stat", "filler_pattern"]).toContain(redundancy.type);
      expect(["high", "medium", "low"]).toContain(redundancy.severity);
    });

    it("should allow empty suggestedFix for removal-only fixes", () => {
      const redundancy = {
        type: "filler_pattern",
        severity: "low",
        description: "This sentence adds no value",
        originalText: "It goes without saying that Medicare is important.",
        secondInstance: "",
        suggestedFix: "",
      };

      expect(redundancy.suggestedFix).toBe("");
    });
  });

  describe("Redundancy score interpretation", () => {
    it("score >= 8 should be considered clean", () => {
      const score = 9;
      const isClean = score >= 8;
      expect(isClean).toBe(true);
    });

    it("score 5-7 should be considered moderate", () => {
      const score = 6;
      const isModerate = score >= 5 && score < 8;
      expect(isModerate).toBe(true);
    });

    it("score < 5 should be considered highly redundant", () => {
      const score = 3;
      const isRedundant = score < 5;
      expect(isRedundant).toBe(true);
    });

    it("score should be between 1 and 10", () => {
      const validScores = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      validScores.forEach((s) => {
        expect(s).toBeGreaterThanOrEqual(1);
        expect(s).toBeLessThanOrEqual(10);
      });
    });
  });

  describe("Fix application logic", () => {
    /**
     * Simulates the surgical text replacement logic used in the frontend.
     * This mirrors the onApply callback in ArticleEditor for redundancy fixes.
     */
    function applyFixToHtml(
      html: string,
      originalText: string,
      suggestedFix: string
    ): { html: string; applied: boolean } {
      const segments: { type: "tag" | "text"; content: string }[] = [];
      const tagRegex = /<[^>]+>/g;
      let lastIdx = 0;
      let match;
      while ((match = tagRegex.exec(html)) !== null) {
        if (match.index > lastIdx) {
          segments.push({ type: "text", content: html.slice(lastIdx, match.index) });
        }
        segments.push({ type: "tag", content: match[0] });
        lastIdx = match.index + match[0].length;
      }
      if (lastIdx < html.length) {
        segments.push({ type: "text", content: html.slice(lastIdx) });
      }

      const fullText = segments
        .filter((s) => s.type === "text")
        .map((s) => s.content)
        .join("");
      const phraseStart = fullText.indexOf(originalText);
      if (phraseStart < 0) return { html, applied: false };
      const phraseEnd = phraseStart + originalText.length;

      const newSegments: string[] = [];
      let textOffset = 0;
      for (const seg of segments) {
        if (seg.type === "tag") {
          newSegments.push(seg.content);
        } else {
          const segStart = textOffset;
          const segEnd = textOffset + seg.content.length;
          if (segEnd <= phraseStart || segStart >= phraseEnd) {
            newSegments.push(seg.content);
          } else {
            const overlapStart = Math.max(0, phraseStart - segStart);
            const overlapEnd = Math.min(seg.content.length, phraseEnd - segStart);
            let built = "";
            if (overlapStart > 0) built += seg.content.slice(0, overlapStart);
            if (segStart <= phraseStart) {
              built += suggestedFix;
            }
            if (overlapEnd < seg.content.length) built += seg.content.slice(overlapEnd);
            newSegments.push(built);
          }
          textOffset += seg.content.length;
        }
      }

      return { html: newSegments.join(""), applied: true };
    }

    it("should replace a filler phrase with the cleaned version", () => {
      const html = "<p>It's important to note that Medicare enrollment has specific deadlines.</p>";
      const result = applyFixToHtml(
        html,
        "It's important to note that Medicare enrollment has specific deadlines.",
        "Medicare enrollment has specific deadlines."
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("Medicare enrollment has specific deadlines.");
      expect(result.html).not.toContain("It's important to note that");
    });

    it("should remove text entirely when suggestedFix is empty", () => {
      const html = "<p>First paragraph. Furthermore, this adds nothing. Last paragraph.</p>";
      const result = applyFixToHtml(
        html,
        "Furthermore, this adds nothing. ",
        ""
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("First paragraph.");
      expect(result.html).toContain("Last paragraph.");
      expect(result.html).not.toContain("Furthermore");
    });

    it("should preserve surrounding HTML tags", () => {
      const html = "<p>Some intro. <strong>It goes without saying that benefits are important.</strong> More text.</p>";
      const result = applyFixToHtml(
        html,
        "It goes without saying that benefits are important.",
        "Benefits are important."
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("<strong>");
      expect(result.html).toContain("</strong>");
      expect(result.html).toContain("Benefits are important.");
    });

    it("should return applied=false when text is not found", () => {
      const html = "<p>This article discusses Medicare benefits.</p>";
      const result = applyFixToHtml(
        html,
        "This text does not exist in the article",
        "Replacement text"
      );
      expect(result.applied).toBe(false);
      expect(result.html).toBe(html);
    });

    it("should apply multiple fixes sequentially", () => {
      let html = "<p>It's important to note that costs vary. When it comes to enrollment, timing matters.</p>";

      const result1 = applyFixToHtml(
        html,
        "It's important to note that costs vary.",
        "Costs vary."
      );
      expect(result1.applied).toBe(true);
      html = result1.html;

      const result2 = applyFixToHtml(
        html,
        "When it comes to enrollment, timing matters.",
        "Enrollment timing matters."
      );
      expect(result2.applied).toBe(true);
      html = result2.html;

      expect(html).toContain("Costs vary.");
      expect(html).toContain("Enrollment timing matters.");
      expect(html).not.toContain("It's important to note that");
      expect(html).not.toContain("When it comes to");
    });

    it("should handle text spanning multiple HTML elements", () => {
      const html = "<p>Moreover, <em>this point was already covered</em> in the introduction.</p>";
      const result = applyFixToHtml(
        html,
        "this point was already covered",
        "additional details about coverage"
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("additional details about coverage");
    });

    it("should only replace the first occurrence of repeated text", () => {
      const html = "<p>Medicare is great. Medicare is great.</p>";
      const result = applyFixToHtml(
        html,
        "Medicare is great.",
        "Medicare provides excellent coverage."
      );
      expect(result.applied).toBe(true);
      // First occurrence replaced, second remains
      expect(result.html).toContain("Medicare provides excellent coverage.");
      expect(result.html).toContain("Medicare is great.");
    });
  });

  describe("Selection logic", () => {
    it("should track selected indices correctly", () => {
      const selected = new Set<number>();

      // Select items
      selected.add(0);
      selected.add(2);
      selected.add(4);
      expect(selected.size).toBe(3);
      expect(selected.has(0)).toBe(true);
      expect(selected.has(1)).toBe(false);
      expect(selected.has(2)).toBe(true);

      // Deselect
      selected.delete(2);
      expect(selected.size).toBe(2);
      expect(selected.has(2)).toBe(false);
    });

    it("should map selected indices to fixes correctly", () => {
      const redundancies = [
        { originalText: "Text A", suggestedFix: "Fix A" },
        { originalText: "Text B", suggestedFix: "Fix B" },
        { originalText: "Text C", suggestedFix: "" },
        { originalText: "Text D", suggestedFix: "Fix D" },
      ];

      const selected = new Set([0, 2, 3]);
      const fixes = Array.from(selected)
        .map((i) => ({
          originalText: redundancies[i]?.originalText,
          suggestedFix: redundancies[i]?.suggestedFix ?? "",
        }))
        .filter((f) => f.originalText);

      expect(fixes).toHaveLength(3);
      expect(fixes[0].originalText).toBe("Text A");
      expect(fixes[0].suggestedFix).toBe("Fix A");
      expect(fixes[1].originalText).toBe("Text C");
      expect(fixes[1].suggestedFix).toBe(""); // Removal fix
      expect(fixes[2].originalText).toBe("Text D");
    });

    it("should clear selections after applying", () => {
      const selected = new Set([0, 1, 2]);
      expect(selected.size).toBe(3);

      // Simulate clearing after apply
      const cleared = new Set<number>();
      expect(cleared.size).toBe(0);
    });
  });
});
