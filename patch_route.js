const fs = require('fs');
const path = './src/routes/reciboRoutes.js';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  "router.get('/reporte/excel', authorizeRole(['Admin', 'Operario']), reciboController.exportReporteExcel);",
  "router.get('/reporte/excel', authorizeRole(['Admin', 'Operario']), reciboController.exportReporteExcel);\nrouter.get('/reporte/excel-sin-medidor', authorizeRole(['Admin', 'Operario']), reciboController.exportReporteExcelSinMedidor);"
);

fs.writeFileSync(path, code);
console.log("Route added");
