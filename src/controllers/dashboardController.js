const db = require('../config/db');

const getChartDataHelper = async (year) => {
  let query = `
    SELECT 
      pf.mes_anio as periodo, 
      SUM(l.consumo_calculado) as total_consumo
    FROM lectura l
    JOIN periodo_facturacion pf ON l.periodo_id = pf.id
    WHERE l.deleted_at IS NULL
  `;
  const params = [];
  if (year && year !== 'all') {
    query += ` AND pf.fecha_inicio >= ? AND pf.fecha_inicio < ?`;
    params.push(`${year}-01-01`, `${parseInt(year) + 1}-01-01`);
  }
  query += ` GROUP BY pf.id, pf.mes_anio, pf.fecha_inicio ORDER BY pf.fecha_inicio ASC`;

  // 1. Obtener consumos reales agrupados por periodo
  const [rows] = await db.query(query, params);

  // 2. Mapeamos periodos a un formato estándar
  const mesesMap = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic'
  };

  const formatPeriodName = (raw) => {
    if (raw.includes('-')) {
      const parts = raw.split('-');
      if (parts[0].length === 4) { // YYYY-MM
        return `${mesesMap[parts[1]] || parts[1]} ${parts[0].slice(2)}`;
      } else { // MM-YYYY
        return `${mesesMap[parts[0]] || parts[0]} ${parts[1].slice(2)}`;
      }
    }
    return raw;
  };

  const realData = rows.map(r => ({
    periodo: formatPeriodName(r.periodo),
    consumo: parseFloat(r.total_consumo) || 0
  }));

  // Mantener los últimos 6 meses si se desea, o retornar todo el año. En este caso todo el año.
  return realData;
};

const getKpis = async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();

    // 2. Obtener datos del gráfico para calcular max y min
    const chartData = await getChartDataHelper(year);
    
    // 1. Total Consumo se calcula del chart data
    const totalConsumo = chartData.reduce((sum, d) => sum + d.consumo, 0);
    
    let maxConsumo = 0;
    let maxPeriodo = 'N/A';
    let minConsumo = 0;
    let minPeriodo = 'N/A';

    if (chartData && chartData.length > 0) {
      const sorted = [...chartData].sort((a, b) => b.consumo - a.consumo);
      maxConsumo = sorted[0].consumo;
      maxPeriodo = sorted[0].periodo;
      minConsumo = sorted[sorted.length - 1].consumo;
      minPeriodo = sorted[sorted.length - 1].periodo;
    }

    res.json({
      totalConsumo: parseFloat(totalConsumo),
      maxConsumo,
      maxPeriodo,
      minConsumo,
      minPeriodo
    });
  } catch (error) {
    console.error('Error en getKpis:', error);
    res.status(500).json({ error: 'Error al obtener KPIs' });
  }
};

const getChart = async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const result = await getChartDataHelper(year);
    res.json(result);
  } catch (error) {
    console.error('Error en getChart:', error);
    res.status(500).json({ error: 'Error al obtener datos del gráfico' });
  }
};

const getAlerts = async (req, res) => {
  try {
    // Buscamos usuarios con consumos muy altos o deudas pendientes para crear alertas reales.
    const alerts = [];
    let alertId = 1;

    const [deudas] = await db.query(`
      SELECT u.nombre_razonsocial, u.direccion, COUNT(r.id) as recibos_pendientes
      FROM recibo r
      JOIN usuario u ON r.usuario_id = u.id
      WHERE r.estado = 'Pendiente' AND r.fecha_vencimiento < CURRENT_DATE()
        AND r.deleted_at IS NULL AND u.deleted_at IS NULL
      GROUP BY u.id
      HAVING recibos_pendientes > 0
      LIMIT 2
    `);

    deudas.forEach(d => {
      alerts.push({
        id: alertId++,
        sector: d.direccion || 'Sin Dirección',
        status: 'DEUDA',
        desc: `${d.nombre_razonsocial}: Tiene ${d.recibos_pendientes} recibo(s) vencido(s).`,
        type: 'error'
      });
    });

    const [altosConsumos] = await db.query(`
      SELECT u.nombre_razonsocial, u.direccion, l.consumo_calculado as consumo
      FROM lectura l
      JOIN medidor m ON l.medidor_id = m.id
      JOIN usuario u ON m.usuario_id = u.id
      WHERE l.consumo_calculado > 1000
        AND l.deleted_at IS NULL AND m.deleted_at IS NULL AND u.deleted_at IS NULL
      ORDER BY l.fecha_registro DESC
      LIMIT 2
    `);

    altosConsumos.forEach(c => {
      alerts.push({
        id: alertId++,
        sector: c.direccion || 'Sin Dirección',
        status: 'PICO DE CONSUMO',
        desc: `${c.nombre_razonsocial}: Consumo de ${c.consumo} kW detectado.`,
        type: 'warning'
      });
    });

    if (alerts.length === 0) {
      alerts.push({
        id: alertId++,
        sector: 'Sistema General',
        status: 'ESTABLE',
        desc: 'Todos los indicadores se encuentran en niveles normales.',
        type: 'info'
      });
    }

    res.json(alerts);
  } catch (error) {
    console.error('Error en getAlerts:', error);
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
};

module.exports = {
  getKpis,
  getChart,
  getAlerts
};
