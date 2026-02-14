import { Router } from "express";
import { prisma } from "../db.js";
import { config } from "../config.js";
import { verifyWebhookSignature } from "../services/webhooks.js";

export const webhookRouter = Router();

webhookRouter.post("/app/uninstalled", async (req, res) => {
  const rawBody = JSON.stringify(req.body);
  if (!verifyWebhookSignature(rawBody, req.get("X-Shopify-Hmac-Sha256"), process.env.SHOPIFY_API_SECRET || "")) {
    return res.status(401).send("invalid signature");
  }
  const shopDomain = req.get("X-Shopify-Shop-Domain") || "";
  const shop = await prisma.shop.findUnique({ where: { shopDomain } });
  if (shop) {
    await prisma.shop.delete({ where: { id: shop.id } });
  }
  res.status(200).send("ok");
});

webhookRouter.post("/products/update", async (req, res) => {
  // Minimal handler to trigger cache refresh strategy in production.
  res.status(200).send("ok");
});

webhookRouter.post("/shop/redact", async (_req, res) => res.status(200).send("ok"));
webhookRouter.post("/customers/redact", async (_req, res) => res.status(200).send("ok"));
webhookRouter.post("/customers/data_request", async (_req, res) => res.status(200).send("ok"));

webhookRouter.get("/settings/scopes", async (_req, res) => {
  res.json({
    shopifyApiVersion: config.shopifyApiVersion,
    defaultScopes: config.shopifyScopes,
    optionalWriteProducts: "Enable one-click fixes",
    optionalWriteThemes: "Advanced mode (requires explicit merchant approval)"
  });
});
