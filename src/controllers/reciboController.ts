import fs from 'fs';
import * as auditoriaRepo from '../repositories/auditoriaRepository';

import * as reciboRepo from '../repositories/reciboRepository';
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import * as pagoRepo from '../repositories/pagoRepository';
import path from 'path';


export const getRecibos = async (req: any, res: any): Promise<any> => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo,
      estado: req.query.estado,
      search: req.query.search
    };
    const recibos = await reciboRepo.findAll(filters);
    res.json(recibos);
  } catch (error: any) {
    console.error('Error al obtener recibos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getRecibosStats = async (req: any, res: any): Promise<any> => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo,
      estado: req.query.estado,
      search: req.query.search
    };
    const stats = await reciboRepo.getStats(filters);
    res.json(stats);
  } catch (error: any) {
    console.error('Error al obtener estadisticas de recibos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const getRecibosByUsuario = async (req: any, res: any): Promise<any> => {
  const { usuarioId } = req.params;

  if (req.user?.nombre_rol === 'Socio' && req.user.id !== parseInt(usuarioId)) {
    return res.status(403).json({ error: 'No tienes permisos para ver estos recibos' });
  }

  try {
    const recibos = await reciboRepo.findByUsuario(usuarioId);
    res.json(recibos);
  } catch (error: any) {
    console.error('Error al obtener recibos por usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const generarRecibos = async (req: any, res: any): Promise<any> => {
  const { periodo_id } = req.body;
  const admin_id = req.user.id;

  try {
    const message = await reciboRepo.generarMasivamente(periodo_id, admin_id);
    res.json({ message });
  } catch (error: any) {
    console.error('Error al generar recibos:', error);
    res.status(500).json({ error: 'Error al ejecutar la generación masiva. Verifique que el período existe.' });
  }
};

export const generarReciboIndividual = async (req: any, res: any): Promise<any> => {
  const { periodo_id, usuario_id } = req.body;
  const admin_id = req.user.id;

  if (!periodo_id || !usuario_id) {
    return res.status(400).json({ error: 'Faltan parámetros: periodo_id y usuario_id son obligatorios.' });
  }

  try {
    const message = await reciboRepo.generarIndividual(periodo_id, usuario_id, admin_id);
    res.json({ message });
  } catch (error: any) {
    console.error('Error al generar recibo individual:', error);
    res.status(400).json({ error: error.message || 'Error al generar recibo individual.' });
  }
};

export const refacturarRecibo = async (req: any, res: any): Promise<any> => {
  const { id } = req.params;
  const { motivo } = req.body;
  const admin_id = req.user.id;

  if (!motivo) {
    return res.status(400).json({ error: 'El motivo de refacturación es obligatorio.' });
  }

  try {
    const recibo = await reciboRepo.findByIdCompleto(id);
    if (!recibo) {
      return res.status(404).json({ error: 'Recibo no encontrado' });
    }

    if (recibo.estado === 'Pagado') return res.status(400).json({ error: 'No se puede refacturar un recibo pagado totalmente.' });

    // 1. Anular el recibo actual
    await reciboRepo.anularRecibo(id, motivo, admin_id);

    // 2. Generar el nuevo recibo
    const message = await reciboRepo.generarIndividual(recibo.periodo_id, recibo.usuario_id, admin_id);
    res.json({ message: 'Recibo refacturado exitosamente. ' + message });
  } catch (error: any) {
    console.error('Error al refacturar recibo:', error);
    res.status(400).json({ error: error.message || 'Error al refacturar recibo.' });
  }
};

// -------------------------------------------------------
// GENERAR PDF DE RECIBO DE LUZ (Diseño Moderno & Elegante con todos los datos)
// -------------------------------------------------------
export const exportReciboPdf = async (req: any, res: any): Promise<any> => {
  const { id } = req.params;

  try {
    const recibo = await reciboRepo.findByIdCompleto(id);
    if (!recibo) return res.status(404).json({ error: 'Recibo no encontrado' });

    if (req.user?.nombre_rol === 'Socio' && req.user.id !== recibo.usuario_id) {
      return res.status(403).json({ error: 'No tienes permisos para ver este recibo' });
    }

    const historial = await reciboRepo.findHistorialConsumo(recibo.usuario_id, 7, recibo.periodo_inicio);

    const doc = new PDFDocument({ size: 'A4', margin: 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo_${recibo.numero_comprobante || id}.pdf`);
    
    // Registrar fuentes Lexend
    const fontPath = path.join(__dirname, '../fonts');
    doc.registerFont('Lexend', path.join(fontPath, 'Lexend-Regular.ttf'));
    doc.registerFont('Lexend-Medium', path.join(fontPath, 'Lexend-Medium.ttf'));
    doc.registerFont('Lexend-Bold', path.join(fontPath, 'Lexend-Bold.ttf'));

    doc.pipe(res);

    // PALETA REFINADA
    const PRIMARY = '#1F497D';    // Azul Oscuro
    const TEXT = '#1e293b';       // Pizarra oscuro
    const MUTED = '#475569';      // Gris medio
    const BORDER = '#cbd5e1';     // Gris claro
    const HEADER_BG = '#e0e7ff';  // Indigo clarito
    const YELLOW = '#fef08a';     // Amarillo pastel moderno
    const YELLOW_BORDER = '#eab308'; // Borde sutil
    const RED = '#e11d48';        // Rojo carmesí elegante
    const RED_BG = '#fff1f2';     // Fondo rojizo ultraclaro

    const margin = 40;
    const contentWidth = doc.page.width - margin * 2;
    const colWidth = (contentWidth - 20) / 2;
    const rightCol = margin + colWidth + 20;

    const formatDate = (d: any) => {
      if (!d) return '-';
      return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    const formatNum = (n: any) => {
      if (n === null || n === undefined) return '0.00';
      return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };
    const parseMesAnio = (mesAnio: any) => {
      if (!mesAnio) return { mes: '-', anio: '-' };
      const [anio, mes] = mesAnio.split('-');
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
      return { mes: meses[parseInt(mes) - 1] || mes, anio };
    };
    const { mes, anio } = parseMesAnio(recibo.mes_anio);

    let y = margin;

    // ============================
    // HEADER Y LOGO
    // ============================
    const logoPath = path.join(__dirname, '../assets/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, rightCol, y, { width: 35, height: 35 });
    } else {
      doc.circle(rightCol + 15, y + 15, 15).fill(HEADER_BG);
      doc.fillColor(PRIMARY).fontSize(14).font('Lexend-Bold').text('J', rightCol + 10, y + 9);
    }
    doc.fillColor(PRIMARY).fontSize(14).font('Lexend-Bold');
    doc.text('PARQUE INDUSTRIAL', rightCol + 40, y + 5);
    doc.fillColor(PRIMARY).fontSize(9).font('Lexend-Medium');
    doc.text('ANEXO 8 - JICAMARCA', rightCol + 40, y + 20);

      // Datos empresa / Suministro (Izquierda)
      // Badge Suministro (Rediseño)
      doc.roundedRect(margin, y, 160, 30, 6).fill('#ffffff').lineWidth(2).strokeColor(PRIMARY).stroke();
      doc.roundedRect(margin, y, 90, 30, 6).fill(PRIMARY);
      doc.rect(margin + 85, y, 5, 30).fill(PRIMARY); // Quitar curva interna
      
      doc.fillColor('#ffffff').fontSize(10).font('Lexend-Bold').text('SUMINISTRO', margin, y + 10, { width: 90, align: 'center' as const, lineBreak: false });
      doc.fillColor(PRIMARY).fontSize(16).font('Lexend-Bold').text(recibo.id.toString(), margin + 90, y + 8, { width: 70, align: 'center' as const, lineBreak: false });
      
      y += 50;

    doc.fillColor(TEXT).fontSize(11).font('Lexend-Bold').text(recibo.nombre_razonsocial || '-', margin, y, { lineBreak: false });
    y += 18;
    doc.fillColor(TEXT).fontSize(9).font('Lexend').text(recibo.direccion || '-', margin, y, { lineBreak: false });
    y += 16;
    doc.fillColor(TEXT).font('Lexend-Medium').text(`Tipo de servicio`, margin, y);
    doc.fillColor(TEXT).font('Lexend').text(`Industrial`, margin + 110, y);
    y += 16;
    doc.font('Lexend-Medium').text(`Nro. de medidor`, margin, y);
    doc.font('Lexend').text(recibo.num_medidor || '-', margin + 110, y, { lineBreak: false });
    y += 16;
    doc.font('Lexend-Medium').text(`Recibo Nro 000`, margin, y);
    doc.font('Lexend').text(recibo.numero_comprobante || recibo.id.toString(), margin + 110, y, { lineBreak: false });

    y += 30;
    const startColsY = y;

    // ============================
    // COLUMNA IZQUIERDA
    // ============================
    // Detalles del consumo
    doc.roundedRect(margin, y, colWidth, 18, 4).fill(HEADER_BG);
    doc.fillColor(PRIMARY).fontSize(9).font('Lexend-Bold').text('DETALLES DEL CONSUMO', margin, y + 5, { width: colWidth, align: 'center' as const, lineBreak: false });
    y += 22;

    const drawConsumoItem = (label, val, dateStr, isBold = false) => {
      doc.fillColor(TEXT).fontSize(9).font(isBold ? 'Lexend-Bold' : 'Lexend');
      doc.text(label, margin + 5, y);
      doc.text(val, margin + 90, y, { width: 50, align: 'right' as const, lineBreak: false });
      if(dateStr) doc.fillColor(TEXT).text(dateStr, margin + 145, y, { width: 85, align: 'right' as const, lineBreak: false });
      doc.moveTo(margin, y + 14).lineTo(margin + colWidth, y + 14).lineWidth(0.5).strokeColor(BORDER).stroke();
      y += 18;
    };

    drawConsumoItem('Lectura actual', formatNum(recibo.lectura_actual), formatDate(recibo.periodo_fin), true);
    drawConsumoItem('Lectura anterior', formatNum(recibo.lectura_anterior), formatDate(recibo.periodo_inicio), true);
    drawConsumoItem('Consumo Normal', formatNum(recibo.consumo_calculado), '', true);
    if (parseFloat(recibo.consumo_calculado_punta) > 0) {
      drawConsumoItem('Consumo Punta', formatNum(recibo.consumo_calculado_punta), '', true);
    }
    if (parseFloat(recibo.factor_potencia) > 0) {
      drawConsumoItem('Factor Potencia', formatNum(recibo.factor_potencia), '', true);
    }
    
    y += 10;

    // Historial
    doc.roundedRect(margin, y, colWidth, 18, 4).fill(HEADER_BG);
    doc.fillColor(PRIMARY).fontSize(9).font('Lexend-Bold').text('HISTORIAL DE CONSUMO', margin, y + 5, { width: colWidth, align: 'center' as const, lineBreak: false });
    y += 22;

    doc.roundedRect(margin, y, colWidth, 120, 6).lineWidth(1).strokeColor(BORDER).stroke();
    if (historial.length > 0) {
      const cW = colWidth - 20;
      const cH = 75;
      const cy = y + 15;
      const maxC = Math.max(...historial.map((h: any) => parseFloat(h.consumo_calculado) || 0), 10);
      const spacing = cW / historial.length;
      const barW = spacing - 10;
      
      historial.forEach((h: any, i: any) => {
        const val = parseFloat(h.consumo_calculado) || 0;
        const bH = (val / maxC) * cH;
        const bX = margin + 10 + (i * spacing) + 5;
        const bY = cy + cH - bH;
        
        doc.rect(bX, bY, barW, bH).fill(HEADER_BG);
        doc.rect(bX, bY, barW, bH).lineWidth(0.5).strokeColor(PRIMARY).stroke();
        doc.fillColor(TEXT).fontSize(6).font('Lexend-Bold').text(Math.round(val).toString(), bX - 5, bY - 10, { width: barW + 10, align: 'center' as const, lineBreak: false });
        
        const mLabel = h.mes_anio ? h.mes_anio.substring(5) : '';
        const monthNames: any = { '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic' };
        doc.text(monthNames[mLabel] || mLabel, bX - 5, cy + cH + 5, { width: barW + 10, align: 'center' as const, lineBreak: false });
      });
    } else {
      doc.fillColor(MUTED).fontSize(9).font('Lexend').text('No hay datos históricos.', margin, y + 50, { width: colWidth, align: 'center' as const });
    }
    y += 135;

    // Comunicado
    doc.roundedRect(margin, y, colWidth, 18, 4).fill(HEADER_BG);
    doc.fillColor(PRIMARY).fontSize(9).font('Lexend-Bold').text('COMUNICADO', margin, y + 5, { width: colWidth, align: 'center' as const, lineBreak: false });
    y += 22;
    doc.roundedRect(margin, y, colWidth, 60, 6).lineWidth(1).strokeColor(BORDER).stroke();
    y += 75;

    // Fecha de Emision y Pagos
    doc.roundedRect(margin, y, colWidth, 18, 4).fill(HEADER_BG);
    doc.fillColor(PRIMARY).fontSize(9).font('Lexend-Bold').text('FECHAS IMPORTANTES', margin, y + 5, { width: colWidth, align: 'center' as const, lineBreak: false });
    y += 22;
    
    // Caja Emisión
    doc.roundedRect(margin, y, colWidth, 25, 4).lineWidth(1).strokeColor(BORDER).stroke();
    doc.fillColor(MUTED).fontSize(8).font('Lexend-Medium').text('EMISIÓN:', margin + 10, y + 8, { lineBreak: false });
    doc.fillColor(TEXT).fontSize(12).font('Lexend-Bold').text(formatDate(recibo.fecha_emision), margin, y + 6, { width: colWidth, align: 'center' as const, lineBreak: false });
    y += 32;

    // Cajas de Pago y Corte (Rediseño unificado)
    const fechaCorte = recibo.fecha_vencimiento ? new Date(new Date(recibo.fecha_vencimiento).getTime() + 86400000) : null;
    
    doc.roundedRect(margin, y, colWidth, 45, 6).fill(RED_BG).lineWidth(1).strokeColor(RED).stroke();
    doc.moveTo(margin + colWidth / 2, y + 8).lineTo(margin + colWidth / 2, y + 37).lineWidth(1).strokeColor(RED).stroke();
    
    // Pago
    doc.fillColor(RED).fontSize(8).font('Lexend-Medium').text('ÚLTIMO DÍA DE PAGO', margin, y + 10, { width: colWidth / 2, align: 'center' as const, lineBreak: false });
    doc.fillColor(RED).fontSize(14).font('Lexend-Bold').text(formatDate(recibo.fecha_vencimiento), margin, y + 22, { width: colWidth / 2, align: 'center' as const, lineBreak: false });
    
    // Corte
    doc.fillColor(RED).fontSize(8).font('Lexend-Medium').text('FECHA DE CORTE', margin + colWidth / 2, y + 10, { width: colWidth / 2, align: 'center' as const, lineBreak: false });
    doc.fillColor(RED).fontSize(14).font('Lexend-Bold').text(formatDate(fechaCorte), margin + colWidth / 2, y + 22, { width: colWidth / 2, align: 'center' as const, lineBreak: false });

    // ============================
    // COLUMNA DERECHA
    // ============================
    let ry = startColsY;

    doc.roundedRect(rightCol, ry, colWidth, 18, 4).fill(HEADER_BG);
    doc.fillColor(PRIMARY).fontSize(8).font('Lexend-Bold').text('DETALLES DE LOS IMPORTES FACTURADOS', rightCol, ry + 5, { width: colWidth, align: 'center' as const, lineBreak: false });
    ry += 25;

    // Mes Facturado
    doc.fillColor(TEXT).fontSize(10).font('Lexend-Medium').text('Mes Facturado', rightCol, ry + 4);
    doc.roundedRect(rightCol + 100, ry, colWidth - 100, 20, 4).lineWidth(1).strokeColor(YELLOW_BORDER).stroke();
    doc.roundedRect(rightCol + 100, ry, 50, 20, 4).fill(YELLOW);
    doc.fillColor(RED).fontSize(10).font('Lexend-Bold').text(mes, rightCol + 100, ry + 5, { width: 50, align: 'center' as const, lineBreak: false });
    doc.fillColor(TEXT).text(anio, rightCol + 150, ry + 5, { width: colWidth - 150, align: 'center' as const, lineBreak: false });
    ry += 30;

    // Headers de Tabla
    doc.roundedRect(rightCol, ry, colWidth, 18, 4).fill(PRIMARY);
    doc.fillColor('#ffffff').fontSize(8).font('Lexend-Bold');
    doc.text('DESCRIPCIÓN', rightCol + 10, ry + 5);
    doc.text('P.U. (S/.)', rightCol + 120, ry + 5, { lineBreak: false });
    doc.text('Monto (S/.)', rightCol + 180, ry + 5, { lineBreak: false });
    ry += 22;

    const drawRow = (desc: any, pu: any, monto: any, isBold = false) => {
      doc.fillColor(isBold ? PRIMARY : TEXT).fontSize(9).font(isBold ? 'Lexend-Bold' : 'Lexend');
      doc.text(desc, rightCol + 5, ry, { lineBreak: false });
      if(pu !== null) doc.text(formatNum(pu), rightCol + 100, ry, { width: 45, align: 'right' as const, lineBreak: false });
      doc.text(formatNum(monto), rightCol + 160, ry, { width: 65, align: 'right' as const, lineBreak: false });
      ry += 16;
    };

    const totalMantenimiento = parseFloat(recibo.cargo_mantenimiento) || 0;
    const consumoKw = parseFloat(recibo.consumo_calculado) || 0;
    const tarifaKwh = parseFloat(recibo.tarifa_kwh) || 0;
    const costoConsumo = parseFloat(recibo.cargo_energia) || 0;
    
    const costoConsumoPunta = parseFloat(recibo.cargo_energia_punta) || 0;
    const costoFactorPotencia = parseFloat(recibo.cargo_factor_potencia) || 0;

    const igv = parseFloat(recibo.igv) || 0;
    const subtotal = parseFloat(recibo.subtotal) || 0;
    const total = parseFloat(recibo.total) || 0;

    let cargoFijoVal = 0;
    let mantenimientoRedVal = 0;
    let alumbradoVal = 0;

    if (totalMantenimiento >= 229.50) {
      cargoFijoVal = 45.00;
      alumbradoVal = 2.50;
      mantenimientoRedVal = totalMantenimiento - cargoFijoVal - alumbradoVal;
    } else if (totalMantenimiento > 10) {
      cargoFijoVal = Math.min(45.00, totalMantenimiento * 0.2);
      alumbradoVal = Math.min(2.50, totalMantenimiento * 0.01);
      mantenimientoRedVal = totalMantenimiento - cargoFijoVal - alumbradoVal;
    } else {
      cargoFijoVal = totalMantenimiento;
      mantenimientoRedVal = 0;
      alumbradoVal = 0;
    }

    if (mantenimientoRedVal > 0) {
      // Logic for split 
    }

    // Now render rows
    if (cargoFijoVal > 0 && parseFloat(recibo.cargo_fijo) > 0) {
      drawRow('Cargo Fijo (Sin Medidor)', null, parseFloat(recibo.cargo_fijo));
    } else {
      drawRow('Consumo Energía Activa', tarifaKwh, costoConsumo);
      
      const consumoPunta = parseFloat(recibo.consumo_calculado_punta) || 0;
      const fPotencia = parseFloat(recibo.factor_potencia) || 0;
      const tarifaPunta = parseFloat(recibo.tarifa_kwh_punta) || 0;
      const precioFP = parseFloat(recibo.precio_factor_potencia) || (fPotencia > 0 ? costoFactorPotencia / fPotencia : 0);
      
      if (consumoPunta > 0) drawRow('Consumo Hora Punta', tarifaPunta, costoConsumoPunta);
      if (fPotencia > 0) drawRow('Cargo Factor Potencia', precioFP, costoFactorPotencia);
    }
    
    if (parseFloat(recibo.cargo_corte) > 0) drawRow('Corte', null, parseFloat(recibo.cargo_corte));
    
    const finalCargoFijo = parseFloat(recibo.cargo_fijo) > 0 ? parseFloat(recibo.cargo_fijo) : cargoFijoVal;
    if (finalCargoFijo > 0 && parseFloat(recibo.cargo_fijo) === 0) {
       // Legacy
       drawRow('Cargo Fijo Mensual', null, finalCargoFijo);
       if (mantenimientoRedVal > 0) drawRow('Mantenimiento de Red', null, mantenimientoRedVal);
    } else if (totalMantenimiento > 0) {
       drawRow('Mantenimiento de Red', null, totalMantenimiento);
    }
    if (alumbradoVal > 0 && finalCargoFijo === cargoFijoVal) {
      drawRow('Alumbrado Público', null, alumbradoVal);
    }
    
    doc.moveTo(rightCol, ry).lineTo(rightCol + colWidth, ry).lineWidth(1).strokeColor(BORDER).stroke();
    ry += 8;
    
    drawRow('SUBTOTAL DEL MES', null, subtotal, true);
    
    ry += 8;
    drawRow('multa x Manipulacio', null, parseFloat(recibo.multa_manipulacion) || 0);
    drawRow('Multa x Reconexión', null, parseFloat(recibo.multa_reconexion) || 0);
    drawRow('inst. de medidor', null, parseFloat(recibo.instalacion_medidor) || 0);
    drawRow('Deuda Pendiente', null, parseFloat(recibo.deuda_pendiente) || 0);
    
    ry += 4;
    drawRow('Deuda pend. por consumo', null, parseFloat(recibo.deuda_consumo) || 0, true);
    
    ry += 8;
    doc.moveTo(rightCol, ry).lineTo(rightCol + colWidth, ry).lineWidth(1).strokeColor(BORDER).stroke();
    ry += 8;
    
    drawRow('DEUDA VENCIDA', null, parseFloat(recibo.deuda_vencida) || 0, true);
    
    const descuento = parseFloat(recibo.descuento) || 0;
    if (descuento > 0) {
      ry += 4;
      doc.fillColor('#059669').fontSize(9).font('Lexend-Bold');
      doc.text('Saldo a Favor Aplicado', rightCol + 5, ry, { lineBreak: false });
      doc.text('-' + formatNum(descuento), rightCol + 160, ry, { width: 65, align: 'right' as const, lineBreak: false });
      ry += 16;
    }
    
    ry += 15;
    doc.fillColor(PRIMARY).fontSize(10).font('Lexend-Bold');
    doc.text('TOTAL FACTURADO', rightCol + 5, ry);
    doc.text(formatNum(total), rightCol + 160, ry, { width: 65, align: 'right' as const, lineBreak: false });
    ry += 30;

      // TOTAL A PAGAR BOX (Rediseño)
      doc.roundedRect(rightCol, ry, colWidth, 45, 8).fill(PRIMARY);
      
      doc.fillColor('#ffffff').fontSize(11).font('Lexend-Bold');
      doc.text('TOTAL A PAGAR S/.', rightCol + 15, ry + 18);
      
      // Caja amarilla insertada para el monto
      const amtWidth = 100;
      doc.roundedRect(rightCol + colWidth - amtWidth - 8, ry + 7, amtWidth, 31, 6).fill(YELLOW);
      doc.fillColor(PRIMARY).fontSize(16).font('Lexend-Bold').text(formatNum(total), rightCol + colWidth - amtWidth - 8, ry + 14, { width: amtWidth, align: 'center' as const, lineBreak: false });

    // ============================
    // FOOTER (Cuenta bancaria)
    // ============================
    const finalY = Math.max(y + 80, ry + 80);
    
    doc.roundedRect(margin, finalY, contentWidth, 50, 8).fill(PRIMARY);
    
    // Icono decorativo S/.
    doc.circle(margin + 30, finalY + 25, 12).fill('#ffffff');
    doc.fillColor(PRIMARY).fontSize(11).font('Lexend-Bold').text('S/.', margin + 23, finalY + 19);
    
    // Textos de la cuenta
    doc.fillColor('#ffffff').fontSize(10).font('Lexend-Medium');
    doc.text('DEPÓSITOS A LA CUENTA BCP', margin + 55, finalY + 12);
    
    doc.fillColor(YELLOW).fontSize(16).font('Lexend-Bold');
    doc.text('Nº CTA: 191-14302973046', margin + 55, finalY + 26);
    
    // Disclaimer
    doc.fillColor('#ffffff').fontSize(9).font('Lexend');
    doc.text('Conserve su voucher', margin, finalY + 15, { width: contentWidth - 20, align: 'right' as const });
    doc.text('como comprobante.', margin, finalY + 27, { width: contentWidth - 20, align: 'right' as const });

    doc.end();
  } catch (error: any) {
    console.error('Error al generar PDF del recibo:', error);
    res.status(500).json({ error: 'Error al generar el PDF del recibo' });
  }
};

// -------------------------------------------------------
// GENERAR PDF DE RECIBO DE LUZ (V2 - DISEÑO REDISEÑADO FACTURA)
// -------------------------------------------------------
const drawReciboLayoutV2 = (doc: any, recibo: any, historial: any, logoPath: any) => {
  const PRIMARY = '#1e3a8a';  // Azul muy oscuro
  const SECONDARY = '#e11d48';  // Rojo destaque
  const TEXT_MAIN = '#1e293b';  
  const TEXT_LIGHT = '#64748b'; 
  const BORDER = '#e2e8f0';   
  const BG_LIGHT = '#f8fafc';   

  const margin = 30;
  const contentWidth = doc.page.width - margin * 2;
  
  const formatDate = (d: any) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatNum = (n: any) => {
    if (n === null || n === undefined) return '0.00';
    return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const parseMesAnio = (mesAnio: any) => {
    if (!mesAnio) return { mes: '-', anio: '-' };
    const [anio, mes] = mesAnio.split('-');
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return { mes: meses[parseInt(mes) - 1] || mes, anio };
  };
  const { mes, anio } = parseMesAnio(recibo.mes_anio);

  // ==========================================
  // BLOQUE 0: DISEÑO Y MARCAS DE AGUA (FONDO)
  // ==========================================
  // Tira corporativa superior (Poca tinta, alto impacto visual)
  doc.rect(0, 0, doc.page.width, 12).fill(PRIMARY);
  doc.rect(0, 12, doc.page.width, 3).fill(SECONDARY);
  
  // Marca de agua sutil (Texto rotado)
  doc.save();
  doc.rotate(-45, { origin: [doc.page.width/2, doc.page.height/2] });
  doc.fillColor('#f1f5f9').fontSize(110).font('Lexend-Bold').text('RECIBO', doc.page.width/2 - 200, doc.page.height/2 - 100, { opacity: 0.3 });
  doc.fillColor('#f1f5f9').fontSize(110).font('Lexend-Bold').text('ELÉCTRICO', doc.page.width/2 - 250, doc.page.height/2 + 20, { opacity: 0.3 });
  doc.restore();

  // ==========================================
  // BLOQUE 1: CABECERA (LOGO Y DATOS GENERALES)
  // ==========================================
  let y = margin + 20;
  
  // Logo
  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, margin, y, { width: 55, height: 55 });
  } else {
    doc.circle(margin + 25, y + 25, 25).fill(PRIMARY);
    doc.fillColor('#fff').fontSize(24).font('Lexend-Bold').text('P', margin + 15, y + 12);
  }

  // Texto de cabecera centrado verticalmente con el logo
  doc.fillColor(PRIMARY).fontSize(20).font('Lexend-Bold').text('PARQUE INDUSTRIAL', margin + 70, y + 5);
  doc.fillColor(TEXT_MAIN).fontSize(16).font('Lexend-Medium').text('JICAMARCA ANEXO 8', margin + 70, y + 30);

  // Línea divisoria elegante
  y += 75;
  doc.moveTo(margin, y).lineTo(doc.page.width - margin, y).lineWidth(1).strokeColor(BORDER).stroke();
  y += 20;

  // ==========================================
  // BLOQUE 2: DATOS DEL CLIENTE Y SERVICIO
  // ==========================================
  doc.roundedRect(margin, y, contentWidth, 75, 6).fillAndStroke(BG_LIGHT, BORDER);
  
  doc.fillColor(TEXT_MAIN).fontSize(12).font('Lexend-Bold').text('DATOS DEL CLIENTE', margin + 15, y + 15);
  
  doc.fontSize(10).font('Lexend-Medium').text('Razón Social:', margin + 15, y + 35);
  doc.font('Lexend').text(recibo.nombre_razonsocial || '-', margin + 100, y + 35);
  
  doc.font('Lexend-Medium').text('Doc/RUC:', margin + 15, y + 55);
  doc.font('Lexend').text(recibo.documento_identidad || '-', margin + 100, y + 55);

  // Vertical Divider
  doc.moveTo(margin + contentWidth / 2, y + 15).lineTo(margin + contentWidth / 2, y + 60).strokeColor(BORDER).stroke();

  doc.font('Lexend-Medium').text('Tipo Servicio:', margin + contentWidth / 2 + 15, y + 15);
  doc.font('Lexend').text('Industrial', margin + contentWidth / 2 + 105, y + 15);

  doc.font('Lexend-Medium').text('Nro. Medidor:', margin + contentWidth / 2 + 15, y + 35);
  doc.font('Lexend').text(recibo.num_medidor || '-', margin + contentWidth / 2 + 105, y + 35);

  doc.font('Lexend-Medium').text('Mes Facturado:', margin + contentWidth / 2 + 15, y + 55);
  doc.fillColor(PRIMARY).font('Lexend-Bold').text(`${mes} ${anio}`, margin + contentWidth / 2 + 105, y + 55);

  y += 95;

  // ==========================================
  // BLOQUE 3: LECTURAS Y DETALLES (2 COLUMNAS)
  // ==========================================
  const colLeftW = 210;
  const colRightX = margin + colLeftW + 20;
  const colRightW = contentWidth - colLeftW - 20;

  // -- COLUMNA IZQUIERDA (CONSUMO Y GRÁFICO) --
  // Lecturas
  doc.roundedRect(margin, y, colLeftW, 100, 6).strokeColor(BORDER).stroke();
  doc.rect(margin, y, colLeftW, 25).fillAndStroke(PRIMARY, PRIMARY);
  doc.fillColor('#fff').fontSize(10).font('Lexend-Bold').text('DETALLE DE CONSUMO', margin, y + 8, { width: colLeftW, align: 'center' as const });

  let cy = y + 35;
  doc.fillColor(TEXT_MAIN).fontSize(9).font('Lexend');
  doc.text('Lectura Actual:', margin + 12, cy);
  doc.font('Lexend-Bold').text(formatNum(recibo.lectura_actual), margin + 90, cy, { width: 55, align: 'right' as const });
  doc.font('Lexend').text(formatDate(recibo.periodo_fin), margin + 155, cy);
  
  cy += 20;
  doc.text('Lectura Anterior:', margin + 12, cy);
  doc.font('Lexend-Bold').text(formatNum(recibo.lectura_anterior), margin + 90, cy, { width: 55, align: 'right' as const });
  doc.font('Lexend').text(formatDate(recibo.periodo_inicio), margin + 155, cy);
  
  cy += 20;
  doc.rect(margin + 12, cy - 3, colLeftW - 24, 20).fill(BG_LIGHT);
  doc.fillColor(PRIMARY).font('Lexend-Bold').text('Consumo (KW):', margin + 18, cy + 3);
  doc.text(formatNum(recibo.consumo_calculado), margin + 90, cy + 3, { width: 55, align: 'right' as const });

  // Gráfico de Barras
  let gy = y + 115;
  doc.roundedRect(margin, gy, colLeftW, 175, 6).strokeColor(BORDER).stroke();
  doc.rect(margin, gy, colLeftW, 25).fillAndStroke(PRIMARY, PRIMARY);
  doc.fillColor('#fff').fontSize(10).font('Lexend-Bold').text('HISTORIAL DE CONSUMO', margin, gy + 8, { width: colLeftW, align: 'center' as const });

  if (historial.length > 0) {
    const cH = 110;
    const bY = gy + 150; // Base line
    const maxC = Math.max(...historial.map((h: any) => parseFloat(h.consumo_calculado) || 0), 10);
    const spacing = (colLeftW - 20) / historial.length;
    const barW = spacing - 10;
    
    historial.forEach((h: any, i: any) => {
    const val = parseFloat(h.consumo_calculado) || 0;
    const bH = (val / maxC) * cH;
    const bX = margin + 10 + (i * spacing) + 5;
    
    doc.rect(bX, bY - bH, barW, bH).fill(TEXT_LIGHT);
    if (i === historial.length - 1) doc.rect(bX, bY - bH, barW, bH).fill(PRIMARY); // Destacar el último
    
    doc.fillColor(TEXT_MAIN).fontSize(7).font('Lexend-Medium').text(Math.round(val).toString(), bX - 5, bY - bH - 12, { width: barW + 10, align: 'center' as const });
    
    const mLabel = h.mes_anio ? h.mes_anio.substring(5) : '';
    const monthNames: any = { '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic' };
    doc.text(monthNames[mLabel] || mLabel, bX - 5, bY + 8, { width: barW + 10, align: 'center' as const });
    });
  }

  // -- COLUMNA DERECHA (IMPORTES FACTURADOS) --
  doc.roundedRect(colRightX, y, colRightW, 290, 6).strokeColor(BORDER).stroke();
  doc.rect(colRightX, y, colRightW, 25).fillAndStroke(PRIMARY, PRIMARY);
  doc.fillColor('#fff').fontSize(10).font('Lexend-Bold');
  doc.text('DESCRIPCIÓN', colRightX + 15, y + 8);
  doc.text('P.U.', colRightX + 170, y + 8, { width: 40, align: 'right' as const });
  doc.text('MONTO (S/)', colRightX + 220, y + 8, { width: 70, align: 'right' as const });

  let ry = y + 35;
  let isZebra = false;

  const drawRowV2 = (desc: any, pu: any, monto: any, isBold = false, isIndented = false) => {
    if (isZebra) {
    doc.rect(colRightX + 2, ry - 4, colRightW - 4, 22).fill(BG_LIGHT);
    }
    doc.fillColor(isBold ? PRIMARY : TEXT_MAIN).fontSize(9).font(isBold ? 'Lexend-Bold' : 'Lexend');
    doc.text(desc, colRightX + (isIndented ? 25 : 15), ry);
    if(pu !== null) doc.text(formatNum(pu), colRightX + 170, ry, { width: 40, align: 'right' as const });
    doc.text(formatNum(monto), colRightX + 220, ry, { width: 70, align: 'right' as const });
    ry += 22;
    isZebra = !isZebra;
  };

  const totalMantenimiento = parseFloat(recibo.cargo_mantenimiento) || 0;
  const consumoKw = parseFloat(recibo.consumo_calculado) || 0;
  const tarifaKwh = parseFloat(recibo.tarifa_kwh) || 0;
  const costoConsumo = parseFloat(recibo.cargo_energia) || 0;
  
  const costoConsumoPunta = parseFloat(recibo.cargo_energia_punta) || 0;
  const costoFactorPotencia = parseFloat(recibo.cargo_factor_potencia) || 0;

  // Desglose
  const consumoPunta = parseFloat(recibo.consumo_calculado_punta) || 0;
  const fPotencia = parseFloat(recibo.factor_potencia) || 0;
  const tarifaPunta = parseFloat(recibo.tarifa_kwh_punta) || 0;
  const precioFP = parseFloat(recibo.precio_factor_potencia) || (fPotencia > 0 ? costoFactorPotencia / fPotencia : 0);

  drawRowV2('Consumo Energía Activa', tarifaKwh, costoConsumo);
  if (consumoPunta > 0) drawRowV2('Consumo Hora Punta', tarifaPunta, costoConsumoPunta);
  if (fPotencia > 0) drawRowV2('Cargo Factor Potencia', precioFP, costoFactorPotencia);
  drawRowV2('Mantenimiento de Red', null, totalMantenimiento);
  drawRowV2('Corte / Reconexión', null, parseFloat(recibo.cargo_corte) || 0);
  drawRowV2('Cargo Fijo Mensual', null, parseFloat(recibo.cargo_fijo) || 0);
  
  doc.moveTo(colRightX + 15, ry).lineTo(colRightX + colRightW - 15, ry).strokeColor(BORDER).stroke();
  ry += 10;
  isZebra = false;
  
  const subtotal = parseFloat(recibo.subtotal) || (totalMantenimiento + costoConsumo);
  drawRowV2('SUBTOTAL DEL MES', null, subtotal, true);
  
  doc.moveTo(colRightX + 15, ry).lineTo(colRightX + colRightW - 15, ry).strokeColor(BORDER).stroke();
  ry += 10;
  isZebra = false;

  drawRowV2('Multa por Manipulación', null, parseFloat(recibo.multa_manipulacion) || 0);
  drawRowV2('Multa por Reconexión', null, parseFloat(recibo.multa_reconexion) || 0);
  drawRowV2('Instalación de Medidor', null, parseFloat(recibo.instalacion_medidor) || 0);
  drawRowV2('Deuda Vencida Anteriores', null, parseFloat(recibo.deuda_vencida) || 0, true);
  
  const descuento = parseFloat(recibo.descuento) || 0;
  if (descuento > 0) {
    doc.fillColor('#059669').fontSize(9).font('Lexend-Bold');
    doc.text('Saldo a Favor Aplicado', colRightX + 15, ry);
    doc.text('-' + formatNum(descuento), colRightX + 220, ry, { width: 70, align: 'right' as const });
    ry += 22;
    isZebra = !isZebra;
  }
  
  // Total
  const total = parseFloat(recibo.total) || (subtotal + parseFloat(recibo.igv));
  ry = y + 240;
  doc.rect(colRightX, ry, colRightW, 50).fillAndStroke(PRIMARY, PRIMARY);
  doc.fillColor('#fff').fontSize(16).font('Lexend-Bold').text('TOTAL FACTURADO S/.', colRightX + 15, ry + 18);
  doc.fontSize(22).text(formatNum(total), colRightX + 130, ry + 15, { width: 160, align: 'right' as const });

  y += 310;

  // ==========================================
  // BLOQUE 4: FECHAS Y AVISOS
  // ==========================================
  // Fechas
  doc.roundedRect(margin, y, 210, 70, 6).fillAndStroke(BG_LIGHT, BORDER);
  doc.fillColor(TEXT_MAIN).fontSize(9).font('Lexend-Medium').text('FECHA DE EMISIÓN:', margin + 15, y + 15);
  doc.font('Lexend-Bold').text(formatDate(recibo.fecha_emision), margin + 130, y + 15);
  
  doc.fillColor(SECONDARY).font('Lexend-Medium').text('ÚLTIMO DÍA DE PAGO:', margin + 15, y + 33);
  doc.fontSize(12).font('Lexend-Bold').text(formatDate(recibo.fecha_vencimiento), margin + 130, y + 31);
  
  const fechaCorte = recibo.fecha_vencimiento ? new Date(new Date(recibo.fecha_vencimiento).getTime() + 86400000) : null;
  doc.fillColor(TEXT_MAIN).fontSize(9).font('Lexend-Medium').text('CORTE DE SERVICIO:', margin + 15, y + 51);
  doc.font('Lexend-Bold').text(formatDate(fechaCorte), margin + 130, y + 51);

  // Mensaje
  doc.roundedRect(margin + 230, y, contentWidth - 230, 70, 6).strokeColor(BORDER).stroke();
  doc.fillColor(TEXT_LIGHT).fontSize(9).font('Lexend-Medium').text('COMUNICADO IMPORTANTE', margin + 245, y + 12);
  doc.font('Lexend').text('Estimado asociado, evite el corte y recargo por reconexión pagando puntualmente su recibo. Cualquier reclamo se atenderá dentro de los primeros 5 días.', margin + 245, y + 28, { width: contentWidth - 260 });

  // ==========================================
  // BLOQUE 5: TALÓN DE PAGO (PIE DE PÁGINA)
  // ==========================================
  let talonY = doc.page.height - 180;
  
  // Línea de corte
  doc.dash(5, { space: 5 }).moveTo(margin, talonY).lineTo(doc.page.width - margin, talonY).strokeColor(TEXT_LIGHT).stroke();
  doc.undash(); // Reset
  
  talonY += 20;
  doc.fillColor(TEXT_MAIN).fontSize(11).font('Lexend-Bold').text('TALÓN DE PAGO PARA EL BANCO', margin, talonY);
  doc.fontSize(9).font('Lexend-Medium').text('Depositar en ventanilla o agentes a la siguiente cuenta recaudadora:', margin, talonY + 18);
  
  doc.roundedRect(margin, talonY + 40, 270, 50, 6).fillAndStroke('#eff6ff', '#bfdbfe'); // Light blue box
  doc.fillColor(PRIMARY).fontSize(11).font('Lexend-Bold').text('BANCO DE CRÉDITO DEL PERÚ (BCP)', margin + 15, talonY + 52);
  doc.fontSize(14).text('Nº CTA: 191-14302973046', margin + 15, talonY + 70);

  doc.fillColor(TEXT_MAIN).fontSize(9).font('Lexend-Medium');
  doc.text('Código de Suministro:', doc.page.width - margin - 220, talonY + 45);
  doc.font('Lexend-Bold').fontSize(14).text(recibo.id.toString(), doc.page.width - margin - 80, talonY + 42, { width: 80, align: 'right' as const });
  
  doc.font('Lexend-Medium').fontSize(9).text('Monto a Pagar S/:', doc.page.width - margin - 220, talonY + 70);
  doc.font('Lexend-Bold').fontSize(18).text(formatNum(total), doc.page.width - margin - 90, talonY + 65, { width: 90, align: 'right' as const });
};

export const exportReciboPdfV2 = async (req: any, res: any): Promise<any> => {
  const { id } = req.params;

  try {
    const recibo = await reciboRepo.findByIdCompleto(id);
    if (!recibo) return res.status(404).json({ error: 'Recibo no encontrado' });

    if (req.user?.nombre_rol === 'Socio' && req.user.id !== recibo.usuario_id) {
      return res.status(403).json({ error: 'No tienes permisos para ver este recibo' });
    }

    const historial = await reciboRepo.findHistorialConsumo(recibo.usuario_id, 7, recibo.periodo_inicio);

    const doc = new PDFDocument({ size: 'A4', margin: 30 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo_v2_${recibo.numero_comprobante || id}.pdf`);
    
    const fontPath = path.join(__dirname, '../fonts');
    doc.registerFont('Lexend', path.join(fontPath, 'Lexend-Regular.ttf'));
    doc.registerFont('Lexend-Medium', path.join(fontPath, 'Lexend-Medium.ttf'));
    doc.registerFont('Lexend-Bold', path.join(fontPath, 'Lexend-Bold.ttf'));

    doc.pipe(res);

    const logoPath = path.join(__dirname, '../assets/logo.png');
    drawReciboLayoutV2(doc, recibo, historial, logoPath);
    doc.end();
  } catch (error: any) {
    console.error('Error al generar PDF V2 del recibo:', error);
    res.status(500).json({ error: 'Error al generar el PDF del recibo V2' });
  }
};

// -------------------------------------------------------
// GENERAR PDF DE RECIBO DE LUZ (V3 - DISEÑO PREMIUM)
// -------------------------------------------------------
const drawReciboLayoutV3 = (doc: any, recibo: any, historial: any, logoPath: any) => {
  // ── PALETA ──
  const NAVY      = '#0f172a';
  const TEAL      = '#0d9488';
  const TEAL_DARK = '#0f766e';
  const AMBER     = '#f59e0b';
  const SLATE     = '#334155';
  const SLATE_LT  = '#64748b';
  const WHITE     = '#ffffff';
  const BG        = '#f8fafc';
  const BORDER    = '#e2e8f0';
  const RED       = '#dc2626';

  const margin = 32;
  const W = doc.page.width - margin * 2;

  // ── HELPERS ──
  const fmt = (n: any) => {
    if (n === null || n === undefined) return '0.00';
    return parseFloat(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  const fmtDate = (d: any) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const parsePeriodo = (ma: any) => {
    if (!ma) return { mes: '-', anio: '-' };
    const [a, m] = ma.split('-');
    const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return { mes: nombres[parseInt(m) - 1] || m, anio: a };
  };
  const { mes, anio } = parsePeriodo(recibo.mes_anio);

  let y = 0;

  // ═══════════════════════════════════════════════
  // 1. HEADER CORPORATIVO — BARRA NAVY CON LOGO
  // ═══════════════════════════════════════════════
  const headerH = 70;
  doc.rect(0, 0, doc.page.width, headerH).fill(NAVY);
  // Acento teal inferior
  doc.rect(0, headerH, doc.page.width, 4).fill(TEAL);

  // Logo con marco circular premium
  
  const logoCenterX = margin + 26;
  const logoCenterY = 35;
  const logoRadius = 24;

  // Anillo exterior teal (glow)
  doc.circle(logoCenterX, logoCenterY, logoRadius + 3).fill(TEAL_DARK);
  // Círculo blanco de fondo
  doc.circle(logoCenterX, logoCenterY, logoRadius).fill(WHITE);

  if (fs.existsSync(logoPath)) {
    // Clip circular para el logo
    doc.save();
    doc.circle(logoCenterX, logoCenterY, logoRadius - 2).clip();
    doc.image(logoPath, logoCenterX - (logoRadius - 2), logoCenterY - (logoRadius - 2), { width: (logoRadius - 2) * 2, height: (logoRadius - 2) * 2 });
    doc.restore();
  }

  // Nombre empresa (ajustado al espacio tras el logo)
  const textStartX = margin + 65;
  doc.fillColor(WHITE).fontSize(16).font('Lexend-Bold');
  doc.text('PARQUE INDUSTRIAL', textStartX, 16);
  doc.fillColor(TEAL).fontSize(9).font('Lexend-Medium');
  doc.text('ANEXO 8 — JICAMARCA', textStartX, 36);
  doc.fillColor(SLATE_LT).fontSize(7).font('Lexend');
  doc.text('Sistema de Gestión Energética', textStartX, 48);

  // Badge "RECIBO DE LUZ"
  const badgeW = 150;
  const badgeX = doc.page.width - margin - badgeW;
  doc.roundedRect(badgeX, 14, badgeW, 42, 6).fill(TEAL);
  doc.fillColor(WHITE).fontSize(8).font('Lexend-Medium');
  doc.text('RECIBO DE LUZ', badgeX, 20, { width: badgeW, align: 'center' as const });
  doc.fillColor(WHITE).fontSize(16).font('Lexend-Bold');
  doc.text(recibo.numero_comprobante || `REC-${recibo.id}`, badgeX, 32, { width: badgeW, align: 'center' as const });

  y = headerH + 4 + 18;

  // ═══════════════════════════════════════════════
  // 2. DATOS DEL SOCIO Y PERIODO (2 COLUMNAS)
  // ═══════════════════════════════════════════════
  const col1W = W * 0.55;
  const col2W = W * 0.42;
  const col2X = margin + col1W + (W * 0.03);

  // -- Columna izquierda: Datos del socio
  doc.roundedRect(margin, y, col1W, 80, 6).fill(BG).strokeColor(BORDER).stroke();
  
  doc.fillColor(SLATE_LT).fontSize(7).font('Lexend-Medium');
  doc.text('DATOS DEL SOCIO', margin + 12, y + 8);
  
  doc.fillColor(NAVY).fontSize(13).font('Lexend-Bold');
  doc.text(recibo.nombre_razonsocial || '-', margin + 12, y + 22, { width: col1W - 24 });
  
  doc.fillColor(SLATE).fontSize(8).font('Lexend');
  doc.text(`${recibo.documento_identidad || '-'}`, margin + 12, y + 42);
  doc.text(`${recibo.direccion || '-'}`, margin + 12, y + 55);
  doc.fillColor(SLATE_LT).font('Lexend-Medium');
  doc.text(`Medidor: ${recibo.num_medidor || 'Sin medidor'}`, margin + 12, y + 68);

  // -- Columna derecha: Periodo
  doc.roundedRect(col2X, y, col2W, 80, 6).fill(BG).strokeColor(BORDER).stroke();
  
  doc.fillColor(TEAL).fontSize(7).font('Lexend-Medium');
  doc.text('MES FACTURADO', col2X + 12, y + 8);
  
  doc.fillColor(NAVY).fontSize(18).font('Lexend-Bold');
  doc.text(mes.toUpperCase(), col2X + 12, y + 26);
  doc.fillColor(NAVY).fontSize(14).font('Lexend-Medium');
  doc.text(anio, col2X + 12, y + 50);

  y += 92;

  // ═══════════════════════════════════════════════
  // 3. DETALLE DE LECTURAS (DINÁMICO)
  // ═══════════════════════════════════════════════
  const consPuntaLayout = parseFloat(recibo.consumo_calculado_punta) || 0;
  const fPotenciaLayout = parseFloat(recibo.factor_potencia) || 0;
  const esTiempoReal = consPuntaLayout > 0 || fPotenciaLayout > 0;

  doc.roundedRect(margin, y, W, 55, 6).strokeColor(BORDER).stroke();
  const blockW = W / 4;
  let blocks = [];

  if (esTiempoReal) {
    blocks = [
      { label: 'HORA NORMAL (Ant/Act)', value: `${fmt(recibo.lectura_anterior)} / ${fmt(recibo.lectura_actual)}`, sub: 'Lectura kWh' },
      { label: 'CONSUMO NORMAL',        value: `${fmt(recibo.consumo_calculado)}`,      sub: 'kWh Facturados' },
      { label: 'HORA PUNTA (Ant/Act)',  value: `${fmt(recibo.lectura_anterior_punta)} / ${fmt(recibo.lectura_actual_punta)}`, sub: 'Lectura Punta kWh' },
      { label: 'CONSUMO PUNTA',         value: `${fmt(recibo.consumo_calculado_punta)}`, sub: 'kWh Facturados Punta' }
    ];
  } else {
    blocks = [
      { label: 'LECTURA ANTERIOR', value: fmt(recibo.lectura_anterior), sub: fmtDate(recibo.periodo_inicio) },
      { label: 'LECTURA ACTUAL',   value: fmt(recibo.lectura_actual),   sub: fmtDate(recibo.periodo_fin)    },
      { label: 'CONSUMO kWh',      value: fmt(recibo.consumo_calculado), sub: 'Mes Facturado'               },
      { label: 'N° MEDIDOR',       value: recibo.num_medidor || 'S/M',   sub: 'Equipo Registrado'           }
    ];
  }

  blocks.forEach((b, i) => {
    const bx = margin + (blockW * i);
    if (i > 0) doc.moveTo(bx, y + 10).lineTo(bx, y + 45).strokeColor(BORDER).lineWidth(1).stroke();
    doc.fillColor(SLATE_LT).fontSize(7).font('Lexend-Medium');
    doc.text(b.label, bx + 12, y + 10, { lineBreak: false });
    doc.fillColor(NAVY).fontSize(13).font('Lexend-Bold');
    doc.text(b.value, bx + 12, y + 22, { lineBreak: false });
    doc.fillColor(SLATE_LT).fontSize(7).font('Lexend');
    doc.text(b.sub, bx + 12, y + 42, { lineBreak: false });
  });

  y += 65;

  // ═══════════════════════════════════════════════
  // 4. TABLA DE IMPORTES FACTURADOS
  // ═══════════════════════════════════════════════
  // Header de la tabla
  doc.roundedRect(margin, y, W, 26, 6).fill(NAVY);
  doc.fillColor(WHITE).fontSize(8).font('Lexend-Bold');
  doc.text('DESCRIPCIÓN', margin + 15, y + 9, { lineBreak: false });
  doc.text('TARIFA', margin + W * 0.55, y + 9, { width: 60, align: 'right' as const, lineBreak: false });
  doc.text('IMPORTE (S/)', margin + W * 0.72, y + 9, { width: W * 0.25, align: 'right' as const, lineBreak: false });
  y += 30;

  // Gather line items
  const items = [];

  const cargoEnergia = parseFloat(recibo.cargo_energia) || 0;
  const tarifaKwh = parseFloat(recibo.tarifa_kwh) || 0;
  if (cargoEnergia > 0) items.push({ desc: 'Consumo Energía Activa (Hora Normal)', tarifa: `S/ ${fmt(tarifaKwh)}/kWh`, monto: cargoEnergia });

  const cargoEnergiaPunta = parseFloat(recibo.cargo_energia_punta) || 0;
  const cargoFactorPot = parseFloat(recibo.cargo_factor_potencia) || 0;
  
  const consumoPunta = parseFloat(recibo.consumo_calculado_punta) || 0;
  const fPotencia = parseFloat(recibo.factor_potencia) || 0;
  const tarifaPunta = parseFloat(recibo.tarifa_kwh_punta) || 0;
  const precioFP = parseFloat(recibo.precio_factor_potencia) || (fPotencia > 0 ? cargoFactorPot / fPotencia : 0);

  if (consumoPunta > 0) items.push({ desc: 'Consumo Energía Activa (Hora Punta)', tarifa: `S/ ${fmt(tarifaPunta)}/kWh`, monto: cargoEnergiaPunta });
  if (fPotencia > 0) items.push({ desc: 'Cargo Factor de Potencia', tarifa: `S/ ${fmt(precioFP)}/kVARh`, monto: cargoFactorPot });

  const cargoMant = parseFloat(recibo.cargo_mantenimiento) || 0;
  if (cargoMant > 0) items.push({ desc: 'Mantenimiento de Red', tarifa: null, monto: cargoMant });

  const cargoFijo = parseFloat(recibo.cargo_fijo) || 0;
  if (cargoFijo > 0) items.push({ desc: 'Cargo Fijo Mensual (Sin Medidor)', tarifa: null, monto: cargoFijo });

  const cargoCorte = parseFloat(recibo.cargo_corte) || 0;
  if (cargoCorte > 0) items.push({ desc: 'Corte y Reconexión', tarifa: null, monto: cargoCorte });

  const multaManip = parseFloat(recibo.multa_manipulacion) || 0;
  if (multaManip > 0) items.push({ desc: 'Multa por Manipulación de Medidor', tarifa: null, monto: multaManip });

  const multaRecon = parseFloat(recibo.multa_reconexion) || 0;
  if (multaRecon > 0) items.push({ desc: 'Multa por Reconexión No Autorizada', tarifa: null, monto: multaRecon });

  const instMed = parseFloat(recibo.instalacion_medidor) || 0;
  if (instMed > 0) items.push({ desc: 'Cobro por Instalación de Medidor', tarifa: null, monto: instMed });

  // Cargos Dinámicos
  if (recibo.cargos_dinamicos && Array.isArray(recibo.cargos_dinamicos)) {
    recibo.cargos_dinamicos.forEach((cd: any) => {
      const cdMonto = parseFloat(cd.monto) || 0;
      if (cdMonto > 0) {
        items.push({ desc: cd.descripcion || 'Cargo Adicional', tarifa: null, monto: cdMonto });
      }
    });
  }

  // If no items at all (edge case), show at least one row
  if (items.length === 0) items.push({ desc: 'Sin cargos este periodo', tarifa: null, monto: 0 });

  // Draw rows
  items.forEach((item, i) => {
    const rowH = 20;
    if (i % 2 === 0) {
      doc.rect(margin, y, W, rowH).fill(BG);
    }
    doc.fillColor(SLATE).fontSize(9).font('Lexend');
    doc.text(item.desc, margin + 15, y + 5, { lineBreak: false });
    if (item.tarifa) {
      doc.fillColor(SLATE_LT).fontSize(8).font('Lexend-Light');
      doc.text(item.tarifa, margin + W * 0.48, y + 6, { width: 80, align: 'right' as const, lineBreak: false });
    }
    doc.fillColor(NAVY).fontSize(9).font('Lexend-Bold');
    doc.text(fmt(item.monto), margin + W * 0.72, y + 5, { width: W * 0.25, align: 'right' as const, lineBreak: false });
    y += rowH;
  });

  // Separator
  doc.moveTo(margin, y).lineTo(margin + W, y).strokeColor(BORDER).lineWidth(1).stroke();
  y += 6;

  // Subtotal del mes
  const subtotalMes = parseFloat(recibo.subtotal) || 0;
  doc.fillColor(SLATE).fontSize(9).font('Lexend-Medium');
  doc.text('Subtotal del mes', margin + 15, y + 2, { lineBreak: false });
  doc.fillColor(NAVY).font('Lexend-Bold');
  doc.text(fmt(subtotalMes), margin + W * 0.72, y + 2, { width: W * 0.25, align: 'right' as const, lineBreak: false });
  y += 18;

  // Deuda vencida
  const deudaVencida = parseFloat(recibo.deuda_vencida) || 0;
  if (deudaVencida > 0) {
    doc.fillColor(RED).fontSize(9).font('Lexend-Medium');
    doc.text('(+) Deuda Vencida de Meses Anteriores', margin + 15, y + 2, { lineBreak: false });
    doc.font('Lexend-Bold');
    doc.text(fmt(deudaVencida), margin + W * 0.72, y + 2, { width: W * 0.25, align: 'right' as const, lineBreak: false });
    y += 18;
  }

  // Descuento
  const descuento = parseFloat(recibo.descuento) || 0;
  if (descuento > 0) {
    doc.fillColor(TEAL).fontSize(9).font('Lexend-Medium');
    doc.text('(-) Saldo a Favor Aplicado', margin + 15, y + 2, { lineBreak: false });
    doc.font('Lexend-Bold');
    doc.text('-' + fmt(descuento), margin + W * 0.72, y + 2, { width: W * 0.25, align: 'right' as const, lineBreak: false });
    y += 18;
  }

  y += 4;

  // ═══════════════════════════════════════════════
  // 5. BARRA DE TOTAL
  // ═══════════════════════════════════════════════
  const total = parseFloat(recibo.total) || 0;
  
  // Línea gruesa divisoria solo en la parte derecha
  doc.moveTo(margin + W * 0.5, y).lineTo(margin + W, y).strokeColor(NAVY).lineWidth(2).stroke();
  y += 12;

  doc.fillColor(NAVY).fontSize(11).font('Lexend-Bold');
  doc.text('TOTAL A PAGAR', margin + W * 0.4, y + 4, { width: W * 0.3, align: 'right' as const, lineBreak: false });
  
  doc.fillColor(NAVY).fontSize(20).font('Lexend-Bold');
  doc.text(`S/ ${fmt(total)}`, margin + W * 0.72, y, { width: W * 0.25, align: 'right' as const, lineBreak: false });
  
  y += 36;

  // ═══════════════════════════════════════════════
  // 6. FECHAS + HISTORIAL (2 COLUMNAS)
  // ═══════════════════════════════════════════════
  const leftBoxW = W * 0.42;
  const rightBoxW = W * 0.55;
  const rightBoxX = margin + leftBoxW + (W * 0.03);

  // -- Fechas
  doc.roundedRect(margin, y, leftBoxW, 90, 6).strokeColor(BORDER).stroke();
  
  doc.fillColor(SLATE_LT).fontSize(7).font('Lexend-Medium');
  doc.text('FECHAS IMPORTANTES', margin + 12, y + 8);

  doc.fillColor(SLATE).fontSize(9).font('Lexend');
  doc.text('Emisión:', margin + 12, y + 26);
  doc.font('Lexend-Bold').text(fmtDate(recibo.fecha_emision), margin + 80, y + 26, { lineBreak: false });

  doc.fillColor(RED).font('Lexend');
  doc.text('Vencimiento:', margin + 12, y + 44);
  doc.font('Lexend-Bold').text(fmtDate(recibo.fecha_vencimiento), margin + 80, y + 44, { lineBreak: false });

  const fechaCorte = recibo.fecha_vencimiento ? new Date(new Date(recibo.fecha_vencimiento).getTime() + 86400000) : null;
  doc.fillColor(RED).font('Lexend');
  doc.text('Corte:', margin + 12, y + 62);
  doc.font('Lexend-Bold').text(fmtDate(fechaCorte), margin + 80, y + 62, { lineBreak: false });

  // Aviso pequeño
  doc.fillColor(SLATE_LT).fontSize(6).font('Lexend-Light');
  doc.text('Pague puntual para evitar corte y recargo.', margin + 12, y + 78);

  // -- Historial de consumo (gráfico)
  doc.roundedRect(rightBoxX, y, rightBoxW, 90, 6).strokeColor(BORDER).stroke();
  doc.rect(rightBoxX, y, rightBoxW, 20).fill(BG);
  doc.fillColor(SLATE_LT).fontSize(7).font('Lexend-Medium');
  doc.text('HISTORIAL DE CONSUMO (kWh)', rightBoxX + 12, y + 7);

  if (historial.length > 0) {
    const chartY = y + 25;
    const chartH = 50;
    const chartW = rightBoxW - 24;
    const maxVal = Math.max(...historial.map((h: any) => parseFloat(h.consumo_calculado) || 0), 10);
    const barSpacing = chartW / historial.length;
    const barW = Math.min(barSpacing - 8, 30);

    historial.forEach((h: any, i: any) => {
      const val = parseFloat(h.consumo_calculado) || 0;
      const barH = (val / maxVal) * chartH;
      const bx = rightBoxX + 12 + (i * barSpacing) + (barSpacing - barW) / 2;
      const by = chartY + chartH - barH;

      const isLast = i === historial.length - 1;
      doc.rect(bx, by, barW, barH).fill(isLast ? TEAL : '#cbd5e1');
      
      doc.fillColor(NAVY).fontSize(6).font('Lexend-Bold');
      doc.text(Math.round(val).toString(), bx - 4, by - 10, { width: barW + 8, align: 'center' as const, lineBreak: false });

      const mLabel = h.mes_anio ? h.mes_anio.substring(5) : '';
      const monthNames: any = { '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic' };
      doc.fillColor(SLATE_LT).fontSize(5).font('Lexend');
      doc.text(monthNames[mLabel] || mLabel, bx - 4, chartY + chartH + 4, { width: barW + 8, align: 'center' as const, lineBreak: false });
    });
  } else {
    doc.fillColor(SLATE_LT).fontSize(8).font('Lexend');
    doc.text('Sin datos históricos.', rightBoxX + 12, y + 50);
  }

  y += 102;

  // ═══════════════════════════════════════════════
  // 7. COMUNICADO
  // ═══════════════════════════════════════════════
  doc.roundedRect(margin, y, W, 40, 6).fill(BG);
  doc.fillColor(SLATE_LT).fontSize(7).font('Lexend-Medium');
  doc.text('COMUNICADO', margin + 12, y + 6);
  doc.fillColor(SLATE).fontSize(7).font('Lexend');
  doc.text('Estimado Socio, recuerde que el pago puntual evita el corte del servicio y el cobro de reconexión. Para reclamos acérquese a la oficina administrativa dentro de los primeros 5 días del mes. Conserve este documento como comprobante de su facturación.', margin + 12, y + 18, { width: W - 24 });
  y += 48;

  // ═══════════════════════════════════════════════
  // 8. TALÓN DE PAGO (pie con línea de corte)
  // ═══════════════════════════════════════════════
  let talonY = doc.page.height - 130;
  
  // Línea de corte
  doc.save();
  doc.dash(4, { space: 4 });
  doc.moveTo(margin, talonY).lineTo(doc.page.width - margin, talonY).strokeColor(SLATE_LT).lineWidth(0.5).stroke();
  doc.restore();
  
  talonY += 10;
  doc.fillColor(NAVY).fontSize(10).font('Lexend-Bold');
  doc.text('TALÓN DE PAGO — PARQUE INDUSTRIAL ANEXO 8', margin, talonY);

  talonY += 18;
  // Datos del talón en 3 columnas
  const tc1 = margin;
  const tc2 = margin + W * 0.35;
  const tc3 = margin + W * 0.68;

  doc.fillColor(SLATE_LT).fontSize(7).font('Lexend-Medium');
  doc.text('SOCIO', tc1, talonY);
  doc.fillColor(NAVY).fontSize(9).font('Lexend-Bold');
  doc.text(recibo.nombre_razonsocial || '-', tc1, talonY + 11, { width: W * 0.33 });

  doc.fillColor(SLATE_LT).fontSize(7).font('Lexend-Medium');
  doc.text('Nº RECIBO', tc2, talonY);
  doc.fillColor(NAVY).fontSize(9).font('Lexend-Bold');
  doc.text(recibo.numero_comprobante || recibo.id.toString(), tc2, talonY + 11);
  
  doc.fillColor(SLATE_LT).fontSize(7).font('Lexend-Medium');
  doc.text('PERIODO', tc2, talonY + 28);
  doc.fillColor(NAVY).fontSize(9).font('Lexend-Bold');
  doc.text(`${mes} ${anio}`, tc2, talonY + 39);

  doc.fillColor(SLATE_LT).fontSize(7).font('Lexend-Medium');
  doc.text('VENCIMIENTO', tc2 + 100, talonY + 28);
  doc.fillColor(RED).fontSize(9).font('Lexend-Bold');
  doc.text(fmtDate(recibo.fecha_vencimiento), tc2 + 100, talonY + 39);

  // Monto a pagar
  doc.roundedRect(tc3, talonY - 4, W * 0.3, 54, 6).fill(TEAL);
  doc.fillColor(WHITE).fontSize(7).font('Lexend-Medium');
  doc.text('MONTO A PAGAR', tc3 + 12, talonY + 4);
  doc.fillColor(WHITE).fontSize(22).font('Lexend-Bold');
  doc.text(`S/ ${fmt(total)}`, tc3 + 12, talonY + 18);

  // Cuenta bancaria
  talonY += 60;
  doc.fillColor(SLATE_LT).fontSize(7).font('Lexend');
  doc.text('Depositar en BCP — Nº Cta: 191-14302973046 | Conserve su voucher como comprobante.', margin, talonY);
};

export const exportReciboPdfV3 = async (req: any, res: any): Promise<any> => {
  const { id } = req.params;

  

  try {
    const recibo = await reciboRepo.findByIdCompleto(id);
    if (!recibo) return res.status(404).json({ error: 'Recibo no encontrado' });

    const historial = await reciboRepo.findHistorialConsumo(recibo.usuario_id, 7, recibo.periodo_inicio);

    const doc = new PDFDocument({ size: 'A4', margin: 32 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibo_v3_${recibo.numero_comprobante || id}.pdf`);
    
    const fontPath = path.join(__dirname, '../fonts');
    doc.registerFont('Lexend', path.join(fontPath, 'Lexend-Regular.ttf'));
    doc.registerFont('Lexend-Light', path.join(fontPath, 'Lexend-Light.ttf'));
    doc.registerFont('Lexend-Medium', path.join(fontPath, 'Lexend-Medium.ttf'));
    doc.registerFont('Lexend-Bold', path.join(fontPath, 'Lexend-Bold.ttf'));

    doc.pipe(res);

    const logoPath = path.join(__dirname, '../assets/logo.png');
    drawReciboLayoutV3(doc, recibo, historial, logoPath);
    doc.end();

    // Registrar auditoría
    await auditoriaRepo.registrarDescarga({
      usuario_id: req.user.id,
      tipo_documento: 'Recibo PDF V3',
      referencia_id: id,
      detalles: `Descarga de recibo individual ${recibo.numero_comprobante || id}`
    });
  } catch (error: any) {
    console.error('Error al generar PDF V3 del recibo:', error);
    res.status(500).json({ error: 'Error al generar el PDF del recibo V3' });
  }
};



// -------------------------------------------------------
// GENERAR PDF MASIVO DE RECIBOS (V2)
// -------------------------------------------------------
export const exportAllRecibosPdfV2 = async (req: any, res: any): Promise<any> => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo,
      estado: req.query.estado,
      search: req.query.search
    };
    
    const recibos: any = await reciboRepo.findAllCompletos(filters);
    if (!recibos || recibos.length === 0) {
      return res.status(404).json({ error: 'No se encontraron recibos para exportar.' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 30, autoFirstPage: false });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=recibos_masivos_${filters.periodo || 'todos'}.pdf`);
    
    const fontPath = path.join(__dirname, '../fonts');
    doc.registerFont('Lexend', path.join(fontPath, 'Lexend-Regular.ttf'));
    doc.registerFont('Lexend-Medium', path.join(fontPath, 'Lexend-Medium.ttf'));
    doc.registerFont('Lexend-Bold', path.join(fontPath, 'Lexend-Bold.ttf'));

    doc.pipe(res);
    
    const logoPath = path.join(__dirname, '../assets/logo.png');

    const usuarioIds = [...new Set(recibos.map((r: any) => r.usuario_id))];
    const historiales = await reciboRepo.findHistorialConsumoMultiple(usuarioIds);

    for (let i = 0; i < recibos.length; i++) {
      const recibo = recibos[i];
      const historial = historiales[recibo.usuario_id] || [];

      doc.addPage({ size: 'A4', margin: 30 });
      drawReciboLayoutV2(doc, recibo, historial, logoPath);
    }

    doc.end();
  } catch (error: any) {
    console.error('Error al generar PDF V2 masivo:', error);
    res.status(500).json({ error: 'Error al generar el PDF masivo V2' });
  }
};

export const exportReporteExcel = async (req: any, res: any): Promise<any> => {
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

export const exportReporteDeudasExcel = async (req: any, res: any): Promise<any> => {
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


export const getReciboById = async (req: any, res: any): Promise<any> => {
  const { id } = req.params;

  try {
    const recibo = await reciboRepo.findByIdCompleto(id);
    if (!recibo) return res.status(404).json({ error: 'Recibo no encontrado' });

    if (req.user?.nombre_rol === 'Socio' && req.user.id !== recibo.usuario_id) {
      return res.status(403).json({ error: 'No tienes permisos para ver este recibo' });
    }

    const historial = await reciboRepo.findHistorialConsumo(recibo.usuario_id, 6, recibo.periodo_inicio);
    const pagos_historial = await pagoRepo.findByRecibo(id);
    
    res.json({ recibo, historial, pagos_historial });
  } catch (error: any) {
    console.error('Error al obtener detalle del recibo:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};



export const updateCargos = async (req: any, res: any): Promise<any> => {
  const { id } = req.params;
  const cargos = req.body;
  try {
    const result = await reciboRepo.updateCargos(id, cargos);
    res.json({ message: 'Recibo actualizado exitosamente', data: result });
  } catch (error: any) {
    console.error('Error al actualizar cargos del recibo:', error);
    res.status(500).json({ error: 'Error al actualizar el recibo' });
  }
};

module.exports.updateCargos = updateCargos;
module.exports.refacturarRecibo = refacturarRecibo;

export const exportReportePdf = async (req: any, res: any): Promise<any> => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo,
      estado: req.query.estado,
      search: req.query.search
    };
    
    // We reuse exportAllRecibosPdfV2 logic for now, or just redirect
    return exportAllRecibosPdfV2(req, res);
  } catch (error: any) {
    console.error('Error al generar PDF Reporte:', error);
    res.status(500).json({ error: 'Error al generar el PDF del reporte' });
  }
};
