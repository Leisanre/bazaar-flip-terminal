import { useEffect, useState } from "react";
import type { TrackedPosition } from "../../../shared/positions.js";
import { formatCoins } from "../format.js";

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

export function TradesPanel() {
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

  if (!loaded) return <div className="loading-state">loading your trades...</div>;

  if (positions.length === 0) {
    return (
      <div className="empty-state">
        no tracked trades yet — run the BazaarFlip mod while playing and your orders appear here
        automatically
      </div>
    );
  }

  const open = positions.filter((p) => p.status !== "closed").reverse();
  const closed = positions.filter((p) => p.status === "closed").slice(-20).reverse();

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Player</th>
            <th>Amount</th>
            <th>Bought At</th>
            <th>Selling At</th>
            <th>Status</th>
            <th>Alert</th>
          </tr>
        </thead>
        <tbody>
          {[...open, ...closed].map((pos) => {
            const warning = warningFor(pos);
            return (
              <tr key={pos.id} className={pos.status === "closed" ? "row-closed" : ""}>
                <td>
                  <span className="item-name">{pos.itemName}</span>
                </td>
                <td>{pos.player}</td>
                <td>{pos.amount}</td>
                <td>{formatCoins(pos.buyUnitPrice)}</td>
                <td>{pos.sellUnitPrice ? formatCoins(pos.sellUnitPrice) : "—"}</td>
                <td>{STATUS_LABEL[pos.status]}</td>
                <td>{warning ? <span className="manip-badge">⚠ {warning}</span> : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
