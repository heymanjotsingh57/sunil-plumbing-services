import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowLeft, CalendarDays, Loader2, Wrench } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { TIME_SLOTS } from "@/lib/booking-constants";
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
          <Link
            to="/"
            className="text-sm text-white/85 hover:text-white inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Back to booking
          </Link>
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
                    <Th>Date</Th>
                    <Th>Customer Name</Th>
                    <Th>Phone Number</Th>
                    <Th>Address</Th>
                    <Th>Job Type</Th>
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
                      <Td className="whitespace-nowrap">{format(new Date(b.booking_date), "PP")}</Td>
                      <Td className="font-medium">{b.customer_name}</Td>
                      <Td>
                        <a
                          href={`tel:${b.phone}`}
                          className="text-primary hover:underline whitespace-nowrap"
                        >
                          {b.phone}
                        </a>
                      </Td>
                      <Td className="max-w-[24rem] whitespace-pre-wrap">{b.address}</Td>
                      <Td>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-medium whitespace-nowrap">
                          {b.job_type ?? "—"}
                        </span>
                      </Td>
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
