const db = require('./src/config/db');
async function test() {
  const [cargos] = await db.query('SELECT * FROM recibo_cargo_dinamico LIMIT 5');
  console.log(cargos);
  process.exit();
}
test();
