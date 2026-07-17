import { summarizeProfit } from "../../shared/profitSummary.js";
import { getPositions } from "./positionsService.js";
import { sendDiscordAlert } from "./discordService.js";
import { kvGet, kvSet } from "./kvStore.js";

const REPORT_HOUR = 21;
const CHECK_INTERVAL_MS = 10 * 60 * 1000;

function fmt(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return (n / 1e9).toFixed(2) + "b";
  if (abs >= 1e6) return (n / 1e6).toFixed(2) + "m";
  if (abs >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return n.toFixed(0);
}

export function buildReport(): string {
  const stats = summarizeProfit(getPositions());
  const winRate =
    stats.closedCount > 0 ? Math.round((stats.winCount / stats.closedCount) * 100) : 0;
  const sign = stats.todayProfit >= 0 ? "+" : "";

  return [
    `📊 **Daily Flip Report**`,
    ``,
    `💰 Today: **${sign}${fmt(stats.todayProfit)} coins** (${stats.todayClosedCount} flips closed)`,
    `🏦 All time: **${stats.allTimeProfit >= 0 ? "+" : ""}${fmt(stats.allTimeProfit)} coins** over ${stats.closedCount} flips`,
    `🎯 Win rate: **${winRate}%**`,
    `🔄 Total coins cycled: **${fmt(stats.coinsCycled)}**`,
    `📦 Currently in open trades: **${fmt(stats.openExposure)}**`,
    stats.bestItem
      ? `👑 Best earner: **${stats.bestItem}** (+${fmt(stats.bestItemProfit)} total)`
      : ``,
  ]
    .filter((line) => line !== ``)
    .join("\n");
}

async function maybeSendReport(): Promise<void> {
  const now = new Date();
  if (now.getHours() < REPORT_HOUR) return;
  const today = now.toISOString().slice(0, 10);
  const lastSent = await kvGet<string>("last-report-date");
  if (lastSent === today) return;
  await kvSet("last-report-date", today);
  sendDiscordAlert(buildReport());
}

export function startDailyReport(): void {
  setInterval(() => {
    maybeSendReport().catch((err) => console.error("daily report failed", err));
  }, CHECK_INTERVAL_MS);
}
