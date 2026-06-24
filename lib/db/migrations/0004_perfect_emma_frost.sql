ALTER TABLE `admin` ADD `display_name` text;--> statement-breakpoint
ALTER TABLE `admin` ADD `role` text DEFAULT 'admin' NOT NULL;