const db = require('../src/config/db');
db.query('SHOW COLUMNS FROM recibo').then(([rows]) => {
  console.log(rows);
  process.exit(0);
}).catch(console.error);
