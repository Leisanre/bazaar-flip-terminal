# BazaarFlip Tracker (Fabric mod)

Read-only client mod for Minecraft 26.1.2 (Fabric). Listens for `[Bazaar]`
chat messages and forwards the raw lines to your local Bazaar Flip Terminal
(`/api/positions/events`), which parses them into tracked orders shown on the
**My Trades** tab.

It never modifies gameplay, sends no input, and reads nothing but chat — the
same category as NEU/SkyCofl info mods.

## Build

```bash
cd mod
./gradlew build
```

First build downloads Gradle, a JDK 25 toolchain, and Minecraft libraries.
The jar lands in `mod/build/libs/bazaarflip-1.0.0.jar` (ignore the `-sources` jar).

## Install

1. Copy `build/libs/bazaarflip-1.0.0.jar` into `%APPDATA%\.minecraft\mods\`
2. Start the terminal server (`npx tsx watch server/index.ts` in the project root)
3. Launch Minecraft (Fabric 26.1.2 profile), join Hypixel SkyBlock
4. Trade on the bazaar — orders appear on the site's **My Trades** tab within seconds

## Config

`%APPDATA%\.minecraft\config\bazaarflip.json` (created on first launch):

```json
{ "endpoint": "http://localhost:4000/api/positions/events" }
```

Point `endpoint` at a hosted server URL instead if the terminal runs elsewhere.

## Unknown messages

Any `[Bazaar]` line the server doesn't understand is stored in
`data-cache/unknown-bazaar-lines.json` — check it after a play session and new
patterns can be added server-side without rebuilding this mod.
