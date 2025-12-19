CREATE TABLE `autopilotCampaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pressReleaseId` int NOT NULL,
	`status` enum('active','paused','completed','cancelled') NOT NULL DEFAULT 'active',
	`totalJournalists` int NOT NULL DEFAULT 0,
	`sentCount` int NOT NULL DEFAULT 0,
	`openedCount` int NOT NULL DEFAULT 0,
	`dailyBatchSize` int NOT NULL DEFAULT 1286,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`completedAt` timestamp,
	`lastBatchAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `autopilotCampaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sendPatterns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`country` varchar(2) NOT NULL,
	`category` enum('technology','business','finance','health','sports','entertainment','politics','lifestyle','general') NOT NULL DEFAULT 'general',
	`dayOfWeek` int NOT NULL,
	`hourOfDay` int NOT NULL,
	`totalSent` int NOT NULL DEFAULT 0,
	`totalOpened` int NOT NULL DEFAULT 0,
	`totalClicked` int NOT NULL DEFAULT 0,
	`openRate` int NOT NULL DEFAULT 0,
	`clickRate` int NOT NULL DEFAULT 0,
	`score` int NOT NULL DEFAULT 0,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sendPatterns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `pressReleases` ADD `isAutopilotActive` boolean DEFAULT false;