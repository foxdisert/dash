CREATE TABLE `message_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`channel` text DEFAULT 'both' NOT NULL,
	`subject` text,
	`body` text NOT NULL,
	`builtin` integer DEFAULT false NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_templates_key_unique` ON `message_templates` (`key`);--> statement-breakpoint
ALTER TABLE `clients` ADD `last_reminder_at` text;