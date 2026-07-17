export type BazaarEventKind =
  | "buy_order_setup"
  | "sell_offer_setup"
  | "buy_order_filled"
  | "sell_offer_filled"
  | "insta_buy"
  | "insta_sell"
  | "npc_sell"
  | "order_cancelled"
  | "unknown";

export interface BazaarEvent {
  kind: BazaarEventKind;
  player: string;
  itemName?: string;
  amount?: number;
  totalCoins?: number;
  rawLine: string;
  timestamp: number;
}

export type PositionStatus = "waiting_fill" | "holding" | "selling" | "closed";

export interface TrackedPosition {
  id: string;
  player: string;
  itemName: string;
  itemId?: string;
  amount: number;
  buyUnitPrice: number;
  sellUnitPrice?: number;
  status: PositionStatus;
  openedAt: number;
  closedAt?: number;
  // How the position exited: NPC sells are untaxed, bazaar sells pay 1.25%.
  closedBy?: "bazaar" | "npc";
  // Live market comparison, computed on read:
  outbid?: boolean;
  currentTopBuyOrder?: number;
  currentLowestSellOffer?: number;
  exitDriftPercent?: number;
}
