import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function generateInsights(profileData: {
  empresa: string;
  setor: string;
  receita: number;
  clientes: number;
  metas: string[];
  dados: Record<string, unknown>;
}) {
  const prompt = `Você é um especialista em análise de dados e estratégia empresarial. 
Analise o perfil da empresa e gere 5 insights acionáveis com alto potencial de impacto.

Empresa: ${profileData.empresa}
Setor: ${profileData.setor}
Receita: R$ ${profileData.receita.toLocaleString("pt-BR")}
Clientes: ${profileData.clientes}
Metas: ${profileData.metas.join(", ")}

Para cada insight, forneça em JSON: título, descrição, categoria, potencial, roi, confiança, passos, benchmark, kpi.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 4000,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Sem resposta da IA");
  
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
}

export async function generateFormulario(objetivo: string, setor: string) {
  const prompt = `Você é um especialista em design de formulários.
Gere um formulário inteligente para: ${objetivo} no setor ${setor}.
Retorne em JSON com: título, descrição, prioridade, perguntas (pergunta, tipo, obrigatória).`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 3000,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Sem resposta da IA");
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
}

export async function generatePesquisa(objetivo: string, setor: string) {
  const prompt = `Você é um especialista em design de pesquisas.
Gere uma pesquisa inteligente para: ${objetivo} no setor ${setor}.
Retorne em JSON com: título, tipo, prioridade, perguntas, tempo_estimado.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 3000,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Sem resposta da IA");
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
}

export async function generateAcao(insight: Record<string, unknown>, empresa: Record<string, unknown>) {
  const prompt = `Você é um especialista em estratégia.
Gere um plano de ação baseado neste insight: ${JSON.stringify(insight)}.
Contexto da empresa: ${JSON.stringify(empresa)}.
Retorne em JSON com: título, descrição, categoria, timeline, potencial, roi, passos.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 3000,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Sem resposta da IA");
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
}

export async function analyzeResponses(responses: Record<string, unknown>[], contexto: string) {
  const prompt = `Você é um especialista em análise de dados.
Analise estas respostas: ${JSON.stringify(responses)}.
Contexto: ${contexto}.
Retorne em JSON com: resumo, achados, clusters, sentimento, recomendações.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 3000,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Sem resposta da IA");
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
}

export async function explainInsight(insight: Record<string, unknown>, dados: Record<string, unknown>) {
  const prompt = `Você é um especialista em explicabilidade.
Explique por que este insight foi identificado: ${JSON.stringify(insight)}.
Dados: ${JSON.stringify(dados)}.
Retorne em JSON com: porque, padroes, confianca, limitacoes.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.5,
    max_tokens: 2000,
  });

  const content = response.choices[0].message.content;
  if (!content) throw new Error("Sem resposta da IA");
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
}
