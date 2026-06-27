import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { AuthRepository } from '../repositories/authRepository';;

interface ILoginBody {
  documento_identidad: string;
  clave_acceso: string;
}

interface IChangePasswordBody {
  clave_actual: string;
  clave_nueva: string;
}

interface IGetSesionesQuery {
  page?: string;
  limit?: string;
}

export class AuthController {
    constructor(private authRepo: AuthRepository) {}

    public login = async (req: Request<{}, any, ILoginBody>, res: Response): Promise<any> => {
          const { documento_identidad, clave_acceso } = req.body;

          if (!documento_identidad || !clave_acceso) {
            res.status(400).json({ error: 'Documento de identidad y clave son requeridos' });
            return;
          }

          try {
            const usuario = await this.authRepo.findUsuarioByDocumento(documento_identidad);

            if (!usuario) {
              res.status(401).json({ error: 'Credenciales inválidas' });
              return;
            }

            if (!usuario.es_activo) {
              res.status(403).json({ error: 'Cuenta inactiva. Contacte al administrador.' });
              return;
            }

            const isMatch = await bcrypt.compare(clave_acceso, usuario.clave_acceso);

            if (!isMatch) {
              res.status(401).json({ error: 'Credenciales inválidas' });
              return;
            }

            await this.authRepo.updateUltimoAcceso(usuario.id);

            // Registrar en auditoria_sesiones
            const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;
            const userAgent = req.headers['user-agent'] || null;
            await this.authRepo.registrarSesion(usuario.id, ipAddress as string | null, userAgent);

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

            // Retornar la información esencial y rutas/permisos para el sidebar del frontend
            const usuarioResponse = {
              id: usuario.id,
              rol_id: usuario.rol_id,
              nombre_rol: usuario.nombre_rol,
              nombre_razonsocial: usuario.nombre_razonsocial,
              cargo_representante: usuario.cargo_representante,
              telefono: usuario.telefono,
              correo: usuario.correo,
              rutas: usuario.rutas_json,
              permisos: usuario.permisos_json
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
    public getProfile = async (req: Request, res: Response): Promise<any> => {
          try {
            if (!req.user) {
              res.status(401).json({ error: 'No user' });
              return;
            }
            const perfil = await this.authRepo.getProfileById(req.user.id);

            if (!perfil) {
              res.status(404).json({ error: 'Usuario no encontrado' });
              return;
            }

            res.json(perfil);
          } catch (error) {
            console.error('Error al obtener perfil:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public changePassword = async (req: Request<{}, any, IChangePasswordBody>, res: Response): Promise<any> => {
          const { clave_actual, clave_nueva } = req.body;
          
          if (!req.user) {
            res.status(401).json({ error: 'No user' });
            return;
          }
          const userId = req.user.id;

          if (!clave_actual || !clave_nueva) {
            res.status(400).json({ error: 'La contraseña actual y la nueva son requeridas.' });
            return;
          }

          try {
            const currentHash = await this.authRepo.getPasswordHashById(userId);
            if (!currentHash) {
              res.status(404).json({ error: 'Usuario no encontrado.' });
              return;
            }

            const isMatch = await bcrypt.compare(clave_actual, currentHash);
            if (!isMatch) {
              res.status(400).json({ error: 'La contraseña actual es incorrecta.' });
              return;
            }

            const saltRounds = 10;
            const hashedNewPassword = await bcrypt.hash(clave_nueva, saltRounds);
            
            await this.authRepo.updatePassword(userId, hashedNewPassword);

            res.json({ message: 'Contraseña actualizada exitosamente.' });
          } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            res.status(500).json({ error: 'Error interno del servidor.' });
          }
        };
    public getSesiones = async (req: Request<{}, any, any, IGetSesionesQuery>, res: Response): Promise<any> => {
          try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            
            const sesiones = await this.authRepo.getHistorialSesiones(page, limit);
            res.json(sesiones);
          } catch (error) {
            console.error('Error al obtener historial de sesiones:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
}


