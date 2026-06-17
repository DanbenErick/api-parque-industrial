import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { AuthMiddleware } from '../middlewares/auth';

export class DashboardRoutes {
    public router: Router;

    constructor(private dashboardController: DashboardController, private authMiddleware: AuthMiddleware) {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.use(this.authMiddleware.authenticateToken);
        
        this.router.get('/kpis', this.dashboardController.getKpis);
        this.router.get('/chart', this.dashboardController.getChart);
        this.router.get('/alerts', this.dashboardController.getAlerts);
    }

    public getRouter(): Router {
        return this.router;
    }
}
