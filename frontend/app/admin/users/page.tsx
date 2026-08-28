import { PageHeader, SimBadge } from "@/components/ui";

const USERS = [
  { id: "U-1001", name: "Demo Citizen", email: "citizen@demo.local", role: "USER", pincode: "682001" },
  { id: "U-1002", name: "Demo Operator", email: "operator@demo.local", role: "OPERATOR", pincode: "682016" },
  { id: "U-1003", name: "Demo Administrator", email: "admin@demo.local", role: "ADMIN", pincode: "—" },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        subtitle="Platform accounts and roles."
        right={
          <div className="flex items-center gap-2">
            <SimBadge />
            <button className="btn-primary text-sm">Add user</button>
          </div>
        }
      />
      <div className="card overflow-x-auto p-0">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-brand-500/10 text-xs uppercase tracking-wide text-brand-100/40">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Pincode</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-500/5">
            {USERS.map((u) => (
              <tr key={u.id} className="hover:bg-brand-500/5">
                <td className="px-4 py-3 font-mono text-brand-300">{u.id}</td>
                <td className="px-4 py-3">{u.name}</td>
                <td className="px-4 py-3 font-mono text-brand-100/60">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded border border-brand-500/20 px-2 py-0.5 text-xs">{u.role}</span>
                </td>
                <td className="px-4 py-3 font-mono">{u.pincode}</td>
                <td className="px-4 py-3">
                  <button className="btn-ghost text-xs">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
