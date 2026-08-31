"use client";

import ElectricalPole from "./ElectricalPole";
import PowerLine from "./PowerLine";
import FaultPoint from "./FaultPoint";
import WalkingPerson from "./WalkingPerson";
import SparkEffect from "./SparkEffect";

/** Scene geometry — shared so the container can align contact points. */
export const SCENE = {
  width: 1000,
  height: 470,
  leftPoleX: 190,
  rightPoleX: 760,
  conductorY: 150,
  groundY: 392,
  roadTop: 340,
  roadBottom: 436,
  walkFrom: 300,
  walkTo: 650,
  /** where the snapped live end lands (mid-span, on the road) */
  contactX: 475,
} as const;

interface SimulatorSceneProps {
  lineConnected: boolean;
  fuseOk: boolean;
  personShocked: boolean;
  faultActive: boolean;
  /** conductor is physically touching the pedestrian */
  contacting: boolean;
  walking: boolean;
  busy?: boolean;
  deviceId: string;
  pincode: string;
  area: string;
  onSnap: () => void;
  onFuseClick: () => void;
  onReset: () => void;
}

export default function SimulatorScene({
  lineConnected,
  fuseOk,
  personShocked,
  faultActive,
  contacting,
  walking,
  busy = false,
  deviceId,
  pincode,
  area,
  onSnap,
  onFuseClick,
  onReset,
}: SimulatorSceneProps) {
  const energised = lineConnected && fuseOk;
  const contactY = SCENE.groundY - 27; // pedestrian head/shoulder height

  return (
    <div className="relative overflow-hidden rounded-xl border border-brand-500/20 bg-ink-950">
      <svg
        viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
        className="h-full w-full"
        role="img"
        aria-label={
          faultActive
            ? "Simulated rural LT distribution scene: conductor snapped, fault active"
            : "Simulated rural LT distribution scene: line healthy"
        }
      >
        <defs>
          <linearGradient id="sim-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#050b12" />
            <stop offset="55%" stopColor="#0a1720" />
            <stop offset="100%" stopColor="#0d1a14" />
          </linearGradient>
          <linearGradient id="sim-ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#12201a" />
            <stop offset="100%" stopColor="#070d0a" />
          </linearGradient>
          <linearGradient id="sim-road" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c2422" />
            <stop offset="100%" stopColor="#0f1514" />
          </linearGradient>
          <radialGradient id="sim-lamp" cx="50%" cy="0%" r="70%">
            <stop offset="0%" stopColor="#ffd98a" stopOpacity="0.32" />
            <stop offset="100%" stopColor="#ffd98a" stopOpacity="0" />
          </radialGradient>
          <filter id="sim-glow-hot" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="3.2" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="sim-glow-fault" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* sky */}
        <rect width={SCENE.width} height={SCENE.roadTop + 10} fill="url(#sim-sky)" />

        {/* ground */}
        <rect
          y={SCENE.roadTop - 6}
          width={SCENE.width}
          height={SCENE.height - SCENE.roadTop + 6}
          fill="url(#sim-ground)"
        />

        {/* road */}
        <rect
          y={SCENE.roadTop}
          width={SCENE.width}
          height={SCENE.roadBottom - SCENE.roadTop}
          fill="url(#sim-road)"
        />
        <line
          x1={0}
          x2={SCENE.width}
          y1={SCENE.roadTop}
          y2={SCENE.roadTop}
          stroke="#2b3833"
          strokeWidth={1.5}
        />
        <line
          x1={0}
          x2={SCENE.width}
          y1={SCENE.roadBottom}
          y2={SCENE.roadBottom}
          stroke="#2b3833"
          strokeWidth={1.5}
        />
        <line
          x1={0}
          x2={SCENE.width}
          y1={(SCENE.roadTop + SCENE.roadBottom) / 2}
          y2={(SCENE.roadTop + SCENE.roadBottom) / 2}
          stroke="#54655c"
          strokeWidth={2}
          strokeDasharray="26 22"
          opacity={0.6}
        />

        {/* street lamp glow on the left pole */}
        <ellipse
          cx={SCENE.leftPoleX}
          cy={SCENE.groundY - 60}
          rx={110}
          ry={120}
          fill="url(#sim-lamp)"
          opacity={energised ? 1 : 0.15}
        />

        {/* poles */}
        <ElectricalPole
          x={SCENE.leftPoleX}
          topY={SCENE.conductorY}
          baseY={SCENE.groundY}
          label="POLE-A"
          energised={energised}
        />
        <ElectricalPole
          x={SCENE.rightPoleX}
          topY={SCENE.conductorY}
          baseY={SCENE.groundY}
          label="POLE-B"
          energised={energised}
        />

        {/* conductor */}
        <PowerLine
          leftX={SCENE.leftPoleX}
          rightX={SCENE.rightPoleX}
          topY={SCENE.conductorY}
          broken={!lineConnected}
          contactX={SCENE.contactX}
          contactY={contactY}
          contacting={contacting}
          energised={energised}
          onSnap={onSnap}
          disabled={busy || faultActive}
        />

        {/* fuse + reset on pole B */}
        <FaultPoint
          x={SCENE.rightPoleX + 14}
          y={SCENE.conductorY + 70}
          fuseOk={fuseOk}
          faultActive={faultActive}
          busy={busy}
          onFuseClick={onFuseClick}
          onReset={onReset}
        />

        {/* pedestrian */}
        <WalkingPerson
          fromX={SCENE.walkFrom}
          toX={SCENE.walkTo}
          baseY={SCENE.groundY + 22}
          walking={walking}
          shocked={personShocked}
          stoppedX={faultActive && !lineConnected ? SCENE.contactX : SCENE.walkFrom}
        />

        {/* extra arcing where the live end meets the road */}
        {!lineConnected && !contacting && (
          <SparkEffect x={SCENE.contactX} y={SCENE.groundY + 16} scale={0.8} tone="hot" />
        )}

        {/* node label + line status (text, never colour alone) */}
        <g>
          <rect
            x={36}
            y={SCENE.conductorY + 40}
            width={210}
            height={44}
            rx={8}
            fill="#050705"
            opacity={0.82}
            stroke={faultActive ? "#ff3b3b" : "#00c853"}
            strokeOpacity={0.5}
          />
          <text
            x={48}
            y={SCENE.conductorY + 60}
            fontSize={11}
            fill="#93ffbf"
            fontFamily="ui-monospace, monospace"
          >
            {deviceId} · PIN {pincode}
          </text>
          <text
            x={48}
            y={SCENE.conductorY + 76}
            fontSize={10}
            letterSpacing={1}
            fill={faultActive ? "#ff3b3b" : "#22e874"}
            fontFamily="ui-monospace, monospace"
          >
            {faultActive ? "● FAULT DETECTED" : "● LINE HEALTHY"} · {area}
          </text>
        </g>
      </svg>

      <style jsx global>{`
        @keyframes simWalk {
          from {
            transform: translateX(var(--sim-walk-from));
          }
          to {
            transform: translateX(var(--sim-walk-to));
          }
        }
        @keyframes simFlip {
          0%,
          49.9% {
            transform: scaleX(1);
          }
          50%,
          100% {
            transform: scaleX(-1);
          }
        }
        @keyframes simLimb {
          0%,
          100% {
            transform: rotate(17deg);
          }
          50% {
            transform: rotate(-17deg);
          }
        }
        @keyframes simArm {
          0%,
          100% {
            transform: rotate(23deg);
          }
          50% {
            transform: rotate(-23deg);
          }
        }
        @keyframes simJitter {
          0%,
          100% {
            transform: translate(0, 0);
          }
          25% {
            transform: translate(1.4px, -1px);
          }
          50% {
            transform: translate(-1.6px, 0.6px);
          }
          75% {
            transform: translate(1px, 1.2px);
          }
        }
        @keyframes simWireDrop {
          from {
            opacity: 0.35;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes simSway {
          0%,
          100% {
            transform: rotate(-1.6deg);
          }
          50% {
            transform: rotate(1.6deg);
          }
        }
        .sim-walker {
          animation: simWalk var(--sim-walk-dur, 7s) ease-in-out infinite alternate;
        }
        .sim-walker-flip {
          animation: simFlip calc(var(--sim-walk-dur, 7s) * 2) steps(1) infinite;
          /* mirror about the figure's own centre, not the viewBox centre */
          transform-box: fill-box;
          transform-origin: center;
        }
        /* Rotate limbs about their own joint. The limb is a zero-width vertical
           line starting at the joint, so fill-box + top center IS the joint —
           without this the origin resolves against the whole viewBox and the
           limbs detach from the body. */
        .sim-limb {
          transform-box: fill-box;
          transform-origin: top center;
        }
        .sim-leg-front {
          animation: simLimb 0.9s ease-in-out infinite;
        }
        .sim-leg-back {
          animation: simLimb 0.9s ease-in-out infinite reverse;
        }
        .sim-arm-front {
          animation: simArm 0.9s ease-in-out infinite reverse;
        }
        .sim-arm-back {
          animation: simArm 0.9s ease-in-out infinite;
        }
        .sim-shock-jitter {
          animation: simJitter 0.12s linear infinite;
        }
        .sim-wire-drop {
          animation: simWireDrop 0.45s ease-out 1;
        }
        .sim-wire-sway {
          animation: simSway 2.4s ease-in-out infinite;
          /* pivot at the pole attachment point, not the viewBox corner */
          transform-box: fill-box;
          transform-origin: top right;
        }
        .sim-fault-zone:hover rect,
        .sim-fault-zone:focus-visible rect {
          stroke-opacity: 1;
        }
        .sim-fuse:hover rect,
        .sim-reset:hover rect {
          filter: brightness(1.25);
        }
        .sim-fault-zone:focus,
        .sim-fuse:focus,
        .sim-reset:focus {
          outline: none;
        }
        .sim-fault-zone:focus-visible,
        .sim-fuse:focus-visible,
        .sim-reset:focus-visible {
          outline: 2px solid #22e874;
          outline-offset: 2px;
        }
      `}</style>
    </div>
  );
}
