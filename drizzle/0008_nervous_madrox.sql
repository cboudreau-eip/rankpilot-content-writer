ALTER TABLE `projects` ADD `referenceDocS3Key` varchar(1024);--> statement-breakpoint
ALTER TABLE `projects` ADD `referenceDocLength` int;--> statement-breakpoint
ALTER TABLE `projects` DROP COLUMN `referenceDoc`;