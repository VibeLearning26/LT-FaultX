import { PageHeader, SimBadge } from "@/components/ui";

const LOGS = [
  { time: "10:44 AM", user: "system", action: "Fault detected", resource: "FT-00031", result: "OK" },
  { time: "10:45 AM", user: "operator@demo.local", action: "Acknowledged fault", resource: "FT-00031", result: "OK" },
  { time: "10:46 AM", user: "operator@demo.local", action: "Assigned maintenance", resource: "MJ-0012", result: "OK" },
  { time: "10:48 AM", user: "operator@demo.local", action: "Issued isolation command", resource: "NODE_04", result: "OK" },
  { time: "09:30 AM", user: "admin@demo.local", action: "Changed heartbeat timeout", resource: "system_settings", result: "OK" },
  { time: "09:05 AM", user: "admin@demo.local", action: "Added node", resource: "NODE_05", result: "OK" },
];

export default function AdminAuditPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Audit Logs" subtitle="Immutable record of important actions." right={<SimBadge />} />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-500/10 text-xs uppercase tracking-wide text-brand-100/40">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Resource</th>
              <th className="px-4 py-3">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-500/5">
            {LOGS.map((l, i) => (
              <tr key={i} className="hover:bg-brand-500/5">
                <td className="px-4 py-3 text-brand-100/40">{l.time}</td>
                <td className="px-4 py-3 font-mono text-brand-100/70">{l.user}</td>
                <td className="px-4 py-3">{l.action}</td>
                <td className="px-4 py-3 font-mono text-brand-300">{l.resource}</td>
                <td className="px-4 py-3 text-status-normal">{l.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
