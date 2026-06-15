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
