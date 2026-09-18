CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`pole_id` text NOT NULL,
	`name` text NOT NULL,
	`height_m` real NOT NULL,
	`photo_x` real,
	`photo_y` real,
	`side` text DEFAULT 'right' NOT NULL,
	`color` text,
	`kind` text DEFAULT 'attachment' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`pole_id`) REFERENCES `poles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_attachments_pole_id` ON `attachments` (`pole_id`);--> statement-breakpoint
CREATE TABLE `clients` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_clients_code` ON `clients` (`code`);--> statement-breakpoint
CREATE TABLE `poles` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`pole_name` text NOT NULL,
	`normalized_name` text NOT NULL,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL,
	`elevation_m` real NOT NULL,
	`top_height_m` real,
	`pole_height_ft` real,
	`pole_class` text,
	`status` text DEFAULT 'location_only' NOT NULL,
	`image_key` text,
	`image_filename` text,
	`image_width` integer,
	`image_height` integer,
	`source_json_filename` text,
	`model_version` text,
	`tool_name` text,
	`base_x` real,
	`base_y` real,
	`top_x` real,
	`top_y` real,
	`raw_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_poles_project_name` ON `poles` (`project_id`,`pole_name`);--> statement-breakpoint
CREATE INDEX `idx_poles_project_id` ON `poles` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_poles_project_normalized` ON `poles` (`project_id`,`normalized_name`);--> statement-breakpoint
CREATE TABLE `portal_users` (
	`id` text PRIMARY KEY NOT NULL,
	`auth_user_id` text,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'client' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_portal_users_email` ON `portal_users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_portal_users_auth_user_id` ON `portal_users` (`auth_user_id`);--> statement-breakpoint
CREATE TABLE `project_files` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`pole_id` text,
	`kind` text NOT NULL,
	`object_key` text NOT NULL,
	`filename` text NOT NULL,
	`content_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pole_id`) REFERENCES `poles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_project_files_project_id` ON `project_files` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_project_files_object_key` ON `project_files` (`object_key`);--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY NOT NULL,
	`client_id` text NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`location_label` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`client_id`) REFERENCES `clients`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_projects_client_id` ON `projects` (`client_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_projects_client_code` ON `projects` (`client_id`,`code`);--> statement-breakpoint
CREATE TABLE `user_projects` (
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`assigned_at` text NOT NULL,
	PRIMARY KEY(`user_id`, `project_id`),
	FOREIGN KEY (`user_id`) REFERENCES `portal_users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_user_projects_project_id` ON `user_projects` (`project_id`);--> statement-breakpoint
PRAGMA optimize;
