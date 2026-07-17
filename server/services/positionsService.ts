import type { BazaarEvent, TrackedPosition } from "../../shared/positions.js";
import { formatItemName } from "../../shared/itemNames.js";
import { getBazaarProducts } from "./bazaarService.js";
import { getAllItemNames } from "./itemsService.js";
import { kvGet, kvSet } from "./kvStore.js";

let positions: TrackedPosition[] = [];
let unknownLines: string[] = [];
let nextId = 1;

export async function loadPositions(): Promise<void> {
  const raw = await kvGet<{ nextId: number; positions: TrackedPosition[] }>("positions");
  if (!raw) return;
  positions = raw.positions ?? [];
  nextId = raw.nextId ?? positions.length + 1;
}

function persist(): void {
  void kvSet("positions", { nextId, positions });
  void kvSet("unknown-bazaar-lines", unknownLines.slice(-200));
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
  } else if (
    (kind === "sell_offer_filled" || kind === "insta_sell" || kind === "npc_sell") &&
    itemName
  ) {
    const pos = findOpen(player, itemName, "selling") ?? findOpen(player, itemName, "holding");
    if (pos) {
      pos.status = "closed";
      pos.closedAt = timestamp;
      pos.closedBy = kind === "npc_sell" ? "npc" : "bazaar";
      if (kind !== "sell_offer_filled" && amount && totalCoins) {
        pos.sellUnitPrice = totalCoins / amount;
      }
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

export function dismissPosition(id: string): boolean {
  const index = positions.findIndex((p) => p.id === id);
  if (index === -1) return false;
  positions.splice(index, 1);
  persist();
  return true;
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
    if (pos.status === "selling" && pos.sellUnitPrice !== undefined) {
      // Someone listed a sell offer below yours — your exit is stalled
      // until their stock clears or you undercut back.
      enriched.undercut = product.buyPrice < pos.sellUnitPrice - 0.05;
    }
    if (pos.status === "holding" || pos.status === "selling") {
      const plannedExit = pos.sellUnitPrice ?? product.buyPrice;
      enriched.exitDriftPercent = ((product.buyPrice - plannedExit) / plannedExit) * 100;
    }
    return enriched;
  });
}
