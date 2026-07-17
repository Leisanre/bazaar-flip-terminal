import { useEffect, useState } from "react";
import type { TrackedPosition } from "../../../shared/positions.js";
import type { FlipOpportunity } from "../../../shared/types.js";
import { formatCoins } from "../format.js";
import { realizedProfit, summarizeProfit } from "../profit.js";
import { ActionPanel } from "./ActionPanel.js";
import { DiscordLink } from "./DiscordLink.js";
import type { ItemMeta } from "../api.js";

const POLL_MS = 10_000;

const STATUS_LABEL: Record<TrackedPosition["status"], string> = {
  waiting_fill: "buy order open",
  holding: "holding — needs sell offer",
  selling: "sell offer open",
  closed: "done",
};

function warningFor(pos: TrackedPosition): string | null {
  if (pos.status === "waiting_fill" && pos.outbid) {
    return `outbid — top buy order is now ${formatCoins(pos.currentTopBuyOrder ?? 0)}`;
  }
  if (
    (pos.status === "holding" || pos.status === "selling") &&
    pos.exitDriftPercent !== undefined &&
    pos.exitDriftPercent < -5
  ) {
    return `exit price dropped ${Math.abs(pos.exitDriftPercent).toFixed(0)}% below your plan`;
  }
  return null;
}

interface TradesPanelProps {
  spreadFlips: FlipOpportunity[];
  meta: ItemMeta;
  budget: number;
}

export function TradesPanel({ spreadFlips, meta, budget }: TradesPanelProps) {
  const [positions, setPositions] = useState<TrackedPosition[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/positions");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setPositions(data.positions);
          setLoaded(true);
        }
      } catch (err) {
        console.error("positions poll failed", err);
      }
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  async function dismiss(id: string) {
    try {
      const res = await fetch(`/api/positions/${id}`, { method: "DELETE" });
      if (res.ok) setPositions((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      console.error("dismiss failed", err);
    }
  }

  if (!loaded) return <div className="loading-state">loading your trades...</div>;

  if (positions.length === 0) {
    return (
      <>
        <DiscordLink />
        <div className="empty-state">
          no tracked trades yet — run the BazaarFlip mod while playing and your orders appear here
          automatically
        </div>
      </>
    );
  }

  const open = positions.filter((p) => p.status !== "closed").reverse();
  const closed = positions.filter((p) => p.status === "closed").slice(-20).reverse();
  const stats = summarizeProfit(positions);

  return (
    <>
      <ActionPanel positions={positions} spreadFlips={spreadFlips} meta={meta} budget={budget} />
      <DiscordLink />
      <div className="stats-bar">
        <div className="stat-block">
          <span className="stat-label">today</span>
          <span className={`stat-value ${stats.todayProfit >= 0 ? "gain" : "loss"}`}>
            {stats.todayProfit >= 0 ? "+" : ""}
            {formatCoins(stats.todayProfit)}
          </span>
        </div>
        <div className="stat-block">
          <span className="stat-label">all time</span>
          <span className={`stat-value ${stats.allTimeProfit >= 0 ? "gain" : "loss"}`}>
            {stats.allTimeProfit >= 0 ? "+" : ""}
            {formatCoins(stats.allTimeProfit)}
          </span>
        </div>
        <div className="stat-block">
          <span className="stat-label">win rate</span>
          <span className="stat-value">
            {stats.closedCount > 0
              ? `${Math.round((stats.winCount / stats.closedCount) * 100)}% of ${stats.closedCount}`
              : "—"}
          </span>
        </div>
        <div className="stat-block">
          <span className="stat-label">coins in open trades</span>
          <span className="stat-value">{formatCoins(stats.openExposure)}</span>
        </div>
        <div className="stat-block">
          <span className="stat-label">coins cycled</span>
          <span className="stat-value">{formatCoins(stats.coinsCycled)}</span>
        </div>
        {stats.bestItem && (
          <div className="stat-block">
            <span className="stat-label">best earner</span>
            <span className="stat-value gain">
              {stats.bestItem} +{formatCoins(stats.bestItemProfit)}
            </span>
          </div>
        )}
      </div>
      <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Player</th>
            <th>Amount</th>
            <th>Bought At</th>
            <th>Selling At</th>
            <th>Profit</th>
            <th>Status</th>
            <th>Alert</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {[...open, ...closed].map((pos) => {
            const warning = warningFor(pos);
            const profit = realizedProfit(pos);
            return (
              <tr key={pos.id} className={pos.status === "closed" ? "row-closed" : ""}>
                <td>
                  <span className="item-name">{pos.itemName}</span>
                </td>
                <td>{pos.player}</td>
                <td>{pos.amount}</td>
                <td>{formatCoins(pos.buyUnitPrice)}</td>
                <td>{pos.sellUnitPrice ? formatCoins(pos.sellUnitPrice) : "—"}</td>
                <td className={profit !== null ? (profit >= 0 ? "margin-cell" : "loss-cell") : ""}>
                  {profit !== null ? `${profit >= 0 ? "+" : ""}${formatCoins(profit)}` : "—"}
                </td>
                <td>{STATUS_LABEL[pos.status]}</td>
                <td>{warning ? <span className="manip-badge">⚠ {warning}</span> : "—"}</td>
                <td>
                  <button
                    className="dismiss-button"
                    title="remove from tracking (does not touch your in-game order)"
                    onClick={() => dismiss(pos.id)}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}
