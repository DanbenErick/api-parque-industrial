const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ==========================================
// CONFIGURACIÓN (¡Modifica estas rutas!)
// ==========================================
const PORT = 5002; // El puerto de tu backend local
const FRONTEND_DIR = path.join(__dirname, '../luz-frontend'); // Ruta a tu carpeta del frontend
const VERCEL_ENV_VAR_NAME = 'NEXT_PUBLIC_API_URL'; // El nombre de la variable en tu frontend
// ==========================================

console.log(`\n🌐 Iniciando Cloudflare Tunnel en el puerto ${PORT}...`);

// Iniciar cloudflared
const cloudflared = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${PORT}`]);

let urlFound = false;

cloudflared.stderr.on('data', (data) => {
  const output = data.toString();
  
  // Buscar la URL generada en los logs de Cloudflare
  const match = output.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  
  if (match && !urlFound) {
    urlFound = true;
    const tunnelUrl = match[0];
    console.log(`\n✅ Tunnel URL obtenida exitosamente: ${tunnelUrl}\n`);
    
    try {
      // 1. Actualizar el .env local del frontend (opcional, para pruebas locales)
      const envPath = path.join(FRONTEND_DIR, '.env');
      if (fs.existsSync(envPath)) {
        let envContent = fs.readFileSync(envPath, 'utf8');
        // Reemplazar la variable si existe, o agregarla
        const regex = new RegExp(`^${VERCEL_ENV_VAR_NAME}=.*`, 'm');
        if (regex.test(envContent)) {
          envContent = envContent.replace(regex, `${VERCEL_ENV_VAR_NAME}=${tunnelUrl}`);
        } else {
          envContent += `\n${VERCEL_ENV_VAR_NAME}=${tunnelUrl}\n`;
        }
        fs.writeFileSync(envPath, envContent);
        console.log(`📝 Archivo .env local actualizado en ${FRONTEND_DIR}`);
      }

      // 2. Actualizar la variable en Vercel y desplegar
      console.log(`\n☁️  Actualizando la variable de entorno en Vercel...`);
      
      // Eliminar la variable anterior (ignorando errores si no existe)
      try {
        execSync(`vercel env rm ${VERCEL_ENV_VAR_NAME} production -y`, { cwd: FRONTEND_DIR, stdio: 'ignore' });
      } catch (e) {}

      // Agregar la nueva URL del tunnel
      execSync(`echo "${tunnelUrl}" | vercel env add ${VERCEL_ENV_VAR_NAME} production`, { cwd: FRONTEND_DIR, stdio: 'inherit' });
      
      console.log(`\n🚀 Lanzando despliegue a producción en Vercel...`);
      execSync('vercel --prod', { cwd: FRONTEND_DIR, stdio: 'inherit' });

      console.log(`\n🎉 ¡Despliegue completado! El backend local está sirviendo a la app en Vercel.`);
      console.log(`⚠️  ATENCIÓN: No cierres esta terminal, o el túnel se caerá.`);

    } catch (error) {
      console.error(`\n❌ Error durante el proceso de despliegue:`, error.message);
      cloudflared.kill();
      process.exit(1);
    }
  }
});

cloudflared.on('close', (code) => {
  console.log(`\n🛑 Cloudflare Tunnel cerrado (Código: ${code}).`);
});

// Manejar cierre con Ctrl+C
process.on('SIGINT', () => {
  console.log('\nCerrando túnel...');
  cloudflared.kill();
  process.exit();
});
