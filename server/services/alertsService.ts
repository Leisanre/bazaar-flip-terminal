import { BAZAAR_TAX_RATE } from "../../shared/constants.js";
import type { TrackedPosition } from "../../shared/positions.js";
import { getPositions } from "./positionsService.js";
import { sendDiscordAlert } from "./discordService.js";

const CHECK_INTERVAL_MS = 60_000;
const EXIT_DRIFT_ALERT_PERCENT = -5;

// Remember what we've already said per position so alerts fire once per
// state change, not every minute.
const alerted = new Map<string, string>();

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "m";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toFixed(1);
}

export function realizedProfit(pos: TrackedPosition): number | null {
  if (pos.status !== "closed" || pos.sellUnitPrice === undefined) return null;
  const tax = pos.closedBy === "npc" ? 0 : BAZAAR_TAX_RATE;
  return (pos.sellUnitPrice * (1 - tax) - pos.buyUnitPrice) * pos.amount;
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
        true
      );
    }

    if (pos.status === "waiting_fill" && pos.outbid && alerted.get(key) !== "outbid") {
      alerted.set(key, "outbid");
      sendDiscordAlert(
        `⚠ **Outbid** — ${pos.itemName} x${pos.amount}: your buy order at ${fmt(pos.buyUnitPrice)} ` +
          `is below the top (${fmt(pos.currentTopBuyOrder ?? 0)}). Bump it or wait.`,
        true
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
        true
      );
    }

    if (pos.status === "closed" && alerted.get(key) !== "closed") {
      alerted.set(key, "closed");
      const profit = realizedProfit(pos);
      if (profit !== null) {
        const sign = profit >= 0 ? "💰 **+" : "🔻 **";
        sendDiscordAlert(
          `${sign}${fmt(profit)}** — ${pos.itemName} x${pos.amount} closed ` +
            `(${fmt(pos.buyUnitPrice)} → ${fmt(pos.sellUnitPrice ?? 0)}${pos.closedBy === "npc" ? ", NPC" : ""}).`
        );
      }
    }
  }
}

export function startAlerts(): void {
  // Seed dedupe + status maps so a restart doesn't re-announce old history.
  for (const pos of getPositions()) {
    if (pos.status === "closed") alerted.set(pos.id, "closed");
    lastStatus.set(pos.id, pos.status);
  }
  setInterval(checkPositions, CHECK_INTERVAL_MS);
}
