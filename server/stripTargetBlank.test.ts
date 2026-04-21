import { describe, it, expect } from "vitest";

// Copy of the function for testing
function stripTargetBlank(content: string): string {
  let result = content.replace(/\s*target="_blank"/gi, '');
  result = result.replace(/\s*target='_blank'/gi, '');
  result = result.replace(/\s*rel="noopener noreferrer"/gi, '');
  result = result.replace(/\s*rel='noopener noreferrer'/gi, '');
  return result;
}

describe("stripTargetBlank", () => {
  it("removes target=\"_blank\" from a simple link", () => {
    const input = '<a href="https://example.com" target="_blank">Click here</a>';
    expect(stripTargetBlank(input)).toBe('<a href="https://example.com">Click here</a>');
  });

  it("removes target=\"_blank\" and rel=\"noopener noreferrer\" together", () => {
    const input = '<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>';
    expect(stripTargetBlank(input)).toBe('<a href="https://example.com">Link</a>');
  });

  it("removes rel=\"noopener noreferrer\" before target=\"_blank\"", () => {
    const input = '<a href="https://example.com" rel="noopener noreferrer" target="_blank">Link</a>';
    expect(stripTargetBlank(input)).toBe('<a href="https://example.com">Link</a>');
  });

  it("handles single-quoted target='_blank'", () => {
    const input = "<a href='https://example.com' target='_blank'>Link</a>";
    expect(stripTargetBlank(input)).toBe("<a href='https://example.com'>Link</a>");
  });

  it("leaves links without target alone", () => {
    const input = '<a href="https://example.com">Link</a>';
    expect(stripTargetBlank(input)).toBe('<a href="https://example.com">Link</a>');
  });

  it("handles multiple links in a paragraph", () => {
    const input = '<p><a href="https://a.com" target="_blank">A</a> and <a href="https://b.com" target="_blank" rel="noopener noreferrer">B</a></p>';
    expect(stripTargetBlank(input)).toBe('<p><a href="https://a.com">A</a> and <a href="https://b.com">B</a></p>');
  });

  it("is case-insensitive", () => {
    const input = '<a href="https://example.com" TARGET="_blank" REL="noopener noreferrer">Link</a>';
    expect(stripTargetBlank(input)).toBe('<a href="https://example.com">Link</a>');
  });

  it("does not modify content with no links", () => {
    const input = '<p>Just some text with no links.</p>';
    expect(stripTargetBlank(input)).toBe('<p>Just some text with no links.</p>');
  });
});
