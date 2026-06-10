const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Bienvenido a la API del Parque Industrial Jicamarca' });
});

// Import and use routes
const authRoutes = require('./routes/authRoutes');
const usuarioRoutes = require('./routes/usuarioRoutes');
const periodoRoutes = require('./routes/periodoRoutes');
const medidorRoutes = require('./routes/medidorRoutes');
const lecturaRoutes = require('./routes/lecturaRoutes');
const reciboRoutes = require('./routes/reciboRoutes');
const pagoRoutes = require('./routes/pagoRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const configRoutes = require('./routes/configRoutes');
const catalogoCargoRoutes = require('./routes/catalogoCargoRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/periodos', periodoRoutes);
app.use('/api/medidores', medidorRoutes);
app.use('/api/lecturas', lecturaRoutes);
app.use('/api/recibos', reciboRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/config', configRoutes);
app.use('/api/catalogo-cargos', catalogoCargoRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo salió mal en el servidor' });
});

app.get('/', (req, res) => {
  res.status(200).json({
    ok: true,
    msg: 'Funcionando'
  })
})

// Import and initialize cron jobs
const initRecibosCron = require('./cron/recibosCron');
initRecibosCron();

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en el puerto ${PORT}`);
});
