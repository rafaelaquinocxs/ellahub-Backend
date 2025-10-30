const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true
  },
  whatsapp: {
    type: String,
    required: false
  },
  mensagens: [{
    tipo: {
      type: String,
      enum: ['usuario', 'ella'],
      required: true
    },
    conteudo: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  criadoEm: {
    type: Date,
    default: Date.now
  },
  atualizadoEm: {
    type: Date,
    default: Date.now
  }
}, {
  collection: 'chats',
  strict: false
});

module.exports = mongoose.model('Chat', chatSchema);
