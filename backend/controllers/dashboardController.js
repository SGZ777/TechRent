// =============================================
// CONTROLLER DE DASHBOARD
// =============================================
// Usa as VIEWS do banco para retornar dados agregados.

const db = require('../config/database');

// GET /dashboard/admin - resumo geral de chamados e equipamentos (apenas admin)
// Usa as views: view_resumo_chamados e view_resumo_equipamentos
const resumoAdmin = async (req, res) => {
  try {
    const [[resumoChamados], [resumoEquipamentos]] = await Promise.all([
      db.query('SELECT status, total FROM view_resumo_chamados ORDER BY status ASC'),
      db.query('SELECT status, total FROM view_resumo_equipamentos ORDER BY status ASC'),
    ]);

    return res.json({
      chamados: resumoChamados,
      equipamentos: resumoEquipamentos,
    });
  } catch (erro) {
    console.error('Erro ao carregar resumo do dashboard:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

// GET /dashboard/tecnico - chamados abertos/em andamento (tecnico/admin)
// Usa a view: view_painel_tecnico
const painelTecnico = async (req, res) => {
  try {
    const [painel] = await db.query(
      `SELECT
        chamado_id,
        titulo,
        prioridade,
        status,
        solicitante,
        equipamento,
        categoria,
        patrimonio,
        tecnico_responsavel,
        aberto_em,
        atualizado_em
       FROM view_painel_tecnico`
    );

    return res.json(painel);
  } catch (erro) {
    console.error('Erro ao carregar painel do tecnico:', erro);
    return res.status(500).json({ mensagem: 'Erro interno do servidor' });
  }
};

module.exports = { resumoAdmin, painelTecnico };
