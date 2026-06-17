const fs = require('fs');
const path = require('path');

const reposDir = path.join(__dirname, 'src', 'repositories');
const repoFiles = fs.readdirSync(reposDir).filter(f => f.endsWith('.ts'));

for (const file of repoFiles) {
  const filePath = path.join(reposDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const baseName = file.replace('.ts', '');
  const className = baseName.charAt(0).toUpperCase() + baseName.slice(1) + 'Repository';

  // 1. Remove import db from '../config/db';
  content = content.replace(/import\s+db\s+from\s+['"]\.\.\/config\/db['"];?\n?/, '');

  // 2. Add import { Database } from '../config/db';
  if (!content.includes("import { Database }")) {
      content = "import { Database } from '../config/db';\n" + content;
  }

  // 3. Replace `db.query` with `this.db.query`
  // Actually, sometimes it's `await db.query` or `db.getConnection`
  content = content.replace(/\bdb\./g, 'this.db.');

  // 4. Add constructor to class
  const classRegex = new RegExp(`class\\s+${baseName.charAt(0).toUpperCase() + baseName.slice(1)}\\s*\\{`);
  // Note: the previous script named the class just `Medidor`, wait, no, let me check.
  // In `refactor-full.js`: `const className = baseName.charAt(0).toUpperCase() + baseName.slice(1);`
  // Ah! So if `file` is `medidorRepository.ts`, `baseName` is `medidorRepository`. 
  // So `className` is `MedidorRepository`! Excellent.
  
  const classDefRegex = new RegExp(`class\\s+${className}\\s*\\{`);
  content = content.replace(classDefRegex, `export class ${className} {\n    constructor(private db: Database) {}`);

  // 5. Remove export default new ClassName();
  const exportRegex = new RegExp(`export\\s+default\\s+new\\s+${className}\\(\\);`);
  content = content.replace(exportRegex, '');

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Repositories refactored for true DI.');
