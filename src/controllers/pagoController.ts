import { Request, Response } from 'express';
import * as pagoRepo from '../repositories/pagoRepository';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

export const getPagos = async (req: Request, res: Response): Promise<any> => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo as string
    };
    const pagos = await pagoRepo.findAll(filters);
    res.json(pagos);
  } catch (error: any) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const registrarPago = async (req: Request, res: Response): Promise<any> => {
  try {
    // req.user.id is passed to the repo to be set as @current_user_id for SQL triggers
    await pagoRepo.createConTransaccion(req.body, req.user?.id || 0);
    res.status(201).json({ message: 'Pago registrado y recibo actualizado a Pagado exitosamente' });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Recibo no encontrado' });
    }
    if (error.message === 'ALREADY_PAID') {
      return res.status(400).json({ error: 'El recibo ya se encuentra pagado' });
    }
    if (error.message === 'NEWER_RECEIPT_EXISTS') {
      return res.status(400).json({ error: 'No puedes registrar un pago aquí porque ya existe un recibo más reciente (del mes siguiente) donde esta deuda ha sido incluida. Por favor, cobra el monto desde el recibo más actual.' });
    }
    if ((error as any).message === 'INSUFFICIENT_AMOUNT') {
      return res.status(400).json({ error: 'El monto pagado no cubre el total del recibo' });
    }
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar el pago' });
  }
};

export const exportReportePdf = async (req: Request, res: Response): Promise<any> => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo as string
    };
    
    // Traer todos los pagos
    const pagos = await pagoRepo.findAllNoLimit(filters);

    const doc = new PDFDocument({ size: 'A4', margin: 30, layout: 'landscape', bufferPages: true });

    let periodoText = 'TODOS';
    if (filters.periodo) periodoText = filters.periodo;
    else if (filters.year) periodoText = `AÑO ${filters.year}`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Reporte_Pagos_${periodoText.replace(' ', '_')}.pdf`);

    const fontPath = path.join(__dirname, '../fonts');
    doc.registerFont('Lexend', path.join(fontPath, 'Lexend-Regular.ttf'));
    doc.registerFont('Lexend-Medium', path.join(fontPath, 'Lexend-Medium.ttf'));
    doc.registerFont('Lexend-Bold', path.join(fontPath, 'Lexend-Bold.ttf'));

    doc.pipe(res);

    const logoPath = path.join(__dirname, '../assets/logo.png');

    const NAVY      = '#0f172a';
    const TEAL      = '#0d9488';
    const WHITE     = '#ffffff';
    const SLATE_LT  = '#64748b';

    const drawHeader = () => {
      // Tira delgada corporativa superior
      doc.rect(0, 0, doc.page.width, 6).fill(NAVY);
      doc.rect(0, 6, doc.page.width, 2).fill(TEAL);

      const logoCenterX = 56;
      const logoCenterY = 38;
      const logoRadius = 24;

      if (fs.existsSync(logoPath)) {
        doc.image(logoPath, logoCenterX - logoRadius, logoCenterY - logoRadius, { width: logoRadius * 2, height: logoRadius * 2 });
      } else {
        doc.circle(logoCenterX, logoCenterY, logoRadius).strokeColor(NAVY).lineWidth(2).stroke();
      }

      const textStartX = 95;
      doc.fillColor(NAVY).fontSize(18).font('Lexend-Bold');
      doc.text('PARQUE INDUSTRIAL', textStartX, 22);
      doc.fillColor(SLATE_LT).fontSize(10).font('Lexend-Medium');
      doc.text('ANEXO 8 — JICAMARCA', textStartX, 44);

      const titleW = 350;
      const titleX = doc.page.width - 30 - titleW;
      doc.fillColor(NAVY).fontSize(14).font('Lexend-Bold');
      doc.text('REPORTE GENERAL DE PAGOS', titleX, 26, { width: titleW, align: 'right' as const });
      doc.fillColor(TEAL).fontSize(11).font('Lexend-Medium');
      doc.text(`PERIODO: ${periodoText}`, titleX, 44, { width: titleW, align: 'right' as const });

      // Línea divisoria
      doc.moveTo(30, 75).lineTo(doc.page.width - 30, 75).lineWidth(1).strokeColor('#e2e8f0').stroke();
    };

    drawHeader();

    let y = 100;
    
    // Columnas: FECHA PAGO, SOCIO, PERIODO, Nº COMP, MÉTODO, OPERACIÓN, MONTO
    const columns = [
      { header: 'FECHA PAGO', x: 30, w: 90 },
      { header: 'SOCIO / EMPRESA', x: 130, w: 250 },
      { header: 'PERIODO', x: 390, w: 70 },
      { header: 'Nº COMP.', x: 470, w: 80 },
      { header: 'MÉTODO', x: 560, w: 80 },
      { header: 'Nº OPERACIÓN', x: 650, w: 80 },
      { header: 'MONTO (S/)', x: 740, w: 70, align: 'right' as const }
    ];

    const drawTableHeader = (startY) => {
      doc.roundedRect(30, startY - 5, doc.page.width - 60, 22, 4).fill(NAVY);
      doc.fillColor(WHITE).fontSize(8).font('Lexend-Bold');
      columns.forEach(col => {
        doc.text(col.header, col.x, startY + 1, { width: col.w, align: col.align || 'left' });
      });
      return startY + 25;
    };

    y = drawTableHeader(y);
    
    const formatNum = (n) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const formatDate = (d) => d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

    let totalGeneral = 0;

    pagos.forEach((p, i) => {
      if (y > doc.page.height - 60) {
        doc.addPage({ size: 'A4', margin: 30, layout: 'landscape' });
        drawHeader();
        y = drawTableHeader(100);
      }

      if (i % 2 === 0) {
        doc.rect(30, y - 2, doc.page.width - 60, 16).fill('#f8fafc');
      }
      
      doc.fontSize(8).font('Lexend-Medium');

      doc.fillColor('#475569').text(formatDate(p.fecha_pago), columns[0].x, y + 2, { width: columns[0].w, align: columns[0].align || 'left' });
      
      const socioName = (p.socio || '-').substring(0, 45);
      doc.fillColor(NAVY).font('Lexend-Bold').text(socioName, columns[1].x, y + 2, { width: columns[1].w, align: columns[1].align || 'left' });
      doc.font('Lexend-Medium');
      
      doc.fillColor('#64748b').text(p.periodo || '-', columns[2].x, y + 2, { width: columns[2].w, align: columns[2].align || 'left' });
      doc.fillColor('#334155').text(p.numero_comprobante || '-', columns[3].x, y + 2, { width: columns[3].w, align: columns[3].align || 'left' });
      doc.text(p.metodo_pago || '-', columns[4].x, y + 2, { width: columns[4].w, align: columns[4].align || 'left' });
      doc.text(p.numero_operacion || '-', columns[5].x, y + 2, { width: columns[5].w, align: columns[5].align || 'left' });
      
      const monto = parseFloat(p.monto_pagado) || 0;
      doc.fillColor('#047857').font('Lexend-Bold').text(formatNum(monto), columns[6].x, y + 2, { width: columns[6].w, align: columns[6].align || 'left' });

      totalGeneral += monto;
      y += 16;
    });

    if (y > doc.page.height - 70) {
      doc.addPage({ size: 'A4', margin: 30, layout: 'landscape' });
      drawHeader();
      y = drawTableHeader(100);
    }
    
    y += 5;
    doc.moveTo(30, y).lineTo(doc.page.width - 30, y).lineWidth(2).strokeColor(NAVY).stroke();
    y += 8;
    
    doc.fillColor(NAVY).fontSize(10).font('Lexend-Bold');
    doc.text('TOTAL RECAUDADO:', columns[4].x, y, { width: columns[5].x + columns[5].w - columns[4].x, align: 'right' as const });
    doc.fillColor('#047857').fontSize(11).text(formatNum(totalGeneral), columns[6].x, y - 1, { width: columns[6].w, align: columns[6].align });

    // Global Footer with Page Numbers
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.fillColor(SLATE_LT).fontSize(7).font('Lexend-Medium');
      doc.text(`Generado el ${new Date().toLocaleString('es-PE')} — Página ${i + 1} de ${range.count}`, 30, doc.page.height - 30, { align: 'center' as const, width: doc.page.width - 60 });
    }

    doc.end();
  } catch (error: any) {
    console.error('Error al generar Reporte PDF de Pagos:', error);
    res.status(500).json({ error: 'Error al generar Reporte PDF de Pagos' });
  }
};

export const exportResumenPagosExcel = async (req: Request, res: Response): Promise<any> => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo as string
    };
    
    // Traer todos los pagos sin límite de paginación
    const pagos = await pagoRepo.findAllNoLimit(filters);

    const workbook = new ExcelJS.Workbook();
    
    // Hoja 1: Resumen General (lista de pagos completa)
    const wsGeneral = workbook.addWorksheet('Pagos Detallados');
    wsGeneral.columns = [
      { header: 'FECHA PAGO', key: 'fecha_pago', width: 20 },
      { header: 'SOCIO / SOCIO', key: 'socio', width: 40 },
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


