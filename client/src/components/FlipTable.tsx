import { useMemo, useState } from "react";
import type { FlipOpportunity, FlipType } from "../../../shared/types.js";
import { getColumnsForType } from "../columns.js";
import { formatItemName, tierColor, iconUrl } from "../format.js";
import type { ItemMeta } from "../api.js";

interface FlipTableProps {
  type: FlipType;
  flips: FlipOpportunity[];
  meta: ItemMeta;
  loading: boolean;
}

export function FlipTable({ type, flips, meta, loading }: FlipTableProps) {
  const [sortKey, setSortKey] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const activeColumns = useMemo(() => getColumnsForType(type), [type]);
  // When the stored key doesn't exist on this tab, fall back to the tab's
  // headline metric: profit/hour where available, otherwise profit/unit.
  const activeSortKey = activeColumns.some((c) => c.key === sortKey)
    ? sortKey
    : activeColumns.find((c) => c.key === "profitPerHour")?.key ?? "profitPerUnit";

  const sorted = useMemo(() => {
    const col = activeColumns.find((c) => c.key === activeSortKey);
    if (!col) return flips;
    const copy = [...flips];
    copy.sort((a, b) => (col.getValue(a) - col.getValue(b)) * (sortDesc ? -1 : 1));
    return copy.slice(0, 150);
  }, [flips, activeColumns, activeSortKey, sortDesc]);

  function handleSort(key: string) {
    if (key === activeSortKey) {
      setSortDesc((d) => !d);
    } else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  if (loading) {
    return <div className="loading-state">fetching bazaar data...</div>;
  }

  if (sorted.length === 0) {
    return <div className="empty-state">no flips clear the margin/volume threshold right now</div>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            {activeColumns.map((col) => (
              <th
                key={col.key}
                className={col.key === activeSortKey ? "sorted" : ""}
                onClick={() => handleSort(col.key)}
              >
                {col.label} {col.key === activeSortKey ? (sortDesc ? "▼" : "▲") : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((flip) => (
            <tr key={`${(flip as { direction?: string }).direction ?? flip.type}-${flip.itemId}`}>
              <td>
                <div className="item-cell">
                  <span
                    className="tier-strip"
                    style={{ background: tierColor(meta.tiers[flip.itemId]) }}
                  />
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
                  <span className="item-name">
                    {meta.names[flip.itemId] ?? formatItemName(flip.itemId)}
                  </span>
                  {flip.suspicious && (
                    <span
                      className="manip-badge"
                      title={`Price is ${flip.medianRatio?.toFixed(1)}x its 48h median — possible manipulation, avoid`}
                    >
                      ⚠ pumped
                    </span>
                  )}
                </div>
              </td>
              {activeColumns.map((col) => (
                <td
                  key={col.key}
                  className={
                    col.emphasize ? "profit-positive" : col.key === "marginPercent" ? "margin-cell" : ""
                  }
                >
                  {col.render(flip)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
