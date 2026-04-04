# Dermi — Agent Quick Start (Stellar Mainnet)

Dermi checks skincare ingredients for pore-clogging potential. Send a list of ingredients, pay $0.01 USDC, get back which ones are comedogenic. Live at **https://dermi-znuq.onrender.com**

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

This generates keys for every supported chain. Note the `stellar:pubnet` address — it starts with `G`.

```bash
./target/release/ows wallet list
# Find: stellar:pubnet → G...your address...
```

## 3. Fund the wallet

Your Stellar address needs three things: XLM to activate, a USDC trustline, and USDC to pay.

### 3a. Send XLM

Send **at least 2 XLM** to your `G...` address from any exchange (Coinbase, Kraken, etc.).

Verify:

```bash
ADDR="G...your address..."
curl -s "https://horizon.stellar.org/accounts/$ADDR" | python3 -c "
import json, sys; d = json.load(sys.stdin)
for b in d['balances']: print(b.get('asset_code','XLM'), b['balance'])
"
```

### 3b. Add USDC trustline

Stellar requires a one-time trustline before your wallet can hold USDC.

```bash
mkdir -p /tmp/stellar-setup && cd /tmp/stellar-setup
npm init -y && npm install @stellar/stellar-sdk
```

Create `/tmp/stellar-setup/add-trustline.mjs`:

```javascript
import * as StellarSdk from "@stellar/stellar-sdk";

const ACCOUNT = process.argv[2];
const server = new StellarSdk.Horizon.Server("https://horizon.stellar.org");
const account = await server.loadAccount(ACCOUNT);
const fee = await server.fetchBaseFee();

const tx = new StellarSdk.TransactionBuilder(account, {
  fee: fee.toString(),
  networkPassphrase: StellarSdk.Networks.PUBLIC,
})
  .addOperation(StellarSdk.Operation.changeTrust({
    asset: new StellarSdk.Asset("USDC", "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"),
  }))
  .setTimeout(300)
  .build();

console.log(tx.toEnvelope().toXDR("hex"));
```

Sign and submit:

```bash
ADDR="G...your address..."
TX_HEX=$(node /tmp/stellar-setup/add-trustline.mjs "$ADDR")
./target/release/ows sign send-tx --wallet agent-wallet --chain stellar:pubnet --tx "$TX_HEX" \
  --rpc-url "https://soroban-rpc.mainnet.stellar.gateway.fm"
```

### 3c. Send USDC

Send USDC to your `G...` address from any exchange that supports Stellar USDC. Even $1 gets you 100 Dermi checks.

## 4. Check ingredients

```bash
./target/release/ows pay request \
  --wallet agent-wallet \
  --no-passphrase \
  --network stellar:pubnet \
  --method POST \
  --body '{"ingredients": ["coconut oil", "niacinamide", "shea butter"]}' \
  https://dermi-znuq.onrender.com/check-skincare-ingredients
```

Output:

```
Paid $0.01 on stellar via x402
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
| **Network** | `stellar:pubnet` (Stellar Mainnet) |
| **Payment** | x402 — automatic via OWS, no API keys needed |
| **Docs** | https://dermi-znuq.onrender.com/docs |
| **GitHub** | https://github.com/oceans404/dermi |
| **OWS fork** | https://github.com/oceans404/core |
