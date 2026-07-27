"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/modules/trazabilidad/trazabilidad.routes.ts
const express_1 = require("express");
const trazabilidad_controller_1 = require("./trazabilidad.controller");
const router = (0, express_1.Router)();
// Resumen debe ir antes de "/:id" si en el futuro agregas una ruta por ID.
router.get("/resumen", trazabilidad_controller_1.getTrazabilidadResumen);
// CRUD principal.
router.get("/", trazabilidad_controller_1.getProcesos);
router.post("/", trazabilidad_controller_1.createProceso);
router.put("/:id", trazabilidad_controller_1.updateProceso);
router.delete("/:id", trazabilidad_controller_1.deleteProceso);
exports.default = router;
//# sourceMappingURL=trazabilidad.routes.js.map