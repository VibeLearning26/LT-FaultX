"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { homeForRole, toDbRole } from "@/lib/roles";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    // Read straight from the form so browser autofill values are always used.
    const fd = new FormData(e.currentTarget);
    const emailVal = String(fd.get("email") ?? "").trim();
    const passwordVal = String(fd.get("password") ?? "");

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: emailVal,
        password: passwordVal,
      });
      if (signInError || !data.user) {
        setError(signInError?.message ?? "Invalid credentials.");
        return;
      }

      // Resolve role from profiles (source of truth), fall back to metadata.
      let role = toDbRole((data.user.user_metadata as { role?: string })?.role);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();
      if (profile?.role) role = toDbRole(profile.role);

      const next = params.get("next");
      router.push(next && next.startsWith("/") ? next : homeForRole(role));
      router.refresh();
    } catch {
      setError("Network error. Is Supabase reachable?");
    } finally {
      setLoading(false);
    }
  }

  function quickFill(kind: "user" | "operator" | "admin") {
    const map = {
      user: ["citizen@demo.local", "Demo@User123"],
      operator: ["operator@demo.local", "Demo@Operator123"],
      admin: ["admin@demo.local", "Demo@Admin123"],
    } as const;
    setEmail(map[kind][0]);
    setPassword(map[kind][1]);
    setError(null);
  }

  return (
    <div className="card p-8">
      <h1 className="text-xl font-semibold">Sign in</h1>
      <p className="mt-1 text-sm text-brand-100/50">
        Access the control center or citizen portal.
      </p>

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm text-brand-100/70">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="operator@demo.local"
            className="w-full rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 text-brand-50 placeholder:text-brand-100/30 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-sm text-brand-100/70">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-brand-500/20 bg-ink-950/60 px-3 py-2 text-brand-50 placeholder:text-brand-100/30 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
          />
        </div>

        {error && (
          <p className="rounded-lg border border-status-fault/40 bg-status-fault/10 px-3 py-2 text-sm text-status-fault">
            {error}
          </p>
        )}

        <button type="submit" className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6 rounded-lg border border-brand-500/15 bg-ink-950/40 p-3 text-xs text-brand-100/50">
        <p className="mb-2 font-semibold text-brand-100/70">Demo accounts</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => quickFill("user")} className="btn-ghost px-2 py-1 text-xs">
            Citizen
          </button>
          <button onClick={() => quickFill("operator")} className="btn-ghost px-2 py-1 text-xs">
            Operator
          </button>
          <button onClick={() => quickFill("admin")} className="btn-ghost px-2 py-1 text-xs">
            Admin
          </button>
        </div>
        <p className="mt-2 font-mono">Tap a role to auto-fill, then Sign in.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-brand-500 text-ink-950 shadow-glow">
            <span className="font-mono text-lg font-bold">⚡</span>
          </div>
          <span className="font-semibold tracking-tight">
            LT-<span className="text-brand-400">FaultX</span>
          </span>
        </Link>

        <Suspense fallback={<div className="card p-8 text-brand-100/50">Loading…</div>}>
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-xs text-brand-100/40">
          Authentication is handled by Supabase Auth. Demo users are created via
          the backend seed script.
        </p>
      </div>
    </main>
  );
}
