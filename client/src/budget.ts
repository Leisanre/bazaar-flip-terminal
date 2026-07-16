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
