"use client";

import type { CSSProperties } from "react";
import SparkEffect from "./SparkEffect";

/**
 * WalkingPerson — the pedestrian on the road beneath the LT span.
 *
 * Walks back and forth indefinitely while the system is NORMAL. When the
 * conductor snaps, walking stops, the figure moves under the break point and
 * enters a shocked state (rigid posture + body arcing) until RESET.
 *
 * Limb rigging: every limb is a vertical line drawn from (0,0) downwards inside
 * a group translated to its joint. The swing is a pure rotation about that
 * joint (`transform-box: fill-box` + `transform-origin: top center`, which for a
 * zero-width line is exactly the joint), so limbs stay welded to the body
 * instead of drifting away from it.
 *
 * Motion is CSS-driven and is neutralised automatically by the global
 * prefers-reduced-motion rule in globals.css.
 */

interface WalkingPersonProps {
  /** left/right bounds of the patrol path (svg user units) */
  fromX: number;
  toX: number;
  /** ground line the feet stand on */
  baseY: number;
  walking: boolean;
  shocked: boolean;
  /** absolute x used when walking has stopped */
  stoppedX: number;
  /** seconds for a single one-way traverse */
  duration?: number;
}

/** joint positions + limb lengths (local units, feet at y = 0) */
const HIP_Y = -25;
const LEG_LEN = 25;
const SHOULDER_Y = -43;
const ARM_LEN = 16;

export default function WalkingPerson({
  fromX,
  toX,
  baseY,
  walking,
  shocked,
  stoppedX,
  duration = 7,
}: WalkingPersonProps) {
  const skin = shocked ? "#ff8f6b" : "#d8e6dd";
  const cloth = shocked ? "#7a1f1f" : "#2f6d4a";

  const outerStyle: CSSProperties = walking
    ? ({
        ["--sim-walk-from" as any]: `${fromX}px`,
        ["--sim-walk-to" as any]: `${toX}px`,
        ["--sim-walk-dur" as any]: `${duration}s`,
      } as CSSProperties)
    : { transform: `translateX(${stoppedX}px)`, transition: "transform 1.1s ease-out" };

  /** static pose used whenever the walk cycle is not running */
  const pose = (deg: number): CSSProperties | undefined =>
    walking ? undefined : { transform: `rotate(${deg}deg)` };

  const legBackDeg = shocked ? -11 : -9;
  const legFrontDeg = shocked ? 11 : 9;
  // a downward line rotated ~150deg points up and outward — raised, rigid arms
  const armBackDeg = shocked ? 152 : -7;
  const armFrontDeg = shocked ? -152 : 7;

  return (
    <g transform={`translate(0 ${baseY})`}>
      <g className={walking ? "sim-walker" : undefined} style={outerStyle}>
        <g className={walking ? "sim-walker-flip" : undefined}>
          {/* shadow */}
          <ellipse cx={0} cy={2} rx={11} ry={3} fill="#000" opacity={0.45} />

          <g className={shocked ? "sim-shock-jitter" : undefined}>
            {/* ---- legs (drawn first so the torso overlaps the hips) ---- */}
            <g transform={`translate(0 ${HIP_Y})`}>
              <g
                className={`sim-limb${walking ? " sim-leg-back" : ""}`}
                style={pose(legBackDeg)}
              >
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={LEG_LEN}
                  stroke="#1f2a24"
                  strokeWidth={3.4}
                  strokeLinecap="round"
                />
              </g>
              <g
                className={`sim-limb${walking ? " sim-leg-front" : ""}`}
                style={pose(legFrontDeg)}
              >
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={LEG_LEN}
                  stroke="#2b3a32"
                  strokeWidth={3.4}
                  strokeLinecap="round"
                />
              </g>
            </g>

            {/* ---- torso + head ---- */}
            <rect x={-5} y={-46} width={10} height={23} rx={4} fill={cloth} />
            <circle cx={0} cy={-52} r={6.4} fill={skin} />

            {/* ---- arms, pivoting at the shoulder ---- */}
            <g transform={`translate(0 ${SHOULDER_Y})`}>
              <g
                className={`sim-limb${walking ? " sim-arm-back" : ""}`}
                style={pose(armBackDeg)}
              >
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={ARM_LEN}
                  stroke={skin}
                  strokeWidth={3}
                  strokeLinecap="round"
                  opacity={0.8}
                />
              </g>
              <g
                className={`sim-limb${walking ? " sim-arm-front" : ""}`}
                style={pose(armFrontDeg)}
              >
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={ARM_LEN}
                  stroke={skin}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              </g>
            </g>

            {shocked && (
              <>
                {/* body arcing */}
                <SparkEffect x={0} y={-48} scale={0.75} tone="shock" rays={6} />
                <SparkEffect x={0} y={-26} scale={0.6} tone="shock" rays={5} />
                <circle
                  cx={0}
                  cy={-30}
                  r={22}
                  fill="none"
                  stroke="#ff3b3b"
                  strokeWidth={1}
                  opacity={0.5}
                >
                  <animate
                    attributeName="r"
                    values="16;28;16"
                    dur="0.9s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values="0.6;0.05;0.6"
                    dur="0.9s"
                    repeatCount="indefinite"
                  />
                </circle>
                <text
                  x={0}
                  y={-72}
                  textAnchor="middle"
                  fontSize={9.5}
                  letterSpacing={1.2}
                  fill="#ff3b3b"
                  fontFamily="ui-monospace, monospace"
                >
                  ELECTROCUTION (SIM)
                </text>
              </>
            )}
          </g>
        </g>
      </g>
    </g>
  );
}
