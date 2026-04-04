import express from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import spec from "./openapi.json" with { type: "json" };
import { checkRouter } from "./routes/check.js";
import { healthRouter } from "./routes/health.js";
import { metaRouter } from "./routes/meta.js";
import { errorHandler } from "./middleware/errorHandler.js";
import type { CompiledIndex } from "./types.js";

export async function createApp(index: CompiledIndex): Promise<express.Express> {
  const app = express();

  app.use(express.json());
  app.use(cors());

  const evmAddr = process.env.EVM_ADDRESS || "";
  const stellarAddr = process.env.STELLAR_ADDRESS || "";
  const stellarMainnetAddr = process.env.STELLAR_MAINNET_ADDRESS || "";
  const checkPrice = process.env.CHECK_PRICE || "$0.01";
  const ozFacilitatorUrl = process.env.OZ_FACILITATOR_URL || "";
  const ozApiKey = process.env.OZ_API_KEY || "";

  const hasAnyAddress = evmAddr || stellarAddr || stellarMainnetAddr;
  if (hasAnyAddress) {
    const { paymentMiddleware, x402ResourceServer } = await import("@x402/express");
    const { ExactEvmScheme } = await import("@x402/evm/exact/server");
    const { ExactStellarScheme } = await import("@x402/stellar/exact/server");
    const { HTTPFacilitatorClient } = await import("@x402/core/server");

    // x402.org for testnet, OZ for Stellar mainnet
    const facilitators: InstanceType<typeof HTTPFacilitatorClient>[] = [
      new HTTPFacilitatorClient({ url: "https://www.x402.org/facilitator" }),
    ];

    if (ozFacilitatorUrl && ozApiKey) {
      const ozAuth = { "Authorization": `Bearer ${ozApiKey}` };
      facilitators.push(
        new HTTPFacilitatorClient({
          url: ozFacilitatorUrl,
          createAuthHeaders: async () => ({
            verify: ozAuth,
            settle: ozAuth,
            supported: ozAuth,
          }),
        })
      );
    }

    const resourceServer = new x402ResourceServer(facilitators);

    // Register testnet schemes
    if (evmAddr) resourceServer.register("eip155:84532", new ExactEvmScheme());
    if (stellarAddr) resourceServer.register("stellar:testnet", new ExactStellarScheme());

    // Register mainnet schemes
    if (stellarMainnetAddr) resourceServer.register("stellar:pubnet", new ExactStellarScheme());

    const accepts: any[] = [];

    // Testnet options
    if (stellarAddr) {
      accepts.push({
        scheme: "exact",
        price: checkPrice,
        network: "stellar:testnet",
        payTo: stellarAddr,
        extra: { areFeesSponsored: true },
      });
    }
    if (evmAddr) {
      accepts.push({
        scheme: "exact",
        price: checkPrice,
        network: "eip155:84532",
        payTo: evmAddr,
      });
    }

    // Mainnet options
    if (stellarMainnetAddr) {
      accepts.push({
        scheme: "exact",
        price: checkPrice,
        network: "stellar:pubnet",
        payTo: stellarMainnetAddr,
      });
    }

    const routes: Record<string, any> = {
      "POST /check-skincare-ingredients": {
        accepts,
        description: `Check skincare ingredients for pore-clogging compounds — ${checkPrice} USDC`,
      },
    };

    await resourceServer.initialize();
    app.use(paymentMiddleware(routes, resourceServer));
  }

  app.get("/", (_req, res) => {
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dermi</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Georgia', 'Times New Roman', serif;
      background: rgb(223, 234, 202);
      color: #2d2d2d;
      min-height: 100vh;
    }
    .hero {
      text-align: center;
      padding: 48px 40px 24px;
    }
    .logo { font-size: 3.5rem; margin-bottom: 8px; }
    h1 {
      font-size: 2.8rem;
      font-weight: 400;
      letter-spacing: 0.12em;
      text-transform: lowercase;
      margin-bottom: 24px;
    }
    .tagline {
      font-size: 1.05rem;
      line-height: 1.7;
      color: #4a4a4a;
      max-width: 480px;
      margin: 0 auto;
      font-style: italic;
    }

    /* Reale Actives–style cards */
    .section-title {
      text-align: center;
      padding: 16px 40px 20px;
    }
    .section-title h2 {
      font-size: 2rem;
      font-weight: 400;
    }
    .section-title h2 span {
      font-weight: 300;
      color: #6a6a6a;
    }
    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1px;
      background: rgba(0,0,0,0.06);
      max-width: 1100px;
      margin: 0 auto;
    }
    .card {
      background: rgba(255,255,255,0.45);
      padding: 40px 32px;
      position: relative;
      min-height: 320px;
      display: flex;
      flex-direction: column;
    }
    .card-method {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 0.75rem;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #8a9a6e;
      margin-bottom: 4px;
    }
    .card-endpoint {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 1.4rem;
      font-weight: 900;
      color: #2d2d2d;
      line-height: 1.15;
      letter-spacing: -0.02em;
      word-break: break-all;
      margin-bottom: 16px;
    }
    .card-spacer { flex: 1; }
    .card-plus {
      font-weight: 700;
      font-size: 0.8rem;
      letter-spacing: 0.15em;
      margin-bottom: 8px;
    }
    .card-desc {
      font-size: 0.88rem;
      line-height: 1.55;
      color: #4a4a4a;
    }
    .card-desc .highlight {
      background: rgba(223, 234, 202, 0.8);
      padding: 1px 4px;
      font-weight: 600;
      color: #2d2d2d;
    }
    .card-price {
      display: inline-block;
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 0.75rem;
      padding: 3px 10px;
      border-radius: 20px;
      margin-top: 12px;
    }
    .card-price.paid {
      background: #8a9a6e;
      color: white;
    }
    .card-price.free {
      background: transparent;
      color: #8a9a6e;
      border: 1px solid #8a9a6e;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 32px 40px;
    }
    .payment-note {
      font-size: 0.82rem;
      color: #7a7a7a;
      line-height: 1.7;
      margin-bottom: 28px;
    }
    .links {
      display: flex;
      justify-content: center;
      gap: 32px;
    }
    .links a {
      color: #6a6a6a;
      text-decoration: none;
      font-size: 0.85rem;
      letter-spacing: 0.05em;
      transition: color 0.2s;
      border-bottom: 1px solid transparent;
    }
    .links a:hover {
      color: #2d2d2d;
      border-bottom-color: #8a9a6e;
    }

    .copy-prompt {
      max-width: 560px;
      margin: 24px auto 0;
      text-align: left;
    }
    .copy-label {
      font-size: 0.8rem;
      color: #8a8a8a;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
      font-style: normal;
    }
    .copy-box {
      background: rgba(255,255,255,0.55);
      border: 1px solid rgba(138,154,110,0.3);
      border-radius: 8px;
      padding: 14px 18px;
      cursor: pointer;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      transition: border-color 0.2s;
    }
    .copy-box:hover {
      border-color: #8a9a6e;
    }
    .copy-text {
      font-family: 'SF Mono', 'Menlo', monospace;
      font-size: 0.8rem;
      line-height: 1.5;
      color: #4a4a4a;
      flex: 1;
      user-select: all;
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .copy-icon {
      font-size: 1.1rem;
      color: #8a9a6e;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .copy-confirm {
      font-size: 0.75rem;
      color: #8a9a6e;
      margin-top: 6px;
      opacity: 0;
      transition: opacity 0.2s;
      font-style: italic;
    }

    @media (max-width: 720px) {
      .hero { padding: 60px 24px 40px; }
      h1 { font-size: 2.2rem; }
      .tagline { font-size: 0.95rem; }
      .section-title { padding: 32px 24px 24px; }
      .section-title h2 { font-size: 1.5rem; }
      .cards { grid-template-columns: 1fr; }
      .card { min-height: auto; padding: 32px 24px; }
      .card-endpoint { font-size: 1.15rem; }
      .footer { padding: 36px 24px; }
      .links { gap: 20px; flex-wrap: wrap; }
    }
  </style>
</head>
<body>
  <div class="hero">
    <div class="logo">🫧</div>
    <h1>dermi</h1>
    <p class="tagline">
      your agent's dermatologist.
      one penny to make sure it isn't buying you
      a product that will clog your pores.
    </p>
    <div class="copy-prompt">
      <p class="copy-label">Tell your agent:</p>
      <div class="copy-box" onclick="copyPrompt(this)">
        <span class="copy-text">Check a list of skincare ingredients for skin safety using Dermi: https://raw.githubusercontent.com/oceans404/dermi/refs/heads/main/DermiForAgentsOnStellarTestnet.md</span>
        <span class="copy-icon" title="Click to copy">&#x2398;</span>
      </div>
      <p class="copy-confirm" id="copyConfirm">copied!</p>
    </div>
  </div>

  <div class="section-title">
    <h2>x402 <span>Endpoints</span></h2>
  </div>

  <div class="cards">
    <div class="card">
      <div class="card-method">post</div>
      <div class="card-endpoint">/check-skincare-ingredients</div>
      <div class="card-spacer"></div>
      <div class="card-plus">+++</div>
      <div class="card-desc">
        <span class="highlight">Comedogenic ingredient check</span>
        — send a list of ingredients, get back which ones will clog your pores.
        Powered by Fulton 1989, Emme Diane, and ClearStem datasets.
      </div>
      <div><span class="card-price paid">$0.01 USDC</span></div>
    </div>

    <div class="card">
      <div class="card-method">get</div>
      <div class="card-endpoint">/meta</div>
      <div class="card-spacer"></div>
      <div class="card-plus">+++</div>
      <div class="card-desc">
        <span class="highlight">455 ingredients indexed</span>
        — version, sources, rating scale, and fuzzy match threshold.
      </div>
      <div><span class="card-price free">free</span></div>
    </div>

    <div class="card">
      <div class="card-method">get</div>
      <div class="card-endpoint">/docs</div>
      <div class="card-spacer"></div>
      <div class="card-plus">+++</div>
      <div class="card-desc">
        <span class="highlight">Interactive API explorer</span>
        — try requests, see schemas, and test the full x402 payment flow.
      </div>
      <div><span class="card-price free">free</span></div>
    </div>
  </div>

  <div class="footer">
    <p class="payment-note">
      Payments via x402 — no API keys, no accounts.<br>
      Just USDC on Stellar (mainnet or testnet) or Base Sepolia.
    </p>
    <div class="links">
      <a href="/docs">docs</a>
      <a href="/meta">meta</a>
      <a href="https://github.com/oceans404/dermi">github</a>
      <a href="https://github.com/oceans404/core">ows fork</a>
    </div>
  </div>
  <script>
    function copyPrompt(el) {
      const text = el.querySelector('.copy-text').textContent;
      navigator.clipboard.writeText(text).then(() => {
        const confirm = document.getElementById('copyConfirm');
        confirm.style.opacity = '1';
        setTimeout(() => { confirm.style.opacity = '0'; }, 1500);
      });
    }
  </script>
</body>
</html>`);
  });
  app.use("/check-skincare-ingredients", checkRouter(index));
  app.use("/health", healthRouter());
  app.use("/meta", metaRouter(index));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));

  app.use(errorHandler);

  return app;
}
