CREATE TABLE `pipeline_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`fileId` varchar(255) NOT NULL,
	`filename` varchar(512) NOT NULL,
	`pipelineStatus` enum('pending','generating_outline','generating_article','pending_approval','approved','rejected','failed') NOT NULL DEFAULT 'pending',
	`sourceUrl` varchar(1024),
	`pipelineTitle` varchar(512),
	`pipelineKeyword` varchar(255),
	`pipelineCategory` varchar(128),
	`snippet` text,
	`ideaId` int,
	`outlineId` int,
	`articleId` int,
	`errorMessage` text,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`processedAt` timestamp,
	CONSTRAINT `pipeline_jobs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pipeline_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bucketUrl` varchar(1024) NOT NULL DEFAULT 'https://json-test.abacusai.app',
	`enabled` int NOT NULL DEFAULT 1,
	`autoGenerateOutline` int NOT NULL DEFAULT 1,
	`autoGenerateArticle` int NOT NULL DEFAULT 1,
	`defaultWordCount` int DEFAULT 1600,
	`defaultInstructions` text,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pipeline_settings_id` PRIMARY KEY(`id`)
);
