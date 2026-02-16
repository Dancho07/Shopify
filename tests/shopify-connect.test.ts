import { describe, expect, it } from "vitest";
import { createOAuthState, readOAuthState, sanitizeShopDomain } from "../src/services/shopify.js";

describe("shopify connect helpers", () => {
  it("sanitizes myshopify domain", () => {
    expect(sanitizeShopDomain("https://demo-store.myshopify.com/")).toBe("demo-store.myshopify.com");
    expect(() => sanitizeShopDomain("demo-store.com")).toThrow();
  });

  it("roundtrips oauth state", () => {
    const encoded = createOAuthState("demo-store.myshopify.com");
    const parsed = readOAuthState(encoded);
    expect(parsed.shopDomain).toBe("demo-store.myshopify.com");
    expect(parsed.nonce.length).toBeGreaterThan(10);
  });
});
