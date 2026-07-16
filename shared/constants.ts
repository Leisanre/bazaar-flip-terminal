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

// Real-activity floors, from the moving-week trade stats. Community guidance
// (Coflnet guide) targets 10k+ units/day for spread flips; craft and NPC
// flips tolerate slower markets since fills are one-sided.
export const MIN_DAILY_TRADED_SPREAD = 10_000;
export const MIN_DAILY_TRADED_OTHER = 1_000;
