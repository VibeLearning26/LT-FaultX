import RoleShell from "@/components/RoleShell";
import { getSession } from "@/lib/session";

const nav = [
  { label: "Overview", href: "/admin/dashboard" },
  { label: "Kerala Map", href: "/admin/map" },
  { label: "Fault Analytics", href: "/admin/analytics" },
  { label: "Maintenance", href: "/admin/maintenance" },
  { label: "Operators", href: "/admin/operators" },
  { label: "Users", href: "/admin/users" },
  { label: "Nodes", href: "/admin/nodes" },
  { label: "Citizen Feedback", href: "/admin/feedback" },
  { label: "Configuration", href: "/admin/settings" },
  { label: "Audit Logs", href: "/admin/audit" },
  { label: "AI Assistant", href: "/admin/chat" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <RoleShell
      roleLabel="Administrator"
      accent="bg-status-info"
      nav={nav}
      userName={session?.name ?? "Administrator"}
    >
      {children}
    </RoleShell>
  );
}
