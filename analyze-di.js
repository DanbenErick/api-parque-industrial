const fs = require('fs');
const path = require('path');
const { Project, SyntaxKind } = require('ts-morph');

const project = new Project({
  tsConfigFilePath: path.join(__dirname, 'tsconfig.json'),
});

const controllersDir = path.join(__dirname, 'src', 'controllers');
const controllerFiles = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

const analysis = {};

for (const file of controllerFiles) {
  const sourceFile = project.getSourceFile(path.join(controllersDir, file));
  if (!sourceFile) continue;

  const imports = sourceFile.getImportDeclarations();
  const injectableImports = [];

  for (const imp of imports) {
    const specifier = imp.getModuleSpecifierValue();
    if (specifier.includes('../repositories/') || specifier.includes('../services/')) {
      const namespaceImport = imp.getNamespaceImport();
      if (namespaceImport) {
        injectableImports.push({
          alias: namespaceImport.getText(),
          module: specifier
        });
      }
    }
  }

  analysis[file] = injectableImports;
}

console.log(JSON.stringify(analysis, null, 2));
