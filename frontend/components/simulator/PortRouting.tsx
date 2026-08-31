"use client";

import type { SimulatorPort } from "@/lib/simulator-client";

/**
 * PortRouting — the node's feeder ports and where the signal is currently
 * flowing. On a fault the PRIMARY port is isolated and load is rerouted to the
 * BACKUP port; RESET returns it. Status is always carried by a text label as
 * well as colour.
 */

interface Props {
  ports: SimulatorPort[];
  activePort: string | null;
  rerouted: boolean;
  deviceId: string;
}

const W = 640;
const H = 150;
const SRC_X = 70;
const PORT_X = 300;
const OUT_X = 560;
const ROW_Y = [50, 108];

function tone(p: SimulatorPort) {
  if (p.status === "FAULT") return "#ff3b3b";
  if (p.carrying) return "#22e874";
  return "#8b9a91";
}

export default function PortRouting({ ports, activePort, rerouted, deviceId }: Props) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-brand-100/85">Port Routing &amp; Signal Path</h3>
        <span className={`pill ${rerouted ? "pill-maint" : "pill-normal"}`}>
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current" />
          {rerouted ? "REROUTED" : "DIRECT"}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={
          rerouted
            ? `Signal rerouted to ${activePort ?? "backup port"} because the primary port is faulted`
            : `Signal flowing directly through ${activePort ?? "the primary port"}`
        }
      >
        {/* source bus */}
        <rect
          x={SRC_X - 46}
          y={ROW_Y[0] - 18}
          width={64}
          height={ROW_Y[1] - ROW_Y[0] + 36}
          rx={6}
          fill="#0f1712"
          stroke="#00c853"
          strokeOpacity={0.35}
        />
        <text
          x={SRC_X - 14}
          y={(ROW_Y[0] + ROW_Y[1]) / 2 + 4}
          textAnchor="middle"
          fontSize={10}
          fill="#93ffbf"
          fontFamily="ui-monospace, monospace"
        >
          SOURCE
        </text>

        {ports.map((p, i) => {
          const y = ROW_Y[i] ?? ROW_Y[0];
          const c = tone(p);
          const flowing = p.carrying;
          return (
            <g key={p.id}>
              {/* feed in */}
              <line
                x1={SRC_X + 20}
                y1={(ROW_Y[0] + ROW_Y[1]) / 2}
                x2={PORT_X - 56}
                y2={y}
                stroke={c}
                strokeWidth={flowing ? 2.6 : 1.4}
                strokeOpacity={flowing ? 0.95 : 0.35}
                strokeDasharray={flowing ? "8 6" : undefined}
              >
                {flowing && (
                  <animate
                    attributeName="stroke-dashoffset"
                    values="28;0"
                    dur="0.9s"
                    repeatCount="indefinite"
                  />
                )}
              </line>

              {/* port block */}
              <rect
                x={PORT_X - 56}
                y={y - 17}
                width={112}
                height={34}
                rx={6}
                fill="#0b120e"
                stroke={c}
                strokeOpacity={0.75}
              />
              <text
                x={PORT_X}
                y={y - 3}
                textAnchor="middle"
                fontSize={11}
                fill={c}
                fontFamily="ui-monospace, monospace"
              >
                {p.id}
              </text>
              <text
                x={PORT_X}
                y={y + 10}
                textAnchor="middle"
                fontSize={8.5}
                letterSpacing={0.8}
                fill="#8b9a91"
                fontFamily="ui-monospace, monospace"
              >
                {p.role} · {p.status}
              </text>

              {/* feed out */}
              <line
                x1={PORT_X + 56}
                y1={y}
                x2={OUT_X - 40}
                y2={(ROW_Y[0] + ROW_Y[1]) / 2}
                stroke={c}
                strokeWidth={flowing ? 2.6 : 1.4}
                strokeOpacity={flowing ? 0.95 : 0.3}
                strokeDasharray={flowing ? "8 6" : undefined}
              >
                {flowing && (
                  <animate
                    attributeName="stroke-dashoffset"
                    values="28;0"
                    dur="0.9s"
                    repeatCount="indefinite"
                  />
                )}
              </line>

              {/* isolation break on a faulted port */}
              {p.status === "FAULT" && (
                <>
                  <line
                    x1={PORT_X + 74}
                    y1={y - 12}
                    x2={PORT_X + 92}
                    y2={y + 12}
                    stroke="#ff3b3b"
                    strokeWidth={2.4}
                  />
                  <line
                    x1={PORT_X + 92}
                    y1={y - 12}
                    x2={PORT_X + 74}
                    y2={y + 12}
                    stroke="#ff3b3b"
                    strokeWidth={2.4}
                  />
                  <text
                    x={PORT_X + 83}
                    y={y + 26}
                    textAnchor="middle"
                    fontSize={8}
                    fill="#ff3b3b"
                    fontFamily="ui-monospace, monospace"
                  >
                    ISOLATED
                  </text>
                </>
              )}

              {/* load */}
              <text
                x={PORT_X - 70}
                y={y + 3}
                textAnchor="end"
                fontSize={9}
                fill="#8b9a91"
                fontFamily="ui-monospace, monospace"
              >
                {p.load_pct}%
              </text>
            </g>
          );
        })}

        {/* downstream load */}
        <rect
          x={OUT_X - 40}
          y={ROW_Y[0] - 6}
          width={86}
          height={ROW_Y[1] - ROW_Y[0] + 12}
          rx={6}
          fill="#0f1712"
          stroke="#00c853"
          strokeOpacity={0.35}
        />
        <text
          x={OUT_X + 3}
          y={(ROW_Y[0] + ROW_Y[1]) / 2}
          textAnchor="middle"
          fontSize={10}
          fill="#93ffbf"
          fontFamily="ui-monospace, monospace"
        >
          DOWNSTREAM
        </text>
        <text
          x={OUT_X + 3}
          y={(ROW_Y[0] + ROW_Y[1]) / 2 + 13}
          textAnchor="middle"
          fontSize={8.5}
          fill="#8b9a91"
          fontFamily="ui-monospace, monospace"
        >
          {deviceId}
        </text>
      </svg>

      <p className="mt-2 text-xs text-brand-100/45">
        {rerouted
          ? `Primary port isolated by the fault — signal is being carried on ${activePort}. Supply downstream is maintained while the crew is dispatched.`
          : `Signal is flowing through ${activePort ?? "the primary port"}; the backup port is on standby.`}
      </p>
    </div>
  );
}
