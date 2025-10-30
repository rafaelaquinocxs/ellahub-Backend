const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

// Rota para salvar um novo lead
router.post('/capturar', async (req, res) => {
  try {
    const { nome, email, whatsapp } = req.body;

    if (!nome || !email || !whatsapp) {
      return res.status(400).json({ 
        success: false, 
        message: 'Nome, email e whatsapp são obrigatórios.' 
      });
    }

    // Verifica se o lead já existe (pelo email)
    const leadExistente = await Lead.findOne({ email });
    if (leadExistente) {
      return res.status(200).json({ 
        success: true, 
        message: 'Lead já cadastrado. Redirecionando para o WhatsApp.' 
      });
    }

    const novoLead = new Lead({ nome, email, whatsapp });
    await novoLead.save();

    res.json({
      success: true,
      message: 'Lead capturado com sucesso. Redirecionando para o WhatsApp.'
    });

  } catch (error) {
    console.error('Erro ao capturar lead:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;
