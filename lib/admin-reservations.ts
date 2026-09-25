import type { CourtId } from "@/lib/reservations";

export type ReservationStatus = "confirmed" | "cancelled";

export type AdminReservation = {
  id: number;
  confirmationCode: string;
  courtId: CourtId;
  bookingDate: string;
  startTime: string;
  guestName: string;
  email: string;
  phone: string;
  playerCount: number;
  status: ReservationStatus;
  createdAt: number;
};
