import { useState } from "react";
import type { FlipOpportunity } from "../../../shared/types.js";
import type { ColumnDef } from "../columns.js";
import type { ItemMeta } from "../api.js";
import { formatCoins, formatItemName, tierColor, iconUrl } from "../format.js";
import { Sparkline } from "./Sparkline.js";
import { costPerUnit } from "../budget.js";

interface FlipRowProps {
  flip: FlipOpportunity;
  columns: ColumnDef[];
  meta: ItemMeta;
  budget: number;
  isFavorite: boolean;
  onToggleFavorite: (itemId: string) => void;
}

// Buy/sell entry price a flip type recommends, before the +0.1/-0.1 nudge.
function tradePrices(flip: FlipOpportunity): { buy: number; sell: number } | null {
  if (flip.type === "spread") return { buy: flip.buyOrderPrice, sell: flip.sellOrderPrice };
  if (flip.type === "craft") return { buy: flip.craftCost, sell: flip.sellPrice };
  if (flip.type === "npc" && flip.direction === "npc_to_market") {
    return { buy: flip.costPrice, sell: flip.revenuePrice };
  }
  return null;
}

export function FlipRow({ flip, columns, meta, budget, isFavorite, onToggleFavorite }: FlipRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const displayName = meta.names[flip.itemId] ?? formatItemName(flip.itemId);
  const isCraft = flip.type === "craft";
  const prices = tradePrices(flip);
  const canBuy = budget > 0 ? Math.floor(budget / Math.max(costPerUnit(flip), 0.1)) : 0;

  function copyBzCommand(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard
      .writeText(`/bz ${displayName}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      })
      .catch((err) => console.error("clipboard write failed", err));
  }

  function copyField(e: React.MouseEvent, field: string, value: string) {
    e.stopPropagation();
    navigator.clipboard
      .writeText(value)
      .then(() => {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 1200);
      })
      .catch((err) => console.error("clipboard write failed", err));
  }

  return (
    <>
      <tr className="row-expandable" onClick={() => setExpanded((v) => !v)}>
        <td>
          <div className="item-cell">
            <button
              className={`fav-button ${isFavorite ? "active" : ""}`}
              title={isFavorite ? "unpin" : "pin to top"}
              onClick={(e) => {
                e.stopPropagation();
                onToggleFavorite(flip.itemId);
              }}
            >
              {isFavorite ? "★" : "☆"}
            </button>
            <span className="tier-strip" style={{ background: tierColor(meta.tiers[flip.itemId]) }} />
            <span className="item-icon-slot">
              {iconUrl(meta.materials[flip.itemId]) && (
                <img
                  className="item-icon"
                  src={iconUrl(meta.materials[flip.itemId])!}
                  alt=""
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                />
              )}
            </span>
            <span className="item-name">{displayName}</span>
            <span className="expand-hint">{expanded ? "▾" : "▸"}</span>
            {flip.suspicious && (
              <span
                className="manip-badge"
                title={`Price is ${flip.medianRatio?.toFixed(1)}x its 48h median — possible manipulation, avoid`}
              >
                ⚠ pumped
              </span>
            )}
            {flip.medianRatio === undefined && (
              <span
                className="unknown-badge"
                title="Not enough price history yet to rule out manipulation — treat big margins with suspicion"
              >
                ? unverified
              </span>
            )}
            <button className="copy-button" title={`copy "/bz ${displayName}"`} onClick={copyBzCommand}>
              {copied ? "copied!" : "/bz"}
            </button>
          </div>
        </td>
        {columns.map((col) => {
          if (col.key === "verdict") {
            const verdict = (flip as { verdict?: string }).verdict ?? "risky";
            const reason = (flip as { verdictReason?: string }).verdictReason ?? "";
            return (
              <td key={col.key}>
                <span className={`verdict-chip verdict-${verdict}`} title={reason}>
                  {col.render(flip)}
                </span>
              </td>
            );
          }
          return (
            <td
              key={col.key}
              className={
                col.emphasize ? "profit-positive" : col.key === "marginPercent" ? "margin-cell" : ""
              }
            >
              {col.render(flip)}
            </td>
          );
        })}
      </tr>
      {expanded && (
        <tr className="ingredient-row">
          <td colSpan={columns.length + 1}>
            {isCraft && flip.type === "craft" && (
              <div className="ingredient-list">
                buy:{" "}
                {flip.ingredients
                  .map(
                    (ing) =>
                      `${ing.count}x ${meta.names[ing.itemId] ?? formatItemName(ing.itemId)}`
                  )
                  .join("  •  ")}
                {"  →  "}total cost {formatCoins(flip.craftCost)}, craft, then sell-order at{" "}
                {formatCoins(flip.sellPrice)}
              </div>
            )}
            {prices && (
              <div className="quick-trade">
                <span className="quick-trade-label">quick trade — copy, then paste into the in-game Custom Amount/Price prompt:</span>
                <div className="quick-trade-buttons">
                  {budget > 0 && (
                    <button
                      className="copy-field-button"
                      onClick={(e) => copyField(e, "amount", String(canBuy))}
                    >
                      {copiedField === "amount" ? "copied!" : `Copy Amount (${canBuy.toLocaleString()})`}
                    </button>
                  )}
                  <button
                    className="copy-field-button"
                    onClick={(e) => copyField(e, "buy", (prices.buy + 0.1).toFixed(1))}
                  >
                    {copiedField === "buy" ? "copied!" : `Copy Buy Price (${formatCoins(prices.buy + 0.1)})`}
                  </button>
                  <button
                    className="copy-field-button"
                    onClick={(e) => copyField(e, "sell", Math.max(prices.sell - 0.1, 0.1).toFixed(1))}
                  >
                    {copiedField === "sell" ? "copied!" : `Copy Sell Price (${formatCoins(prices.sell - 0.1)})`}
                  </button>
                </div>
              </div>
            )}
            <Sparkline itemId={flip.itemId} />
          </td>
        </tr>
      )}
    </>
  );
}
