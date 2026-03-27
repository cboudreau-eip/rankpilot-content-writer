import { describe, it, expect } from "vitest";
import { applyTemplateStyles } from "./applyTemplateStyles";
import type { OutlineSection } from "../drizzle/schema";

describe("applyTemplateStyles", () => {
  it("returns html unchanged when no sections have templateType", () => {
    const html = "<h2>Intro</h2><p>Hello world.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Intro", type: "h2", points: [] },
    ];
    expect(applyTemplateStyles(html, sections)).toBe(html);
  });

  it("wraps a pro-tip section with green border, SVG icon, and mint background", () => {
    const html = "<h2>Pro Tip</h2><p>Always check your eligibility early.</p><h2>Next Section</h2><p>More content.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
      { id: "2", heading: "Next Section", type: "h2", points: [] },
    ];
    const result = applyTemplateStyles(html, sections);

    // Should contain the template wrapper
    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain("background-color: #ECFDF5");
    expect(result).toContain("border-left: 4px solid #166534");
    // Should contain the inline SVG checkmark
    expect(result).toContain("<svg");
    expect(result).toContain('stroke="#166534"');
    // Should contain the bold Pro Tip label
    expect(result).toContain("<strong");
    expect(result).toContain("Pro Tip</strong>");
    // Should contain the body content
    expect(result).toContain("Always check your eligibility early.");
    // Should NOT contain the original h2 heading (it's replaced by the styled label)
    expect(result).not.toContain("<h2>Pro Tip</h2>");
    // The next section should be untouched
    expect(result).toContain("<h2>Next Section</h2>");
    expect(result).toContain("More content.");
  });

  it("wraps a summary section with gray border and bold heading", () => {
    const html = "<h2>Summary</h2><p>This article covered the basics of Medicare enrollment.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="summary"');
    expect(result).toContain("background-color: #F9FAFB");
    expect(result).toContain("border-left: 4px solid #6B7280");
    expect(result).toContain("<strong");
    expect(result).toContain("Summary</strong>");
    expect(result).toContain("This article covered the basics");
    // Should NOT contain the original h2
    expect(result).not.toContain("<h2>Summary</h2>");
  });

  it("handles both pro-tip and summary in the same article", () => {
    const html = "<h2>Intro</h2><p>Welcome.</p><h2>Pro Tip</h2><p>Start early.</p><h2>Details</h2><p>More info.</p><h2>Summary</h2><p>In conclusion.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Intro", type: "h2", points: [] },
      { id: "2", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
      { id: "3", heading: "Details", type: "h2", points: [] },
      { id: "4", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain('data-template="summary"');
    expect(result).toContain("<h2>Intro</h2>");
    expect(result).toContain("<h2>Details</h2>");
    expect(result).not.toContain("<h2>Pro Tip</h2>");
    expect(result).not.toContain("<h2>Summary</h2>");
  });

  it("does not double-wrap if already wrapped with data-template", () => {
    const html = '<div style="background-color: #ECFDF5; border-left: 4px solid #166534; border-radius: 8px; padding: 20px 24px; margin: 20px 0;" data-template="pro-tip"><p><strong>Pro Tip</strong></p><p>Already styled.</p></div>';
    const sections: OutlineSection[] = [
      { id: "1", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
    ];
    const result = applyTemplateStyles(html, sections);
    // Should not find the heading, so it should return unchanged
    // (no <h2>Pro Tip</h2> to match)
    expect(result).toBe(html);
  });

  it("replaces a background-color div wrapper from applyBackgroundColors", () => {
    // Simulate what applyBackgroundColors would produce for a pro-tip section that also has backgroundColor set
    const html = '<div style="background-color: #ECFDF5; border-radius: 12px; padding: 24px 28px; margin: 16px 0;">\n<h2>Pro Tip</h2><p>Check your status.</p>\n</div><h2>Next</h2><p>More.</p>';
    const sections: OutlineSection[] = [
      { id: "1", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip", backgroundColor: "#ECFDF5" },
      { id: "2", heading: "Next", type: "h2", points: [] },
    ];
    const result = applyTemplateStyles(html, sections);

    // Should have the template wrapper instead of the plain background div
    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain("border-left: 4px solid #166534");
    expect(result).toContain("<svg");
    expect(result).toContain("Check your status.");
    // The next section should be untouched
    expect(result).toContain("<h2>Next</h2>");
  });

  it("handles sections with no templateType alongside template sections", () => {
    const html = "<h2>Key Takeaways</h2><ul><li>Point 1</li></ul><h2>Pro Tip</h2><p>Tip content.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Key Takeaways", type: "h2", points: ["Point 1"], backgroundColor: "#EFF6FF" },
      { id: "2", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
    ];
    const result = applyTemplateStyles(html, sections);

    // Key Takeaways should be untouched by this function (no templateType)
    expect(result).toContain("<h2>Key Takeaways</h2>");
    // Pro Tip should be wrapped
    expect(result).toContain('data-template="pro-tip"');
  });

  it("handles heading text with different casing", () => {
    const html = "<h2>PRO TIP</h2><p>Important advice.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
    ];
    const result = applyTemplateStyles(html, sections);
    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain("Important advice.");
  });

  it("handles empty sections array", () => {
    const html = "<h2>Hello</h2><p>World.</p>";
    expect(applyTemplateStyles(html, [])).toBe(html);
  });

  it("handles pro-tip section at the end of the article (no next heading)", () => {
    const html = "<h2>Intro</h2><p>Welcome.</p><h2>Pro Tip</h2><p>Final tip content here.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Intro", type: "h2", points: [] },
      { id: "2", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain("Final tip content here.");
    expect(result).toContain("<h2>Intro</h2>");
  });

  it("preserves multiple paragraphs in a summary section", () => {
    const html = "<h2>Summary</h2><p>First paragraph of summary.</p><p>Second paragraph with next steps.</p><p>Third paragraph with resources.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="summary"');
    expect(result).toContain("First paragraph of summary.");
    expect(result).toContain("Second paragraph with next steps.");
    expect(result).toContain("Third paragraph with resources.");
  });

  it("handles heading not found in HTML gracefully", () => {
    const html = "<h2>Introduction</h2><p>Content.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
    ];
    // Should return unchanged since heading is not found
    expect(applyTemplateStyles(html, sections)).toBe(html);
  });

  it("handles subSections with templateType", () => {
    const html = "<h2>Main Section</h2><p>Content.</p><h3>Quick Tip</h3><p>Sub tip.</p><h3>More Details</h3><p>Details.</p>";
    const sections: OutlineSection[] = [
      {
        id: "1",
        heading: "Main Section",
        type: "h2",
        points: [],
        subSections: [
          { id: "1-sub0", heading: "Quick Tip", type: "h3", points: [], templateType: "pro-tip" },
          { id: "1-sub1", heading: "More Details", type: "h3", points: [] },
        ],
      },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain("Sub tip.");
    expect(result).toContain("<h3>More Details</h3>");
  });

  // --- Alias/fuzzy matching tests ---

  it("matches 'Conclusion' as an alias for a summary template section", () => {
    const html = "<h2>Intro</h2><p>Welcome.</p><h2>Conclusion</h2><p>This wraps up everything we covered.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Intro", type: "h2", points: [] },
      { id: "2", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="summary"');
    expect(result).toContain("background-color: #F9FAFB");
    expect(result).toContain("border-left: 4px solid #6B7280");
    expect(result).toContain("Summary</strong>");
    expect(result).toContain("This wraps up everything we covered.");
    expect(result).not.toContain("<h2>Conclusion</h2>");
  });

  it("matches 'Final Thoughts' as an alias for a summary template section", () => {
    const html = "<h2>Final Thoughts</h2><p>Here are the key points to remember.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="summary"');
    expect(result).toContain("Summary</strong>");
    expect(result).toContain("key points to remember");
    expect(result).not.toContain("<h2>Final Thoughts</h2>");
  });

  it("matches 'Wrapping Up' as an alias for a summary template section", () => {
    const html = "<h2>Wrapping Up</h2><p>To summarize the main takeaways.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="summary"');
    expect(result).toContain("To summarize the main takeaways.");
  });

  it("matches 'Expert Tip' as an alias for a pro-tip template section", () => {
    const html = "<h2>Expert Tip</h2><p>Always compare at least three quotes.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain("Pro Tip</strong>");
    expect(result).toContain("Always compare at least three quotes.");
    expect(result).not.toContain("<h2>Expert Tip</h2>");
  });

  it("matches 'Quick Tip' as an alias for a pro-tip template section", () => {
    const html = "<h2>Quick Tip</h2><p>Check your eligibility first.</p><h2>Next</h2><p>More.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
      { id: "2", heading: "Next", type: "h2", points: [] },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain("Check your eligibility first.");
    expect(result).toContain("<h2>Next</h2>");
  });

  it("still prefers exact match over alias when both exist", () => {
    const html = "<h2>Conclusion</h2><p>Wrong section.</p><h2>Summary</h2><p>Correct section.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Conclusion", type: "h2", points: [] },
      { id: "2", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="summary"');
    expect(result).toContain("Correct section.");
    // The Conclusion heading should remain untouched (it's a different section)
    expect(result).toContain("<h2>Conclusion</h2>");
  });

  it("handles both alias-matched summary and exact-matched pro-tip in same article", () => {
    const html = "<h2>Pro Tip</h2><p>Start early.</p><h2>Details</h2><p>Info.</p><h2>Conclusion</h2><p>Final words.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
      { id: "2", heading: "Details", type: "h2", points: [] },
      { id: "3", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain('data-template="summary"');
    expect(result).toContain("<h2>Details</h2>");
    expect(result).not.toContain("<h2>Pro Tip</h2>");
    expect(result).not.toContain("<h2>Conclusion</h2>");
  });
});
