"use client";

import SparkEffect from "./SparkEffect";

/**
 * PowerLine — the LT conductor spanning the two poles.
 *
 * NORMAL: a single sagging conductor. Hovering the mid-span fault zone snaps
 * the conductor (the interaction the demo is built around).
 * BROKEN: two drooping ends, the live end resting on the pedestrian.
 *
 * Software-only: hovering emits an application event. Nothing here can drive a
 * physical output.
 */

interface PowerLineProps {
  leftX: number;
  rightX: number;
  topY: number;
  broken: boolean;
  /** where the snapped live end lands (the pedestrian) */
  contactX: number;
  contactY: number;
  /** true once the conductor is actually touching the pedestrian */
  contacting: boolean;
  energised: boolean;
  /** hover/keyboard trigger for the snap */
  onSnap: () => void;
  disabled?: boolean;
}

export default function PowerLine({
  leftX,
  rightX,
  topY,
  broken,
  contactX,
  contactY,
  contacting,
  energised,
  onSnap,
  disabled = false,
}: PowerLineProps) {
  const y = topY - 34; // insulator height
  const midX = (leftX + rightX) / 2;
  const sag = y + 34;

  const intact = `M ${leftX + 22} ${y} Q ${midX} ${sag} ${rightX - 22} ${y}`;
  const stroke = energised ? "#8b9a91" : "#5c6b62";

  // Snapped ends: the live (left) end swings down onto the pedestrian.
  const liveEnd = `M ${leftX + 22} ${y} Q ${leftX + 120} ${y + 70} ${contactX} ${contactY}`;
  const deadEnd = `M ${rightX - 22} ${y} Q ${rightX - 90} ${y + 60} ${midX + 40} ${
    y + 120
  }`;

  return (
    <g>
      {!broken ? (
        <>
          <path
            d={intact}
            fill="none"
            stroke={stroke}
            strokeWidth={2.6}
            strokeLinecap="round"
          />
          {/* energised shimmer */}
          {energised && (
            <path
              d={intact}
              fill="none"
              stroke="#22e874"
              strokeWidth={1}
              opacity={0.5}
              strokeDasharray="6 14"
            >
              <animate
                attributeName="stroke-dashoffset"
                values="0;-40"
                dur="1.6s"
                repeatCount="indefinite"
              />
            </path>
          )}

          {/* mid-span fault zone — hover to snap */}
          <g
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-label="Fault zone: hover or press Enter to snap the LT conductor"
            aria-disabled={disabled}
            onMouseEnter={disabled ? undefined : onSnap}
            onFocus={disabled ? undefined : onSnap}
            onClick={disabled ? undefined : onSnap}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSnap();
              }
            }}
            style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
            className="sim-fault-zone"
          >
            <path
              d={intact}
              fill="none"
              stroke="transparent"
              strokeWidth={26}
              pointerEvents="stroke"
            />
            <rect
              x={midX - 62}
              y={sag - 40}
              width={124}
              height={30}
              rx={6}
              fill="#050705"
              opacity={0.55}
              stroke="#ffc043"
              strokeOpacity={0.45}
              pointerEvents="none"
            />
            <text
              x={midX}
              y={sag - 20}
              textAnchor="middle"
              fontSize={10.5}
              fill="#ffc043"
              letterSpacing={1}
              fontFamily="ui-monospace, monospace"
              pointerEvents="none"
            >
              HOVER: FAULT ZONE
            </text>
          </g>
        </>
      ) : (
        <>
          <path
            d={liveEnd}
            fill="none"
            stroke="#ff6b3b"
            strokeWidth={2.6}
            strokeLinecap="round"
            filter="url(#sim-glow-fault)"
            className="sim-wire-drop"
          />
          <path
            d={deadEnd}
            fill="none"
            stroke="#5c6b62"
            strokeWidth={2.4}
            strokeLinecap="round"
            className="sim-wire-sway"
          />
          {/* arcing at both severed ends */}
          <SparkEffect x={midX + 40} y={y + 120} scale={0.85} tone="hot" />
          {contacting && (
            <SparkEffect x={contactX} y={contactY} scale={1.15} tone="shock" rays={9} />
          )}
          <text
            x={midX}
            y={y + 150}
            textAnchor="middle"
            fontSize={10.5}
            fill="#ff3b3b"
            letterSpacing={1.5}
            fontFamily="ui-monospace, monospace"
          >
            CONDUCTOR SNAPPED · ARC
          </text>
        </>
      )}
    </g>
  );
}
