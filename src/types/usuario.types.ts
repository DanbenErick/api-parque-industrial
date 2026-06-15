import { IMedidor } from './medidor.types';

export interface IUsuario {
  id: number;
  rol_id: number;
  documento_identidad: string;
  nombre_razonsocial: string;
  clave_acceso?: string;
  cargo_representante: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  es_activo: boolean | number;
  ultimo_acceso?: Date | null;
  actividad_rubro: string | null;
  saldo_a_favor: number;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
  
  // Joins
  nombre_rol?: string;
  medidores?: string | IMedidor[];
  deuda_total?: number;
  recibos_pendientes?: number;
  permisos_json?: any;
  rutas_json?: any;
}
