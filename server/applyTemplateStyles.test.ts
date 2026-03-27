import { describe, it, expect } from "vitest";
import { applyTemplateStyles } from "./applyTemplateStyles";
import type { OutlineSection } from "../drizzle/schema";

describe("applyTemplateStyles", () => {
  // ==================== PRO TIP TESTS ====================

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

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain("background-color: #ECFDF5");
    expect(result).toContain("border-left: 4px solid #166534");
    expect(result).toContain("<svg");
    expect(result).toContain('stroke="#166534"');
    expect(result).toContain("<strong");
    expect(result).toContain("Pro Tip</strong>");
    expect(result).toContain("Always check your eligibility early.");
    expect(result).not.toContain("<h2>Pro Tip</h2>");
    expect(result).toContain("<h2>Next Section</h2>");
    expect(result).toContain("More content.");
  });

  // ==================== SUMMARY TESTS ====================

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
    expect(result).toBe(html);
  });

  it("replaces a background-color div wrapper from applyBackgroundColors", () => {
    const html = '<div style="background-color: #ECFDF5; border-radius: 12px; padding: 24px 28px; margin: 16px 0;">\n<h2>Pro Tip</h2><p>Check your status.</p>\n</div><h2>Next</h2><p>More.</p>';
    const sections: OutlineSection[] = [
      { id: "1", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip", backgroundColor: "#ECFDF5" },
      { id: "2", heading: "Next", type: "h2", points: [] },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain("border-left: 4px solid #166534");
    expect(result).toContain("<svg");
    expect(result).toContain("Check your status.");
    expect(result).toContain("<h2>Next</h2>");
  });

  it("handles sections with no templateType alongside template sections", () => {
    const html = "<h2>Key Takeaways</h2><ul><li>Point 1</li></ul><h2>Pro Tip</h2><p>Tip content.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Key Takeaways", type: "h2", points: ["Point 1"], backgroundColor: "#EFF6FF" },
      { id: "2", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain("<h2>Key Takeaways</h2>");
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
    // Outline has 2 sections but HTML only has 1 heading — the template section has no match
    const html = "<h2>Introduction</h2><p>Content.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Introduction", type: "h2", points: [] },
      { id: "2", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
    ];
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

  // ==================== ALIAS MATCHING TESTS ====================

  it("matches 'Conclusion' as an alias for a summary template section", () => {
    const html = "<h2>Intro</h2><p>Welcome.</p><h2>Conclusion</h2><p>This wraps up everything we covered.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Intro", type: "h2", points: [] },
      { id: "2", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="summary"');
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
    expect(result).toContain("key points to remember");
  });

  it("matches 'Expert Tip' as an alias for a pro-tip template section", () => {
    const html = "<h2>Expert Tip</h2><p>Always compare at least three quotes.</p>";
    const sections: OutlineSection[] = [
      { id: "1", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain("Always compare at least three quotes.");
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
  });

  // ==================== USE CASES TESTS ====================

  it("wraps a use-cases section with stacked cards", () => {
    const html = `<h2>Use Cases</h2><p>Several common situations require manual enrollment.</p><p><strong>Delaying Social Security</strong></p><p>Many individuals choose to delay their benefits.</p><p><strong>Still Working Past 65</strong></p><p>Older adults who continue to work often choose manual enrollment.</p><p><strong>Self-Employed</strong></p><p>If you are self-employed, you will need to manually enroll.</p><h2>Next Section</h2><p>More content.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
      { id: "2", heading: "Next Section", type: "h2", points: [] },
    ];
    const result = applyTemplateStyles(html, sections);

    // Should contain the use-cases wrapper
    expect(result).toContain('data-template="use-cases"');
    // Should contain individual cards with slate left border
    expect(result).toContain("border-left: 4px solid #334155");
    expect(result).toContain("background-color: #F8FAFC");
    // Should contain all three card titles
    expect(result).toContain("Delaying Social Security");
    expect(result).toContain("Still Working Past 65");
    expect(result).toContain("Self-Employed");
    // Should contain the intro paragraph
    expect(result).toContain("Several common situations require manual enrollment.");
    // Should contain card body content
    expect(result).toContain("Many individuals choose to delay their benefits.");
    expect(result).toContain("Older adults who continue to work");
    expect(result).toContain("you will need to manually enroll");
    // Should NOT contain the original h2
    expect(result).not.toContain("<h2>Use Cases</h2>");
    // Next section should be untouched
    expect(result).toContain("<h2>Next Section</h2>");
  });

  it("creates separate card divs for each use case", () => {
    const html = `<h2>Use Cases</h2><p>Intro text.</p><p><strong>Card One</strong></p><p>Description one.</p><p><strong>Card Two</strong></p><p>Description two.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
    ];
    const result = applyTemplateStyles(html, sections);

    // Count the number of card divs (each has border-left: 4px solid #334155)
    const cardCount = (result.match(/border-left: 4px solid #334155/g) || []).length;
    expect(cardCount).toBe(2);
  });

  it("preserves intro paragraph before the first card", () => {
    const html = `<h2>Use Cases</h2><p>This intro should appear before the cards.</p><p><strong>First Card</strong></p><p>Card content.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="use-cases"');
    expect(result).toContain("This intro should appear before the cards.");
    expect(result).toContain("First Card");
    expect(result).toContain("Card content.");
  });

  it("handles use-cases with no card structure (fallback)", () => {
    const html = `<h2>Use Cases</h2><p>Just a plain paragraph with no bold sub-headings.</p><p>Another paragraph.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
    ];
    const result = applyTemplateStyles(html, sections);

    // Should still wrap with data-template but no individual cards
    expect(result).toContain('data-template="use-cases"');
    expect(result).toContain("Just a plain paragraph");
    expect(result).toContain("Another paragraph.");
    // Should NOT contain card-level styling since no cards were detected
    expect(result).not.toContain("border-left: 4px solid #334155");
  });

  it("matches 'Common Scenarios' as an alias for use-cases", () => {
    const html = `<h2>Common Scenarios</h2><p>Here are the most common situations.</p><p><strong>Scenario A</strong></p><p>Description A.</p><p><strong>Scenario B</strong></p><p>Description B.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="use-cases"');
    expect(result).toContain("Scenario A");
    expect(result).toContain("Scenario B");
    expect(result).not.toContain("<h2>Common Scenarios</h2>");
  });

  it("matches 'Who Should Consider This' as an alias for use-cases", () => {
    const html = `<h2>Who Should Consider This</h2><p>Several groups benefit.</p><p><strong>Group A</strong></p><p>Description.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="use-cases"');
    expect(result).toContain("Group A");
  });

  it("handles use-cases at the end of the article (no next heading)", () => {
    const html = `<h2>Intro</h2><p>Welcome.</p><h2>Use Cases</h2><p>Intro text.</p><p><strong>Case 1</strong></p><p>Description 1.</p><p><strong>Case 2</strong></p><p>Description 2.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Intro", type: "h2", points: [] },
      { id: "2", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="use-cases"');
    expect(result).toContain("Case 1");
    expect(result).toContain("Case 2");
    expect(result).toContain("<h2>Intro</h2>");
  });

  it("handles use-cases with background-color div wrapper from applyBackgroundColors", () => {
    const html = `<div style="background-color: #F8FAFC; border-radius: 12px; padding: 24px 28px; margin: 16px 0;">\n<h2>Use Cases</h2><p>Intro.</p><p><strong>Card A</strong></p><p>Desc A.</p>\n</div><h2>Next</h2><p>More.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases", backgroundColor: "#F8FAFC" },
      { id: "2", heading: "Next", type: "h2", points: [] },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="use-cases"');
    expect(result).toContain("Card A");
    expect(result).toContain("<h2>Next</h2>");
  });

  it("handles all three template types in the same article", () => {
    const html = `<h2>Intro</h2><p>Welcome.</p><h2>Pro Tip</h2><p>Start early.</p><h2>Use Cases</h2><p>Intro.</p><p><strong>Case 1</strong></p><p>Desc.</p><h2>Summary</h2><p>In conclusion.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Intro", type: "h2", points: [] },
      { id: "2", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
      { id: "3", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
      { id: "4", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain('data-template="use-cases"');
    expect(result).toContain('data-template="summary"');
    expect(result).toContain("<h2>Intro</h2>");
  });

  it("use-cases card titles get styled with dark color", () => {
    const html = `<h2>Use Cases</h2><p><strong>My Card Title</strong></p><p>Description.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('color: #1E293B');
    expect(result).toContain("My Card Title");
  });

  it("handles use-cases with custom heading text", () => {
    const html = `<h2>Who Should Consider Manual Enrollment?</h2><p>Several situations require it.</p><p><strong>Delaying Social Security</strong></p><p>Many individuals choose to delay.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Who Should Consider Manual Enrollment?", type: "h2", points: [], templateType: "use-cases" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="use-cases"');
    expect(result).toContain("Delaying Social Security");
    expect(result).not.toContain("<h2>Who Should Consider Manual Enrollment?</h2>");
  });

  it("handles use-cases with 5 cards", () => {
    const html = `<h2>Use Cases</h2><p>Intro.</p><p><strong>A</strong></p><p>Desc A.</p><p><strong>B</strong></p><p>Desc B.</p><p><strong>C</strong></p><p>Desc C.</p><p><strong>D</strong></p><p>Desc D.</p><p><strong>E</strong></p><p>Desc E.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
    ];
    const result = applyTemplateStyles(html, sections);

    const cardCount = (result.match(/border-left: 4px solid #334155/g) || []).length;
    expect(cardCount).toBe(5);
  });

  // ==================== POSITIONAL MATCHING TESTS ====================

  it("uses positional matching when LLM renames use-cases heading to something not in aliases", () => {
    // Real-world scenario: outline has "Use Cases" but LLM renamed to "Who These Medicare Options Are Designed For"
    const html = `<h2>Understanding Your Medicare Journey</h2><p>Intro content.</p><h2>Who These Medicare Options Are Designed For</h2><p>Different plans serve different people.</p><p><strong>The Frequent Healthcare User</strong></p><p>If you see multiple specialists.</p><p><strong>The Budget-Conscious Senior</strong></p><p>If keeping premiums low is your priority.</p><h2>Medicare Basics</h2><p>More content.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Understanding Your Medicare Journey", type: "h2", points: [] },
      { id: "2", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
      { id: "3", heading: "Medicare Basics", type: "h2", points: [] },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="use-cases"');
    expect(result).toContain("The Frequent Healthcare User");
    expect(result).toContain("The Budget-Conscious Senior");
    expect(result).toContain("border-left: 4px solid #334155");
    expect(result).not.toContain("<h2>Who These Medicare Options Are Designed For</h2>");
    expect(result).toContain("<h2>Understanding Your Medicare Journey</h2>");
    expect(result).toContain("<h2>Medicare Basics</h2>");
  });

  it("uses positional matching when LLM renames summary heading to something creative", () => {
    const html = `<h2>Intro</h2><p>Welcome.</p><h2>Your Path Forward</h2><p>Here is what we covered.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Intro", type: "h2", points: [] },
      { id: "2", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="summary"');
    expect(result).toContain("Here is what we covered.");
    expect(result).not.toContain("<h2>Your Path Forward</h2>");
  });

  it("prefers exact match over positional match", () => {
    // Even though positional would match the 2nd heading, exact match should find the 3rd
    const html = `<h2>Intro</h2><p>Welcome.</p><h2>Random Section</h2><p>Content.</p><h2>Use Cases</h2><p>Intro.</p><p><strong>Case A</strong></p><p>Desc.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Intro", type: "h2", points: [] },
      { id: "2", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
    ];
    const result = applyTemplateStyles(html, sections);

    // Should match "Use Cases" exactly (3rd heading), not positionally (2nd heading)
    expect(result).toContain('data-template="use-cases"');
    expect(result).toContain("Case A");
    expect(result).toContain("<h2>Random Section</h2>");
  });

  it("positional matching works with pro-tip when LLM renames heading", () => {
    const html = `<h2>Intro</h2><p>Content.</p><h2>A Helpful Reminder</h2><p>Always check your eligibility.</p><h2>Next</h2><p>More.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Intro", type: "h2", points: [] },
      { id: "2", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
      { id: "3", heading: "Next", type: "h2", points: [] },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain("Always check your eligibility.");
    expect(result).toContain("<h2>Intro</h2>");
    expect(result).toContain("<h2>Next</h2>");
  });

  it("positional matching handles multiple templates with renamed headings", () => {
    const html = `<h2>Getting Started</h2><p>Intro.</p><h2>Important Advice</h2><p>Tip content.</p><h2>Who Benefits Most</h2><p>Intro text.</p><p><strong>Group A</strong></p><p>Desc A.</p><h2>Final Words</h2><p>Wrap up.</p>`;
    const sections: OutlineSection[] = [
      { id: "1", heading: "Getting Started", type: "h2", points: [] },
      { id: "2", heading: "Pro Tip", type: "h2", points: [], templateType: "pro-tip" },
      { id: "3", heading: "Use Cases", type: "h2", points: [], templateType: "use-cases" },
      { id: "4", heading: "Summary", type: "h2", points: [], templateType: "summary" },
    ];
    const result = applyTemplateStyles(html, sections);

    expect(result).toContain('data-template="pro-tip"');
    expect(result).toContain('data-template="use-cases"');
    expect(result).toContain('data-template="summary"');
    expect(result).toContain("<h2>Getting Started</h2>");
  });
});
