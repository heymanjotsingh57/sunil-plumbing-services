import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  Loader2,
  LogOut,
  MapPin,
  Phone,
  RefreshCw,
  ShieldCheck,
  User,
  Users,
  Wrench,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TIME_SLOTS, BOOKING_STATUSES, type BookingStatus } from "@/lib/booking-constants";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [{ title: "Schedule — Sunil Plumbing Services" }, { name: "robots", content: "noindex" }],
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
  status: string;
  created_at: string;
};

function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

const slotOrder = new Map(TIME_SLOTS.map((s, i) => [s, i]));

function SchedulePage() {
  const { user, isOwner, roles } = Route.useRouteContext();
  const router = useRouter();

  const [date, setDate] = useState(todayISO());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("bookings")
      .select("id,customer_name,phone,address,job_type,booking_date,time_slot,status,created_at")
      .eq("booking_date", date);
    if (error) {
      setError("Could not load bookings.");
      setBookings([]);
    } else {
      const list = ((data ?? []) as any[]).map((b) => ({ ...b, status: b.status ?? "Pending" }));
      list.sort(
        (a, b) =>
          (slotOrder.get(a.time_slot) ?? 99) - (slotOrder.get(b.time_slot) ?? 99),
      );
      setBookings(list as Booking[]);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(id: string, status: BookingStatus) {
    setSavingId(id);
    const { error } = await supabase
      .from("bookings")
      .update({ status } as any)
      .eq("id", id);
    setSavingId(null);
    if (error) {
      setError("Could not update status.");
      return;
    }
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
  }

  async function deleteBooking(id: string) {
    if (!confirm("Delete this booking? This cannot be undone.")) return;
    setSavingId(id);
    const { error } = await supabase.from("bookings").delete().eq("id", id);
    setSavingId(null);
    if (error) {
      setError("Could not delete booking. Only the Owner can delete bookings.");
      return;
    }
    setBookings((prev) => prev.filter((b) => b.id !== id));
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const totalAvailable = useMemo(() => TIME_SLOTS.length - bookings.length, [bookings.length]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-hero-gradient text-white">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid place-items-center w-9 h-9 rounded-lg bg-white/15 backdrop-blur">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="hidden sm:block">
              <p className="font-bold leading-none">Sunil Plumbing</p>
              <p className="text-xs text-white/80">Staff schedule</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-white/10 rounded-full px-3 py-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>
                {user?.email} — <strong className="uppercase">{isOwner ? "Owner" : roles[0] ?? "Helper"}</strong>
              </span>
            </div>
            {isOwner && (
              <Link to="/staff">
                <Button size="sm" variant="secondary" className="gap-2">
                  <Users className="w-4 h-4" /> Staff
                </Button>
              </Link>
            )}
            <ThemeToggle className="bg-white/15 border-white/20 text-white hover:bg-white/25 hover:text-white" />
            <Button size="sm" variant="secondary" onClick={signOut} className="gap-2">
              <LogOut className="w-4 h-4" /> Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-5">
          <div>
            <h1 className="text-2xl font-bold">Bookings for {format(new Date(date), "PPPP")}</h1>
            <p className="text-sm text-muted-foreground">
              {loading
                ? "Loading…"
                : `${bookings.length} booked · ${Math.max(totalAvailable, 0)} slot${
                    Math.max(totalAvailable, 0) === 1 ? "" : "s"
                  } open`}
            </p>
          </div>
          <div className="flex items-end gap-2">
            <div className="grid gap-1.5">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-44"
              />
            </div>
            <Button variant="outline" onClick={() => void load()} className="gap-2">
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
            </Button>
          </div>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="grid place-items-center py-20 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="border rounded-2xl p-10 text-center bg-card">
            <CalendarDays className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">No bookings for this date.</p>
            <p className="text-sm text-muted-foreground">Pick another date to view its schedule.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-card border rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Time</th>
                    <th className="px-4 py-3 font-semibold">Customer</th>
                    <th className="px-4 py-3 font-semibold">Phone</th>
                    <th className="px-4 py-3 font-semibold">Address</th>
                    <th className="px-4 py-3 font-semibold">Job Type</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    {isOwner && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id} className="border-t">
                      <td className="px-4 py-3 font-medium whitespace-nowrap">{b.time_slot}</td>
                      <td className="px-4 py-3">{b.customer_name}</td>
                      <td className="px-4 py-3">
                        <a href={`tel:${b.phone}`} className="text-primary hover:underline">
                          {b.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 max-w-xs">{b.address}</td>
                      <td className="px-4 py-3">{b.job_type}</td>
                      <td className="px-4 py-3">
                        <StatusSelect
                          value={(b.status as BookingStatus) ?? "Pending"}
                          disabled={savingId === b.id}
                          onChange={(v) => updateStatus(b.id, v)}
                        />
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={savingId === b.id}
                            onClick={() => deleteBooking(b.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden grid gap-3">
              {bookings.map((b) => (
                <div key={b.id} className="bg-card border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold">{b.time_slot}</p>
                      <p className="text-sm">{b.customer_name}</p>
                    </div>
                    <StatusSelect
                      value={(b.status as BookingStatus) ?? "Pending"}
                      disabled={savingId === b.id}
                      onChange={(v) => updateStatus(b.id, v)}
                    />
                  </div>
                  <div className="mt-3 grid gap-1.5 text-sm">
                    <p className="flex items-start gap-2">
                      <Wrench className="w-4 h-4 mt-0.5 text-muted-foreground" /> {b.job_type}
                    </p>
                    <p className="flex items-start gap-2">
                      <Phone className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <a href={`tel:${b.phone}`} className="text-primary hover:underline">
                        {b.phone}
                      </a>
                    </p>
                    <p className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" /> {b.address}
                    </p>
                  </div>
                  {isOwner && (
                    <div className="mt-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        disabled={savingId === b.id}
                        onClick={() => deleteBooking(b.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-xs text-muted-foreground mt-6 flex items-center gap-1.5">
          <User className="w-3.5 h-3.5" /> Signed in as {user?.email}
        </p>
      </main>
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
  disabled,
}: {
  value: BookingStatus;
  onChange: (v: BookingStatus) => void;
  disabled?: boolean;
}) {
  const color: Record<BookingStatus, string> = {
    Pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    Confirmed: "bg-blue-100 text-blue-800 border-blue-300",
    "In Progress": "bg-purple-100 text-purple-800 border-purple-300",
    Completed: "bg-green-100 text-green-800 border-green-300",
    Cancelled: "bg-red-100 text-red-800 border-red-300",
  };
  return (
    <Select value={value} onValueChange={(v) => onChange(v as BookingStatus)} disabled={disabled}>
      <SelectTrigger className={cn("h-8 w-[140px] text-xs font-semibold border", color[value])}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {BOOKING_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {s}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
