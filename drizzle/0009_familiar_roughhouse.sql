CREATE TABLE `company_profile` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`missao` text,
	`visao` text,
	`valores` text,
	`publicoAlvo` text,
	`personas` json,
	`segmentos` json,
	`concorrentes` json,
	`erpsUtilizados` json,
	`fontesConectadas` json,
	`qualidadeDados` int,
	`frequenciaAtualizacao` varchar(100),
	`metasTrimestrais` json,
	`restricoes` text,
	`budget` int,
	`lgpdCompliance` int DEFAULT 0,
	`janelaComunicacao` varchar(255),
	`sensibilidadeDados` varchar(50),
	`status` enum('rascunho','em_revisao','publicado') DEFAULT 'rascunho',
	`versao` int DEFAULT 1,
	`setor` varchar(100),
	`dataQualityScore` int DEFAULT 0,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`publishedAt` timestamp,
	CONSTRAINT `company_profile_id` PRIMARY KEY(`id`),
	CONSTRAINT `company_profile_empresaId_unique` UNIQUE(`empresaId`)
);
--> statement-breakpoint
CREATE TABLE `company_profile_versions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`versao` int NOT NULL,
	`payload` json NOT NULL,
	`status` varchar(50) NOT NULL,
	`publishedBy` int,
	`publishedAt` timestamp,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `company_profile_versions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profile_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`userId` int,
	`fieldPath` varchar(255) NOT NULL,
	`oldValue` text,
	`newValue` text,
	`action` varchar(50) NOT NULL,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `profile_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `taxonomy_sectors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`cnae` varchar(50),
	`label` varchar(255) NOT NULL,
	`playbooks` json,
	`keywords` json,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `taxonomy_sectors_id` PRIMARY KEY(`id`),
	CONSTRAINT `taxonomy_sectors_cnae_unique` UNIQUE(`cnae`)
);
