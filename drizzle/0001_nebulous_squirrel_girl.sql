CREATE TABLE `diagnosticos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`respostas` json NOT NULL,
	`scoreGeral` int NOT NULL,
	`scoreGovernanca` int NOT NULL,
	`scoreIntegracao` int NOT NULL,
	`scoreAnalitica` int NOT NULL,
	`scoreDecisao` int NOT NULL,
	`scoreRoi` int NOT NULL,
	`desperdicioMensal` int,
	`potencialMensal` int,
	`impactoAnual` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `diagnosticos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `empresas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`nome` varchar(255),
	`email` varchar(320),
	`telefone` varchar(50),
	`clientesAtivos` int,
	`clientesInativos` int,
	`investimentoMarketing` int,
	`ticketMedio` int,
	`taxaRecompra` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `empresas_id` PRIMARY KEY(`id`)
);
