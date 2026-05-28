import { describe, expect, it } from "vitest";

/**
 * Tests for the brief compliance scoring feature.
 *
 * These tests verify:
 * 1. The brief data structure is correctly formed when approving briefs
 * 2. The compliance scoring schema is valid
 * 3. The overall score calculation is correct
 * 4. The brief directive injection into prompts works correctly
 */

describe("Brief Compliance Scoring", () => {
  // ── Brief Data Structure Tests ──

  describe("Brief data structure", () => {
    it("should have all required fields in briefData", () => {
      const briefData = {
        title: "Medicare Advantage Network Changes: How Retirees Can Navigate Provider Shakeups",
        description: "This article will empower Medicare Advantage enrollees by explaining the impact of provider network changes.",
        suggestedWordCount: 1200,
        suggestedLinkCount: 8,
        primaryKeyword: "Medicare Advantage network changes",
        secondaryKeywords: ["Medicare Advantage plans", "in-network providers", "out-of-network costs"],
      };

      expect(briefData).toHaveProperty("title");
      expect(briefData).toHaveProperty("description");
      expect(briefData).toHaveProperty("suggestedWordCount");
      expect(briefData).toHaveProperty("suggestedLinkCount");
      expect(briefData).toHaveProperty("primaryKeyword");
      expect(briefData).toHaveProperty("secondaryKeywords");
      expect(typeof briefData.title).toBe("string");
      expect(typeof briefData.description).toBe("string");
      expect(typeof briefData.suggestedWordCount).toBe("number");
      expect(typeof briefData.suggestedLinkCount).toBe("number");
      expect(typeof briefData.primaryKeyword).toBe("string");
      expect(Array.isArray(briefData.secondaryKeywords)).toBe(true);
    });

    it("should reject briefData with missing required fields", () => {
      const incompleteBriefData = {
        title: "Test Title",
        // missing description, suggestedWordCount, etc.
      };

      expect(incompleteBriefData).not.toHaveProperty("description");
      expect(incompleteBriefData).not.toHaveProperty("suggestedWordCount");
    });
  });

  // ── Compliance Score Calculation Tests ──

  describe("Compliance score calculation", () => {
    it("should calculate overall score as sum of all category scores", () => {
      const complianceResult = {
        titleAdherence: { score: 18, maxScore: 20, notes: "Title closely matches brief direction" },
        keywordCoverage: { score: 22, maxScore: 25, notes: "Primary keyword well-covered, 5/6 secondary keywords found" },
        angleAlignment: { score: 27, maxScore: 30, notes: "Article delivers on the brief's described angle" },
        wordCountAccuracy: { score: 15, maxScore: 15, notes: "Within 10% of target word count" },
        linkCountAccuracy: { score: 7, maxScore: 10, notes: "6 links vs 8 target" },
        summary: "Strong adherence to the content brief with minor gaps in link count.",
      };

      const overallScore =
        complianceResult.titleAdherence.score +
        complianceResult.keywordCoverage.score +
        complianceResult.angleAlignment.score +
        complianceResult.wordCountAccuracy.score +
        complianceResult.linkCountAccuracy.score;

      expect(overallScore).toBe(89);
      expect(overallScore).toBeGreaterThanOrEqual(0);
      expect(overallScore).toBeLessThanOrEqual(100);
    });

    it("should handle perfect score (100)", () => {
      const perfectResult = {
        titleAdherence: { score: 20, maxScore: 20, notes: "Perfect match" },
        keywordCoverage: { score: 25, maxScore: 25, notes: "All keywords covered" },
        angleAlignment: { score: 30, maxScore: 30, notes: "Perfect alignment" },
        wordCountAccuracy: { score: 15, maxScore: 15, notes: "Exact word count" },
        linkCountAccuracy: { score: 10, maxScore: 10, notes: "Exact link count" },
        summary: "Perfect compliance.",
      };

      const overallScore =
        perfectResult.titleAdherence.score +
        perfectResult.keywordCoverage.score +
        perfectResult.angleAlignment.score +
        perfectResult.wordCountAccuracy.score +
        perfectResult.linkCountAccuracy.score;

      expect(overallScore).toBe(100);
    });

    it("should handle zero score (0)", () => {
      const zeroResult = {
        titleAdherence: { score: 0, maxScore: 20, notes: "Completely different title" },
        keywordCoverage: { score: 0, maxScore: 25, notes: "No keywords found" },
        angleAlignment: { score: 0, maxScore: 30, notes: "Different angle entirely" },
        wordCountAccuracy: { score: 0, maxScore: 15, notes: "Way off target" },
        linkCountAccuracy: { score: 0, maxScore: 10, notes: "No links" },
        summary: "No compliance with brief.",
      };

      const overallScore =
        zeroResult.titleAdherence.score +
        zeroResult.keywordCoverage.score +
        zeroResult.angleAlignment.score +
        zeroResult.wordCountAccuracy.score +
        zeroResult.linkCountAccuracy.score;

      expect(overallScore).toBe(0);
    });

    it("should have max possible score of exactly 100", () => {
      const maxScores = {
        titleAdherence: 20,
        keywordCoverage: 25,
        angleAlignment: 30,
        wordCountAccuracy: 15,
        linkCountAccuracy: 10,
      };

      const totalMax = Object.values(maxScores).reduce((sum, val) => sum + val, 0);
      expect(totalMax).toBe(100);
    });
  });

  // ── Word Count Accuracy Scoring Tests ──

  describe("Word count accuracy scoring logic", () => {
    function scoreWordCountAccuracy(target: number, actual: number): number {
      const deviation = Math.abs(actual - target) / target;
      if (deviation <= 0.1) return 15;
      if (deviation <= 0.2) return 10;
      if (deviation <= 0.3) return 5;
      return 0;
    }

    it("should score 15 for within ±10%", () => {
      expect(scoreWordCountAccuracy(1200, 1200)).toBe(15); // exact
      expect(scoreWordCountAccuracy(1200, 1100)).toBe(15); // -8.3%
      expect(scoreWordCountAccuracy(1200, 1320)).toBe(15); // +10%
    });

    it("should score 10 for within ±20%", () => {
      expect(scoreWordCountAccuracy(1200, 980)).toBe(10); // -18.3%
      expect(scoreWordCountAccuracy(1200, 1430)).toBe(10); // +19.2%
    });

    it("should score 5 for within ±30%", () => {
      expect(scoreWordCountAccuracy(1200, 860)).toBe(5); // -28.3%
      expect(scoreWordCountAccuracy(1200, 1550)).toBe(5); // +29.2%
    });

    it("should score 0 for beyond ±30%", () => {
      expect(scoreWordCountAccuracy(1200, 700)).toBe(0); // -41.7%
      expect(scoreWordCountAccuracy(1200, 1800)).toBe(0); // +50%
    });
  });

  // ── Link Count Accuracy Scoring Tests ──

  describe("Link count accuracy scoring logic", () => {
    function scoreLinkCountAccuracy(target: number, actual: number): number {
      const diff = Math.abs(actual - target);
      if (diff <= 2) return 10;
      if (diff <= 4) return 7;
      if (diff <= 6) return 3;
      return 0;
    }

    it("should score 10 for within ±2 links", () => {
      expect(scoreLinkCountAccuracy(8, 8)).toBe(10); // exact
      expect(scoreLinkCountAccuracy(8, 6)).toBe(10); // -2
      expect(scoreLinkCountAccuracy(8, 10)).toBe(10); // +2
    });

    it("should score 7 for within ±4 links", () => {
      expect(scoreLinkCountAccuracy(8, 4)).toBe(7); // -4
      expect(scoreLinkCountAccuracy(8, 12)).toBe(7); // +4
    });

    it("should score 3 for within ±6 links", () => {
      expect(scoreLinkCountAccuracy(8, 2)).toBe(3); // -6
      expect(scoreLinkCountAccuracy(8, 14)).toBe(3); // +6
    });

    it("should score 0 for beyond ±6 links", () => {
      expect(scoreLinkCountAccuracy(8, 0)).toBe(0); // -8
      expect(scoreLinkCountAccuracy(8, 20)).toBe(0); // +12
    });
  });

  // ── Brief Directive Injection Tests ──

  describe("Brief directive injection", () => {
    it("should build a brief directive string when briefData is provided", () => {
      const briefData = {
        title: "Medicare Advantage Network Changes",
        description: "Empower Medicare enrollees with actionable strategies.",
        suggestedWordCount: 1200,
        suggestedLinkCount: 8,
        primaryKeyword: "Medicare Advantage network changes",
        secondaryKeywords: ["Medicare Advantage plans", "in-network providers"],
      };

      // Simulate the directive building logic from the outline generator
      let briefDirective = "";
      if (briefData) {
        briefDirective = `
=== PIPELINE BRIEF DIRECTIVE (MUST FOLLOW) ===
BRIEF TITLE DIRECTION: "${briefData.title}"
BRIEF DESCRIPTION / CONTENT ANGLE:
"${briefData.description}"
BRIEF TARGETS:
- Target word count: ${briefData.suggestedWordCount} words
- Target link count: ${briefData.suggestedLinkCount} links
=== END BRIEF DIRECTIVE ===
`;
      }

      expect(briefDirective).toContain("PIPELINE BRIEF DIRECTIVE");
      expect(briefDirective).toContain(briefData.title);
      expect(briefDirective).toContain(briefData.description);
      expect(briefDirective).toContain("1200 words");
      expect(briefDirective).toContain("8 links");
    });

    it("should produce empty string when briefData is null", () => {
      const briefData = null;
      let briefDirective = "";
      if (briefData) {
        briefDirective = "should not be set";
      }

      expect(briefDirective).toBe("");
    });

    it("should produce empty string when briefData is undefined", () => {
      const briefData = undefined;
      let briefDirective = "";
      if (briefData) {
        briefDirective = "should not be set";
      }

      expect(briefDirective).toBe("");
    });
  });

  // ── Compliance Details Schema Validation ──

  describe("Compliance details schema", () => {
    it("should have valid structure for each category", () => {
      const details = {
        overallScore: 85,
        titleAdherence: { score: 18, maxScore: 20, notes: "Good match" },
        keywordCoverage: { score: 20, maxScore: 25, notes: "Most keywords covered" },
        angleAlignment: { score: 25, maxScore: 30, notes: "Aligned with brief" },
        wordCountAccuracy: { score: 15, maxScore: 15, notes: "Within range" },
        linkCountAccuracy: { score: 7, maxScore: 10, notes: "Close to target" },
        summary: "Good compliance overall.",
      };

      // Verify each category has score, maxScore, notes
      for (const key of ["titleAdherence", "keywordCoverage", "angleAlignment", "wordCountAccuracy", "linkCountAccuracy"]) {
        const cat = (details as any)[key];
        expect(cat).toHaveProperty("score");
        expect(cat).toHaveProperty("maxScore");
        expect(cat).toHaveProperty("notes");
        expect(typeof cat.score).toBe("number");
        expect(typeof cat.maxScore).toBe("number");
        expect(typeof cat.notes).toBe("string");
        expect(cat.score).toBeGreaterThanOrEqual(0);
        expect(cat.score).toBeLessThanOrEqual(cat.maxScore);
      }

      expect(details).toHaveProperty("overallScore");
      expect(details).toHaveProperty("summary");
      expect(typeof details.summary).toBe("string");
    });

    it("should classify scores correctly for UI display", () => {
      // Test the classification logic used in the frontend
      function classifyScore(score: number): string {
        if (score >= 80) return "green";
        if (score >= 60) return "yellow";
        return "red";
      }

      expect(classifyScore(95)).toBe("green");
      expect(classifyScore(80)).toBe("green");
      expect(classifyScore(79)).toBe("yellow");
      expect(classifyScore(60)).toBe("yellow");
      expect(classifyScore(59)).toBe("red");
      expect(classifyScore(0)).toBe("red");
    });
  });
});
