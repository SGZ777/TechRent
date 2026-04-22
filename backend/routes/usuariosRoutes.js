// =============================================
// ROTAS DE USUARIOS
// =============================================

const express = require('express');
const router = express.Router();
const { autenticar, autorizar } = require('../middlewares/auth');
const ctrl = require('../controllers/usuariosController');

router.get('/', autenticar, autorizar('admin'), ctrl.listar);
router.put('/:id/nivel-acesso', autenticar, autorizar('admin'), ctrl.atualizarNivelAcesso);

module.exports = router;
