// Script para testar conexão MongoDB e listar usuários
// Execute: node testar_mongodb.js

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://rafa:Maluzinha1611@cluster0.1map4yz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

console.log('🔍 Testando conexão com MongoDB...\n');
console.log('URI:', MONGODB_URI.replace(/:[^:@]+@/, ':****@')); // Oculta senha

async function testar() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB com sucesso!\n');

    // Definir schema do usuário
    const usuarioSchema = new mongoose.Schema({
      nome: String,
      email: String,
      token: String,
      nivelNegocio: String,
      diagnosticoCompleto: Boolean,
    }, { collection: 'usuarios' });

    const Usuario = mongoose.model('Usuario', usuarioSchema);

    // Listar todos os usuários
    const usuarios = await Usuario.find();

    console.log('=' .repeat(70));
    console.log('USUÁRIOS ENCONTRADOS NO BANCO');
    console.log('='.repeat(70));

    if (usuarios.length === 0) {
      console.log('\n❌ NENHUM USUÁRIO ENCONTRADO!');
      console.log('\nPossíveis causas:');
      console.log('1. URI do MongoDB está apontando para banco vazio');
      console.log('2. Nome da coleção está diferente');
      console.log('3. Banco de dados está vazio');
    } else {
      usuarios.forEach((usuario, index) => {
        console.log(`\n${index + 1}. ${usuario.nome}`);
        console.log(`   Token: ${usuario.token}`);
        console.log(`   Email: ${usuario.email}`);
        console.log(`   Nível: ${usuario.nivelNegocio}`);
        console.log(`   Diagnóstico Completo: ${usuario.diagnosticoCompleto}`);
      });

      console.log('\n' + '='.repeat(70));
      console.log(`Total: ${usuarios.length} usuário(s)`);
      console.log('='.repeat(70));

      // Testar busca por token específico
      console.log('\n🔍 Testando busca por token...\n');
      const tokenTeste = usuarios[0].token;
      console.log(`Buscando usuário com token: ${tokenTeste}`);
      
      const usuarioEncontrado = await Usuario.findOne({ token: tokenTeste });
      
      if (usuarioEncontrado) {
        console.log('✅ Usuário encontrado com sucesso!');
        console.log(`   Nome: ${usuarioEncontrado.nome}`);
      } else {
        console.log('❌ Usuário NÃO encontrado!');
      }
    }

    // Verificar nome do banco
    console.log('\n📊 Informações da Conexão:\n');
    console.log(`Banco de dados: ${mongoose.connection.db.databaseName}`);
    console.log(`Host: ${mongoose.connection.host}`);
    console.log(`Status: ${mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado'}`);

    // Listar coleções
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Coleções disponíveis:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });

    console.log('\n✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro ao testar MongoDB:');
    console.error(error.message);
    console.error('\nVerifique:');
    console.error('1. A URI do MongoDB no arquivo .env está correta');
    console.error('2. Você tem acesso à internet');
    console.error('3. As credenciais do MongoDB estão válidas');
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

testar();
