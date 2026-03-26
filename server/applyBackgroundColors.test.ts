import { describe, it, expect } from "vitest";
import { applyBackgroundColors } from "./applyBackgroundColors";
import type { OutlineSection } from "../drizzle/schema";

describe("applyBackgroundColors", () => {
  it("returns unchanged HTML when no sections have backgroundColor", () => {
    const html = "<h2>Introduction</h2><p>Some text here.</p><h2>Details</h2><p>More text.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Introduction", type: "h2", points: [] },
      { id: "2", heading: "Details", type: "h2", points: [] },
    ];
    const result = applyBackgroundColors(html, sections);
    expect(result).toBe(html);
  });

  it("wraps an h2 section with a styled div when backgroundColor is set", () => {
    const html = "<h2>Key Takeaways</h2><ul><li>Point 1</li><li>Point 2</li></ul><h2>Next Section</h2><p>Content.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Key Takeaways", type: "h2", points: [], backgroundColor: "#F3F4F6" },
      { id: "2", heading: "Next Section", type: "h2", points: [] },
    ];
    const result = applyBackgroundColors(html, sections);
    expect(result).toContain('style="background-color: #F3F4F6; border-radius: 12px; padding: 24px 28px; margin: 16px 0;"');
    expect(result).toContain("<h2>Key Takeaways</h2>");
    expect(result).toContain("<ul><li>Point 1</li><li>Point 2</li></ul>");
    // The next section should NOT be inside the div
    expect(result).toContain("</div><h2>Next Section</h2>");
  });

  it("wraps the last section when it has a backgroundColor", () => {
    const html = "<h2>Intro</h2><p>Intro text.</p><h2>Key Takeaways</h2><ul><li>Point 1</li></ul>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Intro", type: "h2", points: [] },
      { id: "2", heading: "Key Takeaways", type: "h2", points: [], backgroundColor: "#EFF6FF" },
    ];
    const result = applyBackgroundColors(html, sections);
    expect(result).toContain('background-color: #EFF6FF');
    expect(result).toContain("<h2>Key Takeaways</h2>");
    expect(result).toContain("</ul>\n</div>");
  });

  it("wraps an h3 sub-section with a styled div", () => {
    const html = "<h2>Main Section</h2><p>Intro.</p><h3>Sub Takeaways</h3><ul><li>Point A</li></ul><h3>Another Sub</h3><p>More.</p>";
    const sections: OutlineSection[] = [
      {
        id: "1", heading: "Main Section", type: "h2", points: [],
        subSections: [
          { id: "1a", heading: "Sub Takeaways", type: "h3", points: [], backgroundColor: "#ECFDF5" },
          { id: "1b", heading: "Another Sub", type: "h3", points: [] },
        ],
      },
    ];
    const result = applyBackgroundColors(html, sections);
    expect(result).toContain('background-color: #ECFDF5');
    expect(result).toContain("<h3>Sub Takeaways</h3>");
    // The next h3 should NOT be inside the div
    expect(result).toContain("</div><h3>Another Sub</h3>");
  });

  it("handles multiple colored sections", () => {
    const html = "<h2>Section A</h2><p>Text A.</p><h2>Section B</h2><p>Text B.</p><h2>Section C</h2><p>Text C.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Section A", type: "h2", points: [], backgroundColor: "#F3F4F6" },
      { id: "2", heading: "Section B", type: "h2", points: [] },
      { id: "3", heading: "Section C", type: "h2", points: [], backgroundColor: "#FEF3C7" },
    ];
    const result = applyBackgroundColors(html, sections);
    expect(result).toContain('background-color: #F3F4F6');
    expect(result).toContain('background-color: #FEF3C7');
    // Section B should not be wrapped
    const sectionBIndex = result.indexOf("<h2>Section B</h2>");
    const beforeB = result.substring(sectionBIndex - 10, sectionBIndex);
    expect(beforeB).not.toContain("background-color");
  });

  it("skips sections already wrapped by the LLM", () => {
    const html = '<div style="background-color: #F3F4F6; border-radius: 12px; padding: 24px 28px; margin: 16px 0;"><h2>Key Takeaways</h2><ul><li>Point 1</li></ul></div><h2>Next</h2><p>Text.</p>';
    const sections: OutlineSection[] = [
      { id: "1", heading: "Key Takeaways", type: "h2", points: [], backgroundColor: "#F3F4F6" },
      { id: "2", heading: "Next", type: "h2", points: [] },
    ];
    const result = applyBackgroundColors(html, sections);
    // Should not double-wrap — count occurrences of background-color
    const matches = result.match(/background-color/g);
    expect(matches?.length).toBe(1);
  });

  it("handles heading text with minor differences (case insensitive)", () => {
    const html = "<h2>key takeaways</h2><ul><li>Point 1</li></ul><h2>Next</h2><p>Text.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Key Takeaways", type: "h2", points: [], backgroundColor: "#F3F4F6" },
      { id: "2", heading: "Next", type: "h2", points: [] },
    ];
    const result = applyBackgroundColors(html, sections);
    expect(result).toContain('background-color: #F3F4F6');
  });

  it("handles empty sections array", () => {
    const html = "<h2>Title</h2><p>Content.</p>";
    const result = applyBackgroundColors(html, []);
    expect(result).toBe(html);
  });

  it("handles heading not found in HTML gracefully", () => {
    const html = "<h2>Different Heading</h2><p>Content.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Key Takeaways", type: "h2", points: [], backgroundColor: "#F3F4F6" },
    ];
    const result = applyBackgroundColors(html, sections);
    // Should return unchanged since heading wasn't found
    expect(result).toBe(html);
  });

  it("preserves content between the heading and the next heading", () => {
    const html = "<h2>Key Takeaways</h2><p>Intro paragraph.</p><ul><li>Point 1</li><li>Point 2</li><li>Point 3</li></ul><p>Summary paragraph.</p><h2>Details</h2><p>Detail text.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Key Takeaways", type: "h2", points: [], backgroundColor: "#DBEAFE" },
      { id: "2", heading: "Details", type: "h2", points: [] },
    ];
    const result = applyBackgroundColors(html, sections);
    // All content between Key Takeaways and Details should be inside the div
    const divStart = result.indexOf('<div style="background-color: #DBEAFE');
    const divEnd = result.indexOf('</div>');
    const insideDiv = result.substring(divStart, divEnd);
    expect(insideDiv).toContain("Intro paragraph");
    expect(insideDiv).toContain("Point 1");
    expect(insideDiv).toContain("Point 3");
    expect(insideDiv).toContain("Summary paragraph");
  });

  it("handles headings with HTML entities", () => {
    const html = "<h2>Pros &amp; Cons</h2><ul><li>Pro 1</li></ul><h2>Next</h2><p>Text.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Pros & Cons", type: "h2", points: [], backgroundColor: "#FEF3C7" },
      { id: "2", heading: "Next", type: "h2", points: [] },
    ];
    const result = applyBackgroundColors(html, sections);
    expect(result).toContain('background-color: #FEF3C7');
  });
});
