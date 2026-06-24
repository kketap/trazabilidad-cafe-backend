// src/modules/health/health.routes.ts
import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
    res.json({
        ok: true,
        service: "trazabilidad-cafe-backend",
        message: "Backend funcionando correctamente",
    });
});

export default router;