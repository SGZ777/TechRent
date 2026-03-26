// =============================================
// CONTROLLER DE EQUIPAMENTOS
// =============================================

const db = require('../config/database');

// GET /equipamentos - lista todos os equipamentos do inventário
const listar = async (req, res) => {
  try {
    const { status, tipo } = req.query;

    let query = `
      SELECT 
        e.id, e.nome, e.tipo, e.numero_serie, e.status,
        e.criado_em, e.atualizado_em,
        u.nome AS responsavel_nome
      FROM equipamentos e
      LEFT JOIN usuarios u ON u.id = e.responsavel_id
    `;
    const params = [];
    const filtros = [];

    if (status) {
      filtros.push('e.status = ?');
      params.push(status);
    }
    if (tipo) {
      filtros.push('e.tipo = ?');
      params.push(tipo);
    }
    if (filtros.length > 0) {
      query += ' WHERE ' + filtros.join(' AND ');
    }

    query += ' ORDER BY e.nome ASC';

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
        e.id, e.nome, e.tipo, e.numero_serie, e.status,
        e.criado_em, e.atualizado_em,
        u.nome AS responsavel_nome
       FROM equipamentos e
       LEFT JOIN usuarios u ON u.id = e.responsavel_id
       WHERE e.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensagem: 'Equipamento não encontrado' });
    }

    return res.json(rows[0]);
  } catch (erro) {
    console.error('Erro ao buscar equipamento:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// POST /equipamentos - cadastra um novo equipamento (admin)
const criar = async (req, res) => {
  const { nome, tipo, numero_serie, status, responsavel_id } = req.body;

  if (!nome || nome.trim() === '') {
    return res.status(400).json({ mensagem: 'O nome é obrigatório' });
  }
  if (!tipo || tipo.trim() === '') {
    return res.status(400).json({ mensagem: 'O tipo é obrigatório' });
  }
  if (!numero_serie || numero_serie.trim() === '') {
    return res.status(400).json({ mensagem: 'O número de série é obrigatório' });
  }

  const statusValidos = ['operacional', 'em_manutencao', 'inativo'];
  if (status && !statusValidos.includes(status)) {
    return res.status(400).json({ mensagem: 'Status inválido' });
  }

  try {
    // Verifica número de série duplicado
    const [existente] = await db.query(
      'SELECT id FROM equipamentos WHERE numero_serie = ?',
      [numero_serie.trim()]
    );
    if (existente.length > 0) {
      return res.status(409).json({ mensagem: 'Número de série já cadastrado' });
    }

    const [resultado] = await db.query(
      `INSERT INTO equipamentos (nome, tipo, numero_serie, status, responsavel_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        nome.trim(),
        tipo.trim(),
        numero_serie.trim(),
        status ?? 'operacional',
        responsavel_id ?? null,
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
  const { nome, tipo, numero_serie, status, responsavel_id } = req.body;

  const statusValidos = ['operacional', 'em_manutencao', 'inativo'];
  if (status && !statusValidos.includes(status)) {
    return res.status(400).json({ mensagem: 'Status inválido' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id FROM equipamentos WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: 'Equipamento não encontrado' });
    }

    // Verifica duplicidade de número de série (exceto o próprio registro)
    if (numero_serie) {
      const [duplicado] = await db.query(
        'SELECT id FROM equipamentos WHERE numero_serie = ? AND id != ?',
        [numero_serie.trim(), id]
      );
      if (duplicado.length > 0) {
        return res.status(409).json({ mensagem: 'Número de série já em uso' });
      }
    }

    // Monta update apenas com os campos enviados
    const campos = [];
    const valores = [];

    if (nome)          { campos.push('nome = ?');          valores.push(nome.trim()); }
    if (tipo)          { campos.push('tipo = ?');          valores.push(tipo.trim()); }
    if (numero_serie)  { campos.push('numero_serie = ?');  valores.push(numero_serie.trim()); }
    if (status)        { campos.push('status = ?');        valores.push(status); }
    if (responsavel_id !== undefined) {
      campos.push('responsavel_id = ?');
      valores.push(responsavel_id);
    }

    if (campos.length === 0) {
      return res.status(400).json({ mensagem: 'Nenhum campo para atualizar' });
    }

    campos.push('atualizado_em = NOW()');
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
    const [rows] = await db.query(
      'SELECT id FROM equipamentos WHERE id = ?',
      [id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ mensagem: 'Equipamento não encontrado' });
    }

    // Bloqueia remoção se houver chamados ativos vinculados
    const [chamadosAtivos] = await db.query(
      `SELECT id FROM chamados 
       WHERE equipamento_id = ? AND status NOT IN ('resolvido', 'cancelado')`,
      [id]
    );
    if (chamadosAtivos.length > 0) {
      return res.status(422).json({
        mensagem: 'Não é possível remover: equipamento possui chamados em aberto',
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