import { isIP } from "node:net";

const PRIVATE_IPV4_RANGES = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^192\.168\./,
  /^0\./
];

const PRIVATE_IPV6 = ["::1", "fc", "fd", "fe80"];

export function normalizeStoreUrl(input: string): string {
  const raw = input.trim();
  if (!raw) {
    throw new Error("Store URL is required.");
  }
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Only HTTP and HTTPS URLs are allowed.");
  }
  if (!parsed.hostname) {
    throw new Error("Invalid hostname.");
  }

  assertSafeHostname(parsed.hostname);
  parsed.hash = "";
  parsed.search = "";
  parsed.pathname = "/";
  return parsed.toString().replace(/\/$/, "");
}

export function assertSafeHostname(hostname: string): void {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower.endsWith(".localhost")) {
    throw new Error("Localhost URLs are blocked.");
  }

  if (isIP(lower) === 4) {
    if (PRIVATE_IPV4_RANGES.some((pattern) => pattern.test(lower))) {
      throw new Error("Private/internal IPv4 addresses are blocked.");
    }
    return;
  }

  if (isIP(lower) === 6) {
    const normalized = lower.replace(/^\[|\]$/g, "");
    if (PRIVATE_IPV6.some((prefix) => normalized.startsWith(prefix))) {
      throw new Error("Private/internal IPv6 addresses are blocked.");
    }
  }
}

export function isLikelyShopify(html: string, checkedRoutes: string[]): { detected: boolean; signals: string[] } {
  const signals: string[] = [];
  if (/cdn\.shopify\.com/i.test(html)) signals.push("cdn.shopify.com assets");
  if (/<meta[^>]+name=["']generator["'][^>]+shopify/i.test(html)) signals.push("meta generator Shopify");
  if (checkedRoutes.some((route) => route === "/products" || route === "/collections")) {
    signals.push("common Shopify routes exist");
  }
  if (/"@type"\s*:\s*"Product"/i.test(html)) signals.push("JSON-LD Product schema");

  return {
    detected: signals.length >= 2,
    signals
  };
}
