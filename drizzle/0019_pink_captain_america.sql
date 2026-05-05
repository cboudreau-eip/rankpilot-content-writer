CREATE TABLE `ideas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(512) NOT NULL,
	`keyword` varchar(255) NOT NULL,
	`searchIntent` varchar(64),
	`wordCountRange` varchar(32),
	`contentAngles` json,
	`targetAudience` text,
	`rankingPotential` varchar(16),
	`description` text,
	`contentTypes` varchar(512),
	`ideaStatus` enum('saved','used','archived') NOT NULL DEFAULT 'saved',
	`articleId` int,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ideas_id` PRIMARY KEY(`id`)
);
