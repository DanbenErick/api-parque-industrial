const fs = require('fs');
const path = 'src/repositories/reciboRepository.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(/LEFT JOIN medidor m ON l\.medidor_id = m\.id\n\s*LEFT JOIN medidor m ON m\.usuario_id = u\.id AND m\.deleted_at IS NULL/g,
  'LEFT JOIN medidor m ON m.usuario_id = u.id AND m.deleted_at IS NULL');

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed duplications m!');
