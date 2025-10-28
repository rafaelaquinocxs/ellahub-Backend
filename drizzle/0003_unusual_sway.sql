CREATE TABLE `pesquisas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresa_id` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`tipo` varchar(50) NOT NULL DEFAULT 'pesquisa',
	`status` varchar(50) NOT NULL DEFAULT 'ativa',
	`perguntas` json NOT NULL,
	`recompensa_tipo` varchar(50),
	`recompensa_valor` varchar(255),
	`link_publico` varchar(255) NOT NULL,
	`total_respostas` int NOT NULL DEFAULT 0,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	`atualizado_em` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pesquisas_id` PRIMARY KEY(`id`),
	CONSTRAINT `pesquisas_link_publico_unique` UNIQUE(`link_publico`)
);
--> statement-breakpoint
CREATE TABLE `respostas_pesquisas` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pesquisa_id` int NOT NULL,
	`nome_respondente` varchar(255),
	`email_respondente` varchar(255),
	`telefone_respondente` varchar(50),
	`respostas` json NOT NULL,
	`pontuacao` int,
	`recompensa_resgatada` int NOT NULL DEFAULT 0,
	`ip_address` varchar(50),
	`user_agent` text,
	`criado_em` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `respostas_pesquisas_id` PRIMARY KEY(`id`)
);
