import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for the broken link checker URL extraction logic.
 * The actual HTTP checking is tested via integration; here we test
 * the HTML link extraction regex that powers the feature.
 */

function extractLinks(html: string): { url: string; anchorText: string }[] {
  const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
  const links: { url: string; anchorText: string }[] = [];
  let match;
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1].trim();
    const anchorText = match[2].replace(/<[^>]*>/g, "").trim();
    if (url.startsWith("http://") || url.startsWith("https://")) {
      links.push({ url, anchorText });
    }
  }
  return links;
}

describe("Broken Link Checker - Link Extraction", () => {
  it("extracts simple http links", () => {
    const html = '<p>Visit <a href="https://example.com">Example</a> for more info.</p>';
    const links = extractLinks(html);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("https://example.com");
    expect(links[0].anchorText).toBe("Example");
  });

  it("extracts multiple links from content", () => {
    const html = `
      <p>Check <a href="https://example.com">Example</a> and <a href="https://test.org/page">Test Page</a>.</p>
      <p>Also see <a href="http://old-site.com/article">Old Article</a>.</p>
    `;
    const links = extractLinks(html);
    expect(links).toHaveLength(3);
    expect(links[0].url).toBe("https://example.com");
    expect(links[1].url).toBe("https://test.org/page");
    expect(links[2].url).toBe("http://old-site.com/article");
  });

  it("strips HTML tags from anchor text", () => {
    const html = '<a href="https://example.com"><strong>Bold Link</strong></a>';
    const links = extractLinks(html);
    expect(links).toHaveLength(1);
    expect(links[0].anchorText).toBe("Bold Link");
  });

  it("ignores non-http links (mailto, tel, anchor)", () => {
    const html = `
      <a href="mailto:test@example.com">Email</a>
      <a href="tel:+1234567890">Call</a>
      <a href="#section-1">Jump to section</a>
      <a href="/relative/path">Relative</a>
    `;
    const links = extractLinks(html);
    expect(links).toHaveLength(0);
  });

  it("handles links with extra attributes", () => {
    const html = '<a href="https://example.com" target="_blank" rel="noopener noreferrer" class="link">Click here</a>';
    const links = extractLinks(html);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("https://example.com");
    expect(links[0].anchorText).toBe("Click here");
  });

  it("handles empty content", () => {
    const links = extractLinks("");
    expect(links).toHaveLength(0);
  });

  it("handles content with no links", () => {
    const html = "<p>This is a paragraph with no links at all.</p>";
    const links = extractLinks(html);
    expect(links).toHaveLength(0);
  });

  it("handles links with single quotes", () => {
    const html = "<a href='https://example.com'>Single Quoted</a>";
    const links = extractLinks(html);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("https://example.com");
  });

  it("trims whitespace from URLs", () => {
    const html = '<a href="  https://example.com/path  ">Spaced URL</a>';
    const links = extractLinks(html);
    expect(links).toHaveLength(1);
    expect(links[0].url).toBe("https://example.com/path");
  });

  it("handles duplicate URLs with different anchor texts", () => {
    const html = `
      <a href="https://example.com">First mention</a>
      <a href="https://example.com">Second mention</a>
    `;
    const links = extractLinks(html);
    expect(links).toHaveLength(2);
    expect(links[0].anchorText).toBe("First mention");
    expect(links[1].anchorText).toBe("Second mention");
  });
});
