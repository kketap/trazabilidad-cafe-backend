// src/modules/secado/secado.routes.ts
import { Router } from "express";
import {
    getSecados,
    getSecadoById,
    createSecado,
    updateSecado,
    deleteSecado,
} from "./secado.controller";

const router = Router();

router.get("/", getSecados);
router.get("/:id", getSecadoById);
router.post("/", createSecado);
router.put("/:id", updateSecado);
router.delete("/:id", deleteSecado);

export default router;
