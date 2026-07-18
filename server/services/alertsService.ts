import { getPositions } from "./positionsService.js";
import { sendDiscordAlert } from "./discordService.js";
import { realizedProfit } from "../../shared/profitSummary.js";

const CHECK_INTERVAL_MS = 60_000;
const EXIT_DRIFT_ALERT_PERCENT = -5;

// Remember what we've already said per position so alerts fire once per
// state change, not every minute.
const alerted = new Map<string, string>();

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "m";
  // Prices need exact decimals — outbid margins are 0.1-coin battles, and
  // rounding 1456.2 vs 1456.3 both to "1.5k" makes alerts read as nonsense.
  return n.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

const lastStatus = new Map<string, string>();

function checkPositions(): void {
  for (const pos of getPositions()) {
    const key = pos.id;
    const prev = lastStatus.get(key);
    lastStatus.set(key, pos.status);

    // The most actionable moment in flipping: buy filled, coins are dead
    // until the sell offer goes up. Mention so the phone buzzes.
    if (prev === "waiting_fill" && pos.status === "holding") {
      sendDiscordAlert(
        `✅ **Buy filled** — ${pos.itemName} x${pos.amount} at ${fmt(pos.buyUnitPrice)}. ` +
          `Place your sell offer now (current lowest offer: ${fmt(pos.currentLowestSellOffer ?? 0)} — undercut by 0.1).`,
        pos.player
      );
    }

    if (pos.status === "waiting_fill" && pos.outbid && alerted.get(key) !== "outbid") {
      alerted.set(key, "outbid");
      sendDiscordAlert(
        `⚠ **Outbid** — ${pos.itemName} x${pos.amount}: your buy order at ${fmt(pos.buyUnitPrice)} ` +
          `is below the top (${fmt(pos.currentTopBuyOrder ?? 0)}). Bump it or wait.`,
        pos.player
      );
    }

    if (pos.status === "selling" && pos.undercut && alerted.get(key) !== "undercut") {
      alerted.set(key, "undercut");
      sendDiscordAlert(
        `⚠ **Undercut** — ${pos.itemName} x${pos.amount}: your sell offer at ${fmt(pos.sellUnitPrice ?? 0)} ` +
          `is above the lowest (${fmt(pos.currentLowestSellOffer ?? 0)}). Undercut back or wait out their stock.`,
        pos.player
      );
    }

    if (
      (pos.status === "holding" || pos.status === "selling") &&
      pos.exitDriftPercent !== undefined &&
      pos.exitDriftPercent < EXIT_DRIFT_ALERT_PERCENT &&
      alerted.get(key) !== "drift"
    ) {
      alerted.set(key, "drift");
      sendDiscordAlert(
        `📉 **Exit slipping** — ${pos.itemName} x${pos.amount}: sell price fell ` +
          `${Math.abs(pos.exitDriftPercent).toFixed(0)}% below your plan. Consider getting out.`,
        pos.player
      );
    }

    // Sell offer filled but not yet claimed (no price yet): prompt the claim —
    // the coins sit at the bazaar until collected.
    if (
      prev === "selling" &&
      pos.status === "closed" &&
      pos.closedBy === "bazaar" &&
      pos.sellUnitPrice === undefined &&
      alerted.get(key) !== "sell_filled"
    ) {
      alerted.set(key, "sell_filled");
      sendDiscordAlert(
        `✅ **Sell filled** — ${pos.itemName} x${pos.amount} sold! Go claim your coins at the bazaar (profit receipt follows once claimed).`,
        pos.player
      );
    }

    if (pos.status === "closed" && alerted.get(key) !== "closed") {
      // Bazaar sells close before the claim receipt delivers the real price —
      // hold the announcement until profit is computable, don't skip it.
      const profit = realizedProfit(pos);
      if (profit !== null) {
        alerted.set(key, "closed");
        const spent = pos.buyUnitPrice * pos.amount;
        const marginPct = spent > 0 ? (profit / spent) * 100 : 0;
        const emoji = profit >= 0 ? "💰" : "🔻";
        const signed = `${profit >= 0 ? "+" : ""}${fmt(profit)}`;
        sendDiscordAlert(
          `${emoji} **${pos.player}: ${signed} coins (${marginPct >= 0 ? "+" : ""}${marginPct.toFixed(1)}%)** — ` +
            `${pos.itemName} x${pos.amount}${pos.closedBy === "npc" ? " → NPC" : ""}\n` +
            `> spent ${fmt(spent)} (${fmt(pos.buyUnitPrice)}/u) → got back ${fmt(spent + profit)} (${fmt(pos.sellUnitPrice ?? 0)}/u)`
        );
      }
    }
  }
}

export function startAlerts(): void {
  // Seed dedupe + status maps so a restart doesn't re-announce anything the
  // user has already been told — only NEW state changes fire after boot.
  for (const pos of getPositions()) {
    if (pos.status === "closed") alerted.set(pos.id, "closed");
    else if (pos.status === "waiting_fill" && pos.outbid) alerted.set(pos.id, "outbid");
    else if (pos.status === "selling" && pos.undercut) alerted.set(pos.id, "undercut");
    else if (
      (pos.status === "holding" || pos.status === "selling") &&
      (pos.exitDriftPercent ?? 0) < EXIT_DRIFT_ALERT_PERCENT
    ) {
      alerted.set(pos.id, "drift");
    }
    lastStatus.set(pos.id, pos.status);
  }
  setInterval(checkPositions, CHECK_INTERVAL_MS);
}
