CREATE TABLE `base_conhecimento` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`urlSite` varchar(500),
	`missao` text,
	`visao` text,
	`valores` text,
	`produtosServicos` text,
	`publicoAlvo` text,
	`diferenciais` text,
	`historicoSucesso` text,
	`documentos` json,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `base_conhecimento_id` PRIMARY KEY(`id`),
	CONSTRAINT `base_conhecimento_empresaId_unique` UNIQUE(`empresaId`)
);
--> statement-breakpoint
CREATE TABLE `insights_ia` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text NOT NULL,
	`categoria` varchar(100),
	`impactoEstimado` varchar(100),
	`acoesSugeridas` json,
	`dadosUtilizados` json,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `insights_ia_id` PRIMARY KEY(`id`)
);
