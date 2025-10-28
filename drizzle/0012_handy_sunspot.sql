CREATE TABLE `insightActions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightId` int NOT NULL,
	`tipo` varchar(50) NOT NULL,
	`payloadJson` json,
	`criadoEm` timestamp DEFAULT (now()),
	`criadoPor` int,
	`status` varchar(20) DEFAULT 'pendente',
	CONSTRAINT `insightActions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insightAudit` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightId` int NOT NULL,
	`evento` varchar(100) NOT NULL,
	`quem` int,
	`quando` timestamp DEFAULT (now()),
	`diffJson` json,
	CONSTRAINT `insightAudit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insightResults` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightId` int NOT NULL,
	`periodo` varchar(50),
	`kpi` varchar(100),
	`valor` decimal(15,2),
	`baseline` decimal(15,2),
	`uplift` decimal(15,2),
	`pValor` decimal(5,4),
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `insightResults_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insightSegments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`insightId` int NOT NULL,
	`segmentoId` int,
	`tamanho` int,
	`criteriosJson` json,
	CONSTRAINT `insightSegments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `insights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`familia` varchar(50) NOT NULL,
	`area` varchar(100) NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`resumo` text,
	`priorityScore` decimal(5,2),
	`estado` varchar(20) DEFAULT 'novo',
	`geradoEm` timestamp DEFAULT (now()),
	`modeloVersao` varchar(50),
	`confianca` decimal(5,2),
	`potencialR$` decimal(15,2),
	`tamanhoSegmento` int,
	`criteriosJson` json,
	`criadoPor` int,
	`criadoEm` timestamp DEFAULT (now()),
	CONSTRAINT `insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `insightActions` ADD CONSTRAINT `insightActions_insightId_insights_id_fk` FOREIGN KEY (`insightId`) REFERENCES `insights`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insightAudit` ADD CONSTRAINT `insightAudit_insightId_insights_id_fk` FOREIGN KEY (`insightId`) REFERENCES `insights`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insightResults` ADD CONSTRAINT `insightResults_insightId_insights_id_fk` FOREIGN KEY (`insightId`) REFERENCES `insights`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `insightSegments` ADD CONSTRAINT `insightSegments_insightId_insights_id_fk` FOREIGN KEY (`insightId`) REFERENCES `insights`(`id`) ON DELETE no action ON UPDATE no action;