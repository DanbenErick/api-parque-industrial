const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
    
    // Attach user payload to request
    req.user = user;
    next();
  });
};

const authorizeRole = (rolesParam) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuario no autenticado.' });
    }

    const roles = Array.isArray(rolesParam) ? rolesParam : [rolesParam];
    
    if (!roles.includes(req.user.nombre_rol)) {
      return res.status(403).json({ error: 'No tienes los permisos necesarios para realizar esta acción.' });
    }

    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRole
};
