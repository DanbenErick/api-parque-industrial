const lecturaRepo = require('../repositories/lecturaRepository');
const db = require('../config/db');

const getLecturas = async (req, res) => {
  try {
    const lecturas = await lecturaRepo.findAll();
    res.json(lecturas);
  } catch (error) {
    console.error('Error al obtener lecturas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getLecturasByUsuario = async (req, res) => {
  const { usuarioId } = req.params;

  if (req.user.nombre_rol === 'Socio' && req.user.id !== parseInt(usuarioId)) {
    return res.status(403).json({ error: 'No tienes permisos para ver estas lecturas' });
  }

  try {
    const lecturas = await lecturaRepo.findByUsuario(usuarioId);
    res.json(lecturas);
  } catch (error) {
    console.error('Error al obtener lecturas por usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createLectura = async (req, res) => {
  const { 
    medidor_id, periodo_id, 
    lectura_anterior, lectura_actual, 
    lectura_anterior_punta, lectura_actual_punta, factor_potencia, precio_factor_potencia,
    estado 
  } = req.body;
  const operario_id = req.user.id;

  if (parseFloat(lectura_actual) < parseFloat(lectura_anterior)) {
    return res.status(400).json({ error: 'La lectura actual no puede ser menor a la lectura anterior.' });
  }

  try {
    const existingLectura = await lecturaRepo.findByMedidorAndPeriodo(medidor_id, periodo_id);
    if (existingLectura) {
      return res.status(400).json({ error: 'Ya existe una lectura registrada para este medidor en el periodo activo.' });
    }

    const insertId = await lecturaRepo.create({
      medidor_id, operario_id, periodo_id, 
      lectura_anterior, lectura_actual, 
      lectura_anterior_punta, lectura_actual_punta, factor_potencia, precio_factor_potencia,
      estado
    });
    res.status(201).json({ message: 'Lectura registrada exitosamente', id: insertId });
  } catch (error) {
    console.error('Error al crear lectura:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateLectura = async (req, res) => {
  const { id } = req.params;
  const { lectura_anterior, lectura_actual, lectura_anterior_punta, lectura_actual_punta } = req.body;

  if (parseFloat(lectura_actual) < parseFloat(lectura_anterior)) {
    return res.status(400).json({ error: 'La lectura actual no puede ser menor a la lectura anterior.' });
  }
  if (lectura_actual_punta !== undefined && lectura_anterior_punta !== undefined && parseFloat(lectura_actual_punta) < parseFloat(lectura_anterior_punta)) {
    return res.status(400).json({ error: 'La lectura actual punta no puede ser menor a la lectura anterior punta.' });
  }

  try {
    const affectedRows = await lecturaRepo.update(id, req.body);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Lectura no encontrada' });
    }

    res.json({ message: 'Lectura actualizada exitosamente' });
  } catch (error) {
    console.error('Error al actualizar lectura:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteLectura = async (req, res) => {
  const { id } = req.params;

  try {
    const affectedRows = await lecturaRepo.softDelete(id);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Lectura no encontrada' });
    }

    res.json({ message: 'Lectura eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar lectura:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getUltimasLecturas = async (req, res) => {
  try {
    const year = req.query.year;
    let query = `
      SELECT l.id, u.nombre_razonsocial as company, u.direccion as sector, l.consumo_calculado as value
      FROM lectura l
      JOIN medidor m ON l.medidor_id = m.id
      JOIN usuario u ON m.usuario_id = u.id
      JOIN periodo_facturacion pf ON l.periodo_id = pf.id
      WHERE l.deleted_at IS NULL
    `;
    const params = [];
    if (year && year !== 'all') {
      query += ` AND pf.fecha_inicio >= ? AND pf.fecha_inicio < ?`;
      params.push(`${year}-01-01`, `${parseInt(year) + 1}-01-01`);
    }
    query += ` ORDER BY pf.fecha_inicio DESC, l.fecha_registro DESC LIMIT 5`;

    const [rows] = await db.query(query, params);
    
    const lecturasFormateadas = rows.map(r => ({
      id: r.id,
      company: r.company,
      sector: r.sector || 'N/A',
      value: parseFloat(r.value).toFixed(2),
      trend: parseFloat(r.value) > 500 ? 'ALTA' : (parseFloat(r.value) < 100 ? 'BAJA' : 'NORMAL')
    }));

    res.json(lecturasFormateadas);
  } catch (error) {
    console.error('Error al obtener últimas lecturas:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getSociosAutocomplete = async (req, res) => {
  const { q } = req.query;
  try {
    const queryStr = q ? `%${q}%` : '%';
    const [rows] = await db.query(`
      SELECT DISTINCT u.nombre_razonsocial as name
      FROM usuario u
      INNER JOIN rol r ON u.rol_id = r.id
      WHERE r.nombre_rol = 'Socio' AND u.deleted_at IS NULL AND u.nombre_razonsocial LIKE ?
      ORDER BY u.nombre_razonsocial ASC
      LIMIT 15
    `, [queryStr]);
    
    const names = rows.map(r => r.name);
    res.json(names);
  } catch (error) {
    console.error('Error al autocompletar socios:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getLecturas,
  getLecturasByUsuario,
  createLectura,
  updateLectura,
  deleteLectura,
  getUltimasLecturas,
  getSociosAutocomplete
};

