const express = require('express');
const router = express.Router();
const Diagnostico = require('../models/Diagnostico'); // Assumindo que você tem um modelo Diagnostico

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

    // Buscar diagnóstico pelo token
    const diagnostico = await Diagnostico.findOne({ token });

    if (!diagnostico) {
      return res.status(404).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }

    // Retornar os dados
    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      diagnostico: {
        id: diagnostico._id,
        whatsapp: diagnostico.whatsapp,
        token: diagnostico.token,
        fase_diagnosticada: diagnostico.fase_diagnosticada,
        resumo_diagnostico: diagnostico.resumo_diagnostico,
        principais_forcas: diagnostico.principais_forcas,
        principais_riscos_ou_lacunas: diagnostico.principais_riscos_ou_lacunas,
        recomendacoes: diagnostico.recomendacoes,
        created_at: diagnostico.created_at
      }
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
