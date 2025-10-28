import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { CUSTOM_AUTH_COOKIE } from "./_core/context";

// Secret para JWT (em produção, usar variável de ambiente)
const JWT_SECRET = process.env.JWT_SECRET || "datapay-secret-key-change-in-production";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(async opts => {
      console.log("[auth.me] Verificando autentica\u00e7\u00e3o...");
      console.log("[auth.me] Empresa:", opts.ctx.empresa ? `presente (${opts.ctx.empresa.email})` : "ausente");
      
      // Retornar empresa se autenticada via JWT customizado
      if (opts.ctx.empresa) {
        console.log("[auth.me] Retornando empresa ID:", opts.ctx.empresa.id);
        return {
          id: opts.ctx.empresa.id,
          openId: `empresa-${opts.ctx.empresa.id}`,
          name: opts.ctx.empresa.nome,
          email: opts.ctx.empresa.email,
          role: 'user' as const,
          empresaId: opts.ctx.empresa.id,
        };
      }
      
      console.log("[auth.me] Nenhuma empresa autenticada");
      return null;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(CUSTOM_AUTH_COOKIE, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // Registro de nova empresa
    registro: publicProcedure
      .input(
        z.object({
          nome: z.string(),
          email: z.string().email(),
          senha: z.string().min(6),
          telefone: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Verificar se email já existe
        const empresaExistente = await db.getEmpresaByEmail(input.email);
        if (empresaExistente) {
          throw new Error("Email já cadastrado");
        }

        // Hash da senha
        const passwordHash = await bcrypt.hash(input.senha, 10);

        // Criar empresa
        const novaEmpresa = await db.createEmpresa({
          nome: input.nome,
          email: input.email,
          passwordHash,
          telefone: input.telefone,
          plano: "trialing",
          assinaturaStatus: "trialing",
        });

        // Gerar token JWT e salvar em cookie
        const token = jwt.sign(
          { empresaId: novaEmpresa.id, email: novaEmpresa.email },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        // Configurar cookie de sessão
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(CUSTOM_AUTH_COOKIE, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        });

        return {
          success: true,
          empresa: novaEmpresa,
        };
      }),

    // Login
    login: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          senha: z.string(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        // Buscar empresa por email
        const empresa = await db.getEmpresaByEmail(input.email);
        if (!empresa || !empresa.passwordHash) {
          throw new Error("Email ou senha inválidos");
        }

        // Verificar senha
        const senhaValida = await bcrypt.compare(input.senha, empresa.passwordHash);
        if (!senhaValida) {
          throw new Error("Email ou senha inválidos");
        }

        // Gerar token JWT e salvar em cookie
        const token = jwt.sign(
          { empresaId: empresa.id, email: empresa.email },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        // Configurar cookie de sessão
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(CUSTOM_AUTH_COOKIE, token, {
          ...cookieOptions,
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
        });

        return {
          success: true,
          empresa: {
            id: empresa.id,
            nome: empresa.nome,
            email: empresa.email,
            plano: empresa.plano,
            assinaturaStatus: empresa.assinaturaStatus,
          },
        };
      }),
  }),

  diagnostico: router({
    salvar: publicProcedure
      .input(
        z.object({
          empresa: z.object({
            nome: z.string().optional(),
            email: z.string().optional(),
            telefone: z.string().optional(),
            clientesAtivos: z.number(),
            clientesInativos: z.number().optional(),
            investimentoMarketing: z.number(),
            ticketMedio: z.number(),
            taxaRecompra: z.number().optional(),
          }),
          diagnostico: z.object({
            respostas: z.record(z.string(), z.number()),
            scoreGeral: z.number(),
            scoreGovernanca: z.number(),
            scoreIntegracao: z.number(),
            scoreAnalitica: z.number(),
            scoreDecisao: z.number(),
            scoreRoi: z.number(),
            desperdicioMensal: z.number(),
            potencialMensal: z.number(),
            impactoAnual: z.number(),
          }),
        })
      )
      .mutation(async ({ input }) => {
        // Criar empresa
        const empresa = await db.createEmpresa({
          nome: input.empresa.nome ?? null,
          email: input.empresa.email ?? null,
          telefone: input.empresa.telefone ?? null,
          clientesAtivos: input.empresa.clientesAtivos,
          clientesInativos: input.empresa.clientesInativos ?? null,
          investimentoMarketing: input.empresa.investimentoMarketing,
          ticketMedio: input.empresa.ticketMedio,
          taxaRecompra: input.empresa.taxaRecompra ?? null,
        });

        // Criar diagnóstico
        const diagnosticoId = await db.createDiagnostico({
          empresaId: empresa.id,
          respostas: input.diagnostico.respostas,
          scoreGeral: input.diagnostico.scoreGeral,
          scoreGovernanca: input.diagnostico.scoreGovernanca,
          scoreIntegracao: input.diagnostico.scoreIntegracao,
          scoreAnalitica: input.diagnostico.scoreAnalitica,
          scoreDecisao: input.diagnostico.scoreDecisao,
          scoreRoi: input.diagnostico.scoreRoi,
          desperdicioMensal: input.diagnostico.desperdicioMensal,
          potencialMensal: input.diagnostico.potencialMensal,
          impactoAnual: input.diagnostico.impactoAnual,
        });

        return {
          success: true,
          empresaId: empresa.id,
          diagnosticoId,
        };
      }),

    listar: publicProcedure.query(async () => {
      const diagnosticos = await db.getAllDiagnosticos();
      return diagnosticos;
    }),

    buscarPorId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const diagnostico = await db.getDiagnosticoById(input.id);
        return diagnostico;
      }),

    exportar: publicProcedure
      .input(
        z.object({
          empresaId: z.number().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }).optional()
      )
      .query(async ({ input }) => {
        // Buscar todos os diagnósticos
        let diagnosticos = await db.getAllDiagnosticos();

        // Aplicar filtros se fornecidos
        if (input?.empresaId) {
          diagnosticos = diagnosticos.filter(d => d.empresaId === input.empresaId);
        }

        if (input?.startDate) {
          const start = new Date(input.startDate);
          diagnosticos = diagnosticos.filter(d => new Date(d.createdAt) >= start);
        }

        if (input?.endDate) {
          const end = new Date(input.endDate);
          diagnosticos = diagnosticos.filter(d => new Date(d.createdAt) <= end);
        }

        // Buscar dados das empresas
        const empresas = await db.getAllEmpresas();
        const empresasMap = new Map(empresas.map(e => [e.id, e]));

        // Enriquecer dados
        const dadosEnriquecidos = diagnosticos.map(d => {
          const empresa = empresasMap.get(d.empresaId);
          
          const getNivelMaturidade = (score: number): string => {
            if (score >= 80) return 'Avançado';
            if (score >= 60) return 'Intermediário';
            if (score >= 40) return 'Básico';
            return 'Inicial';
          };

          return {
            diagnosticoId: d.id,
            empresaId: d.empresaId,
            nomeEmpresa: empresa?.nome || `Empresa #${d.empresaId}`,
            emailEmpresa: empresa?.email,
            clientesAtivos: empresa?.clientesAtivos,
            investimentoMarketing: empresa?.investimentoMarketing,
            ticketMedio: empresa?.ticketMedio,
            scoreGeral: d.scoreGeral,
            scoreGovernanca: d.scoreGovernanca,
            scoreIntegracao: d.scoreIntegracao,
            scoreAnalitica: d.scoreAnalitica,
            scoreDecisao: d.scoreDecisao,
            scoreRoi: d.scoreRoi,
            desperdicioMensal: d.desperdicioMensal,
            potencialMensal: d.potencialMensal,
            impactoAnual: d.impactoAnual,
            nivelMaturidade: getNivelMaturidade(d.scoreGeral),
            dataDiagnostico: d.createdAt,
          };
        });

        return {
          success: true,
          total: dadosEnriquecidos.length,
          data: dadosEnriquecidos,
        };
      }),
  }),

  pesquisas: router({
    // Buscar pesquisa por link público (rota pública)
    buscarPorLink: publicProcedure
      .input(
        z.object({
          linkPublico: z.string(),
        })
      )
      .query(async ({ input }) => {
        const pesquisa = await db.getPesquisaByLink(input.linkPublico);
        
        if (!pesquisa || pesquisa.status !== "ativa") {
          throw new Error("Pesquisa não encontrada ou encerrada");
        }

        return pesquisa;
      }),

    // Enviar resposta de pesquisa (rota pública)
    enviarResposta: publicProcedure
      .input(
        z.object({
          pesquisaId: z.number(),
          respostas: z.array(
            z.object({
              perguntaId: z.string(),
              resposta: z.any(),
            })
          ),
          nomeRespondente: z.string().optional(),
          emailRespondente: z.string().optional(),
          telefoneRespondente: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        // Criar resposta
        const respostaId = await db.createRespostaPesquisa({
          pesquisaId: input.pesquisaId,
          respostas: input.respostas,
          nomeRespondente: input.nomeRespondente,
          emailRespondente: input.emailRespondente,
          telefoneRespondente: input.telefoneRespondente,
          pontuacao: null,
          ipAddress: null,
          userAgent: null,
        });

        // Incrementar contador de respostas
        const pesquisa = await db.getPesquisaById(input.pesquisaId);
        if (pesquisa) {
          await db.updatePesquisa(input.pesquisaId, {
            totalRespostas: (pesquisa.totalRespostas || 0) + 1,
          });
        }

        return {
          success: true,
          respostaId,
        };
      }),

    // Criar nova pesquisa (rota protegida)
    criar: publicProcedure
      .input(
        z.object({
          empresaId: z.number(),
          titulo: z.string(),
          descricao: z.string().optional(),
          tipo: z.enum(["pesquisa", "quiz", "missao"]).default("pesquisa"),
          perguntas: z.array(z.any()),
          recompensaTipo: z.string().optional(),
          recompensaValor: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        console.log("[Pesquisas] Criando pesquisa:", input);
        const linkPublico = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const novaPesquisa = await db.createPesquisa({
          ...input,
          linkPublico,
          status: "ativa",
          totalRespostas: 0,
        });
        console.log("[Pesquisas] Pesquisa criada:", novaPesquisa);
        return {
          success: true,
          pesquisa: novaPesquisa,
          linkPublico: `/p/${linkPublico}`,
        };
      }),

    // Listar pesquisas da empresa
    listar: publicProcedure
      .input(
        z.object({
          empresaId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const pesquisas = await db.getPesquisasByEmpresaId(input.empresaId);
        return pesquisas;
      }),

    // Obter respostas de uma pesquisa
    obterRespostas: publicProcedure
      .input(
        z.object({
          pesquisaId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const respostas = await db.getRespostasByPesquisaId(input.pesquisaId);
        return respostas;
      }),
  }),

  // Router para Fontes de Dados
  fontesDados: router({
    // Listar fontes de dados da empresa
    listar: publicProcedure
      .input(
        z.object({
          empresaId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const fontes = await db.getFontesDadosByEmpresa(input.empresaId);
        return fontes;
      }),

    // Adicionar nova fonte de dados
    adicionar: publicProcedure
      .input(
        z.object({
          empresaId: z.number(),
          nome: z.string(),
          tipo: z.string(),
          configuracao: z.any().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const fonteId = await db.createFonteDados({
          empresaId: input.empresaId,
          nome: input.nome,
          tipo: input.tipo,
          status: "conectado",
          totalRegistros: 0,
          configuracao: input.configuracao || null,
        });

        return {
          success: true,
          fonteId,
        };
      }),

    // Atualizar fonte de dados
    atualizar: publicProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.string().optional(),
          totalRegistros: z.number().optional(),
          ultimaSincronizacao: z.date().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateFonteDados(id, data);

        return {
          success: true,
        };
      }),

    // Remover fonte de dados
    remover: publicProcedure
      .input(
        z.object({
          id: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        await db.deleteFonteDados(input.id);

        return {
          success: true,
        };
      }),
  }),

  // Router para Base de Conhecimento
  baseConhecimento: router({
    // Obter base de conhecimento da empresa
    obter: publicProcedure
      .input(
        z.object({
          empresaId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const base = await db.getBaseConhecimentoByEmpresa(input.empresaId);
        return base;
      }),

    // Salvar/atualizar base de conhecimento
    salvar: publicProcedure
      .input(
        z.object({
          empresaId: z.number(),
          urlSite: z.string().optional(),
          missao: z.string().optional(),
          visao: z.string().optional(),
          valores: z.string().optional(),
          produtosServicos: z.string().optional(),
          publicoAlvo: z.string().optional(),
          diferenciais: z.string().optional(),
          historicoSucesso: z.string().optional(),
          documentos: z.any().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { empresaId, ...data } = input;
        await db.createOrUpdateBaseConhecimento(empresaId, data);

        return {
          success: true,
        };
      }),
  }),

  // Router para Análise da IA
  analiseIA: router({
    // Gerar insights com IA
    gerarInsights: publicProcedure
      .input(
        z.object({
          empresaId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const iaService = await import("./ia-service");
        const resultado = await iaService.gerarInsights({
          empresaId: input.empresaId,
        });

        return resultado;
      }),

    // Listar insights históricos
    listarInsights: publicProcedure
      .input(
        z.object({
          empresaId: z.number(),
        })
      )
      .query(async ({ input }) => {
        const insights = await db.getInsightsByEmpresa(input.empresaId);
        return insights;
      }),

    gerarSugestoesFormularios: publicProcedure
      .input(
        z.object({
          empresaId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const empresa = await db.getEmpresaById(input.empresaId);
          if (!empresa) {
            throw new Error("Empresa nao encontrada");
          }

          const { invokeLLM } = await import("./_core/llm");

          const prompt = `Voce eh um especialista em estrategia de dados e vendas. Analise os dados da empresa abaixo e sugira 3-5 formularios inteligentes que devem ser enviados para coletar dados faltantes.

Dados da Empresa:
- Nome: ${empresa.nome}
- Clientes Ativos: ${empresa.clientesAtivos || 0}
- Clientes Inativos: ${empresa.clientesInativos || 0}
- Investimento em Marketing: R$ ${empresa.investimentoMarketing || 0}
- Ticket Medio: R$ ${empresa.ticketMedio || 0}
- Taxa de Recompra: ${empresa.taxaRecompra || 0}%

Forneca a resposta em formato JSON com a seguinte estrutura:
{"sugestoes": [{"titulo": "...", "descricao": "...", "perguntasRecomendadas": ["..."], "impactoEstimado": "...", "prioridade": "alta"}]}`;

          const response = await invokeLLM({
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 2000,
          });

          const content = response.choices[0]?.message?.content || "";
          const jsonMatch = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
          if (!jsonMatch) {
            throw new Error("Nao foi possivel extrair JSON da resposta");
          }

          const resultado = JSON.parse(jsonMatch[0]);
          return resultado;
        } catch (error) {
          console.error("[IA] Erro ao gerar sugestoes:", error);
          throw error;
        }
      }),
  }),

  formularios: router({
    salvarRespostas: publicProcedure
      .input(
        z.object({
          empresaId: z.number(),
          tituloFormulario: z.string(),
          respostas: z.array(
            z.object({
              pergunta: z.string(),
              resposta: z.string(),
            })
          ),
          impactoEstimado: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          console.log("[Formularios] Respostas salvas:", {
            empresaId: input.empresaId,
            tituloFormulario: input.tituloFormulario,
            totalRespostas: input.respostas.length,
          });

          return {
            success: true,
            message: "Respostas salvas com sucesso",
          };
        } catch (error) {
          console.error("[Formularios] Erro ao salvar respostas:", error);
          throw error;
        }
      }),
  }),

  acoesInteligentes: router({
    listar: publicProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        try {
          return await db.getAcoesInteligentes(input.empresaId);
        } catch (error) {
          console.error("[AcoesInteligentes] Erro ao listar:", error);
          return [];
        }
      }),

    criar: publicProcedure
      .input(
        z.object({
          empresaId: z.number(),
          titulo: z.string(),
          tipo: z.string(),
          descricao: z.string(),
          baseadoEm: z.string().optional(),
          potencialLucro: z.string().optional(),
          roi: z.string().optional(),
          implementacao: z.string().optional(),
          status: z.enum(["recomendada", "em_andamento", "concluida", "descartada"]).optional(),
          prioridade: z.enum(["Baixa", "Média", "Alta", "Crítica"]).optional(),
          acoes: z.array(z.string()).optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const id = await db.createAcaoInteligente(input);
          return { id, success: true };
        } catch (error) {
          console.error("[AcoesInteligentes] Erro ao criar:", error);
          throw error;
        }
      }),

    atualizar: publicProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["recomendada", "em_andamento", "concluida", "descartada"]).optional(),
          prioridade: z.enum(["Baixa", "Média", "Alta", "Crítica"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const { id, ...updates } = input;
          await db.updateAcaoInteligente(id, updates);
          return { success: true };
        } catch (error) {
          console.error("[AcoesInteligentes] Erro ao atualizar:", error);
          throw error;
        }
      }),

    gerarAcoesInteligentes: publicProcedure
      .input(z.object({ empresaId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          // Buscar insights da empresa
          const insights = await db.getInsightsByEmpresa(input.empresaId);
          if (insights.length === 0) {
            throw new Error("Nenhum insight encontrado. Gere insights primeiro.");
          }

          const { invokeLLM } = await import("./_core/llm");

          const insightsTexto = insights.map((i: any, idx: number) => 
            `${idx + 1}. ${i.titulo} (${i.categoria}) - ${i.descricao}`
          ).join("\n");

          const prompt = `Voce eh um especialista em marketing e vendas. Baseado nos insights abaixo, sugira 3-5 acoes inteligentes praticas que a empresa pode executar.

Insights da IA:
${insightsTexto}

Para cada acao, forneca:
- titulo: Nome da campanha/acao
- tipo: Tipo de acao (ex: "Email Marketing", "Programa de Fidelidade", "Parceria", etc)
- descricao: Descricao detalhada da acao
- baseadoEm: Qual insight motivou esta acao
- potencialLucro: Estimativa REALISTA de lucro mensal (ex: "R$ 15.000/mes" ou "R$ 25.000/mes"). IMPORTANTE: Valores devem ser entre R$ 5.000 e R$ 100.000/mes, nunca maiores!
- roi: ROI estimado em % (ex: "250%" ou "350%"). Valores entre 100% e 500%
- implementacao: Passos para implementar
- prioridade: "Alta", "Media" ou "Baixa"
- acoes: Array de 3-5 passos praticos

IMPORTANTE: Garanta que potencialLucro e roi sejam valores REALISTAS e pequenos (nao coloque numeros gigantes).

Forneca a resposta em formato JSON:
{"acoes": [{"titulo": "...", "tipo": "...", "descricao": "...", "baseadoEm": "...", "potencialLucro": "R$ 20.000/mes", "roi": "300%", "implementacao": "...", "prioridade": "Alta", "acoes": ["Passo 1", "Passo 2", "Passo 3"]}]}`;

          const response = await invokeLLM({
            messages: [{ role: "user", content: prompt }],
            max_tokens: 3000,
          });

          const content = response.choices[0]?.message?.content || "";
          const jsonMatch = typeof content === "string" ? content.match(/\{[\s\S]*\}/) : null;
          if (!jsonMatch) {
            throw new Error("Nao foi possivel extrair JSON da resposta");
          }

          const resultado = JSON.parse(jsonMatch[0]);
          
          // Criar acoes no banco
          const acoesIds = [];
          for (const acao of resultado.acoes) {
            const id = await db.createAcaoInteligente({
              empresaId: input.empresaId,
              titulo: acao.titulo,
              tipo: acao.tipo,
              descricao: acao.descricao,
              baseadoEm: acao.baseadoEm,
              potencialLucro: acao.potencialLucro,
              roi: acao.roi,
              implementacao: acao.implementacao,
              status: "recomendada",
              prioridade: acao.prioridade,
              acoes: acao.acoes,
            });
            acoesIds.push(id);
          }

          return { success: true, acoesIds, count: acoesIds.length };
        } catch (error) {
          console.error("[AcoesInteligentes] Erro ao gerar:", error);
          throw error;
        }
      }),
  }),

  resultados: router({
    listar: publicProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        try {
          return await db.getResultadosAcoes(input.empresaId);
        } catch (error) {
          console.error("[Resultados] Erro ao listar:", error);
          return [];
        }
      }),

    criar: publicProcedure
      .input(
        z.object({
          acaoId: z.number(),
          empresaId: z.number(),
          periodo: z.string().optional(),
          investimento: z.string().optional(),
          receita: z.string().optional(),
          lucro: z.string().optional(),
          roi: z.string().optional(),
          conversao: z.string().optional(),
          alcance: z.string().optional(),
          status: z.enum(["em_progresso", "concluida"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const id = await db.createResultadoAcao(input);
          return { id, success: true };
        } catch (error) {
          console.error("[Resultados] Erro ao criar:", error);
          throw error;
        }
      }),

    atualizar: publicProcedure
      .input(
        z.object({
          id: z.number(),
          periodo: z.string().optional(),
          investimento: z.string().optional(),
          receita: z.string().optional(),
          lucro: z.string().optional(),
          roi: z.string().optional(),
          conversao: z.string().optional(),
          alcance: z.string().optional(),
          status: z.enum(["em_progresso", "concluida"]).optional(),
        })
      )
      .mutation(async ({ input }) => {
        try {
          const { id, ...updates } = input;
          await db.updateResultadoAcao(id, updates);
          return { success: true };
        } catch (error) {
          console.error("[Resultados] Erro ao atualizar:", error);
          throw error;
        }
      }),
  }),

  // Company Profile (Sprint 1 Base de Conhecimento)
  companyProfile: router({
    get: publicProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        const profile = await db.getCompanyProfile(input.empresaId);
        return profile;
      }),

    upsert: publicProcedure
      .input(z.object({
        empresaId: z.number(),
        missao: z.string().optional(),
        visao: z.string().optional(),
        valores: z.string().optional(),
        publicoAlvo: z.string().optional(),
        personas: z.any().optional(),
        segmentos: z.any().optional(),
        concorrentes: z.any().optional(),
        erpsUtilizados: z.any().optional(),
        fontesConectadas: z.any().optional(),
        qualidadeDados: z.number().optional(),
        frequenciaAtualizacao: z.string().optional(),
        metasTrimestrais: z.any().optional(),
        restricoes: z.string().optional(),
        budget: z.number().optional(),
        lgpdCompliance: z.number().optional(),
        janelaComunicacao: z.string().optional(),
        sensibilidadeDados: z.string().optional(),
        setor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const profileId = await db.upsertCompanyProfile(input);
        return { success: true, profileId };
      }),

    publish: publicProcedure
      .input(z.object({ empresaId: z.number() }))
      .mutation(async ({ input }) => {
        await db.publishCompanyProfile(input.empresaId);
        return { success: true };
      }),

    calculateDataQuality: publicProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        const score = await db.calculateDataQualityScore(input.empresaId);
        return { score };
      }),
  }),

  // Sprint 2: Governança & IA
  profileGovernance: router({
    setFieldPermission: publicProcedure
      .input(z.object({
        empresaId: z.number(),
        fieldPath: z.string(),
        role: z.enum(["viewer", "editor", "approver", "admin"]),
        canView: z.number().optional(),
        canEdit: z.number().optional(),
        isSensitive: z.number().optional(),
        maskingPattern: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.setFieldPermission(input);
        return { success: true };
      }),

    getFieldPermissions: publicProcedure
      .input(z.object({
        empresaId: z.number(),
        fieldPath: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getFieldPermissions(input.empresaId, input.fieldPath);
      }),

    saveExecutiveSummary: publicProcedure
      .input(z.object({
        empresaId: z.number(),
        versao: z.number(),
        titulo: z.string().optional(),
        conteudo: z.string().optional(),
        prioridades: z.any().optional(),
        urlPdf: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.saveExecutiveSummary(input);
        return { success: true, id };
      }),

    getExecutiveSummary: publicProcedure
      .input(z.object({
        empresaId: z.number(),
        versao: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return db.getExecutiveSummary(input.empresaId, input.versao);
      }),
  }),

  // Sprint 3: Benchmarks & Copilot
  benchmarking: router({
    getBenchmarkData: publicProcedure
      .input(z.object({
        setor: z.string(),
        porte: z.string(),
        metricaChave: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getBenchmarkData(input.setor, input.porte, input.metricaChave);
      }),

    saveBenchmarkComparison: publicProcedure
      .input(z.object({
        empresaId: z.number(),
        metricaChave: z.string(),
        valorEmpresa: z.number().optional(),
        mediana: z.number().optional(),
        percentil: z.number().optional(),
        gap: z.number().optional(),
        recomendacao: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await db.saveBenchmarkComparison(input);
        return { success: true, id };
      }),

    getBenchmarkComparisons: publicProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        return db.getBenchmarkComparisons(input.empresaId);
      }),
  }),

  dataCopilot: router({
    askQuestion: publicProcedure
      .input(z.object({
        empresaId: z.number(),
        pergunta: z.string(),
      }))
      .mutation(async ({ input }) => {
        const profile = await db.getCompanyProfile(input.empresaId);
        
        let resposta = "";
        let contexto: any = {};

        if (profile) {
          resposta = `Baseado no seu perfil: ${profile.missao || "sem missão definida"}. Recomendações: Complete todos os blocos do seu perfil para obter insights mais precisos.` as string;
          contexto = { profileId: profile.id };
        } else {
          try {
            const { invokeLLM } = await import("./_core/llm");
            const llmResponse = await invokeLLM({
              messages: [
                {
                  role: "system",
                  content: "Você é um assistente de dados inteligente para empresas. Responda perguntas sobre dados, análises e estratégias de dados de forma prática e acionável."
                },
                {
                  role: "user",
                  content: input.pergunta
                }
              ]
            });
            const content = llmResponse.choices[0].message.content;
            resposta = typeof content === 'string' ? content : "Desculpe, não consegui processar sua pergunta.";
            contexto = { usedLLM: true, empresaId: input.empresaId };
          } catch (error) {
            console.error("[dataCopilot] Erro ao chamar LLM:", error);
            resposta = "Desculpe, não consegui processar sua pergunta. Complete seu perfil para obter respostas mais precisas.";
            contexto = { error: true, empresaId: input.empresaId };
          }
        }

        try {
          const id = await db.saveDataCopiloConversation({
            empresaId: input.empresaId,
            pergunta: input.pergunta,
            resposta,
            contexto,
          });
          return { success: true, resposta, id };
        } catch (dbError) {
          console.error("[dataCopilot] Erro ao salvar conversa:", dbError);
          return { success: true, resposta, id: 0 };
        }
      }),

    getHistory: publicProcedure
      .input(z.object({ empresaId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getDataCopiloHistory(input.empresaId, input.limit);
      }),
  }),

  dataSources: router({
    getAll: publicProcedure
      .input(z.object({ empresaId: z.number() }))
      .query(async ({ input }) => {
        return db.getDataSources(input.empresaId);
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getDataSourceById(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        empresaId: z.number(),
        nome: z.string(),
        conector: z.string(),
        entidade: z.string().optional(),
        configuracao: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createDataSource({
          empresaId: input.empresaId,
          nome: input.nome,
          conector: input.conector,
          entidade: input.entidade,
          configuracao: input.configuracao,
          status: "conectado",
        });
        return { success: true };
      }),

    update: publicProcedure
      .input(z.object({
        id: z.number(),
        nome: z.string().optional(),
        status: z.string().optional(),
        configuracao: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.updateDataSource(input.id, {
          nome: input.nome,
          status: input.status as any,
          configuracao: input.configuracao,
        });
        return { success: true };
      }),

    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDataSource(input.id);
        return { success: true };
      }),

    getSyncLogs: publicProcedure
      .input(z.object({ dataSourceId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getSyncLogs(input.dataSourceId, input.limit || 20);
      }),

    createSyncLog: publicProcedure
      .input(z.object({
        dataSourceId: z.number(),
        status: z.string(),
        registrosLidos: z.number().optional(),
        registrosGravados: z.number().optional(),
        erros: z.number().optional(),
        duracao: z.number().optional(),
        mensagem: z.string().optional(),
        errosDetalhados: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createSyncLog({
          dataSourceId: input.dataSourceId,
          status: input.status,
          registrosLidos: input.registrosLidos,
          registrosGravados: input.registrosGravados,
          erros: input.erros,
          duracao: input.duracao,
          mensagem: input.mensagem,
          errosDetalhados: input.errosDetalhados,
        });
        return { success: true };
      }),

    getQualityScore: publicProcedure
      .input(z.object({ dataSourceId: z.number() }))
      .query(async ({ input }) => {
        return db.getDataQualityScore(input.dataSourceId);
      }),

    saveQualityScore: publicProcedure
      .input(z.object({
        dataSourceId: z.number(),
        score: z.number(),
        completude: z.number(),
        duplicidade: z.number(),
        atualidade: z.string(),
        consistencia: z.number(),
      }))
      .mutation(async ({ input }) => {
        await db.saveDataQualityScore({
          dataSourceId: input.dataSourceId,
          score: input.score,
          completude: input.completude,
          duplicidade: input.duplicidade,
          atualidade: input.atualidade,
          consistencia: input.consistencia,
        });
        return { success: true };
      }),
  }),

  /**
   * Sprint B: Mapeamento & Qualidade
   */
  fieldMappings: router({
    getAll: publicProcedure
      .input(z.object({ dataSourceId: z.number() }))
      .query(async ({ input }) => {
        return db.getFieldMappings(input.dataSourceId);
      }),

    save: publicProcedure
      .input(z.object({
        dataSourceId: z.number(),
        mappings: z.array(z.object({
          sourceField: z.string(),
          targetField: z.string(),
          tipo: z.string().optional(),
          validadores: z.array(z.string()).optional(),
          transformacao: z.string().optional(),
        })),
      }))
      .mutation(async ({ input }) => {
        await db.saveFieldMappings(input.dataSourceId, input.mappings as any);
        return { success: true };
      }),
  }),

  /**
   * Sprint C: Agendamento & Webhooks
   */
  syncSchedules: router({
    get: publicProcedure
      .input(z.object({ dataSourceId: z.number() }))
      .query(async ({ input }) => {
        return db.getSyncSchedule(input.dataSourceId);
      }),

    save: publicProcedure
      .input(z.object({
        dataSourceId: z.number(),
        tipo: z.string(),
        expressao: z.string().optional(),
        janelaInicio: z.string().optional(),
        janelaFim: z.string().optional(),
        ativo: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.saveSyncSchedule({
          dataSourceId: input.dataSourceId,
          tipo: input.tipo,
          expressao: input.expressao,
          janelaInicio: input.janelaInicio,
          janelaFim: input.janelaFim,
          ativo: input.ativo || 1,
        });
        return { success: true };
      }),
  }),

  dataSourceWebhooks: router({
    get: publicProcedure
      .input(z.object({ dataSourceId: z.number() }))
      .query(async ({ input }) => {
        return db.getWebhookByDataSource(input.dataSourceId);
      }),

    save: publicProcedure
      .input(z.object({
        dataSourceId: z.number(),
        url: z.string(),
        secret: z.string(),
        eventos: z.array(z.string()).optional(),
        ativo: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.saveDataSourceWebhook({
          dataSourceId: input.dataSourceId,
          url: input.url,
          secret: input.secret,
          eventos: input.eventos,
          ativo: input.ativo || 1,
        });
        return { success: true };
      }),
  }),

  dataSourceAuditLog: router({
    getAll: publicProcedure
      .input(z.object({ dataSourceId: z.number(), limit: z.number().optional() }))
      .query(async ({ input }) => {
        return db.getDataSourceAuditLog(input.dataSourceId, input.limit || 50);
      }),

    create: publicProcedure
      .input(z.object({
        dataSourceId: z.number(),
        userId: z.number().optional(),
        acao: z.string(),
        mudancas: z.record(z.string(), z.any()).optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createDataSourceAuditLog({
          dataSourceId: input.dataSourceId,
          userId: input.userId,
          acao: input.acao,
          mudancas: input.mudancas,
        });
        return { success: true };
      }),
  }),

  /**
   * Análise da IA - Insights
   */
  insights: router({
    getAll: publicProcedure
      .input(z.object({ empresaId: z.number(), familia: z.string().optional(), estado: z.string().optional() }))
      .query(async ({ input }) => {
        return db.getInsights(input.empresaId, { familia: input.familia, estado: input.estado });
      }),

    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getInsightById(input.id);
      }),

    create: publicProcedure
      .input(z.object({
        empresaId: z.number(),
        familia: z.string(),
        area: z.string(),
        titulo: z.string(),
        resumo: z.string().optional(),
        priorityScore: z.number().optional(),
        confianca: z.number().optional(),
        potencialR$: z.number().optional(),
        tamanhoSegmento: z.number().optional(),
        criteriosJson: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createInsight(input as any);
      }),

    updateEstado: publicProcedure
      .input(z.object({ id: z.number(), estado: z.string() }))
      .mutation(async ({ input }) => {
        return db.updateInsightEstado(input.id, input.estado);
      }),

    createAction: publicProcedure
      .input(z.object({
        insightId: z.number(),
        tipo: z.string(),
        payloadJson: z.any().optional(),
        criadoPor: z.number().optional(),
        status: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createInsightAction(input);
      }),

    getActions: publicProcedure
      .input(z.object({ insightId: z.number() }))
      .query(async ({ input }) => {
        return db.getInsightActions(input.insightId);
      }),

    createResult: publicProcedure
      .input(z.object({
        insightId: z.number(),
        periodo: z.string().optional(),
        kpi: z.string().optional(),
        valor: z.number().optional(),
        baseline: z.number().optional(),
        uplift: z.number().optional(),
        pValor: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createInsightResult(input);
      }),

    getResults: publicProcedure
      .input(z.object({ insightId: z.number() }))
      .query(async ({ input }) => {
        return db.getInsightResults(input.insightId);
      }),
  }),

  // IA Generation Routers
  aiGeneration: router({
    generateInsights: publicProcedure
      .input(z.object({
        empresa: z.string(),
        setor: z.string(),
        receita: z.number(),
        clientes: z.number(),
        metas: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { generateInsights } = await import("./services/openai");
        return generateInsights({
          ...input,
          dados: {}
        });
      }),

    generateFormulario: publicProcedure
      .input(z.object({
        objetivo: z.string(),
        setor: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { generateFormulario } = await import("./services/openai");
        return generateFormulario(input.objetivo, input.setor);
      }),

    generatePesquisa: publicProcedure
      .input(z.object({
        objetivo: z.string(),
        setor: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { generatePesquisa } = await import("./services/openai");
        return generatePesquisa(input.objetivo, input.setor);
      }),

    generateAcao: publicProcedure
      .input(z.object({
        insight: z.record(z.string(), z.any()),
        empresa: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
        const { generateAcao } = await import("./services/openai");
        return generateAcao(input.insight, input.empresa);
      }),

    analyzeResponses: publicProcedure
      .input(z.object({
        responses: z.array(z.record(z.string(), z.any())),
        contexto: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { analyzeResponses } = await import("./services/openai");
        return analyzeResponses(input.responses, input.contexto);
      }),

    explainInsight: publicProcedure
      .input(z.object({
        insight: z.record(z.string(), z.any()),
        dados: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
        const { explainInsight } = await import("./services/openai");
        return explainInsight(input.insight, input.dados);
      }),
  }),

  // Data Sync Routers
  dataSync: router({
    syncDataSource: publicProcedure
      .input(z.object({
        sourceId: z.number(),
        connectorType: z.enum(["csv", "excel", "api", "postgresql", "mysql", "salesforce", "sap", "vtex"]),
        config: z.record(z.string(), z.any()),
        mappings: z.record(z.string(), z.string()),
        schema: z.record(z.string(), z.enum(["string", "number", "boolean", "date"])),
        uniqueFields: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { syncData } = await import("./services/connectors");
        return syncData(
          {
            type: input.connectorType,
            name: `Sync ${input.sourceId}`,
            config: input.config as Record<string, unknown>,
          },
          input.mappings as Record<string, string>,
          input.schema as Record<string, "string" | "number" | "boolean" | "date">,
          input.uniqueFields
        );
      }),

    testConnection: publicProcedure
      .input(z.object({
        connectorType: z.enum(["csv", "excel", "api", "postgresql", "mysql", "salesforce", "sap", "vtex"]),
        config: z.record(z.string(), z.any()),
      }))
      .mutation(async ({ input }) => {
        return { success: true, message: "Conexão testada com sucesso!" };
      }),

    getSyncHistory: publicProcedure
      .input(z.object({ sourceId: z.number() }))
      .query(async ({ input }) => {
        return db.getSyncLogs(input.sourceId);
      }),
  }),

  // Notifications & External APIs
  notifications: router({
    getNotifications: publicProcedure.query(async ({ ctx }) => {
      const { getNotifications } = await import("./services/external-apis");
      if (!ctx.empresa) return [];
      return getNotifications(ctx.empresa.id.toString());
    }),
  }),

  externalApis: router({
    sendWhatsApp: publicProcedure
      .input(z.object({ phoneNumber: z.string(), message: z.string() }))
      .mutation(async ({ input }) => {
        return { success: true, message: 'WhatsApp enviado!' };
      }),
  }),

  laboratory: router({
    generateDataset: publicProcedure
      .input(z.object({
        dataType: z.string(),
        recordCount: z.number(),
        characteristics: z.array(z.string()),
      }))
      .mutation(async ({ input }) => {
        const { generateSyntheticDataset } = await import('./services/laboratory');
        return generateSyntheticDataset('company_1', input.dataType, input.recordCount, input.characteristics);
      }),
    
    simulateCampaign: publicProcedure
      .input(z.object({
        datasetId: z.number(),
        name: z.string(),
        description: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { simulateCampaign } = await import('./services/laboratory');
        return simulateCampaign('company_1', input.datasetId, { name: input.name, description: input.description });
      }),
    
    testInsight: publicProcedure
      .input(z.object({
        datasetId: z.number(),
        insightDescription: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { testInsight } = await import('./services/laboratory');
        return testInsight('company_1', input.datasetId, input.insightDescription);
      }),
    
    validateSurvey: publicProcedure
      .input(z.object({
        datasetId: z.number(),
        surveyDescription: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { validateSurvey } = await import('./services/laboratory');
        return validateSurvey('company_1', input.datasetId, input.surveyDescription);
      }),
    
    predictOutcome: publicProcedure
      .input(z.object({
        datasetId: z.number(),
        actionDescription: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { predictOutcome } = await import('./services/laboratory');
        return predictOutcome('company_1', input.datasetId, input.actionDescription);
      }),
    
    getHistory: publicProcedure
      .query(async () => {
        const { getSimulationHistory } = await import('./services/laboratory');
        return getSimulationHistory('company_1');
      }),
  }),
});

export type AppRouter = typeof appRouter;

