import RoleShell from "@/components/RoleShell";
import ModeToggle from "@/components/ModeToggle";
import { getCurrentUser } from "@/lib/auth";

const nav = [
  { label: "Overview", href: "/admin/dashboard" },
  { label: "Kerala Map", href: "/admin/map" },
  { label: "Fault Analytics", href: "/admin/analytics" },
  { label: "Maintenance", href: "/admin/maintenance" },
  { label: "Operators", href: "/admin/operators" },
  { label: "Users", href: "/admin/users" },
  { label: "Nodes", href: "/admin/nodes" },
  { label: "ESP32 Devices", href: "/admin/devices" },
  { label: "Citizen Feedback", href: "/admin/feedback" },
  { label: "Configuration", href: "/admin/settings" },
  { label: "Audit Logs", href: "/admin/audit" },
  { label: "AI Assistant", href: "/admin/chat" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <RoleShell
      roleLabel="Administrator"
      accent="bg-status-info"
      nav={nav}
      userName={user?.name ?? "Administrator"}
      headerExtra={<ModeToggle />}
    >
      {children}
    </RoleShell>
  );
}
