import "dotenv/config";
import { createFacilitatorConfig } from "@coinbase/x402";
import { HTTPFacilitatorClient } from "@x402/core/server";

async function main() {
  console.log("CDP_API_KEY_ID:", process.env.CDP_API_KEY_ID ? `${process.env.CDP_API_KEY_ID.slice(0, 8)}...` : "MISSING");
  console.log("CDP_API_KEY_SECRET:", process.env.CDP_API_KEY_SECRET ? `${process.env.CDP_API_KEY_SECRET.slice(0, 8)}...` : "MISSING");

  const config = createFacilitatorConfig();
  console.log("\nCDP facilitator URL:", config.url);
  console.log("Has createAuthHeaders:", !!config.createAuthHeaders);

  const client = new HTTPFacilitatorClient(config);

  try {
    const supported = await client.getSupported();
    console.log("\nCDP getSupported SUCCESS");
    console.log("Networks:", supported.kinds?.map((k: any) => `v${k.x402Version}:${k.network}`).slice(0, 10));
    console.log("Extensions:", supported.extensions);
  } catch (e: any) {
    console.log("\nCDP getSupported FAILED");
    console.log("Error:", e.message);
    if (e.response) {
      console.log("Status:", e.response.status);
      console.log("Body:", await e.response.text?.() || e.response.data);
    }
  }
}

main();
