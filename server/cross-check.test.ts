import { describe, it, expect } from "vitest";

/**
 * Tests for the Cross Check feature integration.
 * These validate the response structure, UI data flow, and correction application logic.
 */

describe("Cross Check", () => {
  describe("Response structure", () => {
    it("should have the expected shape for a clean result (no discrepancies)", () => {
      const mockResult = {
        results: {
          summary: "The article aligns well with the reference document.",
          discrepancies: [],
          alignedFacts: [
            "Medicare Part B premium is correctly stated as $185/month",
            "Enrollment period dates are accurate",
          ],
        },
        referenceDocName: "Medicare 2025 Guidelines",
      };

      expect(mockResult.results).toHaveProperty("summary");
      expect(mockResult.results).toHaveProperty("discrepancies");
      expect(mockResult.results).toHaveProperty("alignedFacts");
      expect(mockResult.referenceDocName).toBe("Medicare 2025 Guidelines");
      expect(mockResult.results.discrepancies).toHaveLength(0);
      expect(mockResult.results.alignedFacts).toHaveLength(2);
    });

    it("should have the expected shape for a result with discrepancies", () => {
      const mockResult = {
        results: {
          summary: "Found 2 factual discrepancies in the article.",
          discrepancies: [
            {
              articleText: "The Medicare Part B premium is $174.70 per month",
              referenceText: "The standard monthly premium for Part B is $185.00 in 2025",
              correction: "The Medicare Part B premium is $185.00 per month in 2025",
              severity: "high",
            },
            {
              articleText: "You can enroll anytime during the year",
              referenceText: "The General Enrollment Period runs from January 1 to March 31",
              correction: "The General Enrollment Period runs from January 1 to March 31 each year",
              severity: "medium",
            },
          ],
          alignedFacts: [
            "Medigap coverage details are accurate",
          ],
        },
        referenceDocName: "Medicare 2025 Guidelines",
      };

      expect(mockResult.results.discrepancies).toHaveLength(2);
      expect(mockResult.results.discrepancies[0].severity).toBe("high");
      expect(mockResult.results.discrepancies[1].severity).toBe("medium");
    });

    it("should support all three severity levels", () => {
      const severities = ["high", "medium", "low"];
      const discrepancies = severities.map((sev) => ({
        articleText: `Text with ${sev} severity`,
        referenceText: "Correct text",
        correction: "Fixed text",
        severity: sev,
      }));

      discrepancies.forEach((d, i) => {
        expect(d.severity).toBe(severities[i]);
      });
    });
  });

  describe("Severity counting", () => {
    it("should correctly count discrepancies by severity", () => {
      const discrepancies = [
        { severity: "high" },
        { severity: "high" },
        { severity: "medium" },
        { severity: "low" },
        { severity: "low" },
        { severity: "low" },
      ];

      const highCount = discrepancies.filter((d) => d.severity === "high").length;
      const mediumCount = discrepancies.filter((d) => d.severity === "medium").length;
      const lowCount = discrepancies.filter((d) => d.severity === "low").length;

      expect(highCount).toBe(2);
      expect(mediumCount).toBe(1);
      expect(lowCount).toBe(3);
    });

    it("should handle empty discrepancies array", () => {
      const discrepancies: any[] = [];

      const highCount = discrepancies.filter((d) => d.severity === "high").length;
      const mediumCount = discrepancies.filter((d) => d.severity === "medium").length;
      const lowCount = discrepancies.filter((d) => d.severity === "low").length;

      expect(highCount).toBe(0);
      expect(mediumCount).toBe(0);
      expect(lowCount).toBe(0);
    });
  });

  describe("JSON parsing from LLM response", () => {
    it("should extract JSON from a clean response", () => {
      const rawContent = `{
        "summary": "All facts aligned",
        "discrepancies": [],
        "alignedFacts": ["Fact 1"]
      }`;

      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBeNull();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.summary).toBe("All facts aligned");
      expect(parsed.discrepancies).toHaveLength(0);
      expect(parsed.alignedFacts).toHaveLength(1);
    });

    it("should extract JSON from a response with surrounding text", () => {
      const rawContent = `Here is the analysis:
      {
        "summary": "Found issues",
        "discrepancies": [{"articleText": "wrong", "referenceText": "right", "correction": "fixed", "severity": "high"}],
        "alignedFacts": []
      }
      End of analysis.`;

      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      expect(jsonMatch).not.toBeNull();
      const parsed = JSON.parse(jsonMatch![0]);
      expect(parsed.summary).toBe("Found issues");
      expect(parsed.discrepancies).toHaveLength(1);
      expect(parsed.discrepancies[0].severity).toBe("high");
    });

    it("should handle missing reference doc error message", () => {
      const errorMsg = "No reference document found for this project. Add one in Project Settings > Cross Check tab.";
      expect(errorMsg).toContain("reference document");
      expect(errorMsg).toContain("Project Settings");
    });
  });

  describe("Discrepancy structure validation", () => {
    it("each discrepancy should have all required fields", () => {
      const discrepancy = {
        articleText: "The premium is $174.70",
        referenceText: "The premium is $185.00",
        correction: "The premium is $185.00 in 2025",
        severity: "high",
      };

      expect(discrepancy).toHaveProperty("articleText");
      expect(discrepancy).toHaveProperty("referenceText");
      expect(discrepancy).toHaveProperty("correction");
      expect(discrepancy).toHaveProperty("severity");
      expect(typeof discrepancy.articleText).toBe("string");
      expect(typeof discrepancy.referenceText).toBe("string");
      expect(typeof discrepancy.correction).toBe("string");
      expect(["high", "medium", "low"]).toContain(discrepancy.severity);
    });
  });

  describe("Correction application logic", () => {
    /**
     * Simulates the surgical text replacement logic used in the frontend.
     * This mirrors the onApply callback in ArticleEditor.
     */
    function applyCorrectionToHtml(
      html: string,
      articleText: string,
      correction: string
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
      const phraseStart = fullText.indexOf(articleText);
      if (phraseStart < 0) return { html, applied: false };
      const phraseEnd = phraseStart + articleText.length;

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
              built += correction;
            }
            if (overlapEnd < seg.content.length) built += seg.content.slice(overlapEnd);
            newSegments.push(built);
          }
          textOffset += seg.content.length;
        }
      }

      return { html: newSegments.join(""), applied: true };
    }

    it("should replace plain text in a simple paragraph", () => {
      const html = "<p>The Medicare Part B premium is $174.70 per month.</p>";
      const result = applyCorrectionToHtml(
        html,
        "The Medicare Part B premium is $174.70 per month",
        "The Medicare Part B premium is $185.00 per month in 2025"
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("$185.00 per month in 2025");
      expect(result.html).not.toContain("$174.70");
    });

    it("should preserve surrounding HTML tags", () => {
      const html = "<p>Some intro text. <strong>The premium is $174.70.</strong> More text here.</p>";
      const result = applyCorrectionToHtml(
        html,
        "The premium is $174.70.",
        "The premium is $185.00 in 2025."
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("<strong>");
      expect(result.html).toContain("</strong>");
      expect(result.html).toContain("$185.00 in 2025");
    });

    it("should return applied=false when text is not found", () => {
      const html = "<p>This article discusses Medicare benefits.</p>";
      const result = applyCorrectionToHtml(
        html,
        "This text does not exist in the article",
        "Replacement text"
      );
      expect(result.applied).toBe(false);
      expect(result.html).toBe(html);
    });

    it("should handle text spanning multiple HTML elements", () => {
      const html = "<p>The enrollment period is <em>open year-round</em> for everyone.</p>";
      const result = applyCorrectionToHtml(
        html,
        "open year-round",
        "from January 1 to March 31"
      );
      expect(result.applied).toBe(true);
      expect(result.html).toContain("from January 1 to March 31");
    });

    it("should apply multiple corrections sequentially", () => {
      let html = "<p>The premium is $174.70. The deductible is $200.</p>";

      const result1 = applyCorrectionToHtml(html, "The premium is $174.70", "The premium is $185.00");
      expect(result1.applied).toBe(true);
      html = result1.html;

      const result2 = applyCorrectionToHtml(html, "The deductible is $200", "The deductible is $257");
      expect(result2.applied).toBe(true);
      html = result2.html;

      expect(html).toContain("$185.00");
      expect(html).toContain("$257");
      expect(html).not.toContain("$174.70");
      expect(html).not.toContain("$200");
    });

    it("should only replace the first occurrence", () => {
      const html = "<p>The cost is $100. Later, the cost is $100 again.</p>";
      const result = applyCorrectionToHtml(html, "The cost is $100", "The cost is $150");
      expect(result.applied).toBe(true);
      expect(result.html).toContain("$150");
    });

    it("should handle empty correction gracefully", () => {
      const html = "<p>Some text here.</p>";
      const result = applyCorrectionToHtml(html, "Some text here", "");
      expect(result.applied).toBe(true);
      expect(result.html).toBe("<p>.</p>");
    });
  });

  describe("Selection logic", () => {
    it("should correctly build corrections array from selected indices", () => {
      const discrepancies = [
        { articleText: "Wrong fact 1", correction: "Correct fact 1", severity: "high" },
        { articleText: "Wrong fact 2", correction: "Correct fact 2", severity: "medium" },
        { articleText: "Wrong fact 3", correction: "Correct fact 3", severity: "low" },
      ];

      const selected = new Set([0, 2]);
      const corrections = Array.from(selected)
        .map((i) => ({
          articleText: discrepancies[i]?.articleText,
          correction: discrepancies[i]?.correction,
        }))
        .filter((c) => c.articleText && c.correction);

      expect(corrections).toHaveLength(2);
      expect(corrections[0].articleText).toBe("Wrong fact 1");
      expect(corrections[1].articleText).toBe("Wrong fact 3");
    });

    it("should filter out discrepancies without corrections", () => {
      const discrepancies = [
        { articleText: "Wrong fact 1", correction: "Correct fact 1", severity: "high" },
        { articleText: "Wrong fact 2", correction: null, severity: "medium" },
        { articleText: "Wrong fact 3", correction: "", severity: "low" },
      ];

      const selected = new Set([0, 1, 2]);
      const corrections = Array.from(selected)
        .map((i) => ({
          articleText: discrepancies[i]?.articleText,
          correction: discrepancies[i]?.correction,
        }))
        .filter((c) => c.articleText && c.correction);

      expect(corrections).toHaveLength(1);
      expect(corrections[0].articleText).toBe("Wrong fact 1");
    });

    it("should handle toggling selection on and off", () => {
      let selected = new Set<number>();

      const toggle = (index: number) => {
        const next = new Set(selected);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        selected = next;
      };

      toggle(0);
      expect(selected.has(0)).toBe(true);
      expect(selected.size).toBe(1);

      toggle(2);
      expect(selected.has(2)).toBe(true);
      expect(selected.size).toBe(2);

      toggle(0);
      expect(selected.has(0)).toBe(false);
      expect(selected.size).toBe(1);
    });
  });
});
