export interface IRol {
  id: number;
  nombre_rol: string;
  permisos_json: any;
  rutas_json: any;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

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

export interface IMedidor {
  id: number;
  usuario_id: number;
  num_serie: string;
  tipo: string;
  operativo: boolean | number;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface IPeriodoFacturacion {
  id: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  mes_anio: string;
  estado: 'Pendiente' | 'Facturado';
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface IRecibo {
  id: number;
  usuario_id: number;
  periodo_id: number;
  numero_comprobante: string;
  cargo_energia: number;
  cargo_energia_punta: number;
  cargo_factor_potencia: number;
  cargo_mantenimiento: number;
  cargo_fijo: number;
  cargo_corte: number;
  multa_manipulacion: number;
  multa_reconexion: number;
  instalacion_medidor: number;
  deuda_pendiente: number;
  deuda_consumo: number;
  deuda_vencida: number;
  descuento: number;
  motivo_descuento: string | null;
  subtotal: number;
  igv: number;
  total: number;
  fecha_emision: Date;
  fecha_vencimiento: Date;
  estado: 'Pendiente' | 'Pagado' | 'Vencido' | 'Anulado';
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface IPago {
  id: number;
  recibo_id: number;
  metodo_pago: string;
  numero_operacion: string | null;
  fecha_pago: Date;
  monto_pagado: number;
  comprobante_url: string | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}

export interface IPaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page?: number;
    limit: number;
    offset?: number;
    totalPages?: number;
  };
}
