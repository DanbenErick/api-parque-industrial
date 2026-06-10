const periodoRepo = require('../repositories/periodoRepository');

const getPeriodos = async (req, res) => {
  try {
    const periodos = await periodoRepo.findAll();
    res.json(periodos);
  } catch (error) {
    console.error('Error al obtener períodos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const createPeriodo = async (req, res) => {
  try {
    const { mes_anio } = req.body;
    
    // Verificar si ya existe
    const existing = await periodoRepo.findByMesAnio(mes_anio);
    if (existing) {
      return res.status(400).json({ error: 'Ya existe un periodo creado para este mes y año.' });
    }

    const insertId = await periodoRepo.create(req.body);
    res.status(201).json({ message: 'Período creado exitosamente', id: insertId });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'El período (mes_anio) ya existe.' });
    }
    console.error('Error al crear período:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const updatePeriodo = async (req, res) => {
  const { id } = req.params;

  try {
    const affectedRows = await periodoRepo.update(id, req.body);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Período no encontrado' });
    }

    res.json({ message: 'Período actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar período:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deletePeriodo = async (req, res) => {
  const { id } = req.params;

  try {
    const affectedRows = await periodoRepo.softDelete(id);

    if (affectedRows === 0) {
      return res.status(404).json({ error: 'Período no encontrado' });
    }

    res.json({ message: 'Período eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar período:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getPeriodos,
  createPeriodo,
  updatePeriodo,
  deletePeriodo
};
