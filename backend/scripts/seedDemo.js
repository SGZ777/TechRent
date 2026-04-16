require('dotenv').config();

const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function ensureUser({ nome, email, senha, nivel_acesso }) {
  const [existing] = await db.query('SELECT id FROM usuarios WHERE email = ?', [email]);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const senhaHash = await bcrypt.hash(senha, 10);
  const [result] = await db.query(
    'INSERT INTO usuarios (nome, email, senha, nivel_acesso) VALUES (?, ?, ?, ?)',
    [nome, email, senhaHash, nivel_acesso]
  );

  return result.insertId;
}

async function ensureEquipamento({ nome, categoria, patrimonio, status, descricao }) {
  const [existing] = await db.query('SELECT id FROM equipamentos WHERE patrimonio = ?', [patrimonio]);

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [result] = await db.query(
    `INSERT INTO equipamentos (nome, categoria, patrimonio, status, descricao)
     VALUES (?, ?, ?, ?, ?)`,
    [nome, categoria, patrimonio, status, descricao]
  );

  return result.insertId;
}

async function ensureChamado({
  titulo,
  descricao,
  cliente_id,
  equipamento_id,
  tecnico_id,
  prioridade,
  status,
}) {
  const [existing] = await db.query(
    'SELECT id FROM chamados WHERE titulo = ? AND equipamento_id = ?',
    [titulo, equipamento_id]
  );

  if (existing.length > 0) {
    return existing[0].id;
  }

  const [result] = await db.query(
    `INSERT INTO chamados (
      titulo,
      descricao,
      cliente_id,
      equipamento_id,
      tecnico_id,
      prioridade,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [titulo, descricao, cliente_id, equipamento_id, tecnico_id || null, prioridade, status]
  );

  return result.insertId;
}

async function main() {
  const adminId = await ensureUser({
    nome: 'Administrador TechRent',
    email: 'admin@techrent.local',
    senha: '12345678',
    nivel_acesso: 'admin',
  });

  const tecnicoId = await ensureUser({
    nome: 'Tecnico TechRent',
    email: 'tecnico@techrent.local',
    senha: '12345678',
    nivel_acesso: 'tecnico',
  });

  const clienteId = await ensureUser({
    nome: 'Cliente Demo',
    email: 'cliente@techrent.local',
    senha: '12345678',
    nivel_acesso: 'cliente',
  });

  const notebookId = await ensureEquipamento({
    nome: 'Notebook Dell Latitude',
    categoria: 'Notebook',
    patrimonio: 'TR-NTB-001',
    status: 'em_manutencao',
    descricao: 'Equipamento de suporte para equipe comercial.',
  });

  const impressoraId = await ensureEquipamento({
    nome: 'Impressora HP LaserJet',
    categoria: 'Impressora',
    patrimonio: 'TR-IMP-014',
    status: 'em_manutencao',
    descricao: 'Impressora principal do setor administrativo.',
  });

  await ensureEquipamento({
    nome: 'Servidor de Arquivos',
    categoria: 'Servidor',
    patrimonio: 'TR-SRV-002',
    status: 'operacional',
    descricao: 'Servidor local de documentos compartilhados.',
  });

  await ensureEquipamento({
    nome: 'Projetor Epson',
    categoria: 'Projetor',
    patrimonio: 'TR-PRJ-008',
    status: 'operacional',
    descricao: 'Projetor utilizado nas salas de reuniao.',
  });

  await ensureChamado({
    titulo: 'Notebook sem acesso a rede',
    descricao: 'O equipamento nao consegue autenticar no Wi-Fi corporativo.',
    cliente_id: clienteId,
    equipamento_id: notebookId,
    tecnico_id: null,
    prioridade: 'alta',
    status: 'aberto',
  });

  await ensureChamado({
    titulo: 'Impressora com atolamento recorrente',
    descricao: 'A impressora trava sempre que tenta imprimir arquivos com varias paginas.',
    cliente_id: clienteId,
    equipamento_id: impressoraId,
    tecnico_id: tecnicoId,
    prioridade: 'media',
    status: 'em_atendimento',
  });

  console.log('Seed demo concluido.');
  console.log('Admin: admin@techrent.local / 12345678');
  console.log('Tecnico: tecnico@techrent.local / 12345678');
  console.log('Cliente: cliente@techrent.local / 12345678');
  console.log(`Usuarios prontos: admin ${adminId}, tecnico ${tecnicoId}, cliente ${clienteId}`);
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error('Erro ao executar seed demo:', erro);
    process.exit(1);
  });
