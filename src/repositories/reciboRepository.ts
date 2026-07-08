import { Database } from '../config/db';
import { EstadoRecibo } from '../types/enums';


export class ReciboRepository {
    constructor(private db: Database) {}

    public findHistorialPorRecibo = async (id: any): Promise<any[]> => {
        const query = `
          SELECT r.*, pf.mes_anio as periodo, u.nombre_razonsocial as socio,
                 (r.total - COALESCE(pagos.total_pagado, 0)) as saldo_pendiente
          FROM recibo r
          INNER JOIN recibo actual ON actual.id = ? 
          INNER JOIN usuario u ON r.usuario_id = u.id
          INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
          LEFT JOIN (
            SELECT recibo_id, SUM(monto_pagado) as total_pagado 
            FROM pago 
            WHERE deleted_at IS NULL 
            GROUP BY recibo_id
          ) pagos ON pagos.recibo_id = r.id
          WHERE r.usuario_id = actual.usuario_id 
            AND r.periodo_id = actual.periodo_id
            AND r.deleted_at IS NULL
          ORDER BY r.created_at DESC
        `;
        const [rows]: any = await this.db.query(query, [id]);
        return rows;
    };

    public findAll = async (filters: any = {}, page: number = 1, limit: number = 50) => {
          const { year, periodo, estado, search } = filters;
          const offset = (page - 1) * limit;
          
          let query = `
    SELECT r.id, r.numero_comprobante, r.cargo_energia, r.cargo_energia_punta, r.cargo_factor_potencia, r.cargo_mantenimiento,
           r.cargo_fijo, r.cargo_corte, r.multa_manipulacion, r.multa_reconexion, r.instalacion_medidor,
           r.deuda_pendiente, r.deuda_consumo, r.deuda_vencida, r.descuento, r.motivo_descuento,
           r.subtotal, r.igv, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado,
           (r.total - COALESCE(pagos.total_pagado, 0)) as saldo_pendiente,
           u.nombre_razonsocial as socio, u.documento_identidad, u.telefono,
           pf.mes_anio as periodo, m.num_serie as medidor_num_serie, m.tipo as medidor_tipo
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN lectura l ON r.lectura_id = l.id
    LEFT JOIN medidor m ON l.medidor_id = m.id
    LEFT JOIN (
      SELECT recibo_id, SUM(monto_pagado) as total_pagado 
      FROM pago 
      WHERE deleted_at IS NULL 
      GROUP BY recibo_id
    ) pagos ON pagos.recibo_id = r.id
    WHERE r.deleted_at IS NULL
  `;
          
          const params: any[] = [];

          if (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') {
            query += ` AND pf.mes_anio = ?`;
            params.push(periodo);
          } else if (year && periodo !== 'TodosHistorico') {
            query += ` AND pf.mes_anio LIKE ?`;
            params.push(`%${year}%`);
          }

          if (estado && estado !== 'Todos') {
            query += ` AND r.estado = ?`;
            params.push(estado);
          }

          if (search) {
            query += ` AND (LOWER(u.nombre_razonsocial) LIKE LOWER(?) OR u.documento_identidad LIKE ? OR r.numero_comprobante LIKE ? OR m.num_serie LIKE ?)`;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
          }

          query += ` ORDER BY r.fecha_emision DESC LIMIT ? OFFSET ?`;
          params.push(limit, offset);

          const [rows]: any = await this.db.query(query, params);
          return rows;
        };
    public getStats = async (filters: any = {}) => {
          const { year, periodo, estado, search } = filters;
          
          let query = `
    SELECT 
      SUM(CASE WHEN r.estado = '${EstadoRecibo.PAGADO}' THEN (r.total - r.deuda_vencida) ELSE COALESCE(pagos.total_pagado, 0) END) as totalRecaudado,
      SUM(CASE WHEN r.estado IN ('${EstadoRecibo.PENDIENTE}', '${EstadoRecibo.PAGO_PARCIAL}') THEN ((r.total - r.deuda_vencida) - COALESCE(pagos.total_pagado, 0)) ELSE 0 END) as pendienteCobro,
      COUNT(DISTINCT CASE WHEN r.estado IN ('${EstadoRecibo.PENDIENTE}', '${EstadoRecibo.PAGO_PARCIAL}') THEN r.usuario_id ELSE NULL END) as usuariosPendientes,
      SUM(CASE WHEN r.estado = '${EstadoRecibo.VENCIDO}' THEN ((r.total - r.deuda_vencida) - COALESCE(pagos.total_pagado, 0)) ELSE 0 END) as deudaVencida,
      COUNT(DISTINCT CASE WHEN r.estado = '${EstadoRecibo.VENCIDO}' THEN r.usuario_id ELSE NULL END) as usuariosVencidos
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN lectura l ON r.lectura_id = l.id
    LEFT JOIN medidor m ON l.medidor_id = m.id
    LEFT JOIN (
      SELECT recibo_id, SUM(monto_pagado) as total_pagado 
      FROM pago 
      WHERE deleted_at IS NULL 
      GROUP BY recibo_id
    ) pagos ON pagos.recibo_id = r.id
    WHERE r.deleted_at IS NULL
  `;
          
          const params: any[] = [];

          if (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') {
            query += ` AND pf.mes_anio = ?`;
            params.push(periodo);
          } else if (year && periodo !== 'TodosHistorico') {
            query += ` AND pf.mes_anio LIKE ?`;
            params.push(`%${year}%`);
          }

          if (estado && estado !== 'Todos') {
            query += ` AND r.estado = ?`;
            params.push(estado);
          }

          if (search) {
            query += ` AND (LOWER(u.nombre_razonsocial) LIKE LOWER(?) OR u.documento_identidad LIKE ? OR r.numero_comprobante LIKE ? OR m.num_serie LIKE ?)`;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
          }

          const [rows]: any = await this.db.query(query, params);
          const result = rows[0] || {
            totalRecaudado: 0,
            pendienteCobro: 0,
            usuariosPendientes: 0,
            deudaVencida: 0,
            usuariosVencidos: 0
          };

          // --- Nuevos KPIs para medidores ---
          let totalMedidoresFisicos = 0;
          let sociosSinMedidor = 0;
          let faltanLecturar = 0;
          let pendientesFacturar = 0;

          const [medidores]: any = await this.db.query("SELECT COUNT(*) as c FROM medidor WHERE deleted_at IS NULL AND LOWER(tipo) != 'sin medidor'");
          totalMedidoresFisicos = medidores[0]?.c || 0;

          // Contar socios sin medidor (sin registro en medidor o con tipo = 'Sin medidor')
          const [sinMedidorCount]: any = await this.db.query(`
            SELECT COUNT(u.id) as c 
            FROM usuario u 
            INNER JOIN rol r ON u.rol_id = r.id 
            WHERE r.nombre_rol = 'Socio' AND u.deleted_at IS NULL 
            AND NOT EXISTS (
              SELECT 1 FROM medidor m 
              WHERE m.usuario_id = u.id AND m.deleted_at IS NULL AND LOWER(m.tipo) != 'sin medidor'
            )
          `);
          sociosSinMedidor = sinMedidorCount[0]?.c || 0;

          if (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') {
            const [periodoRow]: any = await this.db.query('SELECT id FROM periodo_facturacion WHERE mes_anio = ? LIMIT 1', [periodo]);
            if (periodoRow.length > 0) {
              const pid = periodoRow[0].id;
              
              const [lecturas]: any = await this.db.query('SELECT COUNT(*) as c FROM lectura WHERE periodo_id = ? AND deleted_at IS NULL', [pid]);
              const lecturasCount = lecturas[0]?.c || 0;
              faltanLecturar = Math.max(0, totalMedidoresFisicos - lecturasCount);

              const [recibos]: any = await this.db.query('SELECT COUNT(*) as c FROM recibo WHERE periodo_id = ? AND deleted_at IS NULL', [pid]);
              const recibosCount = recibos[0]?.c || 0;
              
              const metaFacturacion = totalMedidoresFisicos + sociosSinMedidor;
              pendientesFacturar = Math.max(0, metaFacturacion - recibosCount);
            }
          }

          result.totalMedidores = totalMedidoresFisicos;
          result.sociosSinMedidor = sociosSinMedidor;
          result.faltanLecturar = faltanLecturar;
          result.pendientesFacturar = pendientesFacturar;

          return result;
        };
    public findByUsuario = async (usuarioId: any) => {
          const [rows] = await this.db.query(`
    SELECT r.id, r.numero_comprobante, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado,
           pf.mes_anio as periodo, m.num_serie as medidor_num_serie, m.tipo as medidor_tipo,
           l.consumo_calculado, l.consumo_calculado_punta, r.subtotal
    FROM recibo r
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN lectura l ON r.lectura_id = l.id
    LEFT JOIN medidor m ON l.medidor_id = m.id
    WHERE r.usuario_id = ? AND r.deleted_at IS NULL
    ORDER BY r.fecha_vencimiento DESC
  `, [usuarioId]);
          return rows;
        };
    public findByIdCompleto = async (id: any) => {
          const [rows]: any = await this.db.query(`
    SELECT r.id, r.numero_comprobante, r.cargo_energia, r.cargo_energia_punta, r.cargo_factor_potencia, r.cargo_mantenimiento,
           r.cargo_fijo, r.cargo_corte, r.multa_manipulacion, r.multa_reconexion, r.instalacion_medidor,
           r.deuda_pendiente, r.deuda_consumo, r.deuda_vencida, r.descuento, r.motivo_descuento,
           r.subtotal, r.igv, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado, r.periodo_id,
           (r.total - COALESCE(pagos.total_pagado, 0)) as saldo_pendiente,
           u.id as usuario_id, u.nombre_razonsocial, u.documento_identidad, u.direccion as socio_direccion, u.correo as socio_email,
           u.direccion, u.telefono, u.correo,
           m.num_serie as num_medidor, m.id as medidor_id, m.tipo as medidor_tipo,
           l.lectura_actual, l.lectura_anterior, l.consumo_calculado, l.lectura_actual_punta, l.lectura_anterior_punta, l.consumo_calculado_punta, l.factor_potencia, l.precio_factor_potencia, l.fecha_registro,
           pf.mes_anio, pf.tarifa_kwh, pf.tarifa_kwh_punta, pf.tarifa_mantenimiento_normal, pf.tarifa_mantenimiento_tiempo_real, pf.factor_multiplicador,
           pf.fecha_inicio as periodo_inicio, pf.fecha_fin as periodo_fin, pf.fecha_corte
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN lectura l ON r.lectura_id = l.id
    LEFT JOIN medidor m ON l.medidor_id = m.id
    LEFT JOIN (
      SELECT recibo_id, SUM(monto_pagado) as total_pagado 
      FROM pago 
      WHERE deleted_at IS NULL 
      GROUP BY recibo_id
    ) pagos ON pagos.recibo_id = r.id
    WHERE r.id = ? AND r.deleted_at IS NULL
    LIMIT 1
  `, [id]);
          if (rows.length === 0) return null;
          
          const recibo = rows[0];
          const [cargos_dinamicos]: any = await this.db.query('SELECT * FROM recibo_cargo_dinamico WHERE recibo_id = ? ORDER BY fecha_aplicacion ASC', [id]);
          recibo.cargos_dinamicos = cargos_dinamicos;
          
          return recibo;
        };
    public findHistorialConsumo = async (medidorId: any, limit: number = 6, fechaMaxima: any = null) => {
          let query = `
    SELECT l.consumo_calculado, pf.mes_anio
    FROM lectura l
    INNER JOIN periodo_facturacion pf ON l.periodo_id = pf.id
    WHERE l.medidor_id = ? AND l.deleted_at IS NULL
  `;
          const params: any[] = [medidorId];
          if (fechaMaxima) {
            query += ` AND pf.fecha_inicio <= ?`;
            params.push(fechaMaxima);
          }
          query += ` ORDER BY pf.fecha_inicio DESC LIMIT ?`;
          params.push(limit);

          const [rows]: any = await this.db.query(query, params);
          return rows.reverse();
        };
    public findHistorialConsumoMultiple = async (medidorIds: any[], limit: number = 7) => {
          if (!medidorIds || medidorIds.length === 0) return {};
          
          const placeholders = medidorIds.map(() => '?').join(',');
          
          const query = `
    WITH RankedReadings AS (
      SELECT l.medidor_id, l.consumo_calculado, pf.mes_anio,
             ROW_NUMBER() OVER(PARTITION BY l.medidor_id ORDER BY pf.fecha_inicio DESC) as rn
      FROM lectura l
      INNER JOIN periodo_facturacion pf ON l.periodo_id = pf.id
      WHERE l.medidor_id IN (${placeholders}) AND l.deleted_at IS NULL
    )
    SELECT * FROM RankedReadings WHERE rn <= ?
  `;
          
          const params = [...medidorIds, limit];
          const [rows]: any = await this.db.query(query, params);
          
          const result: any = {};
          rows.forEach((row: any) => {
            if (!result[row.medidor_id]) {
              result[row.medidor_id] = [];
            }
            result[row.medidor_id].push({
              consumo_calculado: row.consumo_calculado,
              mes_anio: row.mes_anio
            });
          });
          
          Object.keys(result).forEach(key => {
            result[key] = result[key].reverse();
          });
          
          return result;
        };
    public findAllCompletos = async (filters: any = {}): Promise<any[]> => {
          const { year, periodo, estado, search } = filters;
          
          let query = `
    SELECT r.id, r.numero_comprobante, r.cargo_energia, r.cargo_mantenimiento,
           r.cargo_fijo, r.cargo_corte, r.multa_manipulacion, r.multa_reconexion, r.instalacion_medidor,
           r.deuda_pendiente, r.deuda_consumo, r.deuda_vencida, r.descuento, r.motivo_descuento,
           r.subtotal, r.igv, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado,
           (r.total - COALESCE(pagos.total_pagado, 0)) as saldo_pendiente,
           u.id as usuario_id, u.nombre_razonsocial, u.documento_identidad, u.direccion as socio_direccion, u.correo as socio_email,
           u.direccion, u.telefono, u.correo,
           m.num_serie as num_medidor, m.id as medidor_id, m.tipo as medidor_tipo,
           l.lectura_actual, l.lectura_anterior, l.consumo_calculado, l.fecha_registro,
           pf.mes_anio, pf.tarifa_kwh, pf.tarifa_mantenimiento_normal, pf.tarifa_mantenimiento_tiempo_real, pf.factor_multiplicador,
           pf.fecha_inicio as periodo_inicio, pf.fecha_fin as periodo_fin, pf.fecha_corte
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN lectura l ON r.lectura_id = l.id
    LEFT JOIN medidor m ON l.medidor_id = m.id
    LEFT JOIN (
      SELECT recibo_id, SUM(monto_pagado) as total_pagado 
      FROM pago 
      WHERE deleted_at IS NULL 
      GROUP BY recibo_id
    ) pagos ON pagos.recibo_id = r.id
    WHERE r.deleted_at IS NULL
  `;
          
          const params: any[] = [];

          if (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') {
            query += ` AND pf.mes_anio = ?`;
            params.push(periodo);
          } else if (year && year !== 'TodosHistorico') {
            query += ` AND pf.mes_anio LIKE ?`;
            params.push(`%${year}%`);
          }

          if (estado && estado !== 'Todos') {
            query += ` AND r.estado = ?`;
            params.push(estado);
          }

          if (search) {
            query += ` AND (LOWER(u.nombre_razonsocial) LIKE LOWER(?) OR u.documento_identidad LIKE ? OR r.numero_comprobante LIKE ? OR m.num_serie LIKE ?)`;
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam, searchParam);
          }

          query += ` ORDER BY r.fecha_emision DESC`;

          const [rows]: any = await this.db.query(query, params);
          return rows;
        };
    public findAllSinMedidor = async (filters: any = {}): Promise<any[]> => {
          const { year, periodo } = filters;
          let query = `
    SELECT r.id, r.numero_comprobante, r.cargo_energia, r.cargo_mantenimiento,
           r.cargo_fijo, r.cargo_corte, r.multa_manipulacion, r.multa_reconexion, r.instalacion_medidor,
           r.deuda_vencida, r.descuento, r.motivo_descuento, r.subtotal, r.igv, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado,
           u.nombre_razonsocial as socio, u.documento_identidad,
           pf.mes_anio as periodo, m.num_serie as medidor_num_serie, m.tipo as medidor_tipo
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN lectura l ON r.lectura_id = l.id
    LEFT JOIN medidor m ON m.usuario_id = u.id AND m.deleted_at IS NULL
    WHERE r.deleted_at IS NULL AND m.id IS NULL AND u.rol_id = 3
  `;
          
          const params: any[] = [];
          if (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') {
            query += ` AND pf.mes_anio = ?`;
            params.push(periodo);
          } else if (year && periodo !== 'TodosHistorico') {
            query += ` AND pf.mes_anio LIKE ?`;
            params.push(`%${year}%`);
          }

          query += ` ORDER BY u.nombre_razonsocial ASC`;
          
          const [rows]: any = await this.db.query(query, params);
          return rows;
        };
}


