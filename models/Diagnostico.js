const mongoose = require('mongoose');

const diagnosticoSchema = new mongoose.Schema({
  // Campos principais do n8n
  token: {
    type: String,
    required: false
  },
  whatsapp: {
    type: String,
    required: false
  },
  fase_diagnosticada: {
    type: String,
    required: false
  },
  resumo_diagnostico: {
    type: String,
    required: false
  },
  principais_forcas: {
    type: [String],
    required: false
  },
  principais_riscos_ou_lacunas: {
    type: [String],
    required: false
  },
  recomendacoes: {
    type: [String],
    required: false
  },
  created_at: {
    type: String,
    required: false
  },
  
  // Campos do sistema antigo (manter compatibilidade)
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: false
  },
  respostas: [{
    pergunta: String,
    resposta: String,
    perguntaNumero: Number
  }],
  resultado: {
    nivelNegocio: {
      type: String,
      enum: ['ideacao', 'inicio', 'operacao', 'crescimento', 'crescimento_escala']
    },
    pontosFortesIdentificados: [String],
    principaisDificuldades: [String],
    recomendacoes: [String],
    planoAcao: {
      curto_prazo: [String],
      medio_prazo: [String],
      longo_prazo: [String]
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    }
  },
  criadoEm: {
    type: Date,
    default: Date.now
  },
  atualizadoEm: {
    type: Date,
    default: Date.now
  }
}, {
  strict: false, // Permite campos não definidos no schema
  collection: 'diagnosticos' // Nome explícito da coleção
});

module.exports = mongoose.model('Diagnostico', diagnosticoSchema);
