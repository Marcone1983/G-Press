CREATE TABLE `distributions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pressReleaseId` int NOT NULL,
	`journalistId` int NOT NULL,
	`status` enum('pending','sent','delivered','opened','clicked','bounced','failed') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`openedAt` timestamp,
	`clickedAt` timestamp,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `distributions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `journalists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`outlet` varchar(255),
	`position` varchar(255),
	`category` enum('technology','business','finance','health','sports','entertainment','politics','lifestyle','general') NOT NULL DEFAULT 'general',
	`country` varchar(2) DEFAULT 'IT',
	`city` varchar(100),
	`phone` varchar(50),
	`twitter` varchar(100),
	`linkedin` varchar(255),
	`verified` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `journalists_id` PRIMARY KEY(`id`),
	CONSTRAINT `journalists_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `pressReleases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(500) NOT NULL,
	`subtitle` varchar(500),
	`content` text NOT NULL,
	`category` enum('technology','business','finance','health','sports','entertainment','politics','lifestyle','general') DEFAULT 'general',
	`status` enum('draft','scheduled','sending','sent','failed') NOT NULL DEFAULT 'draft',
	`boilerplate` text,
	`contactName` varchar(255),
	`contactEmail` varchar(320),
	`contactPhone` varchar(50),
	`scheduledAt` timestamp,
	`sentAt` timestamp,
	`recipientCount` int DEFAULT 0,
	`openCount` int DEFAULT 0,
	`clickCount` int DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pressReleases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`subject` varchar(500),
	`content` text NOT NULL,
	`isDefault` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `templates_id` PRIMARY KEY(`id`)
);
