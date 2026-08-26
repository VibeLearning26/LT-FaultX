import { PageHeader, SimBadge, StatusPill } from "@/components/ui";
import { NODES } from "@/lib/demo-data";

export default function OperatorNodesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Node Monitoring"
        subtitle="Distributed monitoring nodes along the LT line, in topology order."
        right={<SimBadge />}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-500/10 text-xs uppercase tracking-wide text-brand-100/40">
            <tr>
              <th className="px-4 py-3">Node</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Voltage</th>
              <th className="px-4 py-3">Current</th>
              <th className="px-4 py-3">Heartbeat</th>
              <th className="px-4 py-3">Last Seen</th>
              <th className="px-4 py-3">Comm</th>
              <th className="px-4 py-3">Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-500/5">
            {NODES.map((n) => (
              <tr key={n.id} className="hover:bg-brand-500/5">
                <td className="px-4 py-3 font-mono text-brand-300">{n.id}</td>
                <td className="px-4 py-3">
                  {n.locality}
                  <span className="ml-1 text-xs text-brand-100/40">{n.pincode}</span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={
                      n.status === "ONLINE"
                        ? "text-status-normal"
                        : n.status === "STALE"
                          ? "text-status-maint"
                          : "text-status-fault"
                    }
                  >
                    {n.status}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono">{n.voltage ? `${n.voltage} V` : "—"}</td>
                <td className="px-4 py-3 font-mono">{n.current ? `${n.current} A` : "—"}</td>
                <td className="px-4 py-3">
                  <span className={n.heartbeat === "OK" ? "text-status-normal" : "text-status-fault"}>
                    {n.heartbeat}
                  </span>
                </td>
                <td className="px-4 py-3 text-brand-100/60">{n.lastSeen}</td>
                <td className="px-4 py-3">
                  <span
                    className={
                      n.comm === "OK"
                        ? "text-status-normal"
                        : n.comm === "DEGRADED"
                          ? "text-status-maint"
                          : "text-status-fault"
                    }
                  >
                    {n.comm}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <StatusPill kind={n.health} pulse={n.health === "fault"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-brand-100/40">
        Note: STALE or OFFLINE communication is not automatically a physical line fault. The
        fault engine (Phase 3) combines heartbeat, voltage, current, neighbours and timeout
        before classifying.
      </p>
    </div>
  );
}
