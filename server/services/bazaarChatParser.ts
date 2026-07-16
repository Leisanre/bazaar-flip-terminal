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
];

function num(raw: string): number {
  return parseFloat(raw.replace(/,/g, ""));
}

export function parseBazaarLine(rawLine: string, player: string, timestamp: number): BazaarEvent {
  // Strip Minecraft color codes and leading [Bazaar] tag.
  const clean = rawLine.replace(/§./g, "").trim();

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
