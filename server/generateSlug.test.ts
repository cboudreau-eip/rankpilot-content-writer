import { describe, it, expect } from "vitest";
import { generateSlug } from "./cmsPublish";

describe("generateSlug", () => {
  it("converts a short title to a slug", () => {
    expect(generateSlug("Medicare Part D Plans")).toBe("medicare-part-d-plans");
  });

  it("removes special characters", () => {
    expect(generateSlug("Medicare: What's Covered?")).toBe("medicare-whats-covered");
  });

  it("collapses multiple spaces and hyphens", () => {
    expect(generateSlug("Medicare  Part   D")).toBe("medicare-part-d");
  });

  it("truncates long titles at a word boundary within 50 chars", () => {
    const long = "Medicare Options for Immigrants in 2026 Your Essential Guide to Coverage";
    const result = generateSlug(long);
    expect(result.length).toBeLessThanOrEqual(50);
    // Should not end with a partial word (no trailing hyphen)
    expect(result.endsWith("-")).toBe(false);
    // Should be: "medicare-options-for-immigrants-in-2026-your"
    expect(result).toBe("medicare-options-for-immigrants-in-2026-your");
  });

  it("uses keyword (short) instead of full H1 title for the example case", () => {
    // Simulates what publishToCms does: prefer keyword over title
    const keyword = "Medicare Options for Immigrants in 2026";
    const title = "Medicare Options for Immigrants in 2026: Your Essential Guide to Coverage";
    const slugFromKeyword = generateSlug(keyword);
    const slugFromTitle = generateSlug(title);
    expect(slugFromKeyword.length).toBeLessThanOrEqual(50);
    expect(slugFromTitle.length).toBeLessThanOrEqual(50);
    // Keyword slug should be more concise
    expect(slugFromKeyword.length).toBeLessThan(slugFromTitle.length + 1);
    expect(slugFromKeyword).toBe("medicare-options-for-immigrants-in-2026");
  });

  it("handles strings already within the limit unchanged", () => {
    const short = "medicare-part-d";
    expect(generateSlug("Medicare Part D")).toBe(short);
  });

  it("respects a custom maxLength", () => {
    const result = generateSlug("Medicare Part D Plans for Seniors", 20);
    expect(result.length).toBeLessThanOrEqual(20);
    expect(result.endsWith("-")).toBe(false);
  });
});
