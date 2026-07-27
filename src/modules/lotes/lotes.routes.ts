// src/modules/lotes/lotes.routes.ts
import { Router } from "express";
import {
    createLote,
    deleteLote,
    getLotes,
    getSiguienteCodigoPrincipal,
    getSiguienteCorrelativo,
    updateLote,
} from "./lotes.controller";

const router = Router();

// Lista lotes productivos.
router.get("/", getLotes);

// Genera código principal: CONV-001 o ESC-001.
router.get("/codigo/siguiente", getSiguienteCodigoPrincipal);

// Genera sublote: ESC-001 -> ESC-001-1.
router.get("/correlativo/:codigoBase", getSiguienteCorrelativo);

// Crea lote.
router.post("/", createLote);

// Actualiza lote.
router.put("/:id", updateLote);

// Elimina o desactiva lote.
router.delete("/:id", deleteLote);

export default router;