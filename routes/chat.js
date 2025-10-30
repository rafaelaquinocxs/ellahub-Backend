const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Chat = require('../models/Chat');
const Diagnostico = require('../models/Diagnostico');
const { spawn } = require('child_process');
const path = require('path');

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

    // Converter diagnóstico para objeto
    const diagnosticoObj = diagnostico.toObject();
    
    // Construir contexto para a IA
    let contexto = '';
    if (diagnosticoObj) {
      const nivelNegocio = diagnosticoObj.fase_diagnosticada || 'não informado';
      const pontosFortesIdentificados = diagnosticoObj.principais_forcas || [];
      const principaisDificuldades = diagnosticoObj.principais_riscos_ou_lacunas || [];
      
      contexto = `
CONTEXTO DO DIAGNÓSTICO DA EMPREENDEDORA:
- Nível do Negócio: ${nivelNegocio}
- Pontos Fortes: ${pontosFortesIdentificados.join(', ')}
- Principais Dificuldades: ${principaisDificuldades.join(', ')}
`;
    }

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

    console.log('🤖 Gerando resposta com GPT real via Python...');

    try {
      // Caminho do script Python
      const scriptPath = path.join(__dirname, '..', 'openai_service_stdin.py');
      
      // Detectar comando Python
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3.11';
      
      // Pegar API key do .env
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY não está configurada no arquivo .env');
      }
      
      // Preparar dados para enviar via stdin (INCLUINDO API KEY)
      const inputData = JSON.stringify({
        tipo: 'chat',
        system_prompt: systemPrompt,
        user_message: pergunta,
        api_key: apiKey
      });
      
      // Spawn processo Python
      const pythonProcess = spawn(pythonCommand, [scriptPath]);
      
      let stdout = '';
      let stderr = '';
      
      // Capturar stdout
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      // Capturar stderr
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Enviar dados via stdin
      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();
      
      // Aguardar conclusão
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          } else {
            resolve();
          }
        });
      });
      
      // Parse resultado
      const result = JSON.parse(stdout);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido ao gerar resposta');
      }
      
      const resposta = result.resposta;
      
      console.log('✅ Resposta gerada com sucesso via GPT real');

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
      });
      
    } catch (error) {
      console.error('❌ Erro ao gerar resposta com IA:', error.message);
      console.log('⚠️  Usando fallback para resposta simulada');

      // Fallback: resposta simulada
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
    }
  } catch (error) {
    console.error('Erro no chat:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao processar pergunta',
      error: error.message,
    });
  }
});

// Rota antiga mantida para compatibilidade
router.post('/perguntar', async (req, res) => {
  try {
    const { token, pergunta } = req.body;

    if (!token || !pergunta) {
      return res.status(400).json({
        success: false,
        message: 'Token e pergunta são obrigatórios',
      });
    }

    const usuario = await Usuario.findOne({ token });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
      });
    }

    // Buscar diagnóstico para contexto
    const diagnostico = await Diagnostico.findOne({ usuarioId: usuario._id });

    // Buscar histórico de chat
    let chat = await Chat.findOne({ usuarioId: usuario._id });

    if (!chat) {
      chat = new Chat({
        usuarioId: usuario._id,
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
    let contexto = '';
    if (diagnostico && diagnostico.resultado) {
      contexto = `
CONTEXTO DO DIAGNÓSTICO DA EMPREENDEDORA:
- Nível do Negócio: ${diagnostico.resultado.nivelNegocio}
- Score de Maturidade: ${diagnostico.resultado.score}/100
- Pontos Fortes: ${diagnostico.resultado.pontosFortesIdentificados?.join(', ')}
- Principais Dificuldades: ${diagnostico.resultado.principaisDificuldades?.join(', ')}
`;
    }

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
Nome: ${usuario.nome}
Nível do Negócio: ${usuario.nivelNegocio}
${contexto}

Seja específica, prática e empática. Use exemplos concretos e sempre ofereça pelo menos uma ação imediata que a empreendedora possa fazer.`;

    console.log('🤖 Gerando resposta com GPT real via Python...');

    try {
      // Caminho do script Python
      const scriptPath = path.join(__dirname, '..', 'openai_service_stdin.py');
      
      // Detectar comando Python
      const pythonCommand = process.platform === 'win32' ? 'python' : 'python3.11';
      
      // Pegar API key do .env
      const apiKey = process.env.OPENAI_API_KEY;
      
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY não está configurada no arquivo .env');
      }
      
      // Preparar dados para enviar via stdin (INCLUINDO API KEY)
      const inputData = JSON.stringify({
        tipo: 'chat',
        system_prompt: systemPrompt,
        user_message: pergunta,
        api_key: apiKey  // ← PASSA A API KEY AQUI
      });
      
      // Spawn processo Python
      const pythonProcess = spawn(pythonCommand, [scriptPath]);
      
      let stdout = '';
      let stderr = '';
      
      // Capturar stdout
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      // Capturar stderr
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      // Enviar dados via stdin
      pythonProcess.stdin.write(inputData);
      pythonProcess.stdin.end();
      
      // Aguardar conclusão
      await new Promise((resolve, reject) => {
        pythonProcess.on('close', (code) => {
          if (code !== 0) {
            reject(new Error(`Python process exited with code ${code}: ${stderr}`));
          } else {
            resolve();
          }
        });
      });
      
      // Parse resultado
      const result = JSON.parse(stdout);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido ao gerar resposta');
      }
      
      const resposta = result.resposta;
      
      console.log('✅ Resposta gerada com sucesso via GPT real');

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
      });
      
    } catch (error) {
      console.error('❌ Erro ao gerar resposta com IA:', error.message);
      console.log('⚠️  Usando fallback para resposta simulada');

      // Fallback: resposta simulada
      const respostaFallback = `${usuario.nome}, olha só: vou te dar uma resposta direta e prática sobre "${pergunta}".

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
    }
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

    const usuario = await Usuario.findOne({ token });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
      });
    }

    const chat = await Chat.findOne({ usuarioId: usuario._id });

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
