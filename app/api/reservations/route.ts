import { getD1 } from "@/db";
import { COURTS, TIME_SLOTS, type BookingDetails } from "@/lib/reservations";

const courtIds = new Set(COURTS.map((court) => court.id));
const validTimes = new Set(TIME_SLOTS);

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  if (message.includes("UNIQUE constraint failed")) {
    return "That court time was just reserved. Please choose another slot.";
  }
  if (message.includes("no such table")) {
    return "Reservations are temporarily unavailable while the booking calendar is being prepared.";
  }
  return "We could not save your reservation. Please try again.";
}

export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!isIsoDate(date)) {
    return Response.json({ error: "A valid date is required." }, { status: 400 });
  }

  try {
    const result = await getD1()
      .prepare(
        `SELECT court_id AS courtId, start_time AS startTime
         FROM reservations
         WHERE booking_date = ? AND status IN ('pending', 'confirmed')
         ORDER BY start_time, court_id`,
      )
      .bind(date)
      .all<{ courtId: BookingDetails["courtId"]; startTime: string }>();

    return Response.json({ reservations: result.results });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Partial<BookingDetails>;
    const guestName = payload.guestName?.trim() ?? "";
    const email = payload.email?.trim().toLowerCase() ?? "";
    const phone = payload.phone?.trim() ?? "";
    const playerCount = Number(payload.playerCount);
    const today = new Date().toISOString().slice(0, 10);

    if (
      !payload.courtId ||
      !courtIds.has(payload.courtId) ||
      !payload.bookingDate ||
      !isIsoDate(payload.bookingDate) ||
      payload.bookingDate < today ||
      !payload.startTime ||
      !validTimes.has(payload.startTime) ||
      guestName.length < 2 ||
      !/^\S+@\S+\.\S+$/.test(email) ||
      phone.length < 7 ||
      !Number.isInteger(playerCount) ||
      playerCount < 1 ||
      playerCount > 8
    ) {
      return Response.json(
        { error: "Please complete all reservation details with valid information." },
        { status: 400 },
      );
    }

    const confirmationCode = `PB-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    await getD1()
      .prepare(
        `INSERT INTO reservations
          (confirmation_code, court_id, booking_date, start_time, guest_name, email, phone, player_count, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .bind(
        confirmationCode,
        payload.courtId,
        payload.bookingDate,
        payload.startTime,
        guestName,
        email,
        phone,
        playerCount,
        Date.now(),
      )
      .run();

    return Response.json(
      {
        reservation: {
          confirmationCode,
          courtId: payload.courtId,
          bookingDate: payload.bookingDate,
          startTime: payload.startTime,
          guestName,
          email,
          phone,
          playerCount,
          status: "pending",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = errorMessage(error);
    return Response.json(
      { error: message },
      { status: message.startsWith("That court time") ? 409 : 500 },
    );
  }
}
