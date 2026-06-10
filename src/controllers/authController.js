const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authRepo = require('../repositories/authRepository');

const login = async (req, res) => {
  const { documento_identidad, clave_acceso } = req.body;

  if (!documento_identidad || !clave_acceso) {
    return res.status(400).json({ error: 'Documento de identidad y clave son requeridos' });
  }

  try {
    const usuario = await authRepo.findUsuarioByDocumento(documento_identidad);

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!usuario.es_activo) {
      return res.status(403).json({ error: 'Cuenta inactiva. Contacte al administrador.' });
    }

    const isMatch = await bcrypt.compare(clave_acceso, usuario.clave_acceso);

    if (!isMatch) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    await authRepo.updateUltimoAcceso(usuario.id);

    const payload = {
      id: usuario.id,
      documento_identidad: usuario.documento_identidad,
      nombre_razonsocial: usuario.nombre_razonsocial,
      rol_id: usuario.rol_id,
      nombre_rol: usuario.nombre_rol,
      direccion: usuario.direccion,
      permisos: usuario.permisos_json,
      rutas: usuario.rutas_json
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

    delete usuario.clave_acceso;
    // Renombrar la propiedad para estandarizar el nombre en el frontend
    usuario.permisos = usuario.permisos_json;
    delete usuario.permisos_json;
    usuario.rutas = usuario.rutas_json;
    delete usuario.rutas_json;

    res.json({
      message: 'Login exitoso',
      token,
      usuario
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getProfile = async (req, res) => {
  try {
    const perfil = await authRepo.getProfileById(req.user.id);

    if (!perfil) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(perfil);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const changePassword = async (req, res) => {
  const { clave_actual, clave_nueva } = req.body;
  const userId = req.user.id;

  if (!clave_actual || !clave_nueva) {
    return res.status(400).json({ error: 'La contraseña actual y la nueva son requeridas.' });
  }

  try {
    const currentHash = await authRepo.getPasswordHashById(userId);
    if (!currentHash) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const isMatch = await bcrypt.compare(clave_actual, currentHash);
    if (!isMatch) {
      return res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(clave_nueva, saltRounds);
    
    await authRepo.updatePassword(userId, hashedNewPassword);

    res.json({ message: 'Contraseña actualizada exitosamente.' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

module.exports = {
  login,
  getProfile,
  changePassword
};
