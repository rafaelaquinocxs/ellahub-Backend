CREATE TABLE `acoes_inteligentes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`empresaId` int NOT NULL,
	`titulo` varchar(255) NOT NULL,
	`tipo` varchar(100) NOT NULL,
	`descricao` text NOT NULL,
	`baseadoEm` text,
	`potencialLucro` varchar(100),
	`roi` varchar(50),
	`implementacao` varchar(100),
	`status` enum('recomendada','em_andamento','concluida','descartada') DEFAULT 'recomendada',
	`prioridade` enum('Baixa','Média','Alta','Crítica') DEFAULT 'Média',
	`acoes` json,
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `acoes_inteligentes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `resultados_acoes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`acaoId` int NOT NULL,
	`empresaId` int NOT NULL,
	`periodo` varchar(100),
	`investimento` varchar(100),
	`receita` varchar(100),
	`lucro` varchar(100),
	`roi` varchar(50),
	`conversao` varchar(50),
	`alcance` varchar(100),
	`status` enum('em_progresso','concluida') DEFAULT 'em_progresso',
	`createdAt` timestamp DEFAULT (now()),
	`updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `resultados_acoes_id` PRIMARY KEY(`id`)
);
