import { Router, json } from "express";
import { parseBazaarLine } from "../services/bazaarChatParser.js";
import { applyEvent, getPositions, dismissPosition } from "../services/positionsService.js";

export const positionsRouter = Router();
positionsRouter.use(json());

// The mod posts raw chat lines; parsing lives server-side so new wordings
// never require a mod rebuild.
positionsRouter.post("/events", (req, res) => {
  const { player, lines } = req.body ?? {};
  if (typeof player !== "string" || !Array.isArray(lines)) {
    res.status(400).json({ error: "expected { player: string, lines: string[] }" });
    return;
  }
  for (const line of lines) {
    if (typeof line !== "string") continue;
    applyEvent(parseBazaarLine(line, player, Date.now()));
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
