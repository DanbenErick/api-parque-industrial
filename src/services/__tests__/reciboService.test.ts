import { ReciboService } from '../reciboService';
import { Database } from '../../config/db';

describe('ReciboService', () => {
  let dbMock: jest.Mocked<Database>;
  let connectionMock: any;
  let service: ReciboService;

  beforeEach(() => {
    // Mock for the connection object returned by getConnection()
    connectionMock = {
      beginTransaction: jest.fn(),
      commit: jest.fn(),
      rollback: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
    };

    // Mock for the Database instance
    dbMock = {
      getConnection: jest.fn().mockResolvedValue(connectionMock),
    } as unknown as jest.Mocked<Database>;

    service = new ReciboService(dbMock);
  });

  describe('updateCargos', () => {
    it('debe calcular el subtotal correctamente y actualizar el recibo', async () => {
      // Configuramos el mock para la consulta SELECT inicial de recibo
      connectionMock.query.mockImplementation(async (sql: string, params: any) => {
        if (sql.includes('SELECT cargo_energia')) {
          return [[
            { 
              cargo_energia: '100.00', 
              cargo_energia_punta: '50.00', 
              cargo_factor_potencia: '10.00', 
              cargo_mantenimiento: '5.00' 
            }
          ]];
        }
        return [[]]; // Default response for UPDATE and DELETE
      });

      const cargosNuevos = {
        cargo_fijo: 20,
        multa_manipulacion: 30,
        descuento: 15,
        cargos_dinamicos: []
      };

      const result = await service.updateCargos(1, cargosNuevos, 999);

      // Verificamos que se calculó bien el subtotal
      // Energía (100) + Punta (50) + FP (10) + Mant (5) = 165
      // Cargos nuevos: Fijo (20) + Multa (30) = 50
      // Subtotal bruto = 215
      // Descuento = -15
      // Subtotal neto = 200
      expect(result.subtotal).toBe(200);
      expect(result.total).toBe(200); // Porque IGV es 0 en el código actual

      // Verificamos que el UPDATE fue llamado con los valores correctos
      const updateCall = connectionMock.query.mock.calls.find((call: any) => call[0].includes('UPDATE recibo'));
      expect(updateCall).toBeDefined();
      
      const updateParams = updateCall[1];
      // Según el código: cargo_fijo es params[0], multa_manip es params[2], descuento es params[8], subtotal params[10]
      expect(updateParams[0]).toBe(20); // cargo_fijo
      expect(updateParams[2]).toBe(30); // multa_manipulacion
      expect(updateParams[8]).toBe(15); // descuento
      expect(updateParams[10]).toBe(200); // subtotal
      
      expect(connectionMock.commit).toHaveBeenCalled();
    });

    it('no debe permitir subtotales negativos cuando el descuento es mayor', async () => {
      connectionMock.query.mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT cargo_energia')) {
          return [[{ cargo_energia: '50.00', cargo_energia_punta: '0', cargo_factor_potencia: '0', cargo_mantenimiento: '0' }]];
        }
        return [[]];
      });

      // Descuento mayor a los cargos
      const cargosNuevos = { descuento: 100 };
      const result = await service.updateCargos(1, cargosNuevos, 999);

      expect(result.subtotal).toBe(0);
      expect(result.total).toBe(0);
    });
  });
});
