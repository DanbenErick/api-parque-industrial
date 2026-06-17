const fs = require('fs');
const path = require('path');

const controllersDir = path.join(__dirname, 'src', 'controllers');
const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

for (const file of controllerFiles) {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  const baseName = file.replace('.ts', '');
  const className = baseName.charAt(0).toUpperCase() + baseName.slice(1);

  // 1. Fix repository imports: import repoNameInstance from '../repositories/repoName' -> import { RepoClass } from '../repositories/repoName'
  const repoImportRegex = /import\s+([a-zA-Z0-9_]+)Instance\s+from\s+['"]\.\.\/repositories\/([^'"]+)['"];?/g;
  content = content.replace(repoImportRegex, (match, alias, module) => {
    const classN = module.charAt(0).toUpperCase() + module.slice(1) + 'Repository';
    return `import { ${classN} } from '../repositories/${module}';`;
  });

  // 2. Fix service imports: import * as serviceName from '../services/serviceName' -> import { ServiceClass } from '../services/serviceName'
  // Note: we previously ran fix-imports.js which removed `* as` in some places. Let's handle both.
  const serviceImportRegex = /import\s+(?:\*\s+as\s+)?([a-zA-Z0-9_]+)\s+from\s+['"]\.\.\/services\/([^'"]+)['"];?/g;
  content = content.replace(serviceImportRegex, (match, alias, module) => {
    const classN = module.charAt(0).toUpperCase() + module.slice(1);
    return `import { ${classN} } from '../services/${module}';`;
  });

  // 3. Add types to constructor parameters
  // Currently they are `private alias: any`
  // Let's replace `: any` with `: ClassName` based on the alias name
  const constructorRegex = /constructor\(([^)]*)\)/;
  const match = constructorRegex.exec(content);
  if (match && match[1]) {
    const argsStr = match[1];
    const args = argsStr.split(',').map(arg => arg.trim()).filter(Boolean);
    const typedArgs = args.map(arg => {
      // arg is like `private repoName: any` or `private pdfService: any`
      if (arg.includes(': any')) {
        const parts = arg.split(':');
        const varPart = parts[0].trim(); // `private repoName`
        const varName = varPart.split(' ')[1]; // `repoName`
        
        let typeName = varName.charAt(0).toUpperCase() + varName.slice(1);
        if (varName.endsWith('Repo')) {
            typeName = typeName.replace('Repo', 'Repository');
        }
        return `${varPart}: ${typeName}`;
      }
      return arg;
    });
    content = content.replace(constructorRegex, `constructor(${typedArgs.join(', ')})`);
  }

  // 4. Change `class MyController` to `export class MyController`
  const classDefRegex = new RegExp(`class\\s+${className}\\s*\\{`);
  content = content.replace(classDefRegex, `export class ${className} {`);

  // 5. Remove `export default new MyController(...)`
  const exportRegex = new RegExp(`export\\s+default\\s+new\\s+${className}\\([^)]*\\);?`);
  content = content.replace(exportRegex, '');

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Controllers true DI refactored.');
