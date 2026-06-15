export interface IRol {
  id: number;
  nombre_rol: string;
  permisos_json: any;
  rutas_json: any;
  created_at?: Date;
  updated_at?: Date;
  deleted_at?: Date | null;
}
