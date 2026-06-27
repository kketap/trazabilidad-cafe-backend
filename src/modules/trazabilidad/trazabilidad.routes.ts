// src/modules/trazabilidad/trazabilidad.routes.ts
import { Router } from "express";
import {
    createProceso,
    deleteProceso,
    getProcesos,
    getTrazabilidadResumen,
    updateProceso,
} from "./trazabilidad.controller";

const router = Router();

router.get("/", getProcesos);
router.get("/resumen", getTrazabilidadResumen);
router.post("/", createProceso);
router.put("/:id", updateProceso);
router.delete("/:id", deleteProceso);

export default router;