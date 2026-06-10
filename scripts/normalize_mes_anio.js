const db = require('../src/config/db');

async function normalizeMesAnio() {
  try {
    const [periodos] = await db.query('SELECT id, mes_anio FROM periodo_facturacion');
    
    for (const p of periodos) {
      const parts = p.mes_anio.split('-');
      if (parts.length === 2 && parts[0].length === 2 && parts[1].length === 4) {
        // Formato MM-YYYY detectado, convertir a YYYY-MM
        const normalized = `${parts[1]}-${parts[0]}`;
        await db.query('UPDATE periodo_facturacion SET mes_anio = ? WHERE id = ?', [normalized, p.id]);
        console.log(`Actualizado ID ${p.id}: ${p.mes_anio} -> ${normalized}`);
      }
    }
    
    console.log('✅ Formatos normalizados exitosamente.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

normalizeMesAnio();
