// =============================================
// ROTAS DE AUTENTICAÇÃO
// =============================================
// Rotas públicas — não exigem token JWT.

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { autenticar, autorizar } = require('../middlewares/auth');

// POST /auth/registro - cria uma conta
router.post('/registro', authController.registro);

// GET /auth/usuarios - lista contas internas (admin e tecnico)
router.get('/usuarios', autenticar, autorizar('admin'), authController.listarUsuariosInternos);

// POST /auth/usuarios - cria contas internas (admin e tecnico)
router.post('/usuarios', autenticar, autorizar('admin'), authController.registroInterno);

// POST /auth/login - autentica e retorna o token JWT
router.post('/login', authController.login);

module.exports = router;
