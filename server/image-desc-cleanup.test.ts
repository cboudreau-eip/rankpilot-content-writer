import { describe, it, expect } from "vitest";

/**
 * Tests for the image description cleanup regex patterns used in article generation.
 * These patterns strip LLM-generated image description text like "Infographic showing..."
 * that the LLM writes as prose instead of letting the image generation step handle visuals.
 */

// Replicate the exact patterns from routers.ts
const imageDescPatterns = [
  // Standalone paragraphs that are purely image descriptions
  /<p>\s*(?:Infographic|Diagram|Chart|Image|Figure|Visual|Illustration|Graphic|Photo|Picture|Screenshot)\s+(?:showing|illustrating|depicting|comparing|displaying|demonstrating|highlighting|outlining|representing|of\b)[^<]{10,}<\/p>/gi,
  // "Visual representation of..." pattern (two-word keyword)
  /<p>\s*Visual\s+representation\s+of\b[^<]{10,}<\/p>/gi,
  // Same patterns in <em> or <strong> tags inside <p>
  /<p>\s*<(?:em|strong|i)>\s*(?:Infographic|Diagram|Chart|Image|Figure|Visual|Illustration|Graphic|Photo|Picture|Screenshot)\s+(?:showing|illustrating|depicting|comparing|displaying|demonstrating|highlighting|outlining|representing|of\b)[^<]{10,}<\/(?:em|strong|i)>\s*<\/p>/gi,
  // Bare text (not in a paragraph) that's an image description — wrapped in brackets or standalone
  /\[(?:Infographic|Diagram|Chart|Image|Figure|Visual|Illustration):[^\]]{10,}\]/gi,
];

function cleanImageDescriptions(html: string): string {
  let result = html;
  for (const pattern of imageDescPatterns) {
    // Reset regex lastIndex since we're reusing them
    pattern.lastIndex = 0;
    result = result.replace(pattern, "");
  }
  result = result.replace(/<p>\s*<\/p>/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return result;
}

describe("Image Description Cleanup", () => {
  it("removes 'Infographic showing...' paragraph", () => {
    const input = '<h2>Understanding Medicare</h2><p>Infographic showing the four parts of Medicare: Part A hospital insurance, Part B medical insurance, Part C Medicare Advantage, and Part D prescription drug coverage</p><p>Medicare is a federal program.</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Infographic showing");
    expect(result).toContain("Medicare is a federal program.");
    expect(result).toContain("<h2>Understanding Medicare</h2>");
  });

  it("removes 'Diagram illustrating...' paragraph", () => {
    const input = '<p>Diagram illustrating the enrollment timeline for Medicare with key dates and deadlines throughout the year</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Diagram illustrating");
  });

  it("removes 'Chart comparing...' paragraph", () => {
    const input = '<p>Chart comparing the costs of Medicare Advantage plans versus Original Medicare across different coverage categories</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Chart comparing");
  });

  it("removes 'Visual representation of...' paragraph", () => {
    const input = '<p>Visual representation of the Medicare enrollment process from initial eligibility to plan selection and activation</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Visual representation");
  });

  it("removes 'Illustration depicting...' paragraph", () => {
    const input = '<p>Illustration depicting the differences between Medicare supplement plans and their coverage levels</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Illustration depicting");
  });

  it("removes 'Figure showing...' paragraph", () => {
    const input = '<p>Figure showing the breakdown of out-of-pocket costs for Medicare beneficiaries in 2026</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Figure showing");
  });

  it("removes 'Image of...' paragraph", () => {
    const input = '<p>Image of a senior citizen reviewing Medicare plan options with a healthcare advisor at a desk</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Image of");
  });

  it("removes image descriptions wrapped in <em> tags", () => {
    const input = '<p><em>Infographic showing the four parts of Medicare and how they work together to provide comprehensive coverage</em></p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Infographic showing");
  });

  it("removes image descriptions wrapped in <strong> tags", () => {
    const input = '<p><strong>Diagram illustrating the step-by-step process of enrolling in Medicare for the first time</strong></p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Diagram illustrating");
  });

  it("removes bracket-style image descriptions", () => {
    const input = '<p>Some text before.</p>[Infographic: A detailed breakdown of Medicare Part A and Part B coverage differences]<p>Some text after.</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("[Infographic:");
    expect(result).toContain("Some text before.");
    expect(result).toContain("Some text after.");
  });

  it("does NOT remove regular paragraphs that mention images in context", () => {
    const input = '<p>The infographic below helps illustrate these concepts, but the key takeaway is that Medicare Part A covers hospital stays.</p>';
    const result = cleanImageDescriptions(input);
    // This should NOT be removed because it's a regular sentence that mentions "infographic" in passing
    // The pattern requires the paragraph to START with the image keyword
    expect(result).toContain("infographic below helps illustrate");
  });

  it("does NOT remove paragraphs with normal content", () => {
    const input = '<p>Medicare Part A covers hospital insurance and is available to most Americans at age 65.</p>';
    const result = cleanImageDescriptions(input);
    expect(result).toContain("Medicare Part A covers hospital insurance");
  });

  it("does NOT remove short image-like text (under 10 chars after keyword)", () => {
    // The pattern requires at least 10 chars after the keyword phrase to avoid false positives
    const input = '<p>Chart showing data</p>';
    const result = cleanImageDescriptions(input);
    // "data" is only 4 chars, so this should NOT match (10 char minimum)
    expect(result).toContain("Chart showing data");
  });

  it("handles multiple image descriptions in one article", () => {
    const input = [
      '<h2>Part A</h2>',
      '<p>Infographic showing the coverage details of Medicare Part A including hospital stays and skilled nursing</p>',
      '<p>Medicare Part A covers inpatient hospital care.</p>',
      '<h2>Part B</h2>',
      '<p>Diagram illustrating the various outpatient services covered under Medicare Part B including doctor visits</p>',
      '<p>Medicare Part B covers outpatient services.</p>',
    ].join("");
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Infographic showing");
    expect(result).not.toContain("Diagram illustrating");
    expect(result).toContain("Medicare Part A covers inpatient hospital care.");
    expect(result).toContain("Medicare Part B covers outpatient services.");
  });

  it("cleans up empty paragraphs after removal", () => {
    const input = '<p>Infographic showing the four parts of Medicare: Part A hospital insurance, Part B medical insurance, Part C Medicare Advantage, and Part D prescription drug coverage</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("<p></p>");
    expect(result).not.toContain("<p> </p>");
  });

  it("preserves actual <figure> image elements (real images)", () => {
    const input = '<figure class="ai-generated-image"><img src="https://cdn.example.com/image.png" alt="Medicare overview" /></figure>';
    const result = cleanImageDescriptions(input);
    expect(result).toContain('<figure class="ai-generated-image">');
    expect(result).toContain("https://cdn.example.com/image.png");
  });

  it("handles the exact user-reported example", () => {
    const input = '<h2>Understanding the Four Parts of Medicare</h2><p>Infographic showing the four parts of Medicare: Part A hospital insurance, Part B medical insurance, Part C Medicare Advantage, and Part D prescription drug coverage</p><p>Medicare is divided into four distinct parts, each serving a specific purpose in your healthcare coverage.</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Infographic showing the four parts");
    expect(result).toContain("Medicare is divided into four distinct parts");
    expect(result).toContain("<h2>Understanding the Four Parts of Medicare</h2>");
  });

  it("removes 'Screenshot showing...' paragraph", () => {
    const input = '<p>Screenshot showing the Medicare.gov plan comparison tool interface with filter options and plan details</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Screenshot showing");
  });

  it("removes 'Graphic displaying...' paragraph", () => {
    const input = '<p>Graphic displaying the timeline of Medicare enrollment periods throughout the calendar year</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Graphic displaying");
  });

  it("removes 'Photo depicting...' paragraph", () => {
    const input = '<p>Photo depicting a healthcare professional explaining Medicare options to an elderly patient in a clinic setting</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Photo depicting");
  });

  it("removes 'Picture of...' paragraph", () => {
    const input = '<p>Picture of a comparison table showing the differences between Medigap Plan F and Plan G coverage options</p>';
    const result = cleanImageDescriptions(input);
    expect(result).not.toContain("Picture of");
  });
});
