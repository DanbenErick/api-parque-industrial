import db from '../config/db';
import { IUsuario } from '../types';

export const findUsuarioByDocumento = async (documento_identidad: string): Promise<IUsuario | null> => {
  const [rows]: any = await db.query(
    `SELECT u.*, r.nombre_rol, r.permisos_json, r.rutas_json 
     FROM usuario u
     INNER JOIN rol r ON u.rol_id = r.id
     WHERE u.documento_identidad = ? AND u.deleted_at IS NULL`,
    [documento_identidad]
  );
  return rows.length > 0 ? (rows[0] as IUsuario) : null;
};

export const updateUltimoAcceso = async (id: number): Promise<void> => {
  await db.query(
    'UPDATE usuario SET ultimo_acceso = CURRENT_TIMESTAMP WHERE id = ?',
    [id]
  );
};

export const registrarSesion = async (usuario_id: number, ip_address: string | null, user_agent: string | null): Promise<void> => {
  await db.query(
    'INSERT INTO auditoria_sesiones (usuario_id, ip_address, user_agent) VALUES (?, ?, ?)',
    [usuario_id, ip_address, user_agent]
  );
};

export const getHistorialSesiones = async (page: number = 1, limit: number = 50): Promise<any[]> => {
  const offset = (page - 1) * limit;
  const [rows]: any = await db.query(
    `SELECT a.id, a.usuario_id, u.nombre_razonsocial, r.nombre_rol, a.ip_address, a.user_agent, a.fecha_ingreso
     FROM auditoria_sesiones a
     INNER JOIN usuario u ON a.usuario_id = u.id
     INNER JOIN rol r ON u.rol_id = r.id
     ORDER BY a.fecha_ingreso DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return rows;
};

export const getProfileById = async (id: number): Promise<Partial<IUsuario> | null> => {
  const [rows]: any = await db.query(
    `SELECT u.id, u.documento_identidad, u.nombre_razonsocial, u.cargo_representante, 
            u.telefono, u.correo, u.direccion, u.ultimo_acceso, 
            r.nombre_rol, r.permisos_json, r.rutas_json 
     FROM usuario u
     INNER JOIN rol r ON u.rol_id = r.id
     WHERE u.id = ? AND u.deleted_at IS NULL`,
    [id]
  );
  return rows.length > 0 ? (rows[0] as Partial<IUsuario>) : null;
};

export const getPasswordHashById = async (id: number): Promise<string | null> => {
  const [rows]: any = await db.query(
    'SELECT clave_acceso FROM usuario WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  return rows.length > 0 ? rows[0].clave_acceso : null;
};

export const updatePassword = async (id: number, hashedPassword: string): Promise<number> => {
  const [result]: any = await db.query(
    'UPDATE usuario SET clave_acceso = ? WHERE id = ? AND deleted_at IS NULL',
    [hashedPassword, id]
  );
  return result.affectedRows;
};


