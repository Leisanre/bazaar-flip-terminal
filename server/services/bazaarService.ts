import type { BazaarProduct } from "../../shared/types.js";

const BAZAAR_URL = "https://api.hypixel.net/v2/skyblock/bazaar";
const POLL_INTERVAL_MS = 20_000;

interface RawBazaarResponse {
  success: boolean;
  products: Record<
    string,
    {
      product_id: string;
      buy_summary: { pricePerUnit: number; amount: number; orders: number }[];
      sell_summary: { pricePerUnit: number; amount: number; orders: number }[];
      quick_status: {
        buyPrice: number;
        sellPrice: number;
        buyVolume: number;
        sellVolume: number;
        buyMovingWeek: number;
        sellMovingWeek: number;
        buyOrders: number;
        sellOrders: number;
      };
    }
  >;
}

let cache: Map<string, BazaarProduct> = new Map();
let lastUpdated = 0;

function toBazaarProduct(raw: RawBazaarResponse["products"][string]): BazaarProduct {
  // quick_status prices are weighted averages over a chunk of the book and
  // can sit far from what the game actually shows. The order summaries carry
  // the real top-of-book: buy_summary[0] = lowest sell offer (insta-buy),
  // sell_summary[0] = highest buy order (insta-sell).
  const topBuy = raw.buy_summary[0]?.pricePerUnit;
  const topSell = raw.sell_summary[0]?.pricePerUnit;
  return {
    productId: raw.product_id,
    buyPrice: topBuy ?? raw.quick_status.buyPrice,
    sellPrice: topSell ?? raw.quick_status.sellPrice,
    buyVolume: raw.quick_status.buyVolume,
    sellVolume: raw.quick_status.sellVolume,
    buyMovingWeek: raw.quick_status.buyMovingWeek,
    sellMovingWeek: raw.quick_status.sellMovingWeek,
    buyOrders: raw.quick_status.buyOrders,
    sellOrders: raw.quick_status.sellOrders,
  };
}

async function refreshBazaarCache(): Promise<void> {
  const res = await fetch(BAZAAR_URL);
  if (!res.ok) {
    console.error(`bazaar fetch failed: ${res.status}`);
    return;
  }
  const data = (await res.json()) as RawBazaarResponse;
  if (!data.success) {
    console.error("bazaar fetch returned success:false");
    return;
  }
  const next = new Map<string, BazaarProduct>();
  for (const raw of Object.values(data.products)) {
    next.set(raw.product_id, toBazaarProduct(raw));
  }
  cache = next;
  lastUpdated = Date.now();
}

export function getBazaarProducts(): BazaarProduct[] {
  return Array.from(cache.values());
}

export function getBazaarLastUpdated(): number {
  return lastUpdated;
}

export function startBazaarPolling(): void {
  refreshBazaarCache().catch((err) => console.error("initial bazaar fetch failed", err));
  setInterval(() => {
    refreshBazaarCache().catch((err) => console.error("bazaar poll failed", err));
  }, POLL_INTERVAL_MS);
}
