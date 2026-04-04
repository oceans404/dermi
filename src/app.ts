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
    res.json({
      name: "Dermi",
      description: "Your agent's dermatologist. $0.01 to check if a product will clog your pores.",
      endpoints: {
        "POST /check-skincare-ingredients": "$0.01 USDC — check ingredients for comedogenic potential",
        "GET /health": "free — health check",
        "GET /meta": "free — dataset metadata",
        "GET /docs": "free — Swagger UI",
      },
      payment: "x402 — pay with USDC on Stellar (mainnet or testnet) or Base Sepolia",
      docs: "/docs",
      github: "https://github.com/oceans404/dermi",
    });
  });
  app.use("/check-skincare-ingredients", checkRouter(index));
  app.use("/health", healthRouter());
  app.use("/meta", metaRouter(index));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));

  app.use(errorHandler);

  return app;
}
