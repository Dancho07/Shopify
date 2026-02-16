import express from "express";
import { config } from "./config.js";
import { apiRouter } from "./routes/api.js";
import { webhookRouter } from "./routes/webhooks.js";

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/", (_req, res) => {
  res.type("html").send(`<!doctype html>
  <html>
  <head><title>StoreOptimizer Link Mode</title></head>
  <body style="font-family:Inter,Arial;padding:24px;max-width:820px;margin:0 auto;">
    <h1>StoreOptimizer Link Mode</h1>
    <p><strong>Public scan uses storefront data only (HTML, sitemap, robots.txt) and cannot modify your store.</strong></p>
    <p>To apply fixes, connect Shopify via OAuth with minimal scopes.</p>
    <form id="scan-form">
      <input id="storeUrl" placeholder="Paste your Shopify store URL (e.g., https://example.com)" style="width:100%;padding:12px" />
      <button type="submit" style="margin-top:12px;padding:10px 16px">Scan Store</button>
    </form>
    <p><a href="/connect">Connect Shopify to Apply Fixes</a> · <a href="/ads">Video Ads Studio</a> · <a href="/settings">Settings</a></p>
    <pre id="status" style="background:#111;color:#0f0;padding:12px;min-height:60px"></pre>
    <script>
      const form = document.getElementById('scan-form');
      const status = document.getElementById('status');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const storeUrl = document.getElementById('storeUrl').value;
        status.textContent = 'Starting public scan...';
        const res = await fetch('/api/scan', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({storeUrl})});
        const data = await res.json();
        if (!res.ok) { status.textContent = JSON.stringify(data, null, 2); return; }
        status.textContent = 'Scan complete. Redirecting...';
        window.location.href = '/scan/' + data.scanId;
      });
    </script>
  </body></html>`);
});

app.get("/scan/:id", (req, res) => {
  res.type("html").send(`<!doctype html><html><body style="font-family:Inter,Arial;padding:24px">
    <h1>Scan Dashboard</h1>
    <p>Public scan cannot change your store. Connect Shopify for one-click apply.</p>
    <div id="content">Loading...</div>
    <script>
      (async () => {
        const res = await fetch('/api/scan/${req.params.id}');
        const data = await res.json();
        if (!res.ok) { document.getElementById('content').textContent = data.error || 'Failed'; return; }
        const summary = JSON.parse(data.scan.summaryJson);
        const fixesHtml = data.topFixes.map((f) => '<li><strong>[' + f.severity + '] ' + f.area + '</strong> - ' + f.message + '<br/>Fix: ' + f.recommendation + '<br/>How to apply: ' + f.howToApply + '</li>').join('');
        document.getElementById('content').innerHTML =
          '<h2>Scores</h2>' +
          '<ul><li>Overall: ' + data.scan.overallScore + '</li><li>SEO: ' + data.scan.seoScore + '</li><li>Conversion: ' + data.scan.convScore + '</li><li>Performance: ' + data.scan.perfScore + '</li></ul>' +
          '<p>Shopify Detected: ' + (summary.shopifyDetected ? 'Yes' : 'No') + ' (' + ((summary.detectionSignals || []).join(', ') || 'No signals') + ')</p>' +
          '<h3>Top 10 Fixes</h3><ol>' + fixesHtml + '</ol>' +
          '<p><a href="/api/scan/' + data.scan.id + '/export.csv">Download CSV</a> | <a href="/api/scan/' + data.scan.id + '/export.json">Download JSON</a></p>';
      })();
    </script>
  </body></html>`);
});

app.get("/connect", (_req, res) => {
  res.type("html").send(`<!doctype html><html><body style="font-family:Inter,Arial;padding:24px;max-width:760px">
  <h1>Connect Shopify</h1>
  <p><strong>Public scan cannot modify your store. Connection is required for one-click apply.</strong></p>
  <ul>
    <li>Default scopes: read_products, read_content</li>
    <li>Optional one-click fixes: write_products</li>
    <li>Advanced theme edits (off by default): write_themes</li>
  </ul>
  <form id="connect-form">
    <input id="shop" placeholder="example.myshopify.com" style="width:100%;padding:10px" />
    <button style="margin-top:12px">Generate OAuth Link</button>
  </form>
  <pre id="out" style="background:#111;color:#0f0;padding:12px;min-height:70px"></pre>
  <script>
    document.getElementById('connect-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const shop = document.getElementById('shop').value;
      const r = await fetch('/api/connect/start?shop=' + encodeURIComponent(shop));
      const data = await r.json();
      if (!r.ok) { out.textContent = JSON.stringify(data, null, 2); return; }
      out.textContent = 'Open this URL to install:
' + data.authUrl;
      window.location.href = data.authUrl;
    });
  </script>
  </body></html>`);
});

app.get("/ads", (_req, res) => {
  res.type("html").send(`<!doctype html><html><body style="font-family:Inter,Arial;padding:24px">
    <h1>Video Ads Studio</h1>
    <p><a href="/ads/new">Create New Ad</a></p>
    <pre id="list">Loading...</pre>
    <script>
      (async () => {
        const res = await fetch('/api/ads');
        const data = await res.json();
        document.getElementById('list').textContent = JSON.stringify(data.projects, null, 2);
      })();
    </script>
  </body></html>`);
});

app.get("/ads/new", (_req, res) => {
  res.type("html").send(`<!doctype html><html><body style="font-family:Inter,Arial;padding:24px">
  <h1>Create Ad Project</h1>
  <form id="f">
    <input id="storeUrl" placeholder="https://example.com" /><br/><br/>
    <input id="productRef" placeholder="Product title or handle" /><br/><br/>
    <select id="template"><option value="problem-solution-cta">Problem → Solution → CTA</option><option value="3-benefits">3 Benefits</option><option value="minimal-premium">Minimal Premium</option></select><br/><br/>
    <select id="format"><option>9:16</option><option>1:1</option><option>16:9</option></select><br/><br/>
    <button>Create</button>
  </form>
  <pre id="out"></pre>
  <script>
   document.getElementById('f').addEventListener('submit', async (e)=>{
     e.preventDefault();
     const payload = {storeUrl:storeUrl.value, productRef:productRef.value, template:template.value, format:format.value};
     const r= await fetch('/api/ads/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
     out.textContent = JSON.stringify(await r.json(),null,2);
   });
  </script>
  </body></html>`);
});

app.get("/settings", (_req, res) => {
  res.type("html").send(`<!doctype html><html><body style="font-family:Inter,Arial;padding:24px">
  <h1>Settings</h1>
  <p>Configure OPENAI_API_KEY for AI copy and ad scripts. Without it, rule-based templates are used.</p>
  <p>Voiceover is optional and disabled by default in this starter implementation.</p>
  </body></html>`);
});

app.use("/api", apiRouter);
app.use("/webhooks", webhookRouter);

app.listen(config.port, () => {
  console.log(`StoreOptimizer Link Mode listening on ${config.port}`);
});
