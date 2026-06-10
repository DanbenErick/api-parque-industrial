const fs = require('fs');
const path = './src/controllers/reciboController.js';
let content = fs.readFileSync(path, 'utf8');

// The logic from line 420 to 669
const drawingLogic = content.match(/    const PRIMARY = '#1e3a8a';[\s\S]*?doc\.end\(\);\n/)[0];

const helperFunction = `
const fs = require('fs'); // Ensure fs is required if not already

const drawReciboLayoutV2 = (doc, recibo, historial, logoPath) => {
${drawingLogic.replace(/    /g, '  ')}
};
`;

// Replace the drawing logic in exportReciboPdfV2 with a call to the helper
let newExportReciboPdfV2 = content.replace(/    const PRIMARY = '#1e3a8a';[\s\S]*?doc\.end\(\);\n/, `    const logoPath = path.join(__dirname, '../assets/logo.png');
    drawReciboLayoutV2(doc, recibo, historial, logoPath);
`);

// Add exportAllRecibosPdfV2 right after exportReciboPdfV2
const exportAllFunction = `

// -------------------------------------------------------
// GENERAR PDF MASIVO DE RECIBOS (V2)
// -------------------------------------------------------
const exportAllRecibosPdfV2 = async (req, res) => {
  try {
    const filters = {
      year: req.query.year,
      periodo: req.query.periodo,
      estado: req.query.estado,
      search: req.query.search
    };
    
    const recibos = await reciboRepo.findAll(filters);
    if (!recibos || recibos.length === 0) {
      return res.status(404).json({ error: 'No se encontraron recibos para exportar.' });
    }

    const doc = new PDFDocument({ size: 'A4', margin: 30, autoFirstPage: false });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', \`attachment; filename=recibos_masivos_\${filters.periodo || 'todos'}.pdf\`);
    
    const fontPath = path.join(__dirname, '../fonts');
    doc.registerFont('Lexend', path.join(fontPath, 'Lexend-Regular.ttf'));
    doc.registerFont('Lexend-Medium', path.join(fontPath, 'Lexend-Medium.ttf'));
    doc.registerFont('Lexend-Bold', path.join(fontPath, 'Lexend-Bold.ttf'));

    doc.pipe(res);
    
    const logoPath = path.join(__dirname, '../assets/logo.png');

    for (let i = 0; i < recibos.length; i++) {
      const recibo = await reciboRepo.findByIdCompleto(recibos[i].id);
      if (!recibo) continue;

      const historial = await reciboRepo.findHistorialConsumo(recibo.usuario_id, 7, recibo.periodo_inicio);

      doc.addPage({ size: 'A4', margin: 30 });
      drawReciboLayoutV2(doc, recibo, historial, logoPath);
    }

    doc.end();
  } catch (error) {
    console.error('Error al generar PDF V2 masivo:', error);
    res.status(500).json({ error: 'Error al generar el PDF masivo V2' });
  }
};
`;

let finalContent = newExportReciboPdfV2.replace('const exportReciboPdfV2 = async (req, res) => {', helperFunction.replace('const fs = require(\\\'fs\\\');', '') + '\nconst exportReciboPdfV2 = async (req, res) => {');

finalContent = finalContent.replace('const exportReporteExcel = async (req, res) => {', exportAllFunction + '\nconst exportReporteExcel = async (req, res) => {');

// Update exports
finalContent = finalContent.replace(/module\.exports = \{/, 'module.exports = {\n  exportAllRecibosPdfV2,');

fs.writeFileSync(path, finalContent);
console.log('Refactoring complete');
