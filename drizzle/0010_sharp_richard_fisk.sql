CREATE TABLE `benchmark_comparisons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`metricaChave` varchar(100) NOT NULL,
	`valorEmpresa` int,
	`mediana` int,
	`percentil` int,
	`gap` int,
	`recomendacao` text,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `benchmark_comparisons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `benchmark_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`setor` varchar(100) NOT NULL,
	`porte` varchar(50) NOT NULL,
	`metricaChave` varchar(100) NOT NULL,
	`mediana` int,
	`p25` int,
	`p75` int,
	`p90` int,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `benchmark_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_copilot_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`pergunta` text NOT NULL,
	`resposta` text,
	`contexto` json,
	`modelo` varchar(50) DEFAULT 'gpt-4',
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `data_copilot_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `executive_summaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`versao` int NOT NULL,
	`titulo` text,
	`conteudo` text,
	`prioridades` json,
	`geradoEm` timestamp DEFAULT (now()),
	`urlPdf` varchar(500),
	CONSTRAINT `executive_summaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`fieldPath` varchar(255) NOT NULL,
	`role` enum('viewer','editor','approver','admin') NOT NULL,
	`canView` int DEFAULT 1,
	`canEdit` int DEFAULT 0,
	`isSensitive` int DEFAULT 0,
	`maskingPattern` varchar(100),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `field_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profile_webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`evento` varchar(100) NOT NULL,
	`targetModule` varchar(100) NOT NULL,
	`payload` json,
	`status` enum('pendente','enviado','falha') DEFAULT 'pendente',
	`tentativas` int DEFAULT 0,
	`proximaTentativa` timestamp,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `profile_webhooks_id` PRIMARY KEY(`id`)
);
