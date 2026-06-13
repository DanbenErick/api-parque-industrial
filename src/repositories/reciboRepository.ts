import db from '../config/db';

export const findAll = async (filters: any = {}, page: number = 1, limit: number = 50) => {
  const { year, periodo, estado, search } = filters;
  const offset = (page - 1) * limit;
  
  let query = `
    SELECT r.id, r.numero_comprobante, r.cargo_energia, r.cargo_energia_punta, r.cargo_factor_potencia, r.cargo_mantenimiento,
           r.cargo_fijo, r.cargo_corte, r.multa_manipulacion, r.multa_reconexion, r.instalacion_medidor,
           r.deuda_pendiente, r.deuda_consumo, r.deuda_vencida, r.descuento, r.motivo_descuento,
           r.subtotal, r.igv, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado,
           (r.total - COALESCE(pagos.total_pagado, 0)) as saldo_pendiente,
           u.nombre_razonsocial as socio, u.documento_identidad, u.telefono,
           pf.mes_anio as periodo
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
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
    query += ` AND (LOWER(u.nombre_razonsocial) LIKE LOWER(?) OR u.documento_identidad LIKE ? OR r.numero_comprobante LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ` ORDER BY r.fecha_emision DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows] = await db.query(query, params);
  return rows;
};

export const getStats = async (filters: any = {}) => {
  const { year, periodo, estado, search } = filters;
  
  let query = `
    SELECT 
      SUM(CASE WHEN r.estado = 'Pagado' THEN r.total ELSE COALESCE(pagos.total_pagado, 0) END) as totalRecaudado,
      SUM(CASE WHEN r.estado IN ('Pendiente', 'Pago Parcial') THEN (r.total - COALESCE(pagos.total_pagado, 0)) ELSE 0 END) as pendienteCobro,
      COUNT(DISTINCT CASE WHEN r.estado IN ('Pendiente', 'Pago Parcial') THEN r.usuario_id ELSE NULL END) as usuariosPendientes,
      SUM(CASE WHEN r.estado = 'Vencido' THEN (r.total - COALESCE(pagos.total_pagado, 0)) ELSE 0 END) as deudaVencida,
      COUNT(DISTINCT CASE WHEN r.estado = 'Vencido' THEN r.usuario_id ELSE NULL END) as usuariosVencidos
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
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
    query += ` AND (LOWER(u.nombre_razonsocial) LIKE LOWER(?) OR u.documento_identidad LIKE ? OR r.numero_comprobante LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  const [rows]: any = await db.query(query, params);
  return rows[0] || {
    totalRecaudado: 0,
    pendienteCobro: 0,
    usuariosPendientes: 0,
    deudaVencida: 0,
    usuariosVencidos: 0
  };
};

export const findByUsuario = async (usuarioId: any) => {
  const [rows] = await db.query(`
    SELECT r.id, r.numero_comprobante, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado,
           pf.mes_anio as periodo
    FROM recibo r
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    WHERE r.usuario_id = ? AND r.deleted_at IS NULL
    ORDER BY r.fecha_vencimiento DESC
  `, [usuarioId]);
  return rows;
};

export const generarMasivamente = async (periodo_id: any, admin_id: any) => {
  const connection: any = await db.getConnection();
  await connection.beginTransaction();

  try {
    const [periodos]: any = await connection.query('SELECT mes_anio, tarifa_kwh, tarifa_kwh_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, factor_multiplicador FROM periodo_facturacion WHERE id = ?', [periodo_id]);
    if (periodos.length === 0) {
        await connection.rollback();
        throw new Error('Período no encontrado');
    }
    const periodo = periodos[0];

    const [configs]: any = await connection.query('SELECT monto_instalacion_base FROM configuracion LIMIT 1');
    const config = configs[0] || { monto_instalacion_base: 0 };
    const instalacion_base = parseFloat(config.monto_instalacion_base) || 0;

    const [lecturas]: any = await connection.query(`
      SELECT l.id as lectura_id, l.consumo_calculado, l.consumo_calculado_punta, l.factor_potencia, l.precio_factor_potencia, m.usuario_id, m.id as medidor_id, m.cobro_instalacion_pendiente, m.tipo
      FROM lectura l
      INNER JOIN medidor m ON l.medidor_id = m.id
      WHERE l.periodo_id = ? AND l.deleted_at IS NULL AND m.deleted_at IS NULL
    `, [periodo_id]);

    const [usuariosSinMedidor]: any = await connection.query(`
      SELECT u.id as usuario_id
      FROM usuario u
      LEFT JOIN medidor m ON m.usuario_id = u.id AND m.deleted_at IS NULL
      WHERE u.rol_id = 3 AND u.es_activo = TRUE AND u.deleted_at IS NULL AND m.id IS NULL
    `);

    const [recibosExistentes]: any = await connection.query("SELECT usuario_id FROM recibo WHERE periodo_id = ? AND deleted_at IS NULL AND estado != 'Anulado'", [periodo_id]);
    const usuariosConRecibo = new Set(recibosExistentes.map((r: any) => r.usuario_id));
    const lecturasAProcesar = lecturas.filter((l: any) => !usuariosConRecibo.has(l.usuario_id));
    const usuariosSinMedidorAProcesar = usuariosSinMedidor.filter((u: any) => !usuariosConRecibo.has(u.usuario_id));

    const [saldos]: any = await connection.query('SELECT id, saldo_a_favor FROM usuario WHERE saldo_a_favor > 0 AND deleted_at IS NULL');
    const saldoMap: any = {};
    saldos.forEach((s: any) => { saldoMap[s.id] = parseFloat(s.saldo_a_favor) || 0; });
    const originalSaldoMap = { ...saldoMap };

    const [deudas]: any = await connection.query(`
      SELECT r.usuario_id, SUM((r.total - r.deuda_vencida) - COALESCE(p.pagado, 0)) as deuda_total 
      FROM recibo r
      INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
      LEFT JOIN (
        SELECT recibo_id, SUM(monto_pagado) as pagado
        FROM pago
        WHERE deleted_at IS NULL
        GROUP BY recibo_id
      ) p ON p.recibo_id = r.id
      WHERE r.estado IN ('Pendiente', 'Vencido', 'Pago Parcial') AND r.deleted_at IS NULL
        AND pf.mes_anio < ?
      GROUP BY r.usuario_id
    `, [periodo.mes_anio]);
    
    const deudaMap: any = {};
    deudas.forEach((d: any) => { deudaMap[d.usuario_id] = parseFloat(d.deuda_total) || 0; });

    let procesados = 0;
    
    const currentYear = new Date().getFullYear();
    const [maxNum]: any = await connection.query(
      `SELECT MAX(CAST(SUBSTRING_INDEX(numero_comprobante, '-', -1) AS UNSIGNED)) as ultimo 
       FROM recibo WHERE numero_comprobante LIKE ?`, 
      [`REC-${currentYear}-%`]
    );
    let siguienteComprobanteId = (maxNum[0]?.ultimo || 0) + 1;

    const valuesToInsert = [];
    const medidoresToUpdate = [];

    for (const lectura of lecturasAProcesar) {
      const consumo = parseFloat(lectura.consumo_calculado) || 0;
      const tarifa_kwh = parseFloat(periodo.tarifa_kwh) || 0;
      const tarifa_mantenimiento = lectura.tipo === 'Tiempo Real' ? parseFloat(periodo.tarifa_mantenimiento_tiempo_real) : parseFloat(periodo.tarifa_mantenimiento_normal);
      
      const cargo_energia = consumo * tarifa_kwh;
      const cargo_mantenimiento = tarifa_mantenimiento || 0;

      let cargo_energia_punta = 0;
      let cargo_factor_potencia = 0;

      if (lectura.tipo === 'Tiempo Real') {
        const consumo_punta = parseFloat(lectura.consumo_calculado_punta) || 0;
        const tarifa_kwh_punta = parseFloat(periodo.tarifa_kwh_punta) || 0;
        cargo_energia_punta = consumo_punta * tarifa_kwh_punta;

        const consumo_reactivo = parseFloat(lectura.factor_potencia) || 0;
        const tarifa_reactiva = parseFloat(lectura.precio_factor_potencia) || 0;
        cargo_factor_potencia = consumo_reactivo * tarifa_reactiva;
      }
      
      const deuda_vencida = deudaMap[lectura.usuario_id] || 0;

      let instalacion_medidor = 0;
      if (lectura.cobro_instalacion_pendiente) {
        instalacion_medidor = instalacion_base;
        medidoresToUpdate.push(lectura.medidor_id);
      }

      let subtotal = cargo_energia + cargo_energia_punta + cargo_factor_potencia + cargo_mantenimiento + deuda_vencida + instalacion_medidor;
      
      let descuento = 0;
      let motivo_descuento = null;
      if (saldoMap[lectura.usuario_id] > 0 && subtotal > 0) {
        if (saldoMap[lectura.usuario_id] >= subtotal) {
          descuento = subtotal;
          saldoMap[lectura.usuario_id] -= subtotal;
        } else {
          descuento = saldoMap[lectura.usuario_id];
          saldoMap[lectura.usuario_id] = 0;
        }
        motivo_descuento = 'Saldo a favor aplicado';
        subtotal -= descuento;
      }

      const igv = 0;
      const total = subtotal + igv;
      const estado = total <= 0.02 ? 'Pagado' : 'Pendiente';

      const fechaEmision = new Date();
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);

      const nroComprobante = `REC-${currentYear}-${String(siguienteComprobanteId++).padStart(4, '0')}`;

      valuesToInsert.push([
        lectura.usuario_id, periodo_id, lectura.lectura_id, nroComprobante,
        cargo_energia, cargo_energia_punta, cargo_factor_potencia, cargo_mantenimiento, 0, deuda_vencida, instalacion_medidor, subtotal, igv, total,
        fechaEmision, fechaVencimiento, estado, descuento, motivo_descuento
      ]);
      
      procesados++;
    }

    for (const u of usuariosSinMedidorAProcesar) {
      const cargo_energia = 0;
      const cargo_energia_punta = 0;
      const cargo_factor_potencia = 0;
      const cargo_mantenimiento = 0;
      const cargo_fijo = 10.00;
      
      const deuda_vencida = deudaMap[u.usuario_id] || 0;
      const instalacion_medidor = 0;

      let subtotal = cargo_energia + cargo_mantenimiento + cargo_fijo + deuda_vencida + instalacion_medidor;
      
      let descuento = 0;
      let motivo_descuento = null;
      if (saldoMap[u.usuario_id] > 0 && subtotal > 0) {
        if (saldoMap[u.usuario_id] >= subtotal) {
          descuento = subtotal;
          saldoMap[u.usuario_id] -= subtotal;
        } else {
          descuento = saldoMap[u.usuario_id];
          saldoMap[u.usuario_id] = 0;
        }
        motivo_descuento = 'Saldo a favor aplicado';
        subtotal -= descuento;
      }

      const igv = 0;
      const total = subtotal + igv;
      const estado = total <= 0.02 ? 'Pagado' : 'Pendiente';

      const fechaEmision = new Date();
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);

      const nroComprobante = `REC-${currentYear}-${String(siguienteComprobanteId++).padStart(4, '0')}`;

      valuesToInsert.push([
        u.usuario_id, periodo_id, null, nroComprobante,
        cargo_energia, cargo_energia_punta, cargo_factor_potencia, cargo_mantenimiento, cargo_fijo, deuda_vencida, instalacion_medidor, subtotal, igv, total,
        fechaEmision, fechaVencimiento, estado, descuento, motivo_descuento
      ]);
      
      procesados++;
    }
    
    if (valuesToInsert.length > 0) {
      await connection.query(`
        INSERT INTO recibo (
          usuario_id, periodo_id, lectura_id, numero_comprobante, 
          cargo_energia, cargo_energia_punta, cargo_factor_potencia, cargo_mantenimiento, cargo_fijo, deuda_vencida, instalacion_medidor, subtotal, igv, total, 
          fecha_emision, fecha_vencimiento, estado, descuento, motivo_descuento
        ) VALUES ?
      `, [valuesToInsert]);
    }
    
    if (medidoresToUpdate.length > 0) {
      const placeholders = medidoresToUpdate.map(() => '?').join(',');
      await connection.query(`UPDATE medidor SET cobro_instalacion_pendiente = FALSE WHERE id IN (${placeholders})`, medidoresToUpdate);
    }

    for (const [uid, currentSaldo] of Object.entries(saldoMap)) {
      if (originalSaldoMap[uid] !== currentSaldo) {
        await connection.query('UPDATE usuario SET saldo_a_favor = ? WHERE id = ?', [currentSaldo, uid]);
      }
    }

    await connection.commit();
    return `Proceso completado. Se generaron ${procesados} recibos.`;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const findByIdCompleto = async (id: any) => {
  const [rows]: any = await db.query(`
    SELECT r.id, r.numero_comprobante, r.cargo_energia, r.cargo_energia_punta, r.cargo_factor_potencia, r.cargo_mantenimiento,
           r.cargo_fijo, r.cargo_corte, r.multa_manipulacion, r.multa_reconexion, r.instalacion_medidor,
           r.deuda_pendiente, r.deuda_consumo, r.deuda_vencida, r.descuento, r.motivo_descuento,
           r.subtotal, r.igv, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado, r.periodo_id,
           (r.total - COALESCE(pagos.total_pagado, 0)) as saldo_pendiente,
           u.id as usuario_id, u.nombre_razonsocial, u.documento_identidad, u.direccion as socio_direccion, u.correo as socio_email,
           u.direccion, u.telefono, u.correo,
           m.num_serie as num_medidor,
           l.lectura_actual, l.lectura_anterior, l.consumo_calculado, l.lectura_actual_punta, l.lectura_anterior_punta, l.consumo_calculado_punta, l.factor_potencia, l.precio_factor_potencia, l.fecha_registro,
           pf.mes_anio, pf.tarifa_kwh, pf.tarifa_kwh_punta, pf.tarifa_mantenimiento_normal, pf.tarifa_mantenimiento_tiempo_real, pf.factor_multiplicador,
           pf.fecha_inicio as periodo_inicio, pf.fecha_fin as periodo_fin
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN (
      SELECT recibo_id, SUM(monto_pagado) as total_pagado 
      FROM pago 
      WHERE deleted_at IS NULL 
      GROUP BY recibo_id
    ) pagos ON pagos.recibo_id = r.id
    LEFT JOIN medidor m ON m.usuario_id = u.id AND m.deleted_at IS NULL
    LEFT JOIN lectura l ON l.medidor_id = m.id AND l.periodo_id = pf.id AND l.deleted_at IS NULL
    WHERE r.id = ? AND r.deleted_at IS NULL
    LIMIT 1
  `, [id]);
  if (rows.length === 0) return null;
  
  const recibo = rows[0];
  const [cargos_dinamicos]: any = await db.query('SELECT * FROM recibo_cargo_dinamico WHERE recibo_id = ? ORDER BY fecha_aplicacion ASC', [id]);
  recibo.cargos_dinamicos = cargos_dinamicos;
  
  return recibo;
};

export const findHistorialConsumo = async (usuarioId: any, limit: number = 6, fechaMaxima: any = null) => {
  let query = `
    SELECT l.consumo_calculado, pf.mes_anio
    FROM lectura l
    INNER JOIN medidor m ON l.medidor_id = m.id
    INNER JOIN periodo_facturacion pf ON l.periodo_id = pf.id
    WHERE m.usuario_id = ? AND l.deleted_at IS NULL
  `;
  const params: any[] = [usuarioId];
  if (fechaMaxima) {
    query += ` AND pf.fecha_inicio <= ?`;
    params.push(fechaMaxima);
  }
  query += ` ORDER BY pf.fecha_inicio DESC LIMIT ?`;
  params.push(limit);

  const [rows]: any = await db.query(query, params);
  return rows.reverse();
};

export const findHistorialConsumoMultiple = async (usuarioIds: any[], limit: number = 7) => {
  if (!usuarioIds || usuarioIds.length === 0) return {};
  
  const placeholders = usuarioIds.map(() => '?').join(',');
  
  const query = `
    WITH RankedReadings AS (
      SELECT m.usuario_id, l.consumo_calculado, pf.mes_anio,
             ROW_NUMBER() OVER(PARTITION BY m.usuario_id ORDER BY pf.fecha_inicio DESC) as rn
      FROM lectura l
      INNER JOIN medidor m ON l.medidor_id = m.id
      INNER JOIN periodo_facturacion pf ON l.periodo_id = pf.id
      WHERE m.usuario_id IN (${placeholders}) AND l.deleted_at IS NULL
    )
    SELECT * FROM RankedReadings WHERE rn <= ?
  `;
  
  const params = [...usuarioIds, limit];
  const [rows]: any = await db.query(query, params);
  
  const result: any = {};
  rows.forEach((row: any) => {
    if (!result[row.usuario_id]) {
      result[row.usuario_id] = [];
    }
    result[row.usuario_id].push({
      consumo_calculado: row.consumo_calculado,
      mes_anio: row.mes_anio
    });
  });
  
  Object.keys(result).forEach(key => {
    result[key] = result[key].reverse();
  });
  
  return result;
};

export const findAllCompletos = async (filters: any = {}) => {
  const { year, periodo, estado, search } = filters;
  
  let query = `
    SELECT r.id, r.numero_comprobante, r.cargo_energia, r.cargo_mantenimiento,
           r.cargo_fijo, r.cargo_corte, r.multa_manipulacion, r.multa_reconexion, r.instalacion_medidor,
           r.deuda_pendiente, r.deuda_consumo, r.deuda_vencida, r.descuento, r.motivo_descuento,
           r.subtotal, r.igv, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado,
           (r.total - COALESCE(pagos.total_pagado, 0)) as saldo_pendiente,
           u.id as usuario_id, u.nombre_razonsocial, u.documento_identidad, u.direccion as socio_direccion, u.correo as socio_email,
           u.direccion, u.telefono, u.correo,
           m.num_serie as num_medidor,
           l.lectura_actual, l.lectura_anterior, l.consumo_calculado, l.fecha_registro,
           pf.mes_anio, pf.tarifa_kwh, pf.tarifa_mantenimiento_normal, pf.tarifa_mantenimiento_tiempo_real, pf.factor_multiplicador,
           pf.fecha_inicio as periodo_inicio, pf.fecha_fin as periodo_fin
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    LEFT JOIN (
      SELECT recibo_id, SUM(monto_pagado) as total_pagado 
      FROM pago 
      WHERE deleted_at IS NULL 
      GROUP BY recibo_id
    ) pagos ON pagos.recibo_id = r.id
    LEFT JOIN medidor m ON m.usuario_id = u.id AND m.deleted_at IS NULL
    LEFT JOIN lectura l ON l.medidor_id = m.id AND l.periodo_id = pf.id AND l.deleted_at IS NULL
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
    query += ` AND (LOWER(u.nombre_razonsocial) LIKE LOWER(?) OR u.documento_identidad LIKE ? OR r.numero_comprobante LIKE ?)`;
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ` ORDER BY r.fecha_emision DESC`;

  const [rows] = await db.query(query, params);
  return rows;
};

export const generarIndividual = async (periodo_id: any, usuario_id: any, admin_id: any) => {
  const connection: any = await db.getConnection();
  await connection.beginTransaction();

  try {
    const [periodos]: any = await connection.query('SELECT mes_anio, tarifa_kwh, tarifa_kwh_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, factor_multiplicador FROM periodo_facturacion WHERE id = ?', [periodo_id]);
    if (periodos.length === 0) {
        await connection.rollback();
        throw new Error('Período no encontrado');
    }
    const periodo = periodos[0];

    const [configs]: any = await connection.query('SELECT monto_instalacion_base FROM configuracion LIMIT 1');
    const config = configs[0] || { monto_instalacion_base: 0 };
    const instalacion_base = parseFloat(config.monto_instalacion_base) || 0;

    const [recibosPrevios]: any = await connection.query(`
      SELECT id FROM recibo 
      WHERE periodo_id = ? AND usuario_id = ? AND deleted_at IS NULL AND estado != 'Anulado'
    `, [periodo_id, usuario_id]);

    if (recibosPrevios.length > 0) {
      await connection.rollback();
      throw new Error('El usuario ya tiene una factura generada para este periodo');
    }

    const [medidores]: any = await connection.query('SELECT id, cobro_instalacion_pendiente FROM medidor WHERE usuario_id = ? AND deleted_at IS NULL', [usuario_id]);
    const tieneMedidor = medidores.length > 0;
    
    let lectura = null;

    if (tieneMedidor) {
      const [lecturas]: any = await connection.query(`
        SELECT l.id as lectura_id, l.consumo_calculado, l.consumo_calculado_punta, l.factor_potencia, l.precio_factor_potencia, m.usuario_id, m.id as medidor_id, m.cobro_instalacion_pendiente, m.tipo
        FROM lectura l
        INNER JOIN medidor m ON l.medidor_id = m.id
        WHERE l.periodo_id = ? AND m.usuario_id = ? AND l.deleted_at IS NULL AND m.deleted_at IS NULL
      `, [periodo_id, usuario_id]);

      if (lecturas.length === 0) {
        await connection.rollback();
        throw new Error('El usuario tiene medidor pero no cuenta con una lectura registrada en este periodo');
      }
      lectura = lecturas[0];
    }

    const [usuarios]: any = await connection.query('SELECT saldo_a_favor FROM usuario WHERE id = ?', [usuario_id]);
    let saldo_a_favor = parseFloat(usuarios[0]?.saldo_a_favor || 0);
    const original_saldo = saldo_a_favor;

    const [deudas]: any = await connection.query(`
      SELECT SUM(r.total - COALESCE(p.pagado, 0)) as deuda_total 
      FROM recibo r
      INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
      LEFT JOIN (
        SELECT recibo_id, SUM(monto_pagado) as pagado
        FROM pago
        WHERE deleted_at IS NULL
        GROUP BY recibo_id
      ) p ON p.recibo_id = r.id
      WHERE r.usuario_id = ? AND r.estado IN ('Pendiente', 'Vencido', 'Pago Parcial') AND r.deleted_at IS NULL
        AND pf.mes_anio < ?
    `, [usuario_id, periodo.mes_anio]);
    
    const deuda_vencida = parseFloat(deudas[0].deuda_total) || 0;

    let consumo = 0;
    let cargo_energia = 0;
    let cargo_energia_punta = 0;
    let cargo_factor_potencia = 0;
    let cargo_mantenimiento = 0;
    let cargo_fijo = 0;
    let instalacion_medidor = 0;

    if (tieneMedidor) {
      consumo = parseFloat(lectura.consumo_calculado) || 0;
      const tarifa_kwh = parseFloat(periodo.tarifa_kwh) || 0;
      const tarifa_mantenimiento = lectura.tipo === 'Tiempo Real' ? parseFloat(periodo.tarifa_mantenimiento_tiempo_real) : parseFloat(periodo.tarifa_mantenimiento_normal);
      
      cargo_energia = consumo * tarifa_kwh;
      cargo_mantenimiento = tarifa_mantenimiento || 0;

      if (lectura.tipo === 'Tiempo Real') {
        const consumo_punta = parseFloat(lectura.consumo_calculado_punta) || 0;
        const tarifa_kwh_punta = parseFloat(periodo.tarifa_kwh_punta) || 0;
        cargo_energia_punta = consumo_punta * tarifa_kwh_punta;
        
        const consumo_reactivo = parseFloat(lectura.factor_potencia) || 0;
        const tarifa_reactiva = parseFloat(lectura.precio_factor_potencia) || 0;
        cargo_factor_potencia = consumo_reactivo * tarifa_reactiva;
      }

      if (lectura.cobro_instalacion_pendiente) {
        instalacion_medidor = instalacion_base;
      }
    } else {
      cargo_fijo = 10.00;
    }

    let subtotal = cargo_energia + cargo_energia_punta + cargo_factor_potencia + cargo_mantenimiento + cargo_fijo + deuda_vencida + instalacion_medidor;
    
    let descuento = 0;
    let motivo_descuento = null;
    if (saldo_a_favor > 0 && subtotal > 0) {
      if (saldo_a_favor >= subtotal) {
        descuento = subtotal;
        saldo_a_favor -= subtotal;
      } else {
        descuento = saldo_a_favor;
        saldo_a_favor = 0;
      }
      motivo_descuento = 'Saldo a favor aplicado';
      subtotal -= descuento;
    }

    const igv = 0;
    const total = subtotal + igv;
    const estado = total <= 0.02 ? 'Pagado' : 'Pendiente';

    const fechaEmision = new Date();
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);

    const currentYear = new Date().getFullYear();
    const [maxNum]: any = await connection.query(
      `SELECT MAX(CAST(SUBSTRING_INDEX(numero_comprobante, '-', -1) AS UNSIGNED)) as ultimo 
       FROM recibo WHERE numero_comprobante LIKE ?`, 
      [`REC-${currentYear}-%`]
    );
    let siguienteComprobanteId = (maxNum[0]?.ultimo || 0) + 1;
    const nroComprobante = `REC-${currentYear}-${String(siguienteComprobanteId).padStart(4, '0')}`;

    await connection.query(`
      INSERT INTO recibo (
        usuario_id, periodo_id, lectura_id, numero_comprobante, 
        cargo_energia, cargo_energia_punta, cargo_factor_potencia, cargo_mantenimiento, cargo_fijo, deuda_vencida, instalacion_medidor, subtotal, igv, total, 
        fecha_emision, fecha_vencimiento, estado, descuento, motivo_descuento
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      usuario_id, periodo_id, lectura ? lectura.lectura_id : null, nroComprobante,
      cargo_energia, cargo_energia_punta, cargo_factor_potencia, cargo_mantenimiento, cargo_fijo, deuda_vencida, instalacion_medidor, subtotal, igv, total,
      fechaEmision, fechaVencimiento, estado, descuento, motivo_descuento
    ]);
    
    if (tieneMedidor && lectura?.cobro_instalacion_pendiente) {
      await connection.query('UPDATE medidor SET cobro_instalacion_pendiente = FALSE WHERE id = ?', [lectura.medidor_id]);
    }

    if (saldo_a_favor !== original_saldo) {
      await connection.query('UPDATE usuario SET saldo_a_favor = ? WHERE id = ?', [saldo_a_favor, usuario_id]);
    }

    await connection.commit();
    return 'Factura individual generada exitosamente';
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const findAllSinMedidor = async (filters: any = {}) => {
  const { year, periodo } = filters;
  let query = `
    SELECT r.id, r.numero_comprobante, r.cargo_energia, r.cargo_mantenimiento,
           r.cargo_fijo, r.cargo_corte, r.multa_manipulacion, r.multa_reconexion, r.instalacion_medidor,
           r.deuda_vencida, r.descuento, r.motivo_descuento, r.subtotal, r.igv, r.total, r.fecha_emision, r.fecha_vencimiento, r.estado,
           u.nombre_razonsocial as socio, u.documento_identidad,
           pf.mes_anio as periodo
    FROM recibo r
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
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
  
  const [rows] = await db.query(query, params);
  return rows;
};

export const updateCargos = async (id: any, cargos: any) => {
  const { cargo_fijo, cargo_corte, multa_manipulacion, multa_reconexion, instalacion_medidor, deuda_pendiente, deuda_consumo, deuda_vencida, descuento, motivo_descuento, cargos_dinamicos } = cargos;
  
  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Obtener recibo actual
    const [rows]: any = await connection.query('SELECT cargo_energia, cargo_mantenimiento FROM recibo WHERE id = ?', [id]);
    if (rows.length === 0) throw new Error('Recibo no encontrado');
    
    const r = rows[0];
    const descuento_val = parseFloat(descuento || 0);
    
    let subtotal = parseFloat(r.cargo_energia) + parseFloat(r.cargo_mantenimiento) + 
                     parseFloat(cargo_fijo || 0) + parseFloat(cargo_corte || 0) + 
                     parseFloat(multa_manipulacion || 0) + parseFloat(multa_reconexion || 0) + 
                     parseFloat(instalacion_medidor || 0) + 
                     parseFloat(deuda_pendiente || 0) + parseFloat(deuda_consumo || 0) + 
                     parseFloat(deuda_vencida || 0);
                     
    let sumDinamicos = 0;
    if (cargos_dinamicos && Array.isArray(cargos_dinamicos)) {
      sumDinamicos = cargos_dinamicos.reduce((acc, curr) => acc + parseFloat(curr.monto || 0), 0);
    }
    subtotal += sumDinamicos;

    subtotal = subtotal - descuento_val;
    if (subtotal < 0) subtotal = 0; // Evitar subtotales negativos
                     
    const igv = 0; // Configurable
    const total = subtotal + igv;

    await connection.query(`
      UPDATE recibo 
      SET cargo_fijo = ?, cargo_corte = ?, multa_manipulacion = ?, multa_reconexion = ?, instalacion_medidor = ?,
          deuda_pendiente = ?, deuda_consumo = ?, deuda_vencida = ?,
          descuento = ?, motivo_descuento = ?,
          subtotal = ?, igv = ?, total = ?
      WHERE id = ?
    `, [
      cargo_fijo || 0, cargo_corte || 0, multa_manipulacion || 0, multa_reconexion || 0, instalacion_medidor || 0,
      deuda_pendiente || 0, deuda_consumo || 0, deuda_vencida || 0,
      descuento_val, motivo_descuento || null,
      subtotal, igv, total, id
    ]);

    // Handle cargos dinamicos
    if (cargos_dinamicos !== undefined) {
      // Borrar antiguos
      await connection.query('DELETE FROM recibo_cargo_dinamico WHERE recibo_id = ?', [id]);
      
      // Insertar nuevos
      if (cargos_dinamicos.length > 0) {
        const values = cargos_dinamicos.map((c: any) => [id, c.descripcion, c.tipo, c.monto]);
        await connection.query(`
          INSERT INTO recibo_cargo_dinamico (recibo_id, descripcion, tipo, monto)
          VALUES ?
        `, [values]);
      }
    }

    await connection.commit();
    return { subtotal, igv, total };
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const anularRecibo = async (id: any, motivo: any, admin_id: any) => {
  const connection = await db.getConnection();
  await connection.beginTransaction();
  try {
    await connection.query('SET @current_user_id = ?', [admin_id]);
    const [result]: any = await connection.query(
      `UPDATE recibo SET estado = 'Anulado', motivo_anulacion = ? WHERE id = ? AND deleted_at IS NULL`,
      [motivo, id]
    );
    await connection.commit();
    return result.affectedRows;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};


