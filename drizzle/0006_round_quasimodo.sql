ALTER TABLE `brand_voices` ADD `toneTraits` text;--> statement-breakpoint
ALTER TABLE `brand_voices` ADD `perspective` varchar(32) DEFAULT 'second' NOT NULL;--> statement-breakpoint
ALTER TABLE `brand_voices` ADD `sentenceStyle` varchar(32) DEFAULT 'mixed' NOT NULL;--> statement-breakpoint
ALTER TABLE `brand_voices` ADD `writingStyleSample` text;--> statement-breakpoint
ALTER TABLE `brand_voices` ADD `avoidList` text;--> statement-breakpoint
ALTER TABLE `brand_voices` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `brand_voices` DROP COLUMN `tone`;--> statement-breakpoint
ALTER TABLE `brand_voices` DROP COLUMN `style`;--> statement-breakpoint
ALTER TABLE `brand_voices` DROP COLUMN `vocabulary`;--> statement-breakpoint
ALTER TABLE `brand_voices` DROP COLUMN `avoidWords`;--> statement-breakpoint
ALTER TABLE `brand_voices` DROP COLUMN `examples`;--> statement-breakpoint
ALTER TABLE `brand_voices` DROP COLUMN `rules`;