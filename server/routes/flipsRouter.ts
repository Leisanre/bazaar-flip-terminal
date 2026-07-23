import { Router } from "express";
import { getBazaarProducts, getBazaarLastUpdated } from "../services/bazaarService.js";
import { getAllRecipes } from "../services/recipeService.js";
import { getAllNpcSellPrices } from "../services/itemsService.js";
import {
  calculateSpreadFlip,
  calculateCraftFlip,
  calculateReverseNpcFlip,
  calculateForwardNpcFlip,
  calculateHighValueItem,
  attachVerdict,
} from "../services/flipCalculator.js";
import { NPC_SHOP_PRICES } from "../data/npcShopPrices.js";
import { checkManipulation } from "../services/priceHistoryService.js";
import type { BazaarProduct, FlipOpportunity } from "../../shared/types.js";

// Pumps target the insta-buy price, which drives every flip's revenue side.
function withManipulationCheck<T extends FlipOpportunity>(flip: T, product: BazaarProduct): T {
  return { ...flip, ...checkManipulation(product.productId, product.buyPrice) };
}

export const flipsRouter = Router();

flipsRouter.get("/spread", (_req, res) => {
  const flips = getBazaarProducts()
    .map((product) => {
      const flip = calculateSpreadFlip(product);
      return flip ? attachVerdict(withManipulationCheck(flip, product)) : null;
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .sort((a, b) => {
      const rank = { good: 2, risky: 1, avoid: 0 } as const;
      const byVerdict = rank[b.verdict ?? "risky"] - rank[a.verdict ?? "risky"];
      return byVerdict !== 0 ? byVerdict : b.profitPerHour - a.profitPerHour;
    });
  res.json({ lastUpdated: getBazaarLastUpdated(), flips });
});

flipsRouter.get("/craft", (_req, res) => {
  const products = getBazaarProducts();
  const bazaarByItem = new Map(products.map((p) => [p.productId, p]));
  const flips = getAllRecipes()
    .map((recipe) => {
      const flip = calculateCraftFlip(recipe, bazaarByItem);
      if (!flip) return null;
      const sellProduct = bazaarByItem.get(recipe.itemId);
      return sellProduct ? withManipulationCheck(flip, sellProduct) : flip;
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .sort((a, b) => b.marginPercent - a.marginPercent);
  res.json({ lastUpdated: getBazaarLastUpdated(), flips });
});

flipsRouter.get("/npc", (_req, res) => {
  const products = getBazaarProducts();
  const bazaarByItem = new Map(products.map((p) => [p.productId, p]));
  const npcSellPrices = getAllNpcSellPrices();
  const flips: FlipOpportunity[] = [];

  for (const product of products) {
    const npcSellPrice = npcSellPrices.get(product.productId);
    if (npcSellPrice === undefined) continue;
    const flip = calculateReverseNpcFlip(product, npcSellPrice);
    if (flip) flips.push(withManipulationCheck(flip, product));
  }

  for (const [itemId, entry] of Object.entries(NPC_SHOP_PRICES)) {
    const product = bazaarByItem.get(itemId);
    if (!product) continue;
    const flip = calculateForwardNpcFlip(product, entry.npcBuyPrice, entry.dailyLimit);
    if (flip) flips.push(withManipulationCheck(flip, product));
  }

  flips.sort((a, b) => b.marginPercent - a.marginPercent);
  res.json({ lastUpdated: getBazaarLastUpdated(), flips });
});

flipsRouter.get("/high-value", (_req, res) => {
  const items = getBazaarProducts()
    .map(calculateHighValueItem)
    .filter((i): i is NonNullable<typeof i> => i !== null)
    .sort((a, b) => b.sellPricePerUnit - a.sellPricePerUnit)
    .slice(0, 600);
  res.json({ lastUpdated: getBazaarLastUpdated(), items });
});
