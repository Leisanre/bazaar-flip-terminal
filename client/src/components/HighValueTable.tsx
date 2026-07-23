import { useEffect, useState } from "react";
import type { HighValueItem } from "../../../shared/types.js";
import type { ItemMeta } from "../api.js";
import { formatCoins, formatItemName, tierColor, iconUrl } from "../format.js";

const POLL_MS = 20_000;

type SortKey = "sellPricePerUnit" | "buyPricePerUnit" | "tradedPerDay" | "sellWallUnits";

interface HighValueTableProps {
  meta: ItemMeta;
}

export function HighValueTable({ meta }: HighValueTableProps) {
  const [items, setItems] = useState<HighValueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("sellPricePerUnit");

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch("/api/flips/high-value");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setItems(data.items);
          setLoading(false);
        }
      } catch (err) {
        console.error("high-value poll failed", err);
      }
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (loading) return <div className="loading-state">fetching bazaar data...</div>;

  const query = search.trim().toLowerCase();
  const visible = items
    .filter((i) => !query || (meta.names[i.itemId] ?? formatItemName(i.itemId)).toLowerCase().includes(query))
    .slice()
    .sort((a, b) => b[sortKey] - a[sortKey]);

  function handleSort(key: SortKey) {
    setSortKey(key);
  }

  return (
    <>
      <div className="toolbar">
        <input
          className="toolbar-input search-input"
          type="text"
          placeholder="search items..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {visible.length === 0 ? (
        <div className="empty-state">no items match right now</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th
                  className={sortKey === "sellPricePerUnit" ? "sorted" : ""}
                  onClick={() => handleSort("sellPricePerUnit")}
                >
                  Sell Price/Unit
                </th>
                <th
                  className={sortKey === "buyPricePerUnit" ? "sorted" : ""}
                  onClick={() => handleSort("buyPricePerUnit")}
                >
                  Buy Price/Unit
                </th>
                <th
                  className={sortKey === "tradedPerDay" ? "sorted" : ""}
                  onClick={() => handleSort("tradedPerDay")}
                >
                  Sold/Day
                </th>
                <th
                  className={sortKey === "sellWallUnits" ? "sorted" : ""}
                  onClick={() => handleSort("sellWallUnits")}
                >
                  Buyer Depth
                </th>
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.itemId}>
                  <td>
                    <div className="item-cell">
                      <span
                        className="tier-strip"
                        style={{ background: tierColor(meta.tiers[item.itemId]) }}
                      />
                      <span className="item-icon-slot">
                        {iconUrl(meta.materials[item.itemId]) && (
                          <img
                            className="item-icon"
                            src={iconUrl(meta.materials[item.itemId])!}
                            alt=""
                            loading="lazy"
                            onError={(e) => {
                              e.currentTarget.style.visibility = "hidden";
                            }}
                          />
                        )}
                      </span>
                      <span className="item-name">
                        {meta.names[item.itemId] ?? formatItemName(item.itemId)}
                      </span>
                    </div>
                  </td>
                  <td className="profit-positive">{formatCoins(item.sellPricePerUnit)}</td>
                  <td>{formatCoins(item.buyPricePerUnit)}</td>
                  <td>{formatCoins(item.tradedPerDay)}</td>
                  <td>{item.sellWallUnits.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
