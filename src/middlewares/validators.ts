import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';

const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Retornamos el primer error de validación
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

export const loginValidator = [
  body('documento_identidad').notEmpty().withMessage('El documento de identidad es requerido.'),
  body('clave_acceso').notEmpty().withMessage('La clave de acceso es requerida.'),
  validate
];

export const createUsuarioValidator = [
  body('rol_id').isInt().withMessage('Rol inválido.'),
  body('documento_identidad').isLength({ min: 8, max: 11 }).withMessage('El documento de identidad debe tener 8 (DNI) o 11 (RUC) dígitos.'),
  body('nombre_razonsocial').notEmpty().withMessage('El nombre o razón social es requerido.'),
  body('cargo_representante').optional({ checkFalsy: true }),
  body('telefono').optional({ checkFalsy: true }),
  body('correo').optional({ checkFalsy: true }).isEmail().withMessage('El formato de correo no es válido.'),
  body('direccion').optional({ checkFalsy: true }),
  validate
];

export const updateUsuarioValidator = [
  body('rol_id').optional({ checkFalsy: true }).isInt().withMessage('Rol inválido.'),
  body('documento_identidad').optional({ checkFalsy: true }).isLength({ min: 8, max: 11 }).withMessage('El documento de identidad debe tener 8 (DNI) o 11 (RUC) dígitos.'),
  body('nombre_razonsocial').optional({ checkFalsy: true }).notEmpty().withMessage('El nombre o razón social es requerido.'),
  body('cargo_representante').optional({ checkFalsy: true }),
  body('telefono').optional({ checkFalsy: true }),
  body('correo').optional({ checkFalsy: true }).isEmail().withMessage('El formato de correo no es válido.'),
  body('direccion').optional({ checkFalsy: true }),
  validate
];


