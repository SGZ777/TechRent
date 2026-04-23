// =============================================
// CONTROLLER DE CHAMADOS
// =============================================

const db = require('../config/database');
const niveisTecnicos = ['tecnico'];

// GET /chamados - lista chamados
const listar = async (req, res) => {
  try {
    const { id, nivel_acesso } = req.usuario;

    let query = `
      SELECT 
        c.id,
        c.titulo,
        c.descricao,
        c.status,
        c.prioridade,
        c.aberto_em AS criado_em,
        c.aberto_em,
        c.atualizado_em,
        c.cliente_id,
        c.tecnico_id,
        c.equipamento_id,
        u.nome AS cliente_nome,
        t.nome AS tecnico_nome,
        e.nome AS equipamento_nome,
        e.categoria AS equipamento_categoria,
        e.patrimonio AS equipamento_patrimonio
      FROM chamados c
      JOIN usuarios u ON u.id = c.cliente_id
      LEFT JOIN usuarios t ON t.id = c.tecnico_id
      LEFT JOIN equipamentos e ON e.id = c.equipamento_id
    `;
    const params = [];

    if (nivel_acesso === 'cliente') {
      query += ' WHERE c.cliente_id = ?';
      params.push(id);
    }

    query += ' ORDER BY c.aberto_em DESC';

    const [chamados] = await db.query(query, params);
    return res.json(chamados);
  } catch (erro) {
    console.error('Erro ao listar chamados:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// GET /chamados/:id - retorna um chamado pelo ID
const buscarPorId = async (req, res) => {
  try {
    const { id: usuarioId, nivel_acesso } = req.usuario;
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT 
        c.id,
        c.titulo,
        c.descricao,
        c.status,
        c.prioridade,
        c.aberto_em AS criado_em,
        c.aberto_em,
        c.atualizado_em,
        c.cliente_id,
        c.tecnico_id,
        c.equipamento_id,
        u.nome AS cliente_nome,
        t.nome AS tecnico_nome,
        e.nome AS equipamento_nome,
        e.categoria AS equipamento_categoria,
        e.patrimonio AS equipamento_patrimonio
       FROM chamados c
       JOIN usuarios u ON u.id = c.cliente_id
       LEFT JOIN usuarios t ON t.id = c.tecnico_id
       LEFT JOIN equipamentos e ON e.id = c.equipamento_id
       WHERE c.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensagem: 'Chamado nao encontrado' });
    }

    const chamado = rows[0];

    if (nivel_acesso === 'cliente' && chamado.cliente_id !== usuarioId) {
      return res.status(403).json({ mensagem: 'Acesso negado' });
    }

    return res.json(chamado);
  } catch (erro) {
    console.error('Erro ao buscar chamado:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// POST /chamados - abre um novo chamado
const criar = async (req, res) => {
  const { titulo, descricao, equipamento_id, prioridade } = req.body;
  const cliente_id = req.usuario.id;

  if (!titulo || titulo.trim() === '') {
    return res.status(400).json({ mensagem: 'O titulo e obrigatorio' });
  }
  if (!descricao || descricao.trim() === '') {
    return res.status(400).json({ mensagem: 'A descricao e obrigatoria' });
  }
  if (!equipamento_id) {
    return res.status(400).json({ mensagem: 'O equipamento e obrigatorio' });
  }

  const prioridadesValidas = ['baixa', 'media', 'alta'];
  if (prioridade && !prioridadesValidas.includes(prioridade)) {
    return res.status(400).json({ mensagem: 'Prioridade invalida' });
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [equip] = await conn.query(
      'SELECT id, status FROM equipamentos WHERE id = ?',
      [equipamento_id]
    );

    if (equip.length === 0) {
      await conn.rollback();
      return res.status(404).json({ mensagem: 'Equipamento nao encontrado' });
    }

    if (equip[0].status !== 'operacional') {
      await conn.rollback();
      return res.status(422).json({ mensagem: 'Equipamento indisponivel para novo chamado' });
    }

    const [resultado] = await conn.query(
      `INSERT INTO chamados (titulo, descricao, equipamento_id, prioridade, cliente_id, status)
       VALUES (?, ?, ?, ?, ?, 'aberto')`,
      [titulo.trim(), descricao.trim(), equipamento_id, prioridade || 'media', cliente_id]
    );

    await conn.query(
      "UPDATE equipamentos SET status = 'em_manutencao' WHERE id = ?",
      [equipamento_id]
    );

    await conn.commit();

    return res.status(201).json({
      mensagem: 'Chamado aberto com sucesso',
      id: resultado.insertId,
    });
  } catch (erro) {
    await conn.rollback();
    console.error('Erro ao criar chamado:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  } finally {
    conn.release();
  }
};

// PUT /chamados/:id/status - atualiza o status do chamado
const atualizarStatus = async (req, res) => {
  const { id } = req.params;
  const { status, tecnico_id } = req.body;
  const { id: usuarioId, nivel_acesso } = req.usuario;

  const statusValidos = ['em_atendimento', 'cancelado'];
  if (!status || !statusValidos.includes(status)) {
    return res.status(400).json({
      mensagem: `Status invalido. Use: ${statusValidos.join(', ')}`,
    });
  }

  const transicoesValidas = {
    aberto: ['em_atendimento', 'cancelado'],
    em_atendimento: ['cancelado'],
  };

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      'SELECT id, status, equipamento_id FROM chamados WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ mensagem: 'Chamado nao encontrado' });
    }

    const chamado = rows[0];
    const transicoesPossiveis = transicoesValidas[chamado.status];

    if (!transicoesPossiveis || !transicoesPossiveis.includes(status)) {
      await conn.rollback();
      return res.status(422).json({
        mensagem: `Transicao invalida: '${chamado.status}' -> '${status}'`,
      });
    }

    const campos = ['status = ?', 'atualizado_em = NOW()'];
    const valores = [status];

    if (status === 'em_atendimento') {
      let tecnicoResponsavel = null;

      if (nivel_acesso === 'tecnico') {
        tecnicoResponsavel = usuarioId;
      } else if (nivel_acesso === 'admin') {
        if (!tecnico_id) {
          await conn.rollback();
          return res.status(400).json({
            mensagem: 'Informe o tecnico responsavel para iniciar o atendimento.',
          });
        }

        const [tecnicos] = await conn.query(
          'SELECT id, nivel_acesso FROM usuarios WHERE id = ?',
          [tecnico_id]
        );

        if (tecnicos.length === 0 || !niveisTecnicos.includes(tecnicos[0].nivel_acesso)) {
          await conn.rollback();
          return res.status(422).json({
            mensagem: 'O usuario informado nao possui perfil tecnico.',
          });
        }

        tecnicoResponsavel = tecnico_id;
      }

      campos.push('tecnico_id = ?');
      valores.push(tecnicoResponsavel);
    }

    valores.push(id);

    await conn.query(
      `UPDATE chamados SET ${campos.join(', ')} WHERE id = ?`,
      valores
    );

    if (status === 'cancelado') {
      await conn.query(
        "UPDATE equipamentos SET status = 'operacional' WHERE id = ?",
        [chamado.equipamento_id]
      );
    }

    await conn.commit();

    return res.json({ mensagem: 'Status atualizado com sucesso' });
  } catch (erro) {
    await conn.rollback();
    console.error('Erro ao atualizar status:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  } finally {
    conn.release();
  }
};

module.exports = { listar, buscarPorId, criar, atualizarStatus };
