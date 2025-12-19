CREATE TABLE `emailAnalytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`dayOfWeek` int NOT NULL,
	`hourOfDay` int NOT NULL,
	`totalSent` int NOT NULL DEFAULT 0,
	`totalOpened` int NOT NULL DEFAULT 0,
	`totalClicked` int NOT NULL DEFAULT 0,
	`avgOpenTimeMinutes` int,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `emailAnalytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `emailEvents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distributionId` int NOT NULL,
	`eventType` enum('sent','delivered','opened','clicked','bounced','complained','unsubscribed') NOT NULL,
	`emailId` varchar(255),
	`recipientEmail` varchar(320),
	`userAgent` text,
	`ipAddress` varchar(45),
	`country` varchar(2),
	`city` varchar(100),
	`clickedUrl` text,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`rawData` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `emailEvents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `followUpQueue` (
	`id` int AUTO_INCREMENT NOT NULL,
	`distributionId` int NOT NULL,
	`pressReleaseId` int NOT NULL,
	`journalistId` int NOT NULL,
	`followUpNumber` int NOT NULL DEFAULT 1,
	`scheduledAt` timestamp NOT NULL,
	`status` enum('pending','sent','cancelled','skipped') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `followUpQueue_id` PRIMARY KEY(`id`)
);
