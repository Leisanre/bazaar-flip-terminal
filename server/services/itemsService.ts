const ITEMS_URL = "https://api.hypixel.net/v2/resources/skyblock/items";
const REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000;

interface RawItem {
  id: string;
  name?: string;
  npc_sell_price?: number;
  tier?: string;
  material?: string;
}

interface RawItemsResponse {
  success: boolean;
  items: RawItem[];
}

let npcSellPrices: Map<string, number> = new Map();
let itemTiers: Map<string, string> = new Map();
let itemMaterials: Map<string, string> = new Map();
let itemNames: Map<string, string> = new Map();

async function refreshItemsCache(): Promise<void> {
  const res = await fetch(ITEMS_URL);
  if (!res.ok) {
    console.error(`items fetch failed: ${res.status}`);
    return;
  }
  const data = (await res.json()) as RawItemsResponse;
  if (!data.success) {
    console.error("items fetch returned success:false");
    return;
  }
  const nextPrices = new Map<string, number>();
  const nextTiers = new Map<string, string>();
  const nextMaterials = new Map<string, string>();
  const nextNames = new Map<string, string>();
  for (const item of data.items) {
    if (typeof item.npc_sell_price === "number") {
      nextPrices.set(item.id, item.npc_sell_price);
    }
    if (item.tier) {
      nextTiers.set(item.id, item.tier);
    }
    if (item.material && item.material !== "SKULL_ITEM") {
      nextMaterials.set(item.id, item.material.toLowerCase());
    }
    if (item.name) {
      nextNames.set(item.id, item.name);
    }
  }
  npcSellPrices = nextPrices;
  itemTiers = nextTiers;
  itemMaterials = nextMaterials;
  itemNames = nextNames;
}

export function getNpcSellPrice(itemId: string): number | undefined {
  return npcSellPrices.get(itemId);
}

export function getAllNpcSellPrices(): Map<string, number> {
  return npcSellPrices;
}

export function getAllItemTiers(): Map<string, string> {
  return itemTiers;
}

export function getAllItemMaterials(): Map<string, string> {
  return itemMaterials;
}

export function getAllItemNames(): Map<string, string> {
  return itemNames;
}

export function startItemsPolling(): void {
  refreshItemsCache().catch((err) => console.error("initial items fetch failed", err));
  setInterval(() => {
    refreshItemsCache().catch((err) => console.error("items poll failed", err));
  }, REFRESH_INTERVAL_MS);
}
