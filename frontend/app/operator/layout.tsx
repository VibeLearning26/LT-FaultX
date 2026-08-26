import RoleShell from "@/components/RoleShell";
import { getSession } from "@/lib/session";

const nav = [
  { label: "Dashboard", href: "/operator" },
  { label: "Live Map", href: "/operator/map" },
  { label: "Nodes", href: "/operator/nodes" },
  { label: "Active Faults", href: "/operator/faults" },
  { label: "Maintenance", href: "/operator/maintenance" },
  { label: "Alerts", href: "/operator/alerts" },
  { label: "Citizen Reports", href: "/operator/reports" },
  { label: "AI Assistant", href: "/operator/chat" },
];

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <RoleShell
      roleLabel="Operator"
      accent="bg-status-maint"
      nav={nav}
      userName={session?.name ?? "Operator"}
    >
      {children}
    </RoleShell>
  );
}
