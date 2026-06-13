import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import * as authRepo from '../repositories/authRepository';

export const login = async (req: Request, res: Response): Promise<any> => {
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

    const token = jwt.sign(payload, process.env.JWT_SECRET as string, { expiresIn: '24h' });

    // Retornar solo la información esencial en el login
    const usuarioResponse = {
      id: usuario.id,
      rol_id: usuario.rol_id,
      nombre_rol: usuario.nombre_rol,
      nombre_razonsocial: usuario.nombre_razonsocial
    };

    res.json({
      message: 'Login exitoso',
      token,
      usuario: usuarioResponse
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getProfile = async (req: Request, res: Response): Promise<any> => {
  try {
    if (!req.user) return res.status(401).json({ error: 'No user' });
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

export const changePassword = async (req: Request, res: Response): Promise<any> => {
  const { clave_actual, clave_nueva } = req.body;
  
  if (!req.user) return res.status(401).json({ error: 'No user' });
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


