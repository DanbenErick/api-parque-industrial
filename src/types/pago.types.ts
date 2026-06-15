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
