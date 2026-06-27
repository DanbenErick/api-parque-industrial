const fs = require('fs');

const path = 'src/services/reciboService.ts';
let content = fs.readFileSync(path, 'utf8');

// Revert the SELECT
content = content.replace(/SELECT lectura_id, medidor_id FROM recibo/g, "SELECT lectura_id FROM recibo");

// Fix the ficticios logic
const ficticiosLogicRegex = /if \(medidoresFicticios\.length > 0\) {[\s\S]*?\} else if \(medidores\.length === 0\) {/g;

const newFicticiosLogic = `if (medidoresFicticios.length > 0) {
              const yaTieneFactura = recibosPrevios.some((r: any) => r.lectura_id === null);
              if (!yaTieneFactura) {
                const tieneInstalacion = medidoresFicticios.some((m: any) => m.cobro_instalacion_pendiente);
                lecturasGenerar.push({ isDummy: true, cobro_instalacion_pendiente: tieneInstalacion });
              }
            } else if (medidores.length === 0) {`;

content = content.replace(ficticiosLogicRegex, newFicticiosLogic);

// Also fix the else if (medidores.length === 0) part to not check medidor_id
const zeroMedidoresLogicRegex = /const yaTieneFactura = recibosPrevios\.some\(\(r: any\) => r\.lectura_id === null && r\.medidor_id === null\);/g;
content = content.replace(zeroMedidoresLogicRegex, "const yaTieneFactura = recibosPrevios.some((r: any) => r.lectura_id === null);");

// And the push for zero medidores
content = content.replace(/lecturasGenerar\.push\(\{ isDummy: true, medidor_id: null, cobro_instalacion_pendiente: false \}\);/g, "lecturasGenerar.push({ isDummy: true, cobro_instalacion_pendiente: false });");

fs.writeFileSync(path, content, 'utf8');
console.log('Fixed again!');
