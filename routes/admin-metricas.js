const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Lead = require('../models/Lead');
const Diagnostico = require('../models/Diagnostico');
const Chat = require('../models/Chat');

// Middleware de autenticação JWT para admin
const authAdminJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token não fornecido' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'seu_secret_key');
    
    // Verificar se é admin
    if (decoded.role !== 'admin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado. Apenas administradores.' 
      });
    }
    
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ 
      success: false, 
      message: 'Token inválido' 
    });
  }
};

// Login do admin (gerar token JWT)
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;
    
    // Credenciais hardcoded para admin (você pode mudar para banco de dados)
    const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ellahub.com';
    const ADMIN_SENHA = process.env.ADMIN_SENHA || 'admin123';
    
    if (email !== ADMIN_EMAIL || senha !== ADMIN_SENHA) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }
    
    const token = jwt.sign(
      { email, role: 'admin' },
      process.env.JWT_SECRET || 'seu_secret_key',
      { expiresIn: '24h' }
    );
    
    res.json({
      success: true,
      token,
      admin: { email }
    });
  } catch (error) {
    console.error('Erro no login admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao fazer login' 
    });
  }
});

// Dashboard com métricas gerais
router.get('/dashboard', authAdminJWT, async (req, res) => {
  try {
    // Total de leads capturados
    const totalLeads = await Lead.countDocuments();
    
    // Total de diagnósticos completados
    const totalDiagnosticos = await Diagnostico.countDocuments({ 
      $or: [
        { 'resultado.nivelNegocio': { $exists: true } },
        { 'resumo_diagnostico': { $exists: true, $ne: null } }
      ]
    });
    
    // Taxa de conversão
    const taxaConversao = totalLeads > 0 ? ((totalDiagnosticos / totalLeads) * 100).toFixed(2) : 0;
    
    // Leads nos últimos 7 dias
    const dataLimite7dias = new Date();
    dataLimite7dias.setDate(dataLimite7dias.getDate() - 7);
    const leadsUltimos7dias = await Lead.countDocuments({ dataCaptura: { $gte: dataLimite7dias } });
    
    // Diagnósticos nos últimos 7 dias
    const diagnosticosUltimos7dias = await Diagnostico.countDocuments({ 
      criadoEm: { $gte: dataLimite7dias },
      $or: [
        { 'resultado.nivelNegocio': { $exists: true } },
        { 'resumo_diagnostico': { $exists: true, $ne: null } }
      ]
    });
    
    // Distribuição por nível de negócio
    const distribuicaoNivel = await Diagnostico.aggregate([
      { $match: { $or: [ { 'resultado.nivelNegocio': { $exists: true } }, { 'resumo_diagnostico': { $exists: true, $ne: null } } ] } },
      {
        $group: {
          _id: '$resultado.nivelNegocio',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Top 10 dificuldades mais citadas
    const dificuldadesMaisCitadas = await Diagnostico.aggregate([
      { $match: { $or: [ { 'resultado.principaisDificuldades': { $exists: true } }, { 'principais_riscos_ou_lacunas': { $exists: true } } ] } },
      { $unwind: '$resultado.principaisDificuldades' },
      {
        $group: {
          _id: '$resultado.principaisDificuldades',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Top 10 pontos fortes mais citados
    const pontosForteMaisCitados = await Diagnostico.aggregate([
      { $match: { $or: [ { 'resultado.pontosFortosIdentificados': { $exists: true } }, { 'principais_forcas': { $exists: true } } ] } },},{find:
      { $unwind: '$resultado.pontosFortesIdentificados' },
      {
        $group: {
          _id: '$resultado.pontosFortesIdentificados',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    
    // Score médio dos diagnósticos
    const scoreStats = await Diagnostico.aggregate([
      { $match: { 'resultado.score': { $exists: true } } },
      {
        $group: {
          _id: null,
          scoreMedia: { $avg: '$resultado.score' },
          scoreMin: { $min: '$resultado.score' },
          scoreMax: { $max: '$resultado.score' }
        }
      }
    ]);
    
    res.json({
      success: true,
      metricas: {
        resumo: {
          totalLeads,
          totalDiagnosticos,
          taxaConversao: `${taxaConversao}%`,
          leadsUltimos7dias,
          diagnosticosUltimos7dias
        },
        distribuicaoNivel: distribuicaoNivel.map(item => ({
          nivel: item._id,
          quantidade: item.count,
          percentual: ((item.count / totalDiagnosticos) * 100).toFixed(2) + '%'
        })),
        dificuldadesMaisCitadas: dificuldadesMaisCitadas.map(item => ({
          dificuldade: item._id,
          frequencia: item.count,
          percentual: ((item.count / totalDiagnosticos) * 100).toFixed(2) + '%'
        })),
        pontosForteMaisCitados: pontosForteMaisCitados.map(item => ({
          ponto: item._id,
          frequencia: item.count,
          percentual: ((item.count / totalDiagnosticos) * 100).toFixed(2) + '%'
        })),
        scores: scoreStats[0] || { scoreMedia: 0, scoreMin: 0, scoreMax: 0 }
      }
    });
  } catch (error) {
    console.error('Erro no dashboard admin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao carregar dashboard',
      erro: error.message
    });
  }
});

// Listar todos os leads com filtros
router.get('/leads', authAdminJWT, async (req, res) => {
  try {
    const { pagina = 1, limite = 20, busca } = req.query;
    const skip = (pagina - 1) * limite;
    
    let filtro = {};
    if (busca) {
      filtro = {
        $or: [
          { nome: { $regex: busca, $options: 'i' } },
          { email: { $regex: busca, $options: 'i' } },
          { whatsapp: { $regex: busca, $options: 'i' } }
        ]
      };
    }
    
    const leads = await Lead.find(filtro)
      .sort({ dataCaptura: -1 })
      .skip(skip)
      .limit(parseInt(limite));
    
    const totalLeads = await Lead.countDocuments(filtro);
    
    res.json({
      success: true,
      leads,
      paginacao: {
        total: totalLeads,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(totalLeads / limite)
      }
    });
  } catch (error) {
    console.error('Erro ao listar leads:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar leads' 
    });
  }
});

// Listar todos os diagnósticos com filtros
router.get('/diagnosticos', authAdminJWT, async (req, res) => {
  try {
    const { pagina = 1, limite = 20, nivel, busca } = req.query;
    const skip = (pagina - 1) * limite;
    
    let filtro = { 'resultado.nivelNegocio': { $exists: true } };
    
    if (nivel) {
      filtro['resultado.nivelNegocio'] = nivel;
    }
    
    if (busca) {
      filtro.$or = [
        { 'resultado.resumoDiagnostico': { $regex: busca, $options: 'i' } },
        { whatsapp: { $regex: busca, $options: 'i' } }
      ];
    }
    
    const diagnosticos = await Diagnostico.find(filtro)
      .sort({ criadoEm: -1 })
      .skip(skip)
      .limit(parseInt(limite))
      .select('token whatsapp resultado.nivelNegocio resultado.score criadoEm');
    
    const totalDiagnosticos = await Diagnostico.countDocuments(filtro);
    
    res.json({
      success: true,
      diagnosticos,
      paginacao: {
        total: totalDiagnosticos,
        pagina: parseInt(pagina),
        limite: parseInt(limite),
        totalPaginas: Math.ceil(totalDiagnosticos / limite)
      }
    });
  } catch (error) {
    console.error('Erro ao listar diagnósticos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao listar diagnósticos' 
    });
  }
});

// Detalhes de um diagnóstico específico
router.get('/diagnosticos/:id', authAdminJWT, async (req, res) => {
  try {
    const diagnostico = await Diagnostico.findById(req.params.id);
    
    if (!diagnostico) {
      return res.status(404).json({ 
        success: false, 
        message: 'Diagnóstico não encontrado' 
      });
    }
    
    res.json({
      success: true,
      diagnostico
    });
  } catch (error) {
    console.error('Erro ao buscar diagnóstico:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar diagnóstico' 
    });
  }
});

// Estatísticas por período
router.get('/estatisticas/periodo', authAdminJWT, async (req, res) => {
  try {
    const { dataInicio, dataFim } = req.query;
    
    let filtro = {};
    if (dataInicio && dataFim) {
      filtro.dataCaptura = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }
    
    const leadsNoPeriodo = await Lead.countDocuments(filtro);
    
    const diagnosticosFiltro = { ...filtro, $or: [ { 'resultado.nivelNegocio': { $exists: true } }, { 'resumo_diagnostico': { $exists: true, $ne: null } } ] };
    diagnosticosFiltro.criadoEm = filtro.dataCaptura;
    delete diagnosticosFiltro.dataCaptura;
    
    const diagnosticosNoPeriodo = await Diagnostico.countDocuments(diagnosticosFiltro);
    
    res.json({
      success: true,
      periodo: {
        dataInicio,
        dataFim,
        leadsCapturados: leadsNoPeriodo,
        diagnosticosCompletos: diagnosticosNoPeriodo,
        taxaConversao: leadsNoPeriodo > 0 ? ((diagnosticosNoPeriodo / leadsNoPeriodo) * 100).toFixed(2) + '%' : '0%'
      }
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar estatísticas' 
    });
  }
});

// Exportar dados em CSV
router.get('/exportar/csv', authAdminJWT, async (req, res) => {
  try {
    const leads = await Lead.find();
    const diagnosticos = await Diagnostico.find({ 'resultado.nivelNegocio': { $exists: true } });
    
    let csv = 'LEADS\n';
    csv += 'Nome,Email,WhatsApp,Data Captura\n';
    leads.forEach(lead => {
      csv += `"${lead.nome}","${lead.email}","${lead.whatsapp}","${lead.dataCaptura}"\n`;
    });
    
    csv += '\n\nDIAGNÓSTICOS\n';
    csv += 'WhatsApp,Nível,Score,Dificuldades,Pontos Fortes,Data\n';
    diagnosticos.forEach(diag => {
      const dificuldades = (diag.resultado?.principaisDificuldades || []).join('; ');
      const fortes = (diag.resultado?.pontosFortesIdentificados || []).join('; ');
      csv += `"${diag.whatsapp}","${diag.resultado?.nivelNegocio}","${diag.resultado?.score}","${dificuldades}","${fortes}","${diag.criadoEm}"\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=ellahub-dados.csv');
    res.send('\ufeff' + csv); // BOM para UTF-8
  } catch (error) {
    console.error('Erro ao exportar CSV:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao exportar dados' 
    });
  }
});

module.exports = router;
