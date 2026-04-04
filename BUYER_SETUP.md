# Buyer Setup — Skincare Ingredient Checker API

Pay for ingredient checks with USDC using [OWS](https://github.com/oceans404/core) and x402.

## Accepted payment methods

| Network | Price | Type |
|---------|-------|------|
| `stellar:pubnet` (Stellar Mainnet) | $0.01 USDC | Real money |
| `stellar:testnet` (Stellar Testnet) | $0.01 USDC | Free testnet |
| `eip155:84532` (Base Sepolia) | $0.01 USDC | Free testnet |

Dermi is live at **https://dermi-znuq.onrender.com**

---

## Stellar Mainnet (recommended)

Pay with real USDC on Stellar. Transaction fees are sponsored by the facilitator.

### 1. Install OWS

This project uses a [custom OWS fork](https://github.com/oceans404/core) with Stellar x402 support.

```bash
# Build from source
git clone https://github.com/oceans404/core.git
cd core/ows && cargo build --release
# Binary at: core/ows/target/release/ows

# Or install the published version (once available)
npm install -g @open-wallet-standard/core
```

### 2. Create a wallet

```bash
ows wallet create --name my-wallet
ows wallet list
```

Note your Stellar address — the `stellar:pubnet` line starting with `G`.

### 3. Activate your Stellar account

Send **at least 2 XLM** to your `G...` address from any exchange (Coinbase, Kraken, etc.) or another Stellar wallet. The Stellar network requires a minimum balance to activate an account.

Verify:

```bash
ADDR="G...your address..."
curl -s "https://horizon.stellar.org/accounts/$ADDR" | python3 -c "
import json, sys; d = json.load(sys.stdin)
for b in d['balances']: print(b.get('asset_code','XLM'), b['balance'])
"
# Should show: XLM 2.0000000 (or however much you sent)
```

### 4. Add USDC trustline

Stellar requires a one-time trustline before your account can hold USDC.

```bash
mkdir -p /tmp/stellar-setup && cd /tmp/stellar-setup
npm init -y && npm install @stellar/stellar-sdk
```

Create `/tmp/stellar-setup/add-trustline.mjs`:

```javascript
import * as StellarSdk from "@stellar/stellar-sdk";

const ACCOUNT = process.argv[2];
const NETWORK = process.argv[3] || "mainnet";

const config = {
  testnet: {
    horizon: "https://horizon-testnet.stellar.org",
    passphrase: StellarSdk.Networks.TESTNET,
    usdcIssuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  },
  mainnet: {
    horizon: "https://horizon.stellar.org",
    passphrase: StellarSdk.Networks.PUBLIC,
    usdcIssuer: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
  },
};

const { horizon, passphrase, usdcIssuer } = config[NETWORK];
const server = new StellarSdk.Horizon.Server(horizon);
const account = await server.loadAccount(ACCOUNT);
const fee = await server.fetchBaseFee();

const tx = new StellarSdk.TransactionBuilder(account, {
  fee: fee.toString(),
  networkPassphrase: passphrase,
})
  .addOperation(StellarSdk.Operation.changeTrust({
    asset: new StellarSdk.Asset("USDC", usdcIssuer),
  }))
  .setTimeout(300)
  .build();

console.log(tx.toEnvelope().toXDR("hex"));
```

Sign and submit:

```bash
ADDR="G...your address..."
TX_HEX=$(node /tmp/stellar-setup/add-trustline.mjs "$ADDR" mainnet)
ows sign send-tx --wallet my-wallet --chain stellar:pubnet --tx "$TX_HEX" \
  --rpc-url "https://soroban-rpc.mainnet.stellar.gateway.fm"
```

Verify:

```bash
curl -s "https://horizon.stellar.org/accounts/$ADDR" | python3 -c "
import json, sys; d = json.load(sys.stdin)
for b in d['balances']: print(b.get('asset_code','XLM'), b['balance'])
"
# Should show: USDC 0.0000000 (trustline exists)
#              XLM  1.999...
```

### 5. Fund with USDC

Send USDC to your `G...` address from any exchange or wallet that supports Stellar USDC (Circle, Coinbase, etc.). Even $1 gets you 100 ingredient checks.

### 6. Check ingredients

```bash
API_URL="https://dermi-znuq.onrender.com"

ows pay request \
  --wallet my-wallet \
  --no-passphrase \
  --network stellar:pubnet \
  --method POST \
  --body '{"ingredients": ["coconut oil", "niacinamide", "hyaluronic acid"]}' \
  $API_URL/check-skincare-ingredients
```

```
Paid $0.01 on stellar via x402
{"flagged":[{"input":"coconut oil","matched":"Coconut Oil","rating":5,...}],"total_checked":3}
```

---

## Stellar Testnet (free, for testing)

Try it without spending real money.

### 1. Install OWS and create a wallet

Same as mainnet steps 1–2 above.

### 2. Activate on testnet

```bash
ADDR="G...your address..."
curl "https://friendbot.stellar.org/?addr=$ADDR"
```

### 3. Add testnet USDC trustline

```bash
TX_HEX=$(node /tmp/stellar-setup/add-trustline.mjs "$ADDR" testnet)
ows sign send-tx --wallet my-wallet --chain stellar:testnet --tx "$TX_HEX"
```

### 4. Get free testnet USDC

Swap XLM for USDC on the testnet DEX. Create `/tmp/stellar-setup/buy-usdc.mjs`:

```javascript
import * as StellarSdk from "@stellar/stellar-sdk";

const ACCOUNT = process.argv[2];
const USDC_AMOUNT = process.argv[3] || "1";
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
const account = await server.loadAccount(ACCOUNT);
const fee = await server.fetchBaseFee();

const tx = new StellarSdk.TransactionBuilder(account, {
  fee: fee.toString(),
  networkPassphrase: StellarSdk.Networks.TESTNET,
})
  .addOperation(StellarSdk.Operation.pathPaymentStrictReceive({
    sendAsset: StellarSdk.Asset.native(),
    sendMax: (parseFloat(USDC_AMOUNT) * 2).toFixed(7),
    destination: ACCOUNT,
    destAsset: new StellarSdk.Asset("USDC", USDC_ISSUER),
    destAmount: USDC_AMOUNT,
    path: [],
  }))
  .setTimeout(300)
  .build();

console.log(tx.toEnvelope().toXDR("hex"));
```

```bash
TX_HEX=$(node /tmp/stellar-setup/buy-usdc.mjs "$ADDR" "1")
ows sign send-tx --wallet my-wallet --chain stellar:testnet --tx "$TX_HEX"
```

### 5. Check ingredients

```bash
API_URL="https://dermi-znuq.onrender.com"

ows pay request \
  --wallet my-wallet \
  --no-passphrase \
  --network stellar:testnet \
  --method POST \
  --body '{"ingredients": ["coconut oil"]}' \
  $API_URL/check-skincare-ingredients
```

---

## Base Sepolia (EVM testnet)

### 1. Create wallet and fund

Get testnet USDC on Base Sepolia from a faucet. Note your `eip155:1` address from `ows wallet list`.

### 2. Check ingredients

```bash
API_URL="https://dermi-znuq.onrender.com"

ows pay request \
  --wallet my-wallet \
  --no-passphrase \
  --network eip155:84532 \
  --method POST \
  --body '{"ingredients": ["coconut oil"]}' \
  $API_URL/check-skincare-ingredients
```

No ETH needed for gas — the x402 facilitator submits the transaction.

---

## Choosing a network

Use `--network` to pick which chain to pay on:

| Flag | Network | Cost |
|------|---------|------|
| `--network stellar:pubnet` | Stellar Mainnet | Real USDC |
| `--network stellar:testnet` | Stellar Testnet | Free |
| `--network eip155:84532` | Base Sepolia | Free |

Without `--network`, OWS picks the first available option.

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `HTTP 402 {}` | Payment rejected | Check USDC balance, trustline, account activation |
| `UnsupportedChain` | Wallet doesn't support the network | Typo in `--network`? OWS wallets support all chains by default |
| `simulation failed` | Stellar RPC flaky | Retry the request |
| `signature_expiration_too_far` | Stale OWS binary | Rebuild OWS from source |
| `insufficient_balance` | Not enough USDC | Fund your wallet |

## API reference

### `POST /check-skincare-ingredients` — $0.01 USDC

**Request**:
```json
{ "ingredients": ["coconut oil", "niacinamide", "water"] }
```

**Response**:
```json
{
  "flagged": [
    {
      "input": "coconut oil",
      "matched": "Coconut Oil",
      "rating": 5,
      "rating_confidence": "low",
      "fuzzy": false,
      "sources": ["fulton_1989", "emme_diane", "clearstem"]
    }
  ],
  "total_checked": 3
}
```

Only pore-clogging ingredients appear in `flagged`. Safe ingredients are omitted. Max 20 per request.

### Free endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /meta` | Dataset metadata |
| `GET /docs` | Swagger UI |
