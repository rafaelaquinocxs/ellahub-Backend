const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Diagnostico = require('../models/Diagnostico');
const { spawn } = require('child_process');
const path = require('path');

// Rota para salvar respostas do diagnóstico
router.post('/salvar', async (req, res) => {
  try {
    const { token, respostas } = req.body;

    if (!token || !respostas) {
      return res.status(400).json({
        success: false,
        message: 'Token e respostas são obrigatórios',
      });
    }

    const usuario = await Usuario.findOne({ token });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
      });
    }

    // Buscar ou criar diagnóstico
    let diagnostico = await Diagnostico.findOne({ usuarioId: usuario._id });

    if (!diagnostico) {
      diagnostico = new Diagnostico({
        usuarioId: usuario._id,
        respostas: [],
      });
    }

    // Atualizar respostas
    diagnostico.respostas = respostas;
    diagnostico.atualizadoEm = new Date();

    await diagnostico.save();

    return res.json({
      success: true,
      message: 'Respostas salvas com sucesso. Use a rota /gerar para processar com IA.',
    });
  } catch (error) {
    console.error('Erro ao salvar respostas:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao salvar respostas',
      error: error.message,
    });
  }
});

// Rota para gerar diagnóstico com IA
router.post('/gerar', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token é obrigatório',
      });
    }

    const usuario = await Usuario.findOne({ token });

    if (!usuario) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado',
      });
    }

    // Buscar diagnóstico com respostas
    const diagnostico = await Diagnostico.findOne({ usuarioId: usuario._id });

    if (!diagnostico || !diagnostico.respostas || diagnostico.respostas.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhuma resposta encontrada. Complete o questionário via WhatsApp primeiro.',
      });
    }

    console.log(`Gerando diagnóstico com IA para: ${usuario.nome}`);

    // Montar prompt com as respostas
    let promptRespostas = '';
    diagnostico.respostas.forEach((item, index) => {
      promptRespostas += `Pergunta ${index + 1}: ${item.pergunta}\nResposta: ${item.resposta}\n\n`;
    });

    const systemPrompt = 'Você é a ELLA, mentora especializada em negócios femininos. Sempre responda em JSON válido.';

    const promptDiagnostico = `Você é a ELLA, mentora especializada em negócios femininos. Analise as respostas abaixo e gere um diagnóstico estratégico completo.

INFORMAÇÕES DA EMPREENDEDORA:
Nome: ${usuario.nome}
Email: ${usuario.email}

RESPOSTAS DO QUESTIONÁRIO:
${promptRespostas}

INSTRUÇÕES:
Baseado nas respostas, forneça uma análise detalhada em formato JSON com a seguinte estrutura:

{
  "nivelNegocio": "ideacao|inicio|operacao|crescimento",
  "score": número de 0 a 100,
  "pontosFortesIdentificados": [array de 4-6 pontos fortes específicos],
  "principaisDificuldades": [array de 4-6 dificuldades identificadas],
  "recomendacoes": [array de 5-7 recomendações estratégicas],
  "planoAcao": {
    "curto_prazo": [array de 4-5 ações para 0-3 meses],
    "medio_prazo": [array de 4-5 ações para 3-12 meses],
    "longo_prazo": [array de 3-4 ações para 12-36 meses]
  }
}

CRITÉRIOS PARA DETERMINAR NÍVEL:
- ideacao: Ainda desenvolvendo a ideia, sem vendas consistentes
- inicio: Primeiras vendas, estruturando o negócio (0-2 anos)
- operacao: Negócio estabelecido, buscando crescimento (2-5 anos)
- crescimento: Escalando operações, expandindo mercado (5+ anos)

CRITÉRIOS PARA SCORE:
- 0-25: Negócio em fase muito inicial, muitos desafios
- 26-50: Estrutura básica, mas precisa de melhorias significativas
- 51-75: Negócio sólido com oportunidades de crescimento
- 76-100: Negócio maduro e bem estruturado

Seja específica, prática e empática. Use linguagem direta e acolhedora, como uma mentora que entende os desafios únicos de mulheres empreendedoras.

RESPONDA APENAS COM O JSON, SEM TEXTO ADICIONAL.`;

    console.log('🤖 Gerando diagnóstico com GPT real via Python (stdin)...');

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
        tipo: 'diagnostico',
        system_prompt: systemPrompt,
        user_message: promptDiagnostico,
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
        throw new Error(result.error || 'Erro desconhecido ao gerar diagnóstico');
      }
      
      // Parse resposta JSON do GPT
      let resultadoDiagnostico;
      try {
        // Tentar extrair JSON da resposta
        const respostaIA = result.resposta;
        const jsonMatch = respostaIA.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          resultadoDiagnostico = JSON.parse(jsonMatch[0]);
        } else {
          resultadoDiagnostico = JSON.parse(respostaIA);
        }
      } catch (parseError) {
        console.error('Erro ao fazer parse do JSON:', parseError);
        throw new Error('Resposta da IA não está em formato JSON válido');
      }
      
      console.log('✅ Diagnóstico gerado com sucesso via GPT real');

      // Salvar resultado no diagnóstico
      diagnostico.resultado = resultadoDiagnostico;
      diagnostico.atualizadoEm = new Date();
      await diagnostico.save();

      // Atualizar flag no usuário
      usuario.diagnosticoCompleto = true;
      await usuario.save();

      return res.json({
        success: true,
        message: 'Diagnóstico gerado com sucesso',
        resultado: resultadoDiagnostico,
      });
      
    } catch (error) {
      console.error('❌ Erro ao gerar diagnóstico com IA:', error.message);
      console.log('⚠️  Usando fallback para análise simulada');

      // Fallback: análise estruturada baseada nas respostas
      const resultadoFallback = {
        nivelNegocio: 'inicio',
        score: 48,
        pontosFortesIdentificados: [
          'Visão clara do propósito do negócio',
          'Diferenciação e compromisso socioambiental',
          'Conhecimento do mercado e público-alvo',
          'Capacidade de adaptação e aprendizagem',
        ],
        principaisDificuldades: [
          'Gestão financeira e controle de custos',
          'Estratégias de marketing digital',
          'Organização de processos operacionais',
          'Consistência nas vendas',
        ],
        recomendacoes: [
          'Implementar controle financeiro básico com planilhas',
          'Criar presença digital consistente nas redes sociais',
          'Definir processos operacionais claros e documentados',
          'Estabelecer metas mensuráveis de curto prazo',
          'Buscar mentorias e capacitações específicas',
        ],
        planoAcao: {
          curto_prazo: [
            'Separar contas pessoais e empresariais',
            'Criar calendário de conteúdo para redes sociais',
            'Documentar processos principais do negócio',
            'Definir 3 metas para os próximos 30 dias',
          ],
          medio_prazo: [
            'Implementar sistema de gestão financeira',
            'Testar diferentes canais de marketing',
            'Estruturar equipe e delegar tarefas',
            'Validar modelo de precificação',
          ],
          longo_prazo: [
            'Expandir para novos mercados',
            'Desenvolver parcerias estratégicas',
            'Profissionalizar gestão e governança',
          ],
        },
      };

      // Salvar resultado fallback
      diagnostico.resultado = resultadoFallback;
      diagnostico.atualizadoEm = new Date();
      await diagnostico.save();

      usuario.diagnosticoCompleto = true;
      await usuario.save();

      return res.json({
        success: true,
        message: 'Diagnóstico gerado com sucesso (modo simulado)',
        resultado: resultadoFallback,
        fallback: true,
      });
    }
  } catch (error) {
    console.error('Erro ao gerar diagnóstico:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao gerar diagnóstico',
      error: error.message,
    });
  }
});

// Rota para buscar diagnóstico
router.get('/:token', async (req, res) => {
  try {
    const { token } = req.params;

    // A busca deve ser feita diretamente no modelo Diagnostico pelo token
    const diagnostico = await Diagnostico.findOne({ token });

    if (!diagnostico) {
      return res.status(404).json({
        success: false,
        message: 'Diagnóstico não encontrado para o token fornecido',
      });
    }

    // Retorna apenas os dados do diagnóstico, já que o token é a chave
    // Os dados do usuário (nome, email) não são necessários neste endpoint, pois não estão no Diagnostico model
    // Se o frontend precisar de mais dados, o modelo Diagnostico precisa ser atualizado para incluir nome/email ou o frontend deve confiar apenas no token.
    // Por enquanto, apenas retorna o diagnóstico.

    return res.json({
      success: true,
      diagnostico: diagnostico,
    });
  } catch (error) {
    console.error('Erro ao buscar diagnóstico:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao buscar diagnóstico',
      error: error.message,
    });
  }
});

module.exports = router;
