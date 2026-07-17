import { useMemo, useState } from "react";
import type { FlipOpportunity, FlipType } from "../../../shared/types.js";
import { getColumnsForType, type ColumnDef } from "../columns.js";
import { formatItemName, formatCoins } from "../format.js";
import type { ItemMeta } from "../api.js";
import { yourProfitPerDay, estimatedFillMinutes, formatFillTime } from "../budget.js";
import { SAFE_MODE_MIN_DAILY_TRADED } from "../../../shared/constants.js";
import { FlipRow } from "./FlipRow.js";

interface FlipTableProps {
  type: FlipType;
  flips: FlipOpportunity[];
  meta: ItemMeta;
  loading: boolean;
  search: string;
  budget: number;
  safeMode: boolean;
  favorites: Set<string>;
  onToggleFavorite: (itemId: string) => void;
}

export function FlipTable({
  type,
  flips,
  meta,
  loading,
  search,
  budget,
  safeMode,
  favorites,
  onToggleFavorite,
}: FlipTableProps) {
  const [sortKey, setSortKey] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const activeColumns = useMemo<ColumnDef[]>(() => {
    const base = getColumnsForType(type);
    if (budget <= 0) return base;
    return [
      ...base,
      {
        key: "yourPerDay",
        label: "Your/Day",
        getValue: (f) => yourProfitPerDay(f, budget),
        render: (f) => formatCoins(yourProfitPerDay(f, budget)),
        emphasize: true,
      },
      {
        key: "fillTime",
        label: "Est Fill",
        getValue: (f) => estimatedFillMinutes(f, budget) ?? Infinity,
        render: (f) => formatFillTime(estimatedFillMinutes(f, budget)),
      },
    ];
  }, [type, budget]);

  // When the stored key doesn't exist on this tab, fall back to the headline
  // metric: with a budget set that's Your/Day, else profit/hour or profit/unit.
  const activeSortKey = activeColumns.some((c) => c.key === sortKey)
    ? sortKey
    : budget > 0
      ? "yourPerDay"
      : activeColumns.find((c) => c.key === "profitPerHour")?.key ?? "profitPerUnit";

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    let matches = query
      ? flips.filter((f) =>
          (meta.names[f.itemId] ?? formatItemName(f.itemId)).toLowerCase().includes(query)
        )
      : flips;

    // With a budget set, a flip you can't afford even one unit of is noise.
    if (budget > 0) {
      matches = matches.filter((f) => yourProfitPerDay(f, budget) > 0);
    }

    // Safe mode (spread only): deep markets fill fast and price honestly.
    if (safeMode && type === "spread") {
      matches = matches.filter((f) => f.tradedPerDay >= SAFE_MODE_MIN_DAILY_TRADED);
    }

    const col = activeColumns.find((c) => c.key === activeSortKey);
    const sorted = [...matches];
    if (col) {
      sorted.sort((a, b) => (col.getValue(a) - col.getValue(b)) * (sortDesc ? -1 : 1));
    }
    // Pinned favorites float above everything, keeping their relative sort.
    sorted.sort((a, b) => Number(favorites.has(b.itemId)) - Number(favorites.has(a.itemId)));
    return sorted.slice(0, 150);
  }, [flips, meta, search, budget, safeMode, type, activeColumns, activeSortKey, sortDesc, favorites]);

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

  if (visible.length === 0) {
    return (
      <div className="empty-state">
        {search ? "no items match your search" : "no flips clear the filters right now"}
      </div>
    );
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
          {visible.map((flip) => (
            <FlipRow
              key={`${(flip as { direction?: string }).direction ?? flip.type}-${flip.itemId}`}
              flip={flip}
              columns={activeColumns}
              meta={meta}
              isFavorite={favorites.has(flip.itemId)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
