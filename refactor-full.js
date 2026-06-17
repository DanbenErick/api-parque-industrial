const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

// 1. REPOSITORIES TO OOP
const reposDir = path.join(__dirname, 'src', 'repositories');
const repoFiles = fs.readdirSync(reposDir).filter(f => f.endsWith('.ts'));

for (const file of repoFiles) {
  const sourceFile = project.getSourceFile(path.join(reposDir, file));
  if (!sourceFile) continue;

  const baseName = file.replace('.ts', '');
  const className = baseName.charAt(0).toUpperCase() + baseName.slice(1);

  const exportedVars = sourceFile.getVariableStatements().filter(v => v.isExported());
  const exportedFuncs = sourceFile.getFunctions().filter(f => f.isExported());
  
  const methodsToAdd = [];

  for (const varStmt of exportedVars) {
    const declarations = varStmt.getDeclarations();
    for (const decl of declarations) {
      const initializer = decl.getInitializer();
      if (initializer && (initializer.getKind() === SyntaxKind.ArrowFunction || initializer.getKind() === SyntaxKind.FunctionExpression)) {
        methodsToAdd.push({
          name: decl.getName(),
          initializer: initializer.getText(),
        });
      }
    }
  }

  for (const func of exportedFuncs) {
      const name = func.getName();
      const isAsync = func.isAsync();
      const params = func.getParameters().map(p => p.getText()).join(', ');
      const returnType = func.getReturnTypeNode() ? func.getReturnTypeNode().getText() : 'any';
      const body = func.getBodyText();
      
      const asyncStr = isAsync ? 'async ' : '';
      const text = `${asyncStr}(${params}): ${returnType} => {\n${body}\n}`;
      methodsToAdd.push({
          name,
          initializer: text
      });
  }

  if (methodsToAdd.length > 0) {
    // Remove the old exports
    for (const varStmt of exportedVars) {
      const declarations = varStmt.getDeclarations();
      const hasFunc = declarations.some(d => d.getInitializer() && (d.getInitializer().getKind() === SyntaxKind.ArrowFunction || d.getInitializer().getKind() === SyntaxKind.FunctionExpression));
      if (hasFunc) {
          varStmt.remove();
      }
    }
    for (const func of exportedFuncs) {
        func.remove();
    }

    const classDecl = sourceFile.addClass({
      name: className,
      isExported: false
    });

    for (const method of methodsToAdd) {
      classDecl.addProperty({
        name: method.name,
        initializer: method.initializer,
        scope: 'public'
      });
    }

    sourceFile.addExportAssignment({
      isExportEquals: false,
      expression: `new ${className}()`
    });
  }
}

project.saveSync();
console.log('Repositories refactored.');

// 2. CONTROLLERS DI
const controllersDir = path.join(__dirname, 'src', 'controllers');
const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

for (const file of controllerFiles) {
  const filePath = path.join(controllersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find all imports to repositories or services
  const importRegex = /import\s+\*\s+as\s+([a-zA-Z0-9_]+)\s+from\s+['"]\.\.\/(repositories|services)\/([^'"]+)['"]/g;
  let match;
  const injectables = [];

  while ((match = importRegex.exec(content)) !== null) {
    injectables.push({
      alias: match[1],
      folder: match[2],
      module: match[3],
      fullMatch: match[0]
    });
  }

  if (injectables.length === 0) continue;

  for (const inj of injectables) {
    if (inj.folder === 'repositories') {
      const newImport = `import ${inj.alias}Instance from '../${inj.folder}/${inj.module}';`;
      // Use replace with string exact match to avoid regex issues, though it should be safe
      content = content.replace(inj.fullMatch, newImport);
    }
  }

  for (const inj of injectables) {
    const callRegex = new RegExp(`\\b${inj.alias}\\.`, 'g');
    content = content.replace(callRegex, `this.${inj.alias}.`);
  }

  const baseName = file.replace('.ts', '');
  const className = baseName.charAt(0).toUpperCase() + baseName.slice(1);
  const classRegex = new RegExp(`class\\s+${className}\\s*\\{`);
  
  const constructorArgs = injectables.map(inj => `private ${inj.alias}: any`).join(', ');
  const constructorStr = `\n    constructor(${constructorArgs}) {}\n`;

  content = content.replace(classRegex, `class ${className} {${constructorStr}`);

  const exportRegex = new RegExp(`export\\s+default\\s+new\\s+${className}\\(\\);`);
  const instanceArgs = injectables.map(inj => {
    if (inj.folder === 'repositories') return `${inj.alias}Instance`;
    return inj.alias;
  }).join(', ');
  content = content.replace(exportRegex, `export default new ${className}(${instanceArgs});`);

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Controllers DI refactored.');
