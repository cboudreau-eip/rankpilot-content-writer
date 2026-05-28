ALTER TABLE `articles` ADD `briefComplianceScore` int;--> statement-breakpoint
ALTER TABLE `articles` ADD `briefComplianceDetails` json;--> statement-breakpoint
ALTER TABLE `keyword_queue` ADD `briefData` json;