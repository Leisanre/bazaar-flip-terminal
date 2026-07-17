import { useEffect, useState } from "react";
import { formatCoins } from "../format.js";

interface SparklineProps {
  itemId: string;
}

const WIDTH = 560;
const HEIGHT = 60;

// 48h price chart from the server's 5-minute samples, drawn as a plain SVG.
export function Sparkline({ itemId }: SparklineProps) {
  const [samples, setSamples] = useState<number[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/meta/history/${encodeURIComponent(itemId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setSamples(data.samples ?? []);
      })
      .catch((err) => console.error("history fetch failed", err));
    return () => {
      cancelled = true;
    };
  }, [itemId]);

  if (samples === null) return <div className="spark-note">loading price history...</div>;
  if (samples.length < 5) return <div className="spark-note">not enough history yet</div>;

  const min = Math.min(...samples);
  const max = Math.max(...samples);
  const range = max - min || 1;
  const points = samples
    .map((value, i) => {
      const x = (i / (samples.length - 1)) * WIDTH;
      const y = HEIGHT - ((value - min) / range) * (HEIGHT - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const last = samples[samples.length - 1];
  const first = samples[0];
  const trendUp = last >= first;

  return (
    <div className="spark-wrap">
      <svg width={WIDTH} height={HEIGHT} className="spark-svg">
        <polyline
          points={points}
          fill="none"
          stroke={trendUp ? "var(--gain-green)" : "var(--loss-red)"}
          strokeWidth="1.5"
        />
      </svg>
      <span className="spark-note">
        {samples.length} samples · low {formatCoins(min)} · high {formatCoins(max)} · now{" "}
        {formatCoins(last)}
      </span>
    </div>
  );
}
