import { describe, it, expect } from "vitest";
import { applyTemplateStyles } from "./applyTemplateStyles";
import type { OutlineSection } from "../drizzle/schema";

describe("coverage-card template", () => {
  const makeSections = (heading: string): OutlineSection[] => [
    {
      id: "1",
      heading,
      type: "h2",
      templateType: "coverage-card",
      subSections: [
        { id: "1a", heading: "What It Covers", type: "h3" },
        { id: "1b", heading: "What It Doesn't Cover", type: "h3" },
      ],
    },
  ];

  const sampleHtml = `<h2>Part A: Hospital Insurance</h2>
<p>Covers inpatient hospital stays, skilled nursing facility care, hospice care, and some home health care.</p>
<h3>What It Covers</h3>
<ul>
<li>Inpatient hospital stays</li>
<li>Skilled nursing facility care (up to 100 days)</li>
<li>Hospice care</li>
<li>Some home health care services</li>
</ul>
<h3>What It Doesn't Cover</h3>
<ul>
<li>Long-term care (custodial care)</li>
<li>Most dental, vision, and hearing</li>
<li>Private-duty nursing</li>
</ul>
<p>Cost: Most people pay $0 in premiums (if you or your spouse paid Medicare taxes for 10+ years). The 2026 deductible is $1,676 per benefit period.</p>`;

  it("wraps content in a coverage-card container with data-template attribute", () => {
    const result = applyTemplateStyles(sampleHtml, makeSections("Part A: Hospital Insurance"));
    expect(result).toContain('data-template="coverage-card"');
  });

  it("renders a blue gradient header bar with the section heading", () => {
    const result = applyTemplateStyles(sampleHtml, makeSections("Part A: Hospital Insurance"));
    expect(result).toContain("linear-gradient(135deg, #3B82F6, #2563EB)");
    expect(result).toContain("Part A: Hospital Insurance");
  });

  it("renders the summary paragraph", () => {
    const result = applyTemplateStyles(sampleHtml, makeSections("Part A: Hospital Insurance"));
    expect(result).toContain("Covers inpatient hospital stays");
  });

  it("renders What It Covers items with green bullets", () => {
    const result = applyTemplateStyles(sampleHtml, makeSections("Part A: Hospital Insurance"));
    expect(result).toContain("What It Covers");
    expect(result).toContain("Inpatient hospital stays");
    expect(result).toContain("Skilled nursing facility care");
    expect(result).toContain("Hospice care");
    expect(result).toContain("#16A34A"); // green color
  });

  it("renders What It Doesn't Cover items with red bullets", () => {
    const result = applyTemplateStyles(sampleHtml, makeSections("Part A: Hospital Insurance"));
    expect(result).toContain("What It Doesn't Cover");
    expect(result).toContain("Long-term care");
    expect(result).toContain("Most dental, vision, and hearing");
    expect(result).toContain("#DC2626"); // red color
  });

  it("renders the cost callout box with blue styling", () => {
    const result = applyTemplateStyles(sampleHtml, makeSections("Part A: Hospital Insurance"));
    expect(result).toContain("#EFF6FF"); // light blue background
    expect(result).toContain("$0 in premiums");
    expect(result).toContain("$1,676 per benefit period");
  });

  it("renders a two-column grid layout for covers/doesn't cover", () => {
    const result = applyTemplateStyles(sampleHtml, makeSections("Part A: Hospital Insurance"));
    expect(result).toContain("grid-template-columns: 1fr 1fr");
  });

  it("removes the original h2 heading (replaced by the blue header bar)", () => {
    const result = applyTemplateStyles(sampleHtml, makeSections("Part A: Hospital Insurance"));
    expect(result).not.toContain("<h2>Part A: Hospital Insurance</h2>");
  });

  it("does not double-wrap if already has data-template attribute", () => {
    const alreadyWrapped = `<div data-template="coverage-card"><h2>Part A</h2><p>Content</p></div>`;
    const result = applyTemplateStyles(alreadyWrapped, makeSections("Part A"));
    // Should not add another coverage-card wrapper
    const matches = result.match(/data-template="coverage-card"/g) || [];
    expect(matches.length).toBe(1);
  });

  it("handles content without a cost note gracefully", () => {
    const noCostHtml = `<h2>Part A: Hospital Insurance</h2>
<p>Covers inpatient hospital stays.</p>
<h3>What It Covers</h3>
<ul><li>Inpatient hospital stays</li></ul>
<h3>What It Doesn't Cover</h3>
<ul><li>Long-term care</li></ul>`;

    const result = applyTemplateStyles(noCostHtml, makeSections("Part A: Hospital Insurance"));
    expect(result).toContain('data-template="coverage-card"');
    expect(result).toContain("Inpatient hospital stays");
    expect(result).toContain("Long-term care");
    // No cost callout box
    expect(result).not.toContain("#EFF6FF");
  });

  it("matches via alias when heading text differs from outline", () => {
    const aliasHtml = `<h2>Coverage Overview</h2>
<p>This plan covers basic services.</p>
<h3>What It Covers</h3>
<ul><li>Basic services</li></ul>
<h3>What It Doesn't Cover</h3>
<ul><li>Premium services</li></ul>`;

    const sections: OutlineSection[] = [
      {
        id: "1",
        heading: "Coverage Overview",
        type: "h2",
        templateType: "coverage-card",
      },
    ];

    const result = applyTemplateStyles(aliasHtml, sections);
    expect(result).toContain('data-template="coverage-card"');
  });

  it("preserves other sections outside the coverage card", () => {
    const multiSectionHtml = `<h2>Introduction</h2>
<p>Welcome to Medicare.</p>
<h2>Part A: Hospital Insurance</h2>
<p>Covers inpatient hospital stays.</p>
<h3>What It Covers</h3>
<ul><li>Inpatient hospital stays</li></ul>
<h3>What It Doesn't Cover</h3>
<ul><li>Long-term care</li></ul>
<h2>Conclusion</h2>
<p>Thank you for reading.</p>`;

    const sections: OutlineSection[] = [
      { id: "0", heading: "Introduction", type: "h2" },
      {
        id: "1",
        heading: "Part A: Hospital Insurance",
        type: "h2",
        templateType: "coverage-card",
      },
      { id: "2", heading: "Conclusion", type: "h2" },
    ];

    const result = applyTemplateStyles(multiSectionHtml, sections);
    expect(result).toContain("<h2>Introduction</h2>");
    expect(result).toContain("<p>Welcome to Medicare.</p>");
    expect(result).toContain('data-template="coverage-card"');
    expect(result).toContain("<h2>Conclusion</h2>");
    expect(result).toContain("<p>Thank you for reading.</p>");
  });
});
