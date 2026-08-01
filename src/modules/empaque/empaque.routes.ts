// src/modules/empaque/empaque.routes.ts
import { Router } from "express";
import {
    getEmpaques,
    getEmpaqueById,
    createEmpaque,
    updateEmpaque,
    deleteEmpaque,
} from "./empaque.controller";

const router = Router();

router.get("/", getEmpaques);
router.get("/:id", getEmpaqueById);
router.post("/", createEmpaque);
router.put("/:id", updateEmpaque);
router.delete("/:id", deleteEmpaque);

export default router;
