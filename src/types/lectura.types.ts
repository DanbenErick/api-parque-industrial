export interface ILectura {
  id?: number;
  medidor_id: number;
  operario_id: number;
  periodo_id: number;
  lectura_anterior: number;
  lectura_actual: number;
  consumo_calculado?: number;
  lectura_anterior_punta?: number;
  lectura_actual_punta?: number;
  consumo_calculado_punta?: number;
  factor_potencia?: number;
  precio_factor_potencia?: number;
  fecha_registro?: Date;
  estado?: string;
  justificacion?: string | null;
  es_cambio_medidor?: boolean | number;
  lectura_final_viejo?: number | null;
  lectura_inicial_nuevo?: number | null;
  lectura_final_viejo_punta?: number | null;
  lectura_inicial_nuevo_punta?: number | null;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
  
  // Joins
  num_serie?: string;
  propietario?: string;
  direccion?: string;
  operario?: string;
  periodo?: string;
}
