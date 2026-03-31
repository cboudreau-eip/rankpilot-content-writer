/**
 * Tests for the link count enforcement post-processing logic.
 * This logic strips excess <a> tags when the LLM inserts more links than the user selected.
 */
import { describe, it, expect } from "vitest";

/**
 * Mirrors the exact post-processing logic in routers.ts.
 * Keep in sync with the implementation.
 */
function enforceMaxLinks(content: string, maxAllowedLinks: number): string {
  const linkMatches = content.match(/<a\s[^>]*>/gi);
  const actualLinkCount = linkMatches ? linkMatches.length : 0;
  if (actualLinkCount <= maxAllowedLinks) return content;

  let linksKept = 0;
  return content.replace(/<a\s([^>]*)>([\s\S]*?)<\/a>/gi, (match, _attrs, innerText) => {
    if (linksKept < maxAllowedLinks) {
      linksKept++;
      return match;
    }
    return innerText;
  });
}

describe("Link Count Enforcement Post-Processing", () => {
  it("does not modify content when link count is within limit", () => {
    const html = `<p>See <a href="/a">this page</a> and <a href="/b">that page</a>.</p>`;
    const result = enforceMaxLinks(html, 5);
    expect(result).toBe(html);
  });

  it("does not modify content when link count exactly equals limit", () => {
    const html = `<p><a href="/a">link one</a> and <a href="/b">link two</a> and <a href="/c">link three</a>.</p>`;
    const result = enforceMaxLinks(html, 3);
    expect(result).toBe(html);
  });

  it("strips excess links when LLM inserts more than the limit", () => {
    const html = `<p><a href="/a">link one</a> and <a href="/b">link two</a> and <a href="/c">link three</a>.</p>`;
    const result = enforceMaxLinks(html, 2);
    expect(result).toContain(`<a href="/a">link one</a>`);
    expect(result).toContain(`<a href="/b">link two</a>`);
    expect(result).not.toContain(`<a href="/c">`);
    expect(result).toContain("link three"); // anchor text preserved
  });

  it("preserves anchor text when stripping excess links", () => {
    const html = `<p>Visit <a href="/a">Medicare Part A</a> and <a href="/b">Medicare Part B</a> for details.</p>`;
    const result = enforceMaxLinks(html, 1);
    expect(result).toContain(`<a href="/a">Medicare Part A</a>`);
    expect(result).not.toContain(`<a href="/b">`);
    expect(result).toContain("Medicare Part B"); // text preserved
  });

  it("handles zero allowed links by stripping all links", () => {
    const html = `<p>See <a href="/a">page one</a> and <a href="/b">page two</a>.</p>`;
    const result = enforceMaxLinks(html, 0);
    expect(result).not.toContain("<a ");
    expect(result).toContain("page one");
    expect(result).toContain("page two");
  });

  it("handles content with no links gracefully", () => {
    const html = `<p>This article has no links at all.</p>`;
    const result = enforceMaxLinks(html, 5);
    expect(result).toBe(html);
  });

  it("handles links with multiple attributes", () => {
    const html = `<p><a href="/a" class="internal" target="_blank">link one</a> and <a href="/b" rel="nofollow">link two</a>.</p>`;
    const result = enforceMaxLinks(html, 1);
    expect(result).toContain(`<a href="/a" class="internal" target="_blank">link one</a>`);
    expect(result).not.toContain(`<a href="/b"`);
    expect(result).toContain("link two");
  });

  it("handles links with nested HTML inside anchor text", () => {
    const html = `<p><a href="/a"><strong>bold link</strong></a> and <a href="/b">plain link</a>.</p>`;
    const result = enforceMaxLinks(html, 1);
    expect(result).toContain(`<a href="/a"><strong>bold link</strong></a>`);
    expect(result).not.toContain(`<a href="/b">`);
    expect(result).toContain("plain link");
  });

  it("handles links spread across multiple paragraphs", () => {
    const html = [
      `<h2>Section One</h2>`,
      `<p>See <a href="/a">link one</a> for details.</p>`,
      `<h2>Section Two</h2>`,
      `<p>Also check <a href="/b">link two</a> and <a href="/c">link three</a>.</p>`,
      `<h2>Section Three</h2>`,
      `<p>Finally, <a href="/d">link four</a> is important.</p>`,
    ].join("\n");

    const result = enforceMaxLinks(html, 2);
    const remainingLinks = result.match(/<a\s[^>]*>/gi) || [];
    expect(remainingLinks.length).toBe(2);
    expect(result).toContain(`<a href="/a">link one</a>`);
    expect(result).toContain(`<a href="/b">link two</a>`);
    expect(result).not.toContain(`<a href="/c">`);
    expect(result).not.toContain(`<a href="/d">`);
    expect(result).toContain("link three");
    expect(result).toContain("link four");
  });

  it("correctly counts manual links + auto links for the total cap", () => {
    // Simulates: 3 manual links + 5 auto links = 8 total allowed
    const manualLinkCount = 3;
    const autoLinkCount = 5;
    const maxAllowed = autoLinkCount + manualLinkCount; // 8

    // LLM inserted 12 links
    const links = Array.from({ length: 12 }, (_, i) =>
      `<a href="/page-${i + 1}">link ${i + 1}</a>`
    ).join(" ");
    const html = `<p>${links}</p>`;

    const result = enforceMaxLinks(html, maxAllowed);
    const remaining = result.match(/<a\s[^>]*>/gi) || [];
    expect(remaining.length).toBe(8);
  });

  it("handles the default 5-link limit correctly", () => {
    // Default: 5 auto links, 0 manual = 5 total
    const links = Array.from({ length: 10 }, (_, i) =>
      `<a href="/page-${i + 1}">link ${i + 1}</a>`
    ).join(" ");
    const html = `<p>${links}</p>`;

    const result = enforceMaxLinks(html, 5);
    const remaining = result.match(/<a\s[^>]*>/gi) || [];
    expect(remaining.length).toBe(5);
    // All anchor texts preserved
    for (let i = 1; i <= 10; i++) {
      expect(result).toContain(`link ${i}`);
    }
  });
});
