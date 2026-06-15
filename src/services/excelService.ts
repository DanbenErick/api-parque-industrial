import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import * as reciboRepo from '../repositories/reciboRepository';
import * as auditoriaRepo from '../repositories/auditoriaRepository';

interface IExportReporteExcelQuery {
  year?: string;
  periodo?: string;
  estado?: string;
  search?: string;
}

export const buildReporteExcel = async (req: Request<{}, any, any, IExportReporteExcelQuery>, res: Response): Promise<any> => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo,
      estado: req.query.estado,
      search: req.query.search
    };
    const recibos = await reciboRepo.findAll(filters);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Facturación');

    worksheet.columns = [
      { header: 'Nº COMPROBANTE', key: 'comprobante', width: 20 },
      { header: 'SOCIO / SOCIO', key: 'socio', width: 35 },
      { header: 'PERIODO', key: 'periodo', width: 15 },
      { header: 'FECHA EMISIÓN', key: 'fecha_emision', width: 18 },
      { header: 'FECHA VENCIMIENTO', key: 'fecha_vencimiento', width: 20 },
      { header: 'CARGO ENERGÍA (S/)', key: 'energia', width: 20 },
      { header: 'ENERGÍA PUNTA (S/)', key: 'energia_punta', width: 20 },
      { header: 'FACTOR POTENCIA (S/)', key: 'factor_potencia', width: 22 },
      { header: 'MANTENIMIENTO (S/)', key: 'mantenimiento', width: 20 },
      { header: 'CARGO FIJO (S/)', key: 'fijo', width: 18 },
      { header: 'CORTE (S/)', key: 'corte', width: 15 },
      { header: 'INST. MEDIDOR (S/)', key: 'instalacion', width: 20 },
      { header: 'MULTA MANIPULACIÓN (S/)', key: 'multa_m', width: 25 },
      { header: 'MULTA RECONEXIÓN (S/)', key: 'multa_r', width: 25 },
      { header: 'DEUDA VENCIDA (S/)', key: 'vencida', width: 20 },
      { header: 'SUBTOTAL (S/)', key: 'subtotal', width: 15 },
      { header: 'IGV (18%) (S/)', key: 'igv', width: 15 },
      { header: 'TOTAL (S/)', key: 'total', width: 15 },
      { header: 'ESTADO', key: 'estado', width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F497D' } };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    (recibos as any[]).forEach((r: any) => {
      worksheet.addRow({
        comprobante: r.numero_comprobante,
        socio: r.socio,
        periodo: r.periodo,
        fecha_emision: r.fecha_emision ? new Date(r.fecha_emision).toLocaleDateString('es-PE') : '-',
        fecha_vencimiento: r.fecha_vencimiento ? new Date(r.fecha_vencimiento).toLocaleDateString('es-PE') : '-',
        energia: parseFloat(r.cargo_energia || 0),
        energia_punta: parseFloat(r.cargo_energia_punta || 0),
        factor_potencia: parseFloat(r.cargo_factor_potencia || 0),
        mantenimiento: parseFloat(r.cargo_mantenimiento || 0),
        fijo: parseFloat(r.cargo_fijo || 0),
        corte: parseFloat(r.cargo_corte || 0),
        instalacion: parseFloat(r.instalacion_medidor || 0),
        multa_m: parseFloat(r.multa_manipulacion || 0),
        multa_r: parseFloat(r.multa_reconexion || 0),
        vencida: parseFloat(r.deuda_vencida || 0),
        subtotal: parseFloat(r.subtotal || 0),
        igv: parseFloat(r.igv || 0),
        total: parseFloat(r.total || 0),
        estado: r.estado
      });
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

export const buildReporteDeudasExcel = async (req: Request, res: Response): Promise<any> => {
  try {
    const { periodo } = req.query;
    
    // Para el reporte de deudas, traemos TODAS las deudas vigentes o solo las de un periodo específico
    const filtro = (periodo && periodo !== 'Todos' && periodo !== 'TodosHistorico') 
      ? { periodo } 
      : { year: 'TodosHistorico' };
      
    // Vamos a buscar todos los recibos y filtrar los que tengan saldo pendiente > 0
    const recibos: any = await reciboRepo.findAllCompletos(filtro);
    
    // Filtramos solo los que tienen deuda Vencida
    const recibosDeuda = recibos.filter(r => r.estado === 'Vencido');
    
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

        const row = worksheet.addRow({
          socio: grupo.socio,
          documento: grupo.documento,
          periodo: r.mes_anio,
          estado: r.estado,
          consumo: `${parseFloat(r.consumo_calculado || 0).toFixed(2)} kWh`,
          detalle: lineasDetalle.join('\n'),
          total_deuda: '' // Se llenará en la celda combinada
        });

        row.getCell('detalle').alignment = { wrapText: true, vertical: 'middle' };
        row.getCell('socio').alignment = { vertical: 'middle' };
        row.getCell('documento').alignment = { vertical: 'middle', horizontal: 'center' };
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
    
    await auditoriaRepo.registrarDescarga({
      usuario_id: req.user.id,
      tipo_documento: 'Reporte Deudas Excel',
      detalles: `Descarga de reporte de deudas general (${recibosDeuda.length} recibos impagos)`
    });

  } catch (error: any) {
    console.error('Error al generar Excel de Deudas:', error);
    res.status(500).json({ error: 'Error al generar Excel de Deudas' });
  }
};

