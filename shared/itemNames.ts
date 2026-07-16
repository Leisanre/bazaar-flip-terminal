const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function titleCase(raw: string): string {
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
