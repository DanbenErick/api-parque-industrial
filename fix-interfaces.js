const fs = require('fs');

['src/services/pdfService.ts', 'src/services/excelService.ts'].forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(
    '  rol_id?: string;',
    '  rol_id?: string;\n  estado?: string;\n  rubro?: string;'
  );
  fs.writeFileSync(file, content);
});

console.log("Fixed interfaces.");
