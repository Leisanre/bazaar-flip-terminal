import { readFileSync, existsSync } from "fs";
import path from "path";

// Webhook URL comes from DISCORD_WEBHOOK_URL env (hosted) or
// server-config.json in the project root (local, gitignored).
let webhookUrl: string | null = null;

export function initDiscord(): void {
  webhookUrl = process.env.DISCORD_WEBHOOK_URL ?? null;
  if (!webhookUrl) {
    const configPath = path.resolve("server-config.json");
    if (existsSync(configPath)) {
      try {
        const config = JSON.parse(readFileSync(configPath, "utf-8"));
        webhookUrl = config.discordWebhookUrl ?? null;
      } catch (err) {
        console.error("server-config.json unreadable", err);
      }
    }
  }
  console.log(webhookUrl ? "discord alerts: enabled" : "discord alerts: no webhook configured");
}

export function sendDiscordAlert(message: string): void {
  if (!webhookUrl) return;
  fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  }).catch((err) => console.error("discord alert failed", err));
}
