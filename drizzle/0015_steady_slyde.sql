CREATE TABLE `simulation_history` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`company_id` varchar(255) NOT NULL,
	`simulation_id` int,
	`predicted_value` decimal(10,2),
	`actual_value` decimal(10,2),
	`accuracy_percentage` decimal(5,2),
	`created_at` timestamp DEFAULT (now()),
	`simulation_type` varchar(50),
	CONSTRAINT `simulation_history_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulation_results` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`simulation_id` int NOT NULL,
	`metric_name` varchar(255) NOT NULL,
	`predicted_value` decimal(10,2),
	`actual_value` decimal(10,2),
	`confidence` decimal(5,2),
	`confidence_interval` json,
	`recommendation` text,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `simulation_results_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `simulations` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`company_id` varchar(255) NOT NULL,
	`dataset_id` int,
	`simulation_type` varchar(50) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`configuration` json NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`executed_at` timestamp,
	`status` varchar(50) DEFAULT 'draft',
	`executed_by` varchar(255),
	CONSTRAINT `simulations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `synthetic_datasets` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`company_id` varchar(255) NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`data_type` varchar(50) NOT NULL,
	`record_count` int NOT NULL,
	`characteristics` json NOT NULL,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`status` varchar(50) DEFAULT 'draft',
	`generated_by` varchar(255),
	`data_preview` json,
	CONSTRAINT `synthetic_datasets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `simulation_history` ADD CONSTRAINT `simulation_history_simulation_id_simulations_id_fk` FOREIGN KEY (`simulation_id`) REFERENCES `simulations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulation_results` ADD CONSTRAINT `simulation_results_simulation_id_simulations_id_fk` FOREIGN KEY (`simulation_id`) REFERENCES `simulations`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `simulations` ADD CONSTRAINT `simulations_dataset_id_synthetic_datasets_id_fk` FOREIGN KEY (`dataset_id`) REFERENCES `synthetic_datasets`(`id`) ON DELETE no action ON UPDATE no action;