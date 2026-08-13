import { Database } from '../config/db';
import { EstadoRecibo, TipoMedidor } from '../types/enums';


export class ReciboService {
    constructor(private db: Database) {}

    public generarMasivamente = async (periodo_id: any, admin_id: any) => {
          const connection: any = await this.db.getConnection();
          await connection.beginTransaction();

          try {
            await connection.query('SET @current_user_id = ?', [admin_id]);
            const [periodos]: any = await connection.query('SELECT mes_anio, tarifa_kwh, tarifa_kwh_tr, tarifa_kwh_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, factor_multiplicador, fecha_emision_recibo, fecha_vencimiento, fecha_corte, costo_potencia, costo_potencia_fuera_punta, precio_energia_reactiva FROM periodo_facturacion WHERE id = ?', [periodo_id]);
            if (periodos.length === 0) {
                await connection.rollback();
                throw new Error('Período no encontrado');
            }
            const periodo = periodos[0];

            const [configs]: any = await connection.query('SELECT monto_instalacion_base FROM configuracion LIMIT 1');
            const config = configs[0] || { monto_instalacion_base: 0 };
            const instalacion_base = parseFloat(config.monto_instalacion_base) || 0;

            const [cargosActivos]: any = await connection.query(`
              SELECT c.tipo, c.descripcion, c.monto_defecto 
              FROM catalogo_cargo c
              LEFT JOIN catalogo_cargo_periodo cp ON c.id = cp.catalogo_cargo_id AND cp.periodo_facturacion_id = ?
              WHERE c.es_activo = TRUE 
                AND c.deleted_at IS NULL
                AND (cp.periodo_facturacion_id IS NOT NULL OR c.es_global = TRUE)
            `, [periodo_id]);
            
            // Calcular total de cargos del catálogo para el subtotal (se detallarán en recibo_cargo_dinamico)
            const totalCargosDelCatalogo = cargosActivos.reduce((sum: number, c: any) => sum + (parseFloat(c.monto_defecto) || 0), 0);

            const [cargosPersonalizados]: any = await connection.query(`
              SELECT id, usuario_id, descripcion, monto
              FROM cargo_personalizado
              WHERE periodo_id = ? AND estado = 'Pendiente' AND deleted_at IS NULL
            `, [periodo_id]);
            const cargosPersonalizadosMap: any = {};
            cargosPersonalizados.forEach((c: any) => {
              if (!cargosPersonalizadosMap[c.usuario_id]) cargosPersonalizadosMap[c.usuario_id] = [];
              cargosPersonalizadosMap[c.usuario_id].push(c);
            });

            const [lecturas]: any = await connection.query(`
      SELECT l.id as lectura_id, l.consumo_calculado, l.consumo_calculado_punta, l.factor_potencia, l.precio_factor_potencia, l.max_demanda_punta, l.max_demanda_fuera_punta, m.usuario_id, m.id as medidor_id, m.cobro_instalacion_pendiente, m.tipo
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

            const [recibosExistentes]: any = await connection.query(`SELECT usuario_id, lectura_id FROM recibo WHERE periodo_id = ? AND deleted_at IS NULL AND estado != '${EstadoRecibo.ANULADO}'`, [periodo_id]);
            const lecturasFacturadas = new Set(recibosExistentes.map((r: any) => r.lectura_id).filter((id: any) => id !== null));
            const usuariosConRecibo = new Set(recibosExistentes.map((r: any) => r.usuario_id));
            
            const lecturasAProcesar = lecturas.filter((l: any) => !lecturasFacturadas.has(l.lectura_id));
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
      WHERE r.estado IN ('${EstadoRecibo.PENDIENTE}', '${EstadoRecibo.VENCIDO}', '${EstadoRecibo.PAGO_PARCIAL}') AND r.deleted_at IS NULL
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
              const esTR = lectura.tipo === TipoMedidor.HORA_PUNTA || lectura.tipo === 'Tiempo Real';
              const tarifa_kwh = esTR ? parseFloat(periodo.tarifa_kwh_tr) : parseFloat(periodo.tarifa_kwh) || 0;
              const tarifa_mantenimiento = esTR ? parseFloat(periodo.tarifa_mantenimiento_tiempo_real) : parseFloat(periodo.tarifa_mantenimiento_normal);
              
              const cargo_energia = Math.round((consumo * tarifa_kwh) * 10) / 10;
              const cargo_mantenimiento = Math.round((tarifa_mantenimiento || 0) * 10) / 10;

              let cargo_energia_punta = 0;
              let cargo_factor_potencia = 0;

              if (esTR) {
                const consumo_punta = parseFloat(lectura.consumo_calculado_punta) || 0;
                const tarifa_kwh_punta = parseFloat(periodo.tarifa_kwh_punta) || 0;
                cargo_energia_punta = Math.round((consumo_punta * tarifa_kwh_punta) * 10) / 10;

                const consumo_reactivo = parseFloat(lectura.factor_potencia) || 0;
                const tarifa_reactiva = parseFloat(periodo.precio_energia_reactiva) || 0;
                cargo_factor_potencia = Math.round((consumo_reactivo * tarifa_reactiva) * 10) / 10;
              }
              
              let deuda_vencida_aplicada = 0;
              if (deudaMap[lectura.usuario_id] > 0) {
                deuda_vencida_aplicada = deudaMap[lectura.usuario_id];
                deudaMap[lectura.usuario_id] = 0; // Prevent applying debt multiple times for the same user
              }

              let instalacion_medidor = 0;
              if (lectura.cobro_instalacion_pendiente) {
                instalacion_medidor = instalacion_base;
                medidoresToUpdate.push(lectura.medidor_id);
              }

              const cargo_fijo_total = 0; // Los cargos del catálogo se detallan en recibo_cargo_dinamico
              
              let cargo_demanda_punta = 0;
              let cargo_demanda_fuera_punta = 0;
              if (esTR) {
                const max_demanda_punta = parseFloat(lectura.max_demanda_punta) || 0;
                const max_demanda_fuera_punta = parseFloat(lectura.max_demanda_fuera_punta) || 0;
                const costo_potencia = parseFloat(periodo.costo_potencia) || 0;
                const costo_potencia_fuera_punta = parseFloat(periodo.costo_potencia_fuera_punta) || 0;
                cargo_demanda_punta = Math.round((max_demanda_punta * costo_potencia) * 10) / 10;
                cargo_demanda_fuera_punta = Math.round((max_demanda_fuera_punta * costo_potencia_fuera_punta) * 10) / 10;
              }

              const customCharges = cargosPersonalizadosMap[lectura.usuario_id] || [];
              const totalCustom = customCharges.reduce((sum: number, c: any) => sum + parseFloat(c.monto), 0);

              let subtotal = cargo_energia + cargo_energia_punta + cargo_factor_potencia + cargo_demanda_punta + cargo_demanda_fuera_punta + cargo_mantenimiento + deuda_vencida_aplicada + instalacion_medidor + totalCargosDelCatalogo + totalCustom;
              
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

              subtotal = Math.round(subtotal * 10) / 10; // Redondeo a 10 céntimos

              const igv = 0;
              const total = subtotal + igv;
              const estado = total <= 0.02 ? EstadoRecibo.PAGADO : EstadoRecibo.PENDIENTE;

              const fechaEmision = periodo.fecha_emision_recibo ? new Date(periodo.fecha_emision_recibo) : new Date();
              const fechaVencimiento = periodo.fecha_vencimiento ? new Date(periodo.fecha_vencimiento) : new Date(new Date().getTime() + 7 * 86400000);

              const nroComprobante = `REC-${currentYear}-${String(siguienteComprobanteId++).padStart(4, '0')}`;

              valuesToInsert.push([
                lectura.usuario_id, periodo_id, lectura.lectura_id, nroComprobante,
                cargo_energia, cargo_energia_punta, cargo_factor_potencia, cargo_mantenimiento, cargo_fijo_total, deuda_vencida_aplicada, instalacion_medidor, subtotal, igv, total,
                fechaEmision, fechaVencimiento, estado, descuento, motivo_descuento
              ]);
              
              procesados++;
            }

            for (const u of usuariosSinMedidorAProcesar) {
              const cargo_energia = 0;
              const cargo_energia_punta = 0;
              const cargo_factor_potencia = 0;
              const cargo_mantenimiento = 0;
              const cargo_fijo = 0; // Los cargos del catálogo se detallan en recibo_cargo_dinamico
              
              const deuda_vencida = deudaMap[u.usuario_id] || 0;
              const instalacion_medidor = 0;

              const customCharges = cargosPersonalizadosMap[u.usuario_id] || [];
              const totalCustom = customCharges.reduce((sum: number, c: any) => sum + parseFloat(c.monto), 0);

              let subtotal = cargo_energia + cargo_mantenimiento + cargo_fijo + totalCargosDelCatalogo + deuda_vencida + instalacion_medidor + totalCustom;
              
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

              subtotal = Math.round(subtotal * 10) / 10; // Redondeo a 10 céntimos

              const igv = 0;
              const total = subtotal + igv;
              const estado = total <= 0.02 ? EstadoRecibo.PAGADO : EstadoRecibo.PENDIENTE;

              const fechaEmision = periodo.fecha_emision_recibo ? new Date(periodo.fecha_emision_recibo) : new Date();
              const fechaVencimiento = periodo.fecha_vencimiento ? new Date(periodo.fecha_vencimiento) : new Date(new Date().getTime() + 7 * 86400000);

              const nroComprobante = `REC-${currentYear}-${String(siguienteComprobanteId++).padStart(4, '0')}`;

              valuesToInsert.push([
                u.usuario_id, periodo_id, null, nroComprobante,
                cargo_energia, cargo_energia_punta, cargo_factor_potencia, cargo_mantenimiento, cargo_fijo, deuda_vencida, instalacion_medidor, subtotal, igv, total,
                fechaEmision, fechaVencimiento, estado, descuento, motivo_descuento
              ]);
              
              procesados++;
            }
            
            if (valuesToInsert.length > 0) {
              const uniqueUserIds = [...new Set(valuesToInsert.map(v => v[0]))];
              if (uniqueUserIds.length > 0) {
                await connection.query(`
                  UPDATE recibo r
                  INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
                  INNER JOIN periodo_facturacion pf_actual ON pf_actual.id = ?
                  SET r.estado = '${EstadoRecibo.VENCIDO}'
                  WHERE r.estado = '${EstadoRecibo.PENDIENTE}'
                    AND pf.fecha_inicio < pf_actual.fecha_inicio
                    AND r.usuario_id IN (?)
                    AND r.deleted_at IS NULL
                `, [periodo_id, uniqueUserIds]);
              }

              const [insertBatchResult]: any = await connection.query(`
        INSERT INTO recibo (
          usuario_id, periodo_id, lectura_id, numero_comprobante, 
          cargo_energia, cargo_energia_punta, cargo_factor_potencia, cargo_mantenimiento, cargo_fijo, deuda_vencida, instalacion_medidor, subtotal, igv, total, 
          fecha_emision, fecha_vencimiento, estado, descuento, motivo_descuento
        ) VALUES ?
      `, [valuesToInsert]);

              // Insertar cargos del catálogo como líneas detalladas en recibo_cargo_dinamico
              if ((cargosActivos.length > 0 || cargosPersonalizados.length > 0) && valuesToInsert.length > 0) {
                const firstId = insertBatchResult.insertId;
                const dinamicoValues: any[] = [];
                for (let i = 0; i < valuesToInsert.length; i++) {
                  const reciboId = firstId + i;
                  const userId = valuesToInsert[i][0];
                  
                  for (const c of cargosActivos) {
                    const montoCargo = parseFloat(c.monto_defecto) || 0;
                    if (montoCargo > 0) {
                      dinamicoValues.push([reciboId, c.descripcion, c.tipo, montoCargo]);
                    }
                  }

                  const customCharges = cargosPersonalizadosMap[userId] || [];
                  for (const c of customCharges) {
                    dinamicoValues.push([reciboId, c.descripcion, 'Personalizado', parseFloat(c.monto)]);
                  }
                }
                if (dinamicoValues.length > 0) {
                  await connection.query(
                    'INSERT INTO recibo_cargo_dinamico (recibo_id, descripcion, tipo, monto) VALUES ?',
                    [dinamicoValues]
                  );
                }
              }
            }
            
            const idsToUpdate = cargosPersonalizados.map((c: any) => c.id);
            if (idsToUpdate.length > 0) {
              await connection.query('UPDATE cargo_personalizado SET estado = "Facturado" WHERE id IN (?)', [idsToUpdate]);
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
    public generarIndividual = async (periodo_id: any, usuario_id: any, admin_id: any, medidor_id: any = null) => {
          const connection: any = await this.db.getConnection();
          await connection.beginTransaction();

          try {
            await connection.query('SET @current_user_id = ?', [admin_id]);
            const [periodos]: any = await connection.query('SELECT mes_anio, tarifa_kwh, tarifa_kwh_tr, tarifa_kwh_punta, tarifa_mantenimiento_normal, tarifa_mantenimiento_tiempo_real, factor_multiplicador, fecha_emision_recibo, fecha_vencimiento, fecha_corte, costo_potencia, costo_potencia_fuera_punta, precio_energia_reactiva FROM periodo_facturacion WHERE id = ?', [periodo_id]);
            if (periodos.length === 0) {
                await connection.rollback();
                throw new Error('Período no encontrado');
            }
            const periodo = periodos[0];

            const [configs]: any = await connection.query('SELECT monto_instalacion_base FROM configuracion LIMIT 1');
            const config = configs[0] || { monto_instalacion_base: 0 };
            const instalacion_base = parseFloat(config.monto_instalacion_base) || 0;

            const [cargosActivos]: any = await connection.query(`
              SELECT c.tipo, c.descripcion, c.monto_defecto 
              FROM catalogo_cargo c
              LEFT JOIN catalogo_cargo_periodo cp ON c.id = cp.catalogo_cargo_id AND cp.periodo_facturacion_id = ?
              WHERE c.es_activo = TRUE 
                AND c.deleted_at IS NULL
                AND (cp.periodo_facturacion_id IS NOT NULL OR c.es_global = TRUE)
            `, [periodo_id]);
            
            // Calcular total de cargos del catálogo para el subtotal (se detallarán en recibo_cargo_dinamico)
            const totalCargosDelCatalogo = cargosActivos.reduce((sum: number, c: any) => sum + (parseFloat(c.monto_defecto) || 0), 0);

            const [cargosPersonalizados]: any = await connection.query(`
              SELECT id, descripcion, monto
              FROM cargo_personalizado
              WHERE periodo_id = ? AND usuario_id = ? AND estado = 'Pendiente' AND deleted_at IS NULL
            `, [periodo_id, usuario_id]);
            const totalCustom = cargosPersonalizados.reduce((sum: number, c: any) => sum + parseFloat(c.monto), 0);

            const [recibosPrevios]: any = await connection.query(`
      SELECT lectura_id FROM recibo 
      WHERE periodo_id = ? AND usuario_id = ? AND deleted_at IS NULL AND estado != '${EstadoRecibo.ANULADO}'
    `, [periodo_id, usuario_id]);
            const lecturasFacturadas = new Set(recibosPrevios.map((r: any) => r.lectura_id).filter((id: any) => id !== null));
            const tieneFacturaFija = recibosPrevios.some((r: any) => r.lectura_id === null);

            let queryMedidores = 'SELECT id, cobro_instalacion_pendiente, tipo FROM medidor WHERE usuario_id = ? AND deleted_at IS NULL';
            let paramsMedidores: any[] = [usuario_id];
            if (medidor_id) {
              queryMedidores += ' AND id = ?';
              paramsMedidores.push(medidor_id);
            }
            const [medidores]: any = await connection.query(queryMedidores, paramsMedidores);
            const medidoresReales = medidores.filter((m: any) => m.tipo.toLowerCase() !== 'sin medidor');
            const medidoresFicticios = medidores.filter((m: any) => m.tipo.toLowerCase() === 'sin medidor');
            
            let lecturasGenerar: any[] = [];

            if (medidoresReales.length > 0) {
              let queryLecturas = `
        SELECT l.id as lectura_id, l.consumo_calculado, l.consumo_calculado_punta, l.factor_potencia, l.precio_factor_potencia, l.max_demanda_punta, l.max_demanda_fuera_punta, m.usuario_id, m.id as medidor_id, m.cobro_instalacion_pendiente, m.tipo
        FROM lectura l
        INNER JOIN medidor m ON l.medidor_id = m.id
        WHERE l.periodo_id = ? AND m.usuario_id = ? AND l.deleted_at IS NULL AND m.deleted_at IS NULL AND LOWER(m.tipo) != 'sin medidor'
      `;
              let paramsLecturas: any[] = [periodo_id, usuario_id];
              if (medidor_id) {
                queryLecturas += ' AND m.id = ?';
                paramsLecturas.push(medidor_id);
              }

              const [lecturas]: any = await connection.query(queryLecturas, paramsLecturas);

              const lecturasAFiltrar = lecturas.filter((l: any) => !lecturasFacturadas.has(l.lectura_id));
              
              if (lecturasAFiltrar.length === 0 && lecturas.length > 0) {
                // Tienen lecturas pero ya facturadas, se ignoran y el error se lanza al final si lecturasGenerar queda vacío
              } else if (lecturas.length === 0) {
                // Si seleccionó un medidor específico y era real, o en bulk pero no hay NINGUNA lectura
                if (medidor_id) {
                  // Si seleccionamos específicamente este medidor real y no hay lectura
                  await connection.rollback();
                  throw new Error('El medidor seleccionado no cuenta con lecturas registradas en este periodo.');
                } else if (medidoresFicticios.length === 0) {
                  // Si no hay medidores ficticios, es un error general de falta de lectura
                  await connection.rollback();
                  throw new Error('El usuario tiene medidor pero no cuenta con lecturas registradas en este periodo.');
                }
              }
              
              lecturasGenerar = [...lecturasAFiltrar];
            }

            if (medidoresFicticios.length > 0) {
              const yaTieneFactura = recibosPrevios.some((r: any) => r.lectura_id === null);
              if (!yaTieneFactura) {
                const tieneInstalacion = medidoresFicticios.some((m: any) => m.cobro_instalacion_pendiente);
                lecturasGenerar.push({ isDummy: true, cobro_instalacion_pendiente: tieneInstalacion });
              }
            } else if (medidores.length === 0) {
               const yaTieneFactura = recibosPrevios.some((r: any) => r.lectura_id === null);
               if (!yaTieneFactura) {
                 lecturasGenerar.push({ isDummy: true, cobro_instalacion_pendiente: false });
               }
            }
            
            if (lecturasGenerar.length === 0) {
                await connection.rollback();
                throw new Error('El usuario ya tiene facturas generadas para todos sus medidores en este periodo.');
            }

            const [usuarios]: any = await connection.query('SELECT saldo_a_favor FROM usuario WHERE id = ?', [usuario_id]);
            let saldo_a_favor = parseFloat(usuarios[0]?.saldo_a_favor || 0);
            const original_saldo = saldo_a_favor;

            const [deudas]: any = await connection.query(`
      SELECT SUM((r.total - r.deuda_vencida) - COALESCE(p.pagado, 0)) as deuda_total 
      FROM recibo r
      INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
      LEFT JOIN (
        SELECT recibo_id, SUM(monto_pagado) as pagado
        FROM pago
        WHERE deleted_at IS NULL
        GROUP BY recibo_id
      ) p ON p.recibo_id = r.id
      WHERE r.usuario_id = ? AND r.estado IN ('${EstadoRecibo.PENDIENTE}', '${EstadoRecibo.VENCIDO}', '${EstadoRecibo.PAGO_PARCIAL}') AND r.deleted_at IS NULL
        AND pf.mes_anio < ?
    `, [usuario_id, periodo.mes_anio]);
            
            const currentYear = new Date().getFullYear();
            const [maxNum]: any = await connection.query(
              `SELECT MAX(CAST(SUBSTRING_INDEX(numero_comprobante, '-', -1) AS UNSIGNED)) as ultimo 
       FROM recibo WHERE numero_comprobante LIKE ?`, 
              [`REC-${currentYear}-%`]
            );
            let siguienteComprobanteId = (maxNum[0]?.ultimo || 0) + 1;

            // 1. Caducar recibos pendientes de meses anteriores para el usuario
            await connection.query(`
              UPDATE recibo r
              INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
              INNER JOIN periodo_facturacion pf_actual ON pf_actual.id = ?
              SET r.estado = '${EstadoRecibo.VENCIDO}'
              WHERE r.estado = '${EstadoRecibo.PENDIENTE}'
                AND pf.fecha_inicio < pf_actual.fecha_inicio
                AND r.usuario_id = ?
                AND r.deleted_at IS NULL
            `, [periodo_id, usuario_id]);

            let deuda_vencida_actual = parseFloat(deudas[0]?.deuda_total) || 0;
            let recibosGenerados = 0;

            for (const lectura of lecturasGenerar) {
              let consumo = 0;
              let cargo_energia = 0;
              let cargo_energia_punta = 0;
              let cargo_factor_potencia = 0;
              let cargo_mantenimiento = 0;
              let cargo_fijo = 0;
              let instalacion_medidor = 0;

              let cargo_demanda_punta = 0;
              let cargo_demanda_fuera_punta = 0;

              if (lectura && !lectura.isDummy) {
                consumo = parseFloat(lectura.consumo_calculado) || 0;
                const esTR = lectura.tipo === TipoMedidor.HORA_PUNTA || lectura.tipo === 'Tiempo Real';
                const tarifa_kwh = esTR ? parseFloat(periodo.tarifa_kwh_tr) : parseFloat(periodo.tarifa_kwh) || 0;
                const tarifa_mantenimiento = esTR ? parseFloat(periodo.tarifa_mantenimiento_tiempo_real) : parseFloat(periodo.tarifa_mantenimiento_normal);
                
                cargo_energia = Math.round((consumo * tarifa_kwh) * 10) / 10;
                cargo_mantenimiento = Math.round((tarifa_mantenimiento || 0) * 10) / 10;

                if (esTR) {
                  const consumo_punta = parseFloat(lectura.consumo_calculado_punta) || 0;
                  const tarifa_kwh_punta = parseFloat(periodo.tarifa_kwh_punta) || 0;
                  cargo_energia_punta = Math.round((consumo_punta * tarifa_kwh_punta) * 10) / 10;
                  
                  const consumo_reactivo = parseFloat(lectura.factor_potencia) || 0;
                  const tarifa_reactiva = parseFloat(periodo.precio_energia_reactiva) || 0;
                  cargo_factor_potencia = Math.round((consumo_reactivo * tarifa_reactiva) * 10) / 10;

                  const max_demanda_punta = parseFloat(lectura.max_demanda_punta) || 0;
                  const max_demanda_fuera_punta = parseFloat(lectura.max_demanda_fuera_punta) || 0;
                  const costo_potencia = parseFloat(periodo.costo_potencia) || 0;
                  const costo_potencia_fuera_punta = parseFloat(periodo.costo_potencia_fuera_punta) || 0;
                  cargo_demanda_punta = Math.round((max_demanda_punta * costo_potencia) * 10) / 10;
                  cargo_demanda_fuera_punta = Math.round((max_demanda_fuera_punta * costo_potencia_fuera_punta) * 10) / 10;
                }

                if (lectura.cobro_instalacion_pendiente) {
                  instalacion_medidor = instalacion_base;
                }
              } else {
                // cargo_fijo = 0: los cargos del catálogo se insertan en recibo_cargo_dinamico
                if (lectura && lectura.cobro_instalacion_pendiente) {
                  instalacion_medidor = instalacion_base;
                }
              }

              // Apply debt only once to the first generated receipt
              let deuda_vencida_aplicada = 0;
              if (deuda_vencida_actual > 0) {
                deuda_vencida_aplicada = deuda_vencida_actual;
                deuda_vencida_actual = 0;
              }
              
              const cargo_fijo_total = 0; // Los cargos del catálogo se detallan en recibo_cargo_dinamico

              let subtotal = cargo_energia + cargo_energia_punta + cargo_factor_potencia + cargo_demanda_punta + cargo_demanda_fuera_punta + cargo_mantenimiento + deuda_vencida_aplicada + instalacion_medidor + totalCargosDelCatalogo + totalCustom;
              
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

              subtotal = Math.round(subtotal * 10) / 10; // Redondeo a 10 céntimos

              const igv = 0;
              const total = subtotal + igv;
              const estado = total <= 0.02 ? EstadoRecibo.PAGADO : EstadoRecibo.PENDIENTE;

              const fechaEmision = periodo.fecha_emision_recibo ? new Date(periodo.fecha_emision_recibo) : new Date();
              const fechaVencimiento = periodo.fecha_vencimiento ? new Date(periodo.fecha_vencimiento) : new Date(new Date().getTime() + 7 * 86400000);

              const nroComprobante = `REC-${currentYear}-${String(siguienteComprobanteId++).padStart(4, '0')}`;

              const [insertResult]: any = await connection.query(`
        INSERT INTO recibo (
          usuario_id, periodo_id, lectura_id, numero_comprobante, 
          cargo_energia, cargo_energia_punta, cargo_factor_potencia, cargo_mantenimiento, cargo_fijo, deuda_vencida, instalacion_medidor, subtotal, igv, total, 
          fecha_emision, fecha_vencimiento, estado, descuento, motivo_descuento
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                usuario_id, periodo_id, lectura && !lectura.isDummy ? lectura.lectura_id : null, nroComprobante,
                cargo_energia, cargo_energia_punta, cargo_factor_potencia, cargo_mantenimiento, cargo_fijo_total, deuda_vencida_aplicada, instalacion_medidor, subtotal, igv, total,
                fechaEmision, fechaVencimiento, estado, descuento, motivo_descuento
              ]);

              // Insertar cargos del catálogo como líneas detalladas en recibo_cargo_dinamico
              if (cargosActivos.length > 0 || cargosPersonalizados.length > 0) {
                const reciboId = insertResult.insertId;
                const dinamicoValues: any[] = cargosActivos
                  .filter((c: any) => (parseFloat(c.monto_defecto) || 0) > 0)
                  .map((c: any) => [reciboId, c.descripcion, c.tipo, parseFloat(c.monto_defecto)]);
                
                for (const c of cargosPersonalizados) {
                  dinamicoValues.push([reciboId, c.descripcion, 'Personalizado', parseFloat(c.monto)]);
                }

                if (dinamicoValues.length > 0) {
                  await connection.query(
                    'INSERT INTO recibo_cargo_dinamico (recibo_id, descripcion, tipo, monto) VALUES ?',
                    [dinamicoValues]
                  );
                }
              }
              
              if (cargosPersonalizados.length > 0) {
                const idsToUpdate = cargosPersonalizados.map((c: any) => c.id);
                await connection.query('UPDATE cargo_personalizado SET estado = "Facturado" WHERE id IN (?)', [idsToUpdate]);
              }

              if (lectura && lectura.cobro_instalacion_pendiente) {
                await connection.query('UPDATE medidor SET cobro_instalacion_pendiente = FALSE WHERE id = ?', [lectura.medidor_id]);
              }
              
              recibosGenerados++;
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
    public updateCargos = async (id: any, cargos: any, admin_id: any) => {
          const { cargo_fijo, cargo_corte, multa_manipulacion, multa_reconexion, instalacion_medidor, deuda_pendiente, deuda_consumo, deuda_vencida, descuento, motivo_descuento, cargos_dinamicos } = cargos;
          
          const connection = await this.db.getConnection();
          await connection.beginTransaction();

          try {
            await connection.query('SET @current_user_id = ?', [admin_id]);
            // 1. Obtener recibo actual con datos de lectura y periodo para calcular cargos por demanda
            const [rows]: any = await connection.query(`
              SELECT r.cargo_energia, r.cargo_energia_punta, r.cargo_factor_potencia, r.cargo_mantenimiento,
                     l.max_demanda_punta, l.max_demanda_fuera_punta, m.tipo as medidor_tipo,
                     pf.costo_potencia, pf.costo_potencia_fuera_punta
              FROM recibo r
              LEFT JOIN lectura l ON r.lectura_id = l.id
              LEFT JOIN medidor m ON l.medidor_id = m.id
              INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
              WHERE r.id = ?
            `, [id]);
            if (rows.length === 0) throw new Error('Recibo no encontrado');
            
            const r = rows[0];
            const descuento_val = parseFloat(descuento || 0);

            let cargo_demanda_punta = 0;
            let cargo_demanda_fuera_punta = 0;
            if (r.medidor_tipo === 'Hora Punta' || r.medidor_tipo === 'Tiempo Real') {
              cargo_demanda_punta = (parseFloat(r.max_demanda_punta) || 0) * (parseFloat(r.costo_potencia) || 0);
              cargo_demanda_fuera_punta = (parseFloat(r.max_demanda_fuera_punta) || 0) * (parseFloat(r.costo_potencia_fuera_punta) || 0);
            }
            
            let subtotal = parseFloat(r.cargo_energia) + 
                             parseFloat(r.cargo_energia_punta || 0) + 
                             parseFloat(r.cargo_factor_potencia || 0) + 
                             cargo_demanda_punta + cargo_demanda_fuera_punta +
                             parseFloat(r.cargo_mantenimiento) + 
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
                             
            subtotal = Math.round(subtotal * 10) / 10; // Redondeo a 10 céntimos

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
    public anularRecibo = async (id: any, motivo: any, admin_id: any) => {
          const connection = await this.db.getConnection();
          await connection.beginTransaction();
          try {
            await connection.query('SET @current_user_id = ?', [admin_id]);
            const [result]: any = await connection.query(
              `UPDATE recibo SET estado = '${EstadoRecibo.ANULADO}', motivo_anulacion = ? WHERE id = ? AND deleted_at IS NULL`,
              [motivo, id]
            );

            // Revertir cargos personalizados a estado Pendiente
            const [reciboData]: any = await connection.query('SELECT usuario_id, periodo_id FROM recibo WHERE id = ?', [id]);
            if (reciboData && reciboData.length > 0) {
              const { usuario_id, periodo_id } = reciboData[0];
              await connection.query(`
                UPDATE cargo_personalizado 
                SET estado = 'Pendiente' 
                WHERE usuario_id = ? AND periodo_id = ? AND estado = 'Facturado'
              `, [usuario_id, periodo_id]);
            }

            await connection.commit();
            return result.affectedRows;
          } catch (error) {
            await connection.rollback();
            throw error;
          } finally {
            connection.release();
          }
        };
}
