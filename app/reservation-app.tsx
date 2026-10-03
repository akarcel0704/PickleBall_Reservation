"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  MapPin,
  RefreshCw,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import {
  COURTS,
  TIME_SLOTS,
  courtName,
  formatBookingDate,
  formatTime,
  todayIso,
  type BookingDetails,
  type BookingRequestReceipt,
  type CourtId,
  type ReservedSlot,
} from "@/lib/reservations";

type SelectedSlot = { courtId: CourtId; startTime: string };

type ModelContext = {
  registerTool: (
    tool: {
      name: string;
      title: string;
      description: string;
      inputSchema: Record<string, unknown>;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: Record<string, unknown>) => Promise<unknown>;
    },
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

declare global {
  interface Document {
    readonly modelContext?: ModelContext;
  }
}

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body;
}

export function ReservationApp() {
  const [date, setDate] = useState(todayIso);
  const [reserved, setReserved] = useState<ReservedSlot[]>([]);
  const [selected, setSelected] = useState<SelectedSlot | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<BookingRequestReceipt | null>(null);
  const [guest, setGuest] = useState({
    guestName: "",
    email: "",
    phone: "",
    playerCount: "4",
  });

  const refreshAvailability = useCallback(async (bookingDate: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await readResponse<{ reservations: ReservedSlot[] }>(
        await fetch(`/api/reservations?date=${encodeURIComponent(bookingDate)}`, {
          cache: "no-store",
        }),
      );
      setReserved(data.reservations);
      return data.reservations;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Availability is unavailable.";
      setLoadError(message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void refreshAvailability(date), 0);
    return () => window.clearTimeout(timeout);
  }, [date, refreshAvailability]);

  const reservedKeys = useMemo(
    () => new Set(reserved.map((slot) => `${slot.courtId}-${slot.startTime}`)),
    [reserved],
  );

  const createReservation = useCallback(
    async (details: BookingDetails) => {
      const data = await readResponse<{ reservation: BookingRequestReceipt }>(
        await fetch("/api/reservations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(details),
        }),
      );
      setConfirmation(data.reservation);
      setSelected(null);
      await refreshAvailability(details.bookingDate);
      return data.reservation;
    },
    [refreshAvailability],
  );

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool(
        {
          name: "list_available_court_slots",
          title: "List available court slots",
          description: "List the open one-hour pickleball court times for a date in YYYY-MM-DD format.",
          inputSchema: {
            type: "object",
            properties: { date: { type: "string", description: "Booking date in YYYY-MM-DD format" } },
            required: ["date"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: false },
          async execute(input) {
            const requestedDate = String(input.date ?? "");
            const booked = await refreshAvailability(requestedDate);
            const bookedKeys = new Set(booked.map((slot) => `${slot.courtId}-${slot.startTime}`));
            return {
              date: requestedDate,
              available: COURTS.flatMap((court) =>
                TIME_SLOTS.filter((time) => !bookedKeys.has(`${court.id}-${time}`)).map((time) => ({
                  courtId: court.id,
                  courtName: court.name,
                  startTime: time,
                })),
              ),
            };
          },
        },
        { signal: lifecycle.signal },
      );
      await context.registerTool(
        {
          name: "create_court_reservation_request",
          title: "Request a court reservation",
          description: "Request one available pickleball court for one hour. The owner must approve the request.",
          inputSchema: {
            type: "object",
            properties: {
              courtId: { type: "string", enum: COURTS.map((court) => court.id) },
              bookingDate: { type: "string" },
              startTime: { type: "string", enum: TIME_SLOTS },
              guestName: { type: "string" },
              email: { type: "string" },
              phone: { type: "string" },
              playerCount: { type: "integer", minimum: 1, maximum: 8 },
            },
            required: ["courtId", "bookingDate", "startTime", "guestName", "email", "phone", "playerCount"],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          async execute(input) {
            const booking = await createReservation(input as BookingDetails);
            return {
              status: booking.status,
              confirmationCode: booking.confirmationCode,
              court: courtName(booking.courtId),
              date: booking.bookingDate,
              startTime: booking.startTime,
            };
          },
        },
        { signal: lifecycle.signal },
      );
    };
    void register().catch(() => {});
    return () => lifecycle.abort();
  }, [createReservation, refreshAvailability]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await createReservation({
        courtId: selected.courtId,
        bookingDate: date,
        startTime: selected.startTime,
        guestName: guest.guestName,
        email: guest.email,
        phone: guest.phone,
        playerCount: Number(guest.playerCount),
      });
      toast.success("Your reservation request was submitted.");
      setGuest({ guestName: "", email: "", phone: "", playerCount: "4" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reservation failed.");
      await refreshAvailability(date);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-[#0b356b] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <img
              src="/paddle-bay-logo.png"
              alt="Paddle Bay Pickleball Court logo"
              width={64}
              height={64}
              className="size-14 shrink-0 rounded-full bg-white object-contain sm:size-16"
            />
            <div>
              <p className="text-base font-semibold tracking-tight">Paddle Bay</p>
              <p className="text-xs text-white/60">Pickleball reservations</p>
            </div>
          </div>
          <div className="hidden items-center gap-4 text-sm text-white/70 sm:flex">
            <span className="flex items-center gap-2"><MapPin className="size-4 text-[#86c51a]" />Open daily · 7 AM–10 PM</span>
            <a href="/admin" className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10 hover:text-white"><Settings className="size-4" />Admin</a>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-border bg-[#0b356b] text-white">
        <div className="court-lines absolute inset-0 opacity-25" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[1fr_auto] lg:items-end lg:py-14">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm text-white/80">
              <Sparkles className="size-4 text-[#86c51a]" /> Owner-approved reservations
            </div>
            <h1 className="max-w-xl text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Your next match starts here.</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/68 sm:text-lg">Choose a court and an open one-hour time. No account required.</p>
          </div>
          <div className="flex gap-7 border-l border-white/15 pl-6 text-sm">
            <div><span className="block text-2xl font-semibold text-[#86c51a]">2</span><span className="text-white/60">courts</span></div>
            <div><span className="block text-2xl font-semibold text-[#86c51a]">15</span><span className="text-white/60">daily slots</span></div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-10">
        <section aria-labelledby="availability-heading">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-sm font-medium text-[#496784]">Step 1 of 2</p>
              <h2 id="availability-heading" className="text-2xl font-semibold tracking-tight">Choose your court time</h2>
            </div>
            <div className="w-full sm:w-52">
              <Label htmlFor="booking-date" className="mb-2 text-[#365b80]">Reservation date</Label>
              <Input id="booking-date" type="date" min={todayIso()} value={date} onChange={(event) => { setDate(event.target.value); setSelected(null); }} className="h-11 bg-card" />
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-[#365b80]">{formatBookingDate(date)}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#86c51a] ring-1 ring-[#6c9f13]" />Available</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#dce4e8]" />Reserved</span>
            </div>
          </div>

          {loadError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
              <p>{loadError}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => void refreshAvailability(date)}><RefreshCw />Try again</Button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2" aria-busy={loading}>
              {COURTS.map((court) => (
                <article key={court.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_12px_40px_rgba(11,53,107,0.07)]">
                  <div className="border-b border-border bg-[#f1f6fc] px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div><h3 className="font-semibold">{court.name}</h3><p className="mt-0.5 text-xs text-muted-foreground">{court.surface}</p></div>
                      <span className="rounded-full bg-[#0b356b] px-2.5 py-1 text-xs font-medium text-white">1 hr</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 md:grid-cols-2 xl:grid-cols-3">
                    {TIME_SLOTS.map((time) => {
                      const key = `${court.id}-${time}`;
                      const isReserved = reservedKeys.has(key);
                      const isSelected = selected?.courtId === court.id && selected.startTime === time;
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={isReserved || loading}
                          aria-pressed={isSelected}
                          onClick={() => setSelected({ courtId: court.id, startTime: time })}
                          className="min-h-12 rounded-xl border px-2 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5d91c8] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-[#edf3fa] disabled:text-[#94a3aa] aria-pressed:border-[#0b356b] aria-pressed:bg-[#0b356b] aria-pressed:text-white enabled:border-[#c5d3e2] enabled:bg-white enabled:hover:border-[#86c51a] enabled:hover:bg-[#f4fae8]"
                        >
                          {formatTime(time)}
                        </button>
                      );
                    })}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="lg:sticky lg:top-5 lg:self-start">
          <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 shadow-[0_16px_50px_rgba(11,53,107,0.09)] sm:p-6">
            <p className="mb-1 text-sm font-medium text-[#496784]">Step 2 of 2</p>
            <h2 className="text-xl font-semibold">Reservation details</h2>

            {selected ? (
              <div className="my-5 rounded-xl bg-[#f0f8df] p-4 text-[#304800]">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="font-semibold">{courtName(selected.courtId)}</p><p className="mt-1 text-sm text-[#567027]">{formatBookingDate(date)}</p></div>
                  <Check className="size-5 text-[#5f8e10]" />
                </div>
                <div className="mt-3 flex items-center gap-2 border-t border-[#d8e9b8] pt-3 text-sm font-medium"><Clock3 className="size-4" />{formatTime(selected.startTime)}–{formatTime(`${String(Number(selected.startTime.slice(0, 2)) + 1).padStart(2, "0")}:00`)}</div>
              </div>
            ) : (
              <div className="my-5 rounded-xl border border-dashed border-[#b9c9ce] bg-[#f7f9f9] p-5 text-center text-sm text-muted-foreground">
                Select an available court time to continue.
              </div>
            )}

            <fieldset disabled={!selected || submitting} className="space-y-4 disabled:opacity-55">
              <div><Label htmlFor="guest-name" className="mb-2">Full name</Label><Input id="guest-name" required autoComplete="name" value={guest.guestName} onChange={(event) => setGuest({ ...guest, guestName: event.target.value })} placeholder="Juan Dela Cruz" className="h-11" /></div>
              <div><Label htmlFor="email" className="mb-2">Email</Label><Input id="email" type="email" required autoComplete="email" value={guest.email} onChange={(event) => setGuest({ ...guest, email: event.target.value })} placeholder="juan@example.com" className="h-11" /></div>
              <div><Label htmlFor="phone" className="mb-2">Mobile number</Label><Input id="phone" type="tel" required autoComplete="tel" value={guest.phone} onChange={(event) => setGuest({ ...guest, phone: event.target.value })} placeholder="09XX XXX XXXX" className="h-11" /></div>
              <div><Label htmlFor="players" className="mb-2">Number of players</Label><Select value={guest.playerCount} onValueChange={(value) => setGuest({ ...guest, playerCount: value })}><SelectTrigger id="players" className="h-11 w-full"><SelectValue /></SelectTrigger><SelectContent>{[1,2,3,4,5,6,7,8].map((count) => <SelectItem key={count} value={String(count)}>{count} player{count === 1 ? "" : "s"}</SelectItem>)}</SelectContent></Select></div>
              <Button type="submit" size="lg" className="mt-2 h-12 w-full bg-[#0b356b] text-white hover:bg-[#082a57]">{submitting ? "Submitting…" : <>Request reservation <ChevronRight /></>}</Button>
            </fieldset>

            <div className="mt-5 flex items-start gap-3 border-t border-border pt-5 text-xs leading-5 text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#496784]" /><p>Your contact details are used only for this reservation and court updates.</p></div>
          </form>
        </aside>
      </div>

      <section className="border-t border-border bg-[#edf3fa]">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-7 text-sm text-[#365b80] sm:grid-cols-3 sm:px-8">
          <p className="flex items-center gap-2"><Clock3 className="size-4 text-[#5f8e10]" />One-hour reservations</p>
          <p className="flex items-center gap-2"><Users className="size-4 text-[#5f8e10]" />Up to 8 players</p>
          <p className="flex items-center gap-2"><CalendarDays className="size-4 text-[#5f8e10]" />Owner approval before confirmation</p>
        </div>
      </section>

      <Dialog open={Boolean(confirmation)} onOpenChange={(open) => !open && setConfirmation(null)}>
        <DialogContent className="overflow-hidden p-0 sm:max-w-md">
          <div className="bg-[#0b356b] px-6 py-7 text-white"><span className="mb-4 grid size-11 place-items-center rounded-full bg-[#86c51a] text-[#0b356b]"><Clock3 className="size-6" /></span><DialogHeader><DialogTitle className="text-2xl">Request received</DialogTitle><DialogDescription className="text-white/65">Your selected court is being held while the owner reviews your request.</DialogDescription></DialogHeader></div>
          {confirmation ? <div className="space-y-4 px-6 py-6"><div className="rounded-xl bg-[#f0f8df] p-4"><p className="text-xs font-medium uppercase tracking-[0.12em] text-[#5f8e10]">Request code</p><p className="mt-1 text-xl font-semibold tracking-wide">{confirmation.confirmationCode}</p></div><dl className="grid grid-cols-[100px_1fr] gap-y-3 text-sm"><dt className="text-muted-foreground">Status</dt><dd className="font-medium text-amber-700">Awaiting admin approval</dd><dt className="text-muted-foreground">Court</dt><dd className="font-medium">{courtName(confirmation.courtId)}</dd><dt className="text-muted-foreground">Date</dt><dd className="font-medium">{formatBookingDate(confirmation.bookingDate)}</dd><dt className="text-muted-foreground">Time</dt><dd className="font-medium">{formatTime(confirmation.startTime)}</dd><dt className="text-muted-foreground">Players</dt><dd className="font-medium">{confirmation.playerCount}</dd></dl><p className="text-xs leading-5 text-muted-foreground">Keep this request code for your records. The reservation is not confirmed until the owner approves it.</p></div> : null}
          <DialogFooter className="px-6 pb-6"><Button className="w-full bg-[#0b356b] text-white" onClick={() => setConfirmation(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Toaster position="top-center" richColors />
    </main>
  );
}
