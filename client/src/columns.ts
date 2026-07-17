import type { FlipOpportunity, FlipType } from "../../shared/types.js";
import { formatCoins, formatPercent } from "./format.js";

export interface ColumnDef {
  key: string;
  label: string;
  getValue: (flip: FlipOpportunity) => number;
  render: (flip: FlipOpportunity) => string;
  emphasize?: boolean;
}

const VERDICT_RANK: Record<string, number> = { good: 2, risky: 1, avoid: 0 };
const VERDICT_LABEL: Record<string, string> = { good: "✓ flip it", risky: "~ risky", avoid: "✗ avoid" };

const spreadColumns: ColumnDef[] = [
  {
    key: "verdict",
    label: "Verdict",
    getValue: (f) => VERDICT_RANK[(f as any).verdict] ?? 1,
    render: (f) => VERDICT_LABEL[(f as any).verdict] ?? "?",
  },
  {
    key: "buyOrderPrice",
    label: "Buy Order",
    getValue: (f) => (f as any).buyOrderPrice,
    render: (f) => formatCoins((f as any).buyOrderPrice),
  },
  {
    key: "sellOrderPrice",
    label: "Sell Order",
    getValue: (f) => (f as any).sellOrderPrice,
    render: (f) => formatCoins((f as any).sellOrderPrice),
  },
  {
    key: "profitPerUnit",
    label: "Profit/Unit",
    getValue: (f) => f.profitPerUnit,
    render: (f) => formatCoins(f.profitPerUnit),
    emphasize: true,
  },
  {
    key: "marginPercent",
    label: "Margin",
    getValue: (f) => f.marginPercent,
    render: (f) => formatPercent(f.marginPercent),
  },
  {
    key: "tradedPerDay",
    label: "Traded/Day",
    getValue: (f) => (f as any).tradedPerDay ?? 0,
    render: (f) => formatCoins((f as any).tradedPerDay ?? 0),
  },
  {
    key: "profitPerHour",
    label: "Profit/Hr",
    getValue: (f) => (f as any).profitPerHour ?? 0,
    render: (f) => formatCoins((f as any).profitPerHour ?? 0),
  },
];

const craftColumns: ColumnDef[] = [
  {
    key: "craftCost",
    label: "Craft Cost",
    getValue: (f) => (f as any).craftCost,
    render: (f) => formatCoins((f as any).craftCost),
  },
  {
    key: "sellPrice",
    label: "Sell Price",
    getValue: (f) => (f as any).sellPrice,
    render: (f) => formatCoins((f as any).sellPrice),
  },
  {
    key: "profitPerUnit",
    label: "Profit/Unit",
    getValue: (f) => f.profitPerUnit,
    render: (f) => formatCoins(f.profitPerUnit),
    emphasize: true,
  },
  {
    key: "marginPercent",
    label: "Margin",
    getValue: (f) => f.marginPercent,
    render: (f) => formatPercent(f.marginPercent),
  },
  {
    key: "tradedPerDay",
    label: "Traded/Day",
    getValue: (f) => (f as any).tradedPerDay ?? 0,
    render: (f) => formatCoins((f as any).tradedPerDay ?? 0),
  },
];

const npcColumns: ColumnDef[] = [
  {
    key: "direction",
    label: "Direction",
    getValue: (f) => ((f as any).direction === "npc_to_market" ? 1 : 0),
    render: (f) => ((f as any).direction === "npc_to_market" ? "NPC → Bazaar" : "Bazaar → NPC"),
  },
  {
    key: "costPrice",
    label: "Cost",
    getValue: (f) => (f as any).costPrice,
    render: (f) => formatCoins((f as any).costPrice),
  },
  {
    key: "revenuePrice",
    label: "Revenue",
    getValue: (f) => (f as any).revenuePrice,
    render: (f) => formatCoins((f as any).revenuePrice),
  },
  {
    key: "profitPerUnit",
    label: "Profit/Unit",
    getValue: (f) => f.profitPerUnit,
    render: (f) => formatCoins(f.profitPerUnit),
    emphasize: true,
  },
  {
    key: "marginPercent",
    label: "Margin",
    getValue: (f) => f.marginPercent,
    render: (f) => formatPercent(f.marginPercent),
  },
  {
    key: "tradedPerDay",
    label: "Traded/Day",
    getValue: (f) => (f as any).tradedPerDay ?? 0,
    render: (f) => formatCoins((f as any).tradedPerDay ?? 0),
  },
  {
    key: "profitPerDay",
    label: "Profit/Day Cap",
    getValue: (f) => (f as any).profitPerDay ?? 0,
    render: (f) => ((f as any).profitPerDay ? formatCoins((f as any).profitPerDay) : "—"),
  },
];

export function getColumnsForType(type: FlipType): ColumnDef[] {
  if (type === "spread") return spreadColumns;
  if (type === "craft") return craftColumns;
  return npcColumns;
}
