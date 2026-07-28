/**
 * AI Readiness Audit — Deterministic Analyzers
 * Three pure TypeScript functions that analyze raw HTML for AI readiness.
 */

// ============================================================
// Types
// ============================================================

export interface SchemaDetail {
  type: string;
  present: boolean;
  note: string;
}

export interface SchemaResult {
  score: number;
  typesFound: string[];
  typesMissing: string[];
  details: SchemaDetail[];
  rawSchemaCount: number;
  hasMicrodata: boolean;
  hasRdfa: boolean;
  suggestions: string[];
}

export interface ContentStructureRaw {
  headingHierarchy: { level: number; text: string }[];
  hasProperH1: boolean;
  h2Count: number;
  h3Count: number;
  totalHeadings: number;
  semanticElements: {
    lists: number;
    tables: number;
    definitions: number;
    blockquotes: number;
    figures: number;
  };
  paragraphCount: number;
  avgParagraphLength: number;
  estimatedWordCount: number;
  contentExtractionMethod: string;
}

export interface LinkAnchor {
  text: string;
  href: string;
  isGeneric: boolean;
}

export interface InternalLinksResult {
  score: number;
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  genericAnchors: number;
  descriptiveAnchors: number;
  uniqueInternalTargets: number;
  linkDensity: number;
  anchors: LinkAnchor[];
  suggestions: string[];
}

// ============================================================
// Constants
// ============================================================

const EXPECTED_SCHEMA_TYPES: { type: string; description: string }[] = [
  { type: "Organization", description: "Defines the brand entity and builds trust signals for AI citation" },
  { type: "WebSite", description: "Establishes site identity and enables sitelinks search" },
  { type: "WebPage", description: "Labels the page type so AI can categorize it correctly" },
  { type: "Article", description: "Marks editorial content for AI extraction and attribution" },
  { type: "BlogPosting", description: "Variant of Article for blog content" },
  { type: "FAQPage", description: "Structures Q&A content for direct AI answers" },
  { type: "BreadcrumbList", description: "Helps AI understand site hierarchy and navigation paths" },
  { type: "Person", description: "Attributes authorship with credentials for E-E-A-T signals" },
  { type: "HowTo", description: "Structures step-by-step content for AI-powered answers" },
  { type: "Product", description: "Defines product entities with pricing, reviews, availability" },
  { type: "LocalBusiness", description: "Establishes local entity presence for geo-specific AI queries" },
];

const CORE_BUCKETS: Record<string, string[]> = {
  org: ["Organization"],
  site: ["WebSite"],
  page: ["WebPage"],
  article: ["Article", "BlogPosting", "NewsArticle", "TechnicalArticle"],
  person: ["Person"],
};

const GENERIC_ANCHOR_PHRASES = new Set([
  "click here", "read more", "learn more", "here", "link", "this", "more",
  "see more", "view more", "details", "click", "go", "source",
  "continue reading", "find out more", "check it out",
]);

// ============================================================
// Helper: isolate main content
// ============================================================

function isolateMainContent(html: string): { content: string; method: string } {
  // Strip script, style, nav, footer, header, aside
  const stripTags = (h: string) =>
    h.replace(/<(script|style|nav|footer|header|aside)[^>]*>[\s\S]*?<\/\1>/gi, "");

  // Try <article> first
  const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch && articleMatch[1].length > 200) {
    return { content: stripTags(articleMatch[1]), method: "article-tag" };
  }

  // Try <main>
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch && mainMatch[1].length > 200) {
    return { content: stripTags(mainMatch[1]), method: "main-tag" };
  }

  // Fallback to <body>
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : html;
  return { content: stripTags(bodyContent), method: "body-fallback" };
}

function stripHtmlTags(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

// ============================================================
// 1. analyzeSchema — Deterministic, no LLM
// ============================================================

export function analyzeSchema(html: string): SchemaResult {
  const foundTypes = new Set<string>();

  // 1. JSON-LD detection
  const jsonLdRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let jsonLdMatch;
  let rawSchemaCount = 0;

  while ((jsonLdMatch = jsonLdRegex.exec(html)) !== null) {
    rawSchemaCount++;
    try {
      const parsed = JSON.parse(jsonLdMatch[1]);
      extractTypes(parsed, foundTypes);
    } catch {
      // Malformed JSON — skip silently
    }
  }

  // 2. Microdata detection
  const hasMicrodata = /itemscope|itemtype|itemprop/i.test(html);
  if (hasMicrodata) {
    const microdataRegex = /itemtype=["']https?:\/\/schema\.org\/(\w+)["']/gi;
    let mdMatch;
    while ((mdMatch = microdataRegex.exec(html)) !== null) {
      foundTypes.add(mdMatch[1]);
    }
  }

  // 3. RDFa detection
  const hasRdfa =
    /typeof=["'][^"']*schema\.org/i.test(html) ||
    /vocab=["']https?:\/\/schema\.org/i.test(html);

  // Build details
  const typesFoundArr = Array.from(foundTypes);
  const details: SchemaDetail[] = EXPECTED_SCHEMA_TYPES.map((t) => ({
    type: t.type,
    present: foundTypes.has(t.type),
    note: foundTypes.has(t.type) ? "Found on page" : t.description,
  }));

  const typesMissing = EXPECTED_SCHEMA_TYPES
    .filter((t) => !foundTypes.has(t.type))
    .map((t) => t.type);

  // Scoring
  let score = 0;
  const hasAnyStructuredData = rawSchemaCount > 0 || hasMicrodata || hasRdfa;

  if (hasAnyStructuredData) {
    score = 15; // base

    // Core buckets (5 buckets, +12 each, max 60)
    let coreBucketCount = 0;
    for (const bucketTypes of Object.values(CORE_BUCKETS)) {
      if (bucketTypes.some((t) => foundTypes.has(t))) {
        coreBucketCount++;
      }
    }
    score += coreBucketCount * 12;

    // Bonus: non-core types, +5 each, capped at 25
    const coreTypeSet = new Set(Object.values(CORE_BUCKETS).flat());
    const bonusTypes = typesFoundArr.filter((t) => !coreTypeSet.has(t));
    score += Math.min(bonusTypes.length * 5, 25);

    score = Math.min(score, 100);
  }

  // Suggestions
  const suggestions: string[] = [];
  if (!hasAnyStructuredData) {
    suggestions.push("Add JSON-LD structured data to help AI systems understand your content type and context.");
  }
  if (!foundTypes.has("Organization")) {
    suggestions.push("Add Organization schema to establish your brand entity for AI citation trust.");
  }
  if (!foundTypes.has("Article") && !foundTypes.has("BlogPosting")) {
    suggestions.push("Add Article or BlogPosting schema to mark your content for AI extraction and attribution.");
  }
  if (!foundTypes.has("Person")) {
    suggestions.push("Add Person schema to attribute authorship with credentials for E-E-A-T signals.");
  }
  if (!foundTypes.has("FAQPage")) {
    suggestions.push("Add FAQPage schema to structure Q&A content for direct AI answers.");
  }
  if (!foundTypes.has("BreadcrumbList")) {
    suggestions.push("Add BreadcrumbList schema to help AI understand your site hierarchy.");
  }

  return {
    score,
    typesFound: typesFoundArr,
    typesMissing,
    details,
    rawSchemaCount,
    hasMicrodata,
    hasRdfa,
    suggestions,
  };
}

function extractTypes(obj: any, types: Set<string>): void {
  if (!obj || typeof obj !== "object") return;

  if (Array.isArray(obj)) {
    obj.forEach((item) => extractTypes(item, types));
    return;
  }

  // Extract @type
  if (obj["@type"]) {
    const typeVal = obj["@type"];
    if (Array.isArray(typeVal)) {
      typeVal.forEach((t: string) => types.add(t));
    } else if (typeof typeVal === "string") {
      types.add(typeVal);
    }
  }

  // Walk @graph
  if (obj["@graph"] && Array.isArray(obj["@graph"])) {
    obj["@graph"].forEach((item: any) => extractTypes(item, types));
  }
}

// ============================================================
// 2. analyzeContentStructureRaw — Deterministic, no LLM
// ============================================================

export function analyzeContentStructureRaw(html: string): ContentStructureRaw {
  const { content, method } = isolateMainContent(html);

  // Heading hierarchy
  const headingRegex = /<h([1-6])[^>]*>(.*?)<\/h\1>/gi;
  const headingHierarchy: { level: number; text: string }[] = [];
  let headingMatch;
  while ((headingMatch = headingRegex.exec(content)) !== null) {
    const text = headingMatch[2].replace(/<[^>]+>/g, "").trim();
    if (text) {
      headingHierarchy.push({ level: parseInt(headingMatch[1]), text });
    }
  }

  const hasProperH1 = headingHierarchy.some((h) => h.level === 1);
  const h2Count = headingHierarchy.filter((h) => h.level === 2).length;
  const h3Count = headingHierarchy.filter((h) => h.level === 3).length;
  const totalHeadings = headingHierarchy.length;

  // Semantic elements
  const lists = (content.match(/<(ul|ol)[^>]*>/gi) || []).length;
  const tables = (content.match(/<table[^>]*>/gi) || []).length;
  const definitions = (content.match(/<(dl|details)[^>]*>/gi) || []).length;
  const blockquotes = (content.match(/<blockquote[^>]*>/gi) || []).length;
  const figures = (content.match(/<figure[^>]*>/gi) || []).length;

  // Paragraph stats
  const paragraphRegex = /<p[^>]*>([\s\S]*?)<\/p>/gi;
  const paragraphs: string[] = [];
  let pMatch;
  while ((pMatch = paragraphRegex.exec(content)) !== null) {
    const text = stripHtmlTags(pMatch[1]);
    if (text.length > 10) {
      paragraphs.push(text);
    }
  }
  const paragraphCount = paragraphs.length;
  const avgParagraphLength =
    paragraphCount > 0
      ? Math.round(paragraphs.reduce((sum, p) => sum + p.split(/\s+/).length, 0) / paragraphCount)
      : 0;

  // Word count
  const cleanedText = stripHtmlTags(content);
  const estimatedWordCount = cleanedText.split(/\s+/).filter(Boolean).length;

  return {
    headingHierarchy,
    hasProperH1,
    h2Count,
    h3Count,
    totalHeadings,
    semanticElements: { lists, tables, definitions, blockquotes, figures },
    paragraphCount,
    avgParagraphLength,
    estimatedWordCount,
    contentExtractionMethod: method,
  };
}

// ============================================================
// 3. analyzeInternalLinks — Deterministic, no LLM
// ============================================================

export function analyzeInternalLinks(html: string, pageUrl: string): InternalLinksResult {
  const { content, method } = isolateMainContent(html);

  let pageHost: string;
  try {
    pageHost = new URL(pageUrl).hostname;
  } catch {
    pageHost = "";
  }

  // Extract anchors
  const anchorRegex = /<a\s[^>]*href=["']([^"'#]*?)["'][^>]*>(.*?)<\/a>/gi;
  const allAnchors: { href: string; text: string }[] = [];
  let aMatch;
  while ((aMatch = anchorRegex.exec(content)) !== null) {
    const href = aMatch[1].trim();
    const text = stripHtmlTags(aMatch[2]).trim();
    if (!href || !text) continue;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) continue;
    allAnchors.push({ href, text });
  }

  // Classify internal vs external
  const internalAnchors: LinkAnchor[] = [];
  const externalAnchors: LinkAnchor[] = [];

  for (const anchor of allAnchors) {
    const isGeneric = GENERIC_ANCHOR_PHRASES.has(anchor.text.toLowerCase().trim());
    const linkAnchor: LinkAnchor = { text: anchor.text, href: anchor.href, isGeneric };

    if (anchor.href.startsWith("/")) {
      internalAnchors.push(linkAnchor);
    } else {
      try {
        const linkHost = new URL(anchor.href).hostname;
        if (linkHost === pageHost || linkHost.endsWith("." + pageHost)) {
          internalAnchors.push(linkAnchor);
        } else {
          externalAnchors.push(linkAnchor);
        }
      } catch {
        // Parse failure — treat as internal if starts with / or has no ://
        if (anchor.href.startsWith("/") || !anchor.href.includes("://")) {
          internalAnchors.push(linkAnchor);
        } else {
          externalAnchors.push(linkAnchor);
        }
      }
    }
  }

  const internalCount = internalAnchors.length;
  const externalCount = externalAnchors.length;
  const genericAnchors = internalAnchors.filter((a) => a.isGeneric).length;
  const descriptiveAnchors = internalCount - genericAnchors;
  const uniqueInternalTargets = new Set(internalAnchors.map((a) => a.href)).size;

  // Word count for density
  const cleanedText = stripHtmlTags(content);
  const wordCount = cleanedText.split(/\s+/).filter(Boolean).length;
  const linkDensity = wordCount > 0 ? Math.round((internalCount / wordCount) * 1000 * 10) / 10 : 0;

  // Scoring
  let score = 0;
  if (internalCount === 0) {
    score = 0;
  } else {
    score = 10; // base
    score += Math.min(internalCount * 3, 30); // volume
    score += Math.round((descriptiveAnchors / internalCount) * 30); // anchor quality
    score += Math.min(uniqueInternalTargets * 4, 20); // target diversity
    if (linkDensity >= 2 && linkDensity <= 8) {
      score += 10; // density sweet spot
    } else if (linkDensity > 0) {
      score += 5;
    }
    score = Math.min(score, 100);
  }

  // Suggestions
  const suggestions: string[] = [];
  if (internalCount === 0) {
    suggestions.push("Add internal links to help AI systems discover related content on your site.");
  } else if (internalCount < 3) {
    suggestions.push("Add more internal links (aim for at least 5) to strengthen site connectivity for AI crawlers.");
  }
  if (genericAnchors > 0) {
    suggestions.push(`Replace ${genericAnchors} generic anchor text${genericAnchors > 1 ? "s" : ""} ("click here", "read more") with descriptive text that tells AI what the linked page is about.`);
  }
  if (externalCount === 0) {
    suggestions.push("Add external links to authoritative sources to build trust signals for AI citation.");
  }
  if (linkDensity > 15) {
    suggestions.push("Link density is very high (>15 per 1000 words). Consider reducing to avoid appearing spammy to AI systems.");
  }
  if (uniqueInternalTargets > 0 && internalCount / uniqueInternalTargets > 3) {
    suggestions.push("Many links point to the same targets. Diversify internal link destinations to help AI map more of your site.");
  }

  return {
    score,
    totalLinks: internalCount + externalCount,
    internalLinks: internalCount,
    externalLinks: externalCount,
    genericAnchors,
    descriptiveAnchors,
    uniqueInternalTargets,
    linkDensity,
    anchors: [...internalAnchors, ...externalAnchors].slice(0, 30),
    suggestions,
  };
}

// ============================================================
// Helper: prepare content for LLM (strip tags, truncate)
// ============================================================

export function prepareContentForLLM(html: string, maxChars: number = 15000): string {
  // Strip script/style/nav/footer/aside from full HTML
  let cleaned = html
    .replace(/<(script|style|nav|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length > maxChars) {
    cleaned = cleaned.slice(0, maxChars) + "\n[...truncated]";
  }
  return cleaned;
}

export function prepareHtmlForLLM(html: string, maxChars: number = 15000): string {
  // Strip script/style/nav/footer/aside but keep HTML structure
  let cleaned = html.replace(/<(script|style|nav|footer|aside)[^>]*>[\s\S]*?<\/\1>/gi, "");
  if (cleaned.length > maxChars) {
    cleaned = cleaned.slice(0, maxChars) + "\n[...truncated]";
  }
  return cleaned;
}

// ============================================================
// Helper: strip markdown fences from LLM response
// ============================================================

export function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

// ============================================================
// Helper: extract page title
// ============================================================

export function extractPageTitle(html: string): string {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return titleMatch ? stripHtmlTags(titleMatch[1]).trim() : "Untitled Page";
}
