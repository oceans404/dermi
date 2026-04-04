# Dermi — Agent Quick Start (Stellar Testnet)

Dermi checks skincare ingredients for pore-clogging potential. Send a list of ingredients, pay $0.01 USDC, get back which ones are comedogenic. Live at **https://dermi-znuq.onrender.com**

This guide uses **Stellar testnet** — all funds are free.

## 1. Install OWS (Open Wallet Standard)

OWS is a multi-chain wallet CLI. Dermi's Stellar support uses a custom fork.

```bash
git clone https://github.com/oceans404/core.git
cd core/ows
cargo build --release
```

The binary is at `./target/release/ows`. Confirm it works:

```bash
./target/release/ows --version
```

## 2. Create a wallet

```bash
./target/release/ows wallet create --name agent-wallet
```

This generates keys for every supported chain. Note the `stellar:pubnet` address — it starts with `G`. The same address works on testnet.

```bash
./target/release/ows wallet list
# Find: stellar:pubnet → G...your address...
```

## 3. Fund the wallet (free)

### 3a. Get testnet XLM from Friendbot

```bash
ADDR="G...your address..."
curl "https://friendbot.stellar.org/?addr=$ADDR"
```

Verify (should show ~10,000 XLM):

```bash
curl -s "https://horizon-testnet.stellar.org/accounts/$ADDR" | python3 -c "
import json, sys; d = json.load(sys.stdin)
for b in d['balances']: print(b.get('asset_code','XLM'), b['balance'])
"
```

### 3b. Add USDC trustline

```bash
mkdir -p /tmp/stellar-setup && cd /tmp/stellar-setup
npm init -y && npm install @stellar/stellar-sdk
```

Create `/tmp/stellar-setup/add-trustline.mjs`:

```javascript
import * as StellarSdk from "@stellar/stellar-sdk";

const ACCOUNT = process.argv[2];
const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
const account = await server.loadAccount(ACCOUNT);
const fee = await server.fetchBaseFee();

const tx = new StellarSdk.TransactionBuilder(account, {
  fee: fee.toString(),
  networkPassphrase: StellarSdk.Networks.TESTNET,
})
  .addOperation(StellarSdk.Operation.changeTrust({
    asset: new StellarSdk.Asset("USDC", "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"),
  }))
  .setTimeout(300)
  .build();

console.log(tx.toEnvelope().toXDR("hex"));
```

Sign and submit:

```bash
ADDR="G...your address..."
TX_HEX=$(node /tmp/stellar-setup/add-trustline.mjs "$ADDR")
./target/release/ows sign send-tx --wallet agent-wallet --chain stellar:testnet --tx "$TX_HEX"
```

### 3c. Swap XLM for testnet USDC

The testnet DEX has XLM/USDC liquidity. Create `/tmp/stellar-setup/buy-usdc.mjs`:

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
./target/release/ows sign send-tx --wallet agent-wallet --chain stellar:testnet --tx "$TX_HEX"
```

Verify (should show 1 USDC):

```bash
curl -s "https://horizon-testnet.stellar.org/accounts/$ADDR" | python3 -c "
import json, sys; d = json.load(sys.stdin)
for b in d['balances']: print(b.get('asset_code','XLM'), b['balance'])
"
```

## 4. Check ingredients

```bash
./target/release/ows pay request \
  --wallet agent-wallet \
  --no-passphrase \
  --network stellar:testnet \
  --method POST \
  --body '{"ingredients": ["coconut oil", "niacinamide", "shea butter"]}' \
  https://dermi-znuq.onrender.com/check-skincare-ingredients
```

Output:

```
Paid $0.01 on stellar-testnet via x402
{"flagged":[{"input":"coconut oil","matched":"Coconut Oil","rating":5,...},{"input":"shea butter","matched":"Shea Butter","rating":4,...}],"total_checked":3}
```

- `flagged` — ingredients that are comedogenic (pore-clogging). Rating scale: 0 (safe) to 5 (highly comedogenic).
- Safe ingredients like `niacinamide` are omitted from the response.
- Max 20 ingredients per request.

## Reference

| | |
|---|---|
| **Endpoint** | `POST https://dermi-znuq.onrender.com/check-skincare-ingredients` |
| **Price** | $0.01 USDC per request |
| **Network** | `stellar:testnet` (Stellar Testnet) |
| **Payment** | x402 — automatic via OWS, no API keys needed |
| **Docs** | https://dermi-znuq.onrender.com/docs |
| **GitHub** | https://github.com/oceans404/dermi |
| **OWS fork** | https://github.com/oceans404/core |
