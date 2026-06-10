const bcrypt = require('bcrypt');
const usuarioRepo = require('../repositories/usuarioRepository');
const medidorRepo = require('../repositories/medidorRepository');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const getUsuarios = async (req, res) => {
  try {
    const search = req.query.search || '';
    const rol_id = req.query.rol_id ? parseInt(req.query.rol_id) : null;
    const estado = req.query.estado || null;
    const rubro = req.query.rubro || null;
    const usuarios = await usuarioRepo.findAll(search, rol_id, estado, rubro);
    res.json(usuarios);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getUsuariosStats = async (req, res) => {
  try {
    const rol_id = req.query.rol_id ? parseInt(req.query.rol_id) : null;
    const stats = await usuarioRepo.getStats(rol_id);
    res.json(stats);
  } catch (error) {
    console.error('Error al obtener stats:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createUsuario = async (req, res) => {
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
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.sqlMessage.includes('uq_usuario_correo')) {
        return res.status(400).json({ error: 'El correo electrónico ingresado ya está registrado por otro usuario.' });
      }
      if (error.sqlMessage.includes('documento_identidad')) {
        return res.status(400).json({ error: 'El documento de identidad ingresado ya está registrado.' });
      }
      return res.status(400).json({ error: 'Ya existe un registro con esos datos únicos.' });
    }

    console.error('Error al crear usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateUsuario = async (req, res) => {
  const { id } = req.params;
  
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
      
      const newIds = newMedidores.map(m => m.id).filter(id => id);
      
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
    if (error.code === 'ER_DUP_ENTRY') {
      if (error.sqlMessage.includes('uq_usuario_correo')) {
        return res.status(400).json({ error: 'El correo electrónico ingresado ya está registrado por otro usuario.' });
      }
      if (error.sqlMessage.includes('documento_identidad')) {
        return res.status(400).json({ error: 'El documento de identidad ingresado ya está registrado.' });
      }
      return res.status(400).json({ error: 'Ya existe un registro con esos datos únicos.' });
    }

    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteUsuario = async (req, res) => {
  const { id } = req.params;

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

const exportExcel = async (req, res) => {
  try {
    const usuarios = await usuarioRepo.findAll();

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Parque Industrial Jicamarca';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Usuarios', {
      headerFooter: { firstHeader: 'Reporte de Usuarios - Parque Industrial Jicamarca' }
    });

    // Definir columnas
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Documento', key: 'documento_identidad', width: 15 },
      { header: 'Nombre / Razón Social', key: 'nombre_razonsocial', width: 35 },
      { header: 'Rol', key: 'nombre_rol', width: 14 },
      { header: 'Cargo', key: 'cargo_representante', width: 22 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Correo', key: 'correo', width: 28 },
      { header: 'Dirección', key: 'direccion', width: 25 },
      { header: 'Estado', key: 'estado', width: 12 },
    ];

    // Estilos del encabezado
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1B5E20' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      };
    });
    sheet.getRow(1).height = 24;

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

      // Zebra striping
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F8E9' } };
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

const exportPdf = async (req, res) => {
  try {
    const usuarios = await usuarioRepo.findAll();

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });

    const timestamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=usuarios_${timestamp}.pdf`);
    doc.pipe(res);

    // Título y Logo
    const logoPath = path.join(__dirname, '../assets/logo.png');
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, doc.page.width / 2 - 20, 20, { width: 40 });
      doc.y = 65;
    }
    doc.fontSize(16).font('Helvetica-Bold').text('Parque Industrial Jicamarca', { align: 'center' });
    doc.fontSize(11).font('Helvetica').text('Reporte de Usuarios del Sistema', { align: 'center' });
    doc.fontSize(9).text(`Generado: ${new Date().toLocaleString('es-PE')}`, { align: 'center' });
    doc.moveDown(1);

    // Tabla
    const headers = ['#', 'Documento', 'Nombre / Razón Social', 'Rol', 'Cargo', 'Dirección', 'Estado'];
    const colWidths = [25, 75, 200, 65, 120, 100, 55];
    const startX = 30;
    let currentY = doc.y;

    // Header row
    doc.font('Helvetica-Bold').fontSize(8);
    doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), 18).fill('#1B5E20');
    let xPos = startX;
    headers.forEach((header, i) => {
      doc.fillColor('#FFFFFF').text(header, xPos + 3, currentY + 5, { width: colWidths[i] - 6, ellipsis: true });
      xPos += colWidths[i];
    });
    currentY += 18;

    // Data rows
    doc.font('Helvetica').fontSize(7).fillColor('#000000');
    usuarios.forEach((u, index) => {
      if (currentY > 520) {
        doc.addPage();
        currentY = 30;
      }

      const rowData = [
        (index + 1).toString(),
        u.documento_identidad || '-',
        u.nombre_razonsocial || '-',
        u.nombre_rol || '-',
        u.cargo_representante || '-',
        u.direccion || '-',
        u.es_activo ? 'Activo' : 'Inactivo'
      ];

      const rowHeight = 16;
      if (index % 2 === 1) {
        doc.rect(startX, currentY, colWidths.reduce((a, b) => a + b, 0), rowHeight).fill('#F1F8E9');
        doc.fillColor('#000000');
      }

      xPos = startX;
      rowData.forEach((cell, i) => {
        doc.text(cell, xPos + 3, currentY + 4, { width: colWidths[i] - 6, ellipsis: true });
        xPos += colWidths[i];
      });
      currentY += rowHeight;
    });

    // Footer
    doc.moveDown(2);
    doc.fontSize(8).fillColor('#666666').text(`Total de usuarios: ${usuarios.length}`, startX);

    doc.end();
  } catch (error) {
    console.error('Error al exportar PDF:', error);
    res.status(500).json({ error: 'Error al generar el archivo PDF' });
  }
};

module.exports = {
  getUsuarios,
  getUsuariosStats,
  createUsuario,
  updateUsuario,
  deleteUsuario,
  exportExcel,
  exportPdf
};
