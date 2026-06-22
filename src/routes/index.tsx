import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Wrench,
  Droplets,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { TIME_SLOTS, JOB_TYPES } from "@/lib/booking-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sunil Plumbing Services — Book a Plumber Online" },
      {
        name: "description",
        content:
          "Book a trusted plumber from Sunil Plumbing Services. Pick a date and time slot — fast, reliable, and same-day plumbing service.",
      },
      { property: "og:title", content: "Sunil Plumbing Services — Book a Plumber" },
      {
        property: "og:description",
        content: "Reliable plumbing service. Book your time slot online in seconds.",
      },
    ],
  }),
  component: BookingPage,
});

function todayISO() {
  return format(new Date(), "yyyy-MM-dd");
}

function BookingPage() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [jobType, setJobType] = useState<string>("");
  const [date, setDate] = useState<string>(todayISO());
  const [slot, setSlot] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [confirmed, setConfirmed] = useState<{ jobType: string; date: string; slot: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingSlots(true);
      setError(null);
      const { data, error } = await supabase
        .from("bookings")
        .select("time_slot")
        .eq("booking_date", date);
      if (cancelled) return;
      if (error) {
        setError("Could not load availability. Please retry.");
        setBookedSlots([]);
      } else {
        setBookedSlots((data ?? []).map((b) => b.time_slot));
      }
      setLoadingSlots(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [date]);

  // Clear selected slot if it becomes booked after date change
  useEffect(() => {
    if (slot && bookedSlots.includes(slot)) setSlot(null);
  }, [bookedSlots, slot]);

  const availableSlots = useMemo(
    () => TIME_SLOTS.filter((s) => !bookedSlots.includes(s)),
    [bookedSlots],
  );

  function validate(): string | null {
    if (!fullName.trim()) return "Please enter your full name.";
    if (!/^\d{10}$/.test(phone.trim()))
      return "Phone number must be exactly 10 digits (numbers only).";
    if (!address.trim()) return "Please enter your address.";
    if (!jobType) return "Please select a plumbing issue / job type.";
    if (!date) return "Please pick a booking date.";
    if (!slot) return "Please select an available time slot.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setSubmitting(true);

    // Re-check availability right before insert
    const { data: existing, error: checkErr } = await supabase
      .from("bookings")
      .select("id")
      .eq("booking_date", date)
      .eq("time_slot", slot!)
      .maybeSingle();

    if (checkErr) {
      setError("Could not verify availability. Please try again.");
      setSubmitting(false);
      return;
    }
    if (existing) {
      setError("Sorry, that slot was just booked. Please pick another.");
      setBookedSlots((prev) => Array.from(new Set([...prev, slot!])));
      setSlot(null);
      setSubmitting(false);
      return;
    }

    const { error: insertErr } = await supabase.from("bookings").insert({
      customer_name: fullName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      job_type: jobType,
      booking_date: date,
      time_slot: slot!,
    });

    if (insertErr) {
      // Unique violation -> double booking race
      if (insertErr.code === "23505") {
        setError("Sorry, that slot was just booked. Please pick another.");
        setBookedSlots((prev) => Array.from(new Set([...prev, slot!])));
        setSlot(null);
      } else {
        setError("Something went wrong saving your booking. Please try again.");
      }
      setSubmitting(false);
      return;
    }

    setConfirmed({ jobType, date, slot: slot! });
    setSuccess(true);
    setSubmitting(false);
  }

  function resetForm() {
    setFullName("");
    setPhone("");
    setAddress("");
    setJobType("");
    setSlot(null);
    setSuccess(false);
    setConfirmed(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <header className="bg-hero-gradient text-white">
        <div className="mx-auto max-w-6xl px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid place-items-center w-10 h-10 rounded-lg bg-white/15 backdrop-blur">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold leading-none">Sunil Plumbing</p>
              <p className="text-xs text-white/80">Services</p>
            </div>
          </div>
          <Link
            to="/schedule"
            className="text-sm text-white/85 hover:text-white underline-offset-4 hover:underline"
          >
            View schedule
          </Link>
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-6 pb-16 md:pt-12 md:pb-24 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-1 text-xs uppercase tracking-wider bg-white/15 px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> Trusted local plumbers
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-tight">
              Leaky pipe? Blocked drain?
              <br />
              <span className="text-[oklch(0.92_0.13_75)]">We're on the way.</span>
            </h1>
            <p className="mt-4 text-white/90 max-w-md">
              Book a certified plumber online in under a minute. Pick a date, choose an available
              time slot, and we'll handle the rest.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <ShieldCheck className="w-4 h-4" /> Licensed & insured
              </span>
              <span className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <Clock className="w-4 h-4" /> Same-day slots
              </span>
              <span className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full">
                <Droplets className="w-4 h-4" /> Workmanship guarantee
              </span>
            </div>
          </div>

          <div className="hidden md:flex justify-end">
            <div className="relative">
              <div className="absolute -inset-6 bg-white/10 rounded-3xl blur-2xl" />
              <div className="relative bg-white/10 backdrop-blur rounded-2xl p-8 border border-white/20">
                <Wrench className="w-32 h-32 text-white/90" strokeWidth={1.2} />
                <Droplets className="w-12 h-12 text-[oklch(0.92_0.13_75)] absolute -bottom-2 -right-2" />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Booking form */}
      <main className="mx-auto max-w-3xl px-4 -mt-12 md:-mt-16 pb-16">
        <div className="bg-card rounded-2xl shadow-soft border p-6 md:p-8">
          {success ? (
            <SuccessCard onAnother={resetForm} details={confirmed} />
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold">Book your plumber</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Fill in your details below. All fields are required.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="grid gap-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <Field label="Full Name">
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Anita Sharma"
                      maxLength={100}
                      disabled={submitting}
                    />
                  </Field>
                  <Field label="Phone Number (10 digits)" icon={<Phone className="w-4 h-4" />}>
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      inputMode="numeric"
                      pattern="[0-9]{10}"
                      maxLength={10}
                      disabled={submitting}
                    />
                  </Field>
                </div>

                <Field label="Plumbing Issue / Job Type" icon={<Wrench className="w-4 h-4" />}>
                  <select
                    value={jobType}
                    onChange={(e) => setJobType(e.target.value)}
                    disabled={submitting}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Select an issue…</option>
                    {JOB_TYPES.map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                </Field>
                


                <Field label="Address" icon={<MapPin className="w-4 h-4" />}>
                  <Textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House / Flat, Street, City"
                    rows={2}
                    maxLength={300}
                    disabled={submitting}
                  />
                </Field>

                <Field label="Booking Date" icon={<CalendarDays className="w-4 h-4" />}>
                  <Input
                    type="date"
                    value={date}
                    min={todayISO()}
                    onChange={(e) => setDate(e.target.value)}
                    disabled={submitting}
                  />
                </Field>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" /> Time Slot
                    </Label>
                    {loadingSlots && (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Checking availability…
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {TIME_SLOTS.map((s) => {
                      const taken = bookedSlots.includes(s);
                      const active = slot === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={taken || submitting || loadingSlots}
                          onClick={() => setSlot(s)}
                          className={cn(
                            "px-3 py-2 rounded-lg text-sm font-medium border transition-all flex flex-col items-center leading-tight",
                            taken &&
                              "bg-muted text-muted-foreground cursor-not-allowed opacity-70",
                            !taken && !active && "bg-background hover:border-primary hover:text-primary",
                            active && "bg-primary text-primary-foreground border-primary shadow-soft",
                          )}
                          aria-pressed={active}
                          aria-label={taken ? `${s} already booked` : s}
                        >
                          <span className={cn(taken && "line-through")}>{s}</span>
                          {taken && (
                            <span className="text-[10px] uppercase tracking-wide text-destructive font-semibold mt-0.5">
                              Already Booked
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {!loadingSlots && availableSlots.length === 0 && (
                    <p className="text-sm text-destructive mt-3">
                      All slots are booked for this date. Please choose another day.
                    </p>
                  )}
                </div>

                {error && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm px-3 py-2">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={submitting}
                  className="bg-accent text-accent-foreground hover:brightness-95 font-semibold"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Booking…
                    </>
                  ) : (
                    "Confirm Booking"
                  )}
                </Button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Sunil Plumbing Services. All rights reserved.
        </p>
      </main>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label className="flex items-center gap-2">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {label}
      </Label>
      {children}
    </div>
  );
}

function SuccessCard({
  onAnother,
  details,
}: {
  onAnother: () => void;
  details: { jobType: string; date: string; slot: string } | null;
}) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 grid place-items-center mb-4">
        <CheckCircle2 className="w-9 h-9 text-primary" />
      </div>
      <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
      <p className="text-muted-foreground mt-2 max-w-md mx-auto">
        Your booking request has been received successfully.
      </p>
      {details && (
        <dl className="mt-5 mx-auto max-w-sm text-left border rounded-lg p-4 bg-muted/30 text-sm grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          <dt className="font-medium text-muted-foreground">Job Type</dt>
          <dd>{details.jobType}</dd>
          <dt className="font-medium text-muted-foreground">Date</dt>
          <dd>{format(new Date(details.date), "PP")}</dd>
          <dt className="font-medium text-muted-foreground">Time</dt>
          <dd>{details.slot}</dd>
        </dl>
      )}
      <Button onClick={onAnother} className="mt-6" variant="outline">
        Make another booking
      </Button>
    </div>
  );
}
