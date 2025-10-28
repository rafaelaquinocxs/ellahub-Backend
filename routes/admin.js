const express = require('express');
const router = express.Router();
const Usuario = require('../models/Usuario');
const Diagnostico = require('../models/Diagnostico');
const Chat = require('../models/Chat');

// Middleware simples de autenticação admin
const authAdmin = (req, res, next) => {
  const { senha } = req.headers;
  
  if (senha !== 'admin123') {
    return res.status(401).json({ 
      success: false, 
      message: 'Acesso negado' 
    });
  }
  
  next();
};

// Dashboard administrativo
router.get('/dashboard', authAdmin, async (req, res) => {
  try {
    // Total de usuárias
    const totalUsuarias = await Usuario.countDocuments();

    // Usuárias por nível de negócio
    const usuariasPorNivel = await Usuario.aggregate([
      {
        $group: {
          _id: '$nivelNegocio',
          count: { $sum: 1 }
        }
      }
    ]);

    // Diagnósticos completados
    const diagnosticosCompletos = await Usuario.countDocuments({ diagnosticoCompleto: true });

    // Dores mais citadas (simulação baseada nos diagnósticos)
    const doresMaisCitadas = await Diagnostico.aggregate([
      { $unwind: '$resultado.principaisDificuldades' },
      {
        $group: {
          _id: '$resultado.principaisDificuldades',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Atividade recente (últimos 30 dias)
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - 30);

    const usuariasRecentes = await Usuario.countDocuments({
      criadoEm: { $gte: dataLimite }
    });

    const conversasRecentes = await Chat.aggregate([
      { $unwind: '$conversas' },
      {
        $match: {
          'conversas.timestamp': { $gte: dataLimite }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      dados: {
        totalUsuarias,
        diagnosticosCompletos,
        usuariasRecentes,
        conversasRecentes: conversasRecentes[0]?.total || 0,
        usuariasPorNivel: usuariasPorNivel.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        doresMaisCitadas: doresMaisCitadas.map(item => ({
          dor: item._id,
          count: item.count
        }))
      }
    });

  } catch (error) {
    console.error('Erro no dashboard admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Listar todas as usuárias
router.get('/usuarios', authAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find()
      .select('-__v')
      .sort({ criadoEm: -1 });

    res.json({
      success: true,
      usuarios
    });

  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Exportar dados em CSV
router.get('/exportar-csv', authAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.find().populate({
      path: 'diagnosticos',
      model: 'Diagnostico'
    });

    // Gerar CSV simples
    let csv = 'Nome,Email,Telefone,Token,Nivel Negocio,Diagnostico Completo,Data Criacao\n';
    
    usuarios.forEach(usuario => {
      csv += `"${usuario.nome}","${usuario.email}","${usuario.telefone}","${usuario.token}","${usuario.nivelNegocio}","${usuario.diagnosticoCompleto}","${usuario.criadoEm}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=usuarios-ella-hub.csv');
    res.send(csv);

  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;

