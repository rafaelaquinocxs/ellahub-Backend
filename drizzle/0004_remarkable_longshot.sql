CREATE TABLE `fontes_dados` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`nome` varchar(255) NOT NULL,
	`tipo` varchar(50) NOT NULL,
	`status` varchar(50) DEFAULT 'conectado',
	`ultimaSincronizacao` timestamp,
	`totalRegistros` int DEFAULT 0,
	`configuracao` json,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `fontes_dados_id` PRIMARY KEY(`id`)
);
