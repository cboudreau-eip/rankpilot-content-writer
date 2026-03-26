/**
 * Post-process generated article HTML to wrap sections that have a
 * backgroundColor set in the outline with styled <div> containers.
 *
 * Strategy: For each section in the outline that has a backgroundColor,
 * find the matching heading in the HTML and wrap everything from that heading
 * to the next same-level heading (or end of content) in a styled div.
 *
 * This is more reliable than depending on the LLM to follow the directive,
 * and it also handles cases where the LLM already wrapped the section
 * (we detect and skip those to avoid double-wrapping).
 */

import type { OutlineSection } from "../drizzle/schema";

interface SectionColorMap {
  heading: string;
  level: "h2" | "h3";
  backgroundColor: string;
}

/**
 * Build a flat list of sections that have a backgroundColor set.
 */
function collectColoredSections(sections: OutlineSection[]): SectionColorMap[] {
  const result: SectionColorMap[] = [];
  for (const section of sections) {
    if (section.backgroundColor) {
      result.push({
        heading: section.heading,
        level: section.type === "h3" ? "h3" : "h2",
        backgroundColor: section.backgroundColor,
      });
    }
    if (section.subSections) {
      for (const sub of section.subSections) {
        if (sub.backgroundColor) {
          result.push({
            heading: sub.heading,
            level: "h3",
            backgroundColor: sub.backgroundColor,
          });
        }
      }
    }
  }
  return result;
}

/**
 * Normalize a heading string for comparison: lowercase, strip extra whitespace,
 * strip HTML tags, and remove common punctuation differences.
 */
function normalizeHeading(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * Apply background colors to article HTML based on outline section data.
 * Returns the modified HTML with styled div wrappers.
 */
export function applyBackgroundColors(html: string, sections: OutlineSection[]): string {
  const coloredSections = collectColoredSections(sections);
  if (coloredSections.length === 0) return html;

  let result = html;

  for (const section of coloredSections) {
    const normalizedTarget = normalizeHeading(section.heading);
    const tag = section.level; // "h2" or "h3"
    const nextTag = tag; // We stop at the next same-level heading

    // Build a regex to find the heading tag with this text
    // Match: <h2>...heading text...</h2> (possibly with attributes)
    const headingRegex = new RegExp(
      `(<${tag}[^>]*>)(.*?)(<\\/${tag}>)`,
      "gi"
    );

    let headingMatch: RegExpExecArray | null;
    let headingStart = -1;
    let headingEnd = -1;

    // Find the matching heading
    while ((headingMatch = headingRegex.exec(result)) !== null) {
      const matchedText = normalizeHeading(headingMatch[2]);
      if (matchedText === normalizedTarget) {
        headingStart = headingMatch.index;
        headingEnd = headingMatch.index + headingMatch[0].length;
        break;
      }
    }

    if (headingStart === -1) continue; // heading not found

    // Check if this heading is already inside a styled div (LLM already did it)
    const before = result.substring(Math.max(0, headingStart - 200), headingStart);
    if (/<div[^>]*style="[^"]*background-color[^"]*"[^>]*>\s*$/i.test(before)) {
      continue; // Already wrapped, skip
    }

    // Find the end of this section: next same-level heading or end of content
    const afterHeading = result.substring(headingEnd);
    const nextHeadingRegex = new RegExp(`<${nextTag}[\\s>]`, "i");
    const nextHeadingMatch = nextHeadingRegex.exec(afterHeading);

    let sectionEnd: number;
    if (nextHeadingMatch) {
      sectionEnd = headingEnd + nextHeadingMatch.index;
    } else {
      sectionEnd = result.length;
    }

    // Extract the section content
    const sectionContent = result.substring(headingStart, sectionEnd).trimEnd();

    // Build the styled div wrapper
    const style = `background-color: ${section.backgroundColor}; border-radius: 12px; padding: 24px 28px; margin: 16px 0;`;
    const wrappedSection = `<div style="${style}">\n${sectionContent}\n</div>`;

    // Replace the section in the result
    result = result.substring(0, headingStart) + wrappedSection + result.substring(sectionEnd);
  }

  return result;
}
