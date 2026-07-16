import AdmZip from "adm-zip";
import type { ItemRecipe, RecipeIngredient } from "../../shared/types.js";

const REPO_ZIP_URL =
  "https://github.com/NotEnoughUpdates/NotEnoughUpdates-REPO/archive/refs/heads/master.zip";
const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;
const CRAFT_SLOT_PATTERN = /^[ABC][123]$/;

interface NeuItemFile {
  internalname?: string;
  recipe?: Record<string, string>;
}

let recipeCache: Map<string, ItemRecipe> = new Map();

function parseIngredientSlot(value: string): RecipeIngredient | null {
  const [rawItemId, countRaw] = value.split(":");
  if (!rawItemId || rawItemId === "") return null;
  const count = countRaw ? parseInt(countRaw, 10) : 1;
  if (!Number.isFinite(count) || count <= 0) return null;
  return { itemId: normalizeNeuItemId(rawItemId), count };
}

// NEU writes vanilla damage variants with a dash (INK_SACK-3, RAW_FISH-1);
// the Hypixel bazaar and items resource use a colon (INK_SACK:3, RAW_FISH:1).
// Without this, every recipe touching a variant material fails bazaar lookup.
function normalizeNeuItemId(neuId: string): string {
  return neuId.replace(/-(\d+)$/, ":$1");
}

function extractRecipe(itemId: string, raw: NeuItemFile): ItemRecipe | null {
  if (!raw.recipe) return null;
  const merged = new Map<string, number>();
  for (const [slot, value] of Object.entries(raw.recipe)) {
    if (!CRAFT_SLOT_PATTERN.test(slot)) continue;
    const ingredient = parseIngredientSlot(value);
    if (!ingredient) continue;
    merged.set(ingredient.itemId, (merged.get(ingredient.itemId) ?? 0) + ingredient.count);
  }
  if (merged.size === 0) return null;
  const ingredients: RecipeIngredient[] = Array.from(merged.entries()).map(([id, count]) => ({
    itemId: id,
    count,
  }));
  return { itemId, ingredients };
}

async function refreshRecipeCache(): Promise<void> {
  const res = await fetch(REPO_ZIP_URL);
  if (!res.ok) {
    console.error(`recipe repo fetch failed: ${res.status}`);
    return;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries().filter((e) => /\/items\/[^/]+\.json$/.test(e.entryName));

  const next = new Map<string, ItemRecipe>();
  for (const entry of entries) {
    const itemId = normalizeNeuItemId(entry.entryName.split("/").pop()!.replace(/\.json$/, ""));
    try {
      const raw = JSON.parse(entry.getData().toString("utf-8")) as NeuItemFile;
      const recipe = extractRecipe(itemId, raw);
      if (recipe) next.set(itemId, recipe);
    } catch {
      continue;
    }
  }
  recipeCache = next;
  console.log(`recipe cache refreshed: ${recipeCache.size} items with recipes`);
}

export function getRecipe(itemId: string): ItemRecipe | undefined {
  return recipeCache.get(itemId);
}

export function getAllRecipes(): ItemRecipe[] {
  return Array.from(recipeCache.values());
}

export function startRecipePolling(): void {
  refreshRecipeCache().catch((err) => console.error("initial recipe fetch failed", err));
  setInterval(() => {
    refreshRecipeCache().catch((err) => console.error("recipe poll failed", err));
  }, REFRESH_INTERVAL_MS);
}
