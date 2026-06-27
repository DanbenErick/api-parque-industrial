const fs = require('fs');

const path = 'src/services/reciboService.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /m\.tipo !== 'Sin medidor'/g,
  "m.tipo.toLowerCase() !== 'sin medidor'"
);

content = content.replace(
  /m\.tipo === 'Sin medidor'/g,
  "m.tipo.toLowerCase() === 'sin medidor'"
);

content = content.replace(
  /m\.tipo != 'Sin medidor'/g,
  "LOWER(m.tipo) != 'sin medidor'"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Case insensitivity applied!');
