import { useEffect, useState } from "react";

// Self-serve player→Discord linking. The Discord user ID comes from:
// Discord Settings → Advanced → Developer Mode ON → right-click your own
// name → Copy User ID.
export function DiscordLink() {
  const [linked, setLinked] = useState<string[]>([]);
  const [player, setPlayer] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function refresh() {
    fetch("/api/settings/discord-links")
      .then((res) => res.json())
      .then((data) => setLinked(data.players ?? []))
      .catch(() => {});
  }

  useEffect(refresh, []);

  async function save() {
    setStatus(null);
    try {
      const res = await fetch("/api/settings/discord-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ player, discordId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus(data.error ?? "failed");
        return;
      }
      setStatus("linked! check Discord for the confirmation ping");
      setPlayer("");
      setDiscordId("");
      refresh();
    } catch {
      setStatus("server unreachable");
    }
  }

  return (
    <div className="discord-link">
      <span className="stat-label">discord pings</span>
      <div className="discord-link-row">
        <input
          className="toolbar-input"
          placeholder="minecraft name"
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
        />
        <input
          className="toolbar-input discord-id-input"
          placeholder="discord user ID (long number)"
          title="Discord → Settings → Advanced → Developer Mode ON → right-click your name → Copy User ID"
          value={discordId}
          onChange={(e) => setDiscordId(e.target.value)}
        />
        <button className="link-button" onClick={save} disabled={!player || !discordId}>
          link
        </button>
      </div>
      <span className="spark-note">
        {status ??
          (linked.length > 0
            ? `linked: ${linked.join(", ")}`
            : "get your ID: Discord → Settings → Advanced → Developer Mode → right-click your name → Copy User ID")}
      </span>
    </div>
  );
}
