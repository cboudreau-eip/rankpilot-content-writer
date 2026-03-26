import { describe, it, expect } from "vitest";

/**
 * Tests for the banned phrases post-generation scan logic.
 * This logic is inline in routers.ts, so we extract and test the core algorithm here.
 */

function removeBannedPhrases(content: string, bannedPhrases: string[]): string {
  let result = content;
  for (const phrase of bannedPhrases) {
    if (phrase.trim()) {
      const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedPhrase, 'gi');
      result = result.replace(regex, '');
    }
  }
  // Clean up empty tags and excess whitespace
  result = result.replace(/<p>\s*<\/p>/g, '').replace(/\s{3,}/g, ' ').trim();
  return result;
}

describe("removeBannedPhrases", () => {
  it("removes a single banned phrase", () => {
    const content = "<p>Learn more at our website for details.</p>";
    const result = removeBannedPhrases(content, ["learn more at"]);
    expect(result).toBe("<p> our website for details.</p>");
  });

  it("removes multiple banned phrases", () => {
    const content = "<p>It's important to note that in today's world, Medicare is complex.</p>";
    const result = removeBannedPhrases(content, ["it's important to note", "in today's world"]);
    expect(result).not.toContain("important to note");
    expect(result).not.toContain("today's world");
    expect(result).toContain("Medicare is complex");
  });

  it("is case-insensitive", () => {
    const content = "<p>Navigate The Complexities of Medicare enrollment.</p>";
    const result = removeBannedPhrases(content, ["navigate the complexities"]);
    expect(result).not.toContain("Navigate The Complexities");
    expect(result).toContain("Medicare enrollment");
  });

  it("removes all occurrences of a phrase", () => {
    const content = "<p>Learn more at section one.</p><p>Learn more at section two.</p>";
    const result = removeBannedPhrases(content, ["learn more at"]);
    expect(result).not.toContain("Learn more at");
    expect(result).not.toContain("learn more at");
  });

  it("cleans up empty <p> tags after removal", () => {
    const content = "<p>learn more at</p><p>Valid content here.</p>";
    const result = removeBannedPhrases(content, ["learn more at"]);
    expect(result).not.toContain("<p></p>");
    expect(result).not.toContain("<p> </p>");
    expect(result).toContain("Valid content here.");
  });

  it("handles phrases with special regex characters", () => {
    const content = "<p>Call us at (800) 555-1234 for help.</p>";
    const result = removeBannedPhrases(content, ["(800) 555-1234"]);
    expect(result).not.toContain("(800) 555-1234");
    expect(result).toContain("Call us at");
  });

  it("returns content unchanged when no banned phrases match", () => {
    const content = "<p>Medicare covers many services.</p>";
    const result = removeBannedPhrases(content, ["nonexistent phrase"]);
    expect(result).toBe("<p>Medicare covers many services.</p>");
  });

  it("handles empty banned phrases array", () => {
    const content = "<p>Some content here.</p>";
    const result = removeBannedPhrases(content, []);
    expect(result).toBe("<p>Some content here.</p>");
  });

  it("skips empty/whitespace-only phrases", () => {
    const content = "<p>Some content here.</p>";
    const result = removeBannedPhrases(content, ["", "   ", "  "]);
    expect(result).toBe("<p>Some content here.</p>");
  });

  it("handles phrases within HTML tags without breaking markup", () => {
    const content = '<p>Check out our <a href="https://example.com">learn more at this page</a> for details.</p>';
    const result = removeBannedPhrases(content, ["learn more at"]);
    expect(result).not.toContain("learn more at");
    // The link structure should still be valid
    expect(result).toContain("<a href=");
    expect(result).toContain("</a>");
  });

  it("collapses excessive whitespace after removal", () => {
    const content = "<p>Before    learn more at    after the phrase.</p>";
    const result = removeBannedPhrases(content, ["learn more at"]);
    expect(result).not.toContain("    ");
  });
});
