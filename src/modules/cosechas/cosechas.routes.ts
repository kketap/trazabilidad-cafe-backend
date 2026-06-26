// src/modules/cosechas/cosechas.routes.ts
import { Router } from "express";
import {
  createCosecha,
  deleteCosecha,
  getCosechas,
  getCosechasResumen,
  updateCosecha,
} from "./cosechas.controller";

const router = Router();

router.get("/", getCosechas);
router.get("/resumen", getCosechasResumen);
router.post("/", createCosecha);
router.put("/:id", updateCosecha);
router.delete("/:id", deleteCosecha);

export default router;