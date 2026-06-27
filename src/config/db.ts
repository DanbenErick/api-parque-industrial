import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { Logger } from '../utils/logger';

dotenv.config();

export class Database {
  private pool!: mysql.Pool;
  private initPromise: Promise<void>;

  constructor(private logger: Logger) {
    this.initPromise = this.init();
  }

  private async init() {
    try {
      const dbName = process.env.DB_NAME || 'parque_industrial_jicamarca';
      
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'parque',
        password: process.env.DB_PASSWORD || ''
      });

      const [rows]: any = await connection.query(`SHOW DATABASES LIKE '${dbName}'`);
      
      if (rows.length === 0) {
        this.logger.info(`⚙️ Base de datos '${dbName}' no encontrada. Creando...`);
        await connection.query(`CREATE DATABASE \`${dbName}\``);
        await connection.query(`USE \`${dbName}\``);
        await this.initializeDatabase(connection);
      }
      
      await connection.end();

      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'parque',
        password: process.env.DB_PASSWORD || '',
        database: dbName,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        multipleStatements: true,
        flags: 'FOUND_ROWS'
      });

      const poolConn = await this.pool.getConnection();
      this.logger.info('✅ Conexión a MySQL establecida correctamente');
      poolConn.release();
    } catch (err: any) {
      this.logger.error(`❌ Error al conectar o inicializar MySQL: ${err.message}`);
    }
  }

  private async initializeDatabase(connection: mysql.Connection) {
    const fs = require('fs');
    const path = require('path');
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
       
      const schemaPath = path.join(__dirname, 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const schema = fs.readFileSync(schemaPath, 'utf8');
        const statements = schema.split(';').filter((stmt: string) => stmt.trim() !== '');
        
        for (const stmt of statements) {
          if (stmt.trim()) {
            await connection.query(stmt);
          }
        }
        this.logger.info('✅ Estructura de base de datos creada exitosamente.');

        const defaultUser = {
          id: 29,
          rol_id: 1,
          documento_identidad: "10050400",
          nombre_razonsocial: "Bernardino Chaico Ventura",
          clave_acceso: "$2b$10$v1xs61ay1KqNEg5H2G5WkuPhwL.uKb71Zxzt8SfsKnpAVZ1F4bj8.",
          cargo_representante: "Encargados",
          telefono: "988676688",
          correo: "chaico@gmail.com",
          direccion: "Parque Industrial Jicamarca",
          es_activo: 1,
          saldo_a_favor: 0.00,
          ultimo_acceso: "2026-06-14 17:00:20",
          created_at: "2026-06-13 17:38:56",
          updated_at: "2026-06-14 17:00:20",
          deleted_at: null,
          actividad_rubro: null
        };

        await connection.query(`
          INSERT INTO rol (id, nombre_rol, permisos_json, rutas_json) 
          VALUES (1, 'Administrador', '[]', '[]')
        `);
        
        await connection.query(`
          INSERT INTO usuario (
            id, rol_id, documento_identidad, nombre_razonsocial, clave_acceso, 
            cargo_representante, telefono, correo, direccion, es_activo, 
            saldo_a_favor, ultimo_acceso, created_at, updated_at, deleted_at, actividad_rubro
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          defaultUser.id, defaultUser.rol_id, defaultUser.documento_identidad, defaultUser.nombre_razonsocial,
          defaultUser.clave_acceso, defaultUser.cargo_representante, defaultUser.telefono, defaultUser.correo,
          defaultUser.direccion, defaultUser.es_activo, defaultUser.saldo_a_favor, defaultUser.ultimo_acceso,
          defaultUser.created_at, defaultUser.updated_at, defaultUser.deleted_at, defaultUser.actividad_rubro
        ]);
        
        this.logger.info('✅ Usuario Administrador por defecto creado exitosamente.');
      } else {
        this.logger.error('❌ Archivo schema.sql no encontrado para inicializar.');
      }
       
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (err: any) {
      this.logger.error(`❌ Error creando estructura inicial: ${err.message}`);
    }
  }

  public async query(sql: string, values?: any) {
    await this.initPromise;
    if (!this.pool) throw new Error("Pool no inicializado");
    return this.pool.query(sql, values);
  }

  public async getConnection(): Promise<mysql.PoolConnection> {
    await this.initPromise;
    if (!this.pool) throw new Error("Pool no inicializado");
    return this.pool.getConnection();
  }

  public getPool(): mysql.Pool {
    return this.pool;
  }
}
