export interface BazaarOrderSummary {
  amount: number;
  pricePerUnit: number;
  orders: number;
}

export interface BazaarProduct {
  productId: string;
  buyPrice: number;
  sellPrice: number;
  buyVolume: number;
  sellVolume: number;
  buyMovingWeek: number;
  sellMovingWeek: number;
  buyOrders: number;
  sellOrders: number;
  // Units sitting at the best price on each side — a price backed by a
  // tiny wall is fragile (the Phanpyre lesson).
  buyWallUnits: number;
  sellWallUnits: number;
}

export interface RecipeIngredient {
  itemId: string;
  count: number;
}

export interface ItemRecipe {
  itemId: string;
  ingredients: RecipeIngredient[];
}

export type FlipType = "spread" | "craft" | "npc";

export interface ManipulationCheck {
  // Current sell-side price divided by the item's rolling median.
  // Undefined until enough history has been collected.
  medianRatio?: number;
  suspicious?: boolean;
}

export interface TradeActivity {
  // Units actually traded per day (moving-week average from Hypixel).
  tradedPerDay: number;
  // Coins moved per day (units x price) — the market-health filter metric.
  coinsPerDay: number;
}

export type FlipVerdict = "good" | "risky" | "avoid";

export interface SpreadFlip extends ManipulationCheck, TradeActivity {
  type: "spread";
  itemId: string;
  buyOrderPrice: number;
  sellOrderPrice: number;
  marginPercent: number;
  profitPerUnit: number;
  volumeScore: number;
  profitPerHour: number;
  // How lopsided the two flows are (1 = balanced; big = one dead lane).
  flowImbalance: number;
  // Units backing the fragile side's best price.
  priceWallUnits: number;
  // Competing buy orders per 1k units of daily flow (crowding).
  contention: number;
  verdict?: FlipVerdict;
  verdictReason?: string;
}

export interface CraftFlip extends ManipulationCheck, TradeActivity {
  type: "craft";
  itemId: string;
  craftCost: number;
  sellPrice: number;
  marginPercent: number;
  profitPerUnit: number;
  ingredients: RecipeIngredient[];
}

export interface NpcFlip extends ManipulationCheck, TradeActivity {
  type: "npc";
  itemId: string;
  direction: "reverse" | "npc_to_market";
  costPrice: number;
  revenuePrice: number;
  marginPercent: number;
  profitPerUnit: number;
  dailyLimit?: number;
  profitPerDay?: number;
}

export type FlipOpportunity = SpreadFlip | CraftFlip | NpcFlip;
