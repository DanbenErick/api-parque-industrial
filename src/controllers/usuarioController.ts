import { PdfService } from '../services/pdfService';
import { ExcelService } from '../services/excelService';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { UsuarioRepository } from '../repositories/usuarioRepository';;
import { MedidorRepository } from '../repositories/medidorRepository';;
import fs from 'fs';

interface IGetUsuariosQuery {
  search?: string;
  rol_id?: string;
  estado?: string;
  rubro?: string;
  page?: string;
  limit?: string;
}

interface IGetUsuariosStatsQuery {
  rol_id?: string;
}

interface ICreateUsuarioBody {
  rol_id: number;
  documento_identidad: string;
  nombre_razonsocial: string;
  clave_acceso: string;
  cargo_representante: string;
  telefono: string;
  correo: string;
  direccion: string;
  actividad_rubro?: string;
  medidores?: any[];
}

interface IUpdateUsuarioBody {
  rol_id?: number;
  documento_identidad?: string;
  nombre_razonsocial?: string;
  cargo_representante?: string;
  telefono?: string;
  correo?: string;
  direccion?: string;
  es_activo?: boolean;
  actividad_rubro?: string;
  medidores?: any[];
}

export class UsuarioController {
    constructor(private pdfService: PdfService, private excelService: ExcelService, private usuarioRepo: UsuarioRepository, private medidorRepo: MedidorRepository) {}

    public getUsuarios = async (req: Request<{}, any, any, IGetUsuariosQuery>, res: Response): Promise<any> => {
          try {
            const search = (req.query.search as string) || '';
            const rol_id = req.query.rol_id ? parseInt(req.query.rol_id as string) : null;
            const estado = req.query.estado || null;
            const rubro = (req.query.rubro as string) || null;
            
            // Pagination parameters
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 30;
            const offset = (page - 1) * limit;

            const result = await this.usuarioRepo.findAll(search, rol_id, estado, rubro, limit, offset);
            
            // Calculate total pages for frontend convenience
            result.meta.page = page;
            result.meta.totalPages = Math.ceil(result.meta.total / limit);

            res.json(result);
          } catch (error) {
            console.error('Error al obtener usuarios:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public getUsuariosStats = async (req: Request<{}, any, any, IGetUsuariosStatsQuery>, res: Response): Promise<any> => {
          try {
            const rol_id = req.query.rol_id ? parseInt(req.query.rol_id as string) : null;
            const stats = await this.usuarioRepo.getStats(rol_id);
            res.json(stats);
          } catch (error) {
            console.error('Error al obtener stats:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public createUsuario = async (req: Request<{}, any, ICreateUsuarioBody>, res: Response): Promise<any> => {
          const { 
            rol_id, documento_identidad, nombre_razonsocial, clave_acceso, 
            cargo_representante, telefono, correo, direccion, actividad_rubro,
            medidores
          } = req.body;

          if (!rol_id || !documento_identidad || !nombre_razonsocial || !clave_acceso || !cargo_representante || !telefono || !correo || !direccion) {
            return res.status(400).json({ error: 'Todos los campos obligatorios (incluyendo teléfono, correo, dirección y representante) deben ser enviados.' });
          }

          // Un socio puede no tener medidor registrado todavía

          if (documento_identidad.length !== 8 && documento_identidad.length !== 11) {
            return res.status(400).json({ error: 'El documento de identidad debe tener 8 (DNI) o 11 (RUC) dígitos.' });
          }

          try {
            const saltRounds = 10;
            const hashedPassword = await bcrypt.hash(clave_acceso, saltRounds);

            const insertId = await this.usuarioRepo.create({
              rol_id, documento_identidad, nombre_razonsocial, clave_acceso: hashedPassword, 
              cargo_representante, telefono, correo, direccion, actividad_rubro
            });

            if (rol_id === 3 && medidores && Array.isArray(medidores)) {
              for (const m of medidores) {
                if (m.num_serie && m.num_serie.trim() !== '') {
                  await this.medidorRepo.create({
                    usuario_id: insertId,
                    num_serie: m.num_serie,
                    tipo: m.tipo || 'Normal',
                    operativo: true
                  });
                }
              }
            }

            res.status(201).json({ message: 'Usuario creado exitosamente', id: insertId });
          } catch (error) {
            if (!rol_id || !documento_identidad || !nombre_razonsocial || !cargo_representante || !telefono || !correo || !direccion) {
              return res.status(400).json({ error: 'Todos los campos obligatorios deben ser enviados.' });
            }
            if ((error as any).code === 'ER_DUP_ENTRY') {
              if ((error as any).sqlMessage.includes('uq_usuario_correo')) {
                return res.status(400).json({ error: 'El correo electrónico ingresado ya está registrado por otro usuario.' });
              }
              if ((error as any).sqlMessage.includes('documento_identidad')) {
                return res.status(400).json({ error: 'El documento de identidad ingresado ya está registrado.' });
              }
              return res.status(400).json({ error: 'Ya existe un registro con esos datos únicos.' });
            }

            console.error('Error al crear usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };

    public createUsuariosBulk = async (req: Request<{}, any, any[]>, res: Response): Promise<any> => {
          const usuarios = req.body;
          
          if (!Array.isArray(usuarios) || usuarios.length === 0) {
            return res.status(400).json({ error: 'El cuerpo de la petición debe ser un arreglo de usuarios no vacío.' });
          }

          const successful = [];
          const failed = [];
          let sociosCreadosCount = 0;
          let medidoresCreadosCount = 0;

          for (let i = 0; i < usuarios.length; i++) {
            const u = usuarios[i];
            try {
              if (!u.documento_identidad || !u.nombre_razonsocial || !u.clave_acceso || !u.cargo_representante || !u.telefono || !u.correo) {
                throw new Error('Faltan campos obligatorios en el registro.');
              }

              if (String(u.documento_identidad).length !== 8 && String(u.documento_identidad).length !== 11) {
                throw new Error('El documento de identidad debe tener 8 o 11 dígitos.');
              }

              if (String(u.telefono).trim().length !== 9) {
                throw new Error('El número de teléfono debe tener exactamente 9 dígitos.');
              }

              const saltRounds = 10;
              
              let targetUsuarioId = null;

              try {
                const existingUser = await this.usuarioRepo.findByDocumento(String(u.documento_identidad));
                
                if (existingUser) {
                  // El usuario ya existe, simplemente usamos su ID para añadir el medidor
                  targetUsuarioId = existingUser.id;
                } else {
                  // El usuario no existe, lo creamos
                  const hashedPassword = await bcrypt.hash(String(u.clave_acceso), saltRounds);
                  targetUsuarioId = await this.usuarioRepo.create({
                    rol_id: 3, // Siempre 3 (Socio/Miembro) para este bulk
                    documento_identidad: String(u.documento_identidad),
                    nombre_razonsocial: u.nombre_razonsocial,
                    clave_acceso: hashedPassword,
                    cargo_representante: u.cargo_representante,
                    telefono: String(u.telefono),
                    correo: u.correo,
                    direccion: u.medidor_direccion || 'Sin dirección',
                    actividad_rubro: u.actividad_rubro || 'General'
                  });
                  sociosCreadosCount++;
                }
              } catch (createError: any) {
                throw createError;
              }

              if (targetUsuarioId && u.medidor_num_serie && String(u.medidor_num_serie).trim() !== '') {
                await this.medidorRepo.create({
                  usuario_id: targetUsuarioId,
                  num_serie: String(u.medidor_num_serie),
                  tipo: u.medidor_tipo || 'Normal',
                  direccion: u.medidor_direccion || 'Sin dirección',
                  operativo: true
                });
                medidoresCreadosCount++;
              }

              successful.push({ row: i + 2, documento: u.documento_identidad, nombre: u.nombre_razonsocial });
            } catch (error: any) {
              let errorMsg = error.message;
              if (error.code === 'ER_DUP_ENTRY') {
                if (error.sqlMessage.includes('uq_usuario_correo')) errorMsg = 'El correo electrónico ya existe.';
                else if (error.sqlMessage.includes('documento_identidad')) errorMsg = 'El documento de identidad ya existe.';
                else if (error.sqlMessage.includes('num_serie')) errorMsg = 'El medidor ya está registrado.';
                else errorMsg = 'Registro duplicado.';
              }
              failed.push({ row: i + 2, documento: u.documento_identidad, error: errorMsg });
            }
          }

          res.status(200).json({ successful, failed, sociosCreados: sociosCreadosCount, medidoresCreados: medidoresCreadosCount });
        };
    public updateUsuario = async (req: Request<{ id: string }, any, IUpdateUsuarioBody>, res: Response): Promise<any> => {
          const id = Number(req.params.id);
          
          try {
            const existingUser = await this.usuarioRepo.findById(id);
            if (!existingUser) {
              return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const updatedData = {
              rol_id: req.body.rol_id !== undefined ? req.body.rol_id : existingUser.rol_id,
              documento_identidad: req.body.documento_identidad !== undefined ? req.body.documento_identidad : existingUser.documento_identidad,
              nombre_razonsocial: req.body.nombre_razonsocial !== undefined ? req.body.nombre_razonsocial : existingUser.nombre_razonsocial,
              cargo_representante: req.body.cargo_representante !== undefined ? req.body.cargo_representante : existingUser.cargo_representante,
              telefono: req.body.telefono !== undefined ? req.body.telefono : existingUser.telefono,
              correo: req.body.correo !== undefined ? req.body.correo : existingUser.correo,
              direccion: req.body.direccion !== undefined ? req.body.direccion : existingUser.direccion,
              es_activo: req.body.es_activo !== undefined ? req.body.es_activo : existingUser.es_activo,
              actividad_rubro: req.body.actividad_rubro !== undefined ? req.body.actividad_rubro : existingUser.actividad_rubro
            };

            const affectedRows = await this.usuarioRepo.update(id, updatedData);

            if (affectedRows === 0) {
              return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            // Lógica para actualizar o crear los medidores asociados
            if (req.body.medidores !== undefined && existingUser.rol_id === 3) {
              const currentMedidores = await this.medidorRepo.findByUsuario(id);
              const newMedidores = req.body.medidores;
              
              const newIds = newMedidores.map((m: any) => m.id).filter((id: any) => id);
              
              // Eliminar los que ya no están
              for (const cm of currentMedidores) {
                if (!newIds.includes(cm.id)) {
                  await this.medidorRepo.softDelete(cm.id);
                }
              }
              
              // Actualizar o crear
              for (const nm of newMedidores) {
                if (nm.id) {
                  // Actualizar medidor existente
                  await this.medidorRepo.update(nm.id, {
                    usuario_id: id,
                    num_serie: nm.num_serie,
                    tipo: nm.tipo || 'Normal',
                    operativo: true
                  });
                } else if (nm.num_serie && nm.num_serie.trim() !== '') {
                  // Crear nuevo medidor
                  await this.medidorRepo.create({
                    usuario_id: id,
                    num_serie: nm.num_serie,
                    tipo: nm.tipo || 'Normal',
                    operativo: true
                  });
                }
              }
            }

            res.json({ message: 'Usuario actualizado exitosamente' });
          } catch (error) {
            if ((error as any).code === 'ER_DUP_ENTRY') {
              if ((error as any).sqlMessage.includes('uq_usuario_correo')) {
                return res.status(400).json({ error: 'El correo electrónico ingresado ya está registrado por otro usuario.' });
              }
              if ((error as any).sqlMessage.includes('documento_identidad')) {
                return res.status(400).json({ error: 'El documento de identidad ingresado ya está registrado.' });
              }
              return res.status(400).json({ error: 'Ya existe un registro con esos datos únicos.' });
            }

            console.error('Error al actualizar usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public deleteUsuario = async (req: Request<{ id: string }>, res: Response): Promise<any> => {
          const id = Number(req.params.id);

          try {
            const affectedRows = await this.usuarioRepo.softDelete(id);

            if (affectedRows === 0) {
              return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            res.json({ message: 'Usuario eliminado exitosamente' });
          } catch (error) {
            console.error('Error al eliminar usuario:', error);
            res.status(500).json({ error: 'Error interno del servidor' });
          }
        };
    public exportExcel = async (req: Request<{}, any, any, IGetUsuariosQuery>, res: Response): Promise<any> => {
          return this.excelService.buildUsuariosExcel(req, res);
        };
    public exportPdf = async (req: Request<{}, any, any, IGetUsuariosQuery>, res: Response): Promise<any> => {
          return this.pdfService.buildUsuariosPdf(req, res);
        };
}


