# 🫧 Dermi

**Your agent's dermatologist. A one penny `/check-skincare-ingredients` x402 call to make sure your agent isn't spending your hard earned $ on a skincare product that will clog your pores.**

> **OWS Hackathon Submission** — Track 03: Pay-Per-Call Services & API Monetization
>
> *Opportunity 02: Pay-per-query database* — A curated comedogenic ingredient dataset compiled from dermatological studies, clinical research (Fulton 1989), and modern practitioner databases (Emme Diane, ClearStem) — merged, deduplicated, and cross-referenced into a single searchable index behind x402. Every query costs $0.01. No API keys, no accounts, no subscriptions — just a wallet and an HTTP request.
>
> | Network | OWS | Price | Agent Guide |
> |---------|-----|-------|-------------|
> | Base Sepolia (testnet) | [oceans404/core](https://github.com/oceans404/core) | $0.01 USDC | [Quick Start](DermiForAgentsOnBaseTestnet.md) |
> | Stellar testnet | [oceans404/core](https://github.com/oceans404/core) (my fork — [details below](#ows-on-stellar)) | $0.01 USDC | [Quick Start](DermiForAgentsOnStellarTestnet.md) |
> | Stellar mainnet | [oceans404/core](https://github.com/oceans404/core) (my fork — [details below](#ows-on-stellar)) | $0.01 USDC | [Quick Start](DermiForAgentsOnStellarMainnet.md) |

The global skincare market is worth [$190 billion](https://www.precedenceresearch.com/skincare-market) and growing. We'll spend $45 on a serum because an influencer said so, but we won't spend one penny to verify the ingredients are safe for our skin.

This past week, the internet was torn over Alix Earle's Reale Actives launch. Despite being marketed as "Acne-Safe," the beauty community quickly identified ingredients like Shea Butter in the Get Bare Cleansing Balm that flag high on comedogenic scales. For an acne-prone girl, a $0.01 comedogenic check ahead of buying a $45 serum is a no-brainer.

Dermi is an agentic dermatologist, a one-penny ingredient checker that shopping agents call before buying any skincare product. It reconciles clinical datasets (Fulton 1989) with modern practitioner insights (Emme Diane, ClearStem) to flag pore-clogging ingredients before your agent swipes their credit card to buy the latest serum on Sephora or Ulta.

## How it works

```
Agent: "Buy the new Alix Earle 'Reale Actives' cleanser, but first check that the ingredients are skin safe."
  ↓
POST /check-skincare-ingredients  →  402 Payment Required ($0.01 USDC)
  ↓ (agent pays $0.01 via OWS on Stellar)
POST /check-skincare-ingredients  →  200 OK
  ↓
Agent: "Hold on — Shea Butter is an ingredient flagged as comedogenic (rating 3). This isn't safe for your acne-prone skin."
```

No API keys. No signup. $0.01 USDC per check on Stellar. A no-brainer when the alternative is a $45 mistake followed by a visit to the real derm.

## OWS on Stellar

At first, Dermi worked on any OWS x402-supported chain (EVM). But I wanted to extend OWS to work on Stellar, so I forked OWS to [oceans404/open-wallet-standard/core](https://github.com/oceans404/core) to add Stellar payments and x402 support and used Dermi to battle-test it end to end. I'm planning a PR to the core repo after the hackathon

### Using the OWS on Stellar fork

```bash
git clone https://github.com/oceans404/core.git
cd core/ows
cargo build --release
```

The `ows` binary is at `core/ows/target/release/ows`. Create a wallet and start paying:

```bash
./target/release/ows wallet create --name my-wallet
./target/release/ows wallet list

./target/release/ows pay request \
  --wallet my-wallet \
  --no-passphrase \
  --network stellar:pubnet \
  --method POST \
  --body '{"ingredients": ["coconut oil"]}' \
  https://dermi-znuq.onrender.com/check-skincare-ingredients
```

See **[BUYER_SETUP.md](BUYER_SETUP.md)** for complete wallet funding and trustline setup.

### Example wallet

```
$ ./target/release/ows wallet create --name example-wallet

Wallet created: eb6f778c-e8b6-4ff9-ba85-cc8219cfecac
Name:           example-wallet

  stellar:pubnet → GC5JZJYTRWUK2SJP46O54U7FQJXVOY5SRNCZFSCNDLZWZNANGKXTGDMY
  eip155:1 → 0x210F77aC72B5b667a6Cf349a2ce9CaadC0A6C0e6
  solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp → 8KCeKvNrhpwyJo9BdAcQfEMuiQhoCGfqDUFMcHJoiFLs
  bip122:000000000019d6689c085ae165831e93 → bc1qpkmzhasp788mwmuaswaal9rqjye0up232ynm36
  cosmos:cosmoshub-4 → cosmos1zkz7g2eavsjrxuwfgdrvzajz67dwu0teg2y444
  tron:mainnet → TTN83wSQ6WALsSXGMyHezYJWczXPvvHNdj
  ton:mainnet → UQBzCf2vK88ZcHeZv-rUccukpxNNpuvszZlDBtls8v5k8cp2
  fil:mainnet → f1dvf4rohtxq5wtkt4fywyqgcigpicwui4iohufgi
  sui:mainnet → 0xff6e17e4578aa96cbc08d6b348de031a92b9de274f8f39b515e5b54f2fdb7435
  xrpl:mainnet → r3FfdY81Jw8mH4CQjAr5vzT41Tt2ucP4YP
```

One wallet, every chain. The Stellar address is what you'll fund with USDC to pay for Dermi checks.

## The API

| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /check-skincare-ingredients` | $0.01 USDC | Check ingredients for pore-clogging potential |
| `GET /health` | Free | Health check |
| `GET /meta` | Free | Dataset metadata |
| `GET /docs` | Free | Swagger UI |

### Example

```bash
ows pay request \
  --wallet my-wallet \
  --no-passphrase \
  --network stellar:pubnet \
  --method POST \
  --body '{"ingredients": ["coconut oil", "niacinamide", "shea butter"]}' \
  https://dermi-znuq.onrender.com/check-skincare-ingredients
```

```
Paid $0.01 on stellar via x402
```

```json
{
  "flagged": [
    {
      "input": "coconut oil",
      "matched": "Coconut Oil",
      "rating": 5,
      "sources": ["fulton_1989", "emme_diane", "clearstem"]
    },
    {
      "input": "shea butter",
      "matched": "Shea Butter",
      "rating": 3,
      "sources": ["emme_diane"]
    }
  ],
  "total_checked": 3
}
```

Only pore-clogging ingredients appear in `flagged`. Safe ingredients are omitted. Max 20 per request.

## Payment networks

| Network | Facilitator | Type |
|---------|-------------|------|
| `stellar:pubnet` | [OpenZeppelin](https://channels.openzeppelin.com/x402) | Mainnet (real USDC) |
| `stellar:testnet` | [x402.org](https://www.x402.org) | Testnet |
| `eip155:84532` | [x402.org](https://www.x402.org) | Testnet (Base Sepolia) |

## Buyer setup

See **[BUYER_SETUP.md](BUYER_SETUP.md)** for complete wallet setup — Stellar mainnet, testnet, and Base Sepolia.

## Running the server

```bash
npm install
cp .env.example .env          # add your wallet addresses + OZ API key
npm run build:index            # compile ingredient database
npm run dev                    # start server
```

See [`.env.example`](.env.example) for all configuration options. When no payment addresses are set, all endpoints are free.

## Data sources

1. **Fulton 1989 Study** — comedogenicity ratings from the original rabbit-ear assay
2. **Emme Diane** — curated comedogenic ingredient list with ratings
3. **ClearStem** — binary pore-clogging flags (no numeric ratings)

Rebuild after modifying sources: `npm run build:index`

## Why I built this

I'm an acne-prone girl. I know that "Dermatologist-Tested" doesn't always mean "My-Skin-Safe." I built Dermi to turn viral marketing into verified science, ensuring that in the future of AI commerce, our agents are as obsessed with our skin's progress as we are.
