import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Loader2, Lock, LogOut, Wrench } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { ACCESS_CODE, ACCESS_STORAGE_KEY, TIME_SLOTS } from "@/lib/booking-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/schedule")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Booking Schedule — Sunil Plumbing Services" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SchedulePage,
});

type Booking = {
  id: string;
  customer_name: string;
  phone: string;
  address: string;
  job_type: string;
  booking_date: string;
  time_slot: string;
  created_at: string;
};

function SchedulePage() {
  const [authed, setAuthed] = useState(false);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(ACCESS_STORAGE_KEY) === "1") setAuthed(true);
  }, []);

  function tryAccess(e: React.FormEvent) {
    e.preventDefault();
    if (codeInput.trim() === ACCESS_CODE) {
      sessionStorage.setItem(ACCESS_STORAGE_KEY, "1");
      setAuthed(true);
      setCodeError(null);
    } else {
      setCodeError("Access Denied");
    }
  }

  function signOut() {
    sessionStorage.removeItem(ACCESS_STORAGE_KEY);
    setAuthed(false);
    setCodeInput("");
  }

  if (!authed) {
    return (
      <div className="min-h-screen grid place-items-center bg-background px-4">
        <form
          onSubmit={tryAccess}
          className="w-full max-w-sm bg-card border rounded-2xl shadow-soft p-8"
        >
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 rounded-full bg-primary/10 grid place-items-center mb-3">
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-xl font-bold">Schedule Access</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter the access code to view the booking schedule.
            </p>
          </div>

          <div className="mt-6 grid gap-2">
            <Label htmlFor="code">Access code</Label>
            <Input
              id="code"
              type="password"
              autoFocus
              value={codeInput}
              onChange={(e) => {
                setCodeInput(e.target.value);
                setCodeError(null);
              }}
              placeholder="••••••••"
            />
            {codeError && (
              <p className="text-sm text-destructive font-medium">{codeError}</p>
            )}
          </div>

          <Button type="submit" className="w-full mt-5">
            Unlock
          </Button>

          <Link
            to="/"
            className="mt-4 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-3 h-3" /> Back to booking page
          </Link>
        </form>
      </div>
    );
  }

  return <ScheduleView onSignOut={signOut} />;
}

function ScheduleView({ onSignOut }: { onSignOut: () => void }) {
  const [date, setDate] = useState<string>(() => format(new Date(), "yyyy-MM-dd"));
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("booking_date", date);
      if (cancelled) return;
      if (error) {
        setError("Could not load bookings.");
        setBookings([]);
      } else {
        setBookings(data ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  const sorted = useMemo(() => {
    const order = new Map<string, number>(TIME_SLOTS.map((s, i) => [s, i]));
    return [...bookings].sort(
      (a, b) => (order.get(a.time_slot) ?? 99) - (order.get(b.time_slot) ?? 99),
    );
  }, [bookings]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-hero-gradient text-white">
        <div className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid place-items-center w-10 h-10 rounded-lg bg-white/15 backdrop-blur">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold leading-none">Sunil Plumbing</p>
              <p className="text-xs text-white/80">Schedule dashboard</p>
            </div>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={onSignOut}
            className="text-white hover:bg-white/15 hover:text-white"
          >
            <LogOut className="w-4 h-4 mr-1.5" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">Bookings</h1>
            <p className="text-sm text-muted-foreground">
              Showing all bookings for the selected date in chronological order.
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="date" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-muted-foreground" /> Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[200px]"
            />
          </div>
        </div>

        <div className="bg-card border rounded-xl overflow-hidden shadow-soft">
          {loading ? (
            <div className="p-12 grid place-items-center text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-8 text-center text-destructive">{error}</div>
          ) : sorted.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No bookings for {format(new Date(date), "PP")}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/60 text-left">
                  <tr>
                    <Th>Time</Th>
                    <Th>Customer Name</Th>
                    <Th>Phone Number</Th>
                    <Th>Job Type</Th>
                    <Th>Address</Th>
                    <Th>Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((b) => (
                    <tr key={b.id} className="border-t hover:bg-muted/40 transition-colors">
                      <Td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-accent/15 text-accent-foreground font-semibold whitespace-nowrap">
                          {b.time_slot}
                        </span>
                      </Td>
                      <Td className="font-medium">{b.customer_name}</Td>
                      <Td>
                        <a
                          href={`tel:${b.phone}`}
                          className="text-primary hover:underline whitespace-nowrap"
                        >
                          {b.phone}
                        </a>
                      </Td>
                      <Td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium whitespace-nowrap">
                          {b.job_type ?? "—"}
                        </span>
                      </Td>
                      <Td className="max-w-[24rem] whitespace-pre-wrap">{b.address}</Td>
                      <Td className="whitespace-nowrap">{format(new Date(b.booking_date), "PP")}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          {sorted.length} booking{sorted.length === 1 ? "" : "s"} on this date.
        </p>
      </main>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </th>
  );
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 align-top ${className ?? ""}`}>{children}</td>;
}
