import { Router, json } from "express";
import { parseBazaarLine } from "../services/bazaarChatParser.js";
import { applyEvent, getPositions, dismissPosition } from "../services/positionsService.js";

export const positionsRouter = Router();
positionsRouter.use(json());

// Retries may deliver the same event repeatedly — dedupe by the mod's
// per-line uuid (kept for the life of the process, capped), plus a short
// text-window fallback for legacy payloads without ids.
const seenIds = new Set<string>();
const MAX_SEEN_IDS = 50_000;
const recentLines = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60_000;

function isDuplicate(id: string | undefined, player: string, line: string, now: number): boolean {
  if (id) {
    if (seenIds.has(id)) return true;
    if (seenIds.size >= MAX_SEEN_IDS) seenIds.clear();
    seenIds.add(id);
    return false;
  }
  const key = `${player}|${line}`;
  const seenAt = recentLines.get(key);
  if (seenAt !== undefined && now - seenAt < DEDUPE_WINDOW_MS) return true;
  recentLines.set(key, now);
  return false;
}

// The mod posts raw chat lines; parsing lives server-side so new wordings
// never require a mod rebuild. Accepts { events: [{id, line}] } (current mod)
// and legacy { lines: [string] }.
positionsRouter.post("/events", (req, res) => {
  const { player, lines, events } = req.body ?? {};
  if (typeof player !== "string" || (!Array.isArray(lines) && !Array.isArray(events))) {
    res.status(400).json({ error: "expected { player, events: [{id, line}] } or { player, lines }" });
    return;
  }
  const now = Date.now();
  for (const [key, seenAt] of recentLines) {
    if (now - seenAt > DEDUPE_WINDOW_MS) recentLines.delete(key);
  }

  const incoming: { id?: string; line: string }[] = Array.isArray(events)
    ? events.filter((e) => e && typeof e.line === "string")
    : (lines as unknown[]).filter((l): l is string => typeof l === "string").map((line) => ({ line }));

  let applied = 0;
  for (const { id, line } of incoming) {
    if (isDuplicate(id, player, line, now)) continue;
    applyEvent(parseBazaarLine(line, player, now));
    applied++;
  }
  res.json({ ok: true, received: incoming.length, applied });
});

positionsRouter.get("/", (_req, res) => {
  res.json({ positions: getPositions() });
});

positionsRouter.delete("/:id", (req, res) => {
  const removed = dismissPosition(req.params.id);
  if (!removed) {
    res.status(404).json({ error: "position not found" });
    return;
  }
  res.json({ ok: true });
});
