import { describe, expect, it } from "vitest";
import { normalizeStoreUrl } from "../src/utils/urlSafety.js";

describe("URL validation and SSRF guard", () => {
  it("normalizes safe storefront URL", () => {
    expect(normalizeStoreUrl("example.com")).toBe("https://example.com");
  });

  it("blocks localhost and private IPs", () => {
    expect(() => normalizeStoreUrl("http://localhost:3000")).toThrow();
    expect(() => normalizeStoreUrl("http://127.0.0.1")).toThrow();
    expect(() => normalizeStoreUrl("http://192.168.1.20")).toThrow();
  });
});
