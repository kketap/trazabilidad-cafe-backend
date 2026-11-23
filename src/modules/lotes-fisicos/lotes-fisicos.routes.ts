// src/modules/lotes-fisicos/lotes-fisicos.routes.ts


import { Router } from "express";

import {
    getLotesFisicos,
    getLoteFisico,
    createLoteFisico,
    updateLoteFisico,
    deleteLoteFisico,
} from "./lotes-fisicos.controller";

const router = Router();

/* =====================================================
   LOTES FÍSICOS
===================================================== */

// Listado con filtros opcionales
router.get(
    "/",
    getLotesFisicos,
);

// Detalle por ID
router.get(
    "/:id",
    getLoteFisico,
);

// Crear
router.post(
    "/",
    createLoteFisico,
);

// Actualizar
router.put(
    "/:id",
    updateLoteFisico,
);

// Eliminar o desactivar
router.delete(
    "/:id",
    deleteLoteFisico,
);

export default router;
