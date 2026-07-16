import { useMemo, useState } from "react";
import type { FlipOpportunity, FlipType } from "../../../shared/types.js";
import { getColumnsForType } from "../columns.js";
import { formatItemName } from "../format.js";
import type { ItemMeta } from "../api.js";
import { FlipRow } from "./FlipRow.js";

interface FlipTableProps {
  type: FlipType;
  flips: FlipOpportunity[];
  meta: ItemMeta;
  loading: boolean;
  search: string;
  budget: number;
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
  favorites,
  onToggleFavorite,
}: FlipTableProps) {
  const [sortKey, setSortKey] = useState("");
  const [sortDesc, setSortDesc] = useState(true);

  const activeColumns = useMemo(() => getColumnsForType(type), [type]);
  // When the stored key doesn't exist on this tab, fall back to the tab's
  // headline metric: profit/hour where available, otherwise profit/unit.
  const activeSortKey = activeColumns.some((c) => c.key === sortKey)
    ? sortKey
    : activeColumns.find((c) => c.key === "profitPerHour")?.key ?? "profitPerUnit";

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matches = query
      ? flips.filter((f) =>
          (meta.names[f.itemId] ?? formatItemName(f.itemId)).toLowerCase().includes(query)
        )
      : flips;

    const col = activeColumns.find((c) => c.key === activeSortKey);
    const sorted = [...matches];
    if (col) {
      sorted.sort((a, b) => (col.getValue(a) - col.getValue(b)) * (sortDesc ? -1 : 1));
    }
    // Pinned favorites float above everything, keeping their relative sort.
    sorted.sort((a, b) => Number(favorites.has(b.itemId)) - Number(favorites.has(a.itemId)));
    return sorted.slice(0, 150);
  }, [flips, meta, search, activeColumns, activeSortKey, sortDesc, favorites]);

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
            {budget > 0 && <th title="realistic daily profit with your budget">Your/Day</th>}
          </tr>
        </thead>
        <tbody>
          {visible.map((flip) => (
            <FlipRow
              key={`${(flip as { direction?: string }).direction ?? flip.type}-${flip.itemId}`}
              flip={flip}
              columns={activeColumns}
              meta={meta}
              budget={budget}
              isFavorite={favorites.has(flip.itemId)}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
