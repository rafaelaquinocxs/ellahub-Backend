const express = require('express');
const router = express.Router();
const Chat = require('../models/Chat');
const Diagnostico = require('../models/Diagnostico');

// Rota para enviar pergunta ao chat
router.post('/pergunta', async (req, res) => {
  try {
    const { token, pergunta } = req.body;

    if (!token || !pergunta) {
      return res.status(400).json({
        success: false,
        message: 'Token e pergunta são obrigatórios',
      });
    }

    // Normalizar token (aceitar com ou sem hífens)
    const tokenNormalizado = token.replace(/-/g, '');
    
    // Buscar diagnóstico pelo token
    let diagnostico = await Diagnostico.findOne({ token });
    
    if (!diagnostico && tokenNormalizado) {
      const regexPattern = tokenNormalizado.split('').join('-?');
      diagnostico = await Diagnostico.findOne({ 
        token: { $regex: new RegExp(`^${regexPattern}$`, 'i') } 
      });
    }

    if (!diagnostico) {
      return res.status(404).json({
        success: false,
        message: 'Diagnóstico não encontrado',
      });
    }

    // Buscar usuária pelo whatsapp do diagnóstico
    const usuariaDoc = await Diagnostico.db.collection('usuarias').findOne({ 
      whatsapp: diagnostico.whatsapp 
    });

    const nomeUsuaria = usuariaDoc ? usuariaDoc.nome : `Usuário ${diagnostico.whatsapp || 'Não informado'}`;

    // Buscar histórico de chat pelo token do diagnóstico
    let chat = await Chat.findOne({ token: diagnostico.token });

    if (!chat) {
      chat = new Chat({
        token: diagnostico.token,
        whatsapp: diagnostico.whatsapp,
        mensagens: [],
      });
    }

    // Adicionar pergunta ao histórico
    chat.mensagens.push({
      tipo: 'usuario',
      conteudo: pergunta,
      timestamp: new Date(),
    });

    // Construir contexto para a IA
    const diagnosticoObj = diagnostico.toObject();
    const nivelNegocio = diagnosticoObj.fase_diagnosticada || 'não informado';
    const pontosFortesIdentificados = diagnosticoObj.principais_forcas || [];
    const principaisDificuldades = diagnosticoObj.principais_riscos_ou_lacunas || [];
    
    const contexto = `
CONTEXTO DO DIAGNÓSTICO DA EMPREENDEDORA:
- Nível do Negócio: ${nivelNegocio}
- Pontos Fortes: ${pontosFortesIdentificados.join(', ')}
- Principais Dificuldades: ${principaisDificuldades.join(', ')}
`;

    const systemPrompt = `Você é a ELLA, mentora especializada em negócios femininos e empoderamento empreendedor.

PERSONALIDADE E TOM:
- Acolhedora, mas não "mãezinha" - escuta sem julgamento, mas não aceita desculpas
- Direta e próxima - fala como um bate-papo com a empreendedora
- Provocadora inteligente - faz perguntas que expõem contradições
- Estrategista prática - não fica só na teoria, cobra ações com prazos
- Encorajadora sem ilusões - mostra a realidade, mas aponta soluções

SUA MISSÃO:
Capacitar mulheres empreendedoras a transformarem suas ideias em negócios sustentáveis, lucrativos e alinhados com seus propósitos.

COMO VOCÊ AGE:
1. Faz perguntas cortantes mas acolhedoras para expor gaps reais
2. Entrega passos simples e imediatos (máximo 5 por sessão)
3. Identifica padrões de autossabotagem (perfeccionismo, medo de cobrar)
4. Usa linguagem simplificada, compreensível para quem não tem conhecimento em negócios
5. Traz visão estratégica e trabalha o lado emocional
6. Apresenta clareza sobre o próximo passo do negócio

FRASES CARACTERÍSTICAS:
- "Olha, eu não vou te enganar: negócio que não evolui, morre."
- "Tempo é prioridade. Você arruma tempo para Instagram, mas não para o que alavanca seu negócio?"
- "Seu maior risco agora é ficar esperando a ideia 'perfeita'."
- "Negócio profissional exige estrutura - mas não precisa ser perfeito. Basta ser FUNCIONAL."

INFORMAÇÕES DA EMPREENDEDORA:
Nome: ${nomeUsuaria}
${contexto}

Seja específica, prática e empática. Use exemplos concretos e sempre ofereça pelo menos uma ação imediata que a empreendedora possa fazer.`;

    // Tentar gerar resposta com GPT
    let resposta;
    let usouGPT = false;
    
    try {
      const { OpenAI } = require('openai');
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });
      
      const response = await client.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: pergunta }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });
      
      resposta = response.choices[0].message.content;
      usouGPT = true;
      console.log('✅ Resposta gerada com GPT');
      
    } catch (error) {
      console.error('❌ Erro ao gerar resposta com GPT:', error.message);
      console.log('⚠️  Usando fallback');
      
      // Fallback
      resposta = `${nomeUsuaria}, olha só: vou te dar uma resposta direta e prática sobre "${pergunta}".

Aqui estão 3 passos imediatos que você pode começar HOJE:

1. **Defina o objetivo claro**: O que exatamente você quer alcançar? Seja específica. "Aumentar vendas" não é objetivo, "vender 10 unidades esta semana" é.

2. **Identifique o primeiro passo**: Qual é a MENOR ação que você pode fazer agora? Não precisa ser perfeito, precisa ser feito.

3. **Marque na agenda**: Quando EXATAMENTE você vai fazer isso? Sem data, não acontece.

Olha, eu não vou te enganar: negócio que não evolui, morre. Mas você tem potencial - agora é hora de executar.

Me conta: qual desses 3 passos você vai fazer primeiro?`;
    }

    // Adicionar resposta ao histórico
    chat.mensagens.push({
      tipo: 'ella',
      conteudo: resposta,
      timestamp: new Date(),
    });

    await chat.save();

    return res.json({
      success: true,
      resposta,
      usouGPT
    });
    
  } catch (error) {
    console.error('Erro no chat:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar pergunta',
      error: error.message,
    });
  }
});

// Rota para buscar histórico do chat
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // Normalizar token
    const tokenNormalizado = token.replace(/-/g, '');
    
    let diagnostico = await Diagnostico.findOne({ token });
    
    if (!diagnostico && tokenNormalizado) {
      const regexPattern = tokenNormalizado.split('').join('-?');
      diagnostico = await Diagnostico.findOne({ 
        token: { $regex: new RegExp(`^${regexPattern}$`, 'i') } 
      });
    }

    if (!diagnostico) {
      return res.status(404).json({
        success: false,
        message: 'Diagnóstico não encontrado',
      });
    }

    const chat = await Chat.findOne({ token: diagnostico.token });

    return res.json({
      success: true,
      mensagens: chat ? chat.mensagens : [],
    });
  } catch (error) {
    console.error('Erro ao buscar chat:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar histórico',
      error: error.message,
    });
  }
});

module.exports = router;
