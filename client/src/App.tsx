import { useEffect, useState } from "react";
import type { FlipOpportunity, FlipType } from "../../shared/types.js";
import { fetchFlips, fetchItemMeta, type ItemMeta } from "./api.js";
import { FlipTable } from "./components/FlipTable.js";
import { Toolbar } from "./components/Toolbar.js";
import { TradesPanel } from "./components/TradesPanel.js";
import { HighValueTable } from "./components/HighValueTable.js";

const BUDGET_KEY = "bft-budget";
const FAVORITES_KEY = "bft-favorites";
const SAFE_MODE_KEY = "bft-safe-mode";
const GREENS_ONLY_KEY = "bft-greens-only";

function loadBudget(): number {
  const raw = Number(localStorage.getItem(BUDGET_KEY));
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function loadFavorites(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]") as string[]);
  } catch {
    return new Set();
  }
}

type TabId = FlipType | "trades" | "highvalue";

const TABS: { type: TabId; label: string }[] = [
  { type: "spread", label: "Bazaar Spread" },
  { type: "craft", label: "Craft Flips" },
  { type: "npc", label: "NPC Flips" },
  { type: "highvalue", label: "High Value" },
  { type: "trades", label: "My Trades" },
];

const POLL_MS = 20_000;

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>("spread");
  const [flipsByType, setFlipsByType] = useState<Record<FlipType, FlipOpportunity[]>>({
    spread: [],
    craft: [],
    npc: [],
  });
  const [meta, setMeta] = useState<ItemMeta>({ names: {}, tiers: {}, materials: {} });
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [budget, setBudget] = useState(loadBudget);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [safeMode, setSafeMode] = useState(localStorage.getItem(SAFE_MODE_KEY) !== "off");
  const [greensOnly, setGreensOnly] = useState(localStorage.getItem(GREENS_ONLY_KEY) === "on");

  function handleSafeModeChange(value: boolean) {
    setSafeMode(value);
    localStorage.setItem(SAFE_MODE_KEY, value ? "on" : "off");
  }

  function handleGreensOnlyChange(value: boolean) {
    setGreensOnly(value);
    localStorage.setItem(GREENS_ONLY_KEY, value ? "on" : "off");
  }

  function handleBudgetChange(value: number) {
    setBudget(value);
    localStorage.setItem(BUDGET_KEY, String(value));
  }

  function handleToggleFavorite(itemId: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  }

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
            {tab.type !== "trades" && tab.type !== "highvalue" && (
              <span className="tab-count">{flipsByType[tab.type].length}</span>
            )}
          </button>
        ))}
      </nav>

      <main className="content">
        {activeTab === "trades" ? (
          <TradesPanel spreadFlips={flipsByType.spread} meta={meta} budget={budget} />
        ) : activeTab === "highvalue" ? (
          <HighValueTable meta={meta} />
        ) : (
          <>
            <Toolbar
              search={search}
              onSearchChange={setSearch}
              budget={budget}
              onBudgetChange={handleBudgetChange}
              safeMode={safeMode}
              onSafeModeChange={handleSafeModeChange}
              greensOnly={greensOnly}
              onGreensOnlyChange={handleGreensOnlyChange}
            />
            <FlipTable
              type={activeTab}
              flips={flipsByType[activeTab]}
              meta={meta}
              loading={loading}
              search={search}
              budget={budget}
              safeMode={safeMode}
              greensOnly={greensOnly}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
            />
          </>
        )}
      </main>
    </div>
  );
}
