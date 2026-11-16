import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import zlib from "node:zlib";

/**
 * Fetches a live public web page and extracts its readable article text, for the
 * Content Grader and Compare Content. Guards against SSRF: only http(s), only public
 * IPs, enforced AT CONNECTION TIME (so DNS rebinding can't swap in a private address
 * between a check and the connect), re-validated on every redirect hop, with bounded
 * size and an overall deadline.
 */

const MAX_BYTES = 3_000_000;
const MAX_REDIRECTS = 5;
const DEFAULT_DEADLINE_MS = 20_000;

// Non-public ranges. BlockList matches IPv4-mapped IPv6 (::ffff:a.b.c.d, incl. the hex
// form the URL parser produces) against the IPv4 rules (do NOT add ::ffff:0:0/96 itself: it matches all IPv4).
const blocked = new net.BlockList();
for (const [net4, prefix] of [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16],
  ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15],
  ["198.51.100.0", 24], ["203.0.113.0", 24], ["224.0.0.0", 4], ["240.0.0.0", 4],
] as const) blocked.addSubnet(net4, prefix, "ipv4");
blocked.addAddress("::", "ipv6");
blocked.addAddress("::1", "ipv6");
for (const [net6, prefix] of [
  ["64:ff9b::", 96],    // NAT64
  ["100::", 64],        // discard
  ["2002::", 16],       // 6to4
  ["fc00::", 7],        // unique local
  ["fe80::", 10],       // link-local
  ["fec0::", 10],       // site-local (deprecated)
  ["ff00::", 8],        // multicast
] as const) blocked.addSubnet(net6, prefix, "ipv6");

function isBlockedAddress(address: string): boolean {
  const family = net.isIP(address);
  if (!family) return true;
  return blocked.check(address, family === 6 ? "ipv6" : "ipv4");
}

/** dns.lookup replacement used for the actual connection: refuses non-public results. */
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...(options as dns.LookupOptions), all: true }, (err, addresses) => {
    if (err) return (callback as any)(err);
    const list = addresses as dns.LookupAddress[];
    if (list.length === 0 || list.some((a) => isBlockedAddress(a.address))) {
      return (callback as any)(new Error("That URL points to a private address"));
    }
    if ((options as dns.LookupOptions).all) return (callback as any)(null, list);
    (callback as any)(null, list[0].address, list[0].family);
  });
};

function validateUrlShape(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That doesn't look like a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".internal") || host.endsWith(".local")) {
    throw new Error("That URL points to a private address");
  }
  // Literal IPs never hit DNS, so the lookup guard doesn't see them: check here.
  if (net.isIP(host) && isBlockedAddress(host)) {
    throw new Error("That URL points to a private address");
  }
  return url;
}

interface RawResponse {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

function requestOnce(url: URL, remainingMs: number): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    const lib = url.protocol === "https:" ? https : http;
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const req = lib.request(
      url,
      {
        method: "GET",
        lookup: safeLookup,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RankPilot/1.0; +https://rankpilot.app)",
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Accept-Encoding": "gzip, deflate, br",
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        const headers = res.headers;
        if (status >= 300 && status < 400) {
          res.resume();
          return finish(() => resolve({ status, headers, body: Buffer.alloc(0) }));
        }
        const type = String(headers["content-type"] || "");
        if (status < 200 || status >= 300) {
          res.resume();
          return finish(() => resolve({ status, headers, body: Buffer.alloc(0) }));
        }
        if (type && !/html|xml|text\/plain/i.test(type)) {
          res.destroy();
          return finish(() => reject(new Error(`That URL isn't a web page (${type.split(";")[0]})`)));
        }
        if (Number(headers["content-length"] || 0) > MAX_BYTES) {
          res.destroy();
          return finish(() => reject(new Error("That page is too large to analyze")));
        }
        const enc = String(headers["content-encoding"] || "").toLowerCase();
        const stream =
          enc === "gzip" ? res.pipe(zlib.createGunzip())
          : enc === "deflate" ? res.pipe(zlib.createInflate())
          : enc === "br" ? res.pipe(zlib.createBrotliDecompress())
          : res;
        const chunks: Buffer[] = [];
        let total = 0;
        stream.on("data", (c: Buffer) => {
          total += c.length;
          if (total > MAX_BYTES) {
            res.destroy();
            return finish(() => reject(new Error("That page is too large to analyze")));
          }
          chunks.push(c);
        });
        stream.on("end", () => finish(() => resolve({ status, headers, body: Buffer.concat(chunks) })));
        stream.on("error", () => finish(() => reject(new Error("The page could not be read"))));
        res.on("error", () => finish(() => reject(new Error("The page could not be read"))));
      }
    );
    const timer = setTimeout(() => {
      req.destroy();
      finish(() => reject(new Error("The page took too long to respond")));
    }, Math.max(1000, remainingMs));
    req.on("error", (e: any) => finish(() => reject(new Error(e?.message?.includes("private address") ? "That URL points to a private address" : "Couldn't connect to that page"))));
    req.end();
  });
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

/**
 * @param deadlineMs total time budget for the whole fetch including every redirect hop.
 */
export async function fetchPageContent(
  rawUrl: string,
  deadlineMs: number = DEFAULT_DEADLINE_MS
): Promise<{ url: string; title: string; text: string }> {
  const started = Date.now();
  let url = validateUrlShape(rawUrl.trim());

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const remaining = deadlineMs - (Date.now() - started);
    if (remaining <= 0) throw new Error("The page took too long to respond");
    const resp = await requestOnce(url, remaining);

    const location = resp.headers.location;
    if (resp.status >= 300 && resp.status < 400 && location) {
      url = validateUrlShape(new URL(location, url).toString());
      continue;
    }
    if (resp.status < 200 || resp.status >= 300) {
      throw new Error(
        `The page returned HTTP ${resp.status}${resp.status === 403 || resp.status === 429 ? " (the site may block automated requests)" : ""}`
      );
    }
    const html = resp.body.toString("utf8");
    const { title, text } = htmlToReadableText(html);
    if (text.length < 50) {
      throw new Error("Couldn't find readable content on that page. It may be rendered with JavaScript, in which case paste the text instead.");
    }
    return { url: url.toString(), title, text };
  }
  throw new Error("Too many redirects");
}
