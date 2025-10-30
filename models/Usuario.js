const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema({
  whatsapp: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nome: {
    type: String,
    required: false,
    trim: true
  },
  idade: {
    type: String,
    required: false
  },
  cidade: {
    type: String,
    required: false,
    trim: true
  },
  estado: {
    type: String,
    required: false,
    trim: true
  },
  estado_civil: {
    type: String,
    required: false
  },
  possui_filhos: {
    type: Boolean,
    required: false
  },
  qtd_filhos: {
    type: String,
    required: false
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

module.exports = mongoose.model('Usuario', usuarioSchema, 'usuarias');
