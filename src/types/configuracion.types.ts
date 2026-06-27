export interface IConfiguracion {
  id?: number;
  monto_multa_base: number;
  monto_instalacion_base: number;
  cuenta_bancaria?: string;
  created_at?: Date;
  updated_at?: Date;
}
