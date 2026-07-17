import type { TrackedPosition } from "../../../shared/positions.js";
import type { FlipOpportunity } from "../../../shared/types.js";
import { formatCoins } from "../format.js";
import { yourProfitPerDay } from "../budget.js";
import type { ItemMeta } from "../api.js";
import { formatItemName } from "../format.js";

interface ActionPanelProps {
  positions: TrackedPosition[];
  spreadFlips: FlipOpportunity[];
  meta: ItemMeta;
  budget: number;
}

interface Action {
  key: string;
  text: string;
  urgent: boolean;
}

function buildActions(
  positions: TrackedPosition[],
  spreadFlips: FlipOpportunity[],
  meta: ItemMeta,
  budget: number
): Action[] {
  const actions: Action[] = [];

  for (const pos of positions) {
    if (pos.status === "waiting_fill" && pos.outbid) {
      actions.push({
        key: `outbid-${pos.id}`,
        text: `Repost ${pos.itemName} buy order at ${formatCoins((pos.currentTopBuyOrder ?? pos.buyUnitPrice) + 0.1)} — you've been outbid`,
        urgent: true,
      });
    }
    if (pos.status === "holding") {
      actions.push({
        key: `sell-${pos.id}`,
        text: `Place sell offer: ${pos.itemName} x${pos.amount} at ${formatCoins((pos.currentLowestSellOffer ?? 0) - 0.1)} (or sell to NPC if it's an NPC flip)`,
        urgent: true,
      });
    }
    if (
      pos.status === "selling" &&
      pos.exitDriftPercent !== undefined &&
      pos.exitDriftPercent < -5
    ) {
      actions.push({
        key: `exit-${pos.id}`,
        text: `${pos.itemName}: exit price fell ${Math.abs(pos.exitDriftPercent).toFixed(0)}% below plan — undercut to ${formatCoins((pos.currentLowestSellOffer ?? 0) - 0.1)} or accept the wait`,
        urgent: true,
      });
    }
  }

  if (budget > 0) {
    const best = spreadFlips
      .filter((f) => (f as { verdict?: string }).verdict === "good" && yourProfitPerDay(f, budget) > 0)
      .sort((a, b) => yourProfitPerDay(b, budget) - yourProfitPerDay(a, budget))[0];
    if (best && best.type === "spread") {
      const name = meta.names[best.itemId] ?? formatItemName(best.itemId);
      actions.push({
        key: "best-flip",
        text: `Best new flip for your ${formatCoins(budget)}: ${name} — buy order at ${formatCoins(best.buyOrderPrice + 0.1)}, sell at ${formatCoins(best.sellOrderPrice - 0.1)} (~${formatCoins(yourProfitPerDay(best, budget))}/day)`,
        urgent: false,
      });
    }
  }

  return actions;
}

export function ActionPanel({ positions, spreadFlips, meta, budget }: ActionPanelProps) {
  const actions = buildActions(positions, spreadFlips, meta, budget);
  if (actions.length === 0) return null;

  return (
    <div className="action-panel">
      <span className="action-title">do this now</span>
      <ol className="action-list">
        {actions.map((action) => (
          <li key={action.key} className={action.urgent ? "action-urgent" : ""}>
            {action.text}
          </li>
        ))}
      </ol>
    </div>
  );
}
