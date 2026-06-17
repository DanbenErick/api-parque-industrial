const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

const controllersDir = path.join(__dirname, 'src', 'controllers');
const routesDir = path.join(__dirname, 'src', 'routes');

const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

for (const file of controllerFiles) {
  const sourceFile = project.getSourceFile(path.join(controllersDir, file));
  if (!sourceFile) continue;

  const baseName = file.replace('.ts', '');
  const className = baseName.charAt(0).toUpperCase() + baseName.slice(1);

  const exportedVars = sourceFile.getVariableStatements().filter(v => v.isExported());
  
  const methodsToAdd = [];

  for (const varStmt of exportedVars) {
    const declarations = varStmt.getDeclarations();
    for (const decl of declarations) {
      const initializer = decl.getInitializer();
      if (initializer && initializer.getKind() === SyntaxKind.ArrowFunction) {
        const name = decl.getName();
        const text = initializer.getText();
        
        methodsToAdd.push({
          name,
          initializer: text,
        });
      }
    }
  }

  const exportedFuncs = sourceFile.getFunctions().filter(f => f.isExported());
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
    for (const varStmt of exportedVars) {
      const declarations = varStmt.getDeclarations();
      const hasArrow = declarations.some(d => d.getInitializer() && d.getInitializer().getKind() === SyntaxKind.ArrowFunction);
      if (hasArrow) {
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
console.log('Controllers refactored successfully.');

// Now update the routes using regex
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.ts'));
for (const file of routeFiles) {
  const filePath = path.join(routesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  content = content.replace(/import\s+\*\s+as\s+([a-zA-Z0-9_]+)\s+from\s+([^;]+);/g, "import $1 from $2;");
  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Routes refactored successfully.');
