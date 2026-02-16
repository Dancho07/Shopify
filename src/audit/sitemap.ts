import { assertSafeHostname } from "../utils/urlSafety.js";

export function extractTagValues(xml: string, tag: string): string[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(xml)) !== null) {
    values.push(match[1].trim());
  }
  return values;
}


export function parseSitemapXml(xml: string): { urls: string[]; sitemaps: string[] } {
  const locValues = extractTagValues(xml, "loc");
  return {
    urls: locValues.filter((entry) => !/sitemap/i.test(entry)),
    sitemaps: locValues.filter((entry) => /sitemap/i.test(entry))
  };
}
async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function parseRobots(baseUrl: string): Promise<{ disallow: string[]; crawlDelayMs: number }> {
  const robotsUrl = `${baseUrl}/robots.txt`;
  const txt = await fetchText(robotsUrl);
  if (!txt) return { disallow: [], crawlDelayMs: 300 };

  const disallow: string[] = [];
  let crawlDelayMs = 300;
  for (const line of txt.split(/\r?\n/)) {
    const clean = line.trim();
    if (/^disallow:/i.test(clean)) {
      disallow.push(clean.split(":")[1]?.trim() || "");
    }
    if (/^crawl-delay:/i.test(clean)) {
      const seconds = Number(clean.split(":")[1]?.trim() || "0");
      if (Number.isFinite(seconds) && seconds > 0) crawlDelayMs = Math.round(seconds * 1000);
    }
  }

  return { disallow, crawlDelayMs };
}

export async function parseSitemaps(baseUrl: string, cap = 50): Promise<string[]> {
  const seen = new Set<string>();
  const queue = [`${baseUrl}/sitemap.xml`];
  const urls: string[] = [];

  while (queue.length > 0 && urls.length < cap) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);

    const xml = await fetchText(current);
    if (!xml) continue;

    const nestedSitemaps = extractTagValues(xml, "loc").filter((entry) => /sitemap/i.test(entry));
    for (const sitemap of nestedSitemaps) {
      if (!seen.has(sitemap)) queue.push(sitemap);
    }

    const locValues = extractTagValues(xml, "loc");
    for (const loc of locValues) {
      try {
        const parsed = new URL(loc);
        assertSafeHostname(parsed.hostname);
        if (!/sitemap/i.test(loc) && parsed.origin === baseUrl && urls.length < cap) {
          urls.push(parsed.toString());
        }
      } catch {
        continue;
      }
    }
  }

  return Array.from(new Set(urls)).slice(0, cap);
}
