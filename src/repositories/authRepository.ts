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


