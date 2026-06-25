// src/modules/cosechas/cosechas.routes.ts
import { Router } from "express";
import {
  createCosecha,
  deleteCosecha,
  getCosechas,
  getCosechasResumen,
  updateCosecha,
  postCompararSecciones,
  getTopAportantes,
} from "./cosechas.controller";

const router = Router();

router.get("/", getCosechas);
router.get("/resumen", getCosechasResumen);
router.get("/analiticas/top-aportantes", getTopAportantes);
router.post("/analiticas/comparar-secciones", postCompararSecciones);
router.post("/", createCosecha);
router.put("/:id", updateCosecha);
router.delete("/:id", deleteCosecha);

export default router;