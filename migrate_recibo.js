const db = require('./src/config/db');

async function migrateRecibo() {
  try {
    await db.query(`ALTER TABLE recibo ADD COLUMN cargo_energia_punta DECIMAL(12,2) DEFAULT 0.00 AFTER cargo_energia`);
    console.log('cargo_energia_punta added');
  } catch (e) { console.log(e.message); }

  try {
    await db.query(`ALTER TABLE recibo ADD COLUMN cargo_factor_potencia DECIMAL(12,2) DEFAULT 0.00 AFTER cargo_energia_punta`);
    console.log('cargo_factor_potencia added');
  } catch (e) { console.log(e.message); }
  
  process.exit();
}

migrateRecibo();
