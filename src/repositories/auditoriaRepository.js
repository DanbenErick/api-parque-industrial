const db = require('../config/db');

const registrarDescarga = async (data) => {
  const { usuario_id, tipo_documento, referencia_id, detalles } = data;
  try {
    await db.query(
      `INSERT INTO auditoria_descargas (usuario_id, tipo_documento, referencia_id, detalles) 
       VALUES (?, ?, ?, ?)`,
      [usuario_id, tipo_documento, referencia_id || null, detalles || null]
    );
  } catch (error) {
    console.error('Error al registrar auditoría de descarga:', error);
  }
};

module.exports = {
  registrarDescarga
};
