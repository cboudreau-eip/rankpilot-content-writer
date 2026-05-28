CREATE TABLE `pipeline_briefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pipelineJobId` int NOT NULL,
	`briefTitle` varchar(512) NOT NULL,
	`briefPrimaryKeyword` varchar(255) NOT NULL,
	`briefSecondaryKeywords` json NOT NULL,
	`briefDescription` text NOT NULL,
	`suggestedLinkCount` int NOT NULL,
	`suggestedWordCount` int NOT NULL,
	`briefStatus` enum('pending_review','approved','rejected') NOT NULL DEFAULT 'pending_review',
	`approvedAt` timestamp,
	`editedFields` json,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pipeline_briefs_id` PRIMARY KEY(`id`)
);
