CREATE TABLE `reservations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`confirmation_code` text NOT NULL,
	`court_id` text NOT NULL,
	`booking_date` text NOT NULL,
	`start_time` text NOT NULL,
	`guest_name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text NOT NULL,
	`player_count` integer NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reservations_confirmation_code_unique` ON `reservations` (`confirmation_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_reservations_slot` ON `reservations` (`booking_date`,`court_id`,`start_time`);--> statement-breakpoint
CREATE INDEX `idx_reservations_booking_date` ON `reservations` (`booking_date`);