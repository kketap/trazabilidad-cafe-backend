import { Router } from "express";
import {
    getSecciones,
    getSeccion,
    createSeccion,
    updateSeccion,
    deleteSeccion,
    getCalculosGenerales,
} from "./secciones.controller";

const router = Router();

router.get("/calculos-generales", getCalculosGenerales);
router.get("/", getSecciones);
router.get("/:id", getSeccion);
router.post("/", createSeccion);
router.put("/:id", updateSeccion);
router.delete("/:id", deleteSeccion);

export default router;
