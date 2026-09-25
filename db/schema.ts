import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const reservations = sqliteTable(
  "reservations",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    confirmationCode: text("confirmation_code").notNull().unique(),
    courtId: text("court_id").notNull(),
    bookingDate: text("booking_date").notNull(),
    startTime: text("start_time").notNull(),
    guestName: text("guest_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    playerCount: integer("player_count").notNull(),
    status: text("status").notNull().default("confirmed"),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_reservations_active_slot")
      .on(table.bookingDate, table.courtId, table.startTime)
      .where(sql`${table.status} = 'confirmed'`),
    index("idx_reservations_booking_date").on(table.bookingDate),
  ],
);
