CREATE TABLE `data_quality_scores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataSourceId` int NOT NULL,
	`score` int,
	`completude` int,
	`duplicidade` int,
	`atualidade` varchar(50),
	`consistencia` int,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `data_quality_scores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_source_audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataSourceId` int NOT NULL,
	`userId` int,
	`acao` varchar(100) NOT NULL,
	`mudancas` json,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `data_source_audit_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_source_webhooks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataSourceId` int NOT NULL,
	`url` varchar(500) NOT NULL,
	`secret` varchar(255) NOT NULL,
	`eventos` json,
	`ativo` int DEFAULT 1,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `data_source_webhooks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `data_sources` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`conector` varchar(100) NOT NULL,
	`entidade` varchar(100),
	`status` enum('conectado','sincronizando','erro','desconectado') DEFAULT 'conectado',
	`ultimaSincronizacao` timestamp,
	`proximaSincronizacao` timestamp,
	`totalRegistros` int DEFAULT 0,
	`configuracao` json,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `data_sources_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `field_mappings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataSourceId` int NOT NULL,
	`sourceField` varchar(255) NOT NULL,
	`targetField` varchar(255) NOT NULL,
	`tipo` varchar(50),
	`validadores` json,
	`transformacao` text,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `field_mappings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataSourceId` int NOT NULL,
	`status` varchar(50) NOT NULL,
	`registrosLidos` int DEFAULT 0,
	`registrosGravados` int DEFAULT 0,
	`erros` int DEFAULT 0,
	`duracao` int,
	`mensagem` text,
	`errosDetalhados` json,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sync_schedules` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dataSourceId` int NOT NULL,
	`tipo` varchar(50) NOT NULL,
	`expressao` varchar(255),
	`janelaInicio` varchar(50),
	`janelaFim` varchar(50),
	`ativo` int DEFAULT 1,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `sync_schedules_id` PRIMARY KEY(`id`)
);
