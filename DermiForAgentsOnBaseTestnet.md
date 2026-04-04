# Dermi — Agent Quick Start (Base Sepolia Testnet)

Dermi checks skincare ingredients for pore-clogging potential. Send a list of ingredients, pay $0.01 USDC, get back which ones are comedogenic. Live at **https://dermi-znuq.onrender.com**

This guide uses **Base Sepolia** (EVM testnet) — all funds are free.

## 1. Install OWS (Open Wallet Standard)

OWS is a multi-chain wallet CLI. We use a custom fork that adds Stellar support — so the same wallet works if you want to try Dermi on Stellar too.

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
./target/release/ows wallet list
# Find: eip155:1 → 0x...your address...
```

Note the `eip155:1` address — this is your EVM address across all EVM chains including Base Sepolia.

## 3. Fund the wallet (free)

### 3a. Get testnet USDC on Base Sepolia

Get Base Sepolia USDC from a faucet. The USDC contract on Base Sepolia is `0x036CbD53842c5426634e7929541eC2318f3dCF7e`.

You need USDC in your `0x...` address. No ETH is needed — the x402 facilitator pays gas.

Verify your balance:

```bash
ADDR="0x...your address without 0x prefix..."
curl -s -X POST https://sepolia.base.org -H "Content-Type: application/json" -d "{
  \"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"eth_call\",
  \"params\":[{
    \"to\":\"0x036CbD53842c5426634e7929541eC2318f3dCF7e\",
    \"data\":\"0x70a08231000000000000000000000000${ADDR}\"
  }, \"latest\"]
}" | python3 -c "import sys,json; r=json.load(sys.stdin); print('USDC:', int(r['result'], 16) / 1e6)"
```

## 4. Check ingredients

```bash
./target/release/ows pay request \
  --wallet agent-wallet \
  --no-passphrase \
  --network eip155:84532 \
  --method POST \
  --body '{"ingredients": ["coconut oil", "niacinamide", "shea butter"]}' \
  https://dermi-znuq.onrender.com/check-skincare-ingredients
```

Output:

```
Paid $0.01 on eip155:84532 via x402
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
| **Network** | `eip155:84532` (Base Sepolia) |
| **Payment** | x402 — automatic via OWS, no API keys needed |
| **Docs** | https://dermi-znuq.onrender.com/docs |
| **GitHub** | https://github.com/oceans404/dermi |
| **OWS fork** | https://github.com/oceans404/core |
| **Try on Stellar** | [Stellar Testnet guide](DermiForAgentsOnStellarTestnet.md) · [Stellar Mainnet guide](DermiForAgentsOnStellarMainnet.md) |
