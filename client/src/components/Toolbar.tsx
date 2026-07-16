interface ToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  budget: number;
  onBudgetChange: (value: number) => void;
}

// Accepts "10m", "1.5b", "500k" or plain numbers.
export function parseBudgetInput(raw: string): number {
  const cleaned = raw.trim().toLowerCase().replace(/,/g, "");
  const match = cleaned.match(/^([\d.]+)\s*([kmb])?$/);
  if (!match) return 0;
  const base = parseFloat(match[1]);
  if (!Number.isFinite(base)) return 0;
  const mult = match[2] === "b" ? 1e9 : match[2] === "m" ? 1e6 : match[2] === "k" ? 1e3 : 1;
  return base * mult;
}

export function Toolbar({ search, onSearchChange, budget, onBudgetChange }: ToolbarProps) {
  return (
    <div className="toolbar">
      <input
        className="toolbar-input search-input"
        type="text"
        placeholder="search items..."
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="budget-wrap">
        <span className="budget-label">my coins</span>
        <input
          className="toolbar-input budget-input"
          type="text"
          placeholder="e.g. 10m"
          defaultValue={budget > 0 ? String(budget) : ""}
          onChange={(e) => onBudgetChange(parseBudgetInput(e.target.value))}
        />
      </div>
    </div>
  );
}
