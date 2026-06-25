import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus, Trash2, UserPlus } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createHelper, deleteHelper } from "@/lib/staff.functions";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({
    meta: [{ title: "Manage Staff — Sunil Plumbing" }, { name: "robots", content: "noindex" }],
  }),
  beforeLoad: ({ context }) => {
    if (!context.isOwner) throw redirect({ to: "/schedule" });
  },
  component: StaffPage,
});

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
};

function StaffPage() {
  const { user } = Route.useRouteContext();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: pData, error: pErr } = await supabase
      .from("profiles" as any)
      .select("id,full_name,email");
    const { data: rData, error: rErr } = await supabase
      .from("user_roles" as any)
      .select("user_id,role");
    if (pErr || rErr) {
      setError("Could not load staff.");
      setLoading(false);
      return;
    }
    const roleMap = new Map<string, string>();
    for (const r of (rData ?? []) as any[]) {
      // a user may have multiple roles; prefer "owner"
      const cur = roleMap.get(r.user_id);
      if (!cur || r.role === "owner") roleMap.set(r.user_id, r.role);
    }
    const list = ((pData ?? []) as any[]).map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: roleMap.get(p.id) ?? "helper",
    }));
    list.sort((a, b) => (a.role === b.role ? a.full_name.localeCompare(b.full_name) : a.role === "owner" ? -1 : 1));
    setProfiles(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setError("Full name, email, and a password of at least 8 characters are required.");
      return;
    }
    setBusy(true);
    try {
      await createHelper({
        data: { full_name: fullName.trim(), email: email.trim(), password },
      });
      setInfo(`Helper "${fullName.trim()}" created.`);
      setFullName("");
      setEmail("");
      setPassword("");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Could not create helper.");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(p: Profile) {
    if (p.role === "owner") {
      setError("Owner accounts cannot be deleted from here.");
      return;
    }
    if (!confirm(`Delete helper "${p.full_name || p.email}"? This cannot be undone.`)) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await deleteHelper({ data: { user_id: p.id } });
      setInfo("Helper deleted.");
      await load();
    } catch (err: any) {
      setError(err?.message ?? "Could not delete helper.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-hero-gradient text-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <Link to="/schedule" className="inline-flex items-center gap-2 text-white/90 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back to schedule
          </Link>
          <span className="text-xs bg-white/10 px-3 py-1 rounded-full">Owner: {user?.email}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section className="bg-card border rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b">
            <h2 className="font-bold text-lg">Staff members</h2>
            <p className="text-sm text-muted-foreground">Owner has full access. Helpers can view schedule and update statuses.</p>
          </div>
          {loading ? (
            <div className="p-10 grid place-items-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-2 font-semibold">Name</th>
                  <th className="px-4 py-2 font-semibold">Email</th>
                  <th className="px-4 py-2 font-semibold">Role</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="px-4 py-3">{p.full_name || "—"}</td>
                    <td className="px-4 py-3">{p.email}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          p.role === "owner"
                            ? "inline-flex items-center text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-primary/10 text-primary"
                            : "inline-flex items-center text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-muted text-foreground/70"
                        }
                      >
                        {p.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.role === "owner" || p.id === user?.id ? (
                        <span className="text-xs text-muted-foreground">Protected</span>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive gap-1"
                          disabled={busy}
                          onClick={() => onDelete(p)}
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="bg-card border rounded-2xl p-5 h-fit">
          <div className="flex items-center gap-2 mb-1">
            <UserPlus className="w-4 h-4 text-primary" />
            <h2 className="font-bold">Add helper</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Create a new helper account. They will sign in with the email and password you set.
          </p>
          <form className="grid gap-3" onSubmit={onCreate}>
            <div className="grid gap-1.5">
              <Label htmlFor="hname">Full name</Label>
              <Input id="hname" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hemail">Email</Label>
              <Input id="hemail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="hpass">Temporary password</Label>
              <Input
                id="hpass"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
              />
              <p className="text-xs text-muted-foreground">At least 8 characters.</p>
            </div>
            {error && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">
                {error}
              </div>
            )}
            {info && (
              <div className="rounded-md border bg-muted text-foreground text-sm px-3 py-2">{info}</div>
            )}
            <Button type="submit" disabled={busy} className="gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Create helper
            </Button>
          </form>
        </section>
      </main>
    </div>
  );
}
