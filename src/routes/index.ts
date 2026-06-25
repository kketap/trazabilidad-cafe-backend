// src/routes/index.ts
import { Router } from "express";
import cosechasRoutes from "../modules/cosechas/cosechas.routes";
import trazabilidadRoutes from "../modules/trazabilidad/trazabilidad.routes";
import lotesRoutes from "../modules/lotes/lotes.routes";

const router = Router();

router.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "trazabilidad-cafe-backend",
    });
});

router.use("/cosechas", cosechasRoutes);
router.use("/trazabilidad", trazabilidadRoutes);
router.use("/lotes", lotesRoutes);

export default router;