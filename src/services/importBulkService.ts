import { Database } from '../config/db';
import { EstadoRecibo, TipoMedidor } from '../types/enums';

interface ImportRow {
  mes_anio: string;
  documento_identidad: string;
  num_serie?: string;
  lectura_anterior?: number;
  lectura_actual?: number;
  lectura_anterior_punta?: number;
  lectura_actual_punta?: number;
  factor_potencia?: number;
  precio_factor_potencia?: number;
  cargo_fijo?: number;
  cargo_corte?: number;
  multa_manipulacion?: number;
  multa_reconexion?: number;
  deuda_vencida?: number;
  instalacion_medidor?: number;
  descuento?: number;
  estado_pago?: string;
  fecha_pago?: string;
  metodo_pago?: string;
  numero_operacion?: string;
}

interface ImportResult {
  row: number;
  documento: string;
  medidor: string;
  periodo: string;
  status: 'ok' | 'error';
  error?: string;
  lectura_id?: number;
  recibo_id?: number;
  pago_id?: number;
}

export class ImportBulkService {
  constructor(private db: Database) {}

  public importarFacturacionMasiva = async (rows: ImportRow[], admin_id: number): Promise<{ successful: ImportResult[]; failed: ImportResult[] }> => {
    const connection: any = await this.db.getConnection();
    await connection.beginTransaction();

    const successful: ImportResult[] = [];
    const failed: ImportResult[] = [];

    try {
      await connection.query('SET @current_user_id = ?', [admin_id]);

      // Pre-cargar catálogos para evitar N+1 queries
      const [allPeriodos]: any = await connection.query(
        'SELECT id, mes_anio, tarifa_kwh, tarifa_kwh_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, factor_multiplicador, fecha_emision_recibo, fecha_vencimiento FROM periodo_facturacion WHERE deleted_at IS NULL'
      );
      const periodoMap: Record<string, any> = {};
      allPeriodos.forEach((p: any) => { periodoMap[p.mes_anio] = p; });

      const [allUsuarios]: any = await connection.query(
        'SELECT id, documento_identidad FROM usuario WHERE deleted_at IS NULL'
      );
      const usuarioMap: Record<string, number> = {};
      allUsuarios.forEach((u: any) => { usuarioMap[String(u.documento_identidad)] = u.id; });

      const [allMedidores]: any = await connection.query(
        'SELECT id, num_serie, usuario_id, tipo, cobro_instalacion_pendiente FROM medidor WHERE deleted_at IS NULL'
      );
      const medidorMap: Record<string, any> = {};
      allMedidores.forEach((m: any) => { medidorMap[String(m.num_serie)] = m; });

      // Obtener el siguiente número de comprobante
      const currentYear = new Date().getFullYear();
      const [maxNum]: any = await connection.query(
        `SELECT MAX(CAST(SUBSTRING_INDEX(numero_comprobante, '-', -1) AS UNSIGNED)) as ultimo FROM recibo WHERE numero_comprobante LIKE ?`,
        [`REC-${currentYear}-%`]
      );
      let siguienteComprobanteId = (maxNum[0]?.ultimo || 0) + 1;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 2; // +2 porque fila 1 es header en Excel
        const docStr = String(row.documento_identidad || '').trim();
        const medStr = String(row.num_serie || '').trim();
        const periodoStr = String(row.mes_anio || '').trim();

        const result: ImportResult = {
          row: rowNum,
          documento: docStr,
          medidor: medStr || 'Sin medidor',
          periodo: periodoStr,
          status: 'error'
        };

        try {
          // 1. Validar periodo
          if (!periodoStr) {
            result.error = 'Falta el campo mes_anio';
            failed.push(result);
            continue;
          }
          const periodo = periodoMap[periodoStr];
          if (!periodo) {
            result.error = `El periodo "${periodoStr}" no existe en el sistema`;
            failed.push(result);
            continue;
          }

          // 2. Validar usuario/socio
          if (!docStr) {
            result.error = 'Falta el campo documento_identidad';
            failed.push(result);
            continue;
          }
          const usuario_id = usuarioMap[docStr];
          if (!usuario_id) {
            result.error = `No se encontró un socio con documento "${docStr}"`;
            failed.push(result);
            continue;
          }

          const periodo_id = periodo.id;
          let lectura_id: number | null = null;
          let consumo = 0;
          let consumo_punta = 0;
          let cargo_energia = 0;
          let cargo_energia_punta = 0;
          let cargo_factor_potencia_calc = 0;
          let cargo_mantenimiento = 0;
          let medidor_tipo = TipoMedidor.NORMAL;

          if (medStr) {
            // 3. Validar medidor
            const medidor = medidorMap[medStr];
            if (!medidor) {
              result.error = `No se encontró el medidor "${medStr}"`;
              failed.push(result);
              continue;
            }
            if (medidor.usuario_id !== usuario_id) {
              result.error = `El medidor "${medStr}" no pertenece al socio "${docStr}"`;
              failed.push(result);
              continue;
            }

            medidor_tipo = medidor.tipo;

            // Verificar que no exista ya una lectura para este medidor+periodo
            const [existingLectura]: any = await connection.query(
              'SELECT id FROM lectura WHERE medidor_id = ? AND periodo_id = ? AND deleted_at IS NULL',
              [medidor.id, periodo_id]
            );
            if (existingLectura.length > 0) {
              result.error = `Ya existe una lectura para el medidor "${medStr}" en el periodo "${periodoStr}"`;
              failed.push(result);
              continue;
            }

            const lect_anterior = parseFloat(String(row.lectura_anterior)) || 0;
            const lect_actual = parseFloat(String(row.lectura_actual)) || 0;
            const lect_anterior_punta = parseFloat(String(row.lectura_anterior_punta)) || 0;
            const lect_actual_punta = parseFloat(String(row.lectura_actual_punta)) || 0;
            const fp = parseFloat(String(row.factor_potencia)) || 0;
            const precio_fp = parseFloat(String(row.precio_factor_potencia)) || 0;

            consumo = lect_actual - lect_anterior;
            if (consumo < 0) consumo = 0;

            consumo_punta = lect_actual_punta - lect_anterior_punta;
            if (consumo_punta < 0) consumo_punta = 0;

            // Insertar lectura
            const [lectInsert]: any = await connection.query(
              `INSERT INTO lectura (medidor_id, operario_id, periodo_id, lectura_anterior, lectura_actual, consumo_calculado,
                lectura_anterior_punta, lectura_actual_punta, factor_potencia, precio_factor_potencia, estado)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Validado')`,
              [medidor.id, admin_id, periodo_id, lect_anterior, lect_actual, consumo,
                lect_anterior_punta, lect_actual_punta, fp, precio_fp]
            );
            lectura_id = lectInsert.insertId;

            // Calcular cargos
            const tarifa_kwh = parseFloat(periodo.tarifa_kwh) || 0;
            const factor = parseFloat(periodo.factor_multiplicador) || 1;
            cargo_energia = consumo * tarifa_kwh * factor;

            const tarifa_mant = medidor_tipo === TipoMedidor.HORA_PUNTA
              ? parseFloat(periodo.tarifa_mantenimiento_tiempo_real)
              : parseFloat(periodo.tarifa_mantenimiento_normal);
            cargo_mantenimiento = tarifa_mant || 0;

            if (medidor_tipo === TipoMedidor.HORA_PUNTA) {
              const tarifa_kwh_punta = parseFloat(periodo.tarifa_kwh_punta) || 0;
              cargo_energia_punta = consumo_punta * tarifa_kwh_punta * factor;

              cargo_factor_potencia_calc = fp * precio_fp;
            }
          }

          // Cargos extra del Excel
          const cargo_fijo = parseFloat(String(row.cargo_fijo)) || (medStr ? 0 : 10.00);
          const cargo_corte = parseFloat(String(row.cargo_corte)) || 0;
          const multa_manipulacion = parseFloat(String(row.multa_manipulacion)) || 0;
          const multa_reconexion = parseFloat(String(row.multa_reconexion)) || 0;
          const deuda_vencida = parseFloat(String(row.deuda_vencida)) || 0;
          const instalacion_medidor = parseFloat(String(row.instalacion_medidor)) || 0;
          const descuento_val = parseFloat(String(row.descuento)) || 0;

          let subtotal = cargo_energia + cargo_energia_punta + cargo_factor_potencia_calc +
            cargo_mantenimiento + cargo_fijo + cargo_corte +
            multa_manipulacion + multa_reconexion + deuda_vencida + instalacion_medidor - descuento_val;
          if (subtotal < 0) subtotal = 0;

          const igv = 0;
          const total = subtotal + igv;

          const nroComprobante = `REC-${currentYear}-${String(siguienteComprobanteId++).padStart(4, '0')}`;

          const fechaEmision = periodo.fecha_emision_recibo ? new Date(periodo.fecha_emision_recibo) : new Date();
          const fechaVencimiento = periodo.fecha_vencimiento ? new Date(periodo.fecha_vencimiento) : new Date(fechaEmision.getTime() + 7 * 24 * 60 * 60 * 1000);

          // Determinar estado del recibo
          const estadoPago = String(row.estado_pago || '').trim().toLowerCase();
          const esPagado = estadoPago === 'pagado' || estadoPago === 'si' || estadoPago === 'sí';
          const estadoRecibo = esPagado ? EstadoRecibo.PAGADO : (total <= 0.02 ? EstadoRecibo.PAGADO : EstadoRecibo.PENDIENTE);

          // Insertar recibo
          const [reciboInsert]: any = await connection.query(
            `INSERT INTO recibo (
              usuario_id, periodo_id, lectura_id, numero_comprobante,
              cargo_energia, cargo_energia_punta, cargo_factor_potencia, cargo_mantenimiento,
              cargo_fijo, cargo_corte, multa_manipulacion, multa_reconexion, deuda_vencida, instalacion_medidor,
              descuento, motivo_descuento,
              subtotal, igv, total, fecha_emision, fecha_vencimiento, estado
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              usuario_id, periodo_id, lectura_id, nroComprobante,
              cargo_energia, cargo_energia_punta, cargo_factor_potencia_calc, cargo_mantenimiento,
              cargo_fijo, cargo_corte, multa_manipulacion, multa_reconexion, deuda_vencida, instalacion_medidor,
              descuento_val, descuento_val > 0 ? 'Descuento importado por Excel' : null,
              subtotal, igv, total, fechaEmision, fechaVencimiento, estadoRecibo
            ]
          );
          const recibo_id = reciboInsert.insertId;

          // Si está pagado, crear pago
          let pago_id: number | undefined;
          if (esPagado && total > 0) {
            const fechaPago = row.fecha_pago ? new Date(row.fecha_pago) : new Date();
            const metodoPago = String(row.metodo_pago || 'Efectivo').trim();
            const numOperacion = row.numero_operacion ? String(row.numero_operacion).trim() : null;

            const [pagoInsert]: any = await connection.query(
              `INSERT INTO pago (recibo_id, monto_pagado, metodo_pago, numero_operacion, fecha_pago, estado_validacion)
               VALUES (?, ?, ?, ?, ?, 'Confirmado')`,
              [recibo_id, total, metodoPago, numOperacion, fechaPago]
            );
            pago_id = pagoInsert.insertId;
          }

          result.status = 'ok';
          result.lectura_id = lectura_id || undefined;
          result.recibo_id = recibo_id;
          result.pago_id = pago_id;
          successful.push(result);

        } catch (rowError: any) {
          result.error = rowError.message || 'Error desconocido';
          failed.push(result);
        }
      }

      // Si al menos una fila fue exitosa, hacer commit
      if (successful.length > 0) {
        await connection.commit();
      } else {
        await connection.rollback();
      }

      return { successful, failed };
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  };
}
