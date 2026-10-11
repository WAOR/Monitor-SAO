import type { CSSProperties } from "react";

export function HealthBucketTooltip({
  text,
  index,
  count,
}: {
  text: string | null;
  index: number | null;
  count: number;
}) {
  if (!text || index == null || count <= 0) return null;

  const ratio = (index + 0.5) / count;
  const pct = Math.max(0, Math.min(100, ratio * 100));
  const style = {
    "--node-health-tooltip-x": `${pct.toFixed(2)}%`,
    "--node-health-tooltip-align": `${pct.toFixed(2)}%`,
    "--node-health-arrow-x": `clamp(12px, ${pct.toFixed(2)}%, calc(100% - 12px))`,
  } as CSSProperties;

  return (
    <span className="node-health-hover-tooltip" style={style} role="status">
      {text}
    </span>
  );
}
