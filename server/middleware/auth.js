const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

async function requireThug(req, res, next) {
  const u = await Usuario.findById(req.userId);
  if (!u || u.nivelAcceso !== 'thug') {
    return res.status(403).json({ error: 'Solo Thug' });
  }
  next();
}

module.exports = { authMiddleware, requireThug };
