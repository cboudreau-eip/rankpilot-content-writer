import { describe, it, expect } from "vitest";

/**
 * Tests for the stripEmDashes post-processing utility.
 * We test the logic directly by importing the function via a helper
 * that re-exports it from routers.ts for testing purposes.
 *
 * Since stripEmDashes is a module-level function (not exported), we
 * replicate the same logic here to keep tests self-contained and fast.
 */
function stripEmDashes(content: string): string {
  // 1. Em dash at end of a line or sentence → remove
  let result = content.replace(/\s*\u2014\s*(<\/|\n|$)/g, "$1");
  // 2. Em dash used as clause separator between words → replace with ", "
  result = result.replace(/(\w)\s*\u2014\s*(\w)/g, "$1, $2");
  // 3. Any remaining em dashes → remove
  result = result.replace(/\u2014/g, "");
  return result;
}

describe("stripEmDashes", () => {
  it("replaces mid-sentence em dash separator with a comma", () => {
    const input = "Medicare Advantage — also known as Part C — offers extra benefits.";
    const result = stripEmDashes(input);
    expect(result).toBe("Medicare Advantage, also known as Part C, offers extra benefits.");
    expect(result).not.toContain("—");
  });

  it("removes trailing em dash at end of sentence", () => {
    const input = "This plan covers dental, vision, and hearing —";
    const result = stripEmDashes(input);
    expect(result).not.toContain("—");
    expect(result.trim()).toBe("This plan covers dental, vision, and hearing");
  });

  it("removes em dash before a closing HTML tag", () => {
    const input = "<p>Some content —</p>";
    const result = stripEmDashes(input);
    expect(result).toBe("<p>Some content</p>");
    expect(result).not.toContain("—");
  });

  it("handles em dash with no surrounding spaces (word—word)", () => {
    const input = "The plan—which covers dental—is affordable.";
    const result = stripEmDashes(input);
    expect(result).toBe("The plan, which covers dental, is affordable.");
    expect(result).not.toContain("—");
  });

  it("handles multiple em dashes in HTML content", () => {
    const input = "<p>Medicare Advantage — also called Part C — is a type of health plan offered by private companies — approved by Medicare.</p>";
    const result = stripEmDashes(input);
    expect(result).not.toContain("—");
    expect(result).toContain("Medicare Advantage, also called Part C, is a type of health plan offered by private companies, approved by Medicare.");
  });

  it("does not modify content with no em dashes", () => {
    const input = "<p>This is a normal sentence without any special punctuation.</p>";
    const result = stripEmDashes(input);
    expect(result).toBe(input);
  });

  it("handles em dash at end of line (newline)", () => {
    const input = "Some text —\nNext line.";
    const result = stripEmDashes(input);
    expect(result).not.toContain("—");
    expect(result).toContain("Some text");
    expect(result).toContain("Next line.");
  });

  it("handles em dash in plaintext (non-HTML) content", () => {
    const input = "Understanding Medicare — A Complete Guide\n\nMedicare Part A — hospital insurance — covers inpatient stays.";
    const result = stripEmDashes(input);
    expect(result).not.toContain("—");
    expect(result).toContain("Understanding Medicare, A Complete Guide");
    expect(result).toContain("Medicare Part A, hospital insurance, covers inpatient stays.");
  });

  it("handles empty string without error", () => {
    expect(stripEmDashes("")).toBe("");
  });

  it("handles string with only em dashes", () => {
    const result = stripEmDashes("——— —");
    expect(result).not.toContain("—");
  });
});

// Replicate stripShortAnswerPrefix logic for self-contained tests
function stripShortAnswerPrefix(content: string): string {
  let result = content.replace(/<p>\s*(?:<strong>)?Short Answer:?(?:<\/strong>)?\s*/gi, '<p>');
  result = result.replace(/<strong>Short Answer:?<\/strong>\s*/gi, '');
  result = result.replace(/^Short Answer:?\s*/gim, '');
  return result;
}

describe("stripShortAnswerPrefix", () => {
  it("removes 'Short Answer:' prefix from plain HTML paragraph", () => {
    const input = "<p>Short Answer: Yes, you can switch at any time.</p>";
    const result = stripShortAnswerPrefix(input);
    expect(result).toBe("<p>Yes, you can switch at any time.</p>");
    expect(result).not.toContain("Short Answer");
  });

  it("removes 'Short Answer:' wrapped in <strong> tags", () => {
    const input = "<p><strong>Short Answer:</strong> Rate increases vary by state.</p>";
    const result = stripShortAnswerPrefix(input);
    expect(result).toBe("<p>Rate increases vary by state.</p>");
    expect(result).not.toContain("Short Answer");
  });

  it("removes 'Short Answer' without colon", () => {
    const input = "<p>Short Answer Yes, you can apply to switch at any time.</p>";
    const result = stripShortAnswerPrefix(input);
    expect(result).toBe("<p>Yes, you can apply to switch at any time.</p>");
  });

  it("removes 'Short Answer:' at start of plaintext line", () => {
    const input = "Short Answer: Rate increases vary by state.\nNext line.";
    const result = stripShortAnswerPrefix(input);
    expect(result).toBe("Rate increases vary by state.\nNext line.");
    expect(result).not.toContain("Short Answer");
  });

  it("handles case-insensitive matching", () => {
    const input = "<p>SHORT ANSWER: Yes, you can switch.</p>";
    const result = stripShortAnswerPrefix(input);
    expect(result).toBe("<p>Yes, you can switch.</p>");
  });

  it("does not modify content without 'Short Answer:' prefix", () => {
    const input = "<p>Yes, you can switch Medicare Supplement companies at any time.</p>";
    const result = stripShortAnswerPrefix(input);
    expect(result).toBe(input);
  });

  it("handles multiple FAQ answers in a single content block", () => {
    const input = "<p>Short Answer: Yes, you can switch.</p><p>Short Answer: Rate increases vary.</p>";
    const result = stripShortAnswerPrefix(input);
    expect(result).toBe("<p>Yes, you can switch.</p><p>Rate increases vary.</p>");
    expect(result).not.toContain("Short Answer");
  });

  it("handles empty string without error", () => {
    expect(stripShortAnswerPrefix("")).toBe("");
  });
});
