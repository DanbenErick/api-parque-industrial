import { IUsuario } from '../index';

declare global {
  namespace Express {
    export interface Request {
      user?: IUsuario;
    }
  }
}
