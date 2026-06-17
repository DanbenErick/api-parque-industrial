const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');
const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

for (const file of controllerFiles) {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Fix double RepositoryRepository
  content = content.replace(/RepositoryRepository/g, 'Repository');
  content = content.replace(/RepoRepository/g, 'Repository');

  // Fix dashboardController and lecturaController db imports
  // since they imported db, let's inject db instead.
  // Actually, dashboardController had `import db from '../config/db';`
  // We need to inject `Database`.
  content = content.replace(/import\s+db\s+from\s+['"]\.\.\/config\/db['"];?\n?/, "import { Database } from '../config/db';\n");
  
  if (file === 'dashboardController.ts' && !content.includes('constructor(')) {
      content = content.replace(/export class DashboardController {/, 'export class DashboardController {\n    constructor(private db: Database) {}\n');
      content = content.replace(/\bdb\.query/g, 'this.db.query');
  }

  if (file === 'lecturaController.ts') {
      content = content.replace(/\bdb\.query/g, 'this.db.query');
      // Did it have db injected? It had `private lecturaRepo: LecturaRepository`.
      if (content.includes('constructor(') && !content.includes('private db: Database')) {
          content = content.replace(/constructor\((.*?)\)/, 'constructor($1, private db: Database)');
      }
  }

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Controllers fixed.');
