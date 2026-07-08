import { Database } from '../config/db';
import { EstadoRecibo } from '../types/enums';


export class PagoRepository {
    constructor(private db: Database) {}
    public findAll = async (filters: any = {}, page: number = 1, limit: number = 50): Promise<any[]> => {
          const { year, periodo } = filters;
          const offset = (page - 1) * limit;

          let query = `
    SELECT p.id, p.recibo_id, p.monto_pagado, p.metodo_pago, p.numero_operacion, p.fecha_pago, p.estado_validacion,
           r.numero_comprobante, r.estado as recibo_estado, r.total as recibo_total,
           u.nombre_razonsocial as socio, u.saldo_a_favor as saldo_a_favor_socio, u.telefono,
           pf.mes_anio as periodo,
           m.num_serie as medidor_num_serie
    FROM pago p
    INNER JOIN recibo r ON p.recibo_id = r.id
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN lectura l ON r.lectura_id = l.id
    LEFT JOIN medidor m ON l.medidor_id = m.id
    WHERE 1=1
  `;

          const params = [];

          if (filters.includeAnulados === 'true' || filters.includeAnulados === true) {
            query += ` AND p.deleted_at IS NOT NULL`;
          } else {
            query += ` AND p.deleted_at IS NULL`;
          }

          if (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') {
            query += ` AND pf.mes_anio = ?`;
            params.push(periodo);
          } else if (year && periodo !== 'TodosHistorico') {
            query += ` AND pf.mes_anio LIKE ?`;
            params.push(`%${year}%`);
          }

          query += ` ORDER BY p.fecha_pago DESC LIMIT ? OFFSET ?`;
          params.push(limit, offset);

          const [rows]: any = await this.db.query(query, params);
          return rows;
        };
    public findAllNoLimit = async (filters: any = {}): Promise<any[]> => {
          const { year, periodo } = filters;

          let query = `
    SELECT p.id, p.recibo_id, p.monto_pagado, p.metodo_pago, p.numero_operacion, p.fecha_pago, p.estado_validacion,
           r.numero_comprobante, r.estado as recibo_estado, r.total as recibo_total,
           u.nombre_razonsocial as socio, u.saldo_a_favor as saldo_a_favor_socio, u.telefono,
           pf.mes_anio as periodo,
           CONCAT(m.num_serie, ' (', IF(LOWER(m.tipo) = 'tiempo real', 'Hora Punta', m.tipo), ')') as medidores_str
    FROM pago p
    INNER JOIN recibo r ON p.recibo_id = r.id
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN lectura l ON r.lectura_id = l.id
    LEFT JOIN medidor m ON l.medidor_id = m.id
    WHERE 1=1
  `;

          const params = [];

          if (filters.includeAnulados === 'true' || filters.includeAnulados === true) {
            query += ` AND p.deleted_at IS NOT NULL`;
          } else {
            query += ` AND p.deleted_at IS NULL`;
          }

          if (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') {
            query += ` AND pf.mes_anio = ?`;
            params.push(periodo);
          } else if (year && periodo !== 'TodosHistorico') {
            query += ` AND pf.mes_anio LIKE ?`;
            params.push(`%${year}%`);
          }

          query += ` ORDER BY p.fecha_pago DESC`;

          const [rows]: any = await this.db.query(query, params);
          return rows;
        };
    public findByRecibo = async (recibo_id: number): Promise<any[]> => {
          const [rows]: any = await this.db.query(`
    SELECT id, monto_pagado, metodo_pago, numero_operacion, fecha_pago, estado_validacion
    FROM pago
    WHERE recibo_id = ? AND deleted_at IS NULL
    ORDER BY fecha_pago ASC
  `, [recibo_id]);
          return rows;
        };

    public findByUsuario = async (usuario_id: number): Promise<any[]> => {
      const [rows]: any = await this.db.query(`
        SELECT p.id, p.recibo_id, p.monto_pagado, p.metodo_pago, p.numero_operacion, p.fecha_pago, p.estado_validacion,
               r.numero_comprobante, r.estado as recibo_estado, r.total as recibo_total,
               pf.mes_anio as periodo
        FROM pago p
        INNER JOIN recibo r ON p.recibo_id = r.id
        INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
        WHERE r.usuario_id = ? AND p.deleted_at IS NULL
        ORDER BY p.fecha_pago DESC
      `, [usuario_id]);
      return rows;
    };
    public createConTransaccion = async (pagoData: any, usuario_id: number): Promise<void> => {
          const { recibo_id, monto_pagado, metodo_pago, numero_operacion } = pagoData;

          const connection = await this.db.getConnection();
          await connection.beginTransaction();

          try {
            // 1. Verificar el recibo
            const [recibos]: any = await connection.query('SELECT usuario_id, periodo_id, total, estado FROM recibo WHERE id = ? FOR UPDATE', [recibo_id]);
            
            if (recibos.length === 0) {
              await connection.rollback();
              throw new Error('NOT_FOUND');
            }

            const recibo = recibos[0];

            if (recibo.estado === EstadoRecibo.PAGADO) {
              await connection.rollback();
              throw new Error('ALREADY_PAID');
            }

            // Verificar si existe un recibo más reciente para este usuario
            const [recibosNuevos]: any = await connection.query(`
      SELECT r.id 
      FROM recibo r
      INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
      INNER JOIN periodo_facturacion pf_actual ON pf_actual.id = ?
      WHERE r.usuario_id = ? AND pf.fecha_inicio > pf_actual.fecha_inicio 
        AND r.deleted_at IS NULL AND r.estado != '${EstadoRecibo.ANULADO}'
      LIMIT 1
    `, [recibo.periodo_id, recibo.usuario_id]);

            if (recibosNuevos.length > 0) {
              await connection.rollback();
              throw new Error('NEWER_RECEIPT_EXISTS');
            }

            // Calcular suma de pagos existentes
            const [pagosPrevios]: any = await connection.query('SELECT SUM(monto_pagado) as total_pagado FROM pago WHERE recibo_id = ? AND deleted_at IS NULL', [recibo_id]);
            const sumaPagos = parseFloat(pagosPrevios[0].total_pagado || 0);
            const saldoActual = parseFloat(recibo.total) - sumaPagos;
            const monto = parseFloat(monto_pagado);

            let montoExcedente = 0;
            if (monto > saldoActual + 0.02) {
              montoExcedente = monto - saldoActual;
            }

            // 2. Registrar el pago
            await connection.query('SET @current_user_id = ?', [usuario_id]);

            await connection.query(
              `INSERT INTO pago (recibo_id, monto_pagado, metodo_pago, numero_operacion, estado_validacion)
       VALUES (?, ?, ?, ?, 'Confirmado')`,
              [recibo_id, monto_pagado, metodo_pago, numero_operacion || null]
            );

            // 3. Actualizar estado del recibo
            const nuevoEstado = (saldoActual - monto) <= 0.02 ? EstadoRecibo.PAGADO : EstadoRecibo.PAGO_PARCIAL;
            
            await connection.query(
              `UPDATE recibo SET estado = ? WHERE id = ?`,
              [nuevoEstado, recibo_id]
            );

            // 3.1 Pagos en cascada (marcar recibos anteriores como pagados si se pagó el total actual)
            if (nuevoEstado === EstadoRecibo.PAGADO) {
              await connection.query(`
                UPDATE recibo r
                INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
                INNER JOIN periodo_facturacion pf_actual ON pf_actual.id = ?
                SET r.estado = '${EstadoRecibo.PAGADO}'
                WHERE r.usuario_id = ? 
                  AND pf.fecha_inicio < pf_actual.fecha_inicio
                  AND r.estado IN ('${EstadoRecibo.PENDIENTE}', '${EstadoRecibo.VENCIDO}', '${EstadoRecibo.PAGO_PARCIAL}')
                  AND r.deleted_at IS NULL
              `, [recibo.periodo_id, recibo.usuario_id]);
            }

            // 4. Actualizar saldo a favor si hay excedente
            if (montoExcedente > 0) {
              await connection.query(
                `UPDATE usuario SET saldo_a_favor = saldo_a_favor + ? WHERE id = ?`,
                [montoExcedente, recibo.usuario_id]
              );
            }

            await connection.commit();
          } catch (err) {
            await connection.rollback();
            throw err;
          } finally {
            connection.release();
          }
        };


    public anularPagoConTransaccion = async (pagoId: number, usuarioAdminId: number): Promise<void> => {
          const connection = await this.db.getConnection();
          try {
            await connection.beginTransaction();

            // 1. Obtener pago y recibo asociado
            const [pagos]: any = await connection.query(`
              SELECT p.*, r.usuario_id, r.total, r.fecha_vencimiento 
              FROM pago p 
              INNER JOIN recibo r ON p.recibo_id = r.id 
              WHERE p.id = ? AND p.deleted_at IS NULL
            `, [pagoId]);

            if (pagos.length === 0) {
              throw new Error('NOT_FOUND');
            }

            const pago = pagos[0];

            // 2. Calcular si generó excedente (saldo a favor)
            const [otrosPagos]: any = await connection.query(`
              SELECT SUM(monto_pagado) as total_otros 
              FROM pago 
              WHERE recibo_id = ? AND id != ? AND deleted_at IS NULL
            `, [pago.recibo_id, pago.id]);

            const sumaOtrosPagos = parseFloat(otrosPagos[0].total_otros || 0);
            const saldoAntes = parseFloat(pago.total) - sumaOtrosPagos;
            let excedenteGenerado = 0;
            const montoPagado = parseFloat(pago.monto_pagado);

            if (montoPagado > saldoAntes + 0.02) {
              excedenteGenerado = montoPagado - saldoAntes;
            }

            // 3. Restar saldo a favor si hubo excedente
            if (excedenteGenerado > 0) {
              await connection.query(`
                UPDATE usuario 
                SET saldo_a_favor = GREATEST(0, saldo_a_favor - ?) 
                WHERE id = ?
              `, [excedenteGenerado, pago.usuario_id]);
            }

            // 4. Anular el pago (soft delete)
            await connection.query('SET @current_user_id = ?', [usuarioAdminId]);
            await connection.query(`
              UPDATE pago 
              SET deleted_at = NOW(), estado_validacion = 'Anulado' 
              WHERE id = ?
            `, [pago.id]);

            // 5. Recalcular estado del recibo
            const saldoPendiente = parseFloat(pago.total) - sumaOtrosPagos;
            let nuevoEstado = 'Pendiente';
            
            if (saldoPendiente <= 0.02) {
              nuevoEstado = 'Pagado';
            } else if (sumaOtrosPagos > 0.02) {
              nuevoEstado = 'Pago Parcial';
            } else {
              // Si no hay pagos y ya venció
              const vencimiento = new Date(pago.fecha_vencimiento);
              if (vencimiento < new Date()) {
                nuevoEstado = 'Vencido';
              }
            }

            await connection.query(`
              UPDATE recibo SET estado = ? WHERE id = ?
            `, [nuevoEstado, pago.recibo_id]);

            await connection.commit();
          } catch (error) {
            await connection.rollback();
            throw error;
          } finally {
            connection.release();
          }
        };
}
