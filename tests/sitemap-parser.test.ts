import { describe, expect, it } from "vitest";
import { parseSitemapXml } from "../src/audit/sitemap.js";

describe("sitemap parser", () => {
  it("extracts sitemap index entries and URL entries", () => {
    const xml = `<?xml version="1.0"?><urlset>
      <url><loc>https://demo.com/products/a</loc></url>
      <url><loc>https://demo.com/sitemap_products_1.xml</loc></url>
      <url><loc>https://demo.com/collections/all</loc></url>
    </urlset>`;

    const parsed = parseSitemapXml(xml);
    expect(parsed.urls).toContain("https://demo.com/products/a");
    expect(parsed.urls).toContain("https://demo.com/collections/all");
    expect(parsed.sitemaps).toContain("https://demo.com/sitemap_products_1.xml");
  });
});
