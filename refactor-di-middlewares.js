const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

const middlewaresDir = path.join(__dirname, 'src', 'middlewares');
const middlewareFiles = fs.readdirSync(middlewaresDir).filter(f => f.endsWith('.ts'));

for (const file of middlewareFiles) {
  const sourceFile = project.getSourceFile(path.join(middlewaresDir, file));
  if (!sourceFile) continue;

  const baseName = file.replace('.ts', '');
  const className = baseName.charAt(0).toUpperCase() + baseName.slice(1) + (baseName.endsWith('Middleware') ? '' : 'Middleware');

  const exportedVars = sourceFile.getVariableStatements().filter(v => v.isExported());
  const exportedFuncs = sourceFile.getFunctions().filter(f => f.isExported());
  
  // also check default exports. if it exports a single function default, handle it.
  const defaultExport = sourceFile.getDefaultExportSymbol();
  let defaultFuncText = null;
  let defaultFuncName = null;
  if (defaultExport && defaultExport.getDeclarations().length > 0) {
      const decl = defaultExport.getDeclarations()[0];
      if (decl.getKind() === SyntaxKind.FunctionDeclaration) {
          defaultFuncName = decl.getName() || 'handle';
          defaultFuncText = decl.getText().replace(/export\s+default\s+/, '');
          // actually just get the text and remove the export default
      }
  }

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

  // If there's a default export function (like errorHandler)
  const defaultFuncs = sourceFile.getFunctions().filter(f => f.isDefaultExport());
  for (const func of defaultFuncs) {
      const name = func.getName() || 'handle';
      const isAsync = func.isAsync();
      const params = func.getParameters().map(p => p.getText()).join(', ');
      const returnType = func.getReturnTypeNode() ? func.getReturnTypeNode().getText() : 'any';
      const body = func.getBodyText();
      
      const asyncStr = isAsync ? 'async ' : '';
      const text = `${asyncStr}(${params}) => {\n${body}\n}`;
      methodsToAdd.push({
          name,
          initializer: text
      });
  }

  if (methodsToAdd.length > 0) {
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
    for (const func of defaultFuncs) {
        func.remove();
    }

    const classDecl = sourceFile.addClass({
      name: className,
      isExported: true // export class AuthMiddleware
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
console.log('Middlewares refactored to classes.');
