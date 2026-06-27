import mysql from 'mysql2/promise';

async function alterTable() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'parque',
      password: 'parque_industrial_jicamarca',
      database: 'parque_industrial_jicamarca'
    });

    try {
      await connection.query('ALTER TABLE periodo_facturacion ADD COLUMN fecha_emision_recibo DATE;');
      console.log('Added fecha_emision_recibo');
    } catch (e: any) {
      console.error(e.message);
    }
    
    try {
      await connection.query('ALTER TABLE periodo_facturacion ADD COLUMN fecha_vencimiento DATE;');
      console.log('Added fecha_vencimiento');
    } catch (e: any) {
      console.error(e.message);
    }
    
    try {
      await connection.query('ALTER TABLE periodo_facturacion ADD COLUMN fecha_corte DATE;');
      console.log('Added fecha_corte');
    } catch (e: any) {
      console.error(e.message);
    }

    await connection.end();
  } catch (err: any) {
    console.error('Connection error', err.message);
  }
  
  process.exit(0);
}

alterTable();
