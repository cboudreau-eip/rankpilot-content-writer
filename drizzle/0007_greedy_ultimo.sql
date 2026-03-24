ALTER TABLE `projects` ADD `llmProvider` varchar(32) DEFAULT 'builtin' NOT NULL;--> statement-breakpoint
ALTER TABLE `projects` ADD `llmModel` varchar(128);