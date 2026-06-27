const fs = require('fs');

const path = 'src/services/reciboService.ts';
let content = fs.readFileSync(path, 'utf8');

const regexMedidoresQuery = /let queryMedidores = 'SELECT id, cobro_instalacion_pendiente FROM medidor WHERE usuario_id = \? AND deleted_at IS NULL';/g;
content = content.replace(regexMedidoresQuery, "let queryMedidores = 'SELECT id, cobro_instalacion_pendiente, tipo FROM medidor WHERE usuario_id = ? AND deleted_at IS NULL';");

const recibosPreviosRegex = /SELECT lectura_id FROM recibo/g;
content = content.replace(recibosPreviosRegex, "SELECT lectura_id, medidor_id FROM recibo");

const oldLogicRegex = /const tieneMedidor = medidores\.length > 0;([\s\S]*?)const \[usuarios\]: any = await connection\.query/g;

const newLogic = `const medidoresReales = medidores.filter((m: any) => m.tipo !== 'Sin medidor');
            const medidoresFicticios = medidores.filter((m: any) => m.tipo === 'Sin medidor');
            
            let lecturasGenerar: any[] = [];

            if (medidoresReales.length > 0) {
              let queryLecturas = \`
        SELECT l.id as lectura_id, l.consumo_calculado, l.consumo_calculado_punta, l.factor_potencia, l.precio_factor_potencia, m.usuario_id, m.id as medidor_id, m.cobro_instalacion_pendiente, m.tipo
        FROM lectura l
        INNER JOIN medidor m ON l.medidor_id = m.id
        WHERE l.periodo_id = ? AND m.usuario_id = ? AND l.deleted_at IS NULL AND m.deleted_at IS NULL AND m.tipo != 'Sin medidor'
      \`;
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
              for (const mf of medidoresFicticios) {
                const yaTieneFactura = recibosPrevios.some((r: any) => r.medidor_id === mf.id);
                if (!yaTieneFactura) {
                  lecturasGenerar.push({ isDummy: true, medidor_id: mf.id, cobro_instalacion_pendiente: mf.cobro_instalacion_pendiente });
                }
              }
            } else if (medidores.length === 0) {
               const yaTieneFactura = recibosPrevios.some((r: any) => r.lectura_id === null && r.medidor_id === null);
               if (!yaTieneFactura) {
                 lecturasGenerar.push({ isDummy: true, medidor_id: null, cobro_instalacion_pendiente: false });
               }
            }
            
            if (lecturasGenerar.length === 0) {
                await connection.rollback();
                throw new Error('El usuario ya tiene facturas generadas para todos sus medidores en este periodo.');
            }

            const [usuarios]: any = await connection.query`;

content = content.replace(oldLogicRegex, newLogic);

const oldLoopConditionRegex = /if \(lectura\) {/g;
content = content.replace(oldLoopConditionRegex, "if (lectura && !lectura.isDummy) {");

const oldElseInstallRegex = /} else {\s*cargo_fijo = 10\.00;\s*}/g;
content = content.replace(oldElseInstallRegex, "} else {\n                cargo_fijo = 10.00;\n                if (lectura && lectura.cobro_instalacion_pendiente) {\n                  instalacion_medidor = instalacion_base;\n                }\n              }");

const oldInsertRegex = /lectura \? lectura\.lectura_id : null,\s*lectura \? lectura\.medidor_id : targetMedidorId,/g;
content = content.replace(oldInsertRegex, "lectura && !lectura.isDummy ? lectura.lectura_id : null,\n                lectura && !lectura.isDummy ? lectura.medidor_id : (lectura ? lectura.medidor_id : targetMedidorId),");

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed!');
