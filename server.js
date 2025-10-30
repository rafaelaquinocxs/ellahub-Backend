const express = require('express');
const mongoose = require('mongoose');
// Importar modelos para garantir que o Mongoose os registre
require('./models/Lead');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/diagnostico', require('./routes/diagnostico'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/lead', require('./routes/lead'));

// Rota de teste
app.get('/', (req, res) => {
  res.json({ message: 'Ella Hub API está funcionando!' });
});

// Conexão com MongoDB
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Atlas conectado!");
  } catch (err) {
    console.error("Erro ao conectar com MongoDB:", err);
    process.exit(1);
  }
}

// Inicializar servidor
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
  });
});

module.exports = app;
