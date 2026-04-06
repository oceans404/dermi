/**
 * Register Dermi on x402scan using OWS to sign the SIWX challenge.
 * Keys never leave the OWS vault.
 *
 * Usage:
 *   node scripts/register-x402scan.mjs [wallet-name]
 *
 * Defaults to the "seller" wallet (0x210F77aC72B5b667a6Cf349a2ce9CaadC0A6C0e6).
 */

import { execSync } from "child_process";
import { writeFileSync, unlinkSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { formatSIWEMessage, encodeSIWxHeader } from "@x402/extensions/sign-in-with-x";
import { decodePaymentRequiredHeader } from "@x402/core/http";

const OWS_BIN = process.env.OWS_BIN || `${process.env.HOME}/.ows/bin/ows`;
const WALLET = process.argv[2] || "seller";
const ORIGIN = "https://dermi-znuq.onrender.com";
const REGISTER_URL = "https://x402scan.com/api/x402/registry/register-origin";

// Seller wallet EVM address (from OWS vault)
const ADDRESS = "0x210F77aC72B5b667a6Cf349a2ce9CaadC0A6C0e6";

console.log(`Wallet: ${WALLET}`);
console.log(`Address: ${ADDRESS}`);
console.log(`Registering: ${ORIGIN}\n`);

// Step 1: Get the SIWX challenge (402 response)
const challengeRes = await fetch(REGISTER_URL, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ origin: ORIGIN }),
});

if (challengeRes.status !== 402) {
  console.log(`Unexpected status: ${challengeRes.status}`);
  console.log(await challengeRes.text());
  process.exit(1);
}

// Step 2: Parse PAYMENT-REQUIRED header for the SIWX extension
const prHeader = challengeRes.headers.get("payment-required");
if (!prHeader) {
  console.error("No PAYMENT-REQUIRED header in 402 response");
  process.exit(1);
}

const paymentRequired = decodePaymentRequiredHeader(prHeader);
const siwxExt = paymentRequired.extensions?.["sign-in-with-x"];
if (!siwxExt) {
  console.error("No sign-in-with-x extension in 402 response");
  console.error("Extensions:", JSON.stringify(paymentRequired.extensions, null, 2));
  process.exit(1);
}

// Step 3: Pick an EVM chain from supportedChains
const evmChain = siwxExt.supportedChains.find(c => c.chainId.startsWith("eip155:"));
if (!evmChain) {
  console.error("No EVM chain in supportedChains:", siwxExt.supportedChains);
  process.exit(1);
}

console.log(`SIWX challenge received:`);
console.log(`  Domain: ${siwxExt.info.domain}`);
console.log(`  Nonce: ${siwxExt.info.nonce}`);
console.log(`  Chain: ${evmChain.chainId}\n`);

// Step 4: Build the SIWE message string
const completeInfo = {
  ...siwxExt.info,
  chainId: evmChain.chainId,
  type: evmChain.type,
};
const message = formatSIWEMessage(completeInfo, ADDRESS);

// Step 5: Sign with OWS (key never leaves the vault)
// Write message to temp file to avoid shell escaping issues with newlines
console.log("Signing with OWS...");
const msgHex = Buffer.from(message, "utf8").toString("hex");
const signOutput = execSync(
  `${OWS_BIN} sign message --chain ethereum --wallet ${WALLET} --encoding hex --message ${msgHex} --json`,
  { encoding: "utf8" },
);
const { signature: rawSig, recovery_id } = JSON.parse(signOutput);

// OWS returns a 65-byte hex signature (r + s + v) with v already appended
const signature = `0x${rawSig}`;

console.log(`Signature: ${signature.slice(0, 20)}...${signature.slice(-8)}\n`);

// Step 6: Build SIWX payload and encode header
const siwxPayload = {
  domain: completeInfo.domain,
  address: ADDRESS,
  statement: completeInfo.statement,
  uri: completeInfo.uri,
  version: completeInfo.version,
  chainId: completeInfo.chainId,
  type: completeInfo.type,
  nonce: completeInfo.nonce,
  issuedAt: completeInfo.issuedAt,
  expirationTime: completeInfo.expirationTime,
  notBefore: completeInfo.notBefore,
  requestId: completeInfo.requestId,
  resources: completeInfo.resources,
  signatureScheme: completeInfo.signatureScheme || evmChain.signatureScheme,
  signature,
};
const siwxHeader = encodeSIWxHeader(siwxPayload);

// Step 7: Send authenticated registration
console.log("Sending authenticated registration...\n");
const registerRes = await fetch(REGISTER_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "SIGN-IN-WITH-X": siwxHeader,
  },
  body: JSON.stringify({ origin: ORIGIN }),
});

const result = await registerRes.json();
console.log(`Status: ${registerRes.status}`);
console.log(JSON.stringify(result, null, 2));

if (result.registered > 0 && result.failed === 0) {
  console.log("\nDermi registered and verified on x402scan!");
} else if (result.registered > 0) {
  console.log(`\nRegistered ${result.registered} endpoint(s), ${result.failed} failed (likely free endpoints).`);
} else {
  console.log("\nRegistration may have failed — check failedDetails above.");
}
