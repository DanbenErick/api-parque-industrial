const db = require('./src/config/db');

async function migrate() {
  try {
    await db.query(`ALTER TABLE periodo_facturacion ADD COLUMN tarifa_kwh_punta DECIMAL(10,4) NOT NULL DEFAULT 0.0000 AFTER tarifa_kwh`);
    console.log('tarifa_kwh_punta added');
  } catch (e) { console.log(e.message); }

  try {
    await db.query(`ALTER TABLE lectura ADD COLUMN lectura_anterior_punta DECIMAL(12,2) DEFAULT 0.00 AFTER consumo_calculado`);
    console.log('lectura_anterior_punta added');
  } catch (e) { console.log(e.message); }

  try {
    await db.query(`ALTER TABLE lectura ADD COLUMN lectura_actual_punta DECIMAL(12,2) DEFAULT 0.00 AFTER lectura_anterior_punta`);
    console.log('lectura_actual_punta added');
  } catch (e) { console.log(e.message); }

  try {
    await db.query(`ALTER TABLE lectura ADD COLUMN consumo_calculado_punta DECIMAL(12,3) GENERATED ALWAYS AS (lectura_actual_punta - lectura_anterior_punta) STORED AFTER lectura_actual_punta`);
    console.log('consumo_calculado_punta added');
  } catch (e) { console.log(e.message); }

  try {
    await db.query(`ALTER TABLE lectura ADD COLUMN factor_potencia DECIMAL(10,4) DEFAULT 0.00 AFTER consumo_calculado_punta`);
    console.log('factor_potencia added');
  } catch (e) { console.log(e.message); }

  process.exit();
}

migrate();
