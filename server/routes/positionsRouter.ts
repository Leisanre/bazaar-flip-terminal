import { Router, json } from "express";
import { parseBazaarLine } from "../services/bazaarChatParser.js";
import { applyEvent, getPositions, dismissPosition } from "../services/positionsService.js";

export const positionsRouter = Router();
positionsRouter.use(json());

// Mod retries can deliver the same lines twice — drop exact repeats seen
// within the window.
const recentLines = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60_000;

// The mod posts raw chat lines; parsing lives server-side so new wordings
// never require a mod rebuild.
positionsRouter.post("/events", (req, res) => {
  const { player, lines } = req.body ?? {};
  if (typeof player !== "string" || !Array.isArray(lines)) {
    res.status(400).json({ error: "expected { player: string, lines: string[] }" });
    return;
  }
  const now = Date.now();
  for (const [key, seenAt] of recentLines) {
    if (now - seenAt > DEDUPE_WINDOW_MS) recentLines.delete(key);
  }
  for (const line of lines) {
    if (typeof line !== "string") continue;
    const key = `${player}|${line}`;
    if (recentLines.has(key)) continue;
    recentLines.set(key, now);
    applyEvent(parseBazaarLine(line, player, now));
  }
  res.json({ ok: true, received: lines.length });
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
