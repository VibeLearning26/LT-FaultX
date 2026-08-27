"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export interface NavItem {
  label: string;
  href: string;
}

export default function RoleShell({
  roleLabel,
  accent,
  nav,
  userName,
  headerExtra,
  children,
}: {
  roleLabel: string;
  accent: string;
  nav: NavItem[];
  userName: string;
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-brand-500/10 bg-ink-900/60 p-4 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-brand-500 text-ink-950 shadow-glow">
            <span className="font-mono font-bold">⚡</span>
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">
              LT-<span className="text-brand-400">FaultX</span>
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-widest text-brand-100/40">
              {roleLabel}
            </p>
          </div>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {nav.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={[
                  "rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-brand-500/15 text-brand-300 shadow-glow"
                    : "text-brand-100/60 hover:bg-brand-500/10 hover:text-brand-100",
                ].join(" ")}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-brand-500/10 pt-4">
          <p className="truncate text-xs text-brand-100/50">{userName}</p>
          <button onClick={logout} className="btn-ghost mt-2 w-full text-xs">
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-brand-500/10 px-6 py-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${accent} animate-pulse-maint`} />
            <span className="text-sm text-brand-100/70">{roleLabel} console</span>
          </div>
          <div className="flex items-center gap-4">
            {headerExtra}
            <button onClick={logout} className="btn-ghost text-xs md:hidden">
              Sign out
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
