CREATE TABLE `agent_points` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`agent_user_id` integer NOT NULL,
	`action` text NOT NULL,
	`points` integer DEFAULT 0 NOT NULL,
	`client_id` integer,
	`note` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `clients` ADD `assigned_agent_id` integer;