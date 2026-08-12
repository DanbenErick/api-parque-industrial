import { Router } from 'express';
import { CargoPersonalizadoController } from '../controllers/cargoPersonalizadoController';
import { AuthMiddleware } from '../middlewares/auth';

export class CargoPersonalizadoRoutes {
  private router = Router();

  constructor(
    private controller: CargoPersonalizadoController,
    private authMiddleware: AuthMiddleware
  ) {
    this.initRoutes();
  }

  private initRoutes() {
    this.router.use(this.authMiddleware.authenticateToken);

    this.router.get('/periodo/:periodo_id', this.controller.getPendientesPorPeriodo);
    this.router.get('/periodo/:periodo_id/usuario/:usuario_id', this.controller.getPendientesPorUsuario);
    this.router.post('/', this.controller.create);
    this.router.delete('/:id', this.controller.delete);
  }

  public getRouter() {
    return this.router;
  }
}
