const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Diagnostico = require('../models/Diagnostico');

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

    // Se achou, devolve os dados do diagnóstico
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

// Criar usuário de teste (para desenvolvimento)
router.post('/criar-usuario-teste', async (req, res) => {
  try {
    const { nome, email, telefone } = req.body;

    // Gerar token único
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const usuario = new Usuario({
      nome: nome || 'Usuária Teste',
      email: email || 'teste@ellahub.com',
      telefone: telefone || '(11) 99999-9999',
      token
    });

    await usuario.save();

    res.json({
      success: true,
      message: 'Usuário de teste criado com sucesso',
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
        token: usuario.token
      }
    });

  } catch (error) {
    console.error('Erro ao criar usuário teste:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;
