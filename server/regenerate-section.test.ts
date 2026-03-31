import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * Tests for the section extraction and splicing logic used by articles.regenerateSection.
 * Since the actual mutation calls the LLM and database, we test the HTML parsing/splicing
 * logic independently.
 */

// --- Section extraction helper (mirrors the logic in the mutation) ---
function extractSections(content: string): Array<{ heading: string; start: number; end: number }> {
  const h2Regex = /<h2[^>]*>([\s\S]*?)<\/h2>/gi;
  const h2Matches: Array<{ text: string; index: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = h2Regex.exec(content)) !== null) {
    const headingText = match[1].replace(/<[^>]*>/g, "").trim();
    h2Matches.push({ text: headingText, index: match.index });
  }

  return h2Matches.map((h, i) => ({
    heading: h.text,
    start: h.index,
    end: i + 1 < h2Matches.length ? h2Matches[i + 1].index : content.length,
  }));
}

function spliceSection(content: string, sectionHeading: string, newSectionContent: string): string {
  const sections = extractSections(content);
  const target = sections.find(s => s.heading.toLowerCase().trim() === sectionHeading.toLowerCase().trim());
  if (!target) throw new Error(`Section "${sectionHeading}" not found`);
  return content.slice(0, target.start) + newSectionContent + "\n" + content.slice(target.end);
}

// --- Test data ---
const sampleArticle = `<h2>Introduction to Medicare</h2>
<p>Medicare is a federal health insurance program for people aged 65 and older.</p>
<p>It also covers certain younger people with disabilities.</p>

<h2>Medicare Part A</h2>
<p>Part A covers hospital insurance, including inpatient hospital stays.</p>
<p>Most people don't pay a premium for Part A.</p>

<h2>Medicare Part B</h2>
<p>Part B covers medical insurance, including doctor visits and outpatient care.</p>
<p>The standard Part B premium changes each year.</p>

<h2>Frequently Asked Questions</h2>
<p>Here are common questions about Medicare enrollment.</p>`;

describe("Section Extraction", () => {
  it("extracts all H2 sections from article HTML", () => {
    const sections = extractSections(sampleArticle);
    expect(sections).toHaveLength(4);
    expect(sections.map(s => s.heading)).toEqual([
      "Introduction to Medicare",
      "Medicare Part A",
      "Medicare Part B",
      "Frequently Asked Questions",
    ]);
  });

  it("correctly identifies section boundaries", () => {
    const sections = extractSections(sampleArticle);
    // Each section should start at its <h2> and end at the next <h2> or end of content
    for (let i = 0; i < sections.length; i++) {
      const sectionContent = sampleArticle.slice(sections[i].start, sections[i].end);
      expect(sectionContent).toContain(`<h2>${sections[i].heading}</h2>`);
      // Should not contain other section headings
      for (let j = 0; j < sections.length; j++) {
        if (j !== i) {
          expect(sectionContent).not.toContain(`<h2>${sections[j].heading}</h2>`);
        }
      }
    }
  });

  it("handles H2 tags with attributes", () => {
    const content = `<h2 id="intro" class="section-title">Introduction</h2>
<p>Some content.</p>
<h2 style="color: blue;">Next Section</h2>
<p>More content.</p>`;
    const sections = extractSections(content);
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe("Introduction");
    expect(sections[1].heading).toBe("Next Section");
  });

  it("handles H2 tags with nested HTML (bold, span, etc.)", () => {
    const content = `<h2><strong>Bold Heading</strong></h2>
<p>Content.</p>
<h2><span class="icon">🏥</span> Hospital Coverage</h2>
<p>More content.</p>`;
    const sections = extractSections(content);
    expect(sections).toHaveLength(2);
    expect(sections[0].heading).toBe("Bold Heading");
    expect(sections[1].heading).toBe("🏥 Hospital Coverage");
  });

  it("returns empty array for content with no H2 tags", () => {
    const content = `<p>Just a paragraph.</p><h3>Only H3</h3><p>More text.</p>`;
    const sections = extractSections(content);
    expect(sections).toHaveLength(0);
  });

  it("handles single section article", () => {
    const content = `<h2>Only Section</h2><p>All the content.</p>`;
    const sections = extractSections(content);
    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe("Only Section");
    expect(sections[0].start).toBe(0);
    expect(sections[0].end).toBe(content.length);
  });
});

describe("Section Splicing", () => {
  it("replaces the correct section content", () => {
    const newSection = `<h2>Medicare Part A</h2>\n<p>This is the regenerated Part A content with better details.</p>`;
    const result = spliceSection(sampleArticle, "Medicare Part A", newSection);

    // Should contain the new content
    expect(result).toContain("regenerated Part A content");
    // Should NOT contain the old content
    expect(result).not.toContain("Most people don't pay a premium for Part A");
    // Should still contain other sections
    expect(result).toContain("Introduction to Medicare");
    expect(result).toContain("Medicare Part B");
    expect(result).toContain("Frequently Asked Questions");
  });

  it("replaces the first section correctly", () => {
    const newSection = `<h2>Introduction to Medicare</h2>\n<p>New intro content.</p>`;
    const result = spliceSection(sampleArticle, "Introduction to Medicare", newSection);

    expect(result).toContain("New intro content");
    expect(result).not.toContain("federal health insurance program");
    expect(result).toContain("Medicare Part A");
  });

  it("replaces the last section correctly", () => {
    const newSection = `<h2>Frequently Asked Questions</h2>\n<p>New FAQ content.</p>`;
    const result = spliceSection(sampleArticle, "Frequently Asked Questions", newSection);

    expect(result).toContain("New FAQ content");
    expect(result).not.toContain("common questions about Medicare enrollment");
    expect(result).toContain("Medicare Part B");
  });

  it("is case-insensitive for heading matching", () => {
    const newSection = `<h2>Medicare Part B</h2>\n<p>Updated Part B.</p>`;
    const result = spliceSection(sampleArticle, "medicare part b", newSection);
    expect(result).toContain("Updated Part B");
  });

  it("throws error for non-existent section", () => {
    expect(() => {
      spliceSection(sampleArticle, "Non Existent Section", "<h2>New</h2><p>Content</p>");
    }).toThrow('Section "Non Existent Section" not found');
  });

  it("preserves content before and after the replaced section", () => {
    const newSection = `<h2>Medicare Part A</h2>\n<p>Replaced.</p>`;
    const result = spliceSection(sampleArticle, "Medicare Part A", newSection);

    // Content before (Introduction section)
    const introIdx = result.indexOf("Introduction to Medicare");
    const partAIdx = result.indexOf("Replaced.");
    const partBIdx = result.indexOf("Medicare Part B");
    const faqIdx = result.indexOf("Frequently Asked Questions");

    expect(introIdx).toBeLessThan(partAIdx);
    expect(partAIdx).toBeLessThan(partBIdx);
    expect(partBIdx).toBeLessThan(faqIdx);
  });

  it("handles sections with sub-headings (H3)", () => {
    const articleWithH3 = `<h2>Overview</h2>
<p>Intro text.</p>
<h2>Details</h2>
<h3>Sub-detail 1</h3>
<p>Sub content 1.</p>
<h3>Sub-detail 2</h3>
<p>Sub content 2.</p>
<h2>Conclusion</h2>
<p>Final thoughts.</p>`;

    const newSection = `<h2>Details</h2>\n<h3>New Sub 1</h3>\n<p>New sub content.</p>`;
    const result = spliceSection(articleWithH3, "Details", newSection);

    expect(result).toContain("New Sub 1");
    expect(result).not.toContain("Sub-detail 1");
    expect(result).not.toContain("Sub-detail 2");
    expect(result).toContain("Overview");
    expect(result).toContain("Conclusion");
  });
});

describe("Context Extraction", () => {
  it("extracts previous section snippet correctly", () => {
    const sections = extractSections(sampleArticle);
    const targetIdx = 1; // Medicare Part A
    const sectionStart = sections[targetIdx].start;

    const prevSnippet = sectionStart > 0
      ? sampleArticle.slice(Math.max(0, sectionStart - 500), sectionStart)
          .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(-300)
      : "";

    expect(prevSnippet).toContain("Medicare");
    expect(prevSnippet).toContain("federal health insurance");
  });

  it("extracts next section snippet correctly", () => {
    const sections = extractSections(sampleArticle);
    const targetIdx = 1; // Medicare Part A
    const sectionEnd = sections[targetIdx].end;

    const nextSnippet = sectionEnd < sampleArticle.length
      ? sampleArticle.slice(sectionEnd, Math.min(sampleArticle.length, sectionEnd + 500))
          .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)
      : "";

    expect(nextSnippet).toContain("Part B");
    expect(nextSnippet).toContain("medical insurance");
  });

  it("returns empty string for previous snippet of first section", () => {
    const sections = extractSections(sampleArticle);
    const sectionStart = sections[0].start;

    const prevSnippet = sectionStart > 0
      ? sampleArticle.slice(Math.max(0, sectionStart - 500), sectionStart)
          .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(-300)
      : "";

    expect(prevSnippet).toBe("");
  });

  it("returns empty string for next snippet of last section", () => {
    const sections = extractSections(sampleArticle);
    const lastIdx = sections.length - 1;
    const sectionEnd = sections[lastIdx].end;

    const nextSnippet = sectionEnd < sampleArticle.length
      ? sampleArticle.slice(sectionEnd, Math.min(sampleArticle.length, sectionEnd + 500))
          .replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)
      : "";

    expect(nextSnippet).toBe("");
  });
});

describe("Word Count Calculation", () => {
  it("calculates word count correctly after splicing", () => {
    const newSection = `<h2>Medicare Part A</h2>\n<p>Short replacement.</p>`;
    const result = spliceSection(sampleArticle, "Medicare Part A", newSection);
    const wordCount = result.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
    expect(wordCount).toBeGreaterThan(0);
    expect(typeof wordCount).toBe("number");
  });

  it("word count changes when section length changes", () => {
    const originalWordCount = sampleArticle.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;

    const shorterSection = `<h2>Medicare Part A</h2>\n<p>Short.</p>`;
    const shorterResult = spliceSection(sampleArticle, "Medicare Part A", shorterSection);
    const shorterWordCount = shorterResult.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;

    const longerSection = `<h2>Medicare Part A</h2>\n<p>This is a much longer replacement section with many more words to demonstrate that the word count increases when we add more content to the section.</p>`;
    const longerResult = spliceSection(sampleArticle, "Medicare Part A", longerSection);
    const longerWordCount = longerResult.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;

    expect(shorterWordCount).toBeLessThan(originalWordCount);
    expect(longerWordCount).toBeGreaterThan(originalWordCount);
  });
});

describe("Edge Cases", () => {
  it("handles sections with background color divs", () => {
    const articleWithBg = `<h2>Section 1</h2>
<div style="background-color: #f0f9ff; padding: 1.5rem; border-radius: 0.5rem;">
<p>Content with background.</p>
</div>
<h2>Section 2</h2>
<p>Normal content.</p>`;

    const sections = extractSections(articleWithBg);
    expect(sections).toHaveLength(2);

    const section1Content = articleWithBg.slice(sections[0].start, sections[0].end);
    expect(section1Content).toContain("background-color");
    expect(section1Content).toContain("Content with background");
  });

  it("handles sections with tables", () => {
    const articleWithTable = `<h2>Comparison</h2>
<table><thead><tr><th>Plan</th><th>Cost</th></tr></thead>
<tbody><tr><td>Part A</td><td>$0</td></tr></tbody></table>
<h2>Next Section</h2>
<p>Content.</p>`;

    const newSection = `<h2>Comparison</h2>\n<p>Updated comparison.</p>`;
    const result = spliceSection(articleWithTable, "Comparison", newSection);
    expect(result).toContain("Updated comparison");
    expect(result).not.toContain("<table>");
    expect(result).toContain("Next Section");
  });

  it("handles empty section content", () => {
    const articleWithEmpty = `<h2>Empty Section</h2>
<h2>Next Section</h2>
<p>Has content.</p>`;

    const sections = extractSections(articleWithEmpty);
    expect(sections).toHaveLength(2);
    const emptyContent = articleWithEmpty.slice(sections[0].start, sections[0].end).trim();
    expect(emptyContent).toBe("<h2>Empty Section</h2>");
  });
});
