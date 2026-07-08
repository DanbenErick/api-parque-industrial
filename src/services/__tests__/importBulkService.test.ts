import { ImportBulkService } from '../importBulkService';
import { Database } from '../../config/db';

describe('ImportBulkService', () => {
  let dbMock: jest.Mocked<Database>;
  let connectionMock: any;
  let service: ImportBulkService;

  beforeEach(() => {
    connectionMock = {
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
    };

    dbMock = {
      getConnection: jest.fn().mockResolvedValue(connectionMock),
    } as unknown as jest.Mocked<Database>;

    service = new ImportBulkService(dbMock);
  });

  it('debería retornar error si el periodo_id (mes_anio) no existe', async () => {
    connectionMock.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, mes_anio')) {
        // Retornamos un periodo válido distinto
        return [[{ id: 1, mes_anio: '01-2026' }]]; 
      }
      if (sql.includes('SELECT id, documento_identidad')) {
        return [[{ id: 1, documento_identidad: '12345678' }]];
      }
      if (sql.includes('SELECT id, num_serie')) {
        return [[]]; // Sin medidores
      }
      if (sql.includes('SELECT MAX')) {
        return [[{ ultimo: 100 }]];
      }
      return [[]];
    });

    const rows = [
      {
        mes_anio: '02-2026', // Este periodo no está en el mock
        documento_identidad: '12345678',
      }
    ];

    const result = await service.importarFacturacionMasiva(rows, 999);

    expect(result.successful).toHaveLength(0);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].error).toMatch(/El periodo "02-2026" no existe/);
    expect(connectionMock.rollback).toHaveBeenCalled(); // Porque falló todo
  });

  it('debería importar correctamente una lectura si los datos son válidos', async () => {
    connectionMock.query.mockImplementation(async (sql: string) => {
      if (sql.includes('SELECT id, mes_anio')) {
        return [[{ 
          id: 1, 
          mes_anio: '01-2026', 
          tarifa_kwh: '0.5', 
          factor_multiplicador: '1',
          tarifa_mantenimiento_normal: '5'
        }]]; 
      }
      if (sql.includes('SELECT id, documento_identidad')) {
        return [[{ id: 2, documento_identidad: '12345678' }]];
      }
      if (sql.includes('SELECT id, num_serie')) {
        return [[{ id: 3, num_serie: 'MED-01', usuario_id: 2, tipo: 'Normal' }]];
      }
      if (sql.includes('SELECT MAX')) {
        return [[{ ultimo: 100 }]];
      }
      if (sql.includes('SELECT id FROM lectura')) {
        return [[]]; // No existe lectura previa
      }
      if (sql.includes('INSERT INTO lectura')) {
        return [{ insertId: 99 }];
      }
      if (sql.includes('INSERT INTO recibo')) {
        return [{ insertId: 100 }];
      }
      return [[]];
    });

    const rows = [
      {
        mes_anio: '01-2026',
        documento_identidad: '12345678',
        num_serie: 'MED-01',
        lectura_anterior: 100,
        lectura_actual: 150,
      }
    ];

    const result = await service.importarFacturacionMasiva(rows, 999);

    expect(result.failed).toHaveLength(0);
    expect(result.successful).toHaveLength(1);
    expect(result.successful[0].status).toBe('ok');
    
    // Verificamos inserción de lectura
    const insertLecturaCall = connectionMock.query.mock.calls.find((call: any) => call[0].includes('INSERT INTO lectura'));
    expect(insertLecturaCall).toBeDefined();
    // Consumo = 150 - 100 = 50
    expect(insertLecturaCall[1][5]).toBe(50); // consumo_calculado
    
    expect(connectionMock.commit).toHaveBeenCalled();
  });
});
