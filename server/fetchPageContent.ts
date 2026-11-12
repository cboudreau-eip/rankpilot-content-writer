import dns from "node:dns/promises";
import net from "node:net";

/**
 * Fetches a live public web page and extracts its readable article text, for the
 * standalone Content Grader. Guards against SSRF: only http(s), only public IPs
 * (checked after DNS resolution and on every redirect hop), bounded size and time.
 */

const MAX_BYTES = 3_000_000;
const MAX_REDIRECTS = 5;
const TIMEOUT_MS = 15_000;

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isPrivateIP(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb");
}

async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("That URL points to a private address");
  }
  const addrs = net.isIP(host)
    ? [{ address: host }]
    : await dns.lookup(host, { all: true }).catch(() => {
        throw new Error("Couldn't resolve that domain");
      });
  if (addrs.length === 0 || addrs.some((a) => isPrivateIP(a.address))) {
    throw new Error("That URL points to a private address");
  }
  return url;
}

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ndash: "–", mdash: "—", hellip: "…", lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
};

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Pick the most article-like region of the page. */
function pickMainRegion(html: string): string {
  const articles = html.match(/<article[\s\S]*?<\/article>/gi);
  if (articles) {
    const biggest = articles.sort((a, b) => b.length - a.length)[0];
    if (biggest.length > 500) return biggest;
  }
  const main = html.match(/<main[\s\S]*?<\/main>/i);
  if (main && main[0].length > 500) return main[0];
  const body = html.match(/<body[\s\S]*<\/body>/i);
  return body ? body[0] : html;
}

export function htmlToReadableText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const strip = (s: string) => decodeEntities(s.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
  const title = strip(h1Match?.[1] || titleMatch?.[1] || "");

  let region = pickMainRegion(html)
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|template|svg|iframe|form|nav|footer|aside|header|button)\b[\s\S]*?<\/\1>/gi, "");

  region = region
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, _l, inner) => `\n\n${strip(inner)}\n\n`)
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner) => `\n- ${strip(inner)}`)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|ul|ol|table|tr|blockquote|figure|figcaption|dd|dt)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");

  const text = decodeEntities(region)
    .split("\n")
    .map((l) => l.replace(/[ \t ]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, text };
}

export async function fetchPageContent(rawUrl: string): Promise<{ url: string; title: string; text: string }> {
  let url = await assertPublicUrl(rawUrl.trim());

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const resp = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; RankPilot/1.0; +https://rankpilot.app)",
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });

    if (resp.status >= 300 && resp.status < 400 && resp.headers.get("location")) {
      url = await assertPublicUrl(new URL(resp.headers.get("location")!, url).toString());
      continue;
    }
    if (!resp.ok) {
      throw new Error(`The page returned HTTP ${resp.status}${resp.status === 403 || resp.status === 429 ? " (the site may block automated requests)" : ""}`);
    }
    const type = resp.headers.get("content-type") || "";
    if (type && !/html|xml|text\/plain/i.test(type)) {
      throw new Error(`That URL isn't a web page (${type.split(";")[0]})`);
    }
    const declared = Number(resp.headers.get("content-length") || 0);
    if (declared > MAX_BYTES) throw new Error("That page is too large to analyze");

    const reader = resp.body?.getReader();
    if (!reader) throw new Error("The page had no content");
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > MAX_BYTES) {
        await reader.cancel();
        throw new Error("That page is too large to analyze");
      }
      chunks.push(value);
    }
    const html = Buffer.concat(chunks).toString("utf8");
    const { title, text } = htmlToReadableText(html);
    if (text.length < 50) {
      throw new Error("Couldn't find readable content on that page. It may be rendered with JavaScript, in which case paste the text instead.");
    }
    return { url: url.toString(), title, text };
  }
  throw new Error("Too many redirects");
}
