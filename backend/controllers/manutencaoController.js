// =============================================
// CONTROLLER DE HISTORICO DE MANUTENCAO
// =============================================

const db = require('../config/database');

// GET /manutencao - lista todos os registros de manutencao (admin/tecnico)
const listar = async (req, res) => {
  try {
    const { equipamento_id, tecnico_id } = req.query;

    let query = `
      SELECT
        m.id,
        m.descricao,
        m.registrado_em,
        c.id AS chamado_id,
        c.titulo AS chamado_titulo,
        e.id AS equipamento_id,
        e.nome AS equipamento_nome,
        e.patrimonio,
        t.id AS tecnico_id,
        t.nome AS tecnico_nome
      FROM historico_manutencao m
      JOIN chamados c ON c.id = m.chamado_id
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
      query += ` WHERE ${filtros.join(' AND ')}`;
    }

    query += ' ORDER BY m.registrado_em DESC';

    const [manutencoes] = await db.query(query, params);
    return res.json(manutencoes);
  } catch (erro) {
    console.error('Erro ao listar manutencoes:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// POST /manutencao - registra um reparo (tecnico)
const registrar = async (req, res) => {
  const { chamado_id, equipamento_id, descricao } = req.body;
  const tecnico_id = req.usuario.id;

  if (!chamado_id) {
    return res.status(400).json({ mensagem: 'O chamado e obrigatorio' });
  }
  if (!equipamento_id) {
    return res.status(400).json({ mensagem: 'O equipamento e obrigatorio' });
  }
  if (!descricao || descricao.trim() === '') {
    return res.status(400).json({ mensagem: 'A descricao e obrigatoria' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [chamados] = await conn.query(
      'SELECT id, status, equipamento_id, tecnico_id FROM chamados WHERE id = ?',
      [chamado_id]
    );

    if (chamados.length === 0) {
      await conn.rollback();
      return res.status(404).json({ mensagem: 'Chamado nao encontrado' });
    }

    const chamado = chamados[0];

    if (Number(chamado.equipamento_id) !== Number(equipamento_id)) {
      await conn.rollback();
      return res.status(422).json({ mensagem: 'Chamado e equipamento nao correspondem' });
    }

    if (chamado.status === 'resolvido' || chamado.status === 'cancelado') {
      await conn.rollback();
      return res.status(422).json({
        mensagem: `Chamado ja esta '${chamado.status}' e nao pode receber manutencao`,
      });
    }

    if (chamado.status !== 'em_atendimento') {
      await conn.rollback();
      return res.status(422).json({
        mensagem: 'O chamado precisa estar em atendimento antes de registrar a manutencao.',
      });
    }

    if (chamado.tecnico_id && Number(chamado.tecnico_id) !== Number(tecnico_id)) {
      await conn.rollback();
      return res.status(403).json({
        mensagem: 'Somente o tecnico responsavel pode concluir este chamado.',
      });
    }

    const [equips] = await conn.query(
      'SELECT id FROM equipamentos WHERE id = ?',
      [equipamento_id]
    );

    if (equips.length === 0) {
      await conn.rollback();
      return res.status(404).json({ mensagem: 'Equipamento nao encontrado' });
    }

    const [resultado] = await conn.query(
      `INSERT INTO historico_manutencao (chamado_id, equipamento_id, tecnico_id, descricao)
       VALUES (?, ?, ?, ?)`,
      [chamado_id, equipamento_id, tecnico_id, descricao.trim()]
    );

    await conn.query(
      `UPDATE chamados
       SET status = 'resolvido', tecnico_id = ?, atualizado_em = NOW()
       WHERE id = ?`,
      [tecnico_id, chamado_id]
    );

    await conn.query(
      "UPDATE equipamentos SET status = 'operacional' WHERE id = ?",
      [equipamento_id]
    );

    await conn.commit();

    return res.status(201).json({
      mensagem: 'Manutencao registrada com sucesso',
      id: resultado.insertId,
    });
  } catch (erro) {
    await conn.rollback();
    console.error('Erro ao registrar manutencao:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  } finally {
    conn.release();
  }
};

module.exports = { listar, registrar };
