import { useState } from "react";
import type { FlipOpportunity } from "../../../shared/types.js";
import type { ColumnDef } from "../columns.js";
import type { ItemMeta } from "../api.js";
import { formatCoins, formatItemName, tierColor, iconUrl } from "../format.js";
import { yourProfitPerDay } from "../budget.js";

interface FlipRowProps {
  flip: FlipOpportunity;
  columns: ColumnDef[];
  meta: ItemMeta;
  budget: number;
  isFavorite: boolean;
  onToggleFavorite: (itemId: string) => void;
}

export function FlipRow({ flip, columns, meta, budget, isFavorite, onToggleFavorite }: FlipRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const displayName = meta.names[flip.itemId] ?? formatItemName(flip.itemId);
  const isCraft = flip.type === "craft";

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

  return (
    <>
      <tr
        className={isCraft ? "row-expandable" : ""}
        onClick={isCraft ? () => setExpanded((v) => !v) : undefined}
      >
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
            {isCraft && <span className="expand-hint">{expanded ? "▾" : "▸"}</span>}
            {flip.suspicious && (
              <span
                className="manip-badge"
                title={`Price is ${flip.medianRatio?.toFixed(1)}x its 48h median — possible manipulation, avoid`}
              >
                ⚠ pumped
              </span>
            )}
            <button className="copy-button" title={`copy "/bz ${displayName}"`} onClick={copyBzCommand}>
              {copied ? "copied!" : "/bz"}
            </button>
          </div>
        </td>
        {columns.map((col) => (
          <td
            key={col.key}
            className={
              col.emphasize ? "profit-positive" : col.key === "marginPercent" ? "margin-cell" : ""
            }
          >
            {col.render(flip)}
          </td>
        ))}
        {budget > 0 && (
          <td className="profit-positive">{formatCoins(yourProfitPerDay(flip, budget))}</td>
        )}
      </tr>
      {isCraft && expanded && flip.type === "craft" && (
        <tr className="ingredient-row">
          <td colSpan={columns.length + (budget > 0 ? 2 : 1)}>
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
          </td>
        </tr>
      )}
    </>
  );
}
