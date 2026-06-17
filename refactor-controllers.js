const fs = require('fs');

// --- PAGO CONTROLLER ---
const pagoPath = 'src/controllers/pagoController.ts';
let pagoCode = fs.readFileSync(pagoPath, 'utf8');
let pagoLines = pagoCode.split('\n');

const pagoPdfStart = pagoLines.findIndex(l => l.includes('export const exportReportePdf = async'));
const pagoExcelStart = pagoLines.findIndex(l => l.includes('export const exportResumenPagosExcel = async'));

// The pdf ends where excel starts
const pagoPdfBlock = pagoLines.slice(pagoPdfStart, pagoExcelStart).join('\n');
const pagoExcelBlock = pagoLines.slice(pagoExcelStart).join('\n'); // until end of file

// Rename the functions for service
const pagoPdfServiceFunc = pagoPdfBlock.replace(/export const exportReportePdf/, 'export const buildReportePagosPdf');
const pagoExcelServiceFunc = pagoExcelBlock.replace(/export const exportResumenPagosExcel/, 'export const buildResumenPagosExcel');

fs.appendFileSync('src/services/pdfService.ts', '\n' + pagoPdfServiceFunc);
fs.appendFileSync('src/services/excelService.ts', '\n' + pagoExcelServiceFunc);

// Update pagoController
const pagoBefore = pagoLines.slice(0, pagoPdfStart).join('\n');
let newPago = `import * as pdfService from '../services/pdfService';\nimport * as excelService from '../services/excelService';\n` + pagoBefore + `
export const exportReportePdf = async (req: Request<{}, any, any, IGetPagosQuery>, res: Response): Promise<any> => {
  return pdfService.buildReportePagosPdf(req, res);
};

export const exportResumenPagosExcel = async (req: Request<{}, any, any, IGetPagosQuery>, res: Response): Promise<any> => {
  return excelService.buildResumenPagosExcel(req, res);
};
`;

newPago = newPago.replace(/import PDFDocument from 'pdfkit';\n/, '');
newPago = newPago.replace(/import ExcelJS from 'exceljs';\n/, '');
newPago = newPago.replace(/import path from 'path';\n/, '');
fs.writeFileSync(pagoPath, newPago);


// --- USUARIO CONTROLLER ---
const usuarioPath = 'src/controllers/usuarioController.ts';
let usuarioCode = fs.readFileSync(usuarioPath, 'utf8');
let usuarioLines = usuarioCode.split('\n');

const usuarioExcelStart = usuarioLines.findIndex(l => l.includes('export const exportExcel = async'));
const usuarioPdfStart = usuarioLines.findIndex(l => l.includes('export const exportPdf = async'));

const usuarioExcelBlock = usuarioLines.slice(usuarioExcelStart, usuarioPdfStart).join('\n');
const usuarioPdfBlock = usuarioLines.slice(usuarioPdfStart).join('\n'); // until end of file

// Rename for service
const usuarioExcelServiceFunc = usuarioExcelBlock.replace(/export const exportExcel/, 'export const buildUsuariosExcel');
const usuarioPdfServiceFunc = usuarioPdfBlock.replace(/export const exportPdf/, 'export const buildUsuariosPdf');

fs.appendFileSync('src/services/pdfService.ts', '\n' + usuarioPdfServiceFunc);
fs.appendFileSync('src/services/excelService.ts', '\n' + usuarioExcelServiceFunc);

// Update usuarioController
const usuarioBefore = usuarioLines.slice(0, usuarioExcelStart).join('\n');
let newUsuario = `import * as pdfService from '../services/pdfService';\nimport * as excelService from '../services/excelService';\n` + usuarioBefore + `
export const exportExcel = async (req: Request<{}, any, any, IGetUsuariosQuery>, res: Response): Promise<any> => {
  return excelService.buildUsuariosExcel(req, res);
};

export const exportPdf = async (req: Request<{}, any, any, IGetUsuariosQuery>, res: Response): Promise<any> => {
  return pdfService.buildUsuariosPdf(req, res);
};
`;

newUsuario = newUsuario.replace(/import PDFDocument from 'pdfkit';\n/, '');
newUsuario = newUsuario.replace(/import ExcelJS from 'exceljs';\n/, '');
newUsuario = newUsuario.replace(/import path from 'path';\n/, '');
fs.writeFileSync(usuarioPath, newUsuario);

console.log("Controllers refactored successfully.");
