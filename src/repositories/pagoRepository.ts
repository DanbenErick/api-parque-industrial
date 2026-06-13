import db from '../config/db';

export const findAll = async (filters: any = {}, page: number = 1, limit: number = 50): Promise<any[]> => {
  const { year, periodo } = filters;
  const offset = (page - 1) * limit;

  let query = `
    SELECT p.id, p.recibo_id, p.monto_pagado, p.metodo_pago, p.numero_operacion, p.fecha_pago, p.estado_validacion,
           r.numero_comprobante, r.estado as recibo_estado, r.total as recibo_total,
           u.nombre_razonsocial as socio,
           pf.mes_anio as periodo
    FROM pago p
    INNER JOIN recibo r ON p.recibo_id = r.id
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    WHERE p.deleted_at IS NULL
  `;

  const params = [];

  if (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') {
    query += ` AND pf.mes_anio = ?`;
    params.push(periodo);
  } else if (year && periodo !== 'TodosHistorico') {
    query += ` AND pf.mes_anio LIKE ?`;
    params.push(`%${year}%`);
  }

  query += ` ORDER BY p.fecha_pago DESC LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  const [rows]: any = await db.query(query, params);
  return rows;
};

export const findAllNoLimit = async (filters: any = {}): Promise<any[]> => {
  const { year, periodo } = filters;

  let query = `
    SELECT p.id, p.recibo_id, p.monto_pagado, p.metodo_pago, p.numero_operacion, p.fecha_pago, p.estado_validacion,
           r.numero_comprobante, r.estado as recibo_estado, r.total as recibo_total,
           u.nombre_razonsocial as socio,
           pf.mes_anio as periodo
    FROM pago p
    INNER JOIN recibo r ON p.recibo_id = r.id
    INNER JOIN usuario u ON r.usuario_id = u.id
    INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
    WHERE p.deleted_at IS NULL
  `;

  const params = [];

  if (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') {
    query += ` AND pf.mes_anio = ?`;
    params.push(periodo);
  } else if (year && periodo !== 'TodosHistorico') {
    query += ` AND pf.mes_anio LIKE ?`;
    params.push(`%${year}%`);
  }

  query += ` ORDER BY p.fecha_pago DESC`;

  const [rows]: any = await db.query(query, params);
  return rows;
};

export const findByRecibo = async (recibo_id: number): Promise<any[]> => {
  const [rows]: any = await db.query(`
    SELECT id, monto_pagado, metodo_pago, numero_operacion, fecha_pago, estado_validacion
    FROM pago
    WHERE recibo_id = ? AND deleted_at IS NULL
    ORDER BY fecha_pago ASC
  `, [recibo_id]);
  return rows;
};

export const createConTransaccion = async (pagoData: any, usuario_id: number): Promise<void> => {
  const { recibo_id, monto_pagado, metodo_pago, numero_operacion } = pagoData;

  const connection = await db.getConnection();
  await connection.beginTransaction();

  try {
    // 1. Verificar el recibo
    const [recibos]: any = await connection.query('SELECT usuario_id, periodo_id, total, estado FROM recibo WHERE id = ? FOR UPDATE', [recibo_id]);
    
    if (recibos.length === 0) {
      await connection.rollback();
      throw new Error('NOT_FOUND');
    }

    const recibo = recibos[0];

    if (recibo.estado === 'Pagado') {
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
        AND r.deleted_at IS NULL AND r.estado != 'Anulado'
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
    const nuevoEstado = (saldoActual - monto) <= 0.02 ? 'Pagado' : 'Pago Parcial';
    
    await connection.query(
      `UPDATE recibo SET estado = ? WHERE id = ?`,
      [nuevoEstado, recibo_id]
    );

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


