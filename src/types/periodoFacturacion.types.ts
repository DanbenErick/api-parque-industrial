import { EstadoPeriodo } from './enums';

export interface IPeriodoFacturacion {
  id?: number;
  fecha_inicio: Date;
  fecha_fin: Date;
  mes_anio: string;
  estado: EstadoPeriodo;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}
