const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

function walkSync(dir, filelist = []) {
  fs.readdirSync(dir).forEach(file => {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else if (dirFile.endsWith('.ts')) {
      filelist.push(dirFile);
    }
  });
  return filelist;
}

const files = walkSync(srcDir);

let enumImportRegex = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"](?:\.\.\/)+types\/enums['"];/;

for (const file of files) {
  if (file.includes('/types/')) continue; // Skip types definitions

  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;
  
  // Replace Roles
  content = content.replace(/'Admin'/g, 'RolUsuario.ADMIN');
  content = content.replace(/'Operario'/g, 'RolUsuario.OPERARIO');
  content = content.replace(/'Socio'/g, 'RolUsuario.SOCIO');

  // Replace Estados
  // Watch out for SQL queries string interpolation!
  // In SQL, they need to be inside ${}. Or if it's already a string like `estado = 'Pendiente'`, it might be tricky.
  // Actually, replacing 'Pendiente' with RolUsuario.ADMIN is bad context.
  
  // Let's manually replace in the specific patterns:
  content = content.replace(/=== 'Pendiente'/g, '=== EstadoRecibo.PENDIENTE');
  content = content.replace(/=== 'Pagado'/g, '=== EstadoRecibo.PAGADO');
  content = content.replace(/=== 'Vencido'/g, '=== EstadoRecibo.VENCIDO');
  content = content.replace(/=== 'Anulado'/g, '=== EstadoRecibo.ANULADO');
  content = content.replace(/=== 'Pago Parcial'/g, '=== EstadoRecibo.PAGO_PARCIAL');
  
  content = content.replace(/\? 'Pagado' : 'Pendiente'/g, '? EstadoRecibo.PAGADO : EstadoRecibo.PENDIENTE');
  content = content.replace(/\? 'Pagado' : 'Pago Parcial'/g, '? EstadoRecibo.PAGADO : EstadoRecibo.PAGO_PARCIAL');

  // SQL Strings (inside backticks or quotes):
  content = content.replace(/estado = 'Pendiente'/g, "estado = '${EstadoRecibo.PENDIENTE}'");
  content = content.replace(/estado IN \('Pendiente', 'Vencido', 'Pago Parcial'\)/g, "estado IN ('${EstadoRecibo.PENDIENTE}', '${EstadoRecibo.VENCIDO}', '${EstadoRecibo.PAGO_PARCIAL}')");
  content = content.replace(/estado IN \('Pendiente', 'Pago Parcial'\)/g, "estado IN ('${EstadoRecibo.PENDIENTE}', '${EstadoRecibo.PAGO_PARCIAL}')");
  content = content.replace(/estado = 'Pagado'/g, "estado = '${EstadoRecibo.PAGADO}'");
  content = content.replace(/estado != 'Anulado'/g, "estado != '${EstadoRecibo.ANULADO}'");
  content = content.replace(/estado = 'Anulado'/g, "estado = '${EstadoRecibo.ANULADO}'");
  content = content.replace(/estado = 'Vencido'/g, "estado = '${EstadoRecibo.VENCIDO}'");

  // Tipos
  content = content.replace(/=== 'Tiempo Real'/g, '=== TipoMedidor.TIEMPO_REAL');
  content = content.replace(/=== 'Normal'/g, '=== TipoMedidor.NORMAL');
  
  // If we changed something, we need to add imports.
  if (content !== originalContent) {
    const enumsNeeded = new Set();
    if (content.includes('RolUsuario')) enumsNeeded.add('RolUsuario');
    if (content.includes('EstadoRecibo')) enumsNeeded.add('EstadoRecibo');
    if (content.includes('EstadoPeriodo')) enumsNeeded.add('EstadoPeriodo');
    if (content.includes('TipoMedidor')) enumsNeeded.add('TipoMedidor');
    
    if (enumsNeeded.size > 0) {
      // Find relative path to src/types/enums
      const fileDir = path.dirname(file);
      let relativePath = path.relative(fileDir, path.join(srcDir, 'types', 'enums'));
      if (!relativePath.startsWith('.')) relativePath = './' + relativePath;
      relativePath = relativePath.replace(/\\/g, '/');

      const importStr = `import { ${Array.from(enumsNeeded).join(', ')} } from '${relativePath}';\n`;
      
      // Inject after last import
      const lines = content.split('\n');
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import ')) lastImportIndex = i;
      }
      
      if (lastImportIndex !== -1) {
        lines.splice(lastImportIndex + 1, 0, importStr);
        content = lines.join('\n');
      } else {
        content = importStr + content;
      }
      
      fs.writeFileSync(file, content, 'utf8');
      console.log(`Updated ${file}`);
    }
  }
}
console.log('Enum refactor done.');
