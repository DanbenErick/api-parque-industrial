const pagoRepo = require('../repositories/pagoRepository');
const ExcelJS = require('exceljs');

const getPagos = async (req, res) => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo
    };
    const pagos = await pagoRepo.findAll(filters);
    res.json(pagos);
  } catch (error) {
    console.error('Error al obtener pagos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const registrarPago = async (req, res) => {
  try {
    // req.user.id is passed to the repo to be set as @current_user_id for SQL triggers
    await pagoRepo.createConTransaccion(req.body, req.user.id);
    res.status(201).json({ message: 'Pago registrado y recibo actualizado a Pagado exitosamente' });
  } catch (error) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'Recibo no encontrado' });
    }
    if (error.message === 'ALREADY_PAID') {
      return res.status(400).json({ error: 'El recibo ya se encuentra pagado' });
    }
    if (error.message === 'NEWER_RECEIPT_EXISTS') {
      return res.status(400).json({ error: 'No puedes registrar un pago aquí porque ya existe un recibo más reciente (del mes siguiente) donde esta deuda ha sido incluida. Por favor, cobra el monto desde el recibo más actual.' });
    }
    if (error.message === 'INSUFFICIENT_AMOUNT') {
      return res.status(400).json({ error: 'El monto pagado no cubre el total del recibo' });
    }
    console.error('Error al registrar pago:', error);
    res.status(500).json({ error: 'Error interno del servidor al procesar el pago' });
  }
};

const exportResumenPagosExcel = async (req, res) => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo
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
    const agrupadoSocio = {};
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
        cantidad: stats.cantidad,
        total_abonado: stats.total
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
  } catch (error) {
    console.error('Error al generar Excel de pagos:', error);
    res.status(500).json({ error: 'Error al generar Excel de pagos' });
  }
};

module.exports = {
  registrarPago,
  getPagos,
  exportResumenPagosExcel
};
