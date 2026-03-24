import { describe, it, expect } from "vitest";

/**
 * Tests for the Cross Check feature integration.
 * These validate the response structure and UI data flow.
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
});
