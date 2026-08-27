import RoleShell from "@/components/RoleShell";
import { getCurrentUser } from "@/lib/auth";

const nav = [
  { label: "Home", href: "/user" },
  { label: "Check Power", href: "/user/check-status" },
  { label: "Report Outage", href: "/user/report" },
  { label: "Feedback", href: "/user/feedback" },
  { label: "AI Assistant", href: "/user/chat" },
];

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <RoleShell
      roleLabel="Citizen"
      accent="bg-status-normal"
      nav={nav}
      userName={user?.name ?? "Citizen"}
    >
      {children}
    </RoleShell>
  );
}
