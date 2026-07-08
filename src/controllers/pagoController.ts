import { PdfService } from '../services/pdfService';
import { ExcelService } from '../services/excelService';
import { Request, Response } from 'express';
import { PagoRepository } from '../repositories/pagoRepository';;
import fs from 'fs';

interface IGetPagosQuery {
  year?: string;
  periodo?: string;
}

interface IRegistrarPagoBody {
  recibo_id: number;
  metodo_pago: string;
  monto_pagado: number;
  numero_operacion?: string;
  comprobante_url?: string;
}

export class PagoController {
    constructor(private pdfService: PdfService, private excelService: ExcelService, private pagoRepo: PagoRepository) {}

    public getPagos = async (req: Request<{}, any, any, IGetPagosQuery>, res: Response): Promise<any> => {
          try {
            const filters = {
              year: req.query.year,
              periodo: req.query.periodo as string
            };
            const pagos = await this.pagoRepo.findAll(filters);
            res.json(pagos);
          } catch (error: any) {
            console.error('Error al obtener pagos:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };

    public getPagosByUsuario = async (req: Request<{ usuarioId: string }>, res: Response): Promise<any> => {
      const { usuarioId } = req.params;

      // Un socio solo puede ver sus propios pagos
      if (req.user?.nombre_rol === 'Socio' && req.user.id !== parseInt(usuarioId)) {
        return res.status(403).json({ error: 'No tienes permisos para ver estos pagos' });
      }

      try {
        const pagos = await this.pagoRepo.findByUsuario(parseInt(usuarioId));
        res.json(pagos);
      } catch (error: any) {
        console.error('Error al obtener pagos por usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
      }
    };
    public registrarPago = async (req: Request<{}, any, IRegistrarPagoBody>, res: Response): Promise<any> => {
          try {
            // req.user.id is passed to the repo to be set as @current_user_id for SQL triggers
            await this.pagoRepo.createConTransaccion(req.body, req.user?.id || 0);
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
    public exportReportePdf = async (req: Request<{}, any, any, IGetPagosQuery>, res: Response): Promise<any> => {
          return this.pdfService.buildReportePagosPdf(req, res);
        };
    public exportResumenPagosExcel = async (req: Request<{}, any, any, IGetPagosQuery>, res: Response): Promise<any> => {
          return this.excelService.buildResumenPagosExcel(req, res);
        };

    public exportTicketPdf = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          return this.pdfService.buildTicketPagoPdf(req, res);
        };

    public exportAllTicketsPdf = async (req: Request<{}, any, any, IGetPagosQuery>, res: Response): Promise<any> => {
          return this.pdfService.buildAllTicketsPagoPdf(req, res);
        };

    public anularPago = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          try {
            const pagoId = parseInt(req.params.id);
            await this.pagoRepo.anularPagoConTransaccion(pagoId, req.user?.id || 0);
            res.json({ message: 'Pago anulado exitosamente' });
          } catch (error: any) {
            if (error.message === 'NOT_FOUND') {
              return res.status(404).json({ error: 'Pago no encontrado o ya anulado' });
            }
            console.error('Error al anular pago:', error);
            res.status(500).json({ error: 'Error interno del servidor al anular el pago' });
          }
        };
}


