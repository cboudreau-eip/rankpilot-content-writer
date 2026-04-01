import { describe, it, expect } from "vitest";
import type { GscQueryRow } from "../drizzle/schema";
import { computeNearJump, computeHighImpressionLowCtr, computeQuickWins, computeCannibalization } from "./gsc-parser";

// Helper to run all categorizations at once (mirrors what parseGscExcel does internally)
function categorizeQueries(queries: GscQueryRow[]) {
  return {
    nearJumpKeywords: computeNearJump(queries, 11, 30),
    highImpressionLowCtr: computeHighImpressionLowCtr(queries),
    quickWinKeywords: computeQuickWins(queries),
    cannibalizationGroups: computeCannibalization(queries),
  };
}

// ─── Sample data ──────────────────────────────────────────────────────────────

const sampleQueries: GscQueryRow[] = [
  // Near-jump candidates (pos 11-30)
  { query: "medicare advantage plans", clicks: 50, impressions: 1200, ctr: 0.042, position: 12.3 },
  { query: "medicare part b coverage", clicks: 30, impressions: 800, ctr: 0.038, position: 18.5 },
  { query: "medicare supplement plans", clicks: 5, impressions: 500, ctr: 0.01, position: 25.1 },

  // Page 1 (pos 1-10)
  { query: "what is medicare", clicks: 200, impressions: 2000, ctr: 0.1, position: 3.2 },
  { query: "medicare enrollment", clicks: 150, impressions: 1500, ctr: 0.1, position: 7.8 },

  // High impression / low CTR
  { query: "medicare cost 2024", clicks: 10, impressions: 5000, ctr: 0.002, position: 8.5 },
  { query: "medicare eligibility age", clicks: 5, impressions: 3000, ctr: 0.0017, position: 6.2 },

  // Quick wins (pos 5-20, impressions > 100, clicks very low)
  { query: "medicare drug coverage", clicks: 2, impressions: 600, ctr: 0.003, position: 14.0 },

  // Zero-impression / irrelevant
  { query: "obscure query", clicks: 0, impressions: 5, ctr: 0, position: 45.0 },
];

// ─── computeNearJump tests ────────────────────────────────────────────────────

describe("computeNearJump", () => {
  it("returns keywords within the specified position range", () => {
    const result = computeNearJump(sampleQueries, 11, 30);
    const queries = result.map((r) => r.query);
    expect(queries).toContain("medicare advantage plans");
    expect(queries).toContain("medicare part b coverage");
    expect(queries).toContain("medicare supplement plans");
  });

  it("excludes keywords outside the position range", () => {
    const result = computeNearJump(sampleQueries, 11, 30);
    const queries = result.map((r) => r.query);
    expect(queries).not.toContain("what is medicare"); // pos 3.2
    expect(queries).not.toContain("medicare enrollment"); // pos 7.8
  });

  it("respects Page 1 threshold (pos 5-10)", () => {
    const result = computeNearJump(sampleQueries, 5, 10);
    const queries = result.map((r) => r.query);
    expect(queries).toContain("medicare enrollment"); // pos 7.8
    expect(queries).not.toContain("medicare advantage plans"); // pos 12.3
  });

  it("respects High Only threshold (pos 11-15)", () => {
    const result = computeNearJump(sampleQueries, 11, 15);
    const queries = result.map((r) => r.query);
    expect(queries).toContain("medicare advantage plans"); // pos 12.3
    expect(queries).not.toContain("medicare supplement plans"); // pos 25.1
  });

  it("sorts by impressions descending by default", () => {
    const result = computeNearJump(sampleQueries, 11, 30);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].impressions).toBeGreaterThanOrEqual(result[i].impressions);
    }
  });

  it("returns empty array when no queries match the range", () => {
    const result = computeNearJump(sampleQueries, 50, 100);
    expect(result).toHaveLength(0);
  });

  it("handles empty input", () => {
    const result = computeNearJump([], 11, 30);
    expect(result).toHaveLength(0);
  });
});

// ─── categorizeQueries tests ──────────────────────────────────────────────────

describe("categorizeQueries", () => {
  it("identifies high impression / low CTR queries", () => {
    const { highImpressionLowCtr } = categorizeQueries(sampleQueries);
    const queries = highImpressionLowCtr.map((r) => r.query);
    expect(queries).toContain("medicare cost 2024");
    expect(queries).toContain("medicare eligibility age");
  });

  it("does not include high CTR queries in high impression / low CTR", () => {
    const { highImpressionLowCtr } = categorizeQueries(sampleQueries);
    const queries = highImpressionLowCtr.map((r) => r.query);
    expect(queries).not.toContain("what is medicare"); // CTR = 10%
  });

  it("identifies quick win keywords", () => {
    const { quickWinKeywords } = categorizeQueries(sampleQueries);
    const queries = quickWinKeywords.map((r) => r.query);
    // pos 14.0, impressions 600, clicks 2 — should be a quick win
    expect(queries).toContain("medicare drug coverage");
  });

  it("excludes low-impression queries from quick wins", () => {
    const { quickWinKeywords } = categorizeQueries(sampleQueries);
    const queries = quickWinKeywords.map((r) => r.query);
    expect(queries).not.toContain("obscure query"); // only 5 impressions
  });

  it("detects cannibalization groups for similar queries", () => {
    const cannibalizationQueries: GscQueryRow[] = [
      { query: "medicare advantage plans 2024", clicks: 50, impressions: 1000, ctr: 0.05, position: 8 },
      { query: "medicare advantage plans cost", clicks: 40, impressions: 900, ctr: 0.044, position: 9 },
      { query: "medicare advantage plan comparison", clicks: 35, impressions: 850, ctr: 0.041, position: 10 },
      { query: "completely different topic", clicks: 100, impressions: 2000, ctr: 0.05, position: 5 },
    ];
    const { cannibalizationGroups } = categorizeQueries(cannibalizationQueries);
    // Should detect "medicare advantage plans" as a shared topic
    expect(cannibalizationGroups.length).toBeGreaterThan(0);
    const topics = cannibalizationGroups.map((g) => g.topic);
    const hasMedicareAdvantage = topics.some((t) => t.includes("medicare advantage"));
    expect(hasMedicareAdvantage).toBe(true);
  });

  it("returns all categories as arrays", () => {
    const result = categorizeQueries(sampleQueries);
    expect(Array.isArray(result.nearJumpKeywords)).toBe(true);
    expect(Array.isArray(result.highImpressionLowCtr)).toBe(true);
    expect(Array.isArray(result.quickWinKeywords)).toBe(true);
    expect(Array.isArray(result.cannibalizationGroups)).toBe(true);
  });

  it("handles empty input gracefully", () => {
    const result = categorizeQueries([]);
    expect(result.nearJumpKeywords).toHaveLength(0);
    expect(result.highImpressionLowCtr).toHaveLength(0);
    expect(result.quickWinKeywords).toHaveLength(0);
    expect(result.cannibalizationGroups).toHaveLength(0);
  });
});
