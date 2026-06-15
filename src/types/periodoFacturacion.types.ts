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
