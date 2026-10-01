CREATE TABLE `app_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_name` text NOT NULL,
	`currency` text,
	`number_format` text DEFAULT 'COMMA_DOT' NOT NULL,
	`has_onboarded` integer DEFAULT false NOT NULL,
	`last_backup` text,
	`profile_pic` text,
	`google_email` text,
	`google_name` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
