const fs = require('fs');
const path = './src/components/Payments.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add imports
content = content.replace("import jsPDF from 'jspdf';", "import jsPDF from 'jspdf';\nimport { useYear } from '../context/YearContext';");

// 2. Add state
const stateInsertion = `
  const { activeYear } = useYear();
  const [filterMes, setFilterMes] = useState('Todos');
  const [periodos, setPeriodos] = useState([]);
`;
content = content.replace("const [searchTerm, setSearchTerm] = useState('');", "const [searchTerm, setSearchTerm] = useState('');" + stateInsertion);

// 3. Update fetchData
const newFetchData = `
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (filterMes && filterMes !== 'Todos' && filterMes !== 'TodosHistorico') {
        params.periodo = filterMes;
      } else if (filterMes === 'Todos') {
        params.year = activeYear;
      }

      const [pagosRes, recibosRes, periodosRes] = await Promise.all([
        api.get('/pagos', { params }),
        api.get('/recibos'),
        api.get('/periodos')
      ]);
      setPagos(pagosRes.data);
      setRecibosPendientes(recibosRes.data.filter(r => r.estado === 'Pendiente'));
      setPeriodos(periodosRes.data);
    } catch (error) {
      toast.error('Error al cargar datos de pagos');
    } finally {
      setIsLoading(false);
    }
  };
`;
content = content.replace(/const fetchData = async \(\) => \{[\s\S]*?finally \{\s*setIsLoading\(false\);\s*\}\s*\};/, newFetchData.trim());

// 4. Update useEffect dependencies
content = content.replace(/useEffect\(\(\) => \{\s*fetchData\(\);\s*\}, \[\]\);/, `useEffect(() => {\n    fetchData();\n  }, [filterMes, activeYear]);`);

// 5. Add uniqueMonths and formatPeriod
const helpers = `
  const formatPeriod = (periodoStr) => {
    if (!periodoStr) return '';
    const parts = periodoStr.split('-');
    if (parts.length !== 2) return periodoStr;
    const year = parts[0].length === 4 ? parts[0] : parts[1];
    const month = parts[0].length === 4 ? parts[1] : parts[0];
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) return \`\${monthNames[monthIndex]} \${year}\`;
    return periodoStr;
  };

  const uniqueMonths = periodos
    .filter(p => p.mes_anio && p.mes_anio.includes(activeYear.toString()))
    .map(p => p.mes_anio)
    .sort()
    .reverse();
`;
content = content.replace("const totalRecaudado =", helpers + "\n  const totalRecaudado =");

// 6. Update UI for the filter
const filterUI = `
        <div className="flex flex-col gap-1">
          <label className="text-label-caps font-label-caps text-on-surface-variant uppercase tracking-wider pl-1">Periodo a Filtrar</label>
          <div className="relative">
            <select
              className="appearance-none border border-outline-variant rounded-lg pl-4 pr-10 py-2.5 bg-surface-container-lowest text-on-surface text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-w-[220px] transition-all font-medium cursor-pointer shadow-sm hover:border-primary/50"
              value={filterMes}
              onChange={(e) => setFilterMes(e.target.value)}
            >
              <option value="Todos">Todos los meses ({activeYear})</option>
              <option value="TodosHistorico">Histórico (Todos los años)</option>
              {uniqueMonths.map(m => (
                <option key={m} value={m}>{formatPeriod(m)}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-body-md">expand_more</span>
          </div>
        </div>
`;

content = content.replace('<div className="flex flex-wrap gap-sm">', '<div className="flex flex-wrap items-end gap-md">\n' + filterUI);

fs.writeFileSync(path, content);
console.log('Payments refactored');
