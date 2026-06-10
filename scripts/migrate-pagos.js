const db = require('../src/config/db');

async function runMigration() {
  try {
    console.log('Iniciando migración de estados de recibo...');
    
    // Drop existing constraint
    console.log('Eliminando restricción chk_recibo_estado existente...');
    try {
      await db.query('ALTER TABLE recibo DROP CHECK chk_recibo_estado;');
    } catch (e) {
      console.log('Nota: No se pudo eliminar (quizás no existía):', e.message);
    }
    
    // Add new constraint with 'Pago Parcial'
    console.log('Añadiendo nueva restricción chk_recibo_estado con Pago Parcial...');
    await db.query(`
      ALTER TABLE recibo 
      ADD CONSTRAINT chk_recibo_estado 
      CHECK (estado IN ('Pendiente', 'Pagado', 'Pago Parcial', 'Vencido'))
    `);

    console.log('Migración completada exitosamente.');
  } catch (error) {
    console.error('Error durante la migración:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();
