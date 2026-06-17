const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

const servicesDir = path.join(__dirname, 'src', 'services');
const serviceFiles = fs.readdirSync(servicesDir).filter(f => f.endsWith('.ts'));

for (const file of serviceFiles) {
  const sourceFile = project.getSourceFile(path.join(servicesDir, file));
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
      isExported: true // export class PdfService
    });

    for (const method of methodsToAdd) {
      classDecl.addProperty({
        name: method.name,
        initializer: method.initializer,
        scope: 'public'
      });
    }
  }
}

project.saveSync();
console.log('Services refactored to classes.');

// Now fix imports and add constructors via string replace for simplicity
for (const file of serviceFiles) {
  const filePath = path.join(servicesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Find all repo imports: import repoName from '../repositories/repoNameRepository'
  const importRegex = /import\s+([a-zA-Z0-9_]+)\s+from\s+['"]\.\.\/repositories\/([^'"]+)['"]/g;
  let match;
  const injectables = [];

  while ((match = importRegex.exec(content)) !== null) {
    injectables.push({
      alias: match[1],
      module: match[2],
      fullMatch: match[0],
      className: match[2].charAt(0).toUpperCase() + match[2].slice(1)
    });
  }

  for (const inj of injectables) {
    // Replace import with named import: import { RepoClass } from ...
    const newImport = `import { ${inj.className} } from '../repositories/${inj.module}';`;
    content = content.replace(inj.fullMatch, newImport);

    // Replace usage: repoName.method() -> this.repoName.method()
    const callRegex = new RegExp(`\\b${inj.alias}\\.`, 'g');
    content = content.replace(callRegex, `this.${inj.alias}.`);
  }

  const baseName = file.replace('.ts', '');
  const className = baseName.charAt(0).toUpperCase() + baseName.slice(1);
  const classRegex = new RegExp(`export\\s+class\\s+${className}\\s*\\{`);
  
  if (injectables.length > 0) {
    const constructorArgs = injectables.map(inj => `private ${inj.alias}: ${inj.className}`).join(', ');
    const constructorStr = `\n    constructor(${constructorArgs}) {}\n`;
    content = content.replace(classRegex, `export class ${className} {${constructorStr}`);
  }

  fs.writeFileSync(filePath, content, 'utf8');
}

console.log('Services DI refactored.');
