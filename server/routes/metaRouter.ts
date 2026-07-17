import { Router } from "express";
import {
  getAllItemTiers,
  getAllItemMaterials,
  getAllItemNames,
} from "../services/itemsService.js";
import { getHistorySamples } from "../services/priceHistoryService.js";

export const metaRouter = Router();

// Single item-metadata payload: display names, rarity tiers, and vanilla
// materials (for icon lookup), all keyed by bazaar/skyblock item id.
metaRouter.get("/items", (_req, res) => {
  res.json({
    names: Object.fromEntries(getAllItemNames()),
    tiers: Object.fromEntries(getAllItemTiers()),
    materials: Object.fromEntries(getAllItemMaterials()),
  });
});

// 48h of 5-minute insta-buy price samples for one item (sparklines).
metaRouter.get("/history/:itemId", (req, res) => {
  res.json({ samples: getHistorySamples(req.params.itemId) });
});
