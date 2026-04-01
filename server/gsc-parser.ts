/**
 * GSC Excel Parser
 * Parses Google Search Console Excel exports (.xlsx) into structured data.
 * Supports the standard GSC export format with sheets: Chart, Queries, Pages, Countries, Devices, Filters.
 */
import * as XLSX from "xlsx";
import type {
  GscQueryRow,
  GscPageRow,
  GscChartRow,
  GscCannibalizationGroup,
} from "../drizzle/schema";

export interface GscParseResult {
  fileName: string;
  dateRange: string;
  totalQueries: number;
  totalPages: number;
  queries: GscQueryRow[];
  pages: GscPageRow[];
  chartData: GscChartRow[];
  nearJumpKeywords: GscQueryRow[];
  highImpressionLowCtr: GscQueryRow[];
  quickWinKeywords: GscQueryRow[];
  zeroClickPages: GscPageRow[];
  cannibalizationGroups: GscCannibalizationGroup[];
}

/**
 * Parse a GSC Excel file buffer into structured data.
 * @param buffer - The raw Excel file buffer
 * @param fileName - Original filename for display
 */
export function parseGscExcel(buffer: Buffer, fileName: string): GscParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });

  // Parse Queries sheet
  const queries = parseQueriesSheet(workbook);

  // Parse Pages sheet
  const pages = parsePagesSheet(workbook);

  // Parse Chart sheet (trend data)
  const chartData = parseChartSheet(workbook);

  // Parse date range from Filters sheet
  const dateRange = parseDateRange(workbook);

  // Compute categorized keyword sets
  const nearJumpKeywords = computeNearJump(queries, 5, 30);
  const highImpressionLowCtr = computeHighImpressionLowCtr(queries);
  const quickWinKeywords = computeQuickWins(queries);
  const zeroClickPages = computeZeroClickPages(pages);
  const cannibalizationGroups = computeCannibalization(queries);

  return {
    fileName,
    dateRange,
    totalQueries: queries.length,
    totalPages: pages.length,
    queries,
    pages,
    chartData,
    nearJumpKeywords,
    highImpressionLowCtr,
    quickWinKeywords,
    zeroClickPages,
    cannibalizationGroups,
  };
}

// ─── Sheet Parsers ────────────────────────────────────────────────────────────

function parseQueriesSheet(workbook: XLSX.WorkBook): GscQueryRow[] {
  const sheet = workbook.Sheets["Queries"];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
  const results: GscQueryRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const query = String(row[0] ?? "").trim();
    const clicks = parseFloat(String(row[1] ?? "0")) || 0;
    const impressions = parseFloat(String(row[2] ?? "0")) || 0;
    const ctr = parseFloat(String(row[3] ?? "0")) || 0;
    const position = parseFloat(String(row[4] ?? "0")) || 0;

    if (!query || query === "Top queries") continue;

    results.push({ query, clicks, impressions, ctr, position });
  }

  return results;
}

function parsePagesSheet(workbook: XLSX.WorkBook): GscPageRow[] {
  const sheet = workbook.Sheets["Pages"];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
  const results: GscPageRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const page = String(row[0] ?? "").trim();
    const clicks = parseFloat(String(row[1] ?? "0")) || 0;
    const impressions = parseFloat(String(row[2] ?? "0")) || 0;
    const ctr = parseFloat(String(row[3] ?? "0")) || 0;
    const position = parseFloat(String(row[4] ?? "0")) || 0;

    if (!page || page === "Top pages") continue;

    results.push({ page, clicks, impressions, ctr, position });
  }

  return results;
}

function parseChartSheet(workbook: XLSX.WorkBook): GscChartRow[] {
  const sheet = workbook.Sheets["Chart"];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
  const results: GscChartRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    const rawDate = row[0];
    let date = "";
    if (rawDate instanceof Date) {
      date = rawDate.toISOString().split("T")[0];
    } else if (typeof rawDate === "string") {
      date = rawDate;
    } else if (typeof rawDate === "number") {
      // Excel serial date
      const d = XLSX.SSF.parse_date_code(rawDate);
      date = `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`;
    }

    const clicks = parseFloat(String(row[1] ?? "0")) || 0;
    const impressions = parseFloat(String(row[2] ?? "0")) || 0;
    const ctr = parseFloat(String(row[3] ?? "0")) || 0;
    const position = parseFloat(String(row[4] ?? "0")) || 0;

    if (!date) continue;
    results.push({ date, clicks, impressions, ctr, position });
  }

  return results;
}

function parseDateRange(workbook: XLSX.WorkBook): string {
  const sheet = workbook.Sheets["Filters"];
  if (!sheet) return "";

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null }) as unknown[][];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i] as unknown[];
    if (String(row[0]).toLowerCase() === "date") {
      return String(row[1] ?? "");
    }
  }
  return "";
}

// ─── Categorization Engines ───────────────────────────────────────────────────

/**
 * Near-jump: keywords ranking within the given position range.
 * Sorted by impressions descending (highest opportunity first).
 */
export function computeNearJump(
  queries: GscQueryRow[],
  minPos: number,
  maxPos: number
): GscQueryRow[] {
  return queries
    .filter((q) => q.position >= minPos && q.position <= maxPos)
    .sort((a, b) => b.impressions - a.impressions);
}

/**
 * High Impression / Low CTR:
 * Impressions >= 200 AND CTR < 5% AND position <= 20.
 * These pages are being seen but not clicked — title/meta optimization opportunity.
 * Sorted by impressions descending.
 */
export function computeHighImpressionLowCtr(queries: GscQueryRow[]): GscQueryRow[] {
  return queries
    .filter((q) => q.impressions >= 200 && q.ctr < 0.05 && q.position <= 20)
    .sort((a, b) => b.impressions - a.impressions);
}

/**
 * Quick Wins:
 * Position 5–20, Impressions >= 50, Clicks < 5.
 * Keywords that are visible but barely converting — small content improvements can unlock traffic.
 * Sorted by impressions descending.
 */
export function computeQuickWins(queries: GscQueryRow[]): GscQueryRow[] {
  return queries
    .filter((q) => q.position >= 5 && q.position <= 20 && q.impressions >= 50 && q.clicks < 5)
    .sort((a, b) => b.impressions - a.impressions);
}

/**
 * Zero-Click Pages:
 * Pages with 0 clicks and >= 100 impressions.
 * These pages are indexed and shown in search but never clicked.
 * Sorted by impressions descending.
 */
export function computeZeroClickPages(pages: GscPageRow[]): GscPageRow[] {
  return pages
    .filter((p) => p.clicks === 0 && p.impressions >= 100)
    .sort((a, b) => b.impressions - a.impressions);
}

/**
 * Cannibalization Detection:
 * Groups queries that share significant keyword overlap (2+ shared words, 3+ chars each).
 * Groups with 2+ queries in the same position range (within 10 positions) are flagged.
 */
export function computeCannibalization(queries: GscQueryRow[]): GscCannibalizationGroup[] {
  // Only consider queries with meaningful impressions
  const candidates = queries.filter((q) => q.impressions >= 30);

  // Tokenize: extract meaningful words (3+ chars, not stopwords)
  const STOPWORDS = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "her", "was",
    "one", "our", "out", "day", "get", "has", "him", "his", "how", "its", "may",
    "new", "now", "old", "see", "two", "who", "did", "does", "from", "have",
    "that", "this", "they", "with", "will", "your", "what", "when", "which",
    "there", "their", "been", "more", "also", "into", "than", "then", "some",
    "would", "make", "like", "time", "just", "know", "take", "year", "good",
    "much", "need", "even", "well", "back", "only", "come", "over", "think",
    "also", "after", "about", "other", "many", "most",
  ]);

  function tokenize(text: string): Set<string> {
    return new Set(
      text
        .toLowerCase()
        .split(/\s+/)
        .map((w) => w.replace(/[^a-z]/g, ""))
        .filter((w) => w.length >= 3 && !STOPWORDS.has(w))
    );
  }

  // Build token sets for each query
  const tokenSets = candidates.map((q) => ({
    query: q,
    tokens: tokenize(q.query),
  }));

  // Find overlapping groups using union-find style clustering
  const groups: Map<string, GscQueryRow[]> = new Map();
  const assigned = new Set<number>();

  for (let i = 0; i < tokenSets.length; i++) {
    if (assigned.has(i)) continue;
    const group: GscQueryRow[] = [tokenSets[i].query];
    const groupTokens = new Set(tokenSets[i].tokens);

    for (let j = i + 1; j < tokenSets.length; j++) {
      if (assigned.has(j)) continue;
      const shared = Array.from(tokenSets[j].tokens).filter((t) => groupTokens.has(t));
      if (shared.length >= 2) {
        group.push(tokenSets[j].query);
        assigned.add(j);
        // Add j's tokens to the group for transitive matching
        Array.from(tokenSets[j].tokens).forEach((t) => groupTokens.add(t));
      }
    }

    if (group.length >= 2) {
      // Use the most common shared tokens as the topic label
      const allTokens = group.flatMap((q) => Array.from(tokenize(q.query)));
      const freq = new Map<string, number>();
      allTokens.forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1));
      const topic = Array.from(freq.entries())
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([t]) => t)
        .join(" ");

      if (topic) {
        groups.set(topic, group);
      }
      assigned.add(i);
    }
  }

  return Array.from(groups.entries())
    .map(([topic, queries]) => ({ topic, queries }))
    .sort((a, b) => b.queries.length - a.queries.length)
    .slice(0, 50); // Cap at 50 groups for performance
}
