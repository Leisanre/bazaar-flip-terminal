# Bazaar Flip Terminal

Local dashboard for finding profitable flips on the Hypixel SkyBlock Bazaar.

## What it does

Polls the official [Hypixel Public API](https://api.hypixel.net) bazaar endpoint every ~20s and computes three flip strategies:

- **Bazaar Spread** — buy order low / sell order high, tax-adjusted margin, volume-filtered
- **Craft Flips** — buy raw materials on the bazaar, craft, sell finished item higher (recipes sourced from the [NotEnoughUpdates-REPO](https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO) community dataset)
- **Manipulation detection** — samples every item's insta-buy price every 5 minutes into a rolling 48h window (persisted to `data-cache/price-history.json`). Once ~3 hours of history exists, any flip whose price is more than 2x its own median gets a "⚠ pumped" badge — the classic pump-and-dump signature. Until the warm-up completes, no flags show.
- **NPC Flips** — both directions:
  - *Bazaar → NPC (reverse)*: bazaar buy price sits below the guaranteed NPC sell price (a hard price floor)
  - *NPC → Bazaar (forward)*: buy a raw material at a fixed NPC vendor price, resell on the bazaar; profit is capped by the NPC's daily purchase limit (`profitPerDay`)

Auction House flipping is intentionally out of scope — it needs NBT attribute/reforge pricing, a much bigger build.

## Data sources

| Source | Endpoint | Key required | Refresh |
|---|---|---|---|
| Bazaar prices | `api.hypixel.net/v2/skyblock/bazaar` | No | 20s |
| NPC sell prices / item tiers | `api.hypixel.net/v2/resources/skyblock/items` | No | 6h |
| Crafting recipes | NotEnoughUpdates-REPO GitHub archive | No | 24h |
| NPC vendor buy prices (forward flips) | `server/data/npcShopPrices.ts` — manual static snapshot | No | never (static) |

No Hypixel API key needed for anything live. The one static exception: NPC *vendor buy* prices (what you pay an NPC merchant to purchase raw materials) aren't exposed by any public Hypixel API endpoint — the official API only has `npc_sell_price`, the opposite direction. `server/data/npcShopPrices.ts` is a hand-entered snapshot cross-checked against known bazaar product IDs and spot-verified against live data (e.g. computed Packed Ice sell price matched a reference site within 0.05%). Vendor prices rarely change, but this is not live — verify in-game before big buys, and treat it as a starting point.

## Setup

```bash
npm install
```

## Run

Two processes, two terminals:

```bash
npx tsx watch server/index.ts   # API server on :4000
npx vite                        # dashboard on :5173 (proxies /api to :4000)
```

Open `http://localhost:5173`.

## Build

```bash
npm run build     # typechecks server + client, builds dist-server/ and dist-client/
npm start         # runs the built server from dist-server/
```

## Dependencies

- `express`, `cors` — API server
- `adm-zip` — extracts the NEU recipe archive in-memory
- `react`, `react-dom`, `vite` — dashboard
- `typescript`, `tsx` — typecheck + dev runtime

## Known limitations

- Margins are computed from `quick_status` (aggregate book totals), not full order-book depth. The Hypixel community has documented `quick_status` buy/sell prices as sometimes not representative of a real fillable price on thin books. Mitigations in place:
  - Requires >=3 distinct orders on both sides of the book (`buyOrders`/`sellOrders`) before trusting a price. For reverse-NPC flips the buy-order book doubles as a market-sanity check: if the API's `npc_sell_price` were a real coin floor, players would keep buy orders near it — a dead book (e.g. GRAVEL) signals the NPC price isn't realizable.
  - Spread flips are ranked by **profit/hour** (profit per unit x the slower side's moving-week volume / 168), the same throughput-first ranking Coflnet's scanner uses — a 3% margin that fills constantly beats a 100% margin that never fills.
  - Spread/craft margins are capped at 300% to filter obvious illiquid noise.
  - Forward NPC flips are margin-uncapped (fixed vendor cost), but liquidity-filtered on the bazaar revenue side.
  - `npc_sell_price` itself is occasionally buggy for specific items in-game (sporadically patched by Hypixel) — not something this tool can detect.
- Icons are pulled from a public vanilla-Minecraft texture CDN by material type — custom SkyBlock-skinned items (skulls) don't get an icon since the vanilla texture would be wrong (a generic player head), not the real skin.
- Craft flip cost is 1 level deep — doesn't recursively price sub-crafted ingredients.
