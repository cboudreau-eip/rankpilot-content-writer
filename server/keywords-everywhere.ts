/**
 * Keywords Everywhere API helper module.
 * Wraps the REST API for keyword research, related keywords, and credit balance.
 * Docs: https://api.keywordseverywhere.com/docs/
 */

const KE_BASE_URL = "https://api.keywordseverywhere.com/v1";

// ---- Types ----

export interface KETrendPoint {
  month: string;
  year: number;
  value: number;
}

export interface KEKeywordData {
  keyword: string;
  vol: number;
  cpc: { currency: string; value: string };
  competition: number;
  trend: KETrendPoint[];
}

export interface KEKeywordDataResponse {
  data: KEKeywordData[];
  credits: number;
  credits_consumed: number;
  time: number;
}

export interface KERelatedKeywordsResponse {
  data: string[];
  credits_consumed: number;
  time_taken: number;
}

export interface KECreditBalanceResponse {
  credits: number;
}

// ---- Helpers ----

async function keRequest<T>(
  apiKey: string,
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const url = `${KE_BASE_URL}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };

  const init: RequestInit = { method, headers };

  if (body && method === "POST") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      throw new Error("Keywords Everywhere API: Invalid or missing API key");
    }
    if (res.status === 402) {
      throw new Error("Keywords Everywhere API: Insufficient credits or invalid subscription");
    }
    throw new Error(`Keywords Everywhere API error ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ---- Public API ----

/**
 * Get keyword metrics (volume, CPC, competition, 12-month trend) for a list of keywords.
 * Up to 100 keywords per request. Costs 1 credit per keyword.
 */
export async function getKeywordData(
  apiKey: string,
  keywords: string[],
  options?: {
    country?: string;
    currency?: string;
    dataSource?: "gkp" | "cli";
  },
): Promise<KEKeywordDataResponse> {
  return keRequest<KEKeywordDataResponse>(apiKey, "POST", "/get_keyword_data", {
    kw: keywords,
    country: options?.country ?? "us",
    currency: options?.currency ?? "usd",
    dataSource: options?.dataSource ?? "cli",
  });
}

/**
 * Get related keywords for a seed keyword.
 * Returns only keyword strings (no metrics). Costs 2 credits per result.
 */
export async function getRelatedKeywords(
  apiKey: string,
  keyword: string,
  num: number = 10,
): Promise<KERelatedKeywordsResponse> {
  return keRequest<KERelatedKeywordsResponse>(apiKey, "POST", "/get_related_keywords", {
    keyword,
    num,
  });
}

/**
 * Get "People Also Search For" keywords for a seed keyword.
 * Returns only keyword strings (no metrics). Costs 2 credits per result.
 */
export async function getPasfKeywords(
  apiKey: string,
  keyword: string,
  num: number = 10,
): Promise<KERelatedKeywordsResponse> {
  return keRequest<KERelatedKeywordsResponse>(apiKey, "POST", "/get_pasf_keywords", {
    keyword,
    num,
  });
}

/**
 * Get the current credit balance for the API key.
 * No credits consumed.
 */
export async function getCreditBalance(
  apiKey: string,
): Promise<number> {
  // The API returns an array with the credit balance as the only element
  const res = await keRequest<number[]>(apiKey, "GET", "/account/credits");
  return Array.isArray(res) ? res[0] ?? 0 : 0;
}
