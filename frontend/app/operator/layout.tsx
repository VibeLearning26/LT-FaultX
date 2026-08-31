import RoleShell from "@/components/RoleShell";
import { getCurrentUser } from "@/lib/auth";

const nav = [
  { label: "Dashboard", href: "/operator" },
  { label: "Line Map", href: "/operator/line-map" },
  { label: "Live Map", href: "/operator/map" },
  { label: "Nodes", href: "/operator/nodes" },
  { label: "Active Faults", href: "/operator/faults" },
  { label: "Maintenance", href: "/operator/maintenance" },
  { label: "Alerts", href: "/operator/alerts" },
  { label: "Notifications", href: "/operator/notifications" },
  { label: "Citizen Reports", href: "/operator/reports" },
  { label: "Hardware Monitor", href: "/operator/hardware" },
  { label: "AI Assistant", href: "/operator/chat" },
  { label: "⚡ Fault Simulator", href: "/simulator" },
];

export default async function OperatorLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <RoleShell
      roleLabel="Operator"
      accent="bg-status-maint"
      nav={nav}
      userName={user?.name ?? "Operator"}
    >
      {children}
    </RoleShell>
  );
}
