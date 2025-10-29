const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  telefone: {
    type: String,
    required: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  diagnosticoCompleto: {
    type: Boolean,
    default: false
  },
  nivelNegocio: {
    type: String,
    enum: ['ideacao', 'inicio', 'operacao', 'crescimento'],
    default: 'ideacao'
  },
  criadoEm: {
    type: Date,
    default: Date.now
  },
  ultimoAcesso: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Usuario', usuarioSchema, 'usuarias');

