const db = require('../src/config/db');

async function fixAndSeedMayo() {
  try {
    console.log('Iniciando arreglo de periodos...');

    // 1. Eliminar periodos vacíos duplicados que el usuario creó manualmente (ID 3 y 4)
    await db.query('DELETE FROM periodo_facturacion WHERE id IN (3, 4)');
    console.log('Periodos duplicados eliminados.');

    // 2. Renombrar el periodo de mayo para que siga el formato YYYY-MM
    await db.query('UPDATE periodo_facturacion SET mes_anio = "2025-05" WHERE id = 5');
    console.log('Formato de periodo Mayo 2025 corregido.');

    // 3. Generar lecturas para Mayo 2025 (Periodo ID = 5)
    console.log('Generando lecturas para Mayo 2025...');
    const [medidores] = await db.query(`
      SELECT m.id, m.num_serie, 
             COALESCE((SELECT lectura_actual FROM lectura l WHERE l.medidor_id = m.id ORDER BY l.fecha_registro DESC LIMIT 1), 0) as ultima_lectura
      FROM medidor m WHERE m.operativo = 1 AND m.deleted_at IS NULL
    `);
    
    // Obtener operario (usar el primero que exista)
    const [operarios] = await db.query('SELECT id FROM usuario LIMIT 1');
    const operarioId = operarios.length > 0 ? operarios[0].id : 1;

    for (const medidor of medidores) {
      const periodoId = 5; // Mayo 2025
      
      const [existing] = await db.query('SELECT id FROM lectura WHERE medidor_id = ? AND periodo_id = ?', [medidor.id, periodoId]);
      
      if (existing.length === 0) {
        // En lugar de usar la variable ultimaLectura random, agarramos la 'ultima_lectura' real de la DB
        const lecturaAnterior = medidor.ultima_lectura || 0;
        const consumoMensual = Math.floor(Math.random() * 3000) + 500; 
        const lecturaActual = Number(lecturaAnterior) + consumoMensual;
        
        await db.query(
          `INSERT INTO lectura 
           (medidor_id, periodo_id, operario_id, lectura_anterior, lectura_actual, fecha_registro, justificacion) 
           VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
          [medidor.id, periodoId, operarioId, lecturaAnterior, lecturaActual, 'Carga inicial (Seed) Mayo']
        );
        
        console.log(`Lectura insertada: Medidor ${medidor.num_serie} | Mes 2025-05 | Anterior: ${lecturaAnterior} | Actual: ${lecturaActual}`);
      } else {
        console.log(`Lectura ya existe para Mayo en Medidor ${medidor.num_serie}`);
      }
    }

    console.log('✅ Fix y carga de Mayo completados exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixAndSeedMayo();
