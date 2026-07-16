// Manually curated NPC vendor buy-side prices (what you pay the NPC to purchase
// raw materials, before reselling on the bazaar). No public Hypixel API endpoint
// exposes this — npc_sell_price (the official field) is the OPPOSITE direction
// (what the game pays you). This table is a one-time snapshot sourced from a
// community bazaar-tracking site's published price list and cross-checked
// against known bazaar product IDs. Vendor prices rarely change but this is
// NOT live data — verify in-game before committing large coin amounts, and
// treat this list as a starting point, not ground truth.
export interface NpcShopEntry {
  npcBuyPrice: number;
  dailyLimit: number;
}

export const NPC_SHOP_PRICES: Record<string, NpcShopEntry> = {
  PACKED_ICE: { npcBuyPrice: 9.0, dailyLimit: 1280 },
  EXP_BOTTLE: { npcBuyPrice: 30.0, dailyLimit: 640 },
  RAW_FISH: { npcBuyPrice: 20.0, dailyLimit: 640 },
  MAGMA_CREAM: { npcBuyPrice: 20.0, dailyLimit: 640 },
  SLIME_BALL: { npcBuyPrice: 14.0, dailyLimit: 640 },
  FLINT: { npcBuyPrice: 6.0, dailyLimit: 640 },
  BROWN_MUSHROOM: { npcBuyPrice: 12.0, dailyLimit: 640 },
  "LOG_2": { npcBuyPrice: 5.0, dailyLimit: 640 }, // acacia
  "LOG:3": { npcBuyPrice: 5.0, dailyLimit: 640 }, // jungle
  "LOG_2:1": { npcBuyPrice: 5.0, dailyLimit: 640 }, // dark oak
  LOG: { npcBuyPrice: 5.0, dailyLimit: 640 }, // oak
  "LOG:1": { npcBuyPrice: 5.0, dailyLimit: 640 }, // spruce
  "LOG:2": { npcBuyPrice: 5.0, dailyLimit: 640 }, // birch
  SULPHUR: { npcBuyPrice: 10.0, dailyLimit: 640 }, // gunpowder (legacy bazaar id)
  "INK_SACK:3": { npcBuyPrice: 5.0, dailyLimit: 640 }, // cocoa beans (legacy bazaar id)
  STRING: { npcBuyPrice: 10.0, dailyLimit: 640 },
  SAND: { npcBuyPrice: 3.0, dailyLimit: 1280 },
  ICE: { npcBuyPrice: 1.0, dailyLimit: 1280 },
  ENCHANTED_QUARTZ: { npcBuyPrice: 1280.0, dailyLimit: 16 },
  CARROT_ITEM: { npcBuyPrice: 2.3, dailyLimit: 640 },
  REDSTONE: { npcBuyPrice: 4.0, dailyLimit: 640 },
  COAL: { npcBuyPrice: 4.0, dailyLimit: 640 },
  SUGAR_CANE: { npcBuyPrice: 5.0, dailyLimit: 640 },
  PUMPKIN: { npcBuyPrice: 8.0, dailyLimit: 640 },
  WHEAT: { npcBuyPrice: 2.3, dailyLimit: 640 },
  POTATO_ITEM: { npcBuyPrice: 2.3, dailyLimit: 640 },
  COBBLESTONE: { npcBuyPrice: 2.0, dailyLimit: 640 },
  MELON: { npcBuyPrice: 2.0, dailyLimit: 640 },
};
