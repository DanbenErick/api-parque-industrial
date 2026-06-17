const fs = require('fs');
const path = require('path');

const reposDir = path.join(__dirname, 'src', 'repositories');
const repoFiles = fs.readdirSync(reposDir).filter(f => f.endsWith('.ts'));

for (const file of repoFiles) {
  const filePath = path.join(reposDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const baseName = file.replace('.ts', '');
  const className = baseName.charAt(0).toUpperCase() + baseName.slice(1); // just AuditoriaRepository

  // Add constructor to class
  const classDefRegex = new RegExp(`class\\s+${className}\\s*\\{`);
  content = content.replace(classDefRegex, `export class ${className} {\n    constructor(private db: Database) {}`);

  // Remove export default new ClassName();
  const exportRegex = new RegExp(`export\\s+default\\s+new\\s+${className}\\(\\);`);
  content = content.replace(exportRegex, '');

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Repos fixed.');
