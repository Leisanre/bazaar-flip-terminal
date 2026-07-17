import { REALISTIC_FILL_SHARE } from "../../shared/constants.js";
import type { FlipOpportunity } from "../../shared/types.js";

function costPerUnit(flip: FlipOpportunity): number {
  if (flip.type === "spread") return flip.buyOrderPrice;
  if (flip.type === "craft") return flip.craftCost;
  return flip.costPrice;
}

// "With MY coins, what does this flip realistically earn per day?"
// Capped by what the budget affords, a realistic share of daily trades,
// and (for forward NPC flips) the vendor's daily purchase limit.
export function yourProfitPerDay(flip: FlipOpportunity, budget: number): number {
  const cost = costPerUnit(flip);
  if (budget <= 0 || cost <= 0) return 0;

  const unitsAffordable = Math.floor(budget / cost);
  let unitsFillable = flip.tradedPerDay * REALISTIC_FILL_SHARE;
  if (flip.type === "npc" && flip.dailyLimit) {
    unitsFillable = Math.min(unitsFillable, flip.dailyLimit);
  }

  return Math.min(unitsAffordable, unitsFillable) * flip.profitPerUnit;
}

// "If I put my whole budget in, how long until the buy side fills?"
// Order size / your realistic share of the hourly flow.
export function estimatedFillMinutes(flip: FlipOpportunity, budget: number): number | null {
  const cost = costPerUnit(flip);
  if (budget <= 0 || cost <= 0 || flip.tradedPerDay <= 0) return null;
  const units = Math.floor(budget / cost);
  if (units === 0) return null;
  const unitsPerMinute = (flip.tradedPerDay * REALISTIC_FILL_SHARE) / (24 * 60);
  return units / unitsPerMinute;
}

export function formatFillTime(minutes: number | null): string {
  if (minutes === null) return "—";
  if (minutes < 1) return "<1 min";
  if (minutes < 60) return `~${Math.round(minutes)} min`;
  if (minutes < 24 * 60) return `~${(minutes / 60).toFixed(1)} hr`;
  return "1 day+";
}
