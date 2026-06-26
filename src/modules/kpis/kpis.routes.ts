// src/modules/kpis/kpis.routes.ts
import { Router } from "express";
import { getKpisCosechas, getKpisTrazabilidad } from "./kpis.controller";

const router = Router();

router.get("/cosechas", getKpisCosechas);
router.get("/trazabilidad", getKpisTrazabilidad);

export default router;
