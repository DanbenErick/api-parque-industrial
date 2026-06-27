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
      await connection.query('ALTER TABLE periodo_facturacion ADD COLUMN fecha_inicio_lectura DATE;');
      console.log('Added fecha_inicio_lectura');
    } catch (e: any) {
      console.error(e.message);
    }
    
    try {
      await connection.query('ALTER TABLE periodo_facturacion ADD COLUMN fecha_fin_lectura DATE;');
      console.log('Added fecha_fin_lectura');
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
