/**
 * Post-process generated article HTML to wrap sections that have a
 * templateType set (e.g., "pro-tip", "summary", "use-cases") with styled HTML containers.
 *
 * This runs AFTER applyBackgroundColors and adds template-specific styling
 * (icons, borders, etc.) that goes beyond simple background colors.
 *
 * Pro Tip: Green left border, light green background, inline SVG checkmark icon
 * Summary: Gray left border, light gray background, clean box layout
 * Use Cases: Stacked cards with slate left border, light background per card
 *
 * Heading matching uses a 3-pass approach (all done on the ORIGINAL html before any replacements):
 *   Pass 1: Exact heading text match (normalized)
 *   Pass 2: Alias/synonym match (e.g., "Conclusion" → summary)
 *   Pass 3: Positional match (Nth heading in HTML matches Nth section in outline)
 *
 * After matching, replacements are applied in reverse document order so positions don't shift.
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
 * Split Use Cases body content into individual cards.
 * Looks for <p><strong>...</strong></p> patterns and groups each with its following paragraph(s).
 * Returns an array of { title, body } objects, plus any intro text before the first card.
 */
function splitUseCaseCards(bodyContent: string): { intro: string; cards: { title: string; body: string }[] } {
  const strongParagraphRegex = /<p[^>]*>\s*<strong[^>]*>(.*?)<\/strong>\s*<\/p>/gi;
  const matches: { index: number; fullMatch: string; title: string }[] = [];

  let match: RegExpExecArray | null;
  while ((match = strongParagraphRegex.exec(bodyContent)) !== null) {
    matches.push({
      index: match.index,
      fullMatch: match[0],
      title: match[1],
    });
  }

  if (matches.length === 0) {
    return { intro: bodyContent, cards: [] };
  }

  const intro = bodyContent.substring(0, matches[0].index).trim();

  const cards: { title: string; body: string }[] = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const contentStart = current.index + current.fullMatch.length;
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index : bodyContent.length;
    const body = bodyContent.substring(contentStart, contentEnd).trim();
    cards.push({ title: current.title, body });
  }

  return { intro, cards };
}

/**
 * The styled HTML wrapper for a Use Cases section.
 * Splits body content into individual stacked cards with slate left border.
 */
function wrapUseCases(innerContent: string): string {
  const { intro, cards } = splitUseCaseCards(innerContent);

  if (cards.length === 0) {
    return `<div data-template="use-cases">
${intro || innerContent}
</div>`;
  }

  let html = `<div data-template="use-cases">\n`;

  if (intro) {
    html += `${intro}\n`;
  }

  for (const card of cards) {
    html += `<div style="background-color: #F8FAFC; border-left: 4px solid #334155; border-radius: 8px; padding: 16px 20px; margin: 12px 0;">
<p style="margin: 0 0 4px 0;"><strong style="color: #1E293B; font-size: 1.05em;">${card.title}</strong></p>
${card.body}
</div>\n`;
  }

  html += `</div>`;
  return html;
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

/**
 * Known synonyms/alternatives the LLM might use instead of the exact heading.
 */
const HEADING_ALIASES: Record<string, string[]> = {
  "summary": ["summary", "conclusion", "final thoughts", "in summary", "wrapping up", "key takeaways summary", "to sum up", "article summary"],
  "pro-tip": ["pro tip", "expert tip", "quick tip", "insider tip", "bonus tip", "helpful tip"],
  "use-cases": ["use cases", "common scenarios", "who this applies to", "when to use this", "common use cases", "typical scenarios", "who should consider this", "who benefits", "scenarios"],
};

interface TemplateSectionInfo {
  heading: string;
  level: "h2" | "h3";
  templateType: "pro-tip" | "summary" | "use-cases";
  /** The 0-based index of this section among all same-level sections in the outline */
  outlineIndex: number;
}

interface HeadingInfo {
  start: number;
  end: number;
  text: string;
  index: number; // 0-based position among all same-level headings
}

/**
 * A matched replacement to apply: the region to replace and the new content.
 */
interface ReplacementPlan {
  /** Start position in the original HTML */
  actualStart: number;
  /** End position in the original HTML */
  actualEnd: number;
  /** The replacement HTML */
  replacement: string;
}

/**
 * Collect sections that have a templateType set, including their positional index.
 */
function collectTemplateSections(sections: OutlineSection[]): TemplateSectionInfo[] {
  const result: TemplateSectionInfo[] = [];
  let h2Index = 0;

  for (const section of sections) {
    if (section.templateType) {
      result.push({
        heading: section.heading,
        level: section.type === "h3" ? "h3" : "h2",
        templateType: section.templateType,
        outlineIndex: section.type === "h3" ? 0 : h2Index,
      });
    }
    if (section.subSections) {
      let h3Index = 0;
      for (const sub of section.subSections) {
        if (sub.templateType) {
          result.push({
            heading: sub.heading,
            level: "h3",
            templateType: sub.templateType,
            outlineIndex: h3Index,
          });
        }
        h3Index++;
      }
    }
    if (section.type !== "h3") {
      h2Index++;
    }
  }
  return result;
}

/**
 * Check if a heading text matches any known alias for the template type.
 */
function headingMatchesAlias(matchedText: string, templateType: string): boolean {
  const normalizedMatched = normalizeHeading(matchedText);
  const aliases = HEADING_ALIASES[templateType];
  if (aliases) {
    for (const alias of aliases) {
      if (normalizedMatched === alias) return true;
    }
  }
  return false;
}

/**
 * Find all headings of a given level in the HTML, returning their positions, text, and index.
 */
function findAllHeadings(html: string, tag: string): HeadingInfo[] {
  const regex = new RegExp(`(<${tag}[^>]*>)(.*?)(<\\/${tag}>)`, "gi");
  const headings: HeadingInfo[] = [];
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = regex.exec(html)) !== null) {
    headings.push({
      start: match.index,
      end: match.index + match[0].length,
      text: match[2],
      index: idx,
    });
    idx++;
  }
  return headings;
}

/**
 * Apply template-specific styles to article HTML based on outline section data.
 *
 * Phase 1: Match all template sections to headings in the ORIGINAL html (no mutations).
 * Phase 2: Apply all replacements in reverse document order so positions don't shift.
 */
export function applyTemplateStyles(html: string, sections: OutlineSection[]): string {
  const templateSections = collectTemplateSections(sections);
  if (templateSections.length === 0) return html;

  // ===== PHASE 1: Match all template sections to headings =====

  // Pre-compute all headings by level from the original HTML
  const headingsByLevel: Record<string, HeadingInfo[]> = {};
  for (const section of templateSections) {
    if (!headingsByLevel[section.level]) {
      headingsByLevel[section.level] = findAllHeadings(html, section.level);
    }
  }

  // Track which heading indices have been claimed (to avoid double-matching)
  const claimedIndices: Record<string, Set<number>> = {};

  // Collect all planned replacements
  const replacements: ReplacementPlan[] = [];

  for (const section of templateSections) {
    const tag = section.level;
    const allHeadings = headingsByLevel[tag] || [];
    if (!claimedIndices[tag]) claimedIndices[tag] = new Set<number>();
    const claimed = claimedIndices[tag];

    let matchedHeading: HeadingInfo | null = null;

    // Pass 1: exact match
    const normalizedTarget = normalizeHeading(section.heading);
    for (const h of allHeadings) {
      if (claimed.has(h.index)) continue;
      if (normalizeHeading(h.text) === normalizedTarget) {
        matchedHeading = h;
        break;
      }
    }

    // Pass 2: alias fallback
    if (!matchedHeading) {
      for (const h of allHeadings) {
        if (claimed.has(h.index)) continue;
        if (headingMatchesAlias(h.text, section.templateType)) {
          matchedHeading = h;
          break;
        }
      }
    }

    // Pass 3: positional fallback
    if (!matchedHeading) {
      const targetIndex = section.outlineIndex;
      if (targetIndex < allHeadings.length) {
        const target = allHeadings[targetIndex];
        if (target && !claimed.has(target.index)) {
          matchedHeading = target;
        }
      }
    }

    if (!matchedHeading) continue;

    // Claim this heading
    claimed.add(matchedHeading.index);

    const headingStart = matchedHeading.start;
    const headingEnd = matchedHeading.end;

    // Check if already wrapped with a data-template attribute (avoid double-wrapping)
    const before = html.substring(Math.max(0, headingStart - 300), headingStart);
    if (before.includes(`data-template="${section.templateType}"`)) {
      continue;
    }

    // Find the end of this section: next same-level heading or end of content
    const afterHeading = html.substring(headingEnd);
    const nextHeadingRegex = new RegExp(`<${tag}[\\s>]`, "i");
    const nextHeadingMatch = nextHeadingRegex.exec(afterHeading);

    let sectionEnd: number;
    if (nextHeadingMatch) {
      sectionEnd = headingEnd + nextHeadingMatch.index;
    } else {
      sectionEnd = html.length;
    }

    // Check if the section is already wrapped in a background-color div from applyBackgroundColors
    const beforeSection = html.substring(Math.max(0, headingStart - 200), headingStart);
    const bgDivMatch = beforeSection.match(/<div[^>]*style="[^"]*background-color[^"]*"[^>]*>\s*$/i);

    let actualStart = headingStart;
    let actualEnd = sectionEnd;

    if (bgDivMatch) {
      actualStart = headingStart - bgDivMatch[0].length;
      const afterSection = html.substring(sectionEnd);
      const closingDivMatch = afterSection.match(/^\s*<\/div>/i);
      if (closingDivMatch) {
        actualEnd = sectionEnd + closingDivMatch[0].length;
      }
    }

    // Extract the body content (everything after the heading, excluding the heading itself)
    const bodyContent = html.substring(headingEnd, sectionEnd).trim();

    // Build the template-styled wrapper
    let wrappedSection: string;
    if (section.templateType === "pro-tip") {
      wrappedSection = wrapProTip(bodyContent);
    } else if (section.templateType === "summary") {
      wrappedSection = wrapSummary(bodyContent);
    } else if (section.templateType === "use-cases") {
      wrappedSection = wrapUseCases(bodyContent);
    } else {
      continue;
    }

    replacements.push({
      actualStart,
      actualEnd,
      replacement: wrappedSection,
    });
  }

  // ===== PHASE 2: Apply replacements in reverse document order =====
  // Sort by actualStart descending so later replacements don't shift earlier positions
  replacements.sort((a, b) => b.actualStart - a.actualStart);

  let result = html;
  for (const r of replacements) {
    result = result.substring(0, r.actualStart) + r.replacement + result.substring(r.actualEnd);
  }

  return result;
}
