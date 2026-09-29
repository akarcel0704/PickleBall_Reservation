export const COURTS = [
  { id: "court-1", name: "Court 1", surface: "Championship blue" },
  { id: "court-2", name: "Court 2", surface: "Championship blue" },
  { id: "court-3", name: "Court 3", surface: "Practice court" },
] as const;

export const TIME_SLOTS = Array.from({ length: 15 }, (_, index) => {
  const hour = index + 7;
  return `${String(hour).padStart(2, "0")}:00`;
});

export type CourtId = (typeof COURTS)[number]["id"];

export type ReservedSlot = {
  courtId: CourtId;
  startTime: string;
};

export type BookingDetails = {
  courtId: CourtId;
  bookingDate: string;
  startTime: string;
  guestName: string;
  email: string;
  phone: string;
  playerCount: number;
};

export type BookingRequestReceipt = BookingDetails & {
  confirmationCode: string;
  status: "pending";
};

export function todayIso() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function formatBookingDate(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return new Intl.DateTimeFormat("en-PH", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(2026, 0, 1, hour, minute));
}

export function courtName(courtId: CourtId) {
  return COURTS.find((court) => court.id === courtId)?.name ?? courtId;
}
