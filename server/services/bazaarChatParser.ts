import type { BazaarEvent, BazaarEventKind } from "../../shared/positions.js";

interface Pattern {
  kind: BazaarEventKind;
  regex: RegExp;
}

// Hypixel [Bazaar] chat wordings. Tolerant on punctuation/decimals; any line
// that matches none of these is stored as "unknown" so new wordings can be
// learned from real logs without touching the mod.
const PATTERNS: Pattern[] = [
  {
    kind: "buy_order_setup",
    regex: /Buy Order Setup!\s+([\d,]+)x?\s+(.+?)\s+for\s+([\d,.]+)\s+coins/i,
  },
  {
    kind: "sell_offer_setup",
    regex: /Sell Offer Setup!\s+([\d,]+)x?\s+(.+?)\s+for\s+([\d,.]+)\s+coins/i,
  },
  {
    kind: "buy_order_filled",
    regex: /Your Buy Order for\s+([\d,]+)x?\s+(.+?)\s+was filled/i,
  },
  {
    kind: "sell_offer_filled",
    regex: /Your Sell Offer for\s+([\d,]+)x?\s+(.+?)\s+was filled/i,
  },
  {
    kind: "insta_buy",
    regex: /Bought\s+([\d,]+)x?\s+(.+?)\s+for\s+([\d,.]+)\s+coins/i,
  },
  {
    kind: "insta_sell",
    regex: /Sold\s+([\d,]+)x?\s+(.+?)\s+for\s+([\d,.]+)\s+coins/i,
  },
  {
    kind: "order_cancelled",
    regex: /Cancelled!\s+Refunded\s+(.+)/i,
  },
  {
    // The bazaar's one-click "Flip Order" button: filled buy order becomes a
    // sell offer directly. Message carries expected profit, not the price —
    // the claim receipt supplies the real number later.
    kind: "order_flipped",
    regex: /Order Flipped!\s+([\d,]+)x?\s+(.+?)\s+for\s+([\d,.]+)\s+coins of total expected profit/i,
  },
];

// NPC shop sells use a different shape: "You sold Chum x64 for 320 Coins!"
// (item BEFORE amount, no [Bazaar] prefix).
const NPC_SELL_REGEX = /You sold\s+(.+?)\s+x([\d,]+)\s+for\s+([\d,.]+)\s+Coins/i;

// "Claimed 114,936 coins from selling 64x Enchanted Red Sand at 1,818.6 each!"
// — the definitive sell receipt, with the exact per-unit price.
const CLAIM_SOLD_REGEX =
  /Claimed\s+([\d,.]+)\s+coins?\s+from selling\s+([\d,]+)x?\s+(.+?)\s+at\s+([\d,.]+)\s+each/i;

function num(raw: string): number {
  return parseFloat(raw.replace(/,/g, ""));
}

export function parseBazaarLine(rawLine: string, player: string, timestamp: number): BazaarEvent {
  // Strip Minecraft color codes and leading [Bazaar] tag.
  const clean = rawLine.replace(/§./g, "").trim();

  const claimSold = clean.match(CLAIM_SOLD_REGEX);
  if (claimSold) {
    return {
      kind: "claim_sold",
      player,
      totalCoins: num(claimSold[1]),
      amount: num(claimSold[2]),
      itemName: claimSold[3],
      unitPrice: num(claimSold[4]),
      rawLine: clean,
      timestamp,
    };
  }

  const npcSell = clean.match(NPC_SELL_REGEX);
  if (npcSell) {
    return {
      kind: "npc_sell",
      player,
      itemName: npcSell[1],
      amount: num(npcSell[2]),
      totalCoins: num(npcSell[3]),
      rawLine: clean,
      timestamp,
    };
  }

  for (const { kind, regex } of PATTERNS) {
    const m = clean.match(regex);
    if (!m) continue;

    if (kind === "order_cancelled") {
      return { kind, player, rawLine: clean, timestamp };
    }
    const event: BazaarEvent = {
      kind,
      player,
      amount: num(m[1]),
      itemName: m[2],
      rawLine: clean,
      timestamp,
    };
    if (m[3]) event.totalCoins = num(m[3]);
    return event;
  }

  return { kind: "unknown", player, rawLine: clean, timestamp };
}
