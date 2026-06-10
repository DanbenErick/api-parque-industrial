const medidorRepo = require('../repositories/medidorRepository');

const getMedidores = async (req, res) => {
  try {
    const medidores = await medidorRepo.findAll();
    res.json(medidores);
  } catch (error) {
    console.error('Error al obtener medidores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const getMedidoresByUsuario = async (req, res) => {
  const { usuarioId } = req.params;
  
  if (req.user.nombre_rol === 'Socio' && req.user.id !== parseInt(usuarioId)) {
    return res.status(403).json({ error: 'No tienes permisos para ver estos medidores' });
  }

  try {
    const medidores = await medidorRepo.findByUsuario(usuarioId);
    res.json(medidores);
  } catch (error) {
    console.error('Error al obtener medidores por usuario:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createMedidor = async (req, res) => {
  try {
    const insertId = await medidorRepo.create(req.body);
    res.status(201).json({ message: 'Medidor creado exitosamente', id: insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El número de serie ya existe.' });
    }
    console.error('Error al crear medidor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updateMedidor = async (req, res) => {
  const { id } = req.params;

  try {
    const affectedRows = await medidorRepo.update(id, req.body);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Medidor no encontrado' });
    }

    res.json({ message: 'Medidor actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar medidor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteMedidor = async (req, res) => {
  const { id } = req.params;

  try {
    const affectedRows = await medidorRepo.softDelete(id);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Medidor no encontrado' });
    }

    res.json({ message: 'Medidor eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar medidor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getMedidores,
  getMedidoresByUsuario,
  createMedidor,
  updateMedidor,
  deleteMedidor
};
