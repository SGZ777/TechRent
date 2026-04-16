// =============================================
// CONTROLLER DE AUTENTICACAO
// =============================================

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// POST /auth/registro - cria um novo usuario
const registro = async (req, res) => {
  const nome = req.body.nome || req.body.usuario;
  const { email, senha } = req.body;

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

  try {
    const [usuarioExistente] = await db.query(
      'SELECT id FROM usuarios WHERE email = ?',
      [email.trim()]
    );

    if (usuarioExistente.length > 0) {
      return res.status(409).json({ mensagem: 'Email ja cadastrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(senha, salt);

    const [resultado] = await db.query(
      'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
      [nome.trim(), email.trim(), senhaHash]
    );

    return res.status(201).json({
      mensagem: 'Usuario criado com sucesso',
      id: resultado.insertId,
    });
  } catch (erro) {
    console.error('Erro no registro:', erro);
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
      [email]
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

module.exports = { registro, login };
