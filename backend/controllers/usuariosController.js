// =============================================
// CONTROLLER DE USUARIOS
// =============================================

const db = require('../config/database');

const niveisValidos = ['cliente', 'admin', 'tecnico'];

// GET /usuarios - lista usuarios para gestao administrativa
const listar = async (req, res) => {
  try {
    const [usuarios] = await db.query(
      `SELECT
        id,
        nome,
        email,
        nivel_acesso,
        criado_em
       FROM usuarios
       ORDER BY nome ASC, email ASC`
    );

    return res.json(usuarios);
  } catch (erro) {
    console.error('Erro ao listar usuarios:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// PUT /usuarios/:id/nivel-acesso - atualiza o perfil de acesso
const atualizarNivelAcesso = async (req, res) => {
  const { id } = req.params;
  const { nivel_acesso } = req.body;

  if (!nivel_acesso || !niveisValidos.includes(nivel_acesso)) {
    return res.status(400).json({
      mensagem: `Nivel de acesso invalido. Use: ${niveisValidos.join(', ')}`,
    });
  }

  try {
    const [usuarios] = await db.query(
      'SELECT id, nivel_acesso FROM usuarios WHERE id = ?',
      [id]
    );

    if (usuarios.length === 0) {
      return res.status(404).json({ mensagem: 'Usuario nao encontrado' });
    }

    const usuario = usuarios[0];

    if (Number(usuario.id) === Number(req.usuario.id) && nivel_acesso !== 'admin') {
      return res.status(422).json({
        mensagem: 'Nao e permitido remover o proprio acesso administrativo.',
      });
    }

    if (usuario.nivel_acesso === nivel_acesso) {
      return res.json({ mensagem: 'Nivel de acesso ja configurado para este usuario' });
    }

    await db.query(
      'UPDATE usuarios SET nivel_acesso = ? WHERE id = ?',
      [nivel_acesso, id]
    );

    return res.json({ mensagem: 'Nivel de acesso atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar nivel de acesso:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

module.exports = { listar, atualizarNivelAcesso };
