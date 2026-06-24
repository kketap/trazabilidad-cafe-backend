// src/routes/index.ts
import { Router } from "express";
import cosechasRoutes from "../modules/cosechas/cosechas.routes";
import trazabilidadRoutes from "../modules/trazabilidad/trazabilidad.routes";

const router = Router();

router.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "trazabilidad-cafe-backend",
    });
});

router.use("/cosechas", cosechasRoutes);
router.use("/trazabilidad", trazabilidadRoutes);

export default router;