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

    // Resposta simulada (fallback)
    const respostaFallback = `${nomeUsuaria}, olha só: vou te dar uma resposta direta e prática sobre "${pergunta}".

Aqui estão 3 passos imediatos que você pode começar HOJE:

1. **Defina o objetivo claro**: O que exatamente você quer alcançar? Seja específica. "Aumentar vendas" não é objetivo, "vender 10 unidades esta semana" é.

2. **Identifique o primeiro passo**: Qual é a MENOR ação que você pode fazer agora? Não precisa ser perfeito, precisa ser feito.

3. **Marque na agenda**: Quando EXATAMENTE você vai fazer isso? Sem data, não acontece.

Olha, eu não vou te enganar: negócio que não evolui, morre. Mas você tem potencial - agora é hora de executar.

Me conta: qual desses 3 passos você vai fazer primeiro?`;

    // Adicionar resposta ao histórico
    chat.mensagens.push({
      tipo: 'ella',
      conteudo: respostaFallback,
      timestamp: new Date(),
    });

    await chat.save();

    return res.json({
      success: true,
      resposta: respostaFallback,
      fallback: true,
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
