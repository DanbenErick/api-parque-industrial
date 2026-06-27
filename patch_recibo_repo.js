const fs = require('fs');

const path = 'src/repositories/reciboRepository.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  /pf\.mes_anio as periodo/g,
  "pf.mes_anio as periodo, m.num_serie as medidor_num_serie"
);

content = content.replace(
  /INNER JOIN periodo_facturacion pf ON r\.periodo_id = pf\.id/g,
  "INNER JOIN periodo_facturacion pf ON r.periodo_id = pf.id\n    LEFT JOIN lectura l ON r.lectura_id = l.id\n    LEFT JOIN medidor m ON l.medidor_id = m.id"
);

fs.writeFileSync(path, content, 'utf8');
console.log('Patched reciboRepository.ts');
