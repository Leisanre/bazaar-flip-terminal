import { BAZAAR_TAX_RATE } from "./constants.js";
import type { TrackedPosition } from "./positions.js";

// Single source of truth for profit math — used by the website stats bar,
// the Discord alerts, and the daily report.
export function realizedProfit(pos: TrackedPosition): number | null {
  if (pos.status !== "closed" || pos.sellUnitPrice === undefined) return null;
  const tax = pos.closedBy === "npc" ? 0 : BAZAAR_TAX_RATE;
  return (pos.sellUnitPrice * (1 - tax) - pos.buyUnitPrice) * pos.amount;
}

export interface ProfitSummary {
  todayProfit: number;
  allTimeProfit: number;
  closedCount: number;
  todayClosedCount: number;
  winCount: number;
  openExposure: number;
  coinsCycled: number;
  bestItem: string | null;
  bestItemProfit: number;
}

export function summarizeProfit(positions: TrackedPosition[]): ProfitSummary {
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const byItem = new Map<string, number>();
  let todayProfit = 0;
  let allTimeProfit = 0;
  let closedCount = 0;
  let todayClosedCount = 0;
  let winCount = 0;
  let openExposure = 0;
  let coinsCycled = 0;

  for (const pos of positions) {
    if (pos.status !== "closed") {
      openExposure += pos.buyUnitPrice * pos.amount;
      continue;
    }
    const profit = realizedProfit(pos);
    if (profit === null) continue;
    closedCount++;
    allTimeProfit += profit;
    coinsCycled += pos.buyUnitPrice * pos.amount;
    if (profit > 0) winCount++;
    if ((pos.closedAt ?? 0) >= startOfToday) {
      todayProfit += profit;
      todayClosedCount++;
    }
    byItem.set(pos.itemName, (byItem.get(pos.itemName) ?? 0) + profit);
  }

  let bestItem: string | null = null;
  let bestItemProfit = -Infinity;
  for (const [item, profit] of byItem) {
    if (profit > bestItemProfit) {
      bestItem = item;
      bestItemProfit = profit;
    }
  }

  return {
    todayProfit,
    allTimeProfit,
    closedCount,
    todayClosedCount,
    winCount,
    openExposure,
    coinsCycled,
    bestItem,
    bestItemProfit: bestItem ? bestItemProfit : 0,
  };
}
