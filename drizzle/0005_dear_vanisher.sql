ALTER TABLE `projects` ADD `icpPrimaryName` varchar(512);--> statement-breakpoint
ALTER TABLE `projects` ADD `icpWhoTheyAre` text;--> statement-breakpoint
ALTER TABLE `projects` ADD `icpPains` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `icpGoals` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `icpObjections` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `icpDecisionTriggers` json;--> statement-breakpoint
ALTER TABLE `projects` ADD `icpTrustSignals` json;