# Bazaar Flip Terminal — Design System

## Direction
Obsidian-dark trading terminal for a SkyBlock bazaar flipping tool. Dense, data-first, functional — a personal trading tool, not a marketing surface. Feel: trading-floor focus, not "clean dashboard."

## Domain grounding
SkyBlock bazaar world: order books, buy/sell walls, coins (k/m/b suffixes), NPC shops, crafting recipes, item rarity tiers, market ticker. Signature element: a left-edge color strip per row using the item's **real Minecraft rarity tier color** (common gray → mythic pink), pulled from the actual Hypixel items API — not a fabricated bucket.

## Palette (obsidian/end-stone world)
- Background base: `#0c0b12`, surfaces step up in whisper increments (`#131220` → `#191828` → `#201f33`)
- Borders: low-alpha `rgba(180,170,255, 0.06–0.18)` — purple-tinted, not neutral gray
- One accent: coin-gold `#f0c419` — used only for profit emphasis, nothing else
- Semantic: gain-green `#5ec98a`, loss-red `#e0555f`
- Rarity tiers map 1:1 to real Minecraft colors (common `#9d9d9d` → mythic `#ff55ff` → divine `#55ffff`)

## Depth strategy
Borders-only (flat), 0.5px, low-alpha. No shadows — matches dense technical-tool direction (same family as Linear/Raycast).

## Typography
- `JetBrains Mono` for all data/numbers/table content (tabular-nums)
- `Inter` for chrome/labels
- Data-is-mono is the rule: if it's a number, it's mono.

## Spacing
Base unit 4px, scale: 4/8/12/16/24/32 (`--space-1` … `--space-6`).

## Component patterns
- Tabs: underline-only active state (gold), no pill/background change
- Table: sortable column headers, click to toggle asc/desc, sort indicator via ▼/▲ glyph
- Row hover: single subtle surface-step lift, no border change
- Status pill: dot + "synced Ns ago" — ambient live-data confirmation, top-right

## Known gap
No item icons yet — would need a Minecraft texture sprite source (e.g. sky.shiiyu.moe CDN). Fast follow, not yet built.
