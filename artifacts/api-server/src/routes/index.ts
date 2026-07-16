import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import departmentsRouter from "./departments";
import casesRouter from "./cases";
import waitingCasesRouter from "./waiting-cases";
import dashboardRouter from "./dashboard";
import backupsRouter from "./backups";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(departmentsRouter);
router.use(casesRouter);
router.use(waitingCasesRouter);
router.use(dashboardRouter);
router.use(backupsRouter);

export default router;
