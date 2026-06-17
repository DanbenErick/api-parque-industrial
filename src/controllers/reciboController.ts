import { PdfService } from '../services/pdfService';
import { ExcelService } from '../services/excelService';

import { Request, Response } from 'express';
import fs from 'fs';
import { AuditoriaRepository } from '../repositories/auditoriaRepository';;

import { ReciboRepository } from '../repositories/reciboRepository';;
import { ReciboService } from '../services/reciboService';
import { PagoRepository } from '../repositories/pagoRepository';;
import path from 'path';
import { RolUsuario, EstadoRecibo } from '../types/enums';


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

// -------------------------------------------------------
// DELEGACIONES A SERVICIOS PDF Y EXCEL
// -------------------------------------------------------

export class ReciboController {
    constructor(private pdfService: PdfService, private excelService: ExcelService, private auditoriaRepo: AuditoriaRepository, private reciboRepo: ReciboRepository, private reciboService: ReciboService, private pagoRepo: PagoRepository) {}

    public getRecibos = async (req: Request<{}, any, any, IGetRecibosQuery>, res: Response): Promise<any> => {
          try {
            const filters = {
              year: req.query.year,
              periodo: req.query.periodo,
              estado: req.query.estado,
              search: req.query.search
            };
            const recibos = await this.reciboRepo.findAll(filters);
            res.json(recibos);
          } catch (error: any) {
            console.error('Error al obtener recibos:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public getRecibosStats = async (req: Request<{}, any, any, IGetRecibosQuery>, res: Response): Promise<any> => {
          try {
            const filters = {
              year: req.query.year,
              periodo: req.query.periodo,
              estado: req.query.estado,
              search: req.query.search
            };
            const stats = await this.reciboRepo.getStats(filters);
            res.json(stats);
          } catch (error: any) {
            console.error('Error al obtener estadisticas de recibos:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public getRecibosByUsuario = async (req: Request<{ usuarioId: string }>, res: Response): Promise<any> => {
          const { usuarioId } = req.params;

          if (req.user?.nombre_rol === RolUsuario.SOCIO && req.user.id !== parseInt(usuarioId)) {
            return res.status(403).json({ error: 'No tienes permisos para ver estos recibos' });
          }

          try {
            const recibos = await this.reciboRepo.findByUsuario(usuarioId);
            res.json(recibos);
          } catch (error: any) {
            console.error('Error al obtener recibos por usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public generarRecibos = async (req: Request<{}, any, IGenerarRecibosBody>, res: Response): Promise<any> => {
          const { periodo_id } = req.body;
          const admin_id = req.user.id;

          try {
            const message = await this.reciboService.generarMasivamente(periodo_id, admin_id);
            res.json({ message });
          } catch (error: any) {
            console.error('Error al generar recibos:', error);
            res.status(500).json({ error: 'Error al ejecutar la generación masiva. Verifique que el período existe.' });
          }
        };
    public generarReciboIndividual = async (req: Request<{}, any, IGenerarReciboIndividualBody>, res: Response): Promise<any> => {
          const { periodo_id, usuario_id } = req.body;
          const admin_id = req.user.id;

          if (!periodo_id || !usuario_id) {
            return res.status(400).json({ error: 'Faltan parámetros: periodo_id y usuario_id son obligatorios.' });
          }

          try {
            const message = await this.reciboService.generarIndividual(periodo_id, usuario_id, admin_id);
            res.json({ message });
          } catch (error: any) {
            console.error('Error al generar recibo individual:', error);
            res.status(400).json({ error: error.message || 'Error al generar recibo individual.' });
          }
        };
    public refacturarRecibo = async (req: Request<{ id: string }, any, IRefacturarReciboBody>, res: Response): Promise<any> => {
          const id = Number(req.params.id);
          const { motivo } = req.body;
          const admin_id = req.user.id;

          if (!motivo) {
            return res.status(400).json({ error: 'El motivo de refacturación es obligatorio.' });
          }

          try {
            const recibo = await this.reciboRepo.findByIdCompleto(id);
            if (!recibo) {
              return res.status(404).json({ error: 'Recibo no encontrado' });
            }

            if (recibo.estado === EstadoRecibo.PAGADO) return res.status(400).json({ error: 'No se puede refacturar un recibo pagado totalmente.' });

            // 1. Anular el recibo actual
            await this.reciboService.anularRecibo(id, motivo, admin_id);

            // 2. Generar el nuevo recibo
            const message = await this.reciboService.generarIndividual(recibo.periodo_id, recibo.usuario_id, admin_id);
            res.json({ message: 'Recibo refacturado exitosamente. ' + message });
          } catch (error: any) {
            console.error('Error al refacturar recibo:', error);
            res.status(400).json({ error: error.message || 'Error al refacturar recibo.' });
          }
        };
    public exportReciboPdf = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          return this.pdfService.buildReciboPdf(req, res);
        };
    public exportReciboPdfV2 = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          return this.pdfService.buildReciboPdfV2(req, res);
        };
    public exportReciboPdfV3 = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          return this.pdfService.buildReciboPdfV3(req, res);
        };
    public exportAllRecibosPdfV2 = async (req: Request<{}, any, any, IGetRecibosQuery>, res: Response): Promise<any> => {
          return this.pdfService.buildAllRecibosPdfV2(req, res);
        };
    public exportReporteExcel = async (req: Request<{}, any, any, IExportReporteExcelQuery>, res: Response): Promise<any> => {
          return this.excelService.buildReporteExcel(req, res);
        };
    public exportReporteDeudasExcel = async (req: Request, res: Response): Promise<any> => {
          return this.excelService.buildReporteDeudasExcel(req, res);
        };
    public getReciboById = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          const id = Number(req.params.id);

          try {
            const recibo = await this.reciboRepo.findByIdCompleto(id);
            if (!recibo) return res.status(404).json({ error: 'Recibo no encontrado' });

            if (req.user?.nombre_rol === RolUsuario.SOCIO && req.user.id !== recibo.usuario_id) {
              return res.status(403).json({ error: 'No tienes permisos para ver este recibo' });
            }

            const historial = await this.reciboRepo.findHistorialConsumo(recibo.usuario_id, 6, recibo.periodo_inicio);
            const pagos_historial = await this.pagoRepo.findByRecibo(id);
            
            res.json({ recibo, historial, pagos_historial });
          } catch (error: any) {
            console.error('Error al obtener detalle del recibo:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public updateCargos = async (req: Request<{ id: string }, any, IUpdateCargosBody>, res: Response): Promise<any> => {
          const id = Number(req.params.id);
          const cargos = req.body;
          const adminId = req.user?.id;
          try {
            const result = await this.reciboService.updateCargos(id, cargos, adminId);
            res.json({ message: 'Recibo actualizado exitosamente', data: result });
          } catch (error: any) {
            console.error('Error al actualizar cargos del recibo:', error);
            res.status(500).json({ error: 'Error al actualizar el recibo' });
          }
        };
    public exportReportePdf = async (req: Request<{}, any, any, IExportReporteExcelQuery>, res: Response): Promise<any> => {
          try {
            const filters = {
              year: req.query.year,
              periodo: req.query.periodo,
              estado: req.query.estado,
              search: req.query.search
            };
            
            // We reuse exportAllRecibosPdfV2 logic for now, or just redirect
            return this.exportAllRecibosPdfV2(req as any, res);
          } catch (error: any) {
            console.error('Error al generar PDF Reporte:', error);
            res.status(500).json({ error: 'Error al generar el PDF del reporte' });
          }
        };
}


