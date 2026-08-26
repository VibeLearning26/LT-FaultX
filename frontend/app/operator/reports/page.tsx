import { PageHeader, SimBadge, Card } from "@/components/ui";
import { REPORTS } from "@/lib/demo-data";

function elecTone(v: "YES" | "NO" | "PARTIAL") {
  return v === "YES" ? "text-status-normal" : v === "PARTIAL" ? "text-status-maint" : "text-status-fault";
}

export default function OperatorReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Citizen Reports"
        subtitle="Public outage reports — compared against IoT telemetry and operator data."
        right={<SimBadge label="User reported" />}
      />

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-500/10 text-xs uppercase tracking-wide text-brand-100/40">
            <tr>
              <th className="px-4 py-3">Report</th>
              <th className="px-4 py-3">Pincode</th>
              <th className="px-4 py-3">Locality</th>
              <th className="px-4 py-3">Electricity</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-500/5">
            {REPORTS.map((r) => (
              <tr key={r.id} className="hover:bg-brand-500/5">
                <td className="px-4 py-3 font-mono text-brand-300">{r.id}</td>
                <td className="px-4 py-3 font-mono">{r.pincode}</td>
                <td className="px-4 py-3">{r.locality}</td>
                <td className={`px-4 py-3 font-semibold ${elecTone(r.electricity)}`}>{r.electricity}</td>
                <td className="px-4 py-3 text-brand-100/60">{r.description}</td>
                <td className="px-4 py-3 text-brand-100/40">{r.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
