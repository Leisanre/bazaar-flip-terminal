import { Router, json } from "express";
import { setDiscordLink, getLinkedPlayers, sendDiscordAlert } from "../services/discordService.js";
import { buildReport } from "../services/reportService.js";

export const settingsRouter = Router();
settingsRouter.use(json());

settingsRouter.get("/discord-links", (_req, res) => {
  res.json({ players: getLinkedPlayers() });
});

settingsRouter.post("/discord-link", async (req, res) => {
  const { player, discordId } = req.body ?? {};
  if (typeof player !== "string" || player.trim() === "") {
    res.status(400).json({ error: "player name required" });
    return;
  }
  if (typeof discordId !== "string" || !/^\d{15,21}$/.test(discordId.trim())) {
    res.status(400).json({ error: "discordId must be the long numeric Discord user ID" });
    return;
  }
  await setDiscordLink(player.trim(), discordId.trim());
  sendDiscordAlert(`🔗 Linked **${player.trim()}** — this ping confirms it works.`, player.trim());
  res.json({ ok: true });
});

// On-demand brag: fires the daily report right now.
settingsRouter.post("/send-report", (_req, res) => {
  sendDiscordAlert(buildReport());
  res.json({ ok: true });
});
