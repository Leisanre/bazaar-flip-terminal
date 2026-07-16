export function formatCoins(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(2)}b`;
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(2)}m`;
  if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(1)}k`;
  return `${sign}${abs.toFixed(1)}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

function titleCase(raw: string): string {
  return raw
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

// Fallback for bazaar ids missing from the official items list. Nearly half
// the bazaar (books, shards, essences) has no API display name — these
// patterns reconstruct the in-game wording instead of echoing the raw id.
export function formatItemName(itemId: string): string {
  const shard = itemId.match(/^SHARD_(.+)$/);
  if (shard) return `${titleCase(shard[1])} Shard`;

  const essence = itemId.match(/^ESSENCE_(.+)$/);
  if (essence) return `${titleCase(essence[1])} Essence`;

  const book = itemId.match(/^ENCHANTMENT_(.+)_(\d+)$/);
  if (book) {
    const level = ROMAN[Number(book[2]) - 1] ?? book[2];
    return `${titleCase(book[1])} ${level} Book`;
  }

  return titleCase(itemId);
}

const TIER_CLASS_MAP: Record<string, string> = {
  COMMON: "var(--tier-common)",
  UNCOMMON: "var(--tier-uncommon)",
  RARE: "var(--tier-rare)",
  EPIC: "var(--tier-epic)",
  LEGENDARY: "var(--tier-legendary)",
  MYTHIC: "var(--tier-mythic)",
  DIVINE: "var(--tier-divine)",
  SPECIAL: "var(--tier-special)",
  VERY_SPECIAL: "var(--tier-special)",
};

export function tierColor(tier: string | undefined): string {
  if (!tier) return "var(--tier-default)";
  return TIER_CLASS_MAP[tier] ?? "var(--tier-default)";
}

const ICON_CDN_BASE =
  "https://cdn.jsdelivr.net/npm/minecraft-assets@1.17.0/minecraft-assets/data/1.21.1/items";

// Hypixel materials are 1.8-era enums; the CDN serves modern texture names.
// Map the common renames so more icons resolve (unmapped misses hide via onError).
const LEGACY_MATERIAL_MAP: Record<string, string> = {
  raw_fish: "cod",
  cooked_fish: "cooked_cod",
  ink_sack: "ink_sac",
  sulphur: "gunpowder",
  exp_bottle: "experience_bottle",
  log: "oak_log",
  log_2: "acacia_log",
  wood: "oak_planks",
  carrot_item: "carrot",
  potato_item: "potato",
  melon: "melon_slice",
  snow_ball: "snowball",
  seeds: "wheat_seeds",
  raw_beef: "beef",
  pork: "porkchop",
  grilled_pork: "cooked_porkchop",
  ender_stone: "end_stone",
  water_lily: "lily_pad",
};

export function iconUrl(material: string | undefined): string | null {
  if (!material) return null;
  const textureName = LEGACY_MATERIAL_MAP[material] ?? material;
  return `${ICON_CDN_BASE}/${textureName}.png`;
}
