import express from "express";
import { config } from "./config.js";
import { apiRouter } from "./routes/api.js";
import { webhookRouter } from "./routes/webhooks.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
  <html><head><title>StoreOptimizer Studio</title></head>
  <body>
    <h1>StoreOptimizer Studio</h1>
    <nav>
      <a href='/dashboard'>Dashboard</a> |
      <a href='/fixes'>Fixes</a> |
      <a href='/traffic'>Traffic</a> |
      <a href='/video-ads'>Video Ads</a> |
      <a href='/settings'>Settings</a>
    </nav>
    <p>Embedded UI shell. Replace with Shopify React Router + Polaris web components in production deploy.</p>
  </body></html>`);
});

for (const path of ["/dashboard", "/fixes", "/traffic", "/video-ads", "/settings"]) {
  app.get(path, (_req, res) => res.redirect("/"));
}

app.use("/api", apiRouter);
app.use("/webhooks", webhookRouter);

app.listen(config.port, () => {
  console.log(`StoreOptimizer Studio listening on ${config.port}`);
});
