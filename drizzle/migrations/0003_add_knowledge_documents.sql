-- Migration: Add knowledge_documents table for server-side Knowledge Base persistence
-- This allows the autopilot system to access documents uploaded by users

CREATE TABLE IF NOT EXISTS `knowledge_documents` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'general',
  `content` LONGTEXT NOT NULL,
  `file_type` VARCHAR(50),
  `file_size` INT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_category` (`category`),
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

-- Add autopilot_state table for persistent autopilot status
CREATE TABLE IF NOT EXISTS `autopilot_state` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `active` BOOLEAN DEFAULT FALSE,
  `last_check` TIMESTAMP NULL,
  `last_article_generated` TIMESTAMP NULL,
  `trends_checked` INT DEFAULT 0,
  `articles_generated` INT DEFAULT 0,
  `articles_sent` INT DEFAULT 0,
  `total_emails_sent` INT DEFAULT 0,
  `pending_article_id` VARCHAR(100) NULL,
  `pending_article_data` JSON NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);
