import { invokeLLM } from "./_core/llm";
import * as db from "./db";

interface GerarInsightsParams {
  empresaId: number;
}

export async function gerarInsights(params: GerarInsightsParams) {
  const { empresaId } = params;

  // 1. Buscar base de conhecimento da empresa
  const baseConhec = await db.getBaseConhecimentoByEmpresa(empresaId);

  // 2. Buscar fontes de dados conectadas
  const fontes = await db.getFontesDadosByEmpresa(empresaId);

  // 3. Buscar empresa
  const empresa = await db.getEmpresaById(empresaId);

  // 4. Construir contexto para a IA
  const contexto = `
# Contexto da Empresa

**Nome:** ${empresa?.nome || "Não informado"}
**Setor:** ${baseConhec?.publicoAlvo ? "Varejo/Serviços" : "Não especificado"}

## Base de Conhecimento

${baseConhec?.missao ? `**Missão:** ${baseConhec.missao}` : ""}
${baseConhec?.visao ? `**Visão:** ${baseConhec.visao}` : ""}
${baseConhec?.valores ? `**Valores:** ${baseConhec.valores}` : ""}
${baseConhec?.produtosServicos ? `**Produtos/Serviços:** ${baseConhec.produtosServicos}` : ""}
${baseConhec?.publicoAlvo ? `**Público-Alvo:** ${baseConhec.publicoAlvo}` : ""}
${baseConhec?.diferenciais ? `**Diferenciais:** ${baseConhec.diferenciais}` : ""}
${baseConhec?.urlSite ? `**Site:** ${baseConhec.urlSite}` : ""}

## Dados Disponíveis

${fontes.length > 0 ? `A empresa possui ${fontes.length} fonte(s) de dados conectadas:` : "Nenhuma fonte de dados conectada ainda."}
${fontes.map((f) => `- ${f.nome} (${f.tipo}): ${f.totalRegistros || 0} registros`).join("\n")}

## Dados do Diagnóstico

${empresa?.clientesAtivos ? `- Clientes Ativos: ${empresa.clientesAtivos}` : ""}
${empresa?.clientesInativos ? `- Clientes Inativos: ${empresa.clientesInativos}` : ""}
${empresa?.investimentoMarketing ? `- Investimento em Marketing: R$ ${empresa.investimentoMarketing}` : ""}
${empresa?.ticketMedio ? `- Ticket Médio: R$ ${empresa.ticketMedio}` : ""}
${empresa?.taxaRecompra ? `- Taxa de Recompra: ${empresa.taxaRecompra}%` : ""}
`;

  // 5. Prompt para GPT-4
  const prompt = `
Você é um especialista em marketing e vendas para varejo e serviços, com foco em estratégias data-driven.

${contexto}

**Tarefa:**
Com base nas informações acima, gere 5 insights criativos e acionáveis para aumentar vendas e lucro desta empresa.

Para cada insight, forneça:
1. **Título** (curto e impactante)
2. **Descrição** (2-3 frases explicando o insight)
3. **Categoria** (marketing, vendas, produto ou operacional)
4. **Impacto Estimado** (alto, médio ou baixo)
5. **Ações Sugeridas** (3-5 ações práticas e específicas)

Seja criativo e pense em:
- Parcerias estratégicas
- Campanhas personalizadas
- Oportunidades de cross-sell e upsell
- Otimização de timing (quando oferecer o quê)
- Segmentação inteligente
- Gamificação e engajamento

Retorne no formato JSON:
{
  "insights": [
    {
      "titulo": "...",
      "descricao": "...",
      "categoria": "marketing",
      "impactoEstimado": "alto",
      "acoesSugeridas": ["...", "...", "..."]
    }
  ]
}
`;

  try {
    // 6. Chamar LLM usando o helper do template
    const completion = await invokeLLM({
      messages: [
        {
          role: "system",
          content: "Você é um especialista em marketing e vendas data-driven.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      responseFormat: { type: "json_object" },
    });

    const resposta = completion.choices[0].message.content;
    if (!resposta || typeof resposta !== "string") {
      throw new Error("Resposta vazia da IA");
    }

    const resultado = JSON.parse(resposta);

    // 7. Salvar insights no banco
    const insightsSalvos = [];
    for (const insight of resultado.insights) {
      const id = await db.createInsightIA({
        empresaId,
        titulo: insight.titulo,
        descricao: insight.descricao,
        categoria: insight.categoria,
        impactoEstimado: insight.impactoEstimado,
        acoesSugeridas: insight.acoesSugeridas,
        dadosUtilizados: {
          fontes: fontes.map((f) => f.nome),
          baseConhecimento: !!baseConhec,
        },
      });

      insightsSalvos.push({
        id,
        ...insight,
      });
    }

    return {
      success: true,
      insights: insightsSalvos,
    };
  } catch (error) {
    console.error("Erro ao gerar insights:", error);
    throw new Error("Erro ao gerar insights com IA");
  }
}

