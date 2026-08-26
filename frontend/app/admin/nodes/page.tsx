import { PageHeader, SimBadge } from "@/components/ui";
import { NODES } from "@/lib/demo-data";

export default function AdminNodesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nodes"
        subtitle="Monitoring node inventory and topology configuration."
        right={
          <div className="flex items-center gap-2">
            <SimBadge />
            <button className="btn-primary text-sm">Add node</button>
          </div>
        }
      />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-500/10 text-xs uppercase tracking-wide text-brand-100/40">
            <tr>
              <th className="px-4 py-3">Node ID</th>
              <th className="px-4 py-3">Sequence</th>
              <th className="px-4 py-3">Locality</th>
              <th className="px-4 py-3">Pincode</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-500/5">
            {NODES.map((n) => (
              <tr key={n.id} className="hover:bg-brand-500/5">
                <td className="px-4 py-3 font-mono text-brand-300">{n.id}</td>
                <td className="px-4 py-3 font-mono">{n.sequence}</td>
                <td className="px-4 py-3">{n.locality}</td>
                <td className="px-4 py-3 font-mono">{n.pincode}</td>
                <td className="px-4 py-3">
                  <span className={n.status === "ONLINE" ? "text-status-normal" : "text-status-fault"}>
                    {n.status}
                  </span>
                </td>
                <td className="px-4 py-3 flex gap-2">
                  <button className="btn-ghost text-xs">Edit</button>
                  <button className="btn-ghost text-xs">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
