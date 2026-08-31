"use client";

import SparkEffect from "./SparkEffect";

/**
 * FaultPoint — the pole-mounted fuse unit (FD) and its RESET button.
 *
 * Clicking the fuse makes it arc and fail (a second, independent fault mode).
 * Pressing RESET restores the fuse, regenerates the conductor and clears the
 * active fault through the backend recovery path.
 */

interface FaultPointProps {
  x: number;
  y: number;
  fuseOk: boolean;
  faultActive: boolean;
  busy?: boolean;
  onFuseClick: () => void;
  onReset: () => void;
}

export default function FaultPoint({
  x,
  y,
  fuseOk,
  faultActive,
  busy = false,
  onFuseClick,
  onReset,
}: FaultPointProps) {
  const bodyStroke = fuseOk ? "#3c8f5d" : "#ff3b3b";
  const W = 74;
  const CX = x + W / 2 - 4;

  return (
    <g>
      {/* mounting bracket */}
      <rect x={x - 26} y={y - 6} width={22} height={5} fill="#33423a" />
      <rect x={x - 26} y={y + 24} width={22} height={5} fill="#33423a" />

      {/* fuse enclosure — clickable */}
      <g
        role="button"
        tabIndex={0}
        aria-label={
          fuseOk
            ? "Fuse box FD: fuse element healthy, click to blow the fuse"
            : "Fuse box FD: fuse element blown, press RESET to restore"
        }
        onClick={busy ? undefined : onFuseClick}
        onKeyDown={(e) => {
          if (busy) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onFuseClick();
          }
        }}
        style={{ cursor: busy ? "wait" : "pointer" }}
        className="sim-fuse"
      >
        <rect
          x={x - 4}
          y={y - 26}
          width={W}
          height={62}
          rx={6}
          fill="#0f1712"
          stroke={bodyStroke}
          strokeWidth={2}
        />
        <text
          x={CX}
          y={y - 12}
          textAnchor="middle"
          fontSize={9.5}
          letterSpacing={0.6}
          fill="#93ffbf"
          opacity={0.8}
          fontFamily="ui-monospace, monospace"
        >
          FUSE BOX (FD)
        </text>

        {/* ---- the fuse element itself: cartridge + filament ---- */}
        {/* terminals */}
        <rect x={x + 2} y={y - 2} width={7} height={14} rx={1.5} fill="#5b6b61" />
        <rect x={x + W - 13} y={y - 2} width={7} height={14} rx={1.5} fill="#5b6b61" />
        {/* glass body */}
        <rect
          x={x + 9}
          y={y - 3}
          width={W - 22}
          height={16}
          rx={7}
          fill={fuseOk ? "#0c2a19" : "#2a0d0d"}
          stroke={fuseOk ? "#22e874" : "#ff3b3b"}
          strokeWidth={1.3}
          strokeOpacity={0.8}
        />
        {/* filament — continuous when OK, snapped open when blown */}
        {fuseOk ? (
          <path
            d={`M ${x + 12} ${y + 5} l 6 0 l 4 -5 l 5 10 l 5 -10 l 5 10 l 4 -5 l 8 0`}
            fill="none"
            stroke="#22e874"
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        ) : (
          <>
            <path
              d={`M ${x + 12} ${y + 5} l 6 0 l 4 -5 l 3 6`}
              fill="none"
              stroke="#7a3030"
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <path
              d={`M ${x + W - 25} ${y + 6} l 3 -6 l 4 5 l 6 0`}
              fill="none"
              stroke="#7a3030"
              strokeWidth={1.8}
              strokeLinecap="round"
            />
            <SparkEffect x={CX} y={y + 5} scale={0.7} tone="hot" rays={6} />
          </>
        )}

        <text
          x={CX}
          y={y + 28}
          textAnchor="middle"
          fontSize={9}
          letterSpacing={0.8}
          fill={fuseOk ? "#22e874" : "#ff3b3b"}
          fontFamily="ui-monospace, monospace"
        >
          {fuseOk ? "ELEMENT OK" : "ELEMENT BLOWN"}
        </text>
      </g>

      {/* RESET button */}
      <g
        role="button"
        tabIndex={0}
        aria-label="RESET: restore fuse and regenerate the line"
        aria-disabled={busy}
        onClick={busy ? undefined : onReset}
        onKeyDown={(e) => {
          if (busy) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onReset();
          }
        }}
        style={{ cursor: busy ? "wait" : "pointer" }}
        className="sim-reset"
      >
        <rect
          x={x + 8}
          y={y + 44}
          width={54}
          height={26}
          rx={13}
          fill={faultActive ? "#4a0f0f" : "#14201a"}
          stroke={faultActive ? "#ff3b3b" : "#3c4b41"}
          strokeWidth={1.6}
          className={faultActive ? "animate-pulse-fault" : undefined}
        />
        <text
          x={x + 35}
          y={y + 61}
          textAnchor="middle"
          fontSize={10}
          letterSpacing={1}
          fill={faultActive ? "#ffb3b3" : "#8b9a91"}
          fontFamily="ui-monospace, monospace"
        >
          RESET
        </text>
      </g>
    </g>
  );
}
