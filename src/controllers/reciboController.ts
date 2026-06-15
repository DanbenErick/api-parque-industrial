import * as pdfService from '../services/pdfService';
import * as excelService from '../services/excelService';

import { Request, Response } from 'express';
import fs from 'fs';
import * as auditoriaRepo from '../repositories/auditoriaRepository';

import * as reciboRepo from '../repositories/reciboRepository';
import * as pagoRepo from '../repositories/pagoRepository';
import path from 'path';

interface IGetRecibosQuery {
  year?: string;
  periodo?: string;
  estado?: string;
  search?: string;
}

interface IGenerarRecibosBody {
  periodo_id: number;
}

interface IGenerarReciboIndividualBody {
  periodo_id: number;
  usuario_id: number;
}

interface IRefacturarReciboBody {
  motivo: string;
}

interface IExportAllRecibosPdfQuery {
  periodo_id?: string;
}

interface IExportReporteExcelQuery {
  year?: string;
  periodo?: string;
  estado?: string;
  search?: string;
}

interface IUpdateCargosBody {
  cargos: any[];
}

export const getRecibos = async (req: Request<{}, any, any, IGetRecibosQuery>, res: Response): Promise<any> => {
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

export const getRecibosStats = async (req: Request<{}, any, any, IGetRecibosQuery>, res: Response): Promise<any> => {
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

export const getRecibosByUsuario = async (req: Request<{ usuarioId: string }>, res: Response): Promise<any> => {
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

export const generarRecibos = async (req: Request<{}, any, IGenerarRecibosBody>, res: Response): Promise<any> => {
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

export const generarReciboIndividual = async (req: Request<{}, any, IGenerarReciboIndividualBody>, res: Response): Promise<any> => {
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

export const refacturarRecibo = async (req: Request<{ id: string }, any, IRefacturarReciboBody>, res: Response): Promise<any> => {
  const id = Number(req.params.id);
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
// DELEGACIONES A SERVICIOS PDF Y EXCEL
// -------------------------------------------------------
export const exportReciboPdf = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
  return pdfService.buildReciboPdf(req, res);
};

export const exportReciboPdfV2 = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
  return pdfService.buildReciboPdfV2(req, res);
};

export const exportReciboPdfV3 = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
  return pdfService.buildReciboPdfV3(req, res);
};

export const exportAllRecibosPdfV2 = async (req: Request<{}, any, any, IGetRecibosQuery>, res: Response): Promise<any> => {
  return pdfService.buildAllRecibosPdfV2(req, res);
};

export const exportReporteExcel = async (req: Request<{}, any, any, IExportReporteExcelQuery>, res: Response): Promise<any> => {
  return excelService.buildReporteExcel(req, res);
};

export const exportReporteDeudasExcel = async (req: Request, res: Response): Promise<any> => {
  return excelService.buildReporteDeudasExcel(req, res);
};

export const getReciboById = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
  const id = Number(req.params.id);

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



export const updateCargos = async (req: Request<{ id: string }, any, IUpdateCargosBody>, res: Response): Promise<any> => {
  const id = Number(req.params.id);
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

export const exportReportePdf = async (req: Request<{}, any, any, IExportReporteExcelQuery>, res: Response): Promise<any> => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo,
      estado: req.query.estado,
      search: req.query.search
    };
    
    // We reuse exportAllRecibosPdfV2 logic for now, or just redirect
    return exportAllRecibosPdfV2(req as any, res);
  } catch (error: any) {
    console.error('Error al generar PDF Reporte:', error);
    res.status(500).json({ error: 'Error al generar el PDF del reporte' });
  }
};
