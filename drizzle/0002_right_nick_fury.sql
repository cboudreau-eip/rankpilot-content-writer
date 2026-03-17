CREATE TABLE `articles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`content` text,
	`excerpt` text,
	`keyword` varchar(255),
	`keywords` json,
	`metaTitle` varchar(255),
	`metaDescription` text,
	`slug` varchar(512),
	`wordCount` int DEFAULT 0,
	`articleStatus` enum('draft','review','complete','published') NOT NULL DEFAULT 'draft',
	`contentType` varchar(64),
	`outlineId` int,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `articles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `outlines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`keyword` varchar(255),
	`sections` json NOT NULL,
	`settings` json,
	`outlineStatus` enum('draft','approved','generating','complete') NOT NULL DEFAULT 'draft',
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `outlines_id` PRIMARY KEY(`id`)
);
