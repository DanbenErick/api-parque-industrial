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
