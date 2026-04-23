// =============================================
// CONTROLLER DE AUTENTICACAO
// =============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const PERFIS_PUBLICOS = ['cliente'];
const PERFIS_INTERNOS = ['admin', 'tecnico'];
const PERFIS_VALIDOS = [...PERFIS_PUBLICOS, ...PERFIS_INTERNOS];

function normalizarNivelAcesso(nivelAcesso, fallback = 'cliente') {
  if (!nivelAcesso || typeof nivelAcesso !== 'string') {
    return fallback;
  }

  const nivelNormalizado = nivelAcesso.trim().toLowerCase();
  return PERFIS_VALIDOS.includes(nivelNormalizado) ? nivelNormalizado : null;
}

async function criarUsuario({ nome, email, senha, nivelAcesso }) {
  const nomeLimpo = nome.trim();
  const emailLimpo = email.trim().toLowerCase();
  const salt = await bcrypt.genSalt(10);
  const senhaHash = await bcrypt.hash(senha, salt);

  const [resultado] = await db.query(
    'INSERT INTO usuarios (nome, email, senha, nivel_acesso) VALUES (?, ?, ?, ?)',
    [nomeLimpo, emailLimpo, senhaHash, nivelAcesso]
  );

  return resultado.insertId;
}

// POST /auth/registro - cria um novo usuario
const registro = async (req, res) => {
  const nome = req.body.nome || req.body.usuario;
  const { email, senha } = req.body;
  const nivelAcesso = normalizarNivelAcesso(req.body.nivel_acesso, 'cliente');

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ mensagem: 'O nome e obrigatorio' });
  }
  if (!email || email.trim() === '') {
    return res.status(400).json({ mensagem: 'O email e obrigatorio' });
  }
  if (!senha || senha.trim() === '') {
    return res.status(400).json({ mensagem: 'A senha e obrigatoria' });
  }
  if (senha.trim().length < 8) {
    return res.status(400).json({ mensagem: 'A senha deve ter pelo menos 8 caracteres' });
  }
  if (!nivelAcesso) {
    return res.status(400).json({ mensagem: 'Nivel de acesso invalido' });
  }
  if (!PERFIS_PUBLICOS.includes(nivelAcesso)) {
    return res.status(403).json({
      mensagem: 'Contas de administrador e tecnico devem ser criadas por um administrador.',
    });
  }

  try {
    const [usuarioExistente] = await db.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (usuarioExistente.length > 0) {
      return res.status(409).json({ mensagem: 'Email ja cadastrado' });
    }

    const usuarioId = await criarUsuario({
      nome,
      email,
      senha,
      nivelAcesso,
    });

    return res.status(201).json({
      mensagem: 'Usuario criado com sucesso',
      id: usuarioId,
      nivel_acesso: nivelAcesso,
    });
  } catch (erro) {
    console.error('Erro no registro:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// POST /auth/usuarios - cria uma conta interna (admin ou tecnico)
const registroInterno = async (req, res) => {
  const nome = req.body.nome || req.body.usuario;
  const { email, senha } = req.body;
  const nivelAcesso = normalizarNivelAcesso(req.body.nivel_acesso, null);

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ mensagem: 'O nome e obrigatorio' });
  }
  if (!email || email.trim() === '') {
    return res.status(400).json({ mensagem: 'O email e obrigatorio' });
  }
  if (!senha || senha.trim() === '') {
    return res.status(400).json({ mensagem: 'A senha e obrigatoria' });
  }
  if (senha.trim().length < 8) {
    return res.status(400).json({ mensagem: 'A senha deve ter pelo menos 8 caracteres' });
  }
  if (!nivelAcesso || !PERFIS_INTERNOS.includes(nivelAcesso)) {
    return res.status(400).json({ mensagem: 'Informe um perfil valido entre admin e tecnico' });
  }

  try {
    const [usuarioExistente] = await db.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (usuarioExistente.length > 0) {
      return res.status(409).json({ mensagem: 'Email ja cadastrado' });
    }

    const usuarioId = await criarUsuario({
      nome,
      email,
      senha,
      nivelAcesso,
    });

    return res.status(201).json({
      mensagem: `Conta ${nivelAcesso === 'admin' ? 'de administrador' : 'tecnica'} criada com sucesso`,
      id: usuarioId,
      nivel_acesso: nivelAcesso,
    });
  } catch (erro) {
    console.error('Erro ao registrar usuario interno:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// GET /auth/usuarios - lista administradores e tecnicos
const listarUsuariosInternos = async (_req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, nome, email, nivel_acesso
         FROM usuarios
        WHERE nivel_acesso IN ('admin', 'tecnico')
        ORDER BY nivel_acesso, nome`
    );

    return res.json(rows);
  } catch (erro) {
    console.error('Erro ao listar usuarios internos:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// POST /auth/login - autentica e retorna JWT
const login = async (req, res) => {
  const { email, senha } = req.body;

  if (!email || email.trim() === '') {
    return res.status(400).json({ mensagem: 'O email e obrigatorio' });
  }
  if (!senha || senha.trim() === '') {
    return res.status(400).json({ mensagem: 'A senha e obrigatoria' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id, nome, email, senha, nivel_acesso FROM usuarios WHERE email = ?',
      [email.trim().toLowerCase()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ mensagem: 'Email ou senha invalidos' });
    }

    const usuario = rows[0];
    const senhaCorreta = await bcrypt.compare(senha, usuario.senha);

    if (!senhaCorreta) {
      return res.status(401).json({ mensagem: 'Email ou senha invalidos' });
    }

    const token = jwt.sign(
      {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        nivel_acesso: usuario.nivel_acesso,
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      mensagem: 'Login realizado com sucesso',
      token,
    });
  } catch (erro) {
    console.error('Erro no login:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

module.exports = { registro, registroInterno, listarUsuariosInternos, login };
