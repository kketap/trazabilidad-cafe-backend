// src/modules/cosechas/cosechas.routes.ts
import { Router } from "express";
import multer from "multer";
import {
  createCosecha,
  deleteCosecha,
  getCosechas,
  getCosechasResumen,
  getCosechasReporte,
  updateCosecha,
  cargarCosechasMasivas,
  previewCosechasMasivas,
  confirmarCosechasMasivas,
} from "./cosechas.controller";

const router = Router();

// Configuración de multer en memoria
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // Límite de 15MB
  },
});

router.get("/", getCosechas);
router.get("/resumen", getCosechasResumen);
router.get("/reporte", getCosechasReporte);
router.post("/", createCosecha);
router.post("/masiva/preview", upload.single("file"), previewCosechasMasivas);
router.post("/masiva/confirmar", confirmarCosechasMasivas);
router.post("/masiva", upload.single("file"), cargarCosechasMasivas);
router.put("/:id", updateCosecha);
router.delete("/:id", deleteCosecha);


export default router;