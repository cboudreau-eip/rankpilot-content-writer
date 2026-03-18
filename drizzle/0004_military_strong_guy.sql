CREATE TABLE `citation_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(512) NOT NULL,
	`url` varchar(2048) NOT NULL,
	`description` text,
	`category` varchar(128),
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `citation_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sitemaps` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` varchar(2048) NOT NULL,
	`parsedUrls` json NOT NULL,
	`urlCount` int NOT NULL DEFAULT 0,
	`projectId` int NOT NULL,
	`lastParsed` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `sitemaps_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `projects` ADD `referenceDoc` mediumtext;--> statement-breakpoint
ALTER TABLE `projects` ADD `referenceDocName` varchar(512);