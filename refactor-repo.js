const fs = require('fs');

const repoPath = 'src/repositories/reciboRepository.ts';
const servicePath = 'src/services/reciboService.ts';
const controllerPath = 'src/controllers/reciboController.ts';

let repoCode = fs.readFileSync(repoPath, 'utf8');
let repoLines = repoCode.split('\n');

const generarMasivamenteStart = repoLines.findIndex(l => l.includes('export const generarMasivamente = async'));
const findByIdCompletoStart = repoLines.findIndex(l => l.includes('export const findByIdCompleto = async'));
const generarIndividualStart = repoLines.findIndex(l => l.includes('export const generarIndividual = async'));
const findAllSinMedidorStart = repoLines.findIndex(l => l.includes('export const findAllSinMedidor = async'));
const updateCargosStart = repoLines.findIndex(l => l.includes('export const updateCargos = async'));
// until end of file is anularRecibo

// Block 1: generarMasivamente (between generarMasivamenteStart and findByIdCompletoStart)
const block1 = repoLines.slice(generarMasivamenteStart, findByIdCompletoStart).join('\n');

// Block 2: generarIndividual (between generarIndividualStart and findAllSinMedidorStart)
const block2 = repoLines.slice(generarIndividualStart, findAllSinMedidorStart).join('\n');

// Block 3: updateCargos and anularRecibo (from updateCargosStart to end of file)
const block3 = repoLines.slice(updateCargosStart).join('\n');

// Now, remove these blocks from the repo array
// We slice backwards to not mess up indices
let newRepoLines = repoLines.slice();
newRepoLines.splice(updateCargosStart, newRepoLines.length - updateCargosStart);
newRepoLines.splice(generarIndividualStart, findAllSinMedidorStart - generarIndividualStart);
newRepoLines.splice(generarMasivamenteStart, findByIdCompletoStart - generarMasivamenteStart);

fs.writeFileSync(repoPath, newRepoLines.join('\n'));

// Create reciboService.ts
const serviceCode = `import db from '../config/db';

${block1}
${block2}
${block3}
`;
fs.writeFileSync(servicePath, serviceCode);

// Update controller to use reciboService instead of reciboRepo for these 4 methods
let controllerCode = fs.readFileSync(controllerPath, 'utf8');
controllerCode = controllerCode.replace("import * as reciboRepo from '../repositories/reciboRepository';", "import * as reciboRepo from '../repositories/reciboRepository';\nimport * as reciboService from '../services/reciboService';");

controllerCode = controllerCode.replace(/reciboRepo.generarMasivamente/g, 'reciboService.generarMasivamente');
controllerCode = controllerCode.replace(/reciboRepo.generarIndividual/g, 'reciboService.generarIndividual');
controllerCode = controllerCode.replace(/reciboRepo.updateCargos/g, 'reciboService.updateCargos');
controllerCode = controllerCode.replace(/reciboRepo.anularRecibo/g, 'reciboService.anularRecibo');

fs.writeFileSync(controllerPath, controllerCode);

console.log("Repository refactored into service.");
