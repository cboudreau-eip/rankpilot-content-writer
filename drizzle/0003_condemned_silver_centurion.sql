CREATE TABLE `brand_voices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`tone` varchar(128),
	`style` text,
	`vocabulary` json,
	`avoidWords` json,
	`examples` json,
	`rules` json,
	`isDefault` int NOT NULL DEFAULT 0,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `brand_voices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cta_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`type` varchar(64) NOT NULL DEFAULT 'inline',
	`placement` varchar(64) NOT NULL DEFAULT 'end',
	`url` varchar(1024),
	`buttonText` varchar(255),
	`isDefault` int NOT NULL DEFAULT 0,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cta_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `icp_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`demographics` json,
	`painPoints` json,
	`goals` json,
	`objections` json,
	`contentPreferences` json,
	`searchBehavior` text,
	`isDefault` int NOT NULL DEFAULT 0,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `icp_profiles_id` PRIMARY KEY(`id`)
);
