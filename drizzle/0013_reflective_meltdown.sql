CREATE TABLE `smart_form_audit` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`form_id` int NOT NULL,
	`evento` varchar(100) NOT NULL,
	`quem` varchar(255) NOT NULL,
	`quando` timestamp DEFAULT (now()),
	`detalhes` text,
	CONSTRAINT `smart_form_audit_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_form_channels` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`form_id` int NOT NULL,
	`canal` varchar(50) NOT NULL,
	`configuracao` text,
	`ativo` boolean DEFAULT true,
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `smart_form_channels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_form_permissions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`form_id` int NOT NULL,
	`usuario_id` varchar(255) NOT NULL,
	`papel` varchar(50) NOT NULL,
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `smart_form_permissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_form_questions` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`form_id` int NOT NULL,
	`ordem` int NOT NULL,
	`pergunta` text NOT NULL,
	`tipo` varchar(50) NOT NULL,
	`obrigatoria` boolean DEFAULT true,
	`opcoes` text,
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `smart_form_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_form_responses` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`form_id` int NOT NULL,
	`cliente_id` int NOT NULL,
	`respostas` text,
	`taxa_conclusao` decimal(5,2),
	`respondido_em` timestamp,
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `smart_form_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_form_schedules` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`form_id` int NOT NULL,
	`tipo_agendamento` varchar(50) NOT NULL,
	`recorrencia` varchar(50),
	`proximo_envio` timestamp,
	`ultimo_envio` timestamp,
	`ativo` boolean DEFAULT true,
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `smart_form_schedules_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_form_templates` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`nome` varchar(255) NOT NULL,
	`descricao` text,
	`categoria` varchar(100) NOT NULL,
	`perguntas` text,
	`impacto_estimado` varchar(100),
	`taxa_sucesso_media` decimal(5,2),
	`criado_em` timestamp DEFAULT (now()),
	CONSTRAINT `smart_form_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `smart_forms` (
	`id` serial AUTO_INCREMENT NOT NULL,
	`empresa_id` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`descricao` text,
	`prioridade` varchar(50) NOT NULL,
	`categoria` varchar(100) NOT NULL,
	`impacto_estimado` varchar(100),
	`kpi_principal` varchar(100),
	`n_perguntas` int DEFAULT 0,
	`estado` varchar(50) NOT NULL DEFAULT 'rascunho',
	`template_id` int,
	`criado_em` timestamp DEFAULT (now()),
	`atualizado_em` timestamp DEFAULT (now()),
	CONSTRAINT `smart_forms_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `smart_form_audit` ADD CONSTRAINT `smart_form_audit_form_id_smart_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `smart_forms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_form_channels` ADD CONSTRAINT `smart_form_channels_form_id_smart_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `smart_forms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_form_permissions` ADD CONSTRAINT `smart_form_permissions_form_id_smart_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `smart_forms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_form_questions` ADD CONSTRAINT `smart_form_questions_form_id_smart_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `smart_forms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_form_responses` ADD CONSTRAINT `smart_form_responses_form_id_smart_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `smart_forms`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `smart_form_schedules` ADD CONSTRAINT `smart_form_schedules_form_id_smart_forms_id_fk` FOREIGN KEY (`form_id`) REFERENCES `smart_forms`(`id`) ON DELETE no action ON UPDATE no action;