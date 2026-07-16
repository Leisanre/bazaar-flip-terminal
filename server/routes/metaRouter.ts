import { Router } from "express";
import {
  getAllItemTiers,
  getAllItemMaterials,
  getAllItemNames,
} from "../services/itemsService.js";

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
