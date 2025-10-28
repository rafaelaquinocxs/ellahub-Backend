const mongoose = require('mongoose');

const diagnosticoSchema = new mongoose.Schema({
  usuarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true
  },
  respostas: [{
    pergunta: String,
    resposta: String,
    perguntaNumero: Number
  }],
  resultado: {
    nivelNegocio: {
      type: String,
      enum: ['ideacao', 'inicio', 'operacao', 'crescimento']
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
});

module.exports = mongoose.model('Diagnostico', diagnosticoSchema);

