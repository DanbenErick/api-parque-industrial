import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { ReciboRepository } from '../repositories/reciboRepository';;
import { AuditoriaRepository } from '../repositories/auditoriaRepository';;
import { PagoRepository } from '../repositories/pagoRepository';;
import { UsuarioRepository } from '../repositories/usuarioRepository';;
import { Database } from '../config/db';
import { RolUsuario } from '../types/enums';


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


interface IGetRecibosQuery {
  year?: string;
  periodo?: string;
  estado?: string;
  search?: string;
}

// -------------------------------------------------------
// GENERAR PDF DE RECIBO DE LUZ (Diseño Moderno & Elegante con todos los datos)
// -------------------------------------------------------
// -------------------------------------------------------
// GENERAR PDF DE RECIBO DE LUZ (V3 - DISEÑO PREMIUM)
// -------------------------------------------------------
const drawReciboLayout = (doc: any, recibo: any, historial: any, logoPath: any, cuentaBancaria: string) => {
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
  const headerH = 58;
  doc.rect(0, 0, doc.page.width, headerH).fill(NAVY);
  // Acento teal inferior
  doc.rect(0, headerH, doc.page.width, 3).fill(TEAL);

  // Logo con marco circular premium
  const logoCenterX = margin + 22;
  const logoCenterY = 30;
  const logoRadius = 20;

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
  const textStartX = margin + 55;
  doc.fillColor(WHITE).fontSize(14).font('Lexend-Bold');
  doc.text('PARQUE INDUSTRIAL', textStartX, 14);
  doc.fillColor(TEAL).fontSize(8).font('Lexend-Medium');
  doc.text('ANEXO 8 — JICAMARCA', textStartX, 31);
  doc.fillColor(SLATE_LT).fontSize(6.5).font('Lexend');
  doc.text('Sistema de Gestión Energética', textStartX, 42);
  y = headerH + 3 + 12;

  // ═══════════════════════════════════════════════
  // 2. DATOS DEL SOCIO Y PERIODO (2 COLUMNAS)
  // ═══════════════════════════════════════════════
  const col1W = W * 0.55;
  const col2W = W * 0.42;
  const col2X = margin + col1W + (W * 0.03);

  // -- Columna izquierda: Datos del socio
  doc.roundedRect(margin, y, col1W, 70, 5).fill(BG).strokeColor(BORDER).stroke();
  
  doc.fillColor(SLATE_LT).fontSize(6.5).font('Lexend-Medium');
  doc.text('DATOS DEL SOCIO', margin + 10, y + 6);
  
  doc.fillColor(NAVY).fontSize(11).font('Lexend-Bold');
  doc.text(recibo.nombre_razonsocial || '-', margin + 10, y + 18, { width: col1W - 20 });
  
  doc.fillColor(SLATE).fontSize(7.5).font('Lexend');
  doc.text(`${recibo.documento_identidad || '-'}`, margin + 10, y + 35);
  doc.text(`${recibo.direccion || '-'}`, margin + 10, y + 46);
  doc.fillColor(SLATE_LT).font('Lexend-Medium');
  doc.text(`Medidor: ${recibo.num_medidor || 'Sin medidor'} (${recibo.medidor_tipo === 'Tiempo Real' ? 'Hora Punta' : (recibo.medidor_tipo || 'Normal')})`, margin + 10, y + 58);

  // -- Columna derecha: Periodo
  doc.roundedRect(col2X, y, col2W, 70, 5).fill(BG).strokeColor(BORDER).stroke();
  
  doc.fillColor(TEAL).fontSize(6.5).font('Lexend-Medium');
  doc.text('MES FACTURADO', col2X + 10, y + 6);
  
  doc.fillColor(NAVY).fontSize(16).font('Lexend-Bold');
  doc.text(mes.toUpperCase(), col2X + 10, y + 22);
  doc.fillColor(NAVY).fontSize(12).font('Lexend-Medium');
  doc.text(anio, col2X + 10, y + 44);

  y += 78;

  // ═══════════════════════════════════════════════
  // 3. DETALLE DE LECTURAS (DINÁMICO)
  // ═══════════════════════════════════════════════
  const consPuntaLayout = parseFloat(recibo.consumo_calculado_punta) || 0;
  const fPotenciaLayout = parseFloat(recibo.factor_potencia) || 0;
  const maxDemandaN = parseFloat(recibo.max_demanda_fuera_punta) || 0;
  const maxDemandaP = parseFloat(recibo.max_demanda_punta) || 0;
  const esTiempoReal = consPuntaLayout > 0 || fPotenciaLayout > 0 || maxDemandaN > 0 || maxDemandaP > 0;

  const blockW = W / 4;
  let rowsOfBlocks = [];

  if (esTiempoReal) {
    rowsOfBlocks.push([
      { label: 'HORA NORMAL (Ant/Act)', value: `${fmt(recibo.lectura_anterior)} / ${fmt(recibo.lectura_actual)}`, sub: 'Lectura kWh' },
      { label: 'CONSUMO NORMAL',        value: `${fmt(recibo.consumo_calculado)}`,      sub: 'kWh Facturados' },
      { label: 'HORA PUNTA (Ant/Act)',  value: `${fmt(recibo.lectura_anterior_punta)} / ${fmt(recibo.lectura_actual_punta)}`, sub: 'Lectura Punta kWh' },
      { label: 'CONSUMO PUNTA',         value: `${fmt(recibo.consumo_calculado_punta)}`, sub: 'kWh Facturados Punta' }
    ]);
    rowsOfBlocks.push([
      { label: 'MÁX. DEM. FUERA PUNTA', value: `${fmt(maxDemandaN)}`, sub: 'kW' },
      { label: 'MÁX. DEM. PUNTA',       value: `${fmt(maxDemandaP)}`, sub: 'kW' },
      { label: 'ENERGÍA REACTIVA',      value: `${fmt(fPotenciaLayout)}`, sub: 'kVARh' },
      { label: 'N° MEDIDOR',            value: recibo.num_medidor || 'S/M', sub: 'Equipo Registrado' }
    ]);
  } else {
    rowsOfBlocks.push([
      { label: 'LECTURA ANTERIOR', value: fmt(recibo.lectura_anterior), sub: fmtDate(recibo.periodo_inicio) },
      { label: 'LECTURA ACTUAL',   value: fmt(recibo.lectura_actual),   sub: fmtDate(recibo.periodo_fin)    },
      { label: 'CONSUMO kWh',      value: fmt(recibo.consumo_calculado), sub: 'Mes Facturado'               },
      { label: 'N° MEDIDOR',       value: recibo.num_medidor || 'S/M',   sub: 'Equipo Registrado'           }
    ]);
  }

  const boxHeight = rowsOfBlocks.length * 46;
  doc.roundedRect(margin, y, W, boxHeight, 5).strokeColor(BORDER).stroke();

  rowsOfBlocks.forEach((blocks, rowIndex) => {
    const rowY = y + (rowIndex * 46);
    if (rowIndex > 0) {
      doc.moveTo(margin, rowY).lineTo(margin + W, rowY).strokeColor(BORDER).lineWidth(1).stroke();
    }
    blocks.forEach((b, i) => {
      const bx = margin + (blockW * i);
      if (i > 0) doc.moveTo(bx, rowY + 8).lineTo(bx, rowY + 38).strokeColor(BORDER).lineWidth(1).stroke();
      doc.fillColor(SLATE_LT).fontSize(6.5).font('Lexend-Medium');
      doc.text(b.label, bx + 10, rowY + 7, { lineBreak: false });
      doc.fillColor(NAVY).fontSize(11).font('Lexend-Bold');
      doc.text(b.value, bx + 10, rowY + 18, { lineBreak: false });
      doc.fillColor(SLATE_LT).fontSize(6.5).font('Lexend');
      doc.text(b.sub, bx + 10, rowY + 34, { lineBreak: false });
    });
  });

  y += boxHeight + 8;

  // ═══════════════════════════════════════════════
  // 4. TABLA DE IMPORTES FACTURADOS
  // ═══════════════════════════════════════════════
  // Header de la tabla
  doc.roundedRect(margin, y, W, 22, 5).fill(NAVY);
  doc.fillColor(WHITE).fontSize(7.5).font('Lexend-Bold');
  doc.text('DESCRIPCIÓN', margin + 12, y + 7, { lineBreak: false });
  doc.text('TARIFA', margin + W * 0.55, y + 7, { width: 60, align: 'right' as const, lineBreak: false });
  doc.text('IMPORTE (S/)', margin + W * 0.72, y + 7, { width: W * 0.25, align: 'right' as const, lineBreak: false });
  y += 24;

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
  if (fPotencia > 0) items.push({ desc: 'Cargo Energía Reactiva Capacitiva', tarifa: `S/ ${fmt(precioFP)}/kVARh`, monto: cargoFactorPot });

  const cargoMant = parseFloat(recibo.cargo_mantenimiento) || 0;
  if (cargoMant > 0) items.push({ desc: 'Mantenimiento de Red', tarifa: null, monto: cargoMant });

  const cargoFijo = parseFloat(recibo.cargo_fijo) || 0;
  if (cargoFijo > 0) items.push({ desc: 'Cargo Fijo Mensual', tarifa: null, monto: cargoFijo });

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
    const rowH = 16;
    if (i % 2 === 0) {
      doc.rect(margin, y, W, rowH).fill(BG);
    }
    doc.fillColor(SLATE).fontSize(8).font('Lexend');
    doc.text(item.desc, margin + 12, y + 3, { lineBreak: false });
    if (item.tarifa) {
      doc.fillColor(SLATE_LT).fontSize(7).font('Lexend-Light');
      doc.text(item.tarifa, margin + W * 0.48, y + 4, { width: 80, align: 'right' as const, lineBreak: false });
    }
    doc.fillColor(NAVY).fontSize(8).font('Lexend-Bold');
    doc.text(fmt(item.monto), margin + W * 0.72, y + 3, { width: W * 0.25, align: 'right' as const, lineBreak: false });
    y += rowH;
  });

  // Separator
  doc.moveTo(margin, y).lineTo(margin + W, y).strokeColor(BORDER).lineWidth(1).stroke();
  y += 4;

  // Subtotal del mes
  const subtotalMes = parseFloat(recibo.subtotal) || 0;
  doc.fillColor(SLATE).fontSize(8).font('Lexend-Medium');
  doc.text('Subtotal del mes', margin + 12, y + 2, { lineBreak: false });
  doc.fillColor(NAVY).font('Lexend-Bold');
  doc.text(fmt(subtotalMes), margin + W * 0.72, y + 2, { width: W * 0.25, align: 'right' as const, lineBreak: false });
  y += 15;

  // Deuda vencida
  const deudaVencida = parseFloat(recibo.deuda_vencida) || 0;
  if (deudaVencida > 0) {
    doc.fillColor(RED).fontSize(8).font('Lexend-Medium');
    doc.text('(+) Deuda Vencida de Meses Anteriores', margin + 12, y + 2, { lineBreak: false });
    doc.font('Lexend-Bold');
    doc.text(fmt(deudaVencida), margin + W * 0.72, y + 2, { width: W * 0.25, align: 'right' as const, lineBreak: false });
    y += 15;
  }

  // Descuento
  const descuento = parseFloat(recibo.descuento) || 0;
  if (descuento > 0) {
    doc.fillColor(TEAL).fontSize(8).font('Lexend-Medium');
    doc.text('(-) Saldo a Favor Aplicado', margin + 12, y + 2, { lineBreak: false });
    doc.font('Lexend-Bold');
    doc.text('-' + fmt(descuento), margin + W * 0.72, y + 2, { width: W * 0.25, align: 'right' as const, lineBreak: false });
    y += 15;
  }

  y += 2;

  // ═══════════════════════════════════════════════
  // 5. BARRA DE TOTAL
  // ═══════════════════════════════════════════════
  const total = parseFloat(recibo.total) || 0;
  
  // Línea gruesa divisoria solo en la parte derecha
  doc.moveTo(margin + W * 0.5, y).lineTo(margin + W, y).strokeColor(NAVY).lineWidth(2).stroke();
  y += 8;

  doc.fillColor(NAVY).fontSize(10).font('Lexend-Bold');
  doc.text('TOTAL A PAGAR', margin + W * 0.4, y + 3, { width: W * 0.3, align: 'right' as const, lineBreak: false });
  
  doc.fillColor(NAVY).fontSize(18).font('Lexend-Bold');
  doc.text(`S/ ${fmt(total)}`, margin + W * 0.72, y, { width: W * 0.25, align: 'right' as const, lineBreak: false });
  
  y += 28;

  // ═══════════════════════════════════════════════
  // 6. FECHAS + HISTORIAL (2 COLUMNAS)
  // ═══════════════════════════════════════════════
  const leftBoxW = W * 0.42;
  const rightBoxW = W * 0.55;
  const rightBoxX = margin + leftBoxW + (W * 0.03);

  // -- Fechas
  doc.roundedRect(margin, y, leftBoxW, 76, 5).strokeColor(BORDER).stroke();
  
  doc.fillColor(SLATE_LT).fontSize(6.5).font('Lexend-Medium');
  doc.text('FECHAS IMPORTANTES', margin + 10, y + 6);

  doc.fillColor(SLATE).fontSize(8).font('Lexend');
  doc.text('Emisión:', margin + 10, y + 21);
  doc.font('Lexend-Bold').text(fmtDate(recibo.fecha_emision), margin + 72, y + 21, { lineBreak: false });

  doc.fillColor(RED).font('Lexend');
  doc.text('Vencimiento:', margin + 10, y + 36);
  doc.font('Lexend-Bold').text(fmtDate(recibo.fecha_vencimiento), margin + 72, y + 36, { lineBreak: false });

  const fechaCorte = recibo.fecha_corte ? new Date(recibo.fecha_corte) : (recibo.fecha_vencimiento ? new Date(new Date(recibo.fecha_vencimiento).getTime() + 86400000) : null);
  doc.fillColor(RED).font('Lexend');
  doc.text('Corte:', margin + 10, y + 51);
  doc.font('Lexend-Bold').text(fmtDate(fechaCorte), margin + 72, y + 51, { lineBreak: false });

  // Aviso pequeño
  doc.fillColor(SLATE_LT).fontSize(5.5).font('Lexend-Light');
  doc.text('Pague puntual para evitar corte y recargo.', margin + 10, y + 66);

  // -- Historial de consumo (gráfico)
  doc.roundedRect(rightBoxX, y, rightBoxW, 76, 5).strokeColor(BORDER).stroke();
  doc.rect(rightBoxX, y, rightBoxW, 16).fill(BG);
  doc.fillColor(SLATE_LT).fontSize(6.5).font('Lexend-Medium');
  doc.text('HISTORIAL DE CONSUMO (kWh)', rightBoxX + 10, y + 5);

  if (historial.length > 0) {
    const chartY = y + 20;
    const chartH = 42;
    const chartW = rightBoxW - 20;
    const maxVal = Math.max(...historial.map((h: any) => (parseFloat(h.consumo_calculado) || 0) + (parseFloat(h.consumo_calculado_punta) || 0)), 10);
    const barSpacing = chartW / historial.length;
    const barW = Math.min(barSpacing - 6, 26);

    historial.forEach((h: any, i: any) => {
      const val = (parseFloat(h.consumo_calculado) || 0) + (parseFloat(h.consumo_calculado_punta) || 0);
      const barH = (val / maxVal) * chartH;
      const bx = rightBoxX + 10 + (i * barSpacing) + (barSpacing - barW) / 2;
      const by = chartY + chartH - barH;

      const isLast = i === historial.length - 1;
      doc.rect(bx, by, barW, barH).fill(isLast ? TEAL : '#cbd5e1');
      
      doc.fillColor(NAVY).fontSize(5.5).font('Lexend-Bold');
      doc.text(Math.round(val).toString(), bx - 3, by - 8, { width: barW + 6, align: 'center' as const, lineBreak: false });

      const mLabel = h.mes_anio ? h.mes_anio.substring(5) : '';
      const monthNames: any = { '01':'Ene','02':'Feb','03':'Mar','04':'Abr','05':'May','06':'Jun','07':'Jul','08':'Ago','09':'Sep','10':'Oct','11':'Nov','12':'Dic' };
      doc.fillColor(SLATE_LT).fontSize(4.5).font('Lexend');
      doc.text(monthNames[mLabel] || mLabel, bx - 3, chartY + chartH + 3, { width: barW + 6, align: 'center' as const, lineBreak: false });
    });
  } else {
    doc.fillColor(SLATE_LT).fontSize(7).font('Lexend');
    doc.text('Sin datos históricos.', rightBoxX + 10, y + 42);
  }

  y += 84;

  // ═══════════════════════════════════════════════
  // 7. COMUNICADO
  // ═══════════════════════════════════════════════
  doc.roundedRect(margin, y, W, 28, 4).fill(BG);
  doc.fillColor(SLATE_LT).fontSize(6).font('Lexend-Medium');
  doc.text('COMUNICADO', margin + 10, y + 4);
  doc.fillColor(SLATE).fontSize(6).font('Lexend');
  doc.text('Estimado Socio, recuerde que el pago puntual evita el corte del servicio y el cobro de reconexión. Para reclamos acérquese a la oficina administrativa dentro de los primeros 5 días del mes. Conserve este documento como comprobante de su facturación.', margin + 10, y + 14, { width: W - 20 });
  y += 34;

  // ═══════════════════════════════════════════════
  // 8. TALÓN DE PAGO (pie con línea de corte)
  // ═══════════════════════════════════════════════
  // Posicionar talón dinámicamente: máximo entre y actual y la zona segura inferior
  let talonY = Math.max(y + 4, doc.page.height - 122);
  
  // Línea de corte
  doc.save();
  doc.dash(4, { space: 4 });
  doc.moveTo(margin, talonY).lineTo(doc.page.width - margin, talonY).strokeColor(SLATE_LT).lineWidth(0.5).stroke();
  doc.restore();
  
  talonY += 8;
  doc.fillColor(NAVY).fontSize(9).font('Lexend-Bold');
  doc.text('TALÓN DE PAGO — PARQUE INDUSTRIAL ANEXO 8', margin, talonY);

  talonY += 15;
  // Datos del talón en 3 columnas
  const tc1 = margin;
  const tc2 = margin + W * 0.35;
  const tc3 = margin + W * 0.68;

  doc.fillColor(SLATE_LT).fontSize(6.5).font('Lexend-Medium');
  doc.text('SOCIO', tc1, talonY);
  doc.fillColor(NAVY).fontSize(8).font('Lexend-Bold');
  doc.text(recibo.nombre_razonsocial || '-', tc1, talonY + 10, { width: W * 0.33 });

  doc.fillColor(SLATE_LT).fontSize(6.5).font('Lexend-Medium');
  doc.text('Nº RECIBO', tc2, talonY);
  doc.fillColor(NAVY).fontSize(8).font('Lexend-Bold');
  doc.text(recibo.numero_comprobante || recibo.id.toString(), tc2, talonY + 10);
  
  doc.fillColor(SLATE_LT).fontSize(6.5).font('Lexend-Medium');
  doc.text('PERIODO', tc2, talonY + 24);
  doc.fillColor(NAVY).fontSize(8).font('Lexend-Bold');
  doc.text(`${mes} ${anio}`, tc2, talonY + 34);

  doc.fillColor(SLATE_LT).fontSize(6.5).font('Lexend-Medium');
  doc.text('VENCIMIENTO', tc2 + 90, talonY + 24);
  doc.fillColor(RED).fontSize(8).font('Lexend-Bold');
  doc.text(fmtDate(recibo.fecha_vencimiento), tc2 + 90, talonY + 34);

  // Monto a pagar
  doc.roundedRect(tc3, talonY - 4, W * 0.3, 48, 5).fill(TEAL);
  doc.fillColor(WHITE).fontSize(6.5).font('Lexend-Medium');
  doc.text('MONTO A PAGAR', tc3 + 10, talonY + 3);
  doc.fillColor(WHITE).fontSize(18).font('Lexend-Bold');
  doc.text(`S/ ${fmt(total)}`, tc3 + 10, talonY + 16);

  // Cuenta bancaria — integrado en la misma línea del talón
  talonY += 52;
  doc.roundedRect(margin, talonY - 2, W, 20, 4).fillAndStroke('#fef3c7', AMBER);
  doc.fillColor('#92400e').fontSize(8.5).font('Lexend-Bold');
  doc.text(`DEPOSITAR EN: ${cuentaBancaria || 'BCP — Nº Cta: 191-14302973046'} | Conserve su voucher.`, margin + 8, talonY + 3, { align: 'center', width: W - 16 });
};
// -------------------------------------------------------
// GENERAR PDF MASIVO DE RECIBOS (V2)
// -------------------------------------------------------
export class PdfService {
    constructor(private reciboRepo: ReciboRepository, private auditoriaRepo: AuditoriaRepository, private pagoRepo: PagoRepository, private usuarioRepo: UsuarioRepository, private db: Database) {}

    public buildReciboPdf = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          const id = Number(req.params.id);

          

          try {
            const recibo = await this.reciboRepo.findByIdCompleto(id);
            if (!recibo) return res.status(404).json({ error: 'Recibo no encontrado' });

            const historial = await this.reciboRepo.findHistorialConsumo(recibo.medidor_id, 7, recibo.periodo_inicio);
            let cuentaBancaria = '';
            try {
              const [configRows]: any = await this.db.query(`SELECT cuenta_bancaria FROM configuracion_sistema LIMIT 1`);
              cuentaBancaria = configRows[0]?.cuenta_bancaria || '';
            } catch (e) {
              // Ignore error if table doesn't exist
            }



            const doc = new PDFDocument({ size: 'A4', margin: 32 });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=recibo_${recibo.numero_comprobante || id}.pdf`);
            
            const fontPath = path.join(__dirname, '../fonts');
            doc.registerFont('Lexend', path.join(fontPath, 'Lexend-Regular.ttf'));
            doc.registerFont('Lexend-Light', path.join(fontPath, 'Lexend-Light.ttf'));
            doc.registerFont('Lexend-Medium', path.join(fontPath, 'Lexend-Medium.ttf'));
            doc.registerFont('Lexend-Bold', path.join(fontPath, 'Lexend-Bold.ttf'));

            doc.pipe(res);

            const logoPath = path.join(__dirname, '../assets/logo.png');
            drawReciboLayout(doc, recibo, historial, logoPath, cuentaBancaria);
            doc.end();

            // Registrar auditoría
            await this.auditoriaRepo.registrarDescarga({
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
    public buildAllRecibosPdf = async (req: Request<{}, any, any, IGetRecibosQuery>, res: Response): Promise<any> => {
          try {
            const filters = {
              year: req.query.year,
              periodo: req.query.periodo,
              estado: req.query.estado,
              search: req.query.search
            };
            
            const recibos: any = await this.reciboRepo.findAllCompletos(filters);
            if (!recibos || (recibos as any).length === 0) {
              return res.status(404).json({ error: 'No se encontraron recibos para exportar.' });
            }

            const doc = new PDFDocument({ size: 'A4', margin: 32, autoFirstPage: false });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=recibos_masivos_${filters.periodo || 'todos'}.pdf`);
            
            const fontPath = path.join(__dirname, '../fonts');
            doc.registerFont('Lexend', path.join(fontPath, 'Lexend-Regular.ttf'));
            doc.registerFont('Lexend-Light', path.join(fontPath, 'Lexend-Light.ttf'));
            doc.registerFont('Lexend-Medium', path.join(fontPath, 'Lexend-Medium.ttf'));
            doc.registerFont('Lexend-Bold', path.join(fontPath, 'Lexend-Bold.ttf'));

            doc.pipe(res);
            
            const logoPath = path.join(__dirname, '../assets/logo.png');

            const medidorIds = [...new Set(recibos.map((r: any) => r.medidor_id).filter(Boolean))];
            const historiales = await this.reciboRepo.findHistorialConsumoMultiple(medidorIds);

            let cuentaBancaria = '';
            try {
              const [configRows]: any = await this.db.query(`SELECT cuenta_bancaria FROM configuracion_sistema LIMIT 1`);
              cuentaBancaria = configRows[0]?.cuenta_bancaria || '';
            } catch (e) {
              // Ignore error if table doesn't exist
            }

            for (let i = 0; i < recibos.length; i++) {
              const recibo = recibos[i];
              const historial = historiales[recibo.medidor_id] || [];

              doc.addPage({ size: 'A4', margin: 32 });
              drawReciboLayout(doc, recibo, historial, logoPath, cuentaBancaria);
            }

            doc.end();
          } catch (error: any) {
            console.error('Error al generar PDF V2 masivo:', error);
            res.status(500).json({ error: 'Error al generar el PDF masivo V2' });
          }
        };
    
    public buildReporteFacturacionPdf = async (req: Request<{}, any, any, any>, res: Response): Promise<any> => {
          try {
            const filters = {
              year: req.query.year,
              periodo: req.query.periodo,
              estado: req.query.estado,
              search: req.query.search
            };
            
            const recibos = await this.reciboRepo.findAllCompletos(filters);
            if (!recibos || (recibos as any).length === 0) {
              return res.status(404).json({ error: 'No se encontraron recibos para exportar.' });
            }

            const doc = new PDFDocument({ size: 'A4', margin: 30, layout: 'landscape', bufferPages: true });

            let periodoText = 'TODOS';
            if (filters.periodo) periodoText = filters.periodo;
            else if (filters.year) periodoText = `AÑO ${filters.year}`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=Reporte_Facturacion_${periodoText.replace(/ /g, '_')}.pdf`);

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
              doc.text('REPORTE DE FACTURACIÓN', titleX, 26, { width: titleW, align: 'right' as const });

              doc.fillColor(TEAL).fontSize(11).font('Lexend-Medium');
              doc.text(`PERIODO: ${periodoText}`, titleX, 44, { width: titleW, align: 'right' as const });

              doc.moveTo(30, 75).lineTo(doc.page.width - 30, 75).lineWidth(1).strokeColor('#e2e8f0').stroke();
            };

            drawHeader();

            let y = 100;
            
            const columns = [
              { header: 'Nº COMP.', x: 30, w: 80 },
              { header: 'SOCIO / EMPRESA', x: 120, w: 220 },
              { header: 'MEDIDOR', x: 350, w: 80 },
              { header: 'PERIODO', x: 440, w: 70 },
              { header: 'EMISIÓN', x: 520, w: 65 },
              { header: 'VENCIMIENTO', x: 595, w: 65 },
              { header: 'TOTAL (S/)', x: 670, w: 65, align: 'right' as const },
              { header: 'ESTADO', x: 745, w: 65, align: 'center' as const }
            ];

            const drawTableHeader = (startY: number) => {
              doc.roundedRect(30, startY - 5, doc.page.width - 60, 22, 4).fill(NAVY);
              doc.fillColor(WHITE).fontSize(8).font('Lexend-Bold');
              columns.forEach(col => {
                doc.text(col.header, col.x, startY + 1, { width: col.w, align: col.align || 'left' });
              });
              return startY + 25;
            };

            y = drawTableHeader(y);
            
            const formatNum = (n: any) => parseFloat(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            const formatDate = (d: any) => d ? new Date(d).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';

            let totalGeneral = 0;

            recibos.forEach((r: any, i: number) => {
              if (y > doc.page.height - 60) {
                doc.addPage({ size: 'A4', margin: 30, layout: 'landscape' });
                drawHeader();
                y = drawTableHeader(100);
              }

              if (i % 2 === 0) {
                doc.rect(30, y - 2, doc.page.width - 60, 16).fill('#f8fafc');
              }
              
              doc.fontSize(8).font('Lexend-Medium');

              doc.fillColor('#334155').text(r.numero_comprobante || '-', columns[0].x, y + 2, { width: columns[0].w, align: columns[0].align || 'left' });
              
              const socioName = (r.nombre_razonsocial || '-').substring(0, 45);
              doc.fillColor(NAVY).font('Lexend-Bold').text(socioName, columns[1].x, y + 2, { width: columns[1].w, align: columns[1].align || 'left' });
              
              doc.font('Lexend-Medium');
              doc.fillColor('#64748b').text(r.num_medidor || r.medidor_num_serie || 'Sin medidor', columns[2].x, y + 2, { width: columns[2].w, align: columns[2].align || 'left' });
              doc.fillColor('#475569').text(r.mes_anio || r.periodo || '-', columns[3].x, y + 2, { width: columns[3].w, align: columns[3].align || 'left' });
              doc.fillColor('#64748b').text(formatDate(r.fecha_emision), columns[4].x, y + 2, { width: columns[4].w, align: columns[4].align || 'left' });
              doc.fillColor('#64748b').text(formatDate(r.fecha_vencimiento), columns[5].x, y + 2, { width: columns[5].w, align: columns[5].align || 'left' });
              
              const total = parseFloat(r.total) || 0;
              totalGeneral += total;
              doc.fillColor(NAVY).font('Lexend-Bold').text(formatNum(total), columns[6].x, y + 2, { width: columns[6].w, align: columns[6].align || 'left' });

              // Estado Color
              doc.font('Lexend-Bold');
              if (r.estado === 'Pagado') doc.fillColor('#10b981');
              else if (r.estado === 'Pendiente') doc.fillColor('#f59e0b');
              else if (r.estado === 'Vencido') doc.fillColor('#ef4444');
              else doc.fillColor('#64748b');

              doc.text(r.estado || '-', columns[7].x, y + 2, { width: columns[7].w, align: columns[7].align || 'left' });

              y += 20;
            });

            // Resumen Final
            if (y > doc.page.height - 80) {
              doc.addPage({ size: 'A4', margin: 30, layout: 'landscape' });
              drawHeader();
              y = 100;
            }
            
            y += 10;
            doc.moveTo(doc.page.width - 250, y).lineTo(doc.page.width - 30, y).lineWidth(1).strokeColor(NAVY).stroke();
            y += 10;

            doc.fillColor(NAVY).fontSize(10).font('Lexend-Bold');
            doc.text('TOTAL FACTURADO:', doc.page.width - 250, y, { width: 120, align: 'right' });
            doc.fillColor('#0f172a').fontSize(12).font('Lexend-Bold');
            doc.text(`S/ ${formatNum(totalGeneral)}`, doc.page.width - 120, y - 1, { width: 90, align: 'right' });

            // Numeración de páginas
            const pages = doc.bufferedPageRange();
            for (let i = 0; i < pages.count; i++) {
              doc.switchToPage(i);
              doc.fillColor(SLATE_LT).fontSize(8).font('Lexend-Medium');
              doc.text(`Página ${i + 1} de ${pages.count}`, 0, doc.page.height - 30, { align: 'center' });
            }

            doc.end();
          } catch (error: any) {
            console.error('Error al generar Reporte Facturacion PDF:', error);
            res.status(500).json({ error: 'Error al generar el reporte PDF de facturación' });
          }
        };

    public buildReportePagosPdf = async (req: Request<{}, any, any, IGetPagosQuery>, res: Response): Promise<any> => {
          try {
            const filters = {
              year: req.query.year,
              periodo: req.query.periodo as string
            };
            
            // Traer todos los pagos
            const pagos = await this.pagoRepo.findAllNoLimit(filters);

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
              { header: 'FECHA PAGO', x: 30, w: 115 },
              { header: 'SOCIO / EMPRESA', x: 150, w: 230 },
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
              
              let socioStr = p.socio || '-';
              if (p.medidores_str) {
                socioStr += `\nMedidores: ${p.medidores_str}`;
              } else {
                socioStr += `\nSin medidor`;
              }
              const socioName = socioStr.substring(0, 80);
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
    public buildUsuariosPdf = async (req: Request<{}, any, any, IGetUsuariosQuery>, res: Response): Promise<any> => {
          try {
            const search = (req.query.search as string) || '';
            const rol_id = req.query.rol_id ? parseInt(req.query.rol_id as string) : null;
            const estado = req.query.estado || null;
            const rubro = (req.query.rubro as string) || null;

            const result = await this.usuarioRepo.findAll(search, rol_id, estado, rubro, 10000, 0);
            const usuarios = result.data;

            const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });

            const timestamp = new Date().toISOString().slice(0, 10);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=usuarios_${timestamp}.pdf`);
            doc.pipe(res);

            // Header del documento
            const logoPath = path.join(__dirname, '../assets/logo.png');
            if (fs.existsSync(logoPath)) {
              doc.image(logoPath, 40, 40, { width: 50 });
              doc.y = 40;
            } else {
              doc.y = 40;
            }

            doc.fillColor('#0F172A').fontSize(20).font('Helvetica-Bold').text('Parque Industrial Jicamarca', 100, 45);
            doc.fillColor('#64748B').fontSize(11).font('Helvetica').text('Directorio Oficial de Usuarios y Socios', 100, 68);
            
            // Meta info a la derecha
            doc.fontSize(9).fillColor('#94A3B8').text(`Fecha de emisión: ${new Date().toLocaleDateString('es-PE')}`, 0, 45, { align: 'right' });
            doc.text(`Hora: ${new Date().toLocaleTimeString('es-PE')}`, 0, 58, { align: 'right' });
            doc.fillColor('#0F172A').font('Helvetica-Bold').text(`Total registros: ${usuarios.length}`, 0, 71, { align: 'right' });

            // Línea separadora
            doc.moveTo(40, 100).lineTo(800, 100).lineWidth(1).strokeColor('#E2E8F0').stroke();
            doc.y = 120;

            // Configuración de tabla
            const headers = ['#', 'Documento', 'Nombre / Razón Social', 'Rol', 'Cargo', 'Medidor(es)', 'Estado'];
            const colWidths = [30, 80, 200, 80, 110, 200, 60];

            const startX = 40;
            let currentY = doc.y;

            // Fila de encabezados
            doc.roundedRect(startX, currentY, 760, 24, 4).fill('#0F172A');
            let xPos = startX;
            headers.forEach((header, i) => {
              doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
                 .text(header, xPos + 8, currentY + 7, { width: colWidths[i] - 16, ellipsis: true });
              xPos += colWidths[i];
            });
            currentY += 24;

            // Filas de datos
            usuarios.forEach((u, index) => {
              // Salto de página
              if (currentY > 510) {
                doc.addPage();
                currentY = 40;
                
                doc.roundedRect(startX, currentY, 760, 24, 4).fill('#0F172A');
                let tempX = startX;
                headers.forEach((header, i) => {
                  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
                     .text(header, tempX + 8, currentY + 7, { width: colWidths[i] - 16, ellipsis: true });
                  tempX += colWidths[i];
                });
                currentY += 24;
              }

              let medidoresStr = 'Sin Medidor';
              if (u.medidores) {
                try {
                  const meds = typeof u.medidores === 'string' ? JSON.parse(u.medidores) : u.medidores;
                  if (meds && meds.length > 0) {
                    medidoresStr = meds.map((m: any) => `${m.num_serie} (${m.tipo})`).join(', ');
                  }
                } catch(e) {}
              }

              const rowHeight = 22;
              
              // Fondo Cebra
              if (index % 2 === 0) {
                doc.rect(startX, currentY, 760, rowHeight).fill('#F8FAFC');
              }

              xPos = startX;
              
              doc.fillColor('#64748B').font('Helvetica').fontSize(8).text((index + 1).toString(), xPos + 8, currentY + 6, { width: colWidths[0] - 16 });
              xPos += colWidths[0];

              doc.fillColor('#475569').font('Helvetica').text(u.documento_identidad || '-', xPos + 8, currentY + 6, { width: colWidths[1] - 16 });
              xPos += colWidths[1];

              doc.fillColor('#0F172A').font('Helvetica-Bold').text(u.nombre_razonsocial || '-', xPos + 8, currentY + 6, { width: colWidths[2] - 16, ellipsis: true });
              xPos += colWidths[2];

              doc.fillColor('#3B82F6').font('Helvetica-Bold').text(u.nombre_rol || '-', xPos + 8, currentY + 6, { width: colWidths[3] - 16, ellipsis: true });
              xPos += colWidths[3];

              doc.fillColor('#475569').font('Helvetica').text(u.cargo_representante || '-', xPos + 8, currentY + 6, { width: colWidths[4] - 16, ellipsis: true });
              xPos += colWidths[4];

              doc.fillColor('#64748B').font('Helvetica').text(medidoresStr, xPos + 8, currentY + 6, { width: colWidths[5] - 16, ellipsis: true });
              xPos += colWidths[5];

              if (u.es_activo) {
                doc.fillColor('#16A34A').font('Helvetica-Bold').text('Activo', xPos + 8, currentY + 6, { width: colWidths[6] - 16 });
              } else {
                doc.fillColor('#DC2626').font('Helvetica-Bold').text('Inactivo', xPos + 8, currentY + 6, { width: colWidths[6] - 16 });
              }

              // Línea divisoria muy sutil
              doc.moveTo(startX, currentY + rowHeight).lineTo(startX + 760, currentY + rowHeight).lineWidth(0.5).strokeColor('#F1F5F9').stroke();

              currentY += rowHeight;
            });

            // Cierre de tabla
            doc.moveTo(startX, currentY).lineTo(startX + 760, currentY).lineWidth(1).strokeColor('#CBD5E1').stroke();
            
            // Pie de página
            doc.moveDown(2);
            doc.fillColor('#94A3B8').font('Helvetica-Oblique').fontSize(8).text('Documento oficial generado automáticamente por el Sistema de Gestión.', startX, doc.y, { align: 'center' });

            doc.end();
          } catch (error) {
            res.status(500).json({ error: 'Error al generar el archivo PDF' });
          }
        };

    
    public buildAllTicketsPagoPdf = async (req: Request<{}, any, any, any>, res: Response): Promise<any> => {
          try {
            const filters = {
              year: req.query.year,
              periodo: req.query.periodo as string,
              search: req.query.search as string
            };
            
            const pagos: any = await this.pagoRepo.findAllNoLimit(filters);
            if (!pagos || pagos.length === 0) {
              return res.status(404).json({ error: 'No se encontraron pagos para exportar.' });
            }

            const doc = new PDFDocument({ size: 'A5', layout: 'landscape', margin: 32, autoFirstPage: false });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=tickets_pagos_masivos_${filters.periodo || 'todos'}.pdf`);
            
            const fontPath = path.join(__dirname, '../fonts');
            doc.registerFont('Lexend', path.join(fontPath, 'Lexend-Regular.ttf'));
            doc.registerFont('Lexend-Bold', path.join(fontPath, 'Lexend-Bold.ttf'));

            doc.pipe(res);

            pagos.forEach((pago: any) => {
              doc.addPage();
              
              const primaryColor = '#1e3a8a';
              const secondaryColor = '#64748b';
              const blackColor = '#0f172a';
              
              const startX = 32;
              let y = 32;
              const colWidth = 530; 

              // Header
              doc.rect(startX, y, colWidth, 40).fill(primaryColor);
              doc.font('Lexend-Bold').fontSize(16).fillColor('#ffffff')
                .text('TICKET DE PAGO', startX + 15, y + 12);
                
              doc.fontSize(10).text(`COMPROBANTE: ${pago.numero_comprobante || 'S/N'}`, startX, y + 15, { width: colWidth - 15, align: 'right' });
              
              y += 50;

              // Datos del Parque
              doc.font('Lexend-Bold').fontSize(14).fillColor(primaryColor)
                .text('PARQUE INDUSTRIAL', startX, y);
              y += 18;
              doc.font('Lexend').fontSize(9).fillColor(secondaryColor)
                .text('ANEXO 8 - JICAMARCA', startX, y);
              
              doc.font('Lexend-Bold').fontSize(10).fillColor(blackColor)
                .text(`FECHA: ${new Date(pago.fecha_pago).toLocaleString('es-PE')}`, startX, y - 18, { width: colWidth, align: 'right' });
              doc.font('Lexend').fontSize(9).fillColor(secondaryColor)
                .text(`OPERACIÓN: ${pago.numero_operacion || '-'}`, startX, y, { width: colWidth, align: 'right' });

              y += 30;
              doc.moveTo(startX, y).lineTo(startX + colWidth, y).strokeColor('#e2e8f0').lineWidth(1).stroke();
              y += 20;

              // Datos del Socio
              doc.font('Lexend-Bold').fontSize(11).fillColor(primaryColor).text('DATOS DEL SOCIO', startX, y);
              y += 20;
              doc.font('Lexend-Bold').fontSize(10).fillColor(blackColor).text('Nombre/Razón Social:', startX, y);
              doc.font('Lexend').text(pago.socio || '-', startX + 130, y);
              y += 18;
              doc.font('Lexend-Bold').text('Medidor:', startX, y);
              doc.font('Lexend').text(pago.medidor_num_serie || 'Sin Medidor', startX + 130, y);
              
              y += 30;
              doc.moveTo(startX, y).lineTo(startX + colWidth, y).strokeColor('#e2e8f0').stroke();
              y += 20;

              // Detalle de Pago
              doc.font('Lexend-Bold').fontSize(11).fillColor(primaryColor).text('DETALLE DEL PAGO', startX, y);
              y += 20;
              doc.font('Lexend-Bold').fontSize(10).fillColor(blackColor).text('Periodo Facturado:', startX, y);
              doc.font('Lexend').text(pago.periodo || '-', startX + 130, y);
              y += 18;
              doc.font('Lexend-Bold').text('Método de Pago:', startX, y);
              doc.font('Lexend').text(pago.metodo_pago || '-', startX + 130, y);
              y += 18;
              doc.font('Lexend-Bold').text('Monto Total Recibo:', startX, y);
              doc.font('Lexend').text(`S/ ${parseFloat(pago.recibo_total || '0').toFixed(2)}`, startX + 130, y);
              
              y += 30;
              
              // Total Box
              doc.rect(startX + 300, y, 230, 45).fill('#f1f5f9');
              doc.font('Lexend-Bold').fontSize(12).fillColor(secondaryColor)
                .text('MONTO PAGADO:', startX + 315, y + 15);
              doc.font('Lexend-Bold').fontSize(16).fillColor(primaryColor)
                .text(`S/ ${parseFloat(pago.monto_pagado || '0').toFixed(2)}`, startX + 315, y + 13, { width: 200, align: 'right' });

              // Footer
              y = 350;
              doc.font('Lexend').fontSize(9).fillColor(secondaryColor)
                .text('¡Gracias por su puntualidad! Este es un comprobante de pago válido.', startX, y, { width: colWidth, align: 'center' });
            });

            doc.end();
          } catch (error) {
            console.error('Error al generar Tickets Masivos PDF:', error);
            res.status(500).json({ error: 'Error al generar los tickets masivos' });
          }
        };

    public buildTicketPagoPdf = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          const pagoId = parseInt(req.params.id);
          try {
            // Obtener datos del pago
            const [pagos]: any = await this.db.query(`
              SELECT p.*, r.numero_comprobante, r.total as recibo_total,
                     u.nombre_razonsocial as socio, u.documento_identidad,
                     pf.mes_anio as periodo, m.num_serie as medidor_num_serie
              FROM pago p
              INNER JOIN recibo r ON p.recibo_id = r.id
              INNER JOIN usuario u ON r.usuario_id = u.id
              INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id
              LEFT JOIN lectura l ON r.lectura_id = l.id
              LEFT JOIN medidor m ON l.medidor_id = m.id
              WHERE p.id = ? AND p.deleted_at IS NULL
            `, [pagoId]);

            if (pagos.length === 0) {
              return res.status(404).json({ error: 'Pago no encontrado' });
            }

            const pago = pagos[0];

            // Formato ticket: Ancho típico 80mm (~226 puntos)
            const width = 226;
            const doc = new PDFDocument({
              size: [width, 600], 
              margin: 15
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename=ticket_pago_${pago.id}.pdf`);
            doc.pipe(res);

            const fontPath = path.join(__dirname, '../fonts');
            doc.registerFont('Lexend', path.join(fontPath, 'Lexend-Regular.ttf'));
            doc.registerFont('Lexend-Bold', path.join(fontPath, 'Lexend-Bold.ttf'));

            let y = 15;

            doc.font('Lexend-Bold').fontSize(12).text('PARQUE INDUSTRIAL', 0, y, { align: 'center', width });
            y += 14;
            doc.font('Lexend').fontSize(9).text('ANEXO 8 - JICAMARCA', 0, y, { align: 'center', width });
            y += 18;

            doc.moveTo(15, y).lineTo(width - 15, y).dash(2, { space: 2 }).strokeColor('#000').lineWidth(1).stroke();
            doc.undash();
            y += 8;

            doc.font('Lexend-Bold').fontSize(11).text('TICKET DE PAGO', 0, y, { align: 'center', width });
            y += 16;
            doc.font('Lexend').fontSize(8).text(`Nº Operación: ${pago.numero_operacion || pago.id}`, 0, y, { align: 'center', width });
            y += 14;
            doc.text(`Fecha: ${new Date(pago.fecha_pago).toLocaleString('es-PE')}`, 0, y, { align: 'center', width });
            y += 18;

            doc.moveTo(15, y).lineTo(width - 15, y).dash(2, { space: 2 }).stroke();
            doc.undash();
            y += 8;

            const drawRow = (lbl: string, val: string) => {
              doc.font('Lexend').fontSize(8).text(lbl, 15, y, { width: 80 });
              doc.font('Lexend-Bold').text(val, 95, y, { width: width - 110, align: 'right' });
              y += Math.max(doc.heightOfString(lbl, { width: 80 }), doc.heightOfString(val, { width: width - 110 })) + 2;
            };

            drawRow('Socio:', pago.socio);
            if (pago.documento_identidad) drawRow('DNI/RUC:', pago.documento_identidad);
            if (pago.medidor_num_serie) drawRow('Medidor:', pago.medidor_num_serie);
            drawRow('Recibo Nº:', pago.numero_comprobante || '-');
            drawRow('Periodo:', pago.periodo || '-');
            drawRow('Método:', pago.metodo_pago);
            
            y += 6;
            doc.moveTo(15, y).lineTo(width - 15, y).dash(2, { space: 2 }).stroke();
            doc.undash();
            y += 8;

            doc.font('Lexend-Bold').fontSize(10).text('MONTO PAGADO:', 15, y);
            doc.fontSize(14).text(`S/ ${parseFloat(pago.monto_pagado).toFixed(2)}`, 15, y + 14, { align: 'right', width: width - 30 });
            y += 36;

            doc.moveTo(15, y).lineTo(width - 15, y).dash(2, { space: 2 }).stroke();
            doc.undash();
            y += 10;

            doc.font('Lexend').fontSize(7).text('Conserve este ticket como comprobante de su pago.', 15, y, { align: 'center', width: width - 30 });
            y += 15;
            doc.text('¡Gracias por su puntualidad!', 15, y, { align: 'center', width: width - 30 });
            
            doc.end();

            await this.auditoriaRepo.registrarDescarga({
              usuario_id: req.user.id,
              tipo_documento: 'Ticket de Pago PDF',
              referencia_id: pagoId,
              detalles: `Descarga de ticket de pago ${pagoId}`
            });
          } catch (error: any) {
            console.error('Error al generar Ticket de Pago:', error);
            res.status(500).json({ error: 'Error al generar Ticket de Pago' });
          }
        };
}
