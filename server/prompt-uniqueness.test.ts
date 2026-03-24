import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

/**
 * Tests to verify that article generation prompts include anti-repetition
 * and content uniqueness instructions to prevent recycled phrases like
 * "More than 33 million Americans are currently enrolled".
 */

// Read the routers source to inspect prompt contents
const routersSource = readFileSync(
  resolve(__dirname, "routers.ts"),
  "utf-8"
);

describe("Article generation prompt uniqueness", () => {
  describe("Article writing prompt", () => {
    it("should explicitly ban the '33 million Americans' phrase", () => {
      expect(routersSource).toContain('Do NOT use the phrase "More than 33 million Americans"');
    });

    it("should instruct against recycling statistics", () => {
      expect(routersSource).toContain("Do NOT recycle the same statistics across articles");
    });

    it("should prefer specific niche statistics over broad figures", () => {
      expect(routersSource).toContain("Prefer specific, niche statistics over broad national figures");
    });

    it("should instruct to vary number framing", () => {
      expect(routersSource).toContain("vary the framing (percentages vs. absolute numbers vs. comparisons vs. ratios)");
    });

    it("should include a CONTENT UNIQUENESS instruction", () => {
      expect(routersSource).toContain("CONTENT UNIQUENESS: Every article must feel distinct");
    });

    it("should instruct to avoid formulaic phrases", () => {
      expect(routersSource).toContain("Avoid formulaic phrases, recycled openings, and boilerplate sentences");
    });
  });

  describe("Outline generation prompt", () => {
    it("should include uniqueness instruction for outlines", () => {
      expect(routersSource).toContain("UNIQUENESS: Plan section points that are specific and fresh");
    });

    it("should warn against generic talking points in outlines", () => {
      expect(routersSource).toContain("avoid generic talking points that appear in every article on this topic");
    });
  });

  describe("Writing style sample anti-copy instructions", () => {
    it("should warn against reusing statistics from the sample", () => {
      expect(routersSource).toContain("Do NOT repeat any statistics, numbers, or data points from this sample");
    });

    it("should warn against reusing phrases from the sample", () => {
      expect(routersSource).toContain("Do NOT reuse any specific phrases, sentences, statistics, or openings from this sample");
    });
  });

  describe("Intro variety", () => {
    it("should include CRITICAL INTRO VARIETY instruction", () => {
      expect(routersSource).toContain("CRITICAL - INTRO VARIETY: Every article must open differently");
    });

    it("should ban common opening formulas", () => {
      expect(routersSource).toContain('NEVER start with "If you are...", "Whether you are...", "As a..."');
    });
  });
});
