import { PageHeader, SimBadge } from "@/components/ui";

const OPERATORS = [
  { id: "OP-01", name: "Demo Operator", area: "Ernakulam", assigned: 12, completed: 11, avg: "42m", sla: "94%", rating: "4.2" },
  { id: "OP-02", name: "A. Nair", area: "Thrissur", assigned: 8, completed: 8, avg: "37m", sla: "98%", rating: "4.6" },
  { id: "OP-03", name: "S. Menon", area: "Kozhikode", assigned: 15, completed: 12, avg: "55m", sla: "86%", rating: "3.9" },
];

export default function AdminOperatorsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Operators"
        subtitle="Operational performance metrics."
        right={<SimBadge />}
      />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-500/10 text-xs uppercase tracking-wide text-brand-100/40">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Area</th>
              <th className="px-4 py-3">Assigned</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Avg Resolution</th>
              <th className="px-4 py-3">SLA</th>
              <th className="px-4 py-3">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-500/5">
            {OPERATORS.map((o) => (
              <tr key={o.id} className="hover:bg-brand-500/5">
                <td className="px-4 py-3 font-mono text-brand-300">{o.id}</td>
                <td className="px-4 py-3">{o.name}</td>
                <td className="px-4 py-3">{o.area}</td>
                <td className="px-4 py-3 font-mono">{o.assigned}</td>
                <td className="px-4 py-3 font-mono">{o.completed}</td>
                <td className="px-4 py-3 font-mono">{o.avg}</td>
                <td className="px-4 py-3 font-mono text-status-normal">{o.sla}</td>
                <td className="px-4 py-3 font-mono">{o.rating}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-brand-100/40">
        Operational analytics only — not for employment or disciplinary decisions.
      </p>
    </div>
  );
}
