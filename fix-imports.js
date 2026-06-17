const fs = require('fs');
const path = require('path');

const dirsToFix = ['src/services', 'src/middlewares', 'src/routes'];

function fixImports(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const files = fs.readdirSync(dirPath);
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      fixImports(fullPath);
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix imports from repositories
      const repoRegex = /import\s+\*\s+as\s+([a-zA-Z0-9_]+)\s+from\s+['"]\.\.\/repositories\/([^'"]+)['"]/g;
      content = content.replace(repoRegex, "import $1 from '../repositories/$2'");

      // Also fix if there are any controller imports that were missed (though routes were done earlier)
      const controllerRegex = /import\s+\*\s+as\s+([a-zA-Z0-9_]+)\s+from\s+['"]\.\.\/controllers\/([^'"]+)['"]/g;
      content = content.replace(controllerRegex, "import $1 from '../controllers/$2'");

      fs.writeFileSync(fullPath, content, 'utf8');
    }
  }
}

dirsToFix.forEach(dir => fixImports(path.join(__dirname, dir)));
console.log('Imports fixed.');
