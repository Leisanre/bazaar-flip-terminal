import { useEffect, useState } from "react";
import type { FlipOpportunity, FlipType } from "../../shared/types.js";
import { fetchFlips, fetchItemMeta, type ItemMeta } from "./api.js";
import { FlipTable } from "./components/FlipTable.js";

const TABS: { type: FlipType; label: string }[] = [
  { type: "spread", label: "Bazaar Spread" },
  { type: "craft", label: "Craft Flips" },
  { type: "npc", label: "NPC Flips" },
];

const POLL_MS = 20_000;

export default function App() {
  const [activeTab, setActiveTab] = useState<FlipType>("spread");
  const [flipsByType, setFlipsByType] = useState<Record<FlipType, FlipOpportunity[]>>({
    spread: [],
    craft: [],
    npc: [],
  });
  const [meta, setMeta] = useState<ItemMeta>({ names: {}, tiers: {}, materials: {} });
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchItemMeta()
      .then(setMeta)
      .catch((err) => console.error("item meta fetch failed", err));
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function pollAll() {
      try {
        const [spread, craft, npc] = await Promise.all([
          fetchFlips("spread"),
          fetchFlips("craft"),
          fetchFlips("npc"),
        ]);
        if (cancelled) return;
        setFlipsByType({ spread: spread.flips, craft: craft.flips, npc: npc.flips });
        setLastUpdated(Math.max(spread.lastUpdated, craft.lastUpdated, npc.lastUpdated));
        setLoading(false);
      } catch (err) {
        console.error("poll failed", err);
      }
    }

    pollAll();
    const interval = setInterval(pollAll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const secondsAgo = lastUpdated ? Math.max(0, Math.round((Date.now() - lastUpdated) / 1000)) : null;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-title">
          <span className="mark">BAZAAR // FLIP TERMINAL</span>
          <span className="sub">skyblock.hypixel.net</span>
        </div>
        <div className="status-pill">
          <span className="status-dot" />
          {secondsAgo === null ? "connecting..." : `synced ${secondsAgo}s ago`}
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.type}
            className={`tab-button ${activeTab === tab.type ? "active" : ""}`}
            onClick={() => setActiveTab(tab.type)}
          >
            {tab.label}
            <span className="tab-count">{flipsByType[tab.type].length}</span>
          </button>
        ))}
      </nav>

      <main className="content">
        <FlipTable
          type={activeTab}
          flips={flipsByType[activeTab]}
          meta={meta}
          loading={loading}
        />
      </main>
    </div>
  );
}
