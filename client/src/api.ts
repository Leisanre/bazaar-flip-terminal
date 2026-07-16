import type { FlipOpportunity, FlipType } from "../../shared/types.js";

interface FlipsResponse {
  lastUpdated: number;
  flips: FlipOpportunity[];
}

export async function fetchFlips(type: FlipType): Promise<FlipsResponse> {
  const res = await fetch(`/api/flips/${type}`);
  if (!res.ok) throw new Error(`failed to fetch ${type} flips: ${res.status}`);
  return res.json();
}

export interface ItemMeta {
  names: Record<string, string>;
  tiers: Record<string, string>;
  materials: Record<string, string>;
}

export async function fetchItemMeta(): Promise<ItemMeta> {
  const res = await fetch("/api/meta/items");
  if (!res.ok) throw new Error(`failed to fetch item meta: ${res.status}`);
  return res.json();
}
