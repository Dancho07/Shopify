import { prisma } from "../db.js";
import { parseRobots, parseSitemaps } from "./sitemap.js";
import { isLikelyShopify, normalizeStoreUrl } from "../utils/urlSafety.js";

type Severity = "Critical" | "High" | "Medium" | "Low";
type Area = "SEO" | "Conversion" | "Performance";

type AnalyzedPage = {
  url: string;
  title: string | null;
  metaDesc: string | null;
  h1: string | null;
  ogJson: string;
  altCoverage: number;
  structuredDataPresent: boolean;
  brokenLinksCount: number;
  html: string;
  loadMs: number;
};

const MAX_PAGES = Number(process.env.SCAN_MAX_PAGES || 50);

function textMatch(html: string, regex: RegExp): string | null {
  const match = html.match(regex);
  return match?.[1]?.trim() || null;
}

function getSeverity(points: number): Severity {
  if (points >= 25) return "Critical";
  if (points >= 15) return "High";
  if (points >= 8) return "Medium";
  return "Low";
}

function isProductPage(url: string): boolean {
  return /\/products\//.test(url);
}

function hasPolicyLink(html: string): boolean {
  return /\/policies\/(shipping-policy|refund-policy|privacy-policy|terms-of-service)/i.test(html);
}

function extractLinks(html: string): string[] {
  const links = html.match(/<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi) || [];
  return links
    .map((tag) => tag.match(/href=["']([^"']+)["']/i)?.[1] || "")
    .filter(Boolean)
    .slice(0, 100);
}

async function analyzePage(url: string): Promise<AnalyzedPage | null> {
  const started = Date.now();
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) return null;
  const html = await res.text();
  const loadMs = Date.now() - started;

  const title = textMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDesc = textMatch(html, /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    || textMatch(html, /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
  const h1Matches = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/gi) || [];
  const firstH1 = h1Matches[0] ?? "";
  const h1 = firstH1 ? firstH1.replace(/<[^>]+>/g, "").trim() : null;
  const canonical = /<link[^>]+rel=["']canonical["'][^>]+>/i.test(html);
  const ogTitle = /<meta[^>]+property=["']og:title["'][^>]+>/i.test(html);
  const ogImage = /<meta[^>]+property=["']og:image["'][^>]+>/i.test(html);
  const images = html.match(/<img[^>]*>/gi) || [];
  const withAlt = images.filter((img) => /alt=["'][^"']*["']/i.test(img)).length;
  const altCoverage = images.length ? Math.round((withAlt / images.length) * 100) : 100;
  const structuredDataPresent = /<script[^>]+type=["']application\/ld\+json["'][^>]*>/i.test(html);

  const links = extractLinks(html).filter((href) => href.startsWith("/"));
  let brokenLinksCount = 0;
  for (const href of links.slice(0, 15)) {
    try {
      const linkRes = await fetch(new URL(href, url), { method: "HEAD", redirect: "manual" });
      if (linkRes.status >= 400) brokenLinksCount += 1;
    } catch {
      brokenLinksCount += 1;
    }
  }

  const ogJson = JSON.stringify({ canonical, ogTitle, ogImage });

  return {
    url,
    title,
    metaDesc,
    h1,
    ogJson,
    altCoverage,
    structuredDataPresent,
    brokenLinksCount,
    html,
    loadMs
  };
}

function buildFindings(page: AnalyzedPage): Array<{ severity: Severity; area: Area; message: string; recommendation: string; howToApply: string }> {
  const findings: Array<{ severity: Severity; area: Area; message: string; recommendation: string; howToApply: string }> = [];

  const titleLen = page.title?.length || 0;
  if (!page.title || titleLen < 20 || titleLen > 65) {
    findings.push({
      severity: getSeverity(12),
      area: "SEO",
      message: "Title tag missing or outside recommended length (20-65 chars).",
      recommendation: "Use a unique keyword-led title and keep it within 20-65 characters.",
      howToApply: "Copy/paste in your Shopify product/collection SEO settings, or connect Shopify for one-click updates."
    });
  }

  const descLen = page.metaDesc?.length || 0;
  if (!page.metaDesc || descLen < 70 || descLen > 160) {
    findings.push({
      severity: "Medium",
      area: "SEO",
      message: "Meta description missing or outside 70-160 characters.",
      recommendation: "Write a compelling summary with one CTA and keep it concise.",
      howToApply: "Copy/paste suggested meta descriptions in Shopify Search engine listing fields."
    });
  }

  if (!page.h1) {
    findings.push({
      severity: "High",
      area: "SEO",
      message: "No H1 detected on page.",
      recommendation: "Add one clear H1 aligned with page intent.",
      howToApply: "Edit theme template heading. Connect Shopify + theme permissions for advanced edits."
    });
  }

  if (page.altCoverage < 80) {
    findings.push({
      severity: "Medium",
      area: "SEO",
      message: `Image alt-text coverage is ${page.altCoverage}% (target >= 80%).`,
      recommendation: "Add descriptive alt text for product and collection imagery.",
      howToApply: "Update image alt text in Shopify media editor or use one-click apply after connecting."
    });
  }

  if (page.brokenLinksCount > 0) {
    findings.push({
      severity: "High",
      area: "Conversion",
      message: `Detected ${page.brokenLinksCount} broken internal links.`,
      recommendation: "Repair or redirect broken links to prevent funnel drop-off.",
      howToApply: "Use Navigation editor or URL redirects in Shopify admin."
    });
  }

  if (isProductPage(page.url)) {
    const hasPrice = /\$\s?\d|\d+\.\d{2}/.test(page.html);
    const hasVariants = /variant/i.test(page.html);
    const hasCta = /(add to cart|buy now|purchase)/i.test(page.html);
    const hasPolicy = hasPolicyLink(page.html);
    if (!hasPrice || !hasCta) {
      findings.push({
        severity: "Critical",
        area: "Conversion",
        message: "Product page appears to miss visible price or primary purchase CTA.",
        recommendation: "Ensure price and add-to-cart button are above the fold.",
        howToApply: "Adjust product template sections in theme customizer."
      });
    }
    if (!hasVariants) {
      findings.push({
        severity: "Low",
        area: "Conversion",
        message: "No variant-related controls detected.",
        recommendation: "If applicable, expose size/color options to reduce confusion.",
        howToApply: "Configure variants on the product in Shopify admin."
      });
    }
    if (!hasPolicy) {
      findings.push({
        severity: "Medium",
        area: "Conversion",
        message: "Shipping/returns policy links are not easily discoverable on product page.",
        recommendation: "Link policies near CTA to reduce buyer hesitation.",
        howToApply: "Add policy links via product template blocks or footer navigation."
      });
    }
  }

  if (page.loadMs > 1500) {
    findings.push({
      severity: "High",
      area: "Performance",
      message: `Slow response snapshot: ${page.loadMs}ms.`,
      recommendation: "Compress images, defer non-critical scripts, and remove unused apps.",
      howToApply: "Apply theme/app optimization checklist and retest with Lighthouse."
    });
  }

  return findings;
}

function scoreFromFindings(findings: Array<{ area: Area; severity: Severity }>, perfTimes: number[]) {
  const penalties = { Critical: 10, High: 6, Medium: 3, Low: 1 } as const;
  const seoPenalty = findings.filter((f) => f.area === "SEO").reduce((a, f) => a + penalties[f.severity], 0);
  const convPenalty = findings.filter((f) => f.area === "Conversion").reduce((a, f) => a + penalties[f.severity], 0);
  const perfPenalty = findings.filter((f) => f.area === "Performance").reduce((a, f) => a + penalties[f.severity], 0)
    + Math.round((perfTimes.reduce((a, b) => a + b, 0) / Math.max(perfTimes.length, 1)) / 500);

  const seoScore = Math.max(0, 100 - seoPenalty);
  const convScore = Math.max(0, 100 - convPenalty);
  const perfScore = Math.max(0, 100 - perfPenalty);
  const overallScore = Math.round((seoScore + convScore + perfScore) / 3);
  return { overallScore, seoScore, convScore, perfScore };
}

export async function runPublicScan(inputUrl: string) {
  const baseUrl = normalizeStoreUrl(inputUrl);
  const robots = await parseRobots(baseUrl);
  const sitemapUrls = await parseSitemaps(baseUrl, MAX_PAGES);
  const seedUrls = [baseUrl, ...sitemapUrls].slice(0, MAX_PAGES);

  const scanned: AnalyzedPage[] = [];
  const allFindings: Array<{ severity: Severity; area: Area; url: string; message: string; recommendation: string; howToApply: string }> = [];
  let homeHtml = "";

  for (const pageUrl of seedUrls) {
    const parsed = new URL(pageUrl);
    if (robots.disallow.some((path) => path && parsed.pathname.startsWith(path))) {
      continue;
    }
    await new Promise((resolve) => setTimeout(resolve, robots.crawlDelayMs));
    const analyzed = await analyzePage(pageUrl);
    if (!analyzed) continue;
    if (pageUrl === baseUrl) homeHtml = analyzed.html;
    scanned.push(analyzed);
    for (const finding of buildFindings(analyzed)) {
      allFindings.push({ ...finding, url: pageUrl });
    }
  }

  const routesToCheck = ["/products", "/collections"];
  for (const route of routesToCheck) {
    try {
      const res = await fetch(`${baseUrl}${route}`);
      if (res.ok) {
        // noop, signal captured by route list.
      }
    } catch {
      // ignore
    }
  }

  const shopifySignal = isLikelyShopify(homeHtml, routesToCheck);
  const perfTargets = scanned
    .filter((p) => p.url === baseUrl || /\/products\//.test(p.url) || /\/collections\//.test(p.url))
    .slice(0, 3);

  const score = scoreFromFindings(allFindings, perfTargets.map((p) => p.loadMs));

  const scan = await prisma.scan.create({
    data: {
      storeUrl: baseUrl,
      ...score,
      summaryJson: JSON.stringify({
        scannedPages: scanned.length,
        shopifyDetected: shopifySignal.detected,
        detectionSignals: shopifySignal.signals,
        crawlDelayMs: robots.crawlDelayMs,
        note: "Public scan uses storefront data only and cannot modify store content without Shopify connection."
      })
    }
  });

  if (scanned.length > 0) {
    await prisma.pageResult.createMany({
      data: scanned.map((page) => ({
        scanId: scan.id,
        url: page.url,
        title: page.title,
        metaDesc: page.metaDesc,
        h1: page.h1,
        ogJson: page.ogJson,
        altCoverage: page.altCoverage,
        structuredDataPresent: page.structuredDataPresent,
        brokenLinksCount: page.brokenLinksCount
      }))
    });
  }

  if (allFindings.length > 0) {
    await prisma.finding.createMany({
      data: allFindings.map((finding) => ({
        scanId: scan.id,
        severity: finding.severity,
        area: finding.area,
        url: finding.url,
        message: finding.message,
        recommendation: finding.recommendation,
        howToApply: finding.howToApply
      }))
    });
  }

  return scan.id;
}
