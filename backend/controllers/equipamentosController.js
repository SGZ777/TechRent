// =============================================
// CONTROLLER DE EQUIPAMENTOS
// =============================================

const db = require('../config/database');

const statusValidos = ['operacional', 'em_manutencao', 'desativado'];

// GET /equipamentos - lista todos os equipamentos do inventario
const listar = async (req, res) => {
  try {
    const { status, categoria } = req.query;

    let query = `
      SELECT 
        id,
        nome,
        categoria,
        patrimonio,
        status,
        descricao
      FROM equipamentos
    `;

    const params = [];
    const filtros = [];

    if (status) {
      filtros.push('status = ?');
      params.push(status);
    }

    if (categoria) {
      filtros.push('categoria = ?');
      params.push(categoria);
    }

    if (filtros.length > 0) {
      query += ` WHERE ${filtros.join(' AND ')}`;
    }

    query += ' ORDER BY nome ASC';

    const [equipamentos] = await db.query(query, params);
    return res.json(equipamentos);
  } catch (erro) {
    console.error('Erro ao listar equipamentos:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// GET /equipamentos/:id - retorna um equipamento pelo ID
const buscarPorId = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT
        id,
        nome,
        categoria,
        patrimonio,
        status,
        descricao
       FROM equipamentos
       WHERE id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensagem: 'Equipamento nao encontrado' });
    }

    return res.json(rows[0]);
  } catch (erro) {
    console.error('Erro ao buscar equipamento:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// POST /equipamentos - cadastra um novo equipamento (admin)
const criar = async (req, res) => {
  const { nome, categoria, patrimonio, status, descricao } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ mensagem: 'O nome e obrigatorio' });
  }

  if (!patrimonio || patrimonio.trim() === '') {
    return res.status(400).json({ mensagem: 'O patrimonio e obrigatorio' });
  }

  if (status && !statusValidos.includes(status)) {
    return res.status(400).json({ mensagem: 'Status invalido' });
  }

  try {
    const [existente] = await db.query(
      'SELECT id FROM equipamentos WHERE patrimonio = ?',
      [patrimonio.trim()]
    );

    if (existente.length > 0) {
      return res.status(409).json({ mensagem: 'Patrimonio ja cadastrado' });
    }

    const [resultado] = await db.query(
      `INSERT INTO equipamentos (nome, categoria, patrimonio, status, descricao)
       VALUES (?, ?, ?, ?, ?)`,
      [
        nome.trim(),
        categoria?.trim() || null,
        patrimonio.trim(),
        status || 'operacional',
        descricao?.trim() || null,
      ]
    );

    return res.status(201).json({
      mensagem: 'Equipamento cadastrado com sucesso',
      id: resultado.insertId,
    });
  } catch (erro) {
    console.error('Erro ao criar equipamento:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// PUT /equipamentos/:id - atualiza um equipamento (apenas admin)
const atualizar = async (req, res) => {
  const { id } = req.params;
  const { nome, categoria, patrimonio, status, descricao } = req.body;

  if (status && !statusValidos.includes(status)) {
    return res.status(400).json({ mensagem: 'Status invalido' });
  }

  try {
    const [rows] = await db.query('SELECT id FROM equipamentos WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ mensagem: 'Equipamento nao encontrado' });
    }

    if (patrimonio) {
      const [duplicado] = await db.query(
        'SELECT id FROM equipamentos WHERE patrimonio = ? AND id != ?',
        [patrimonio.trim(), id]
      );

      if (duplicado.length > 0) {
        return res.status(409).json({ mensagem: 'Patrimonio ja em uso' });
      }
    }

    const campos = [];
    const valores = [];

    if (nome !== undefined) {
      campos.push('nome = ?');
      valores.push(nome?.trim() || null);
    }

    if (categoria !== undefined) {
      campos.push('categoria = ?');
      valores.push(categoria?.trim() || null);
    }

    if (patrimonio !== undefined) {
      campos.push('patrimonio = ?');
      valores.push(patrimonio?.trim() || null);
    }

    if (status !== undefined) {
      campos.push('status = ?');
      valores.push(status);
    }

    if (descricao !== undefined) {
      campos.push('descricao = ?');
      valores.push(descricao?.trim() || null);
    }

    if (campos.length === 0) {
      return res.status(400).json({ mensagem: 'Nenhum campo para atualizar' });
    }

    valores.push(id);

    await db.query(
      `UPDATE equipamentos SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    return res.json({ mensagem: 'Equipamento atualizado com sucesso' });
  } catch (erro) {
    console.error('Erro ao atualizar equipamento:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// DELETE /equipamentos/:id - remove um equipamento (apenas admin)
const remover = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.query('SELECT id FROM equipamentos WHERE id = ?', [id]);

    if (rows.length === 0) {
      return res.status(404).json({ mensagem: 'Equipamento nao encontrado' });
    }

    const [chamadosAtivos] = await db.query(
      `SELECT id FROM chamados
       WHERE equipamento_id = ? AND status NOT IN ('resolvido', 'cancelado')`,
      [id]
    );

    if (chamadosAtivos.length > 0) {
      return res.status(422).json({
        mensagem: 'Nao e possivel remover: equipamento possui chamados em aberto',
      });
    }

    await db.query('DELETE FROM equipamentos WHERE id = ?', [id]);

    return res.json({ mensagem: 'Equipamento removido com sucesso' });
  } catch (erro) {
    console.error('Erro ao remover equipamento:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

module.exports = { listar, buscarPorId, criar, atualizar, remover };
