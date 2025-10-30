const express = require('express');
const router = express.Router();
const Diagnostico = require('../models/Diagnostico');
const Usuario = require('../models/Usuario');

// Login por token
router.post('/login', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Token é obrigatório' 
      });
    }

    // Normalizar o token (remover hífens para buscar)
    const tokenNormalizado = token.replace(/-/g, '');
    
    // Buscar diagnóstico pelo token (aceita com ou sem hífens)
    // Primeiro tenta buscar exatamente como foi fornecido
    let diagnostico = await Diagnostico.findOne({ token });
    
    // Se não encontrar, cria uma regex que ignora hífens
    if (!diagnostico && tokenNormalizado) {
      // Cria um padrão que aceita hífens opcionais entre cada caractere
      // Ex: 9129fc14135043dcad285cae90f83f32 -> 9129fc14-?1350-?43dc-?...
      const regexPattern = tokenNormalizado.split('').join('-?');
      diagnostico = await Diagnostico.findOne({ 
        token: { $regex: new RegExp(`^${regexPattern}$`, 'i') } 
      });
    }

    if (!diagnostico) {
      return res.status(404).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }

    // Buscar a usuária pelo whatsapp do diagnóstico
    console.log('🔍 Buscando usuária com whatsapp:', diagnostico.whatsapp);
    const usuaria = await Usuario.findOne({ whatsapp: diagnostico.whatsapp });
    console.log('👤 Usuária encontrada:', usuaria ? usuaria.nome : 'NÃO ENCONTRADA');
    
    // Retornar os dados na mesma estrutura que /diagnostico/:token
    // Converter para objeto JavaScript puro para garantir acesso aos campos
    const diagnosticoObj = diagnostico.toObject();
    
    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      usuario: {
        id: diagnosticoObj._id,
        nome: usuaria ? usuaria.nome : `Usuário ${diagnosticoObj.whatsapp || 'Não informado'}`,
        email: `${diagnosticoObj.whatsapp || 'naoinformado'}@whatsapp.com`,
        diagnosticoCompleto: true,
        nivelNegocio: diagnosticoObj.fase_diagnosticada || 'Não definido',
      },
      diagnostico: diagnosticoObj
    });

  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Criar diagnóstico de teste (para desenvolvimento)
router.post('/criar-usuario-teste', async (req, res) => {
  try {
    const { whatsapp } = req.body;

    // Gerar token único
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const diagnostico = new Diagnostico({
      whatsapp: whatsapp || '5599999999999',
      token,
      fase_diagnosticada: 'teste',
      resumo_diagnostico: 'Diagnóstico gerado para testes',
      principais_forcas: ['Teste força'],
      principais_riscos_ou_lacunas: ['Teste risco'],
      recomendacoes: ['Teste recomendação'],
      created_at: new Date()
    });

    await diagnostico.save();

    res.json({
      success: true,
      message: 'Diagnóstico de teste criado com sucesso',
      diagnostico
    });

  } catch (error) {
    console.error('Erro ao criar diagnóstico teste:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;
