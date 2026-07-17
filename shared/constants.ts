// Hypixel bazaar tax on every completed sell (order fill or instant-sell).
export const BAZAAR_TAX_RATE = 0.0125;

export const MIN_MARGIN_PERCENT = 1;
export const MIN_VOLUME_THRESHOLD = 50;

// quick_status volume is total book depth, not depth at the top price —
// a thin/stale top-of-book on illiquid items (enchant books) can show
// absurd spreads that are not actually fillable. Cap spread flips only;
// NPC price-floor flips are genuinely uncapped (e.g. the classic gravel flip).
export const MAX_SPREAD_MARGIN_PERCENT = 300;

// Community-documented quirk: quick_status buy/sell price can misrepresent
// the real fillable price on a thin book. A distinct-order-count floor is a
// better liquidity signal than raw volume (one whale order can inflate volume
// while the book is still effectively empty at the quoted price).
export const MIN_ORDER_COUNT = 3;

// Manipulation detection: sample prices on an interval, keep a rolling
// window, and flag items trading far above their own median. The multiplier
// only fires on the pump side — below-median prices are dumps/crashes, which
// are a different (sometimes good) situation.
export const HISTORY_SAMPLE_INTERVAL_MS = 5 * 60 * 1000;
export const HISTORY_WINDOW_HOURS = 48;
export const MANIPULATION_RATIO = 2;
// ~3 hours of samples before we trust the median enough to flag anything.
export const MIN_HISTORY_SAMPLES = 36;

// Real-activity floors measured in COINS moved per day, not units — a unit
// floor unfairly cuts expensive items (7k Recombobulators/day is billions of
// coins) while letting penny items through. Spread flips need a genuinely
// busy market; craft/NPC tolerate slower ones since fills are one-sided.
export const MIN_DAILY_COINS_SPREAD = 100_000_000;
export const MIN_DAILY_COINS_OTHER = 250_000;

// Coin flow alone lets expensive-but-dead items through (340 Festering
// Maggots/day is 425M coins but only ~14 trades an hour — no exit door).
// Require real unit velocity too. Recombobulator (~7k/day) still passes.
export const MIN_DAILY_UNITS_SPREAD = 2_000;

// "Safe mode" beginner gate (client toggle, spread tab): only markets deep
// enough that fills are fast and prices stay honest.
export const SAFE_MODE_MIN_DAILY_TRADED = 500_000;

// Verdict thresholds: margins above the sweet zone usually mean a hidden
// catch; flow imbalance is the one-sided-market trap (fast entry, dead exit).
export const VERDICT_MARGIN_SWEET_MAX = 30;
export const VERDICT_RISKY_FLOW_IMBALANCE = 4;
export const VERDICT_AVOID_FLOW_IMBALANCE = 10;

// A best price backed by fewer units than one stack is fragile — it can
// vanish or reprice before your order interacts with it.
export const THIN_WALL_UNITS = 64;

// Budget planner: assume you capture only this share of an item's daily
// trades — you're one of several flippers competing for the same fills.
export const REALISTIC_FILL_SHARE = 0.1;
