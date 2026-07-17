import { readFileSync, existsSync } from "fs";
import path from "path";
import { kvGet, kvSet } from "./kvStore.js";

// Webhook URL comes from env (hosted) or server-config.json (local,
// gitignored). Player→Discord links live in the config's discordUsers map:
//   "discordUsers": { "Leisx": "123456789012345678" }
// DISCORD_USERS env (hosted) takes the same map as a JSON string.
let webhookUrl: string | null = null;
let discordUsers: Record<string, string> = {};

export async function initDiscord(): Promise<void> {
  webhookUrl = process.env.DISCORD_WEBHOOK_URL ?? null;
  if (process.env.DISCORD_USERS) {
    try {
      discordUsers = JSON.parse(process.env.DISCORD_USERS);
    } catch (err) {
      console.error("DISCORD_USERS env is not valid JSON", err);
    }
  }
  const configPath = path.resolve("server-config.json");
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      webhookUrl = webhookUrl ?? config.discordWebhookUrl ?? null;
      if (config.discordUsers) discordUsers = { ...config.discordUsers, ...discordUsers };
      // Legacy single-user field maps to every player.
      if (config.discordUserId) discordUsers["*"] = config.discordUserId;
    } catch (err) {
      console.error("server-config.json unreadable", err);
    }
  }
  // Links created through the website (kv-persisted) round out the map.
  const saved = await kvGet<Record<string, string>>("discord-links");
  if (saved) discordUsers = { ...discordUsers, ...saved };

  const linked = Object.keys(discordUsers).filter((k) => k !== "*");
  console.log(
    webhookUrl
      ? `discord alerts: enabled (${linked.length} player(s) linked)`
      : "discord alerts: no webhook configured"
  );
}

export async function setDiscordLink(player: string, discordId: string): Promise<void> {
  discordUsers[player] = discordId;
  const saved = (await kvGet<Record<string, string>>("discord-links")) ?? {};
  saved[player] = discordId;
  await kvSet("discord-links", saved);
}

export function getLinkedPlayers(): string[] {
  return Object.keys(discordUsers).filter((k) => k !== "*");
}

// mentionPlayer: the in-game name the alert concerns — if that player is
// linked (any capitalization), they get a real @mention so their phone buzzes.
function lookupDiscordId(player: string): string | undefined {
  const lower = player.toLowerCase();
  for (const [name, id] of Object.entries(discordUsers)) {
    if (name.toLowerCase() === lower) return id;
  }
  return discordUsers["*"];
}

export function sendDiscordAlert(message: string, mentionPlayer?: string): void {
  if (!webhookUrl) return;
  const id = mentionPlayer ? lookupDiscordId(mentionPlayer) : undefined;
  const content = id ? `<@${id}> ${message}` : message;
  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  }).catch((err) => console.error("discord alert failed", err));
}
