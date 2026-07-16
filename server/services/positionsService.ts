import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import type { BazaarEvent, TrackedPosition } from "../../shared/positions.js";
import { formatItemName } from "../../shared/itemNames.js";
import { getBazaarProducts } from "./bazaarService.js";
import { getAllItemNames } from "./itemsService.js";

const CACHE_DIR = path.resolve("data-cache");
const POSITIONS_FILE = path.join(CACHE_DIR, "positions.json");
const UNKNOWN_LINES_FILE = path.join(CACHE_DIR, "unknown-bazaar-lines.json");

let positions: TrackedPosition[] = [];
let unknownLines: string[] = [];
let nextId = 1;

export function loadPositions(): void {
  if (!existsSync(POSITIONS_FILE)) return;
  try {
    const raw = JSON.parse(readFileSync(POSITIONS_FILE, "utf-8"));
    positions = raw.positions ?? [];
    nextId = raw.nextId ?? positions.length + 1;
  } catch (err) {
    console.error("positions file unreadable, starting fresh", err);
  }
}

function persist(): void {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(POSITIONS_FILE, JSON.stringify({ nextId, positions }));
    writeFileSync(UNKNOWN_LINES_FILE, JSON.stringify(unknownLines.slice(-200)));
  } catch (err) {
    console.error("positions persist failed", err);
  }
}

function findOpen(player: string, itemName: string, status: TrackedPosition["status"]) {
  return positions.find(
    (p) =>
      p.player === player &&
      p.status === status &&
      p.itemName.toLowerCase() === itemName.toLowerCase()
  );
}

// Display name -> bazaar item id, built lazily from the items resource plus
// the reconstructed-name fallback over live bazaar ids.
function resolveItemId(itemName: string): string | undefined {
  const lower = itemName.toLowerCase();
  for (const [id, name] of getAllItemNames()) {
    if (name.toLowerCase() === lower) return id;
  }
  for (const product of getBazaarProducts()) {
    if (formatItemName(product.productId).toLowerCase() === lower) return product.productId;
  }
  return undefined;
}

export function applyEvent(event: BazaarEvent): void {
  const { kind, player, itemName, amount, totalCoins, timestamp } = event;

  if (kind === "unknown") {
    unknownLines.push(event.rawLine);
    persist();
    return;
  }
  if (!itemName || !amount) {
    if (kind !== "order_cancelled") return;
  }

  if (kind === "buy_order_setup" && itemName && amount && totalCoins) {
    positions.push({
      id: String(nextId++),
      player,
      itemName,
      itemId: resolveItemId(itemName),
      amount,
      buyUnitPrice: totalCoins / amount,
      status: "waiting_fill",
      openedAt: timestamp,
    });
  } else if (kind === "buy_order_filled" && itemName) {
    const pos = findOpen(player, itemName, "waiting_fill");
    if (pos) pos.status = "holding";
  } else if (kind === "insta_buy" && itemName && amount && totalCoins) {
    positions.push({
      id: String(nextId++),
      player,
      itemName,
      itemId: resolveItemId(itemName),
      amount,
      buyUnitPrice: totalCoins / amount,
      status: "holding",
      openedAt: timestamp,
    });
  } else if (kind === "sell_offer_setup" && itemName && amount && totalCoins) {
    const pos = findOpen(player, itemName, "holding");
    if (pos) {
      pos.status = "selling";
      pos.sellUnitPrice = totalCoins / amount;
    }
  } else if ((kind === "sell_offer_filled" || kind === "insta_sell") && itemName) {
    const pos = findOpen(player, itemName, "selling") ?? findOpen(player, itemName, "holding");
    if (pos) {
      pos.status = "closed";
      pos.closedAt = timestamp;
      if (kind === "insta_sell" && amount && totalCoins) pos.sellUnitPrice = totalCoins / amount;
    }
  } else if (kind === "order_cancelled") {
    // Wording doesn't identify the item reliably; cancel the newest open order.
    const open = [...positions]
      .reverse()
      .find((p) => p.player === player && (p.status === "waiting_fill" || p.status === "selling"));
    if (open) {
      if (open.status === "waiting_fill") open.status = "closed";
      else open.status = "holding";
    }
  }
  persist();
}

export function getPositions(): TrackedPosition[] {
  const byId = new Map(getBazaarProducts().map((p) => [p.productId, p]));
  return positions.map((pos) => {
    if (!pos.itemId) return pos;
    const product = byId.get(pos.itemId);
    if (!product) return pos;
    const enriched: TrackedPosition = {
      ...pos,
      currentTopBuyOrder: product.sellPrice,
      currentLowestSellOffer: product.buyPrice,
    };
    if (pos.status === "waiting_fill") {
      enriched.outbid = product.sellPrice > pos.buyUnitPrice + 0.05;
    }
    if (pos.status === "holding" || pos.status === "selling") {
      const plannedExit = pos.sellUnitPrice ?? product.buyPrice;
      enriched.exitDriftPercent = ((product.buyPrice - plannedExit) / plannedExit) * 100;
    }
    return enriched;
  });
}
