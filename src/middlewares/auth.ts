import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { IUsuario } from '../types';

export class AuthMiddleware {
    public authenticateToken = (req: Request, res: Response, next: NextFunction) => {
          const authHeader = req.headers['authorization'];
          const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer <token>"

          if (!token) {
            return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
          }

          jwt.verify(token, process.env.JWT_SECRET!, (err, user) => {
            if (err) {
              return res.status(403).json({ error: 'Token inválido o expirado.' });
            }
            
            // Attach user payload to request
            req.user = user as IUsuario;
            next();
          });
        };
    public authorizeRole = (rolesParam: string | string[]) => {
          return (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) {
              return res.status(401).json({ error: 'Usuario no autenticado.' });
            }

            const roles = Array.isArray(rolesParam) ? rolesParam : [rolesParam];
            
            if (!req.user.nombre_rol || !roles.includes(req.user.nombre_rol as string)) {
              return res.status(403).json({ error: 'No tienes los permisos necesarios para realizar esta acción.' });
            }

            next();
          };
        };
}
