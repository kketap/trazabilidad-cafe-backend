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

// Resumen debe ir antes de "/:id" si en el futuro agregas una ruta por ID.
router.get("/resumen", getTrazabilidadResumen);

// CRUD principal.
router.get("/", getProcesos);
router.post("/", createProceso);
router.put("/:id", updateProceso);
router.delete("/:id", deleteProceso);

export default router;