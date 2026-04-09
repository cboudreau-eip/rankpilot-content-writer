CREATE TABLE `scheduler_run_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`runId` int NOT NULL,
	`jobId` int NOT NULL,
	`step` varchar(64) NOT NULL,
	`level` varchar(16) NOT NULL DEFAULT 'info',
	`message` varchar(1024) NOT NULL,
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `scheduler_run_logs_id` PRIMARY KEY(`id`)
);
