CREATE TABLE `autopilotState` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`active` boolean NOT NULL DEFAULT false,
	`lastCheck` timestamp,
	`lastArticleGenerated` timestamp,
	`trendsChecked` int NOT NULL DEFAULT 0,
	`articlesGenerated` int NOT NULL DEFAULT 0,
	`articlesSent` int NOT NULL DEFAULT 0,
	`totalEmailsSent` int NOT NULL DEFAULT 0,
	`pendingArticleId` varchar(100),
	`pendingArticleData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `autopilotState_id` PRIMARY KEY(`id`),
	CONSTRAINT `autopilotState_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `knowledgeDocuments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(100) NOT NULL DEFAULT 'general',
	`content` text NOT NULL,
	`fileType` varchar(50),
	`fileSize` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledgeDocuments_id` PRIMARY KEY(`id`)
);
