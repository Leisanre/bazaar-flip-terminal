import {
  HISTORY_SAMPLE_INTERVAL_MS,
  HISTORY_WINDOW_HOURS,
  MANIPULATION_RATIO,
  MIN_HISTORY_SAMPLES,
} from "../../shared/constants.js";
import { getBazaarProducts } from "./bazaarService.js";
import { kvGet, kvSet } from "./kvStore.js";

const PERSIST_INTERVAL_MS = 10 * 60 * 1000;
const MAX_SAMPLES = Math.ceil(
  (HISTORY_WINDOW_HOURS * 60 * 60 * 1000) / HISTORY_SAMPLE_INTERVAL_MS
);

// Per item: rolling window of sampled insta-buy prices (the side pumps target).
let history: Map<string, number[]> = new Map();

async function loadFromStore(): Promise<void> {
  const raw = await kvGet<Record<string, number[]>>("price-history");
  if (!raw) return;
  history = new Map(Object.entries(raw).map(([id, samples]) => [id, samples.slice(-MAX_SAMPLES)]));
  console.log(`price history loaded: ${history.size} items`);
}

function persistToStore(): void {
  void kvSet("price-history", Object.fromEntries(history));
}

function recordSample(): void {
  const products = getBazaarProducts();
  if (products.length === 0) return;
  for (const product of products) {
    if (product.buyPrice <= 0) continue;
    const samples = history.get(product.productId) ?? [];
    samples.push(product.buyPrice);
    if (samples.length > MAX_SAMPLES) samples.shift();
    history.set(product.productId, samples);
  }
}

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export interface ManipulationVerdict {
  medianRatio?: number;
  suspicious?: boolean;
}

export function checkManipulation(itemId: string, currentPrice: number): ManipulationVerdict {
  const samples = history.get(itemId);
  if (!samples || samples.length < MIN_HISTORY_SAMPLES || currentPrice <= 0) return {};
  const med = median(samples);
  if (med <= 0) return {};
  const ratio = currentPrice / med;
  return { medianRatio: ratio, suspicious: ratio > MANIPULATION_RATIO };
}

export function getHistorySampleCount(itemId: string): number {
  return history.get(itemId)?.length ?? 0;
}

export function startPriceHistoryTracking(): void {
  void loadFromStore();
  // First sample shortly after boot so a fresh install starts warming up
  // immediately instead of waiting a full interval.
  setTimeout(recordSample, 30_000);
  setInterval(recordSample, HISTORY_SAMPLE_INTERVAL_MS);
  setInterval(persistToStore, PERSIST_INTERVAL_MS);
}
