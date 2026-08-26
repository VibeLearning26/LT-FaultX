import RoleShell from "@/components/RoleShell";
import { getSession } from "@/lib/session";

const nav = [
  { label: "Home", href: "/user" },
  { label: "Check Power", href: "/user/check-status" },
  { label: "Report Outage", href: "/user/report" },
  { label: "Feedback", href: "/user/feedback" },
  { label: "AI Assistant", href: "/user/chat" },
];

export default async function UserLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <RoleShell
      roleLabel="Citizen"
      accent="bg-status-normal"
      nav={nav}
      userName={session?.name ?? "Citizen"}
    >
      {children}
    </RoleShell>
  );
}
