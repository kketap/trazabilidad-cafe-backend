// src/routes/index.ts
import { Router } from "express";
import cosechasRoutes from "../modules/cosechas/cosechas.routes";
import trazabilidadRoutes from "../modules/trazabilidad/trazabilidad.routes";
import lotesRoutes from "../modules/lotes/lotes.routes";
import kpisRoutes from "../modules/kpis/kpis.routes";
import authRoutes from "../modules/auth/auth.routes";
import trabajadoresRoutes from "../modules/trabajadores/trabajadores.routes";
import clientesRoutes from "../modules/clientes/clientes.routes";
import secadoRoutes from "../modules/secado/secado.routes";
import empaqueRoutes from "../modules/empaque/empaque.routes";
import trillaRoutes from "../modules/trilla/trilla.routes";
import ventasRoutes from "../modules/ventas/ventas.routes";
import { verifyToken } from "../middlewares/verifyToken";

const router = Router();

router.get("/health", (_req, res) => {
    res.json({
        status: "ok",
        service: "trazabilidad-cafe-backend",
    });
});

router.use("/auth", authRoutes);

router.use(verifyToken);

router.use("/cosechas", cosechasRoutes);
router.use("/trazabilidad", trazabilidadRoutes);
router.use("/lotes", lotesRoutes);
router.use("/kpis", kpisRoutes);
router.use("/trabajadores", trabajadoresRoutes);
router.use("/clientes", clientesRoutes);
router.use("/secado", secadoRoutes);
router.use("/empaque", empaqueRoutes);
router.use("/trilla", trillaRoutes);
router.use("/ventas", ventasRoutes);

export default router;
