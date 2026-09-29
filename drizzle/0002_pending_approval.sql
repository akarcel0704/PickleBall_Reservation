CREATE TABLE `__new_reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`confirmation_code` text NOT NULL,
	`court_id` text NOT NULL,
	`booking_date` text NOT NULL,
	`start_time` text NOT NULL,
	`guest_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`player_count` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_reservations`("id", "confirmation_code", "court_id", "booking_date", "start_time", "guest_name", "email", "phone", "player_count", "status", "created_at") SELECT "id", "confirmation_code", "court_id", "booking_date", "start_time", "guest_name", "email", "phone", "player_count", "status", "created_at" FROM `reservations`;
--> statement-breakpoint
DROP TABLE `reservations`;
--> statement-breakpoint
ALTER TABLE `__new_reservations` RENAME TO `reservations`;
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_confirmation_code_unique` ON `reservations` (`confirmation_code`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reservations_active_slot` ON `reservations` (`booking_date`,`court_id`,`start_time`) WHERE "reservations"."status" IN ('pending', 'confirmed');
--> statement-breakpoint
CREATE INDEX `idx_reservations_booking_date` ON `reservations` (`booking_date`);
