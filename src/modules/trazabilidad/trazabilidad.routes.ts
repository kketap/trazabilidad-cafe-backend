// src/modules/trazabilidad/trazabilidad.routes.ts
import { Router } from "express";
import {
    createProceso,
    getProcesos,
    getTrazabilidadResumen,
} from "./trazabilidad.controller";

const router = Router();

router.get("/", getProcesos);
router.get("/resumen", getTrazabilidadResumen);
router.post("/", createProceso);

export default router;