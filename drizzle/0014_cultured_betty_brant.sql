CREATE TABLE `survey_audit` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`evento` varchar(100) NOT NULL,
	`quem` varchar(255) NOT NULL,
	`quando` timestamp DEFAULT (now()),
	`detalhes` text,
	CONSTRAINT `survey_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_benchmarks` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`segmento1` varchar(100) NOT NULL,
	`segmento2` varchar(100) NOT NULL,
	`metrica` varchar(100) NOT NULL,
	`valor1` decimal(10,2),
	`valor2` decimal(10,2),
	`diferenca` decimal(10,2),
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `survey_benchmarks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_distribution` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`canal` varchar(50) NOT NULL,
	`configuracao` text,
	`ativo` boolean DEFAULT true,
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `survey_distribution_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_insights` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`tipo` varchar(50) NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`percentual` decimal(5,2),
	`acao_sugerida` text,
	`gerado_em` timestamp DEFAULT (now()),
	CONSTRAINT `survey_insights_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_permissions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`usuario_id` varchar(255) NOT NULL,
	`papel` varchar(50) NOT NULL,
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `survey_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_questions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`ordem` int NOT NULL,
	`pergunta` text NOT NULL,
	`tipo` varchar(50) NOT NULL,
	`obrigatoria` boolean DEFAULT true,
	`opcoes` text,
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `survey_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_responses` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`respondent_id` int NOT NULL,
	`respostas` text,
	`taxa_conclusao` decimal(5,2),
	`respondido_em` timestamp,
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `survey_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `survey_schedules` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`survey_id` int NOT NULL,
	`recorrencia` varchar(50),
	`proximo_envio` timestamp,
	`ultimo_envio` timestamp,
	`ativo` boolean DEFAULT true,
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `survey_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`empresa_id` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`tipo` varchar(50) NOT NULL,
	`categoria` varchar(100) NOT NULL,
	`segmento` varchar(100),
	`estado` varchar(50) NOT NULL DEFAULT 'rascunho',
	`data_inicio` timestamp,
	`data_fim` timestamp,
	`respostas_coletadas` int DEFAULT 0,
	`taxa_resposta` decimal(5,2),
	`recompensa_ativa` boolean DEFAULT false,
	`recompensa_tipo` varchar(50),
	`recompensa_valor` decimal(10,2),
	`criado_em` timestamp DEFAULT (now()),
	`atualizado_em` timestamp DEFAULT (now()),
	CONSTRAINT `surveys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `survey_audit` ADD CONSTRAINT `survey_audit_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_benchmarks` ADD CONSTRAINT `survey_benchmarks_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_distribution` ADD CONSTRAINT `survey_distribution_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_insights` ADD CONSTRAINT `survey_insights_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_permissions` ADD CONSTRAINT `survey_permissions_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_questions` ADD CONSTRAINT `survey_questions_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_responses` ADD CONSTRAINT `survey_responses_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `survey_schedules` ADD CONSTRAINT `survey_schedules_survey_id_surveys_id_fk` FOREIGN KEY (`survey_id`) REFERENCES `surveys`(`id`) ON DELETE no action ON UPDATE no action;