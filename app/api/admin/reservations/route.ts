import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getD1 } from "@/db";
import type { AdminReservation, ReservationStatus } from "@/lib/admin-reservations";

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

async function requireAdminApiUser() {
  return getChatGPTUser();
}

export async function GET(request: Request) {
  if (!(await requireAdminApiUser())) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!isIsoDate(date)) {
    return Response.json({ error: "A valid date is required." }, { status: 400 });
  }

  try {
    const result = await getD1()
      .prepare(
        `SELECT
          id,
          confirmation_code AS confirmationCode,
          court_id AS courtId,
          booking_date AS bookingDate,
          start_time AS startTime,
          guest_name AS guestName,
          email,
          phone,
          player_count AS playerCount,
          status,
          created_at AS createdAt
        FROM reservations
        WHERE booking_date = ?
        ORDER BY start_time, court_id, created_at`,
      )
      .bind(date)
      .all<AdminReservation>();

    return Response.json({ reservations: result.results });
  } catch {
    return Response.json({ error: "Reservations could not be loaded." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!(await requireAdminApiUser())) {
    return Response.json({ error: "Sign in is required." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as { id?: number; status?: ReservationStatus };
    const id = Number(payload.id);
    if (!Number.isInteger(id) || id < 1 || !payload.status || !["confirmed", "cancelled"].includes(payload.status)) {
      return Response.json({ error: "A valid reservation and status are required." }, { status: 400 });
    }

    const result = await getD1()
      .prepare("UPDATE reservations SET status = ? WHERE id = ?")
      .bind(payload.status, id)
      .run();

    if (!result.meta.changes) {
      return Response.json({ error: "Reservation not found." }, { status: 404 });
    }

    return Response.json({ id, status: payload.status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE constraint failed")) {
      return Response.json({ error: "That court time is already occupied by another reservation." }, { status: 409 });
    }
    return Response.json({ error: "The reservation could not be updated." }, { status: 500 });
  }
}
