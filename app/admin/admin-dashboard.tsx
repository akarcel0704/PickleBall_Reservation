"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleOff,
  Clock3,
  Hourglass,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster } from "@/components/ui/sonner";
import type { AdminReservation, ReservationStatus } from "@/lib/admin-reservations";
import { courtName, formatBookingDate, formatTime, todayIso } from "@/lib/reservations";

type AdminDashboardProps = {
  adminName: string;
  adminEmail: string;
  signOutPath: string;
};

async function readResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Request failed");
  return body;
}

export function AdminDashboard({ adminName, adminEmail, signOutPath }: AdminDashboardProps) {
  const [date, setDate] = useState(todayIso);
  const [reservations, setReservations] = useState<AdminReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadReservations = useCallback(async (bookingDate: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await readResponse<{ reservations: AdminReservation[] }>(
        await fetch(`/api/admin/reservations?date=${encodeURIComponent(bookingDate)}`, { cache: "no-store" }),
      );
      setReservations(data.reservations);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Reservations could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadReservations(date), 0);
    return () => window.clearTimeout(timeout);
  }, [date, loadReservations]);

  const confirmed = useMemo(
    () => reservations.filter((reservation) => reservation.status === "confirmed"),
    [reservations],
  );
  const pending = useMemo(
    () => reservations.filter((reservation) => reservation.status === "pending"),
    [reservations],
  );
  const stats = useMemo(
    () => ({
      bookings: confirmed.length,
      pending: pending.length,
      players: confirmed.reduce((total, reservation) => total + reservation.playerCount, 0),
      courts: new Set(confirmed.map((reservation) => reservation.courtId)).size,
    }),
    [confirmed, pending],
  );

  async function updateStatus(id: number, status: ReservationStatus) {
    setUpdatingId(id);
    try {
      await readResponse(
        await fetch("/api/admin/reservations", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, status }),
        }),
      );
      setReservations((current) =>
        current.map((reservation) => (reservation.id === id ? { ...reservation, status } : reservation)),
      );
      const messages: Record<ReservationStatus, string> = {
        pending: "Reservation returned to pending review.",
        confirmed: "Reservation approved.",
        declined: "Reservation declined and the court time was released.",
        cancelled: "Reservation cancelled and the court time was released.",
      };
      toast.success(messages[status]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reservation could not be updated.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f9fd] text-foreground">
      <header className="border-b border-white/10 bg-[#0b356b] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-3" aria-label="Paddle Bay customer booking">
            <img
              src="/paddle-bay-logo.png"
              alt="Paddle Bay Pickleball Court logo"
              width={56}
              height={56}
              className="size-12 shrink-0 rounded-full bg-white object-contain sm:size-14"
            />
            <div><p className="font-semibold">Paddle Bay</p><p className="text-xs text-white/60">Admin dashboard</p></div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/" className="hidden items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white sm:flex"><ArrowLeft className="size-4" />Customer booking</Link>
            <a href={signOutPath} target="_top" className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/75 hover:bg-white/10 hover:text-white"><LogOut className="size-4" />Sign out</a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:py-10">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#f0f8df] px-3 py-1.5 text-sm font-medium text-[#405f00]"><ShieldCheck className="size-4" />Owner access</div>
            <h1 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">Reservation control</h1>
            <p className="mt-2 text-base text-muted-foreground">Signed in as {adminName === adminEmail ? adminEmail : `${adminName} · ${adminEmail}`}</p>
          </div>
          <div className="w-full rounded-2xl border border-border bg-white p-4 shadow-sm sm:w-64">
            <Label htmlFor="admin-date" className="mb-2 text-[#365b80]">Schedule date</Label>
            <Input id="admin-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-11" />
          </div>
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Daily reservation totals">
          <StatCard icon={Hourglass} label="Pending approval" value={stats.pending} />
          <StatCard icon={CalendarDays} label="Confirmed bookings" value={stats.bookings} />
          <StatCard icon={Users} label="Expected players" value={stats.players} />
          <StatCard icon={Clock3} label="Courts in use" value={`${stats.courts} / 2`} />
        </section>

        <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_14px_45px_rgba(11,31,42,0.06)]" aria-labelledby="schedule-heading">
          <div className="flex flex-col gap-3 border-b border-border px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 id="schedule-heading" className="text-xl font-semibold">{formatBookingDate(date)}</h2><p className="mt-1 text-sm text-muted-foreground">{reservations.length} reservation{reservations.length === 1 ? "" : "s"} recorded</p></div>
            <Button variant="outline" size="sm" onClick={() => void loadReservations(date)} disabled={loading}><RefreshCw className={loading ? "animate-spin" : ""} />Refresh</Button>
          </div>

          {loading ? (
            <div className="space-y-3 p-6" aria-label="Loading reservations"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
          ) : loadError ? (
            <div className="p-8 text-center"><p className="text-sm text-red-700">{loadError}</p><Button className="mt-4" variant="outline" onClick={() => void loadReservations(date)}>Try again</Button></div>
          ) : reservations.length === 0 ? (
            <div className="px-6 py-16 text-center"><CalendarDays className="mx-auto size-9 text-[#9aacb4]" /><h3 className="mt-4 font-semibold">No reservations for this date</h3><p className="mt-1 text-sm text-muted-foreground">New customer bookings will appear here automatically.</p></div>
          ) : (
            <Table>
              <TableHeader><TableRow className="bg-[#f6f9fd]"><TableHead className="pl-6">Time</TableHead><TableHead>Court</TableHead><TableHead>Guest</TableHead><TableHead>Players</TableHead><TableHead>Request code</TableHead><TableHead>Status</TableHead><TableHead className="pr-6 text-right">Action</TableHead></TableRow></TableHeader>
              <TableBody>
                {reservations.map((reservation) => (
                  <TableRow key={reservation.id} className={["declined", "cancelled"].includes(reservation.status) ? "bg-[#fafafa] text-muted-foreground" : ""}>
                    <TableCell className="pl-6 font-semibold text-foreground">{formatTime(reservation.startTime)}</TableCell>
                    <TableCell>{courtName(reservation.courtId)}</TableCell>
                    <TableCell><div className="min-w-44"><p className="font-medium text-foreground">{reservation.guestName}</p><p className="text-xs text-muted-foreground">{reservation.phone} · {reservation.email}</p></div></TableCell>
                    <TableCell>{reservation.playerCount}</TableCell>
                    <TableCell className="font-mono text-xs">{reservation.confirmationCode}</TableCell>
                    <TableCell><ReservationStatusBadge status={reservation.status} /></TableCell>
                    <TableCell className="pr-6 text-right">
                      {reservation.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" className="bg-[#5f8e10] text-white hover:bg-[#4d740d]" disabled={updatingId === reservation.id} onClick={() => void updateStatus(reservation.id, "confirmed")}>Approve</Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild><Button variant="outline" size="sm" className="text-red-700 hover:bg-red-50 hover:text-red-800" disabled={updatingId === reservation.id}>Decline</Button></AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader><AlertDialogTitle>Decline this request?</AlertDialogTitle><AlertDialogDescription>{reservation.guestName}&apos;s request for {formatTime(reservation.startTime)} on {courtName(reservation.courtId)} will be declined and the court time will become available again.</AlertDialogDescription></AlertDialogHeader>
                              <AlertDialogFooter><AlertDialogCancel>Keep pending</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void updateStatus(reservation.id, "declined")}>Decline request</AlertDialogAction></AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      ) : reservation.status === "confirmed" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="sm" className="text-red-700 hover:bg-red-50 hover:text-red-800" disabled={updatingId === reservation.id}>Cancel</Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Cancel this reservation?</AlertDialogTitle><AlertDialogDescription>{reservation.guestName}&apos;s {formatTime(reservation.startTime)} booking on {courtName(reservation.courtId)} will be released for another customer.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Keep reservation</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => void updateStatus(reservation.id, "cancelled")}>Cancel reservation</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button variant="outline" size="sm" disabled={updatingId === reservation.id} onClick={() => void updateStatus(reservation.id, "confirmed")}>{reservation.status === "declined" ? "Approve" : "Restore"}</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </section>
      </div>
      <Toaster position="top-center" richColors />
    </main>
  );
}

function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  if (status === "pending") {
    return <Badge className="bg-amber-100 text-amber-800"><Hourglass />Pending</Badge>;
  }
  if (status === "confirmed") {
    return <Badge className="bg-[#f0f8df] text-[#405f00]"><CheckCircle2 />Confirmed</Badge>;
  }
  return <Badge variant="secondary"><CircleOff />{status === "declined" ? "Declined" : "Cancelled"}</Badge>;
}

type StatCardProps = {
  icon: typeof CalendarDays;
  label: string;
  value: number | string;
};

function StatCard({ icon: Icon, label, value }: StatCardProps) {
  return (
    <article className="flex items-center gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <span className="grid size-11 place-items-center rounded-xl bg-[#f0f8df] text-[#5f8e10]"><Icon className="size-5" /></span>
      <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</p></div>
    </article>
  );
}
