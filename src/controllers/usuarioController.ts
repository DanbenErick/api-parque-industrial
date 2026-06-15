import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import * as usuarioRepo from '../repositories/usuarioRepository';
import * as medidorRepo from '../repositories/medidorRepository';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

interface IGetUsuariosQuery {
  search?: string;
  rol_id?: string;
  estado?: string;
  rubro?: string;
  page?: string;
  limit?: string;
}

export const getUsuarios = async (req: Request<{}, any, any, IGetUsuariosQuery>, res: Response): Promise<any> => {
  try {
    const search = (req.query.search as string) || '';
    const rol_id = req.query.rol_id ? parseInt(req.query.rol_id as string) : null;
    const estado = req.query.estado || null;
    const rubro = (req.query.rubro as string) || null;
    
    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 30;
    const offset = (page - 1) * limit;

    const result = await usuarioRepo.findAll(search, rol_id, estado, rubro, limit, offset);
    
    // Calculate total pages for frontend convenience
    result.meta.page = page;
    result.meta.totalPages = Math.ceil(result.meta.total / limit);

    res.json(result);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

interface IGetUsuariosStatsQuery {
  rol_id?: string;
}

export const getUsuariosStats = async (req: Request<{}, any, any, IGetUsuariosStatsQuery>, res: Response): Promise<any> => {
  try {
    const rol_id = req.query.rol_id ? parseInt(req.query.rol_id as string) : null;
    const stats = await usuarioRepo.getStats(rol_id);
    res.json(stats);
  } catch (error) {
    console.error('Error al obtener stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

interface ICreateUsuarioBody {
  rol_id: number;
  documento_identidad: string;
  nombre_razonsocial: string;
  clave_acceso: string;
  cargo_representante: string;
  telefono: string;
  correo: string;
  direccion: string;
  actividad_rubro?: string;
  medidores?: any[];
}

export const createUsuario = async (req: Request<{}, any, ICreateUsuarioBody>, res: Response): Promise<any> => {
  const { 
    rol_id, documento_identidad, nombre_razonsocial, clave_acceso, 
    cargo_representante, telefono, correo, direccion, actividad_rubro,
    medidores
  } = req.body;

  if (!rol_id || !documento_identidad || !nombre_razonsocial || !clave_acceso || !cargo_representante || !telefono || !correo || !direccion) {
    return res.status(400).json({ error: 'Todos los campos obligatorios (incluyendo teléfono, correo, dirección y representante) deben ser enviados.' });
  }

  // Un socio puede no tener medidor registrado todavía

  if (documento_identidad.length !== 8 && documento_identidad.length !== 11) {
    return res.status(400).json({ error: 'El documento de identidad debe tener 8 (DNI) o 11 (RUC) dígitos.' });
  }

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(clave_acceso, saltRounds);

    const insertId = await usuarioRepo.create({
      rol_id, documento_identidad, nombre_razonsocial, clave_acceso: hashedPassword, 
      cargo_representante, telefono, correo, direccion, actividad_rubro
    });

    if (rol_id === 3 && medidores && Array.isArray(medidores)) {
      for (const m of medidores) {
        if (m.num_serie && m.num_serie.trim() !== '') {
          await medidorRepo.create({
            usuario_id: insertId,
            num_serie: m.num_serie,
            tipo: m.tipo || 'Normal',
            operativo: true
          });
        }
      }
    }

    res.status(201).json({ message: 'Usuario creado exitosamente', id: insertId });
  } catch (error) {
    if (!rol_id || !documento_identidad || !nombre_razonsocial || !cargo_representante || !telefono || !correo || !direccion) {
      return res.status(400).json({ error: 'Todos los campos obligatorios deben ser enviados.' });
    }
    if ((error as any).code === 'ER_DUP_ENTRY') {
      if ((error as any).sqlMessage.includes('uq_usuario_correo')) {
        return res.status(400).json({ error: 'El correo electrónico ingresado ya está registrado por otro usuario.' });
      }
      if ((error as any).sqlMessage.includes('documento_identidad')) {
        return res.status(400).json({ error: 'El documento de identidad ingresado ya está registrado.' });
      }
      return res.status(400).json({ error: 'Ya existe un registro con esos datos únicos.' });
    }

    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

interface IUpdateUsuarioBody {
  rol_id?: number;
  documento_identidad?: string;
  nombre_razonsocial?: string;
  cargo_representante?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  es_activo?: boolean;
  actividad_rubro?: string;
  medidores?: any[];
}

export const updateUsuario = async (req: Request<{ id: string }, any, IUpdateUsuarioBody>, res: Response): Promise<any> => {
  const id = Number(req.params.id);
  
  try {
    const existingUser = await usuarioRepo.findById(id);
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const updatedData = {
      rol_id: req.body.rol_id !== undefined ? req.body.rol_id : existingUser.rol_id,
      documento_identidad: req.body.documento_identidad !== undefined ? req.body.documento_identidad : existingUser.documento_identidad,
      nombre_razonsocial: req.body.nombre_razonsocial !== undefined ? req.body.nombre_razonsocial : existingUser.nombre_razonsocial,
      cargo_representante: req.body.cargo_representante !== undefined ? req.body.cargo_representante : existingUser.cargo_representante,
      telefono: req.body.telefono !== undefined ? req.body.telefono : existingUser.telefono,
      correo: req.body.correo !== undefined ? req.body.correo : existingUser.correo,
      direccion: req.body.direccion !== undefined ? req.body.direccion : existingUser.direccion,
      es_activo: req.body.es_activo !== undefined ? req.body.es_activo : existingUser.es_activo,
      actividad_rubro: req.body.actividad_rubro !== undefined ? req.body.actividad_rubro : existingUser.actividad_rubro
    };

    const affectedRows = await usuarioRepo.update(id, updatedData);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Lógica para actualizar o crear los medidores asociados
    if (req.body.medidores !== undefined && existingUser.rol_id === 3) {
      const currentMedidores = await medidorRepo.findByUsuario(id);
      const newMedidores = req.body.medidores;
      
      const newIds = newMedidores.map((m: any) => m.id).filter((id: any) => id);
      
      // Eliminar los que ya no están
      for (const cm of currentMedidores) {
        if (!newIds.includes(cm.id)) {
          await medidorRepo.softDelete(cm.id);
        }
      }
      
      // Actualizar o crear
      for (const nm of newMedidores) {
        if (nm.id) {
          // Actualizar medidor existente
          await medidorRepo.update(nm.id, {
            usuario_id: id,
            num_serie: nm.num_serie,
            tipo: nm.tipo || 'Normal',
            operativo: true
          });
        } else if (nm.num_serie && nm.num_serie.trim() !== '') {
          // Crear nuevo medidor
          await medidorRepo.create({
            usuario_id: id,
            num_serie: nm.num_serie,
            tipo: nm.tipo || 'Normal',
            operativo: true
          });
        }
      }
    }

    res.json({ message: 'Usuario actualizado exitosamente' });
  } catch (error) {
    if ((error as any).code === 'ER_DUP_ENTRY') {
      if ((error as any).sqlMessage.includes('uq_usuario_correo')) {
        return res.status(400).json({ error: 'El correo electrónico ingresado ya está registrado por otro usuario.' });
      }
      if ((error as any).sqlMessage.includes('documento_identidad')) {
        return res.status(400).json({ error: 'El documento de identidad ingresado ya está registrado.' });
      }
      return res.status(400).json({ error: 'Ya existe un registro con esos datos únicos.' });
    }

    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const deleteUsuario = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
  const id = Number(req.params.id);

  try {
    const affectedRows = await usuarioRepo.softDelete(id);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

export const exportExcel = async (req: Request<{}, any, any, IGetUsuariosQuery>, res: Response): Promise<any> => {
  try {
    const search = (req.query.search as string) || '';
    const rol_id = req.query.rol_id ? parseInt(req.query.rol_id as string) : null;
    const estado = req.query.estado || null;
    const rubro = (req.query.rubro as string) || null;

    // Para exportar a Excel, traemos todos según los filtros con un límite muy grande
    const result = await usuarioRepo.findAll(search, rol_id, estado, rubro, 10000, 0);
    const usuarios = result.data;

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Parque Industrial Jicamarca';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Usuarios', {
      headerFooter: { firstHeader: 'Directorio de Usuarios - Parque Industrial Jicamarca' },
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Definir columnas
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Documento', key: 'documento_identidad', width: 15 },
      { header: 'Nombre / Razón Social', key: 'nombre_razonsocial', width: 40 },
      { header: 'Rol', key: 'nombre_rol', width: 18 },
      { header: 'Cargo', key: 'cargo_representante', width: 25 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Correo', key: 'correo', width: 30 },
      { header: 'Dirección', key: 'direccion', width: 35 },
      { header: 'Estado', key: 'estado', width: 15 },
    ];

    // Estilos del encabezado
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate 900
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF334155' } }
      };
    });
    sheet.getRow(1).height = 25;

    // Añadir filas
    usuarios.forEach((u, index) => {
      const row = sheet.addRow({
        id: u.id,
        documento_identidad: u.documento_identidad,
        nombre_razonsocial: u.nombre_razonsocial,
        nombre_rol: u.nombre_rol,
        cargo_representante: u.cargo_representante || '-',
        telefono: u.telefono || '-',
        correo: u.correo || '-',
        direccion: u.direccion || '-',
        estado: u.es_activo ? 'Activo' : 'Inactivo'
      });

      row.height = 20;
      row.eachCell((cell, colNumber) => {
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 9 ? 'center' : 'left' };
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
        
        // Colorear el estado
        if (colNumber === 9) {
          cell.font.color = { argb: u.es_activo ? 'FF16A34A' : 'FFDC2626' }; // Verde o Rojo
          cell.font.bold = true;
        }
      });

      // Zebra striping
      if (index % 2 === 0) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }; // Slate 50
        });
      }
    });

    // Enviar archivo
    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=usuarios_${timestamp}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error al exportar Excel:', error);
    res.status(500).json({ error: 'Error al generar el archivo Excel' });
  }
};

export const exportPdf = async (req: Request<{}, any, any, IGetUsuariosQuery>, res: Response): Promise<any> => {
  try {
    const search = (req.query.search as string) || '';
    const rol_id = req.query.rol_id ? parseInt(req.query.rol_id as string) : null;
    const estado = req.query.estado || null;
    const rubro = (req.query.rubro as string) || null;

    const result = await usuarioRepo.findAll(search, rol_id, estado, rubro, 10000, 0);
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
    const headers = ['#', 'Documento', 'Nombre / Razón Social', 'Rol', 'Cargo', 'Dirección', 'Estado'];
    const colWidths = [30, 80, 220, 80, 130, 160, 60];
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

      doc.fillColor('#64748B').font('Helvetica').text(u.direccion || '-', xPos + 8, currentY + 6, { width: colWidths[5] - 16, ellipsis: true });
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
    console.error('Error al exportar PDF:', error);
    res.status(500).json({ error: 'Error al generar el archivo PDF' });
  }
};


