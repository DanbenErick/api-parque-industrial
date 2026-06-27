const fs = require('fs');
const path = 'src/repositories/reciboRepository.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/LEFT JOIN lectura l ON r\.lectura_id = l\.id\n\s*LEFT JOIN medidor m ON l\.medidor_id = m\.id\n\s*LEFT JOIN lectura l ON r\.lectura_id = l\.id\n\s*LEFT JOIN medidor m ON l\.medidor_id = m\.id/g,
  'LEFT JOIN lectura l ON r.lectura_id = l.id\n    LEFT JOIN medidor m ON l.medidor_id = m.id');

content = content.replace(/LEFT JOIN lectura l ON r\.lectura_id = l\.id\n\s*LEFT JOIN medidor m ON l\.medidor_id = m\.id\n\s*LEFT JOIN \(?SELECT/g,
  'LEFT JOIN lectura l ON r.lectura_id = l.id\n    LEFT JOIN medidor m ON l.medidor_id = m.id\n    LEFT JOIN (SELECT');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed duplications!');
