import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyWebhookSignature } from "../src/services/webhooks.js";

describe("webhook signature verification", () => {
  it("validates Shopify hmac", () => {
    const body = JSON.stringify({ test: true });
    const secret = "shhh";
    const hmac = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
    expect(verifyWebhookSignature(body, hmac, secret)).toBe(true);
    expect(verifyWebhookSignature(body, "bad", secret)).toBe(false);
  });
});
