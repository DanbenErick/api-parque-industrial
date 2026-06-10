const db = require('../src/config/db');

const periodosAMeter = [
  { mes_anio: '2025-01', tarifa_kwh: 0.8500, tarifa_mantenimiento: 15.00, fecha_inicio: '2025-01-01', fecha_fin: '2025-01-31' },
  { mes_anio: '2025-02', tarifa_kwh: 0.8550, tarifa_mantenimiento: 15.00, fecha_inicio: '2025-02-01', fecha_fin: '2025-02-28' },
  { mes_anio: '2025-03', tarifa_kwh: 0.8600, tarifa_mantenimiento: 15.00, fecha_inicio: '2025-03-01', fecha_fin: '2025-03-31' },
  { mes_anio: '2025-04', tarifa_kwh: 0.8650, tarifa_mantenimiento: 15.00, fecha_inicio: '2025-04-01', fecha_fin: '2025-04-30' }
];

async function seed() {
  try {
    console.log('Iniciando seed de base de datos para Enero-Abril 2025...');
    
    // 1. Insertar periodos si no existen
    const periodosIds = {};
    for (const p of periodosAMeter) {
      const [rows] = await db.query('SELECT id FROM periodo_facturacion WHERE mes_anio = ?', [p.mes_anio]);
      if (rows.length === 0) {
        const [result] = await db.query(
          'INSERT INTO periodo_facturacion (mes_anio, tarifa_kwh, tarifa_mantenimiento, factor_multiplicador, fecha_inicio, fecha_fin) VALUES (?, ?, ?, 1.0000, ?, ?)',
          [p.mes_anio, p.tarifa_kwh, p.tarifa_mantenimiento, p.fecha_inicio, p.fecha_fin]
        );
        periodosIds[p.mes_anio] = result.insertId;
        console.log(`Periodo ${p.mes_anio} insertado con ID: ${result.insertId}`);
      } else {
        periodosIds[p.mes_anio] = rows[0].id;
        console.log(`Periodo ${p.mes_anio} ya existe con ID: ${rows[0].id}`);
      }
    }

    // 2. Obtener medidores activos
    const [medidores] = await db.query('SELECT m.id, m.num_serie FROM medidor m WHERE m.operativo = 1 AND m.deleted_at IS NULL');
    console.log(`Se encontraron ${medidores.length} medidores activos para insertar lecturas.`);

    // 3. Generar lecturas progresivas
    const meses = ['2025-01', '2025-02', '2025-03', '2025-04'];
    
    // Obtener operario (usar el primero que exista)
    const [operarios] = await db.query('SELECT id FROM usuario LIMIT 1');
    const operarioId = operarios.length > 0 ? operarios[0].id : 1;

    for (const medidor of medidores) {
      let ultimaLectura = Math.floor(Math.random() * 5000) + 1000;
      
      for (let i = 0; i < meses.length; i++) {
        const mes = meses[i];
        const periodoId = periodosIds[mes];
        
        const [existing] = await db.query('SELECT id FROM lectura WHERE medidor_id = ? AND periodo_id = ?', [medidor.id, periodoId]);
        
        if (existing.length === 0) {
          const consumoMensual = Math.floor(Math.random() * 3000) + 500; 
          const lecturaAnterior = ultimaLectura;
          const lecturaActual = ultimaLectura + consumoMensual;
          
          await db.query(
            `INSERT INTO lectura 
             (medidor_id, periodo_id, operario_id, lectura_anterior, lectura_actual, fecha_registro, justificacion) 
             VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
            [medidor.id, periodoId, operarioId, lecturaAnterior, lecturaActual, 'Carga inicial (Seed)']
          );
          
          console.log(`Lectura insertada: Medidor ${medidor.num_serie} | Mes ${mes} | Anterior: ${lecturaAnterior} | Actual: ${lecturaActual}`);
          ultimaLectura = lecturaActual;
        } else {
          console.log(`Lectura ya existe: Medidor ${medidor.num_serie} | Mes ${mes}`);
          const [lect] = await db.query('SELECT lectura_actual FROM lectura WHERE id = ?', [existing[0].id]);
          ultimaLectura = lect[0].lectura_actual;
        }
      }
    }
    
    console.log('✅ Base de datos poblada exitosamente con meses anteriores y lecturas.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error al poblar base de datos:', error);
    process.exit(1);
  }
}

seed();
