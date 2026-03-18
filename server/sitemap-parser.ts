/**
 * Sitemap Parser Utility
 * Fetches and parses XML sitemaps to extract URLs for internal linking
 */

export interface SitemapUrl {
  url: string;
  title?: string;
  lastmod?: string;
}

/**
 * Fetches and parses a sitemap XML file
 * @param sitemapUrl - URL of the sitemap (e.g., https://example.com/sitemap.xml)
 * @returns Array of sitemap URLs with metadata
 */
export async function parseSitemap(sitemapUrl: string): Promise<SitemapUrl[]> {
  try {
    const response = await fetch(sitemapUrl, {
      headers: {
        "User-Agent": "RankPilot-Bot/1.0",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sitemap: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const urls: SitemapUrl[] = [];

    // Match <url> blocks in the sitemap
    const urlRegex = /<url>([\s\S]*?)<\/url>/g;
    let match: RegExpExecArray | null;

    while ((match = urlRegex.exec(xmlText)) !== null) {
      const urlBlock = match[1];

      // Extract loc (URL)
      const locMatch = urlBlock.match(/<loc>(.*?)<\/loc>/);
      const url = locMatch ? locMatch[1].trim() : null;

      if (!url) continue;

      // Extract lastmod (optional)
      const lastmodMatch = urlBlock.match(/<lastmod>(.*?)<\/lastmod>/);
      const lastmod = lastmodMatch ? lastmodMatch[1].trim() : undefined;

      // Try to extract title from the URL path (last segment)
      try {
        const urlPath = new URL(url).pathname;
        const pathSegments = urlPath.split("/").filter(Boolean);
        const lastSegment = pathSegments[pathSegments.length - 1] || "";

        // Convert URL slug to readable title
        const title = lastSegment
          .replace(/\.(html|htm|php|asp|aspx)$/i, "")
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

        urls.push({
          url,
          title: title || url,
          lastmod,
        });
      } catch {
        urls.push({ url, title: url, lastmod });
      }
    }

    return urls;
  } catch (error) {
    console.error("Error parsing sitemap:", error);
    return [];
  }
}

/**
 * Formats sitemap URLs into a string for the AI prompt
 */
export function formatSitemapForAI(urls: SitemapUrl[]): string {
  if (urls.length === 0) return "";
  return urls.map((item, index) => `${index + 1}. ${item.title} - ${item.url}`).join("\n");
}

/**
 * Filters sitemap URLs to find the most relevant ones based on keywords
 */
export function findRelevantUrls(
  urls: SitemapUrl[],
  keywords: string[],
  maxResults: number = 10
): SitemapUrl[] {
  if (urls.length === 0 || keywords.length === 0) {
    return urls.slice(0, maxResults);
  }

  const scoredUrls = urls.map((item) => {
    let score = 0;
    const searchText = `${item.title} ${item.url}`.toLowerCase();

    keywords.forEach((keyword) => {
      const lowerKeyword = keyword.toLowerCase();
      if (searchText.includes(lowerKeyword)) {
        score += 10;
      }
      const words = lowerKeyword.split(" ");
      words.forEach((word) => {
        if (word.length > 3 && searchText.includes(word)) {
          score += 1;
        }
      });
    });

    return { ...item, score };
  });

  return scoredUrls
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(({ score, ...item }) => item);
}
