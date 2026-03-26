// =============================================
// CONTROLLER DE HISTÓRICO DE MANUTENÇÃO
// =============================================

const db = require('../config/database');

// GET /manutencao - lista todos os registros de manutenção (admin/técnico)
const listar = async (req, res) => {
  try {
    const { equipamento_id, tecnico_id } = req.query;

    let query = `
      SELECT
        m.id,
        m.descricao,
        m.criado_em,
        c.id            AS chamado_id,
        c.titulo        AS chamado_titulo,
        e.id            AS equipamento_id,
        e.nome          AS equipamento_nome,
        e.numero_serie,
        t.id            AS tecnico_id,
        t.nome          AS tecnico_nome
      FROM manutencoes m
      JOIN chamados     c ON c.id = m.chamado_id
      JOIN equipamentos e ON e.id = m.equipamento_id
      LEFT JOIN usuarios t ON t.id = m.tecnico_id
    `;
    const params = [];
    const filtros = [];

    if (equipamento_id) {
      filtros.push('m.equipamento_id = ?');
      params.push(equipamento_id);
    }
    if (tecnico_id) {
      filtros.push('m.tecnico_id = ?');
      params.push(tecnico_id);
    }
    if (filtros.length > 0) {
      query += ' WHERE ' + filtros.join(' AND ');
    }

    query += ' ORDER BY m.criado_em DESC';

    const [manutencoes] = await db.query(query, params);
    return res.json(manutencoes);
  } catch (erro) {
    console.error('Erro ao listar manutenções:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// POST /manutencao - registra um reparo (técnico)
const registrar = async (req, res) => {
  const { chamado_id, equipamento_id, descricao } = req.body;
  const tecnico_id = req.usuario.id;

  if (!chamado_id) {
    return res.status(400).json({ mensagem: 'O chamado é obrigatório' });
  }
  if (!equipamento_id) {
    return res.status(400).json({ mensagem: 'O equipamento é obrigatório' });
  }
  if (!descricao || descricao.trim() === '') {
    return res.status(400).json({ mensagem: 'A descrição é obrigatória' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Verifica se o chamado existe e está em um status que permite registro
    const [chamados] = await conn.query(
      'SELECT id, status, equipamento_id FROM chamados WHERE id = ?',
      [chamado_id]
    );
    if (chamados.length === 0) {
      await conn.rollback();
      return res.status(404).json({ mensagem: 'Chamado não encontrado' });
    }

    const chamado = chamados[0];
    if (chamado.status === 'resolvido' || chamado.status === 'cancelado') {
      await conn.rollback();
      return res.status(422).json({
        mensagem: `Chamado já está '${chamado.status}' e não pode receber manutenção`,
      });
    }

    // Verifica se o equipamento existe
    const [equips] = await conn.query(
      'SELECT id FROM equipamentos WHERE id = ?',
      [equipamento_id]
    );
    if (equips.length === 0) {
      await conn.rollback();
      return res.status(404).json({ mensagem: 'Equipamento não encontrado' });
    }

    // Insere o registro de manutenção
    const [resultado] = await conn.query(
      `INSERT INTO manutencoes (chamado_id, equipamento_id, tecnico_id, descricao)
       VALUES (?, ?, ?, ?)`,
      [chamado_id, equipamento_id, tecnico_id, descricao.trim()]
    );

    // Resolve o chamado
    await conn.query(
      `UPDATE chamados
       SET status = 'resolvido', tecnico_id = ?, atualizado_em = NOW()
       WHERE id = ?`,
      [tecnico_id, chamado_id]
    );

    // Devolve o equipamento para operacional
    await conn.query(
      "UPDATE equipamentos SET status = 'operacional', atualizado_em = NOW() WHERE id = ?",
      [equipamento_id]
    );

    await conn.commit();

    return res.status(201).json({
      mensagem: 'Manutenção registrada com sucesso',
      id: resultado.insertId,
    });
  } catch (erro) {
    await conn.rollback();
    console.error('Erro ao registrar manutenção:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  } finally {
    conn.release();
  }
};

module.exports = { listar, registrar };