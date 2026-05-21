CREATE TABLE `outline_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`outlineId` int NOT NULL,
	`versionNumber` int NOT NULL,
	`label` varchar(255) NOT NULL,
	`sections` json NOT NULL,
	`rawText` text,
	`score` int,
	`changeSummary` text,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `outline_versions_id` PRIMARY KEY(`id`)
);
