// src/modules/lotes/lotes.routes.ts
import { Router } from "express";
import {
    createLote,
    deleteLote,
    getLotes,
    getSiguienteCorrelativo,
    updateLote,
} from "./lotes.controller";

const router = Router();

router.get("/", getLotes);
router.get("/correlativo/:codigoBase", getSiguienteCorrelativo);
router.post("/", createLote);
router.put("/:id", updateLote);
router.delete("/:id", deleteLote);

export default router;