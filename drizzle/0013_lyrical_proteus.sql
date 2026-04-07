CREATE TABLE `job_run_history` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyword` varchar(512) NOT NULL,
	`runKeywordSource` enum('queue','ai') NOT NULL DEFAULT 'queue',
	`runStatus` enum('running','completed','failed') NOT NULL DEFAULT 'running',
	`articleId` int,
	`outlineId` int,
	`errorMessage` text,
	`durationMs` int,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`jobId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `job_run_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `keyword_queue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`keyword` varchar(512) NOT NULL,
	`secondaryKeywords` json,
	`sortOrder` int NOT NULL DEFAULT 0,
	`queueStatus` enum('pending','processing','completed','failed') NOT NULL DEFAULT 'pending',
	`generatedArticleId` int,
	`errorMessage` text,
	`processedAt` timestamp,
	`jobId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `keyword_queue_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `scheduled_jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`keywordSource` enum('queue','ai') NOT NULL DEFAULT 'queue',
	`frequency` enum('daily','weekly','monthly') NOT NULL DEFAULT 'weekly',
	`dayOfWeek` int,
	`dayOfMonth` int,
	`hourUtc` int NOT NULL DEFAULT 8,
	`articleSettings` json NOT NULL,
	`jobStatus` enum('active','paused','completed') NOT NULL DEFAULT 'active',
	`totalGenerated` int NOT NULL DEFAULT 0,
	`lastRunAt` timestamp,
	`nextRunAt` timestamp,
	`isRunning` int NOT NULL DEFAULT 0,
	`projectId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scheduled_jobs_id` PRIMARY KEY(`id`)
);
