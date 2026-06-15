const fs = require('fs');

const controllerPath = 'src/controllers/reciboController.ts';
let code = fs.readFileSync(controllerPath, 'utf8');

// Ensure src/services exists
if (!fs.existsSync('src/services')) {
  fs.mkdirSync('src/services');
}

// Extract PDF block (from 153 to 1333)
// We will use regex or line matching.
const lines = code.split('\n');

const pdfStart = lines.findIndex(l => l.includes('GENERAR PDF DE RECIBO DE LUZ (Diseño Moderno'));
const excelStart = lines.findIndex(l => l.includes('export const exportReporteExcel = async'));
const getReciboById = lines.findIndex(l => l.includes('export const getReciboById = async'));

// PDF Service content
const pdfBlock = lines.slice(pdfStart - 1, excelStart).join('\n');
// Excel Service content
const excelBlock = lines.slice(excelStart, getReciboById).join('\n');

// We need imports for pdfService
const pdfImports = `import { Response } from 'express';
import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import * as reciboRepo from '../repositories/reciboRepository';
import * as auditoriaRepo from '../repositories/auditoriaRepository';

interface IGetRecibosQuery {
  year?: string;
  periodo?: string;
  estado?: string;
  search?: string;
}

`;

// We need imports for excelService
const excelImports = `import { Response } from 'express';
import ExcelJS from 'exceljs';
import * as reciboRepo from '../repositories/reciboRepository';
import * as auditoriaRepo from '../repositories/auditoriaRepository';

interface IExportReporteExcelQuery {
  year?: string;
  periodo?: string;
  estado?: string;
  search?: string;
}

`;

// Write pdfService
fs.writeFileSync('src/services/pdfService.ts', pdfImports + pdfBlock.replace(/export const exportReciboPdf/g, 'export const buildReciboPdf')
  .replace(/export const exportReciboPdfV2/g, 'export const buildReciboPdfV2')
  .replace(/export const exportReciboPdfV3/g, 'export const buildReciboPdfV3')
  .replace(/export const exportAllRecibosPdfV2/g, 'export const buildAllRecibosPdfV2')
  // We need to change req: Request to req: any in the signatures just to make it compile quickly without importing Request. Actually, we can just import Request.
);

fs.writeFileSync('src/services/pdfService.ts', fs.readFileSync('src/services/pdfService.ts', 'utf8').replace(/import { Response }/, 'import { Request, Response }'));


// Write excelService
fs.writeFileSync('src/services/excelService.ts', excelImports + excelBlock.replace(/export const exportReporteExcel/g, 'export const buildReporteExcel')
  .replace(/export const exportReporteDeudasExcel/g, 'export const buildReporteDeudasExcel')
);
fs.writeFileSync('src/services/excelService.ts', fs.readFileSync('src/services/excelService.ts', 'utf8').replace(/import { Response }/, 'import { Request, Response }'));


// Update controller
const beforePdf = lines.slice(0, pdfStart - 1).join('\n');
const afterExcel = lines.slice(getReciboById).join('\n');

const controllerImports = `import * as pdfService from '../services/pdfService';
import * as excelService from '../services/excelService';
`;

let newController = controllerImports + '\n' + beforePdf + '\n\n' + `// -------------------------------------------------------
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

` + afterExcel;

// Also remove pdfkit and exceljs imports from controller
newController = newController.replace(/import PDFDocument from 'pdfkit';\n/, '');
newController = newController.replace(/import ExcelJS from 'exceljs';\n/, '');

fs.writeFileSync('src/controllers/reciboController.ts', newController);

console.log("Refactoring complete.");
