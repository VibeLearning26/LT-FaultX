"use client";

/**
 * ElectricalPole — a single LT distribution pole (concrete post + crossarm +
 * insulators). Purely presentational.
 */

interface ElectricalPoleProps {
  /** centre x of the pole */
  x: number;
  /** y of the crossarm (conductor height) */
  topY: number;
  /** y where the pole meets the ground */
  baseY: number;
  label: string;
  /** faulted poles get a red-tinted cap light */
  energised?: boolean;
}

export default function ElectricalPole({
  x,
  topY,
  baseY,
  label,
  energised = true,
}: ElectricalPoleProps) {
  const capColor = energised ? "#22e874" : "#ff3b3b";

  return (
    <g>
      {/* post */}
      <rect
        x={x - 7}
        y={topY - 26}
        width={14}
        height={baseY - topY + 26}
        rx={3}
        fill="#26312b"
        stroke="#3c4b41"
        strokeWidth={1}
      />
      {/* concrete banding */}
      {Array.from({ length: 6 }, (_, i) => (
        <line
          key={i}
          x1={x - 7}
          x2={x + 7}
          y1={topY + 14 + i * ((baseY - topY - 14) / 6)}
          y2={topY + 14 + i * ((baseY - topY - 14) / 6)}
          stroke="#1a231d"
          strokeWidth={1}
        />
      ))}

      {/* crossarm */}
      <rect x={x - 34} y={topY - 30} width={68} height={7} rx={2} fill="#33423a" />

      {/* insulators */}
      <circle cx={x - 22} cy={topY - 34} r={4.5} fill="#4a5b50" stroke="#5f7367" />
      <circle cx={x + 22} cy={topY - 34} r={4.5} fill="#4a5b50" stroke="#5f7367" />

      {/* status cap light */}
      <circle cx={x} cy={topY - 40} r={3.6} fill={capColor} opacity={0.95}>
        <animate
          attributeName="opacity"
          values="1;0.35;1"
          dur={energised ? "2.4s" : "0.7s"}
          repeatCount="indefinite"
        />
      </circle>

      {/* base */}
      <ellipse cx={x} cy={baseY} rx={20} ry={5} fill="#0d1310" opacity={0.85} />

      <text
        x={x}
        y={baseY + 20}
        textAnchor="middle"
        fontSize={11}
        fill="#93ffbf"
        opacity={0.65}
        fontFamily="ui-monospace, monospace"
      >
        {label}
      </text>
    </g>
  );
}
