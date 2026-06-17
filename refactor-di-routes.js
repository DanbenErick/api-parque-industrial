const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

const routesDir = path.join(__dirname, 'src', 'routes');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));

for (const file of routeFiles) {
  const sourceFile = project.getSourceFile(path.join(routesDir, file));
  if (!sourceFile) continue;

  const baseName = file.replace('.ts', ''); // e.g. usuarioRoutes
  const className = baseName.charAt(0).toUpperCase() + baseName.slice(1); // e.g. UsuarioRoutes

  // Find controller imports
  // usually: import usuarioController from '../controllers/usuarioController';
  // But we changed controllers to export classes, so it might be broken right now or we need to fix it.
  // Actually, we haven't changed the imports in routes yet.
  
  // So we just read the file as text and rewrite it completely because it's easier to build from scratch.
}
// Using string manipulation is actually way easier for Routes because they are just a series of router.xxx() calls
for (const file of routeFiles) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const baseName = file.replace('.ts', '');
  const className = baseName.charAt(0).toUpperCase() + baseName.slice(1);

  // Parse Controller imports
  const controllerRegex = /import\s+([a-zA-Z0-9_]+)\s+from\s+['"]\.\.\/controllers\/([^'"]+)['"];?/g;
  const controllers = [];
  let match;
  while ((match = controllerRegex.exec(content)) !== null) {
      const classN = match[2].charAt(0).toUpperCase() + match[2].slice(1);
      controllers.push({ alias: match[1], file: match[2], className: classN, full: match[0] });
  }

  // Parse Middleware imports
  // Usually: import { authenticateToken, authorizeRole } from '../middlewares/auth';
  const middlewareRegex = /import\s+\{([^}]+)\}\s+from\s+['"]\.\.\/middlewares\/([^'"]+)['"];?/g;
  const middlewares = [];
  while ((match = middlewareRegex.exec(content)) !== null) {
      const classN = match[2].charAt(0).toUpperCase() + match[2].slice(1) + (match[2].endsWith('Middleware') ? '' : 'Middleware');
      middlewares.push({ imports: match[1], file: match[2], className: classN, full: match[0] });
  }

  // Remove old imports
  for (const c of controllers) content = content.replace(c.full, '');
  for (const m of middlewares) content = content.replace(m.full, '');

  // Add new imports
  let newImports = '';
  const injectables = [];

  for (const c of controllers) {
      newImports += `import { ${c.className} } from '../controllers/${c.file}';\n`;
      injectables.push(`private ${c.alias}: ${c.className}`);
  }
  for (const m of middlewares) {
      // Avoid duplicate middleware imports
      if (!newImports.includes(`from '../middlewares/${m.file}'`)) {
          newImports += `import { ${m.className} } from '../middlewares/${m.file}';\n`;
          // We assume the injected instance name is the file name + 'Middleware'
          const instanceName = m.file + 'Middleware';
          injectables.push(`private ${instanceName}: ${m.className}`);
      }
  }

  // Remove `const router = Router();` or `const router: Router = Router();`
  content = content.replace(/const\s+router(?:\s*:\s*Router)?\s*=\s*Router\(\);\n?/g, '');

  // Remove `export default router;`
  content = content.replace(/export\s+default\s+router;?\n?/g, '');

  // Replace usages
  for (const c of controllers) {
      const callRegex = new RegExp(`\\b${c.alias}\\.`, 'g');
      content = content.replace(callRegex, `this.${c.alias}.`);
  }
  for (const m of middlewares) {
      const funcs = m.imports.split(',').map(s => s.trim());
      for (const fn of funcs) {
          const instanceName = m.file + 'Middleware';
          // Find `router.use(fn)` or `router.get(path, fn, ...)`
          const fnRegex = new RegExp(`\\b${fn}\\b`, 'g');
          content = content.replace(fnRegex, `this.${instanceName}.${fn}`);
      }
  }

  // Wrap the rest of the content (which is just router.xxx calls) into the class
  // Wait, there might be other imports at the top.
  // We should split by the last import.
  const lines = content.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ')) lastImportIdx = i;
  }

  const topImports = lines.slice(0, lastImportIdx + 1).join('\n') + '\n' + newImports;
  const routerCalls = lines.slice(lastImportIdx + 1).join('\n').trim();

  // Replace `router.` with `this.router.`
  const classBodyCalls = routerCalls.replace(/\brouter\./g, 'this.router.');

  const classDef = `
export class ${className} {
    public router: Router;

    constructor(${injectables.join(', ')}) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        ${classBodyCalls.split('\n').join('\n        ')}
    }

    public getRouter(): Router {
        return this.router;
    }
}
`;

  fs.writeFileSync(filePath, topImports + classDef, 'utf8');
}

console.log('Routes true DI refactored.');
