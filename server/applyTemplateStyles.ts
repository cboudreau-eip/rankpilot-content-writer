/**
 * Post-process generated article HTML to wrap sections that have a
 * templateType set (e.g., "pro-tip", "summary") with styled HTML containers.
 *
 * This runs AFTER applyBackgroundColors and adds template-specific styling
 * (icons, borders, etc.) that goes beyond simple background colors.
 *
 * Pro Tip: Green left border, light green background, inline SVG checkmark icon
 * Summary: Gray left border, light gray background, clean box layout
 */

import type { OutlineSection } from "../drizzle/schema";

/**
 * Inline SVG for the circled checkmark icon used in Pro Tip sections.
 * This is embedded directly in the HTML so it works when copy/pasted to any site.
 */
const PRO_TIP_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#166534" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:8px;flex-shrink:0;"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>`;

/**
 * The styled HTML wrapper for a Pro Tip section.
 * Green left border, mint background, checkmark icon + bold heading.
 */
function wrapProTip(innerContent: string): string {
  return `<div style="background-color: #ECFDF5; border-left: 4px solid #166534; border-radius: 8px; padding: 20px 24px; margin: 20px 0;" data-template="pro-tip">
<p style="margin: 0 0 8px 0; display: flex; align-items: center;">${PRO_TIP_SVG}<strong style="color: #166534; font-size: 1.05em;">Pro Tip</strong></p>
${innerContent}
</div>`;
}

/**
 * The styled HTML wrapper for a Summary section.
 * Gray left border, light gray background, bold heading.
 */
function wrapSummary(innerContent: string): string {
  return `<div style="background-color: #F9FAFB; border-left: 4px solid #6B7280; border-radius: 8px; padding: 20px 24px; margin: 20px 0;" data-template="summary">
<p style="margin: 0 0 12px 0;"><strong style="font-size: 1.1em;">Summary</strong></p>
${innerContent}
</div>`;
}

/**
 * Normalize a heading string for comparison.
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

interface TemplateSectionInfo {
  heading: string;
  level: "h2" | "h3";
  templateType: "pro-tip" | "summary";
}

/**
 * Collect sections that have a templateType set.
 */
function collectTemplateSections(sections: OutlineSection[]): TemplateSectionInfo[] {
  const result: TemplateSectionInfo[] = [];
  for (const section of sections) {
    if (section.templateType) {
      result.push({
        heading: section.heading,
        level: section.type === "h3" ? "h3" : "h2",
        templateType: section.templateType,
      });
    }
    if (section.subSections) {
      for (const sub of section.subSections) {
        if (sub.templateType) {
          result.push({
            heading: sub.heading,
            level: "h3",
            templateType: sub.templateType,
          });
        }
      }
    }
  }
  return result;
}

/**
 * Apply template-specific styles to article HTML based on outline section data.
 * This wraps Pro Tip and Summary sections with their styled containers,
 * replacing any existing background-color div wrapper if present.
 */
export function applyTemplateStyles(html: string, sections: OutlineSection[]): string {
  const templateSections = collectTemplateSections(sections);
  if (templateSections.length === 0) return html;

  let result = html;

  for (const section of templateSections) {
    const normalizedTarget = normalizeHeading(section.heading);
    const tag = section.level;

    // Find the heading in the HTML
    const headingRegex = new RegExp(
      `(<${tag}[^>]*>)(.*?)(<\\/${tag}>)`,
      "gi"
    );

    let headingMatch: RegExpExecArray | null;
    let headingStart = -1;
    let headingEnd = -1;

    while ((headingMatch = headingRegex.exec(result)) !== null) {
      const matchedText = normalizeHeading(headingMatch[2]);
      if (matchedText === normalizedTarget) {
        headingStart = headingMatch.index;
        headingEnd = headingMatch.index + headingMatch[0].length;
        break;
      }
    }

    if (headingStart === -1) continue;

    // Check if already wrapped with a data-template attribute (avoid double-wrapping)
    const before = result.substring(Math.max(0, headingStart - 300), headingStart);
    if (before.includes(`data-template="${section.templateType}"`)) {
      continue;
    }

    // Find the end of this section: next same-level heading or end of content
    const afterHeading = result.substring(headingEnd);
    const nextHeadingRegex = new RegExp(`<${tag}[\\s>]`, "i");
    const nextHeadingMatch = nextHeadingRegex.exec(afterHeading);

    let sectionEnd: number;
    if (nextHeadingMatch) {
      sectionEnd = headingEnd + nextHeadingMatch.index;
    } else {
      sectionEnd = result.length;
    }

    // Check if the section is already wrapped in a background-color div from applyBackgroundColors
    // If so, we need to replace that entire div with our template-styled version
    const beforeSection = result.substring(Math.max(0, headingStart - 200), headingStart);
    const bgDivMatch = beforeSection.match(/<div[^>]*style="[^"]*background-color[^"]*"[^>]*>\s*$/i);

    let actualStart = headingStart;
    let actualEnd = sectionEnd;

    if (bgDivMatch) {
      // The heading is inside a background-color div — find the start of that div
      actualStart = headingStart - bgDivMatch[0].length;
      // Find the closing </div> after the section content
      const afterSection = result.substring(sectionEnd);
      const closingDivMatch = afterSection.match(/^\s*<\/div>/i);
      if (closingDivMatch) {
        actualEnd = sectionEnd + closingDivMatch[0].length;
      }
    }

    // Extract the body content (everything after the heading, excluding the heading itself)
    const bodyContent = result.substring(headingEnd, sectionEnd).trim();

    // Build the template-styled wrapper
    let wrappedSection: string;
    if (section.templateType === "pro-tip") {
      wrappedSection = wrapProTip(bodyContent);
    } else if (section.templateType === "summary") {
      wrappedSection = wrapSummary(bodyContent);
    } else {
      continue;
    }

    // Replace the section in the result
    result = result.substring(0, actualStart) + wrappedSection + result.substring(actualEnd);
  }

  return result;
}
