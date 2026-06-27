const mysql = require('mysql2/promise');
async function run() {
  const con = await mysql.createConnection({host:'127.0.0.1', user:'root', password:'', database:'luz_db'});
  const [rows] = await con.query("SELECT m.id, m.num_serie, m.tipo, u.nombre_razonsocial FROM medidor m INNER JOIN usuario u ON m.usuario_id = u.id WHERE m.tipo = 'Sin medidor'");
  console.log(rows);
  process.exit();
}
run();
