CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`source` text DEFAULT 'wordpress' NOT NULL,
	`external_id` text,
	`submitted_at` text,
	`full_name` text,
	`whatsapp` text,
	`email` text,
	`plan_label` text,
	`connections` integer,
	`amount` text,
	`currency` text,
	`payment_status` text,
	`payment_mode` text,
	`transaction_id` text,
	`raw` text,
	`status` text DEFAULT 'new' NOT NULL,
	`client_id` integer,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `orders_txn_idx` ON `orders` (`transaction_id`);