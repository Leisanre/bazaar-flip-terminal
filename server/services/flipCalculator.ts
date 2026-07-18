import {
  BAZAAR_TAX_RATE,
  MIN_MARGIN_PERCENT,
  MIN_VOLUME_THRESHOLD,
  MAX_SPREAD_MARGIN_PERCENT,
  MIN_ORDER_COUNT,
  MIN_DAILY_COINS_SPREAD,
  MIN_DAILY_COINS_OTHER,
  MIN_DAILY_UNITS_SPREAD,
  SAFE_MODE_MIN_DAILY_TRADED,
  VERDICT_MARGIN_SWEET_MAX,
  VERDICT_RISKY_FLOW_IMBALANCE,
  VERDICT_AVOID_FLOW_IMBALANCE,
  THIN_WALL_UNITS,
  CONTESTED_ORDERS_PER_1K_FLOW,
} from "../../shared/constants.js";
import type { BazaarProduct, CraftFlip, ItemRecipe, NpcFlip, SpreadFlip } from "../../shared/types.js";

function marginPercent(cost: number, revenueAfterTax: number): number {
  if (cost <= 0) return 0;
  return ((revenueAfterTax - cost) / cost) * 100;
}

const HOURS_PER_WEEK = 168;

export function calculateSpreadFlip(product: BazaarProduct): SpreadFlip | null {
  // quick_status pairing: buyPrice/buyOrders/buyMovingWeek describe the
  // insta-buy side (existing sell offers); sellPrice/sellOrders/sellMovingWeek
  // describe the insta-sell side (existing buy orders). A spread flip needs
  // both books alive.
  if (product.buyOrders < MIN_ORDER_COUNT || product.sellOrders < MIN_ORDER_COUNT) return null;

  const buyOrderPrice = product.sellPrice;
  const sellOrderPrice = product.buyPrice;
  if (buyOrderPrice <= 0 || sellOrderPrice <= buyOrderPrice) return null;

  const revenueAfterTax = sellOrderPrice * (1 - BAZAAR_TAX_RATE);
  const profitPerUnit = revenueAfterTax - buyOrderPrice;
  const margin = marginPercent(buyOrderPrice, revenueAfterTax);
  const volumeScore = Math.min(product.buyVolume, product.sellVolume);

  if (
    margin < MIN_MARGIN_PERCENT ||
    margin > MAX_SPREAD_MARGIN_PERCENT ||
    volumeScore < MIN_VOLUME_THRESHOLD
  )
    return null;

  // Coflnet-style throughput metric: units actually traded per hour (the
  // slower side of the moving-week average) x profit per unit. Ranks a 3%
  // margin that fills constantly above a 100% margin that fills never.
  const slowerSideWeekly = Math.min(product.buyMovingWeek, product.sellMovingWeek);
  const fasterSideWeekly = Math.max(product.buyMovingWeek, product.sellMovingWeek);
  const tradedPerDay = slowerSideWeekly / 7;
  const coinsPerDay = tradedPerDay * sellOrderPrice;
  if (coinsPerDay < MIN_DAILY_COINS_SPREAD || tradedPerDay < MIN_DAILY_UNITS_SPREAD) return null;

  return {
    type: "spread",
    itemId: product.productId,
    buyOrderPrice,
    sellOrderPrice,
    marginPercent: margin,
    profitPerUnit,
    volumeScore,
    profitPerHour: profitPerUnit * (slowerSideWeekly / HOURS_PER_WEEK),
    tradedPerDay,
    coinsPerDay,
    flowImbalance: slowerSideWeekly > 0 ? fasterSideWeekly / slowerSideWeekly : Infinity,
    priceWallUnits: Math.min(product.buyWallUnits, product.sellWallUnits),
    contention: product.buyOrders / (tradedPerDay / 1000),
  };
}

// Rolls every taught rule into one label. Call AFTER the manipulation check
// has been attached so the suspicious/medianRatio fields are populated.
export function attachVerdict(flip: SpreadFlip): SpreadFlip {
  const reasons: string[] = [];
  let verdict: "good" | "risky" | "avoid" = "good";

  if (flip.suspicious) {
    verdict = "avoid";
    reasons.push(`price is ${flip.medianRatio?.toFixed(1)}x its normal level — likely pump`);
  } else if (flip.flowImbalance > VERDICT_AVOID_FLOW_IMBALANCE) {
    verdict = "avoid";
    reasons.push(
      `one-sided market (${flip.flowImbalance.toFixed(0)}x flow imbalance) — exit will crawl`
    );
  } else {
    if (flip.medianRatio === undefined) {
      verdict = "risky";
      reasons.push("price history still warming up");
    }
    if (flip.marginPercent > VERDICT_MARGIN_SWEET_MAX) {
      verdict = "risky";
      reasons.push(`${flip.marginPercent.toFixed(0)}% margin is above the honest zone — ask why`);
    }
    if (flip.tradedPerDay < SAFE_MODE_MIN_DAILY_TRADED) {
      verdict = "risky";
      reasons.push("under 500k traded/day — slower fills");
    }
    if (flip.flowImbalance > VERDICT_RISKY_FLOW_IMBALANCE) {
      verdict = "risky";
      reasons.push(`${flip.flowImbalance.toFixed(0)}x flow imbalance — one lane is slow`);
    }
    if (flip.priceWallUnits < THIN_WALL_UNITS) {
      verdict = "risky";
      reasons.push(
        `best price backed by only ${flip.priceWallUnits} units — fragile, may vanish`
      );
    }
    if (flip.contention > CONTESTED_ORDERS_PER_1K_FLOW) {
      verdict = "risky";
      reasons.push(
        `heavily contested (${flip.contention.toFixed(1)} competing orders per 1k daily flow) — expect undercut wars`
      );
    }
  }

  if (reasons.length === 0) reasons.push("balanced flows, honest margin, deep market");
  return { ...flip, verdict, verdictReason: reasons.join("; ") };
}

export function calculateCraftFlip(
  recipe: ItemRecipe,
  bazaarByItem: Map<string, BazaarProduct>
): CraftFlip | null {
  const sellProduct = bazaarByItem.get(recipe.itemId);
  if (!sellProduct || sellProduct.buyOrders < MIN_ORDER_COUNT) return null;

  let craftCost = 0;
  for (const ingredient of recipe.ingredients) {
    const ingredientProduct = bazaarByItem.get(ingredient.itemId);
    if (!ingredientProduct || ingredientProduct.sellOrders < MIN_ORDER_COUNT) return null;
    craftCost += ingredientProduct.buyPrice * ingredient.count;
  }
  if (craftCost <= 0) return null;

  const revenueAfterTax = sellProduct.sellPrice * (1 - BAZAAR_TAX_RATE);
  const margin = marginPercent(craftCost, revenueAfterTax);
  if (margin < MIN_MARGIN_PERCENT || margin > MAX_SPREAD_MARGIN_PERCENT) return null;

  // Revenue arrives via a sell order, filled by insta-buyers of the crafted item.
  const tradedPerDay = sellProduct.buyMovingWeek / 7;
  const coinsPerDay = tradedPerDay * sellProduct.sellPrice;
  if (coinsPerDay < MIN_DAILY_COINS_OTHER) return null;

  return {
    type: "craft",
    itemId: recipe.itemId,
    craftCost,
    sellPrice: sellProduct.sellPrice,
    marginPercent: margin,
    profitPerUnit: revenueAfterTax - craftCost,
    ingredients: recipe.ingredients,
    tradedPerDay,
    coinsPerDay,
  };
}

export function calculateReverseNpcFlip(
  product: BazaarProduct,
  npcSellPrice: number
): NpcFlip | null {
  // costPrice is the insta-buy price, backed by buyOrders (fillability).
  // sellOrders is a market-sanity check: if the API's npc_sell_price were a
  // real coin floor, players would keep buy orders near it — a dead buy-order
  // book (e.g. GRAVEL, sellOrders: 0) signals the NPC price isn't realizable.
  if (product.buyOrders < MIN_ORDER_COUNT || product.sellOrders < MIN_ORDER_COUNT) return null;

  const costPrice = product.buyPrice;
  if (costPrice <= 0 || npcSellPrice <= costPrice) return null;

  const margin = marginPercent(costPrice, npcSellPrice);
  if (margin < MIN_MARGIN_PERCENT) return null;

  // Supply comes from insta-buying player sell offers.
  const tradedPerDay = product.buyMovingWeek / 7;
  const coinsPerDay = tradedPerDay * costPrice;
  if (coinsPerDay < MIN_DAILY_COINS_OTHER) return null;

  return {
    type: "npc",
    itemId: product.productId,
    direction: "reverse",
    costPrice,
    revenuePrice: npcSellPrice,
    marginPercent: margin,
    profitPerUnit: npcSellPrice - costPrice,
    tradedPerDay,
    coinsPerDay,
  };
}

export function calculateForwardNpcFlip(
  product: BazaarProduct,
  npcBuyPrice: number,
  dailyLimit: number
): NpcFlip | null {
  // Revenue comes from a sell order near the insta-buy price, backed by buyOrders.
  if (product.buyOrders < MIN_ORDER_COUNT) return null;

  const sellOrderPrice = product.buyPrice;
  if (npcBuyPrice <= 0 || sellOrderPrice <= npcBuyPrice) return null;

  const revenueAfterTax = sellOrderPrice * (1 - BAZAAR_TAX_RATE);
  const margin = marginPercent(npcBuyPrice, revenueAfterTax);
  const profitPerUnit = revenueAfterTax - npcBuyPrice;
  if (margin < MIN_MARGIN_PERCENT) return null;

  // Revenue arrives via a sell order, filled by insta-buyers.
  const tradedPerDay = product.buyMovingWeek / 7;
  const coinsPerDay = tradedPerDay * sellOrderPrice;
  if (coinsPerDay < MIN_DAILY_COINS_OTHER) return null;

  return {
    type: "npc",
    itemId: product.productId,
    direction: "npc_to_market",
    costPrice: npcBuyPrice,
    revenuePrice: sellOrderPrice,
    marginPercent: margin,
    profitPerUnit,
    dailyLimit,
    profitPerDay: profitPerUnit * dailyLimit,
    tradedPerDay,
    coinsPerDay,
  };
}
