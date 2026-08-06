import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { ReciboRepository } from '../repositories/reciboRepository';;
import { AuditoriaRepository } from '../repositories/auditoriaRepository';;
import { PagoRepository } from '../repositories/pagoRepository';;
import { UsuarioRepository } from '../repositories/usuarioRepository';;
import { EstadoRecibo } from '../types/enums';


interface IGetPagosQuery {
  year?: string;
  periodo?: string;
}

interface IGetUsuariosQuery {
  search?: string;
  rol_id?: string;
  estado?: string;
  rubro?: string;
  limit?: string;
  page?: string;
}


interface IExportReporteExcelQuery {
  year?: string;
  periodo?: string;
  estado?: string;
  search?: string;
}

export class ExcelService {
    constructor(private reciboRepo: ReciboRepository, private auditoriaRepo: AuditoriaRepository, private pagoRepo: PagoRepository, private usuarioRepo: UsuarioRepository) {}

    public buildReporteExcel = async (req: Request<{}, any, any, IExportReporteExcelQuery>, res: Response): Promise<any> => {
          try {
            const filters = {
              year: req.query.year,
              periodo: req.query.periodo,
              estado: req.query.estado,
              search: req.query.search
            };
            const recibos = await this.reciboRepo.findAll(filters, 1, 999999);

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte de Facturación');

            worksheet.columns = [
              { header: 'Apellidos y Nombres', key: 'socio', width: 45 },
              { header: 'Serie Med.', key: 'medidor', width: 15 },
              { header: 'kWH2', key: 'kwh2', width: 15 },
              { header: 'kWH1', key: 'kwh1', width: 15 },
              { header: 'kwH/mes', key: 'consumo', width: 15 },
              { header: '(S/mes)', key: 's_mes', width: 15 },
              { header: 'D. Ant.', key: 'd_ant', width: 15 },
              { header: 'Corte', key: 'corte', width: 12 },
              { header: 'Cons.', key: 'cons', width: 15 },
              { header: 'Pago', key: 'pago', width: 15 },
              { header: 'deuda', key: 'deuda', width: 15 }
            ];

            let titulo = 'CONSUMO DE ENERGÍA';
            let tarifa = '';
            if (recibos.length > 0) {
              const r0 = recibos[0] as any;
              const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
              const mesesCompletos = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
              
              if (r0.periodo_inicio && r0.periodo_fin) {
                const dInicio = new Date(r0.periodo_inicio);
                const dFin = new Date(r0.periodo_fin);
                titulo = `CONSUMO DE ENERGÍA de ${dInicio.getDate()} ${meses[dInicio.getMonth()]} al ${dFin.getDate()} de ${mesesCompletos[dFin.getMonth()]} ${dFin.getFullYear()}`;
              }
              tarifa = parseFloat(r0.tarifa_kwh || 0).toFixed(2);
            }

            worksheet.spliceRows(1, 0, []);
            worksheet.getCell('A1').value = titulo;
            // worksheet.getCell('K1').value = tarifa; (Eliminado a petición del usuario)
            worksheet.mergeCells('A1:K1');
            const titleRow = worksheet.getRow(1);
            titleRow.font = { bold: true, italic: true, size: 14, color: { argb: 'FFFFFFFF' } };
            titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
            titleRow.height = 30;
            // Fondo oscuro para el título
            for (let i = 1; i <= 11; i++) {
              titleRow.getCell(i).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
              titleRow.getCell(i).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            }

            const headerRow = worksheet.getRow(2);
            headerRow.font = { bold: true, italic: true, color: { argb: 'FFFFFFFF' } };
            headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
            headerRow.height = 25;
            headerRow.eachCell((cell) => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
              cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
            });

            (recibos as any[]).forEach((r: any) => {
              const medidor_tipo = r.medidor_tipo === 'Tiempo Real' ? 'Hora Punta' : (r.medidor_tipo || 'Normal');
              
              const fmt = (val: any) => val ? parseFloat(val) : 0;
              const empty = null;

              const deuda_ant = parseFloat(r.deuda_vencida || 0) + parseFloat(r.deuda_pendiente || 0) + parseFloat(r.deuda_consumo || 0);
              const corte = parseFloat(r.cargo_corte || 0);
              const otros_cargos_fijos = parseFloat(r.cargo_fijo || 0) + parseFloat(r.cargo_mantenimiento || 0) + parseFloat(r.multa_manipulacion || 0) + parseFloat(r.multa_reconexion || 0) + parseFloat(r.instalacion_medidor || 0) + parseFloat(r.total_cargos_dinamicos || 0);
              const pago = r.total - r.saldo_pendiente > 0 ? (r.total - r.saldo_pendiente) : empty;

              const socioNombre = r.direccion ? `${r.socio}\n(${r.direccion})` : r.socio;

              const addStyledRow = (data: any, isConsBright = false, isMedidorYellow = false, isSocioRow = false) => {
                const rObj = worksheet.addRow(data);
                
                if (data.socio && data.socio.includes('\n')) {
                  rObj.height = 35;
                }

                rObj.eachCell((cell, colNumber) => {
                  if (isSocioRow) {
                    // Borde ligeramente más oscuro para la barra separadora
                    cell.border = { 
                      top: { style: 'thin', color: { argb: 'FF94A3B8' } }, left: { style: 'thin', color: { argb: 'FF94A3B8' } }, 
                      bottom: { style: 'thin', color: { argb: 'FF94A3B8' } }, right: { style: 'thin', color: { argb: 'FF94A3B8' } } 
                    };
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
                    cell.font = { bold: true, size: 11, color: { argb: 'FF0F172A' } };
                    if (colNumber === 1) cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left', indent: 1 };
                  } else {
                    // Borde gris claro para los detalles (más limpio)
                    cell.border = { 
                      top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, 
                      bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } } 
                    };
                    
                    // Formato numérico y alineación
                    if (colNumber === 1) {
                       cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'left', indent: 2 }; // Jerarquía visual
                    } else if (colNumber === 2) {
                       cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    } else {
                       cell.alignment = { vertical: 'middle', horizontal: 'right' };
                       cell.numFmt = '#,##0.00'; // Restaurar formato nativo de Excel
                    }

                    if (colNumber === 6) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD9EAD3' } }; // Verde muy claro
                    if (colNumber === 9 && isConsBright) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF86EFAC' } }; // Verde pastel más moderno
                    if (colNumber === 11) {
                      const val = parseFloat(cell.value as string || '0');
                      if (val > 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEF4444' } }; // Rojo coral pastel para deuda
                        cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
                      }
                    }
                    if (colNumber === 2 && isMedidorYellow) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF08A' } }; // Amarillo pastel
                  }
                });
                return rObj;
              };

              const isHoraPunta = medidor_tipo === 'Hora Punta';

              // 1. Fila de Separador de Socio (Gris Completo A-K)
              const rObjSocio = addStyledRow({
                socio: socioNombre,
                medidor: empty,
                kwh2: empty, kwh1: empty, consumo: empty, s_mes: empty,
                d_ant: empty, corte: empty, cons: empty, pago: empty, deuda: empty
              }, false, false, true);
              worksheet.mergeCells(`A${rObjSocio.number}:K${rObjSocio.number}`);

              // Función auxiliar para agregar filas de cargos
              const addCargoRow = (desc: string, monto: number, isDeudaAnt = false, isCorte = false) => {
                if (monto === 0) return;
                addStyledRow({
                  socio: desc,
                  medidor: r.medidor_num_serie || '-',
                  kwh2: empty, kwh1: empty, consumo: empty,
                  s_mes: fmt(monto),
                  d_ant: isDeudaAnt ? fmt(monto) : empty,
                  corte: isCorte ? fmt(monto) : empty,
                  cons: fmt(monto),
                  pago: empty, deuda: empty
                }, true, isHoraPunta);
              };

              // 2. Desglosar Cargos Previos
              if (deuda_ant > 0) addCargoRow('Deuda Anterior', deuda_ant, true, false);
              if (corte > 0) addCargoRow('Cargo por Corte', corte, false, true);

              // 3. Cargos Fijos y Dinámicos
              const legacy_cargos = [
                { d: 'Cargo Fijo', v: parseFloat(r.cargo_fijo || 0) },
                { d: 'Mantenimiento', v: parseFloat(r.cargo_mantenimiento || 0) },
                { d: 'Multa Manipulación', v: parseFloat(r.multa_manipulacion || 0) },
                { d: 'Multa Reconexión', v: parseFloat(r.multa_reconexion || 0) },
                { d: 'Instalación Medidor', v: parseFloat(r.instalacion_medidor || 0) }
              ];
              legacy_cargos.forEach(c => addCargoRow(c.d, c.v));

              let dyn_cargos: any[] = [];
              if (r.cargos_dinamicos_json) {
                try { dyn_cargos = typeof r.cargos_dinamicos_json === 'string' ? JSON.parse(r.cargos_dinamicos_json) : r.cargos_dinamicos_json; } catch(e){}
              }
              dyn_cargos.forEach(cd => addCargoRow(cd.descripcion, parseFloat(cd.monto || 0)));

              // 4. Filas de Energía
              if (isHoraPunta) {
                const ce_fp = parseFloat(r.cargo_energia || 0);
                addStyledRow({
                  socio: 'ENERGIA ACTIVA F. P', medidor: r.medidor_num_serie || '-',
                  kwh2: fmt(r.lectura_actual), kwh1: fmt(r.lectura_anterior), consumo: fmt(r.consumo_kwh),
                  s_mes: fmt(ce_fp), d_ant: empty, corte: empty, cons: fmt(ce_fp), pago: empty, deuda: empty
                }, true, true);

                const ce_hp = parseFloat(r.cargo_energia_punta || 0);
                addStyledRow({
                  socio: 'ENERGIA ACTIVA H. P', medidor: r.medidor_num_serie || '-',
                  kwh2: fmt(r.lectura_actual_punta), kwh1: fmt(r.lectura_anterior_punta), consumo: fmt(r.consumo_kwh_punta),
                  s_mes: fmt(ce_hp), d_ant: empty, corte: empty, cons: fmt(ce_hp), pago: empty, deuda: empty
                }, true, true);

                const md_p = parseFloat(r.max_demanda_punta || 0);
                const c_pot = parseFloat(r.costo_potencia || 0);
                const c_dem = md_p * c_pot;
                addStyledRow({
                  socio: 'POTENCIA DE GENERACION', medidor: r.medidor_num_serie || '-',
                  kwh2: fmt(md_p), kwh1: empty, consumo: fmt(md_p),
                  s_mes: fmt(c_dem), d_ant: empty, corte: empty, cons: fmt(c_dem),
                  pago: pago, deuda: fmt(r.saldo_pendiente) // Última fila lleva deuda y pago
                }, true, true);

              } else {
                const ce = parseFloat(r.cargo_energia || 0);
                addStyledRow({
                  socio: 'ENERGIA ACTIVA', medidor: r.medidor_num_serie || '-',
                  kwh2: fmt(r.lectura_actual), kwh1: fmt(r.lectura_anterior), consumo: fmt(r.consumo_kwh),
                  s_mes: fmt(ce), d_ant: empty, corte: empty, cons: fmt(ce),
                  pago: pago, deuda: fmt(r.saldo_pendiente) // Última fila lleva deuda y pago
                }, true, false);
              }
            });

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Facturacion.xlsx');

            await workbook.xlsx.write(res);
            res.end();
          } catch (error: any) {
            console.error('Error al generar Excel:', error);
            res.status(500).json({ error: 'Error al generar Excel' });
          }
        };
    public buildReporteDeudasExcel = async (req: Request, res: Response): Promise<any> => {
          try {
            const { periodo } = req.query;
            
            // Para el reporte de deudas, traemos TODAS las deudas vigentes o solo las de un periodo específico
            const filtro = (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') 
              ? { periodo } 
              : { year: 'TodosHistorico' };
              
            // Vamos a buscar todos los recibos y filtrar los que tengan saldo pendiente > 0
            const recibos: any = await this.reciboRepo.findAllCompletos(filtro);
            
            // Filtramos solo los que tienen deuda Vencida
            const recibosDeuda = recibos.filter(r => r.estado === EstadoRecibo.VENCIDO);
            
            // Ordenar alfabéticamente por socio
            recibosDeuda.sort((a: any, b: any) => {
              const nameA = (a.nombre_razonsocial || '').toUpperCase();
              const nameB = (b.nombre_razonsocial || '').toUpperCase();
              return nameA.localeCompare(nameB);
            });

            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Reporte de Deudas', {
              pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
            });

            worksheet.columns = [
              { header: 'SOCIO / EMPRESA', key: 'socio', width: 35 },
              { header: 'RUC/DNI', key: 'documento', width: 15 },
              { header: 'MEDIDOR', key: 'medidor', width: 18 },
              { header: 'TIPO MEDIDOR', key: 'tipo_medidor', width: 18 },
              { header: 'PERIODO', key: 'periodo', width: 15 },
              { header: 'ESTADO', key: 'estado', width: 12 },
              { header: 'CONSUMO', key: 'consumo', width: 12 },
              { header: 'DETALLE DE CARGOS Y MULTAS', key: 'detalle', width: 45 },
              { header: 'TOTAL DEUDA (S/)', key: 'total_deuda', width: 22 }
            ];

            worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEA580C' } };
            worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

            
            const recibosDeudaIds = recibosDeuda.map((r: any) => r.id);
            let cargosDinamicosByRecibo: any = {};
            if (recibosDeudaIds.length > 0) {
              const [allDinamicos]: any = await require("../config/db").query('SELECT * FROM recibo_cargo_dinamico WHERE recibo_id IN (?)', [recibosDeudaIds]);
              allDinamicos.forEach((cd: any) => {
                if (!cargosDinamicosByRecibo[cd.recibo_id]) {
                  cargosDinamicosByRecibo[cd.recibo_id] = [];
                }
                cargosDinamicosByRecibo[cd.recibo_id].push(cd);
              });
            }

            // Agrupar por Socio
            const gruposSocios = {};
            recibosDeuda.forEach((r: any) => {
              const socioId = r.usuario_id || r.nombre_razonsocial; // fallback
              if (!gruposSocios[socioId]) {
                gruposSocios[socioId] = {
                  socio: r.nombre_razonsocial,
                  documento: r.documento_identidad,
                  recibos: []
                };
              }
              gruposSocios[socioId].recibos.push(r);
            });

            let sumaTotalDeudaGlobal = 0;
            let currentRowIdx = 2; // Row 1 is header

            for (const socioId in gruposSocios) {
              const grupo = gruposSocios[socioId];
              const startRow = currentRowIdx;
              
              // La deuda real del socio es el saldo pendiente de su recibo MÁS RECIENTE
              // Porque el sistema arrastra la deuda a "deuda_vencida" del nuevo recibo.
              // Ordenamos los recibos del socio por fecha de emisión descendente para hallar el más reciente
              grupo.recibos.sort((a: any, b: any) => new Date(b.fecha_emision).getTime() - new Date(a.fecha_emision).getTime());
              const reciboMasReciente = grupo.recibos[0];
              const totalDeudaSocio = parseFloat(reciboMasReciente.saldo_pendiente || reciboMasReciente.total);
              
              sumaTotalDeudaGlobal += totalDeudaSocio;

              // Imprimir filas (podemos imprimirlas cronológicamente)
              const recibosCronologicos = [...grupo.recibos].sort((a: any, b: any) => new Date(a.fecha_emision).getTime() - new Date(b.fecha_emision).getTime());

              recibosCronologicos.forEach((r: any) => {
                let lineasDetalle = [];
                if (parseFloat(r.cargo_energia || 0) > 0) lineasDetalle.push(`• Energía: S/ ${parseFloat(r.cargo_energia).toFixed(2)}`);
                if (parseFloat(r.cargo_fijo || 0) > 0) lineasDetalle.push(`• Cargo Fijo: S/ ${parseFloat(r.cargo_fijo).toFixed(2)}`);
                if (parseFloat(r.cargo_mantenimiento || 0) > 0) lineasDetalle.push(`• Mantenimiento: S/ ${parseFloat(r.cargo_mantenimiento).toFixed(2)}`);
                if (parseFloat(r.multa_manipulacion || 0) > 0) lineasDetalle.push(`• Multa Manipulación: S/ ${parseFloat(r.multa_manipulacion).toFixed(2)}`);
                if (parseFloat(r.multa_reconexion || 0) > 0) lineasDetalle.push(`• Multa Reconexión: S/ ${parseFloat(r.multa_reconexion).toFixed(2)}`);
                if (parseFloat(r.cargo_corte || 0) > 0) lineasDetalle.push(`• Cargo por Corte: S/ ${parseFloat(r.cargo_corte).toFixed(2)}`);
                if (parseFloat(r.instalacion_medidor || 0) > 0) lineasDetalle.push(`• Inst. Medidor: S/ ${parseFloat(r.instalacion_medidor).toFixed(2)}`);
                
                const dinamicos: any = cargosDinamicosByRecibo[r.id] || [];
                dinamicos.forEach((cd: any) => {
                  lineasDetalle.push(`• ${cd.descripcion}: S/ ${parseFloat(cd.monto).toFixed(2)}`);
                });

                if (parseFloat(r.descuento || 0) > 0) lineasDetalle.push(`• DESCUENTO: -S/ ${parseFloat(r.descuento).toFixed(2)}`);
                if (parseFloat(r.igv || 0) > 0) lineasDetalle.push(`• IGV (18%): S/ ${parseFloat(r.igv).toFixed(2)}`);

                const strDetalle = lineasDetalle.join('\n');
                const row = worksheet.addRow({
                  socio: grupo.socio,
                  documento: grupo.documento,
                  medidor: r.medidor_num_serie || 'Sin medidor',
                  tipo_medidor: r.medidor_tipo === 'Tiempo Real' ? 'Hora Punta' : (r.medidor_tipo || '-'),
                  periodo: r.mes_anio,
                  estado: r.estado,
                  consumo: `${parseFloat(r.consumo_calculado || 0).toFixed(2)} kWh`,
                  detalle: strDetalle,
                  total_deuda: '' // Se llenará en la celda combinada
                });

                row.getCell('detalle').alignment = { wrapText: true, vertical: 'middle' };
                row.getCell('socio').alignment = { vertical: 'middle' };
                row.getCell('documento').alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell('medidor').alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell('periodo').alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell('estado').alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell('consumo').alignment = { vertical: 'middle', horizontal: 'center' };
                
                currentRowIdx++;
              });

              const endRow = currentRowIdx - 1;
              // Combinar la columna 7 (total_deuda) para este socio
              if (startRow < endRow) {
                worksheet.mergeCells(startRow, 7, endRow, 7);
              }
              const mergedCell = worksheet.getCell(startRow, 7);
              mergedCell.value = `S/ ${totalDeudaSocio.toFixed(2)}`;
              mergedCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
              mergedCell.font = { bold: true };
            }

            worksheet.addRow([]);
            const totalRow = worksheet.addRow({
              detalle: 'TOTAL DEUDAS GLOBAL:',
              total_deuda: `S/ ${sumaTotalDeudaGlobal.toFixed(2)}`
            });
            totalRow.font = { bold: true };
            totalRow.getCell('detalle').alignment = { horizontal: 'right' };
            totalRow.getCell('total_deuda').alignment = { horizontal: 'center' };

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=Reporte_Deudas.xlsx');

            await workbook.xlsx.write(res);
            res.end();

            // Registrar auditoría
            
            await this.auditoriaRepo.registrarDescarga({
              usuario_id: req.user.id,
              tipo_documento: 'Reporte Deudas Excel',
              detalles: `Descarga de reporte de deudas general (${recibosDeuda.length} recibos impagos)`
            });

          } catch (error: any) {
            console.error('Error al generar Excel de Deudas:', error);
            res.status(500).json({ error: 'Error al generar Excel de Deudas' });
          }
        };
    public buildResumenPagosExcel = async (req: Request<{}, any, any, IGetPagosQuery>, res: Response): Promise<any> => {
          try {
            const filters = {
              year: req.query.year,
              periodo: req.query.periodo as string
            };
            
            // Traer todos los pagos sin límite de paginación
            const pagos = await this.pagoRepo.findAllNoLimit(filters);

            const workbook = new ExcelJS.Workbook();
            
            // Hoja 1: Resumen General (lista de pagos completa)
            const wsGeneral = workbook.addWorksheet('Pagos Detallados');
            wsGeneral.columns = [
              { header: 'FECHA PAGO', key: 'fecha_pago', width: 20 },
              { header: 'SOCIO / SOCIO', key: 'socio', width: 40 },
              { header: 'MEDIDOR', key: 'medidor', width: 20 },
              { header: 'PERIODO FACTURADO', key: 'periodo', width: 20 },
              { header: 'Nº COMPROBANTE', key: 'comprobante', width: 20 },
              { header: 'MÉTODO', key: 'metodo', width: 15 },
              { header: 'Nº OPERACIÓN', key: 'operacion', width: 20 },
              { header: 'MONTO PAGADO (S/)', key: 'monto', width: 20 }
            ];

            wsGeneral.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            wsGeneral.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
            
            let totalGeneral = 0;

            pagos.forEach(p => {
              const monto = parseFloat(p.monto_pagado) || 0;
              totalGeneral += monto;
              wsGeneral.addRow({
                fecha_pago: new Date(p.fecha_pago).toLocaleString('es-PE'),
                socio: p.socio,
                medidor: p.medidores_str || 'Sin medidor',
                periodo: p.periodo,
                comprobante: p.numero_comprobante,
                metodo: p.metodo_pago,
                operacion: p.numero_operacion || '-',
                monto: monto
              });
            });

            wsGeneral.addRow([]);
            const totalRow = wsGeneral.addRow({
              operacion: 'TOTAL RECAUDADO:',
              monto: totalGeneral
            });
            totalRow.font = { bold: true };

            // Hoja 2: Resumen por Socio
            const wsSocio = workbook.addWorksheet('Resumen por Socio');
            wsSocio.columns = [
              { header: 'SOCIO / SOCIO', key: 'socio', width: 45 },
              { header: 'CANTIDAD DE PAGOS', key: 'cantidad', width: 20 },
              { header: 'TOTAL ABONADO (S/)', key: 'total_abonado', width: 25 }
            ];

            wsSocio.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
            wsSocio.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF059669' } };

            // Agrupar por socio
            const agrupadoSocio: Record<string, { cantidad: number; total: number }> = {};
            pagos.forEach(p => {
              if (!agrupadoSocio[p.socio]) {
                agrupadoSocio[p.socio] = { cantidad: 0, total: 0 };
              }
              agrupadoSocio[p.socio].cantidad += 1;
              agrupadoSocio[p.socio].total += parseFloat(p.monto_pagado) || 0;
            });

            const sociosSorted = Object.entries(agrupadoSocio).sort((a, b) => b[1].total - a[1].total);

            sociosSorted.forEach(([socio, stats]) => {
              wsSocio.addRow({
                socio: socio,
                cantidad: (stats as any).cantidad,
                total_abonado: (stats as any).total
              });
            });

            wsSocio.addRow([]);
            const totalSocioRow = wsSocio.addRow({
              cantidad: 'TOTAL GENERAL:',
              total_abonado: totalGeneral
            });
            totalSocioRow.font = { bold: true };

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=Resumen_Pagos.xlsx');

            await workbook.xlsx.write(res);
            res.end();
          } catch (error: any) {
            console.error('Error al generar Excel de pagos:', error);
            res.status(500).json({ error: 'Error al generar Excel de pagos' });
          }
        };
    public buildUsuariosExcel = async (req: Request<{}, any, any, IGetUsuariosQuery>, res: Response): Promise<any> => {
          try {
            const search = (req.query.search as string) || '';
            const rol_id = req.query.rol_id ? parseInt(req.query.rol_id as string) : null;
            const estado = req.query.estado || null;
            const rubro = (req.query.rubro as string) || null;

            // Para exportar a Excel, traemos todos según los filtros con un límite muy grande
            const result = await this.usuarioRepo.findAll(search, rol_id, estado, rubro, 10000, 0);
            const usuarios = result.data;

            const workbook = new ExcelJS.Workbook();
            workbook.creator = 'Parque Industrial Jicamarca';
            workbook.created = new Date();

            const sheet = workbook.addWorksheet('Usuarios', {
              headerFooter: { firstHeader: 'Directorio de Usuarios - Parque Industrial Jicamarca' },
              views: [{ state: 'frozen', ySplit: 1 }]
            });

            // Definir columnas
            sheet.columns = [
              { header: 'ID', key: 'id', width: 8 },
              { header: 'Documento', key: 'documento_identidad', width: 15 },
              { header: 'Nombre / Razón Social', key: 'nombre_razonsocial', width: 40 },
              { header: 'Rol', key: 'nombre_rol', width: 18 },
              { header: 'Cargo', key: 'cargo_representante', width: 25 },
              { header: 'Teléfono', key: 'telefono', width: 15 },
              { header: 'Correo', key: 'correo', width: 30 },
              { header: 'Dirección', key: 'direccion', width: 35 },
              { header: 'Medidor(es)', key: 'medidores_str', width: 25 },
              { header: 'Estado', key: 'estado', width: 15 },
            ];

            // Estilos del encabezado
            sheet.getRow(1).eachCell((cell) => {
              cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate 900
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
              cell.border = {
                bottom: { style: 'medium', color: { argb: 'FF334155' } }
              };
            });
            sheet.getRow(1).height = 25;

            // Añadir filas
            usuarios.forEach((u, index) => {
              let medidoresStr = 'Sin Medidor';
              if (u.medidores) {
                try {
                  const meds = typeof u.medidores === 'string' ? JSON.parse(u.medidores) : u.medidores;
                  if (meds && meds.length > 0) {
                    medidoresStr = meds.map((m: any) => `${m.num_serie} (${m.tipo})`).join(', ');
                  }
                } catch(e) {}
              }

              const row = sheet.addRow({
                id: u.id,
                documento_identidad: u.documento_identidad,
                nombre_razonsocial: u.nombre_razonsocial,
                nombre_rol: u.nombre_rol,
                cargo_representante: u.cargo_representante || '-',
                telefono: u.telefono || '-',
                correo: u.correo || '-',
                direccion: u.direccion || '-',
                medidores_str: medidoresStr,
                estado: u.es_activo ? 'Activo' : 'Inactivo'
              });

              row.height = 20;
              row.eachCell((cell, colNumber) => {
                cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 10 ? 'center' : 'left' };
                cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
                
                // Colorear el estado
                if (colNumber === 10) {
                  cell.font.color = { argb: u.es_activo ? 'FF16A34A' : 'FFDC2626' }; // Verde o Rojo
                  cell.font.bold = true;
                }
              });

              // Zebra striping
              if (index % 2 === 0) {
                row.eachCell((cell) => {
                  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; // Slate 50
                });
              }
            });

            // Enviar archivo
            const timestamp = new Date().toISOString().slice(0, 10);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename=usuarios_${timestamp}.xlsx`);

            await workbook.xlsx.write(res);
            res.end();
          } catch (error) {
            console.error('Error al exportar Excel:', error);
            res.status(500).json({ error: 'Error al generar el archivo Excel' });
          }
        };
}
