import { readFileSync, existsSync } from "fs";
import path from "path";

// Webhook URL and optional user id come from env (hosted) or
// server-config.json in the project root (local, gitignored).
let webhookUrl: string | null = null;
let mentionUserId: string | null = null;

export function initDiscord(): void {
  webhookUrl = process.env.DISCORD_WEBHOOK_URL ?? null;
  mentionUserId = process.env.DISCORD_USER_ID ?? null;
  const configPath = path.resolve("server-config.json");
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, "utf-8"));
      webhookUrl = webhookUrl ?? config.discordWebhookUrl ?? null;
      mentionUserId = mentionUserId ?? config.discordUserId ?? null;
    } catch (err) {
      console.error("server-config.json unreadable", err);
    }
  }
  console.log(webhookUrl ? "discord alerts: enabled" : "discord alerts: no webhook configured");
}

// mention: true pings the configured user so the phone actually buzzes —
// reserve it for alerts that need action NOW.
export function sendDiscordAlert(message: string, mention = false): void {
  if (!webhookUrl) return;
  const content = mention && mentionUserId ? `<@${mentionUserId}> ${message}` : message;
  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content }),
  }).catch((err) => console.error("discord alert failed", err));
}
