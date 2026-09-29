import { useState } from "react";
import { getDisplayRegionCode } from "@/utils/geo";

interface FlagProps {
  region?: string | null;
  size?: number;
}

export function Flag({ region, size = 14 }: FlagProps) {
  const value = region?.trim() ?? "";
  const [failStage, setFailStage] = useState(0);

  if (!value) {
    return (
      <span
        aria-hidden
        className="inline-block rounded-full shrink-0"
        style={{
          width: size,
          height: size,
          background: "var(--border-subtle)",
        }}
      />
    );
  }

  const flagCode = getDisplayRegionCode(value);
  const alt = `地区旗帜: ${flagCode}`;

  if (failStage >= 2) {
    return (
      <span
        role="img"
        aria-label={alt}
        className="inline-block rounded-full shrink-0"
        title={alt}
        style={{
          width: size,
          height: size,
          background: "var(--border-subtle)",
        }}
      />
    );
  }

  // 纯正圆旗帜：直接使用本地打包的 Circle Flags 圆形矢量图标集，失败时兜底至 xx.svg（未知地区圆形图标）
  const src =
    failStage === 0
      ? `/assets/flags/${flagCode.toLowerCase()}.svg`
      : "/assets/flags/xx.svg";

  return (
    <span
      className="inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden select-none"
      style={{
        width: size,
        height: size,
        lineHeight: 0,
      }}
    >
      <img
        src={src}
        alt={alt}
        loading="lazy"
        className="w-full h-full rounded-full pointer-events-none"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
        onError={() => setFailStage((prev) => prev + 1)}
      />
    </span>
  );
}

