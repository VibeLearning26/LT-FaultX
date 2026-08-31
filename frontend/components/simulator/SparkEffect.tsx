"use client";

/**
 * SparkEffect — lightweight SVG arc/spark burst used at the break point, the
 * fuse and the pedestrian contact point.
 *
 * Pure SVG + SMIL/CSS: no animation library, matching the existing
 * operator/line-map conventions. Honours prefers-reduced-motion via the global
 * rule in globals.css (animations are neutralised there).
 */

interface SparkEffectProps {
  x: number;
  y: number;
  scale?: number;
  /** "hot" = white/amber arc, "shock" = red/amber body-contact arc */
  tone?: "hot" | "shock";
  rays?: number;
}

const TONES = {
  hot: { core: "#fff7d6", arc: "#ffc043", glow: "#ffb020" },
  shock: { core: "#ffffff", arc: "#ff6b3b", glow: "#ff3b3b" },
} as const;

export default function SparkEffect({
  x,
  y,
  scale = 1,
  tone = "hot",
  rays = 7,
}: SparkEffectProps) {
  const t = TONES[tone];
  const spokes = Array.from({ length: rays }, (_, i) => (360 / rays) * i);

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} aria-hidden>
      {/* soft glow */}
      <circle r={16} fill={t.glow} opacity={0.28} filter="url(#sim-glow-hot)">
        <animate
          attributeName="r"
          values="10;20;12"
          dur="0.55s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.35;0.12;0.35"
          dur="0.55s"
          repeatCount="indefinite"
        />
      </circle>

      {/* arc spokes */}
      {spokes.map((deg, i) => (
        <line
          key={deg}
          x1={0}
          y1={0}
          x2={0}
          y2={-13}
          stroke={t.arc}
          strokeWidth={1.6}
          strokeLinecap="round"
          transform={`rotate(${deg})`}
          opacity={0.9}
        >
          <animate
            attributeName="y2"
            values="-6;-15;-8"
            dur={`${0.28 + i * 0.035}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="1;0.15;1"
            dur={`${0.24 + i * 0.03}s`}
            repeatCount="indefinite"
          />
        </line>
      ))}

      {/* white-hot core */}
      <circle r={3.4} fill={t.core}>
        <animate
          attributeName="r"
          values="2;4.6;2.4"
          dur="0.22s"
          repeatCount="indefinite"
        />
      </circle>
    </g>
  );
}
